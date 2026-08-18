# 迷你今日热榜（mini-hot-hub）

一个用于学习的迷你项目：在一个页面里聚合展示**微博 / 知乎 / B 站**的当下热门榜单。前端 React + TypeScript + Vite，后端 Node.js + Express 提供热榜接口（热榜数据通过第三方聚合接口实时获取，仅供学习交流、非商用）。

> 📌 **产品定位 / 设计灵魂**：本站核心理念是「将心注入、将爱注入」——即使只是收集热点，也希望每个细节透出温度。设计原则、视觉气质、功能边界见 **[`2.PRD.md`](./2.PRD.md)**；任务进度见 [`TODO.md`](./TODO.md)。

---

## 目录结构

```
mini-hot-hub/
├── client/   # 前端：React + TS + Vite
│   ├── src/
│   │   ├── api/hot.ts        # 数据层：fetchAllHot() 等
│   │   ├── components/        # HotCard / TabBar
│   │   ├── hooks/useHotList.ts# 数据获取 + 三态（loading/error/success）
│   │   ├── pages/Home.tsx     # 首页
│   │   └── mock/hot.json      # 备份用本地 Mock（代码不再直接引用）
│   └── vite.config.ts         # 开发期 /api 代理到后端 3001
└── server/   # 后端：Node.js + Express
    └── index.js               # GET /api/hot、/api/hot/:source 等
```

- 前端开发端口：**5173**（本机调试，仅 `localhost`）/ **5174**（手机真机调试，需 `--host` 启动）
- 后端 API 端口：**3001**

---

## 环境要求

- Node.js **20+**（项目使用 ESM、Express 5、Vite 8，请使用较新版本）
- npm（随 Node 一同安装）

---

## 安装依赖

前端与后端是**两个独立项目**，需要分别安装。

### 1. 前端（client）

```bash
cd client
npm install
```

### 2. 后端（server）

```bash
cd server
npm install
```

> 安装时若遇到权限类报错（如 Windows 下的 `EPERM`），可尝试加上 `--cache <项目内目录>` 指定缓存路径，或检查杀毒软件 / 权限设置后重试。

---

## 启动（前后端同时）

前后端都需要运行：前端负责页面，后端提供 `/api` 热榜接口，二者通过 Vite 的 `/api` 代理连通。

### 方式一：开两个终端（最简单、推荐）

**终端 A —— 启动后端：**

```bash
cd server
npm run dev      # 等价于 node --watch index.js，端口 3001
```

**终端 B —— 启动前端：**

```bash
cd client
npm run dev      # 启动 Vite，端口 5173
```

然后在浏览器打开：**http://localhost:5173**

> 后端 `npm run dev` 使用 `node --watch`，改代码会自动重启；前端 Vite 同样支持热更新（HMR）。

### 方式二：一条命令同时启动（可选）

如果你不想开两个终端，可以全局安装 `concurrently` 后从仓库根目录一条命令拉起两端：

```bash
npm install -g concurrently
concurrently "npm --prefix server run dev" "npm --prefix client run dev"
```

### 验证是否成功

- 浏览器打开 http://localhost:5173 ，应看到三张热榜卡片（微博 / 知乎 / B 站）。
- 另外可直接验证后端：

```bash
curl http://localhost:3001/api/hot          # 返回 { platforms: [...] }
curl http://localhost:3001/api/hot/weibo    # 返回微博热榜
```

- 前端页面里的请求走的是 `http://localhost:5173/api/...`（由 Vite 转发到 3001），而不是直接访问 3001。

---

## 真机调试（手机访问）

默认情况下 Vite 只监听 `localhost`，所以手机**无法直接打开 `http://localhost:5173`**（`localhost` 指的是手机自己，不是你的电脑）。要让手机能访问页面，需要**再起一个监听 `0.0.0.0` 的 Vite 实例**。本项目约定用 **5174 端口专供手机观看**，你自己的电脑仍用 5173 调试，两者互不干扰、可同时运行。

### 启动流程

