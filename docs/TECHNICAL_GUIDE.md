# TemPad Android Style Plugin 技术指南

本文档旨在详细解析本插件的技术实现原理，帮助开发者理解如何为 TemPad 开发自定义代码生成插件。

## 1. 插件架构概述

本插件基于 `@tempad-dev/plugins` SDK 开发。TemPad 的插件系统核心是一个纯函数转换器：输入设计稿的样式数据（CSS 对象），输出目标平台的代码字符串。

### 目录结构

```
src/
├── index.ts      # 插件入口与配置
├── utils.ts      # 通用工具 & Android XML 生成逻辑
└── compose.ts    # Jetpack Compose 生成逻辑
```

## 2. 核心工作流程

插件的主要工作流在 `src/index.ts` 中定义：

```typescript
export default definePlugin({
  name: 'android-xml-style',
  code: {
    // 定义输出类型：Android XML
    'android-xml': {
      title: 'Android XML',
      lang: 'xml',
      transform({ style }) {
        // 核心转换逻辑
        return generateAndroidTag(style)
      },
    },
    // 定义输出类型：Jetpack Compose
    'android-compose': {
      title: 'Jetpack Compose',
      lang: 'kotlin',
      transform({ style }) {
        // 核心转换逻辑
        return generateComposeCode(style)
      },
    },
  },
})
```

`transform` 函数接收一个包含 `style` (CSS 键值对) 的对象，我们需要做的就是解析这些 CSS 属性并映射到 Android 的概念中。

## 3. 技术实现细节

### 3.1 智能组件识别 (Heuristics)

由于 CSS 是通用的样式描述，而 Android 开发强依赖于具体的组件（如 `TextView`, `ImageView`），我们需要通过**启发式规则**来推断组件类型。

**实现代码**：`detectComposableName` (compose.ts) / `detectTagName` (utils.ts)

规则示例：
- 如果包含 `text-` 相关属性或 `font-` 属性 -> **Text / TextView**
- 如果包含 `background-image` 或 `object-fit` -> **Image / ImageView**
- 如果 `display: flex` 且 `flex-direction: column` -> **Column / LinearLayout(vertical)**
- 如果包含 `box-shadow` -> **Card / CardView**
- 默认情况 -> **Box / View**

### 3.2 单位转换与数值处理

设计稿通常使用 `px`，而 Android 开发使用 `dp` 和 `sp`。

**实现代码**：`convertUnit` (utils.ts) / `convertComposeUnit` (compose.ts)

- **逻辑**：解析 `100px` 字符串，提取数值。
- **XML**：输出 `100dp`。
- **Compose**：输出 `100.dp` (Kotlin 扩展属性语法)。
- **字体**：特殊处理，转换为 `sp`。

### 3.3 颜色处理

CSS 颜色格式多样（Hex, RGB, RGBA, Color Names），需要统一转换为 Android 可用的格式。

**实现代码**：`convertColor` (compose.ts)

- **Hex**: `#RRGGBB` -> `Color(0xFFRRGGBB)`
- **Alpha Hex**: `#RRGGBBAA` -> `Color(0xAARRGGBB)` (注意 Alpha 位置的调整)
- **RGBA**: `rgba(r,g,b,a)` -> 计算 Alpha 整数值 -> 拼接 Hex。

### 3.4 布局模型映射

CSS 的 Box Model (Padding/Margin) 和 Flexbox 需要映射到 Android 的布局系统。

- **Padding/Margin**:
  - CSS 支持简写 `padding: 10px 20px`。
  - 需要解析为 `top`, `bottom`, `left`, `right` 四个方向。
  - 映射到 Compose 的 `.padding(start=..., top=...)` 或 XML 的 `android:paddingStart` 等。
- **Flexbox**:
  - `justify-content` -> `Arrangement` (Compose) / `gravity` (XML LinearLayout)
  - `align-items` -> `Alignment` (Compose) / `gravity` (XML LinearLayout)

## 4. Jetpack Compose 生成特有逻辑

Compose 代码生成比 XML 更复杂，因为它涉及函数调用链（Modifier）。

1. **Modifier 构建**：
   我们创建一个 `modifiers` 数组，按顺序推入属性。
   *顺序很重要*：例如 `padding` 和 `background` 的顺序决定了背景是绘制在内边距之内还是之外。本插件采用了符合直觉的顺序：`Size -> Weight -> Margin(Outer Padding) -> Clip -> Background -> Border -> Padding(Inner)`。

2. **代码组装**：
   使用模板字符串拼接 imports、@Preview 注解、Composable 函数名、参数和内容块。

## 5. 如何开发你自己的插件

如果你想支持 Flutter, SwiftUI 或其他框架，可以参考以下步骤：

1. **Clone 本项目** 作为模板。
2. **修改 `src/index.ts`**：
   - 更改 `name` 和 `code` 下的 key（如 `flutter-dart`）。
   - 修改 `lang` 为目标语言。
3. **实现转换逻辑**：
   - 创建一个新的转换文件（如 `flutter.ts`）。
   - 编写函数 `cssToFlutter(style: Record<string, string>): string`。
   - 实现类似的组件识别和属性映射逻辑。
4. **调试**：
   - 运行 `pnpm run dev` 或 `pnpm run build`。
   - 在 TemPad Dev 插件中加载 `dist/index.mjs` 进行测试。

## 6. 最佳实践建议

- **容错性**：设计稿数据可能不完整或不规范，代码中要有默认值处理（如默认颜色、默认尺寸）。
- **代码风格**：生成的代码应符合目标语言的官方风格指南（如 Kotlin 的缩进和命名规范）。
- **测试**：编写单元测试用例（参考 `test_compose.ts` 的方式），覆盖各种 CSS 组合场景。
