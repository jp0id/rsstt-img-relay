English | [简体中文](README_zh-CN.md)

> ## Note: Block a large number of requests, please deploy yourself

---

## 🧡 cors (Cloudflare Workers)
Support cross-domain request  
Convert HTTP to HTTPS

### Usage
`https://example.com/{URL}`
- `https://example.com/https://api.github.com`
- `https://example.com/http://nginx.org/download/nginx-1.20.2.tar.gz`

```js
// Copy to the console and run
var $url = "http://wthrcdn.etouch.cn/weather_mini?citykey=101040100";
fetch("https://example.com/" + $url).then(x => x.text()).then(console.log)
```

### IP Whitelist
To prevent abuse, this proxy can be locked down to a set of client IPs via the `ipWhitelist` environment variable. If unset (or empty), all clients are allowed.

Supports IPv4 / IPv6 single addresses and CIDR ranges:
- `1.2.3.4`
- `10.0.0.0/24`
- `2001:db8::1`
- `2001:db8::/32`

#### wrangler
Add a `[vars]` block to `wrangler.toml`:
```toml
[vars]
# JSON array (recommended)
ipWhitelist = '["1.2.3.4", "10.0.0.0/8", "2001:db8::/32"]'
# Or a comma-separated string (also accepted)
# ipWhitelist = "1.2.3.4,10.0.0.0/8,2001:db8::1"
```

#### Cloudflare Dashboard
Workers -> your service -> Settings -> Variables -> Add variable
- Variable name: `ipWhitelist`
- Value: a JSON array string, e.g. `["1.2.3.4", "10.0.0.0/8", "2001:db8::/32"]`

When a client IP does not match, the proxy returns HTTP 403:
```json
{ "code": 403, "msg": "Your IP 1.2.3.4 is not in the IP whitelist of this proxy." }
```
Rejected requests are **not** forwarded and are **not** reported to Sematext, so attacker IPs never reach the third-party log sink.

### Deploy

> The mechanism of both methods is the same

#### wrangler
- Clone the project and enter the cors directory
- Edit `index.js` and `wrangler.toml` (configuration key)
- `wrangler config` configure mailbox and key
- `wrangler build` build
- `wrangler publish` release
- Detailed documentation: <https://developers.cloudflare.com/workers/quickstart>

#### Cloudflare Dashboard
- Turn to [Cloudflare Dashboard](https://dash.cloudflare.com), then switch to the `Workers` tab
- `Create a service`
- `Quick edit`
- Clear the editor
- Copy the code from [`cors/index.js`](cors/index.js) to the editor (if you don't care about logging, [`pages/_worker.js`](pages/_worker.js) is another choice)
- Edit the configurations if necessary
- `Save and Deploy`

### Price
  CPU  | Daily request | Burst rate | Script size
  ---- | ---- | ---- | ----
  10ms | 100,000 | 1000 requests in 10 minutes | 1M after compression

Details: <https://developers.cloudflare.com/workers/about/limits/>

The amount can't hold up, please use your account to build the service if you use a lot, thank you! ! !  
![overflow](https://s1.netnr.eu.org/2019/11/03/0752457693.png)

---

## 🧡 pages (Cloudflare Pages Functions)

### Usage
`https://example.com/{URL}`
- `https://example.com/https://api.github.com`
- `https://example.com/http://nginx.org/download/nginx-1.20.2.tar.gz`

### IP Whitelist
Same behavior as the Workers version above — set the `ipWhitelist` environment variable on your Pages project:
- Pages dashboard -> your project -> Settings -> Environment variables -> Add variable
  - Variable name: `ipWhitelist`
  - Value: a JSON array string, e.g. `["1.2.3.4", "10.0.0.0/8", "2001:db8::/32"]`

The whitelist is empty by default, in which case all clients are allowed.

### Deploy

> The mechanism of both methods is the same

#### wrangler
```
npm install wrangler@beta # install
npx wrangler pages dev --help # View help (nodejs version >= 16.x)
npx wrangler pages dev ./ # Enter the pages directory and run
```
Details: <https://developers.cloudflare.com/pages/platform/functions>

#### Cloudflare Dashboard
- Fork this repository
- Edit the configurations in [`pages/_worker.js`](pages/_worker.js) if necessary
- Turn to [Cloudflare Dashboard](https://dash.cloudflare.com), then switch to the `Pages` tab
- `Create a project ▼` -> `Connect to Git`
- Connect to your GitHub account, then select the fork created just now
- `Begin setup`
- Fill in `Build settings`: `Framework preset` - <ins>`None`</ins>; `Build command` - <ins>leave it blank</ins>; `Build output directory` - <ins>`pages`</ins>
- `Save and Deploy`

### Limit
The total number of invocation requests per day is capped at 100,000. If the daily limit is reached, Pages will stop executing the function and fall back to providing only static resources.

---

## Source
- <https://github.com/Rongronggg9/rsstt-img-relay>
- <https://github.com/netnr/workers> (upstream)
