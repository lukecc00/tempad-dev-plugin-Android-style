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
        return generateAndroidTag(style)
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
        return generateComposeCode(style)
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
