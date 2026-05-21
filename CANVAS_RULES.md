下面这版可以直接写入 `AGENTS.md`。
它是基于你现在**Phase 1 + Phase 2 已完成拆分**后的长期规则，重点是：**暂停继续大拆分，进入功能完善；新功能不能再塞回 CanvasPage.tsx；现有拆分结构必须被遵守**。

````md
# AI Coding Rules

本项目已经完成 Canvas 模块的前两个阶段拆分。

当前状态：

- `CanvasPage.tsx` 已从原来的大型文件拆分为页面入口 + 画布核心容器。
- Canvas 相关代码已经进入 `src/features/canvas/` 模块结构。
- Types / Constants / Utils / Components / Nodes 已经初步拆分完成。
- Phase 2 已经将主要 UI 展示部分拆出为独立组件。
- 当前暂停继续大规模拆分 hooks，优先进入功能完善和问题修复阶段。

后续所有 AI 代码修改工具，包括 KimiCode 和 Codex，都必须遵守以下规则。

---

## 1. 总体原则

- 优先只读取和修改与当前任务直接相关的文件。
- 不要为了小功能扫描全项目。
- 不要为了小改动读取大量无关文件。
- 不要做无关重构。
- 不要顺手优化无关 UI。
- 不要改动无关交互。
- 不要改动无关命名。
- 不要把已经拆出去的逻辑重新写回 `CanvasPage.tsx`。
- 不要把已经拆出去的 JSX、组件或工具函数重新写回 `CanvasPage.tsx`。
- 修改时优先保持现有结构稳定，只做当前任务需要的最小改动。
- 如果某个功能已经有对应模块，必须优先修改对应模块，而不是回到 `CanvasPage.tsx` 里改。
- 如果不确定修改位置，先根据当前架构判断最合适的目录，再做最小改动。

---

## 2. 当前 Canvas 架构状态

当前 Canvas 相关代码主要位于：

```text
src/features/canvas/
├─ components/      # canvas 通用 UI 组件
├─ constants/       # canvas 常量、配置、选项
├─ hooks/           # canvas 相关 hooks
├─ nodes/           # 所有节点类型
├─ types/           # 类型定义
└─ utils/           # 纯工具函数
````

`src/pages/CanvasPage.tsx` 当前仍然保留：

```text
- Canvas 页面入口
- FlowCanvas 核心容器
- nodes / edges / tempLine 等核心状态
- 连线绘制逻辑
- 复制 / 粘贴 / 删除 / duplicate 逻辑
- 键盘快捷键逻辑
- 拖放上传接入逻辑
- 框选预高亮逻辑
- 右键菜单状态
- 部分画布级接入逻辑
```

已经拆出的展示组件包括：

```text
src/features/canvas/components/GlobalDropForwarder.tsx
src/features/canvas/components/CanvasStage.tsx
src/features/canvas/components/CanvasSidebar.tsx
src/features/canvas/components/CanvasContextMenus.tsx
src/features/canvas/components/CanvasToolbar.tsx
```

已经拆出的节点相关结构包括：

```text
src/features/canvas/nodes/ImageNode/
src/features/canvas/nodes/TextNode.tsx
src/features/canvas/nodes/VideoNode.tsx
src/features/canvas/nodes/AudioNode.tsx
src/features/canvas/nodes/ScriptNode.tsx
src/features/canvas/nodes/VideoMergeNode.tsx
src/features/canvas/nodes/UpscaleNode.tsx
```

---

## 3. CanvasPage.tsx 规则

`CanvasPage.tsx` 现在只允许承担页面入口和画布核心接入职责。

### 不允许做的事

除非当前任务明确要求，否则不要在 `CanvasPage.tsx` 中新增：

```text
- 新节点主体 UI
- 新功能完整 UI
- 新面板完整 UI
- 新工具栏完整 UI
- 新参数面板
- 新预设数据
- 新风格数据
- 新业务工具函数
- 新复杂状态逻辑
- 新图片处理逻辑
- 新提示词处理逻辑
- 新引用图处理逻辑
```

### 允许做的事

如果确实需要，可以在 `CanvasPage.tsx` / `FlowCanvas` 中做最小必要接入，例如：

```text
- 注册新节点类型
- 接入菜单入口
- 接入右键创建入口
- 接入拖拽创建入口
- 接入快捷键入口
- 将状态或回调传给已拆出的组件
- 做画布级状态桥接
```

但具体 UI、具体业务逻辑、具体工具函数、具体类型定义都应该放到 `src/features/canvas/` 下对应模块。

如果必须修改 `CanvasPage.tsx`，修改完成后的总结中必须说明：

```text
- 为什么需要修改 CanvasPage.tsx
- 修改是否只属于必要接入
- 是否有更适合下沉到 features/canvas 的内容
```

---

## 4. 当前阶段规则：暂停 Phase 3 大拆分

当前已经完成 Phase 1 和 Phase 2。

现在暂停继续大规模拆分 hooks，不主动进入 Phase 3。

### 不要主动拆这些逻辑

除非我明确要求，否则不要主动把以下逻辑拆成 hooks：

```text
- line drawing / 连线绘制逻辑
- clipboard / 复制粘贴逻辑
- shortcuts / 快捷键逻辑
- selection / 选区和预高亮逻辑
- drop upload / 拖放上传逻辑
- context menu / 右键菜单状态逻辑
- nodes / edges 核心状态管理
```

也不要主动创建以下文件，除非当前任务明确要求：

```text
useLineDrawing.ts
useCanvasClipboard.ts
useCanvasShortcuts.ts
useCanvasSelection.ts
useCanvasDropUpload.ts
useCanvasContextMenu.ts
useCanvasNodes.ts
useCanvasEdges.ts
```

当前阶段优先做：

```text
- 功能完善
- bug 修复
- 小范围 UI 调整
- 小范围交互优化
- 已有模块内的局部整理
```

不要为了“代码更优雅”继续大规模拆分。

---

## 5. 新功能放置规则

新增 canvas 相关功能时，不要直接写入 `CanvasPage.tsx`。

应该根据功能类型放入对应位置：

```text
节点 UI 修改
→ src/features/canvas/nodes/ 对应节点目录

