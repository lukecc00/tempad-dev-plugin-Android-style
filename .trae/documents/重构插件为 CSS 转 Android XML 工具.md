我已完成对现有代码库的调研。目前的插件主要通过 `wzCodeMap.json` 将 CSS 映射为 WZ 类名。为了实现 CSS 到 Android XML 的转换，我制定了以下计划：

### 1. 清理旧逻辑
- 删除 `src/wzCodeMap.json`，因为这是 WZ 类名专用的映射表。
- 修改 `src/utils.ts`，移除 `tryMatchClasses`、`parseShorthand`（可能部分保留用于解析 padding/margin）、`matchRules` 等与 WZ 类名强相关的逻辑。

### 2. 实现 CSS 到 Android XML 的转换核心逻辑
在 `src/utils.ts` 中实现新的转换函数 `cssToAndroidXml(style: Record<string, string>): string`：
- **单位转换**：实现 `px` 转 `dp` (布局/间距) 和 `sp` (字体)。
- **属性映射**：
    - `width` / `height`: 处理 `100%` -> `match_parent`, `auto` -> `wrap_content`, 数值 -> `dp`。
    - `background-color`: 映射为 `android:background`。
    - `color`: 映射为 `android:textColor`。
    - `font-size`: 映射为 `android:textSize` (使用 sp)。
    - `font-weight`: 识别 `bold` 映射为 `android:textStyle="bold"`。
    - `text-align`: 映射为 `android:gravity` (需注意区分 TextView 的 gravity 和 Layout 的 layout_gravity，这里优先映射为内容对齐 `gravity`)。
    - `padding` / `margin`: 处理缩写并映射为 `android:padding`, `android:paddingTop`, `android:layout_marginTop` 等。
    - `line-height`: Android 中对应 `lineSpacingExtra` 或 `lineHeight` (API 28+)，可视情况简单映射。
    - `border-radius`: 尝试映射为 `app:cardCornerRadius` (假设是 CardView) 或者生成注释提示需要 Shape。

### 3. 更新插件入口 `src/index.ts`
- 修改插件名称为 `android-xml-style`。
- 移除原有的 `a-className` (WZ 类名) 和 `b-css` (剩余 CSS) 转换器。
- 添加新的转换器 `android-xml`，调用 `cssToAndroidXml` 生成代码。
- 保留 `delete-CSS` 和 `delete-JavaScript` 以方便用户清理无用代码。

### 4. 验证与交付
- 编写简单的测试用例或通过模拟输入验证转换结果。
- 确保生成的 XML 代码格式正确（每行一个属性）。

这个计划将完全替换原有的 WZ 类名生成功能。请确认是否开始执行。