# dsh-provider-showing

[English](README.md) | 简体中文

在对话输入框工具栏常驻显示**当前会话跑在哪个 LLM provider 上**。

> 为装了多个 provider 插件的 [DeepSeek Harness](https://github.com/deepseek-ai/dsh) profile 而做。
> 当模型选择器在窄行上折叠成一个图标时，这个读数让你不用点开菜单就知道答案。

```
WorkBuddy · deepseek-v4.1-flash  high
```

**provider 是主语，模型是修饰语。** 装了多条路由之后，你真正要扫的是 provider
名字，所以它拿强调色和字重；模型 id 和推理档位作为次要信息跟随其后。

| 字段 | 呈现 | 理由 |
|---|---|---|
| provider | 强调色 + 加粗 | 这个插件要回答的问题 |
| 模型 | 弱化、超长省略 | 修饰语 |
| effort | 小胶囊 | 不常变，变了就有用 |

鼠标悬停可看到原始 `provider · model · effort` 三元组，写 issue 时直接抄这个。

## 安装

直接从 GitHub 装，不需要构建，也不需要本地路径：

```sh
dsh plugin --profile web add github:Idlehanker/dsh-provider-showing
```

然后重启，让客户端 bundle 重新组装：

```sh
kill -TERM "$(cat ~/.dsh/daemon/.dsh-web.pid)"   # 守护进程会自动拉起
```

`dsh plugin` 只是把参数原样转发给 pnpm，所以下面这条等价：

```sh
pnpm --dir ~/.dsh/profiles/web add github:Idlehanker/dsh-provider-showing
```

构建产物 `lib/` 已提交进仓库，所以 git 安装不需要任何工具链。想锁定版本而不是跟踪
`main`，加上 tag：

```sh
pnpm --dir ~/.dsh/profiles/web add github:Idlehanker/dsh-provider-showing#v1.2.0
```

### 如果 git clone 卡住

pnpm 解析 `github:` 走的是 **git**，不是 registry。如果你的机器把 GitHub 地址重写到
某个镜像（`~/.gitconfig` 里的 `insteadOf` 规则很常见），而那个镜像不可达，安装会**卡住**
而不是报错。先查：

```sh
git config --global --get-regexp "url\..*insteadof"
```

镜像返回 403 就是症状。要么修镜像地址，要么安装时临时去掉规则、装完再放回去。

### 卸载

```sh
dsh plugin --profile web remove dsh-provider-showing
```

## 设计取舍

**天生与具体 provider 无关。** 它不认识积分、区域或任何具体插件，只读宿主的
`modelSelection` 会话投影并照实显示，所以连没有 UI 的 provider 也能正确显示。

**`next` 优先于 `lastUsed`。** 已经落下但还没发出的切换，仍然是输入框显示的东西。
读 `lastUsed` 会在你刚改完的瞬间显示上一个模型。

**永不隐藏自己。** 唯一降级状态是全新空会话，显示 `no provider yet` 而不是空白 ——
这样这一行空着时，不会在"没有 provider"和"插件坏了"之间产生歧义。

**不认识的 provider 直接显示原始 id。** 那依然是对"我在哪个 provider"的正确回答；
留白则不是。

**无状态。** 每次渲染只读一次投影，没有 state、没有 effect、没有定时器、没有网络。

### 为什么标签表是静态的

宿主确实在模型目录里发布了每个 provider 的 `displayName`（`groups[].name`），
但 `conversation.input.right` 这个插槽只拿到标准 hook 集 ——
`useProjection`、`useSession`、`useInput` 等，**没有目录入口**。
为一个纯装饰字符串再加一条注入路径不划算，所以内置了一张小表。
每条都是从 provider 自己的注册里读出来的，不是猜的：

| 路由 id | 显示名 | 来源 |
|---|---|---|
| `workbuddy` | WorkBuddy | `dsh-connect-workbuddy` 的 `WORKBUDDY_PROVIDER_DISPLAY_NAMES.cn` |
| `workbuddy-global` | WorkBuddy Global | 同上 `.global` |
| `our-free-model` | Our Free Model | `dsh-our-free-model` 路由键 |
| `deepseek-official` | DeepSeek | `dsh-llm-deepseek-api-key` 的 `displayName` |
| `deepseek-account` | DeepSeek | `dsh-llm-deepseek-account` |

新增一条只要一行。

## 调整对话页面宽度

**这是宿主已有功能，不需要本插件。** 把鼠标移到对话栏任一侧的内边缘：光标变成
`col-resize`，拖动即可，宽度持久化在 `localStorage` 的
`dsh.conversation.contentWidth`（下限 640px）。拖拽手柄只在会话活跃阶段出现，
且当 composer 浮层打开时会隐藏。

不想拖的话，在浏览器控制台：

```js
localStorage.setItem('dsh.conversation.contentWidth', '1040')
```

然后刷新。删掉这个键即恢复自动宽度（`clamp(680px, 列宽的 64%, 920px)`）。

## 双半侧打包

宿主按**双半侧（dual-face）**包来组装，所以两个入口：

| 文件 | 作用 |
|---|---|
| `lib/index.js` | 宿主半侧 —— 只占一个 Loader 行，无行为 |
| `lib/client.js` | 浏览器半侧 —— 通过 `window.__ModuleLoader__` 自行注册 |

客户端包刻意做成**单文件**。宿主只服务入口，以及名字匹配
`^client\.[A-Za-z0-9][A-Za-z0-9._-]*\.js$` 的按需 chunk，
所以单独的 `impl.js` 永远不会被服务，工厂里的 `require` 会在实例化时抛错。

四条契约规则由 `ci.yml` 强制，因为每一条的失败方式在浏览器里**都是静默的**：

1. 必须有 `window.__ModuleLoader__.load({ id, factory })` —— 宿主的加载器是懒 CJS 表，
   不是 ES module 系统。
2. 不能有顶层 `import` —— 裸标识符没有 import map 可解析，入口永远不会被实例化。
3. 注册 **id 必须是包名** —— 启动图按包名索引。
4. React 必须从工厂的 `require` 拿到，这样组件共享 shell 的唯一 React 实例；
   第二份拷贝会带一个不同的 hook dispatcher。

## 目录

```
src/client.ts    浏览器入口：注册工厂
src/impl.ts      读数组件与样式
src/index.ts     宿主半侧（空 apply）
cordis.patch.yml   挂载用的 bundle patch
```

## 开发

```sh
pnpm install
pnpm typecheck
pnpm build
pnpm pack        # 产出可安装的 tarball
```

## 许可

MIT