新节点
→ src/features/canvas/nodes/NewNode/

通用 canvas UI 组件
→ src/features/canvas/components/

类型定义
→ src/features/canvas/types/

常量、选项、预设、风格数据
→ src/features/canvas/constants/

纯工具函数
→ src/features/canvas/utils/

可复用状态逻辑
→ src/features/canvas/hooks/

节点注册、菜单入口、拖拽创建、快捷键接入
→ 可以最小修改 CanvasPage.tsx / FlowCanvas
```

---

## 6. 新节点规则

新增节点类型时，不要写入 `CanvasPage.tsx`。

新节点应从一开始就放入独立目录：

```text
src/features/canvas/nodes/NewNode/
├─ NewNode.tsx
├─ NewNodeControlPanel.tsx
├─ newNode.types.ts
├─ newNode.constants.ts
├─ newNodeUtils.ts
└─ index.ts
```

如果节点较简单，也可以先使用单文件：

```text
src/features/canvas/nodes/NewNode.tsx
```

但如果节点包含以下内容，应优先使用目录结构：

```text
- 独立控制面板
- 多个子组件
- 独立参数
- 独立类型
- 独立常量
- 独立工具函数
- 后续可能继续扩展
```

新增节点时，`CanvasPage.tsx` / `FlowCanvas` 只允许做必要注册和入口接入。

---

## 7. 已拆出组件维护规则

当前已拆出的展示组件必须继续作为对应 UI 的主要维护位置。

### CanvasStage.tsx

用于维护：

```text
- ReactFlow 容器
- Background
- MiniMap
- drop overlay
- TempConnectionLine
- reject tooltip
- upload toast
- ReactFlow 相关展示层配置
```

不要把这些 JSX 重新写回 `CanvasPage.tsx`。

### CanvasSidebar.tsx

用于维护：

```text
- 左侧 sidebar pill
- 左侧展开面板
- add / skills / assets / history / support 等面板入口
- 侧边栏展示层 UI
```

不要把侧边栏 JSX 重新写回 `CanvasPage.tsx`。

### CanvasContextMenus.tsx

用于维护：

```text
- 画布右键菜单
- 创建节点菜单
- 节点右键菜单
- 菜单展示 UI
```

菜单状态可以仍由 `CanvasPage.tsx` / `FlowCanvas` 持有，但菜单 JSX 不要写回 `CanvasPage.tsx`。

### CanvasToolbar.tsx

用于维护：

```text
- 底部工具栏
- MiniMap 开关
- Grid 开关
- Reset
- Zoom
- Help Panel
```

不要把底部工具栏 JSX 重新写回 `CanvasPage.tsx`。

### GlobalDropForwarder.tsx

用于维护：

```text
- 浏览器级拖放事件转发
- 全局 drag / drop forwarder
```

不要把全局拖放 forwarder 重新写回 `CanvasPage.tsx`。

---

## 8. ImageNode 规则

图片节点相关功能优先修改：

```text
src/features/canvas/nodes/ImageNode/
```

当前 ImageNode 相关逻辑已经从 `CanvasPage.tsx` 中拆出。
不要把图片节点主体 UI、控制面板、提示词框、引用图区域重新写回 `CanvasPage.tsx`。

图片节点相关修改应优先判断位置：

```text
图片节点主体
→ ImageNode.tsx

