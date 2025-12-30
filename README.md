# Android XML Style Plugin

一个用于将 CSS 样式转换为 Android XML 属性代码的 [TemPad Dev](https://github.com/ecomfe/tempad-dev) 插件。

该插件可以智能识别 CSS 样式并转换为对应的 Android XML 布局属性，极大提高从设计稿到 Android XML 开发的效率。

## 功能特性

- **尺寸转换**：自动将 `px` 转换为 `dp` (布局尺寸) 和 `sp` (字体大小)。
- **布局属性**：
  - `width` / `height` 支持 `match_parent` (100%), `wrap_content` (auto) 和具体数值。
  - 支持 `padding` 和 `margin` 的全方位解析（包括简写形式）。
- **样式映射**：
  - `background-color` -> `android:background`
  - `color` -> `android:textColor`
  - `font-weight: bold` -> `android:textStyle="bold"`
  - `text-align` -> `android:gravity`
  - `border-radius` -> `app:cardCornerRadius` (CardView 支持)

## 开发与构建

1. **安装依赖**

```bash
pnpm install
```

2. **构建插件**

```bash
pnpm run build
```

构建产物位于 `dist/index.mjs`。

## 使用方法

1. 确保已安装 [TemPad Dev](https://chromewebstore.google.com/detail/tempad-dev/lgoeakbaikpkihoiphamaeopmliaimpc) Chrome 插件。
2. 在 TemPad Dev 中，进入插件管理或设置页面。
3. 选择加载本地插件，并选择本项目 `dist/index.mjs` 文件。
4. 在设计稿上选中图层，在代码面板切换到 "Android XML" 选项卡即可查看转换结果。
