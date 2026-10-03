/*
 * https://github.com/netnr/workers
 *
 * 2019-2022
 * netnr
 *
 * https://github.com/Rongronggg9/rsstt-img-relay
 *
 * 2021-2024
 * Rongronggg9
 */

/**
 * Configurations
 */
const config = {
    selfURL: "", // to be filled later
    URLRegExp: "^(\\w+://.+?)/(.*)$",
    // 从 https://sematext.com/ 申请并修改令牌
    sematextToken: "00000000-0000-0000-0000-000000000000",
    // 是否丢弃请求中的 Referer，在目标网站应用防盗链时有用
    dropReferer: true,
    // weibo workarounds
    weiboCDN: [".weibocdn.com", ".sinaimg.cn"],
    weiboReferer: "https://weibo.com/",
    // sspai workarounds
    sspaiCDN: [".sspai.com"],
    sspaiReferer: "https://sspai.com/",
    // 黑名单，URL 中含有任何一个关键字都会被阻断
    // blockList: [".m3u8", ".ts", ".acc", ".m4s", "photocall.tv", "googlevideo.com", "liveradio.ie"],
    blockList: [],
    typeList: ["image", "video", "audio", "application", "font", "model"],
    // 客户端 IP 白名单，未配置或空数组表示放行所有
    // 支持 IPv4 / IPv6 单 IP 与 CIDR，例如 ["1.2.3.4", "10.0.0.0/8", "2001:db8::/32"]
    ipWhitelist: [],
};

/**
 * Set config from environmental variables
 * @param {object} env
 */
function setConfig(env) {
    Object.keys(config).forEach((k) => {
        if (env[k]) {
            try {
                config[k] = typeof config[k] === 'string' ? env[k] : JSON.parse(env[k]);
            } catch {
                // 数组默认值遇到非 JSON 输入时，按逗号分隔降级解析
                if (Array.isArray(config[k])) {
                    config[k] = env[k].split(',').map((s) => s.trim()).filter(Boolean);
                } else {
                    throw new Error(`Invalid value for config.${k}: ${env[k]}`);
                }
            }
        }
    });
}

/**
 * Event handler for fetchEvent
 * @param {Request} request
 * @param {object} env
 * @param {object} ctx
 */