图片节点控制面板
→ ImageNodeControlPanel.tsx

图片节点导出
→ index.ts

图片用途类型
→ src/features/canvas/types/imageNode.types.ts

图片用途常量
→ src/features/canvas/constants/imageUsages.ts

图片引用提示词生成
→ src/features/canvas/utils/promptUtils.ts

引用图对比、用途读取
→ src/features/canvas/utils/referenceUtils.ts
```

`ImageNodeControlPanel.tsx` 当前仍然较大，但不要主动大规模拆分。
只有在修改它内部功能时，才允许做小范围、低风险整理。

不要为了重构而重构 `ImageNodeControlPanel.tsx`。

---

## 9. Types / Constants / Utils 规则

### Types

类型定义优先放入：

```text
src/features/canvas/types/
```

例如：

```text
imageNode.types.ts
canvas.types.ts
```

不要在组件内部重复定义大型公共类型。
不要在 `CanvasPage.tsx` 中新增复杂类型定义。

### Constants

常量、配置、选项、预设数据优先放入：

```text
src/features/canvas/constants/
```

例如：

```text
canvasConstants.ts
imageUsages.ts
presets.ts
```

不要在 `CanvasPage.tsx` 或节点组件中新增大型静态配置。
不要把预设数据、风格数据、用途数据写入 `CanvasPage.tsx`。

### Utils

纯工具函数优先放入：

```text
src/features/canvas/utils/
```

例如：

```text
promptUtils.ts
referenceUtils.ts
```

适合放入 utils 的内容：

```text
- prompt 拼接
- 引用图比较
- 引用图关系判断
- 图片用途转换
- 节点尺寸计算
- 数据格式转换
- 不依赖 React state 的纯逻辑
```

不要把纯工具函数写在 `CanvasPage.tsx` 里。

---

## 10. Hooks 规则

当前阶段不要主动大规模拆 hooks。

但如果某个功能确实已经变成可复用状态逻辑，可以放入：

```text
src/features/canvas/hooks/
```

允许新增 hook 的情况：

```text
- 当前任务明确要求拆 hook
- 某段状态逻辑会被多个组件复用
- 逻辑已经明显独立，且迁移风险低
- 不拆 hook 会导致同一逻辑重复出现
```

不允许新增 hook 的情况：

```text
- 只是为了继续拆分
- 只是为了让文件看起来更干净
- 需要大规模移动核心状态
- 会影响连线、拖拽、快捷键、选择等核心交互
- 当前任务只是小功能修改
```

新增 hook 时必须保持行为不变，并在总结中说明：

```text
- 为什么需要新增 hook
- 迁移了哪些状态或逻辑
- 是否影响 CanvasPage.tsx / FlowCanvas
- 需要手动检查哪些交互
```

---

## 11. 行为保持规则

修改代码时必须保持以下现有行为不变，除非当前任务明确要求修改：

```text
- 现有 UI 样式
- 节点状态逻辑
- 图片引用逻辑
- 提示词框行为
- 提示词框内图片引用块行为
- 预设功能
- 风格选择功能
- 标记功能
- 连线逻辑
- 图片上传逻辑
- 本地拖拽上传逻辑
- 全局拖放转发逻辑
- 复制粘贴逻辑
- 删除逻辑
- duplicate 逻辑
- 快捷键行为
- 画布移动和缩放行为
- 节点选择和取消选择行为
- 框选预高亮行为
- hover 浮窗行为
- 右键菜单行为
- React Flow 节点和边的基础交互
```

除非当前任务明确要求，不要改变已有交互体验。

---

## 12. 修改范围规则

每次任务开始前，先判断本次修改属于哪一类：

```text
节点 UI 修改
→ 优先修改 src/features/canvas/nodes/ 对应节点目录

图片节点功能修改
→ 优先修改 src/features/canvas/nodes/ImageNode/

