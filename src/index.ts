import { definePlugin } from '@tempad-dev/plugins'
import { generateComposeComponent, generateXmlComponent } from './component'
import { generateComposeCode } from './compose'
import { svgToVectorXml } from './svg-to-vector'
import {
  convertColorToHex,
  convertUnit,
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
    'c-css': false,
    // Android Drawable (Vector or Shape)
    'drawable': {
      title: 'Android Drawable',
      lang: 'xml' as any,
      transform(params) {
        const { code, style } = params

        let svgContent = code || ''
        let debugInfo = ''

        // 1. Try URL Decode
        if (svgContent.includes('%3C') || svgContent.includes('%3c')) {
          try {
            const decoded = decodeURIComponent(svgContent)
            if (decoded.includes('<svg')) {
              svgContent = decoded
            }
          }
          catch { /* ignore */ }
        }

        // 2. Check for SVG tag directly
        if (svgContent.includes('<svg') || svgContent.includes('http://www.w3.org/2000/svg')) {
          return svgToVectorXml(svgContent)
        }

        // 3. Check style['background-image'] or style['background']
        const bgImage = style['background-image'] || style.background
        if (bgImage && bgImage.includes('url(')) {
          const match = bgImage.match(/url\(['"]?(.*?)['"]?\)/)
          if (match && match[1]) {
            let url = match[1]
            // Handle data URI
            if (url.startsWith('data:image/svg+xml')) {
              if (url.includes('base64,')) {
                try {
                  const base64 = url.split('base64,')[1]
                  svgContent = atob(base64)
                }
                catch {
                  debugInfo += '<!-- Base64 SVG 解码失败 -->'
                }
              }
              else {
                // utf8
                url = url.replace(/data:image\/svg\+xml.*?,/, '')
                try {
                  svgContent = decodeURIComponent(url)
                }
                catch { /* ignore */ }
              }
            }
          }
        }

        if (svgContent && svgContent.includes('<svg')) {
          return svgToVectorXml(svgContent)
        }

        // 4. Fallback: Generate <shape> from CSS if applicable
        // If we have border-radius, border, or simple background, we can generate a Shape Drawable
        const hasRadius = !!style['border-radius']
        const hasBorder = !!style.border || !!style['border-width']
        // Check background-color, background, AND fill (which Tempad outputs for vectors)
        const hasBg = !!style['background-color'] || (style.background && !style.background.includes('url')) || !!style.fill

        if (hasRadius || hasBorder || hasBg) {
          const shapes: string[] = []
          shapes.push('<?xml version="1.0" encoding="utf-8"?>')
          shapes.push('<shape xmlns:android="http://schemas.android.com/apk/res/android">')

          // Solid Color
          const colorStr = style['background-color'] || style.background || style.fill
          if (colorStr && !colorStr.includes('url')) {
            if (colorStr.startsWith('var(')) {
              const varName = colorStr.match(/var\(--([\w-]+)\)/)?.[1] || 'unknown'
              // Try to be smart about variable names?
              shapes.push(`  <solid android:color="@color/${varName}" />`)
            }
            else {
              shapes.push(`  <solid android:color="${convertColorToHex(colorStr)}" />`)
            }
          }

          // Corners
          if (style['border-radius']) {
            const radius = convertUnit(style['border-radius'], 'dp')
            shapes.push(`  <corners android:radius="${radius}" />`)
          }

          // Stroke (Border)
          if (style.border || style['border-width']) {
            const width = convertUnit(style['border-width'] || '1px', 'dp')
            let color = '#000000'
            if (style['border-color']) {
              color = convertColorToHex(style['border-color'])
            }
            else if (style.border) {
              // 1px solid #000
              const parts = style.border.split(' ')
              const c = parts.find(p => p.startsWith('#') || p.startsWith('rgb'))
              if (c)
                color = convertColorToHex(c)
            }
            shapes.push(`  <stroke android:width="${width}" android:color="${color}" />`)
          }

          // Size (Optional, but helpful for preview)
          if (style.width && style.height) {
            const w = convertUnit(style.width, 'dp')
            const h = convertUnit(style.height, 'dp')
            shapes.push(`  <size android:width="${w}" android:height="${h}" />`)
          }

          shapes.push('</shape>')
          return shapes.join('\n')
        }

        // 5. Debug Output if extraction failed
        const paramKeys = Object.keys(params).join(',')
        debugInfo += `<!-- Debug: keys=[${paramKeys}], code.length=${code?.length}, style.keys=[${Object.keys(style).join(',')}] -->`
        const codePreview = code ? code.substring(0, 200).replace(/\n/g, ' ') : 'null'

        return `${debugInfo}\n<!--\n未检测到 SVG 或 Shape 内容。\n1. 请确保您选中了一个 Vector 节点或包含 SVG 内容的 Frame。\n2. 请确认 Tempad 是否为该选中项生成了 SVG 代码。\n当前代码预览：${codePreview}\n-->`
      },
      transformComponent() {
        // 尝试从 fills 中提取（虽然之前尝试过不太行，但保留这个入口）
        return ''
      },
    },
  },
})
