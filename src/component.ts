import type {
  DesignComponent,
  DesignNode,
  TextNode,
} from '@tempad-dev/plugins'

// Helper to sanitize XML tag names or Compose function names
function sanitizeName(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '')
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

  if (['FRAME', 'GROUP', 'INSTANCE'].includes(node.type)) {
    const container = node as any // Type casting to access children
    const childrenXml = (container.children || [])
      .map((child: DesignNode) => generateXmlNode(child, indentLevel + 1))
      .join('\n')

    // Default to FrameLayout as we don't know the layout direction
    const safeTagName = node.type === 'INSTANCE' ? 'include' : 'FrameLayout'

    // For instances, we might want to use <include layout="..." /> but let's stick to container for now
    // Or if it's a known component name.

    let openTag = `<${safeTagName}
${indent}  android:layout_width="match_parent"
${indent}  android:layout_height="match_parent">`

    if (node.type === 'INSTANCE') {
      openTag = `<!-- Component: ${node.name} -->\n${indent}<FrameLayout
${indent}  android:layout_width="wrap_content"
${indent}  android:layout_height="wrap_content">`
    }

    return `${indent}${openTag}
${childrenXml}
${indent}</${safeTagName}>`
  }

  return `${indent}<!-- Unknown Node: ${node.type} -->`
}

export function generateXmlComponent(component: DesignComponent): string {
  return generateXmlNode(component, 0)
}

// --- Jetpack Compose Generation ---

function generateComposeNode(node: DesignNode, indentLevel: number = 0): string {
  const indent = '    '.repeat(indentLevel)

  if (node.type === 'TEXT') {
    const textNode = node as TextNode
    return `${indent}Text(text = "${textNode.characters}")`
  }

  if (['FRAME', 'GROUP', 'INSTANCE'].includes(node.type)) {
    const container = node as any
    const childrenCode = (container.children || [])
      .map((child: DesignNode) => generateComposeNode(child, indentLevel + 1))
      .join('\n')

    let composableName = 'Box' // Default container
    if (node.type === 'INSTANCE') {
      // Use the component name as the composable function name
      composableName = sanitizeName(node.name)
      // If name is empty or invalid, fallback to Box + comment
      if (!composableName)
        composableName = 'Box /* Unknown Component */'
    }

    // If it has children, add a block
    if (childrenCode.trim()) {
      return `${indent}${composableName} {
${childrenCode}
${indent}}`
    }
    else {
      return `${indent}${composableName}()`
    }
  }

  return `${indent}// Unknown Node: ${node.type}`
}

export function generateComposeComponent(component: DesignComponent): string {
  return `@Composable
fun ${sanitizeName(component.name) || 'MyComponent'}() {
${generateComposeNode(component, 1)}
}`
}
