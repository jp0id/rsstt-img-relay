[English](README.md) | 简体中文

> ## 注意：阻断大量请求，请自己部署

---

## 🧡 cors (Cloudflare Workers)
支持跨域请求（转换不支持跨域请求的接口），可直接发起 ajax、fetch  
支持HTTPS（解决远程数据接口不支持HTTPS）

### 使用
`https://example.com/{URL}`
- `https://example.com/https://api.github.com`
- `https://example.com/http://nginx.org/download/nginx-1.20.2.tar.gz`

```js
// 拷贝到控制台运行
var $url = "http://wthrcdn.etouch.cn/weather_mini?citykey=101040100";
fetch("https://example.com/" + $url).then(x => x.text()).then(console.log)
```

### IP 白名单
为防止滥用，可通过 `ipWhitelist` 环境变量将代理限制在一组客户端 IP 之内。未设置（或为空数组）时放行所有 IP。

支持 IPv4 / IPv6 单 IP 与 CIDR：
- `1.2.3.4`
- `10.0.0.0/24`
- `2001:db8::1`
- `2001:db8::/32`

#### wrangler
在 `wrangler.toml` 中新增 `[vars]` 段：
```toml
[vars]
# JSON 数组（推荐）
ipWhitelist = '["1.2.3.4", "10.0.0.0/8", "2001:db8::/32"]'
# 也支持逗号分隔：
# ipWhitelist = "1.2.3.4,10.0.0.0/8,2001:db8::1"
```

#### Cloudflare 仪表板
Workers -> 选择你的服务 -> Settings -> Variables -> Add variable
- 变量名：`ipWhitelist`
- 值：JSON 数组字符串，例如 `["1.2.3.4", "10.0.0.0/8", "2001:db8::/32"]`

客户端 IP 不匹配时，代理返回 HTTP 403：
```json
{ "code": 403, "msg": "Your IP 1.2.3.4 is not in the IP whitelist of this proxy." }
```
被拒绝的请求**不会**被转发，也**不会**上报到 Sematext，攻击者 IP 不会泄漏到第三方日志。

### 部署

> 两种方法的工作原理一致

#### wrangler
- clone 项目，进入 cors 目录
- 编辑 `index.js` 和 `wrangler.toml` (配置密钥)
- `wrangler config` 配置邮箱、密钥
- `wrangler build` 构建
- `wrangler publish` 发布
- 详细文档：<https://developers.cloudflare.com/workers/quickstart>

#### Cloudflare 仪表板
- 转到 [Cloudflare 仪表板](https://dash.cloudflare.com)，然后切换到 `Workers` 标签
- `创建服务`
- `快速编缉`
- 清空编辑器
- 复制 [`cors/index.js`](cors/index.js) 中的代码到编辑器 (如果不需要日志，也可以使用 [`pages/_worker.js`](pages/_worker.js))
- 如有需要，编缉配置
- `保存并部署`

### 套餐
 CPU | 日请求 | 突发速率 | 脚本大小 
 ---- | ---- | ---- | ---- 
 10ms | 100,000 | 10分钟1000个请求 | 压缩后1M

详情：https://developers.cloudflare.com/workers/about/limits/

额度顶不住了，使用量大请用自己的账号搭建服务吧，谢谢！！！  
![溢出](https://s1.netnr.eu.org/2019/11/03/0752457693.png)

---

## 🧡 pages (Cloudflare Pages Functions)
### 使用
`https://example.com/{URL}`
- `https://example.com/https://api.github.com`
- `https://example.com/http://nginx.org/download/nginx-1.20.2.tar.gz`

### IP 白名单
行为与上面的 Workers 版本一致——在 Pages 项目中设置 `ipWhitelist` 环境变量即可：
- Pages 仪表板 -> 选择项目 -> Settings -> Environment variables -> Add variable
  - 变量名：`ipWhitelist`
  - 值：JSON 数组字符串，例如 `["1.2.3.4", "10.0.0.0/8", "2001:db8::/32"]`

默认白名单为空，放行所有 IP。

### 部署

> 两种方法的工作原理一致

#### wrangler
```
npm install wrangler@beta # 安装
npx wrangler pages dev --help # 查看帮助（nodejs version >= 16.x）
npx wrangler pages dev ./ # 进入 pages 目录运行
```
详细文档：<https://developers.cloudflare.com/pages/platform/functions>

#### Cloudflare 仪表板
- Fork 这个项目
- 如有需要，编缉 [`pages/_worker.js`](pages/_worker.js) 中的配置
- 转到 [Cloudflare 仪表板](https://dash.cloudflare.com)，然后切换到 `Pages` 标签
- `创建项目 ▼` -> `连接到 Git`
- 连接你的 GitHub 账户，选择刚刚创建的 fork
- `开始设置`
- 填写 `构建设置`: `框架预设` - <ins>`None`</ins>; `构建命令` - <ins>留空</ins>; `构建输出目录` - <ins>`pages`</ins>
- `保存并部署`

### 套餐
每天的调用请求总数上限为 100,000。如果达到每日限制，Pages 将停止执行函数并回退到仅提供静态资源。

---

## Source
- <https://github.com/Rongronggg9/rsstt-img-relay>
- <https://github.com/netnr/workers> (上游)