1. **后端 3001 保持运行**（同「启动」一节的方式一·终端 A）。手机端的数据最终也是走这个后端。

2. **在 `client/` 目录再起一个 Vite 实例，监听 5174 并对外暴露：**

   ```bash
   cd client
   npm run dev -- --host --port 5174
   ```

   - `--host`：让 Vite 监听 `0.0.0.0`（所有网卡），而不只是 `localhost`，手机才能连进来。
   - `--port 5174`：用与本地 5173 不同的端口，避免冲突；也可换成其它空闲端口。
   - 想让它后台运行（不占用终端），可在命令后加 `&`（Git Bash）或用 `Start-Process`（PowerShell），或干脆另开一个终端专门跑它。

3. **查本机局域网 IPv4 地址：**

   ```bash
   ipconfig
   ```

   在输出里找「IPv4 地址」，形如 `192.168.x.x` 或 `10.x.x.x`（例如 `192.168.30.186`）。

4. **手机与电脑连同一个 Wi-Fi**，在手机浏览器打开：

   ```
   http://<上一步的IP>:5174
   ```

   例如 `http://192.168.30.186:5174`。手机即可像在电脑上一样看到三张热榜卡片。

5. **（Windows）放行防火墙：** 首次访问若连不上，多半是 Windows 防火墙拦截了 `node`/`vite` 的入站连接。在弹窗里勾选「专用网络」允许；或到「Windows Defender 防火墙 → 允许应用通过防火墙」手动放行 Node.js。

### 为什么不会触发跨域（CORS）

手机访问的是 Vite（5174），页面里对 `/api/...` 的请求由 **Vite 代理在服务端转发到 3001**，从浏览器视角全程都是 `192.168.x.x:5174` 这个「同域」，因此**不触发 CORS**，无需修改后端的 `CLIENT_ORIGIN`（它仍锁 `localhost:5173` 即可）。

### 常见坑

- **手机显示「拒绝连接 / ERR_CONNECTION_REFUSED」**：说明 5174 那个 Vite 进程已退出（被关掉、终端关闭或超时）。回到第 2 步重新启动即可，**后端 3001 是否正常与此无关**。
- **换网络 / IP 变了**：手机访问的 IP 是电脑当前局域网 IP，电脑换 Wi-Fi 或重连后 IP 可能变化，用 `ipconfig` 重新查一次即可。
- **5173 与 5174 是两份独立进程**：改了前端代码两者都会热更新；停掉其中一个不影响另一个。

---

## 常见问题（FAQ）

### 1. 端口被占用

**后端 3001 被占用**
后端默认监听 3001。如果被其他进程占用，启动时会报错（如 `EADDRINUSE`）。

- 释放 3001 后再启动（推荐）：
  - Windows：
    ```bash
    netstat -ano | findstr :3001
    taskkill /PID <上一步得到的PID> /F
    ```
  - macOS / Linux：
    ```bash
    lsof -i :3001
    kill -9 <上一步得到的PID>
    ```
- 或者改用其它端口启动后端（注意要同步改前端代理目标）：
  ```bash
  PORT=3100 npm run dev      # 后端监听 3100
  ```
  然后把 `client/vite.config.ts` 里的代理 `target` 改成 `http://localhost:3100`，并重启前端。

**前端 5173 被占用**
Vite 在 5173 被占用时会**自动顺延**到 5174、5175…… 页面仍能打开，只是端口号变了。如果你希望固定用 5173，先按上面的思路释放 5173 即可。

### 2. 代理（/api）不生效

开发期前端用相对路径 `/api/hot/weibo` 发起请求，由 Vite 代理转发到后端的 3001。如果出现「请求 404 / 跨域 / 连不上」，按下面逐条排查：

1. **必须用 `npm run dev` 启动前端，而不是 `npm run preview` 或静态托管。**
   Vite 的 `server.proxy` 只在 `vite dev` 下生效；`preview` / 生产构建产物不会转发 `/api`。

