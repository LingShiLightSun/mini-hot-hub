# mini-hot-hub 项目长期记忆

## 用户的硬性任务约束（绝对优先）

- **「真实跑通，绝不降级回 mock」**：用户在做学习打卡任务，**所有热搜数据必须从真实第三方 API 抓取**，不允许在抓取失败时回退到本地 Mock 数据来"假装成功"。
  - 含义：后端 `weibo` 等真实抓取路由**不能**有 "fetch 失败 → 返回本地写死的 Mock 数组" 这种降级路径。失败必须如实返回 error 态，由前端展示。
  - 含义：换源可以（换能通的第三方 API），但**不能**用项目内 `WEIBO_HOT` / `ZHIHU_HOT` / `BILIBILI_HOT` 硬编码数组冒充真实数据。
  - 场景：用户明确说过"这是我 AI 打卡任务里面的一个要求"，"绝对不换mock数据"。

## 项目结构

- 前端：`client/`（Vite + React 19 + TS，纯 CSS，治愈风）
- 后端：`server/`（Express + CORS，端口 3001）
- 缓存：`server/utils/cache.js`（进程内 Map，TTL 默认 600s，env `CACHE_TTL` 可改）
- 真实抓取服务：`server/services/{weibo}.js`（按平台一个文件）
- 缓存 key：`hot:<source>`；`?refresh=1` 跳过缓存
- 路由：`GET /api/hot/:source`（单平台）、`GET /api/hot`（聚合）、`GET /api/health`
- Vite 代理：`/api -> http://localhost:3001`（仅 dev 生效）
- 严格不回退：前端 `client/src/api/hot.ts` 用 `BACKEND_ROUTES` 登记，未登记/失败均显式 error 态

## 用户环境踩坑（复用）

- Windows PowerShell 终端缓冲会让 `node index.js` 实时日志看不到：用 `node index.js > server.log 2>&1` + `type server.log` 解决
- 后端被 `Ctrl+C` 关掉后 git push 会导致 502；记得用 `node --watch index.js` 常驻
- Vite 5173 端口被占（僵尸进程）：`taskkill /PID <pid> /F` 强制杀掉
- npm EPERM（AppData npm-cache 权限）：用 `npm install --cache <项目内目录>`
- 第三方 API 易出问题的根因：**curl 才能区分 DNS 不通 / TLS 证书过期 / 接口拒**；Node `fetch failed` 把这三类混在一起
- **真机调试（手机测页面布局/响应式）**：Vite 默认只绑 `localhost`，手机访问不到 `localhost:5173`。要让手机能开，需让 Vite 监听 `0.0.0.0`：`npm run dev -- --host`（在 `client/` 目录）。再用 `ipconfig` 查本机局域网 IPv4（如 `192.168.x.x`/`10.x.x.x`），手机与电脑连同一 Wi-Fi 后访问 `http://<IP>:5173`。**后端 CORS 锁 `localhost:5173` 不会拦手机**——因 Vite 的 `/api` 代理是服务端转发到 `localhost:3001`，浏览器视角全程同域，不触发 CORS。Windows 防火墙需放行 `node`/`vite` 入站（专用网络）。换端口避冲突：`--host --port 5174`。

## uapis.cn 数据语义（关键，防混淆）
- 统一策略：三平台均按 `hot_value` 降序排（utils/sortByHeatDesc.js），但各平台 hot_value 语义不同：
  - **微博**：hot_value = 微博官方**综合热度分**（搜索/讨论/阅读/传播速度多维加权），与官方 `index`(1..50) **严格一致(0违反)** → 按 hot_value 排 = 微博官方热搜序。
  - **知乎**：hot_value = 知乎热度分，与官方 `index`(1..30) **严格一致(0违反)** → 按 hot_value 排 = 知乎官方热搜序。
  - **B站**：hot_value = 视频**累计历史播放量**（extra.stat.view，已实测 hot_value 数字与 stat.view 100%一致），与官方 `index`(1..100) **不一致(54处违反)**。B站 官方按综合热度分（含时间衰减+互动加权）排而非纯播放量，故 index ≠ 播放量序。按 hot_value 排 = **纯播放量榜（≠B站官方热门序）**。
- **最终决策（用户拍板）**：三平台统一用**方案 B（按 hot_value 降序）**，用户认为更直观/更好；代码已实现（sortByHeatDesc），无需改动。B站 虽≠官方序，但用户明确偏好播放量口径。
- 用户点进详情页看到的"阅读量/播放量"是平台独立统计，uapis.cn 未返回、代码未采用，与 hot_value 两套口径，不可混用。
- ⚠️ 踩坑根因：① 勿把"详情页阅读量"误当 hot_value；② 勿未抓原始数据就下"hot_value=阅读量/排序依据"类结论；③ **B站 hot_value 是累计播放量、非综合热度分**（早期记错已更正）；④ B站 `index` 是否为官方综合热度序仅为推断，未实测比对 B站 真实热门页。

## 待办 / 伏笔（用户说后续会做问题汇总、逐个解决）

- **【伏笔-标题信息量】** 标题显示方案（2026-08-18 手机端讨论后定）：
  - **桌面端（≥720px）**：维持**单行省略**（`white-space:nowrap`+ellipsis）。用户此前选"1行+省略，后续加功能弥补短标题看不出内容"，已定方案，勿擅自改。
  - **手机端（<720px）**：改为**自动换行显示完整**（今日头条式，`white-space:normal` + `overflow-wrap:anywhere`）。用户选 A「暂时尝试，后续可能换」——临时方案，非最终定论。
  - **根因**：原单行省略在手机 flex 子项（`.hot-card__title-link` 是 `.hot-card__item` 的 flex 子项）下 `text-overflow:ellipsis` 易失效 → B站 超长标题没被裁、横向溢出撑宽卡片、整页可横滑。自动换行从根上消除。
  - **勿擅自**：回退手机端换行、把桌面端也改换行、或改回强制 2 行高（用户已否决：1/2 行混排长短不一观感差）。
- ⚠️ 布局相关已确认的用户偏好：桌面三卡**强制等宽**（`repeat(3,minmax(0,1fr))`）、**响应式保持现状**（<720px 竖堆）、错误态卡只需**同宽**即可（内容稀疏暂时不在意）。
- **【伏笔-卡片尺寸/字体】** 用户觉得**卡片宽度偏小、字体偏小**，阅读观感不佳。暂时**不修改**，待后续问题汇总时一起处理（可能方向：加大桌面列宽/容器 max-width、调大正文字号与行高）。与「伏笔-标题信息量」同属布局观感类，汇总时一并评估。
