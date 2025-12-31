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
    // Android Drawable (Vector or Shape)
    'drawable': {
      title: 'Android Drawable',
      lang: 'xml' as any,
      transform(params) {
        const { code, style } = params

        let svgContent = code || ''

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
                  // ignore
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
              // Extract content inside var(...)
              const varMatch = colorStr.match(/var\(([^)]+)\)/)
              let resolvedColor = ''

              if (varMatch) {
                const content = varMatch[1] // e.g. "--toast" or "--color, #FFF"
                const parts = content.split(',').map(s => s.trim())
                const varNameRaw = parts[0]
                const fallback = parts[1]

                // Strategy: If fallback is a valid hex/color, use it (it might map to a known resource name like @color/white)
                if (fallback && (fallback.startsWith('#') || fallback.startsWith('rgb'))) {
                  resolvedColor = convertColorToHex(fallback)
                }

                if (!resolvedColor) {
                  // Sanitize varName
                  // 1. Remove leading dashes
                  let name = varNameRaw.replace(/^-+/, '')
                  // 2. Replace non-alphanumeric with underscore
                  name = name.replace(/\W/g, '_')
                  // 3. Ensure starts with letter or underscore (Android resource rules)
                  if (/^\d/.test(name)) {
                    name = `_${name}`
                  }
                  // 4. Lowercase
                  name = name.toLowerCase()

                  if (name) {
                    resolvedColor = `@color/${name}`
                  }
                  else {
                    resolvedColor = '@color/unknown'
                  }
                }
              }

              shapes.push(`  <solid android:color="${resolvedColor || '@color/unknown'}" />`)
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

        // Return empty string to attempt to hide/empty the panel
        return ''
      },
      transformComponent() {
        // 尝试从 fills 中提取（虽然之前尝试过不太行，但保留这个入口）
        return ''
      },
    },
    'css': false,
    'js': false,
    // 原始 CSS 代码输出
    'original-content': {
      title: 'Original Content',
      lang: 'css',
      transform(params) {
        return params.code || ''
      },
    },
  },
})
