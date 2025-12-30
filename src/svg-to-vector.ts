import { convertColorToHex } from './utils'

export function svgToVectorXml(svgContent: string): string {
  if (!svgContent || !svgContent.includes('<svg')) return ''

  // Ensure we are in a browser environment
  if (typeof DOMParser === 'undefined') {
    return '<!-- Error: DOMParser not available. This plugin runs in browser environment. -->'
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(svgContent, 'image/svg+xml')
  const svg = doc.querySelector('svg')

  if (!svg) {
    return '<!-- Error: Invalid SVG content -->'
  }

  // 1. Parse Viewport & Dimensions
  const viewBox = svg.getAttribute('viewBox')
  let viewportWidth = '24.0'
  let viewportHeight = '24.0'

  if (viewBox) {
    const parts = viewBox.split(/[\s,]+/).filter(Boolean)
    if (parts.length === 4) {
      viewportWidth = parts[2]
      viewportHeight = parts[3]
    }
  }

  const width = svg.getAttribute('width') || `${Number.parseFloat(viewportWidth)}dp`
  const height = svg.getAttribute('height') || `${Number.parseFloat(viewportHeight)}dp`

  // 2. Recursive Node Processor
  function processNode(node: Element, indent: number): string {
    const spaces = '  '.repeat(indent)
    const tagName = node.tagName.toLowerCase()

    // Handle Groups <g>
    if (tagName === 'g') {
      const attrs: string[] = []
      
      const transform = node.getAttribute('transform')
      if (transform) {
        const translate = transform.match(/translate\(([^,]+)[,\s]([^)]+)\)/)
        if (translate) {
          attrs.push(`android:translateX="${translate[1].trim()}"`)
          attrs.push(`android:translateY="${translate[2].trim()}"`)
        }
        const scale = transform.match(/scale\(([^,]+)(?:[,\s]([^)]+))?\)/)
        if (scale) {
          attrs.push(`android:scaleX="${scale[1].trim()}"`)
          attrs.push(`android:scaleY="${(scale[2] || scale[1]).trim()}"`)
        }
        const rotate = transform.match(/rotate\(([^)]+)\)/)
        if (rotate) {
           attrs.push(`android:rotation="${rotate[1].trim()}"`)
        }
      }

      const children = Array.from(node.children)
        .map(child => processNode(child, indent + 1))
        .filter(Boolean)
        .join('\n')

      if (!children) return ''

      const attrsStr = attrs.length ? `\n${attrs.map(a => `${spaces}  ${a}`).join('\n')}` : ''
      return `${spaces}<group${attrsStr}>\n${children}\n${spaces}</group>`
    }

    // Handle Shapes & Paths
    if (['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon'].includes(tagName)) {
      let pathData = ''
      
      if (tagName === 'path') {
        pathData = node.getAttribute('d') || ''
      }
      else if (tagName === 'rect') {
        const x = Number.parseFloat(node.getAttribute('x') || '0')
        const y = Number.parseFloat(node.getAttribute('y') || '0')
        const w = Number.parseFloat(node.getAttribute('width') || '0')
        const h = Number.parseFloat(node.getAttribute('height') || '0')
        // M x,y h w v h h -w z
        pathData = `M ${x},${y} h ${w} v ${h} h -${w} z`
      }
      else if (tagName === 'circle') {
        const cx = Number.parseFloat(node.getAttribute('cx') || '0')
        const cy = Number.parseFloat(node.getAttribute('cy') || '0')
        const r = Number.parseFloat(node.getAttribute('r') || '0')
        // Convert circle to 2 arcs
        pathData = `M ${cx - r},${cy} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 -${r * 2},0`
      }
      else if (tagName === 'line') {
          const x1 = node.getAttribute('x1') || '0'
          const y1 = node.getAttribute('y1') || '0'
          const x2 = node.getAttribute('x2') || '0'
          const y2 = node.getAttribute('y2') || '0'
          pathData = `M ${x1},${y1} L ${x2},${y2}`
      }

      if (!pathData) return ''

      const attrs: string[] = []
      attrs.push(`android:pathData="${pathData}"`)

      // Colors
      const fill = node.getAttribute('fill')
      if (fill && fill !== 'none') {
        // Check for url(#id) gradient reference
        if (fill.startsWith('url(#')) {
           // We can't fully support gradients from SVG string without parsing <defs>
           // But we can try to find the gradient in defs
           const id = fill.substring(5, fill.length - 1)
           const defs = doc.querySelector(`defs #${id}`)
           
           if (defs && (defs.tagName === 'linearGradient' || defs.tagName === 'radialGradient')) {
             // Complex gradient support requires aapt:attr
             const gradientXml = parseGradient(defs, indent + 1)
             return `${spaces}<path\n${attrs.map(a => `${spaces}  ${a}`).join('\n')}>\n${gradientXml}\n${spaces}</path>`
           }
        } else {
           attrs.push(`android:fillColor="${convertColorToHex(fill)}"`)
        }
      }
      // Default fill logic
      else if (!fill && tagName !== 'line') {
         attrs.push(`android:fillColor="#FF000000"`)
      }

      const stroke = node.getAttribute('stroke')
      if (stroke && stroke !== 'none') {
        attrs.push(`android:strokeColor="${convertColorToHex(stroke)}"`)
        attrs.push(`android:strokeWidth="${node.getAttribute('stroke-width') || '1'}"`)
        
        const lineCap = node.getAttribute('stroke-linecap')
        if (lineCap) attrs.push(`android:strokeLineCap="${lineCap}"`)
        
        const lineJoin = node.getAttribute('stroke-linejoin')
        if (lineJoin) attrs.push(`android:strokeLineJoin="${lineJoin}"`)
      }
      
      const fillOpacity = node.getAttribute('fill-opacity')
      if (fillOpacity) attrs.push(`android:fillAlpha="${fillOpacity}"`)
      
      const strokeOpacity = node.getAttribute('stroke-opacity')
      if (strokeOpacity) attrs.push(`android:strokeAlpha="${strokeOpacity}"`)

      return `${spaces}<path\n${attrs.map(a => `${spaces}  ${a}`).join('\n')}\n${spaces}/>`
    }

    return ''
  }

  // Gradient Helper
  function parseGradient(gradientNode: Element, indent: number): string {
    const spaces = '  '.repeat(indent)
    const type = gradientNode.tagName === 'linearGradient' ? 'linear' : 'radial'
    
    const startX = gradientNode.getAttribute('x1') || '0'
    const startY = gradientNode.getAttribute('y1') || '0'
    const endX = gradientNode.getAttribute('x2') || '0'
    const endY = gradientNode.getAttribute('y2') || '0'
    
    const items = Array.from(gradientNode.querySelectorAll('stop')).map(stop => {
      const offset = stop.getAttribute('offset') || '0'
      const color = convertColorToHex(stop.getAttribute('stop-color') || '#000000')
      return `${spaces}  <item android:offset="${offset}" android:color="${color}" />`
    }).join('\n')

    return `${spaces}<aapt:attr name="android:fillColor">\n${spaces}  <gradient\n${spaces}    android:type="${type}"\n${spaces}    android:startX="${startX}"\n${spaces}    android:startY="${startY}"\n${spaces}    android:endX="${endX}"\n${spaces}    android:endY="${endY}">\n${items}\n${spaces}  </gradient>\n${spaces}</aapt:attr>`
  }

  const childrenXml = Array.from(svg.children)
    .map(child => processNode(child, 1))
    .filter(Boolean)
    .join('\n')

  return `<vector xmlns:android="http://schemas.android.com/apk/res/android"
  xmlns:aapt="http://schemas.android.com/aapt"
  android:width="${width.replace('px', 'dp')}"
  android:height="${height.replace('px', 'dp')}"
  android:viewportWidth="${viewportWidth}"
  android:viewportHeight="${viewportHeight}">
${childrenXml}
</vector>`
}