2. **后端（3001）必须正在运行。**
   代理只是「转发」，后端没起时，前端请求会被原样转发到一个不存在的服务，表现为连接失败。先确认 `curl http://localhost:3001/api/hot` 能返回数据。

3. **前端请求要用相对路径 `/api/...`，不要写死 `http://localhost:3001`。**
   写死完整地址会绕过代理、直接跨域访问后端，从而触发 CORS。本项目数据层 `api/hot.ts` 在开发期 `API_BASE` 为空，本就使用相对路径，无需额外处理。

4. **改了 `vite.config.ts` 后记得重启前端。**
   Vite 配置变更需要重新 `npm run dev` 才能生效。

5. **跨域头（CORS）相关问题。**
   后端默认只放行 `http://localhost:5173`。如果你把前端跑在别的端口/域名，启动后端时设置 `CLIENT_ORIGIN` 对齐：
   ```bash
   CLIENT_ORIGIN=http://localhost:5174 npm run dev
   ```

排查时最直观的方法：打开浏览器开发者工具的 **Network** 面板，确认 `/api/...` 请求是发往 `localhost:5173`（再由代理转发出去），同时看后端终端是否打印了对应的请求日志（如 `[...] GET /api/hot/weibo`）。

### 3. 卡片显示「尚未接入后端」或错误态

本项目采用**严格不回退**策略：每个平台都**必须**从后端拿到真实数据，不会用本地 Mock 兜底。因此：

- 如果某个平台卡片显示错误提示，通常是**后端没启动**或**该平台接口未注册**（在 `client/src/api/hot.ts` 的 `BACKEND_ROUTES` 中登记）。
- 先确认后端已运行、`/api/hot/:source` 能正常返回，再刷新页面。

---

## 数据来源说明

### 各平台数据获取方式（JSON 接口）

