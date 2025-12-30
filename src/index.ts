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
    // Android XML Style (Single Node)
    'android-xml': {
      title: 'Android XML (Style)',
      lang: 'xml' as any,
      transform({ style }) {
        return generateAndroidTag(style)
      },
    },
    // Android XML Tree (Component/Instance)
    'android-xml-tree': {
      title: 'Android XML (Component)',
      lang: 'xml' as any,
      transformComponent({ component }) {
        return generateXmlComponent(component)
      },
    },
    // Android Compose Style (Single Node)
    'android-compose': {
      title: 'Jetpack Compose (Style)',
      lang: 'kotlin' as any,
      transform({ style }) {
        return generateComposeCode(style)
      },
    },
    // Android Compose Tree (Component/Instance)
    'android-compose-tree': {
      title: 'Jetpack Compose (Component)',
      lang: 'kotlin' as any,
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
