# 迷你今日热榜（mini-hot-hub）

一个用于学习的迷你项目：在一个页面里聚合展示**微博 / 知乎 / B 站**的当下热门榜单。前端 React + TypeScript + Vite，后端 Node.js + Express 提供热榜接口（当前为 Mock 数据，仅供学习交流、非商用）。

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

- 前端开发端口：**5173**
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

## 环境变量（后端）

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3001` | 后端监听端口 |
| `CLIENT_ORIGIN` | `http://localhost:5173` | 允许跨域访问的前端域名（CORS） |

## 生产构建（简要）

```bash
cd client
npm run build      # 产物在 client/dist
npm run preview    # 本地预览构建产物
```

> 生产环境下 Vite 代理不再生效，前端通过 `VITE_API_BASE` 指向真实后端域名（详见 `client/src/api/hot.ts` 与 `client/vite.config.ts` 注释）。
