import type {
  DesignComponent,
  DesignNode,
  Fill,
  TextNode,
} from '@tempad-dev/plugins'

import { convertColor } from './compose'
import { convertColorToHex } from './utils'

// Extended interface for Figma-like properties
type FigmaNode = DesignNode & {
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL'
  primaryAxisAlignItems?: 'MIN' | 'MAX' | 'CENTER' | 'SPACE_BETWEEN'
  counterAxisAlignItems?: 'MIN' | 'MAX' | 'CENTER' | 'BASELINE'
  fills?: Fill[] | any[]
}

// Helper to sanitize XML tag names or Compose function names
function sanitizeName(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '')
}

function getBackgroundColor(node: DesignNode): string | null {
  const figmaNode = node as FigmaNode
  if (figmaNode.fills && Array.isArray(figmaNode.fills) && figmaNode.fills.length > 0) {
    // Find the first solid visible fill
    for (const fill of figmaNode.fills) {
      if (fill.visible !== false && fill.type === 'SOLID') {
        // TemPad might return hex or object.
        // If it's standard plugin API, fill.color is {r, g, b}.
        // BUT TemPad simplifies things.
        // Let's assume fill.color is a string (hex/rgba) or object based on d.ts
        // d.ts says: color: string | Variable
        if (typeof fill.color === 'string') {
          return fill.color
        }
      }
    }
  }
  return null
}

function isLayout(node: DesignNode): 'VERTICAL' | 'HORIZONTAL' | 'NONE' {
  const figmaNode = node as FigmaNode
  return figmaNode.layoutMode || 'NONE'
}

function getDebugInfo(node: DesignNode): string {
  const keys = Object.keys(node).join(', ')
  return `<!-- Debug Info: Type=${node.type}, Name=${node.name}, Keys=[${keys}] -->`
}

function getComposeDebugInfo(node: DesignNode): string {
  const keys = Object.keys(node).join(', ')
  return `// Debug Info: Type=${node.type}, Name=${node.name}, Keys=[${keys}]`
}

// --- Android XML Generation ---

function generateXmlNode(node: DesignNode, indentLevel: number = 0): string {
  const indent = '  '.repeat(indentLevel)

  if (node.type === 'TEXT') {
    const textNode = node as TextNode
    // Simple TextView
    return `${indent}<TextView
${indent}  android:text="${textNode.characters}"
${indent}  android:layout_width="wrap_content"
${indent}  android:layout_height="wrap_content"
${indent}/>`
  }

  if (['FRAME', 'GROUP', 'INSTANCE', 'COMPONENT'].includes(node.type)) {
    const container = node as any // Type casting to access children
    const layoutMode = isLayout(node)

    let safeTagName = 'FrameLayout'
    let attrs = ''

    // Heuristic for Layout
    if (layoutMode === 'VERTICAL') {
      safeTagName = 'LinearLayout'
      attrs += `\n${indent}  android:orientation="vertical"`
    }
    else if (layoutMode === 'HORIZONTAL') {
      safeTagName = 'LinearLayout'
      attrs += `\n${indent}  android:orientation="horizontal"`
    }

    // Background
    const bg = getBackgroundColor(node)
    if (bg) {
      attrs += `\n${indent}  android:background="${convertColorToHex(bg)}"`
    }

    const childrenXml = (container.children || [])
      .map((child: DesignNode) => generateXmlNode(child, indentLevel + 1))
      .join('\n')

    let openTag = `<${safeTagName}
${indent}  android:layout_width="match_parent"
${indent}  android:layout_height="match_parent"${attrs}>`

    if (node.type === 'INSTANCE' || node.type === 'COMPONENT') {
      openTag = `<!-- Component: ${node.name} -->\n${indent}<${safeTagName}
${indent}  android:layout_width="wrap_content"
${indent}  android:layout_height="wrap_content"${attrs}>`
    }
    else if (layoutMode !== 'NONE') {
      // Auto Layout Frames usually wrap content
      openTag = `<${safeTagName}
${indent}  android:layout_width="wrap_content"
${indent}  android:layout_height="wrap_content"${attrs}>`
    }

    // Hint for empty children
    let innerContent = childrenXml
    if (!innerContent.trim()) {
      innerContent = `${indent}<!-- No children detected. If this is a Frame, please convert it to a Component to expose its structure. -->`
    }

    return `${indent}${openTag}
${innerContent}
${indent}</${safeTagName}>`
  }

  return `${indent}<!-- Unknown Node: ${node.type} -->`
}

export function generateXmlComponent(component: DesignComponent): string {
  const debug = getDebugInfo(component)
  return `${debug}\n${generateXmlNode(component, 0)}`
}

// --- Jetpack Compose Generation ---

function generateComposeNode(node: DesignNode, indentLevel: number = 0): string {
  const indent = '    '.repeat(indentLevel)

  if (node.type === 'TEXT') {
    const textNode = node as TextNode
    return `${indent}Text(text = "${textNode.characters}")`
  }

  if (['FRAME', 'GROUP', 'INSTANCE', 'COMPONENT'].includes(node.type)) {
    const container = node as any
    const layoutMode = isLayout(node)

    let composableName = 'Box'
    let modifiers = ''

    if (layoutMode === 'VERTICAL')
      composableName = 'Column'
    else if (layoutMode === 'HORIZONTAL')
      composableName = 'Row'

    // Instance name override
    if (node.type === 'INSTANCE') {
      const name = sanitizeName(node.name)
      if (name)
        composableName = name
      
      if (layoutMode === 'VERTICAL')
        composableName = 'Column'
      else if (layoutMode === 'HORIZONTAL')
        composableName = 'Row'
      else composableName = 'Box'
    }

    // Background
    const bg = getBackgroundColor(node)
    if (bg) {
      modifiers = `\n${indent}    .background(${convertColor(bg)})`
    }

    const childrenCode = (container.children || [])
      .map((child: DesignNode) => generateComposeNode(child, indentLevel + 1))
      .join('\n')

    let params = ''
    if (modifiers) {
      params = `modifier = Modifier${modifiers}`
    }

    // Hint for empty children
    let innerContent = childrenCode
    if (!innerContent.trim()) {
      innerContent = `${indent}// No children detected. If this is a Frame, please convert it to a Component to expose its structure.`
    }

    // If it has children (or hint), add a block
    if (innerContent.trim()) {
      if (params) {
        return `${indent}${composableName}(\n${indent}    ${params}\n${indent}) {
${innerContent}
${indent}}`
      }
      else {
        return `${indent}${composableName} {
${innerContent}
${indent}}`
      }
    }
    else {
      // Should not happen given the hint logic above
      if (params) {
        return `${indent}${composableName}(${params})`
      }
      return `${indent}${composableName}()`
    }
  }

  return `${indent}// Unknown Node: ${node.type} -->`
}

export function generateComposeComponent(component: DesignComponent): string {
  const debug = getComposeDebugInfo(component)
  return `${debug}
@Composable
fun ${sanitizeName(component.name) || 'MyComponent'}() {
${generateComposeNode(component, 1)}
}`
}