通用 UI 修改
→ 优先修改 src/features/canvas/components/

类型问题
→ 优先修改 src/features/canvas/types/

常量 / 选项 / 预设 / 风格
→ 优先修改 src/features/canvas/constants/

纯逻辑处理
→ 优先修改 src/features/canvas/utils/

状态复用逻辑
→ 优先修改 src/features/canvas/hooks/

节点注册 / 菜单入口 / 拖拽创建 / 快捷键接入
→ 可以最小修改 CanvasPage.tsx / FlowCanvas

页面入口
→ 才允许修改 CanvasPage.tsx
```

每次修改尽量控制在当前功能相关文件内。
如果需要扩大修改范围，必须在总结中说明原因。

---

## 13. 终端命令规则

- 执行任何命令前，**必须说明目的和预期结果**。
- 安全命令（如 `cd app && npm run build`、`npm run dev`）可以执行，但需先说明。
- 危险命令（如 `git push`、`npm install` 新依赖、修改 `package.json`）**必须等待明确批准**。
- 单次任务中，构建/验证类命令最多执行 3 次。超过则停止，提供建议命令供手动执行。
- 不要执行与当前任务无关的命令。
- 修改完成后，说明执行了哪些命令及结果。

---

## 14. 输出要求

每次修改完成后，请说明：

```text
- 修改了哪些文件
- 每个文件主要改了什么
- 是否涉及 CanvasPage.tsx
- 是否涉及 FlowCanvas
- 是否新增了节点
- 是否新增了组件
- 是否新增了类型
- 是否新增了常量
- 是否新增了工具函数
- 是否新增了 hook
- 是否执行过命令
- 如果没有执行命令，需要我手动检查什么
- 是否存在未完成或需要注意的地方
```

如果修改涉及 `CanvasPage.tsx` / `FlowCanvas`，还必须说明：

```text
- 为什么必须修改
- 是否只是必要接入
- 是否把具体逻辑下沉到了对应模块
```

---

## 15. 禁止行为

除非我明确要求，否则不要做以下事情：

```text
- 不要全项目重构
- 不要重写大文件
- 不要继续主动拆分 hooks
- 不要改变目录结构
- 不要把新功能写回 CanvasPage.tsx
- 不要把节点主体逻辑写进 FlowCanvas
- 不要把已拆出的 JSX 写回 CanvasPage.tsx
- 不要删除现有功能
- 不要改变现有 UI 风格
- 不要改变现有交互逻辑
- 不要执行与当前任务无关的终端命令
- 不要修改 package.json / package-lock.json
- 不要引入新依赖
- 不要修改路由结构
- 不要修改与当前任务无关的文件
- 不要为了代码好看而做无关优化
- 不要为了拆分而拆分
```

---

## 16. 如果遇到不确定情况

如果存在多种方案，并且修改风险较高，请先说明：

```text
- 当前问题是什么
- 推荐修改哪些文件
- 为什么需要修改这些文件
- 是否会涉及 CanvasPage.tsx / FlowCanvas
- 是否存在更低风险的修改方式
- 是否需要新增组件 / hook / utils / types / constants
```

然后等待确认。

如果只是低风险小改动，可以选择最低风险方案直接修改，并在总结中说明原因。

---

## 17. 当前开发策略

当前阶段的核心策略是：

```text
暂停继续大拆分
优先完善功能
小步修改
低风险修改
不把新逻辑塞回 CanvasPage.tsx
不主动拆核心 hooks
保持现有架构稳定
```

后续只有当某个区域真的开始难以维护时，再进行局部拆分。

例如：

```text
快捷键越来越多
→ 再考虑 useCanvasShortcuts

复制粘贴逻辑越来越复杂
→ 再考虑 useCanvasClipboard

连线规则越来越复杂
→ 再考虑 useLineDrawing

拖放上传逻辑越来越复杂
→ 再考虑 useCanvasDropUpload

选区和高亮逻辑越来越复杂
→ 再考虑 useCanvasSelection