async function fetchHandler(request, env, ctx) {
    ctx.passThroughOnException();
    setConfig(env);

    //请求头部、返回对象
    let reqHeaders = new Headers(request.headers),
        outBody, outStatus = 200, outStatusText = 'OK', outCt = null, outHeaders = new Headers({
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": reqHeaders.get('Access-Control-Allow-Headers') || "Accept, Authorization, Cache-Control, Content-Type, DNT, If-Modified-Since, Keep-Alive, Origin, User-Agent, X-Requested-With, Token, x-access-token"
        });
    let ipBlocked = false;

    try {
        const urlMatch = request.url.match(RegExp(config.URLRegExp));
        config.selfURL = urlMatch[1];
        let url = urlMatch[2];

        url = decodeURIComponent(url);

        //需要忽略的代理
        if (request.method == "OPTIONS" || url.length < 3 || url.indexOf('.') == -1 || url == "favicon.ico" || url == "robots.txt") {
            //输出提示
            const invalid = !(request.method == "OPTIONS" || url.length === 0)
            outBody = JSON.stringify({
                code: invalid ? 400 : 0,
                usage: 'Host/{URL}',
                source: 'https://github.com/Rongronggg9/rsstt-img-relay'
            });
            outCt = "application/json";
            outStatus = invalid ? 400 : 200;
        }
        //阻断 - IP 白名单
        else if (config.ipWhitelist && config.ipWhitelist.length > 0
            && !ipAllowed(reqHeaders.get('cf-connecting-ip'), config.ipWhitelist)) {
            const clientIp = reqHeaders.get('cf-connecting-ip') || 'unknown';
            outBody = JSON.stringify({
                code: 403,
                msg: 'Your IP ' + clientIp + ' is not in the IP whitelist of this proxy.'
            });
            outCt = "application/json";
            outStatus = 403;
            ipBlocked = true;
        }
        //阻断 - URL 黑名单
        else if (blockUrl(url)) {
            outBody = JSON.stringify({
                code: 403,
                msg: 'The keyword: ' + config.blockList.join(' , ') + ' was block-listed by the operator of this proxy.'
            });
            outCt = "application/json";
            outStatus = 403;
        }
        else {
            url = fixUrl(url);

            //构建 fetch 参数
            let fp = {
                method: request.method,
                headers: {}
            }

            //保留头部其它信息
            const dropHeaders = ['content-length', 'content-type', 'host'];
            if (config.dropReferer) dropHeaders.push('referer');
            let he = reqHeaders.entries();
            for (let h of he) {
                const key = h[0], value = h[1];
                if (!dropHeaders.includes(key)) {
                    fp.headers[key] = value;
                }
            }
            if (config.dropReferer) {
                const urlObj = new URL(url);
                if (config.weiboCDN.some(x => urlObj.host.endsWith(x))) {
                    // apply weibo workarounds
                    fp.headers['referer'] = config.weiboReferer;
                } else if (config.sspaiCDN.some(x => urlObj.host.endsWith(x))) {
                    // apply sspai workarounds
                    fp.headers['referer'] = config.sspaiReferer;
                }
            }

            // 是否带 body
            if (["POST", "PUT", "PATCH", "DELETE"].indexOf(request.method) >= 0) {
                const ct = (reqHeaders.get('content-type') || "").toLowerCase();
                if (ct.includes('application/json')) {
                    fp.body = JSON.stringify(await request.json());
                } else if (ct.includes('application/text') || ct.includes('text/html')) {
                    fp.body = await request.text();
                } else if (ct.includes('form')) {
                    fp.body = await request.formData();
                } else {
                    fp.body = await request.blob();
                }
            }

            // 发起 fetch
            let fr = (await fetch(url, fp));
            outCt = fr.headers.get('content-type');
            // 阻断
            if (blockType(outCt)) {
                outBody = JSON.stringify({
                    code: 415,
                    msg: 'The keyword "' + config.typeList.join(' , ') + '" was whitelisted by the operator of this proxy, but got "' + outCt + '".'
                });
                outCt = "application/json";
                outStatus = 415;
            }
            else {
                outStatus = fr.status;
                outStatusText = fr.statusText;
                outBody = fr.body;
                const overrideHeaders = new Set(outHeaders.keys())
                for (let h of fr.headers.entries()) {
                    if (!overrideHeaders.has(h[0]))
                        outHeaders.set(h[0], h[1]);
                }
            }
        }
    } catch (err) {
        outCt = "application/json";
        outBody = JSON.stringify({
            code: -1,
            msg: JSON.stringify(err.stack) || err
        });
        outStatus = 500;
    }

    //设置类型
    if (outCt && outCt != "") {
        outHeaders.set("content-type", outCt);
    }

    if (outStatus < 400)
        outHeaders.set("cache-control", "public, max-age=604800");

    let response = new Response(outBody, {
        status: outStatus,
        statusText: outStatusText,
        headers: outHeaders
    })

    //日志接口
    if (config.sematextToken != "00000000-0000-0000-0000-000000000000" && !ipBlocked) {
        sematext.add(ctx, request, response);
    }

    return response;

    // return new Response('OK', { status: 200 })
}

// 补齐 url
function fixUrl(url) {
    if (url.includes("://")) {
        return url;
    } else if (url.includes(':/')) {
        return url.replace(':/', '://');
    } else {
        return "http://" + url;
    }
}

// 阻断 url
function blockUrl(url) {
    url = url.toLowerCase();
    let len = config.blockList.filter(x => url.includes(x)).length;
    return len != 0;
}
// 阻断 type
function blockType(type) {
    type = type.toLowerCase();
    let len = config.typeList.filter(x => type.includes(x)).length;
    return len == 0;
}

/**
 * 日志
 */
const sematext = {

    /**
     * 构建发送主体
     * @param {any} request
     * @param {any} response
     */
    buildBody: (request, response) => {
        const hua = request.headers.get("user-agent")
        const hip = request.headers.get("cf-connecting-ip")
        const hrf = request.headers.get("referer")
        const url = new URL(request.url)

        const body = {
            method: request.method,
            statusCode: response.status,
            clientIp: hip,
            referer: hrf,
            userAgent: hua,
            host: url.host,
            path: url.pathname,
            proxyHost: null,
        }

        if (body.path.includes(".") && body.path != "/" && !body.path.includes("favicon.ico")) {
            try {
                let purl = fixUrl(decodeURIComponent(body.path.substring(1)));

                body.path = purl;
                body.proxyHost = new URL(purl).host;
            } catch { }
        }

        return {
            method: "POST",
            body: JSON.stringify(body)
        }
    },

    /**
     * 添加
     * @param {any} event
     * @param {any} request
     * @param {any} response
     */
    add: (event, request, response) => {
        let url = `https://logsene-receiver.sematext.com/${config.sematextToken}/example/`;
        const body = sematext.buildBody(request, response);

        event.waitUntil(fetch(url, body))
    }
};

