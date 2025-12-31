# Android Style Plugin (XML & Compose)

一个用于将 CSS 样式转换为 Android XML 属性代码和 Jetpack Compose 代码的 [TemPad Dev](https://github.com/ecomfe/tempad-dev) 插件。

该插件可以智能识别 CSS 样式并转换为对应的 Android 原生开发代码，支持传统的 XML 布局和现代的 Jetpack Compose 声明式 UI，极大提高从设计稿到 Android 开发的效率。

## 功能特性

### 通用功能
- **尺寸转换**：自动将 `px` 转换为 `dp` (布局尺寸) 和 `sp` (字体大小)。
- **智能识别**：根据样式特征自动判断组件类型（如 Text, Image, Column, Row, Card 等）。

### Android XML
- **布局属性**：
  - `width` / `height` 支持 `match_parent`, `wrap_content` 和具体数值。
  - 支持 `padding` / `margin` 的全方位解析（包括单方向属性）。
  - **可见性**：`display: none` -> `gone`, `visibility: hidden` -> `invisible`。
- **样式映射**：
  - **背景**：支持纯色、`linear-gradient` 渐变、`url(...)` 图片资源。
  - **文本**：`color`, `font-size`, `font-weight`, `line-height`, `letter-spacing` 等完整支持。
  - **图标**：智能识别小尺寸 Icon 并映射为 `ImageView` / `SimpleDraweeView`。
  - **资源名清洗**：自动将非法 CSS 变量名（如 `@color/-toast`）转换为合法 Android 资源名（`@color/_toast`）。
- **组件映射**：支持将标准组件映射为自定义 View（如 `ScaleTextView`），并自动适配属性。

### Jetpack Compose
- **Composable 生成**：自动生成 `Box`, `Column`, `Row`, `Text`, `Image`, `Card` 等组件代码。
- **Modifier 链式调用**：
  - `.width()` / `.height()` / `.fillMaxWidth()`
  - `.padding()` (处理内外边距)
  - `.background()`
  - `.clip(RoundedCornerShape(...))`
- **属性映射**：
  - `color` -> `Color(...)`
  - `font-size` -> `.sp`
  - `object-fit` -> `ContentScale`

## 开发与构建

1. **安装依赖**

```bash
pnpm install
```

2. **构建插件**

```bash
pnpm run build
```

3. **更新颜色映射**

当你更新了 `assets/colors.xml` 文件后，需要运行以下命令来同步更新插件代码中的颜色映射表：

```bash
npm run gen:colors
# 或者如果你使用 pnpm
pnpm run gen:colors
```

该命令会读取 `assets/colors.xml` 并自动生成 `src/color-map.ts` 文件。

4. **自定义组件映射**

插件支持将基础组件映射为自定义的 Android View 类。例如，默认情况下：
- `TextView` -> `com.dragon.read.widget.scale.ScaleTextView`
- `ImageView` -> `com.facebook.drawee.view.SimpleDraweeView`

如果需要修改这些映射关系，请编辑 `src/mapping.ts` 文件：

```typescript
export const COMPONENT_MAPPING: Record<string, string> = {
  // Base Component -> Custom Class
  TextView: 'com.your.package.CustomTextView',
  ImageView: 'com.your.package.CustomImageView',
  // ... 其他组件
};
```

修改后请重新运行构建命令 `pnpm run build`。

构建产物位于 `dist/index.mjs`。

关于本插件的技术实现原理和开发指南，请参考 [技术文档](./docs/TECHNICAL_GUIDE.md)。

## 使用方法

1. 确保已安装 [TemPad Dev](https://chromewebstore.google.com/detail/tempad-dev/lgoeakbaikpkihoiphamaeopmliaimpc) Chrome 插件。
2. 在 TemPad Dev 中，进入插件管理或设置页面。
3. 选择加载本地插件，并选择本项目 `dist/index.mjs` 文件。
4. 在设计稿上选中图层：
   - 切换到 **"Android XML"** 选项卡查看 XML 代码。
   - 切换到 **"Jetpack Compose"** 选项卡查看 Compose 代码。