三个平台均通过**后端 Node.js 内置 `fetch`** 请求第三方聚合接口 [uapis.cn](https://uapis.cn) 的公开热榜 JSON，不做 HTML 解析：

| 平台 | 接口地址（默认） |
| --- | --- |
| 微博 | `https://uapis.cn/api/v1/misc/hotboard?type=weibo` |
| 知乎 | `https://uapis.cn/api/v1/misc/hotboard?type=zhihu` |
| B 站 | `https://uapis.cn/api/v1/misc/hotboard?type=bilibili` |

后端各自的服务文件把响应中的 `list[]` 逐条映射为统一结构 `{ rank, title, heat, url }`：

- `server/services/weibo.js` → `fetchWeiboHot()`
- `server/services/zhihu.js` → `fetchZhihuHot()`
- `server/services/bilibili.js` → `fetchBilibiliHot()`

对外暴露的接口路由：`GET /api/hot/:source`（单平台）、`GET /api/hot`（三平台聚合）。

如需更换数据源（例如某个接口失效），可通过环境变量覆盖，**无需改动代码**：

```bash
WEIBO_API_URL='https://另一个兼容接口/weibo' npm run dev
# 同理：ZHIHU_API_URL / BILIBILI_API_URL
```

### 排序方式与热度语义

三平台采用**统一排序策略**：后端取接口返回的 `list[]` 后，先解析出每条的 `hot_value`，按**原始数值降序**排好、截取前 `ITEM_LIMIT`（默认 10）条，再重新编号 `rank` 1..N。排序逻辑抽成公共工具 `server/utils/sortByHeatDesc.js`，三平台 service 均 `import` 调用，单一维护点。

> 为什么必须用「原始数值」排序：展示用的 `heat` 是格式化后的 `"xxx万"` 字符串，若直接按字符串排序会按字典序（`"5"` 比 `"6"` 小）排反，所以排序阶段保留剥离单位后的纯数字 `_heatRaw`，排完再丢弃。

各平台 `hot_value` 的语义略有不同（均经实测核对）：

| 平台 | `hot_value` 语义 | 与官方 `index` 关系 | 排序结果 |
| --- | --- | --- | --- |
| 微博 | 微博官方**综合热度分**（搜索/讨论/阅读/传播速度多维加权） | 严格一致 | 排序 = 微博官方热搜序 |
| 知乎 | 知乎热度分 | 严格一致 | 排序 = 知乎官方热搜序 |
| B 站 | 视频**累计历史播放量**（`extra.stat.view`） | 不一致（B 站按综合热度分排，非纯播放量） | 排序 = 纯播放量榜（≠ B 站官方热门序，项目选择此口径） |

**两点澄清（避免误解）**：
- 你在各平台详情页看到的「阅读量 / 播放量」是平台**独立统计**，uapis.cn 并未返回该字段，本项目排序与展示也**从未使用**它，与接口里的 `hot_value` 是两套不同口径，本来就不应相等。
- B 站按 `hot_value`（累计播放量）排序得到的是「播放量榜」，与 B 站官方「热门」榜（综合热度分）顺序不同；项目出于「语义直观」的考量，统一采用按 `hot_value` 排序的方案。

### 更新频率（缓存 TTL）

- 后端对每次抓取结果做**进程内缓存**，缓存 key 为 `hot:<平台>`，**各平台缓存相互独立**（刷新一个平台不会让其他平台缓存失效）。
- 默认 TTL 为 **600 秒（10 分钟）**，取自环境变量 `CACHE_TTL`（单位：秒）。例如改为 5 分钟：

  ```bash
  CACHE_TTL=300 npm run dev
  ```

- 因此热榜最多每 10 分钟（或你设置的 TTL）自动刷新一次。前端页脚会动态显示「更新频率约 N 分钟」，其中 N = 当前 `cacheTtl / 60` 四舍五入，与后端 `CACHE_TTL` 自动一致。
- 调试时可在请求后追加 `?refresh=1` **强制跳过缓存**立即重新抓取：

  ```bash
  curl "http://localhost:3001/api/hot/weibo?refresh=1"
  ```

### 学习项目免责声明

- 本项目为**个人学习 / 教学演示用途**搭建，**非商业项目**，不代表微博 / 知乎 / B 站任何官方。
- 热榜数据来自第三方公开聚合接口（uapis.cn），**并非平台官方 API**，不保证数据的实时性、完整性与长期可用性；接口或字段可能随时变动。
- 项目遵循**严格不回退**原则：当某平台抓取失败时，页面会如实显示错误态并提供重试，**不会**用本地写死的 Mock 数据「假装成功」。
- 请勿将本项目用于商业用途、大规模抓取或任何可能违反第三方服务条款的行为。

---

## 环境变量（后端）

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3001` | 后端监听端口 |
| `CLIENT_ORIGIN` | `http://localhost:5173` | 允许跨域访问的前端域名（CORS） |
| `CACHE_TTL` | `600` | 热榜缓存存活时间（秒），默认 600 即 10 分钟 |
| `WEIBO_API_URL` | `https://uapis.cn/api/v1/misc/hotboard?type=weibo` | 微博数据源，可替换为其他兼容接口 |
| `ZHIHU_API_URL` | `https://uapis.cn/api/v1/misc/hotboard?type=zhihu` | 知乎数据源 |
| `BILIBILI_API_URL` | `https://uapis.cn/api/v1/misc/hotboard?type=bilibili` | B 站数据源 |
| `MOCK_FAIL_WEIBO` / `MOCK_FAIL_ZHIHU` / `MOCK_FAIL_BILIBILI` | 未设置 | 开发期故障注入：设为 `1` 可强制让对应平台「抓取失败」，用于验证前端 error 卡片。仅本地调试用，生产环境切勿设置。与「严格不回退」不冲突（它强制报错而非回退假数据）。**各终端正确写法见下方「测试错误态」节** |

---

## 测试错误态（开发期故障注入）

前端有一张「错误卡片」（红框 + 提示文案 + 重试按钮），在**某个平台抓取失败时**展示。为验证它的样式与单平台失败隔离，后端提供了开发期故障注入开关：启动时设置 `MOCK_FAIL_<平台>=1`，即可让指定平台**像真的挂掉一样**返回 error 态——它是「强制报错」，**不是**「回退假数据」，与项目「严格不回退」原则一致。

### 开关一览

| 想模拟失败的平台 | 启动开关 |
| --- | --- |
| 微博 | `MOCK_FAIL_WEIBO=1` |
| 知乎 | `MOCK_FAIL_ZHIHU=1` |
| B 站 | `MOCK_FAIL_BILIBILI=1` |

### 标准测试步骤（最短链路）

1. **停掉当前后端**（避免旧进程 / 旧缓存干扰）：
   - Windows：`netstat -ano | findstr :3001` → `taskkill /PID <PID> /F`
   - macOS / Linux：`lsof -i :3001` → `kill -9 <PID>`
2. **带开关重启后端**（见下方「各终端正确写法」）。
3. **验证注入生效**（两种任选其一）：
   - 命令行：`curl http://localhost:3001/api/hot/weibo`，应返回带 `"error": true` 的 JSON；
   - 浏览器：硬刷 http://localhost:5173（`Ctrl+Shift+R`），指定平台卡片应变红。
4. **验证单平台失败隔离**（对应 TESTING #5）：指定平台红卡，其他两平台**仍显示真实数据**。
5. **验证卡片「重试」按钮**：点红卡的「点击重试」→ 按钮变「重试中…」且只重载那一张卡，其他卡不动；因开关仍开着，重试后仍是错误态（符合预期）。
6. **恢复**：关掉开关、重启后端，再点重试 → 指定平台恢复真实数据。

### 各终端正确写法（⚠️ 关键）

开启关建的写法**因终端而异**，写错会让开关「看起来设了但实际没生效」：

- **Git Bash / WSL / macOS / Linux**：
  ```bash
  MOCK_FAIL_WEIBO=1 npm run dev
  # 或 MOCK_FAIL_WEIBO=1 node --watch index.js
  ```
- **Windows PowerShell**：
  ```powershell
  $env:MOCK_FAIL_WEIBO="1"; npm run dev
  ```
  必须在一行内用分号分隔；或先单独 `$env:MOCK_FAIL_WEIBO="1"` 再 `npm run dev`。
- **Windows cmd（推荐用引号写法）**：
  ```cmd
  set "MOCK_FAIL_WEIBO=1" && node --watch index.js
  ```

> ⚠️ **cmd 尾随空格陷阱**：`set MOCK_FAIL_WEIBO=1 && node ...`（等号后、行尾有空格）会把**空格一起存进变量值**（变成 `"1 "`），而代码判断 `=== '1'` 永远 false，开关「悄悄失效」。**务必加引号 `set "X=1"`**，或依赖代码侧 `.trim()` 兜底（本项目已对 env 值 `.trim()`，但引号写法更保险）。
>
> ⚠️ **不要用 `npm run dev` 传自定义 env（Windows）**：npm 在 Windows 跑 scripts 时会启 cmd 子 shell，可能通过 `setlocal/endlocal` 隔离临时变量，自定义 env 在跨 npm 边界时被吞。**直接 `node --watch index.js`** 最稳。

### 一句话诊断法

若怀疑开关没生效，**先打这行看原始值**，别只靠 `console.log`：

```bash
# 在 cmd 里
set "MOCK_FAIL_WEIBO=1" && node -e "console.log(JSON.stringify(process.env.MOCK_FAIL_WEIBO))"
# 正确输出应为 "1"（带引号的字符串 "1"，内部没有任何多余空格）
```

- 输出 `"1 "`（引号内有空格）或 `undefined` → env 没正确传入，先修终端写法；
- 输出 `"1"` 但前端仍不变 → 才去查代码逻辑。

---

## 生产构建（简要）

```bash
cd client
npm run build      # 产物在 client/dist
npm run preview    # 本地预览构建产物
```

> 生产环境下 Vite 代理不再生效，前端通过 `VITE_API_BASE` 指向真实后端域名（详见 `client/src/api/hot.ts` 与 `client/vite.config.ts` 注释）。