/**
 * IP 白名单匹配工具
 * 支持 IPv4 / IPv6 单 IP 与 CIDR（如 1.2.3.4、10.0.0.0/24、2001:db8::1、2001:db8::/32）
 */

// 把 IPv4 字符串解析为 32-bit 无符号整数；非法返回 null
function ipv4ToInt(ip) {
    const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!m) return null;
    const o = m.slice(1).map(Number);
    if (o.some((x) => x > 255)) return null;
    return ((o[0] << 24) | (o[1] << 16) | (o[2] << 8) | o[3]) >>> 0;
}

// 把 IPv6 字符串展开为 8 个 16-bit 段；非法抛错
function expandIpv6(ip) {
    const dci = ip.indexOf('::');
    let parts;
    if (dci >= 0) {
        const left = ip.slice(0, dci).split(':').filter(Boolean);
        const right = ip.slice(dci + 2).split(':').filter(Boolean);
        const missing = 8 - left.length - right.length;
        if (missing < 0) throw new Error('invalid ipv6');
        parts = [...left, ...Array(missing).fill('0'), ...right];
    } else {
        parts = ip.split(':');
    }
    if (parts.length !== 8) throw new Error('invalid ipv6');
    return parts.map((p) => {
        const n = parseInt(p || '0', 16);
        if (isNaN(n) || n < 0 || n > 0xffff) throw new Error('invalid ipv6 segment');
        return n;
    });
}

// 把 8 个 16-bit 段拼成 BigInt
function ipv6ToBigInt(parts) {
    let n = 0n;
    for (const p of parts) n = (n << 16n) | BigInt(p);
    return n;
}

// 解析 CIDR 条目为 {family, addr, prefix}；非法返回 null
function parseCidr(entry) {
    const slashIdx = entry.indexOf('/');
    const addr = slashIdx >= 0 ? entry.slice(0, slashIdx) : entry;
    const prefix = slashIdx >= 0 ? parseInt(entry.slice(slashIdx + 1), 10) : null;

    const v4 = ipv4ToInt(addr);
    if (v4 !== null) {
        const p = prefix === null ? 32 : prefix;
        if (isNaN(p) || p < 0 || p > 32) return null;
        return { family: 4, addr: v4, prefix: p };
    }

    if (addr.includes(':')) {
        try {
            const parts = expandIpv6(addr);
            const p = prefix === null ? 128 : prefix;
            if (isNaN(p) || p < 0 || p > 128) return null;
            return { family: 6, addr: ipv6ToBigInt(parts), prefix: p };
        } catch {
            return null;
        }
    }

    return null;
}

// 判断 clientIp 是否匹配白名单中任意一条
function ipAllowed(clientIp, whitelist) {
    if (!clientIp) return false;
    for (const entry of whitelist) {
        const cidr = parseCidr(entry);
        if (!cidr) continue;

        if (cidr.family === 4) {
            const ip = ipv4ToInt(clientIp);
            if (ip === null) continue;
            if (cidr.prefix === 0) return true;
            const mask = cidr.prefix === 32 ? 0xffffffff : ((~0 << (32 - cidr.prefix)) >>> 0);
            return (ip & mask) === (cidr.addr & mask);
        } else {
            let parts;
            try {
                parts = expandIpv6(clientIp);
            } catch {
                continue;
            }
            const ip = ipv6ToBigInt(parts);
            if (cidr.prefix === 0) return true;
            // 生成高 prefix 位为 1、低 (128-prefix) 位为 0 的 BigInt 掩码
            const mask = ((1n << BigInt(cidr.prefix)) - 1n) << BigInt(128 - cidr.prefix);
            return (ip & mask) === (cidr.addr & mask);
        }
    }
    return false;
}

export default {
    fetch: fetchHandler
};