ImageNodeControlPanel 修改频繁且难维护
→ 再考虑局部拆分 ImageNode 子组件
```

不要因为已经完成 Phase 1 / Phase 2，就继续机械地进入 Phase 3。
当前更重要的是保持稳定，并继续完善产品功能。

---

## 18. 假生成任务流数据规则（Fake Generation Flow Data Rules）

ImageNode 已接入最小假生成任务流。后续所有与图片生成、生成历史、生成任务相关的修改，必须遵守以下数据规则。

### 18.1 图片字段规则

| 字段 | 含义 | 写入时机 | 是否可被生成覆盖 |
|---|---|---|---|
| `inputImage` | 用户最初上传 / 拖入的原始输入图 | 首次上传、拖放、明确替换原图时 | **禁止覆盖** |
| `currentImage` | 节点当前显示图（原图或最新生成结果） | 上传时写入；生成成功时更新 | 允许更新 |
| `image` | **旧数据兼容字段**，不再作为唯一图片来源 | 上传时同步写入；生成成功时同步更新 | 允许更新 |
| `generatedImages` | 生成结果历史数组 | 每次生成成功时 push | 允许追加 |

**核心约束：**
- 生成成功时只能更新 `currentImage`，不允许覆盖 `inputImage`。
- 上传 / 拖放新图片时，`inputImage`、`currentImage`、`image` 三个字段可同时写入新 URL。
- 新逻辑中不得单独依赖 `data.image` 作为图片来源，必须使用读取优先级链。

### 18.2 读取优先级

```ts
// 当前显示图
const currentImage = data.currentImage || data.image || data.inputImage;

// 原始输入图
const inputImage = data.inputImage || data.image;
```

- `currentImage` 用于节点预览、全屏查看、控制面板缩略图。
- `inputImage` 用于"对比原图"、"回退到原图"、原图元数据展示。
- `data.image` 仅作为无 `inputImage`/`currentImage` 时的兜底兼容。

### 18.3 生成历史规则

`generatedImages` 必须使用 `GenerationHistoryItem[]` 结构：

```ts
interface GenerationHistoryItem {
  resultId: string;           // 结果唯一 ID
  imageUrl: string;           // 图片地址
  prompt: string;             // 最终拼接后的完整 prompt
  userPrompt: string;         // 用户手写输入（不含预设/引用拼接）
  inputRefs: InputRef[];      // 引用图快照
  presetIds: string[];        // 已选预设 ID 列表
  styleId: string | null;     // 已选风格 ID
  modelParams: ModelParams;   // 模型参数快照
  seed: number;               // 随机种子
  width: number;              // 结果宽
  height: number;             // 结果高
  createdAt: number;          // 生成时间戳
}
```

**约束：**
- 不再新增 `string[]` 形式的 `generatedImages`。
- 每次生成成功必须写入完整快照，禁止只存 `imageUrl`。
- 旧 `string[]` 数据仅通过 `normalizeGeneratedImages()` 兼容读取，写入时必须转为新结构。
- 禁止绕过 `normalizeGeneratedImages` 直接假设 `data.generatedImages` 是对象数组。

### 18.4 任务状态规则

`generationTask` 存在于 `node.data` 中，作为持久化来源。

**数据来源层级：**
```
node.data.generationTask  ← 持久化来源（Undo/Redo 快照包含此字段）
    ↓
ImageNode local state     ← 即时 UI 状态（mount 时从 data 初始化）
    ↓
UI 展示（生成中 / 成功 / 失败 / 重试按钮）
```

**同步约束：**
- `ImageNode` 本地 state 必须监听 `node.data.generationTask` 变化并同步更新。
- 本地 state 的修改必须伴随 `setNodes` 写入 `node.data`，不能仅存于本地。
- Undo / Redo 回退 `node.data` 后，本地 UI 状态不得继续显示旧的生成中 / 失败 / 成功状态。

**生命周期约束：**
- 开始新生成前必须 `abort` 旧任务（通过 `AbortController`）。
- 组件卸载时必须 `abort` 当前运行中的任务。
- `simulateGeneration` 支持 `AbortSignal`，取消后必须清理 `setInterval`。

### 18.5 禁止事项

```text
- 不要把生成结果覆盖到 inputImage。
- 不要让 generatedImages 回退为 string[]。
- 不要绕过 normalizeGeneratedImages 直接读取历史。
- 不要把 AI prompt、预设、引用图、模型参数只存在本地 state 中而不写入生成快照。
- 不要在组件卸载后让 simulateGeneration 的 interval 继续运行。
- 不要为了在生成中显示进度而破坏 node.data 的结构化数据。
- 不要为了假生成流重构 CanvasPage 大结构。
```

````

这版可以作为你现在的**完整长期规则**。  
核心意思就是：

```txt
前两个阶段拆分已经完成。
现在不继续主动大拆分。
后续新功能按模块写。
CanvasPage.tsx 只做必要接入。
AI 不要为了小功能重构全项目。
````
