# mini-hot-hub 项目长期记忆

## 产品定位与设计哲学（最高优先级）
- **核心理念「将心注入、将爱注入」**：每个交互细节透出温度，而非冷冰冰的抓取机器。三层尊重：内容真实不糊弄 / 待人温柔不冰冷（出错给像人说的提示+重试出路，等待给安抚）/ 对时间克制不骚扰（不弹窗，把节奏还用户）。
- **权威文档**：`2.PRD.md`（属 `1.RESEARCH/2.PRD/3.TECH_DESIGN/4.AGENTS` 编号系列）——承载定位、原则 P1~P5、视觉指引、验收视角。**所有 UI/UX/文案决策终审依据；勿再新建独立 PRD.md。**
- **设计原则（冲突时靠前者优先）**：P1 温暖 > P2 人性 > P3 诚实(严格不回退) > P4 克制 > P5 包容(可读/字号/无强闪)。
- **视觉基调**：温暖柔软低饱和有呼吸感；圆角柔影；**默认主题 = 暖黄（全站暖奶油色系）**。

## 硬性任务约束（绝对优先）
- **真实数据绝不回退 mock**：所有热搜必须真实第三方 API 抓取；fetch 失败必须返回 error 态，不得回退本地 Mock。2026-08-18 已从 `server/index.js` 删除 `WEIBO_HOT/ZHIHU_HOT/BILIBILI_HOT` 及 `buildPlatform()`，未登记平台走 error 态。

## 项目结构（简）
- 前端 `client/`(Vite+React19+TS, 纯CSS)；后端 `server/`(Express, 3001)；缓存 `server/utils/cache.js`(TTL 默认600s, env `CACHE_TTL`)；抓取 `server/services/{weibo,zhihu,bilibili}.js`。
- 路由 `/api/hot/:source`、`/api/hot`(聚合, 含 `cacheTtl`)、`/api/health`；dev 代理 `/api → 3001`。

## 调试铁律（勿再犯）
- env 值一律 `.trim()` 后判定；打印用 `JSON.stringify(process.env.X)`，别用 `console.log`（尾随空格/不可见字符肉眼看不出）。
- 变量"不生效"按最短链路：① `curl` 看真实响应 → ② `JSON.stringify` 看 env 原值 → ③ 才怀疑代码/shell。
- 报某卡错误态先确认后端 3001 在跑（`netstat -ano|findstr :3001` / `/api/health`）；后端死了=全卡红。
- `MOCK_FAIL_<平台>=1` 开发期故障注入已落地（`server/index.js`），修尾随空格后才真生效。

## 用户环境踩坑（复用）
- PowerShell 不支持 `KEY=VAL cmd` 内联 env（用 `$env:K="1"; cmd` 或 cmd `set "K=1" && node`）。
- cmd `set X=1` 把行尾空格吃进值（写成 `set "X=1"` 避免）；`npm run dev` 会吞自定义 env → 绕过 npm 直接 `node --watch index.js`。
- 真机调试：`npm run dev -- --host`，`ipconfig` 查局域网 IP，手机同 Wi-Fi 访问 `http://<IP>:5173`（CORS 不拦手机）；换端口 `--port 5174`。
- Vite 端口冲突僵尸进程：`taskkill /PID <pid> /F`（勿 `taskkill /IM node.exe`，会带走 Vite）。

## uapis.cn 数据语义
- 三平台统一按 `hot_value` 降序(sortByHeatDesc.js)。微博/知乎 hot_value=官方热度分、与官方序严格一致；**B站 hot_value=累计播放量(≠官方综合热度序)**。用户拍板方案 B（降序），B站 虽≠官方序但用户要播放量口径。
- 详情页"阅读/播放量"是平台独立统计，uapis 未返回、代码未用，勿与 hot_value 混。

## 待办/伏笔（详见 `TODO.md`）
- 标题：桌面(≥720px)单行省略维持；手机(<720px)自动换行 ✅正式方案。三卡强制等宽 `repeat(3,minmax(0,1fr))`，响应式<720px竖堆。
- 开放项：TODO-1 实习分类(方向) / TODO-2 手机网址登录(方向) / TODO-3 气泡可移动(方向) / TODO-4 主题色切换(暖黄·浅绿·深黑,护眼) / TODO-5 浏览垃圾桶(已读移入+记录) / TODO-6 入场动画(展示定位「将心注入，将爱注入」,方向)。
- 已关闭：Mock 数组删除、手机换行转正、桌面气泡(方案②右上溢出定稿)、表头去尾巴+品牌色 chip(微博暖橙/知乎雾蓝/哔哩哔哩→B站柔粉)。
