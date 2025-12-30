import { definePlugin } from '@tempad-dev/plugins'
import { generateComposeComponent, generateXmlComponent } from './component'
import { generateComposeCode } from './compose'
import {
  generateAndroidTag,
} from './utils'

export default definePlugin({
  name: 'android-xml-style',
  code: {
    'css': {
      title: 'delete-CSS',
      lang: 'css',
      transform() {
        return ''
      },
    },
    'js': {
      title: 'delete-JavaScript',
      lang: 'js',
      transform() {
        return ''
      },
    },
    // Android XML 输出
    'android-xml': {
      title: 'Android XML',
      lang: 'xml' as any,
      transform({ style }) {
        const code = generateAndroidTag(style)
        return `<!-- \n  Tip: Select a 'Component' or 'Instance' to view the full nested tree structure.\n  Currently viewing style for a single node.\n-->\n${code}`
      },
      transformComponent({ component }) {
        return generateXmlComponent(component)
      },
    },
    // Android Compose 输出
    'android-compose': {
      title: 'Jetpack Compose',
      lang: 'kotlin' as any,
      transform({ style }) {
        const code = generateComposeCode(style)
        return `/* \n  提示：请选中一个 Component 或 Instance 以生成完整的嵌套结构代码。\n  当前仅展示选中节点的样式代码。\n*/\n${code}`
      },
      transformComponent({ component }) {
        return generateComposeComponent(component)
      },
    },
    // 原始 CSS 代码输出
    'c-css': {
      title: '原始样式',
      lang: 'css',
      transform({ style }) {
        // 返回原样式
        return Object.entries(style)
          .map(([key, value]) => `${key}: ${value};`)
          .join('\n')
      },
    },
  },
})
