import { parseBoxModel } from './utils'

// Helper to convert px to dp/sp for Compose (with dot syntax)
function convertComposeUnit(value: string, type: 'dp' | 'sp' = 'dp'): string {
  if (!value)
    return ''
  // Handle percentage
  if (value.endsWith('%'))
    return value // Can't easily convert %, might need context

  const match = value.match(/^(-?[\d.]+)px$/)
  if (match) {
    const num = Number.parseFloat(match[1])
    return `${num}.${type}`
  }
  // If it's already a number, assume it's px or raw value?
  // But usually input is "20px".
  return value
}

// Convert XML style units (from parseBoxModel) to Compose units
function toComposeUnit(val: string): string {
  if (val.endsWith('dp') || val.endsWith('sp')) {
    // 20dp -> 20.dp
    return val.replace(/([0-9.]+)((dp)|(sp))/, '$1.$2')
  }
  return val
}

// Detect Composable name based on style
function detectComposableName(style: Record<string, string>): string {
  // 1. Scroll
  if (style['overflow-y'] === 'scroll' || style['overflow-y'] === 'auto') {
    return 'Column' // Simplified, usually implies a Column in a verticalScroll modifier
  }
  if (style['overflow-x'] === 'scroll' || style['overflow-x'] === 'auto') {
    return 'Row'
  }

  // 2. Card (Shadow + Radius)
  if (style['box-shadow']) {
    return 'Card'
  }

  // 3. Image
  if ((style['background-image'] && style['background-image'].includes('url')) || style['object-fit']) {
    return 'Image'
  }

  // 4. Flex Layout
  if (style.display === 'flex') {
    if (style['flex-direction'] === 'column') {
      return 'Column'
    }
    return 'Row'
  }

  // 5. Text
  if (style['font-family'] || style.color || style['font-size'] || style['text-align'] || style['line-height'] || style['text-overflow']) {
    return 'Text'
  }

  // 6. Box (Default container)
  return 'Box'
}

// Convert CSS color to Compose Color
export function convertColor(color: string): string {
  if (!color) {
    return 'Color.Unspecified'
  }

  // Handle Hex
  if (color.startsWith('#')) {
    let hex = color.substring(1)

    // Expand shorthand #RGB -> #RRGGBB
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('')
    }
    // Expand shorthand #RGBA -> #RRGGBBAA
    if (hex.length === 4) {
      hex = hex.split('').map(c => c + c).join('')
    }

    // Now we have 6 or 8 chars
    if (hex.length === 6) {
      return `Color(0xFF${hex.toUpperCase()})`
    }
    if (hex.length === 8) {
      // CSS: RRGGBBAA
      // Android: AARRGGBB
      const r = hex.substring(0, 2)
      const g = hex.substring(2, 4)
      const b = hex.substring(4, 6)
      const a = hex.substring(6, 8)
      return `Color(0x${(a + r + g + b).toUpperCase()})`
    }
  }

  // Handle rgba(r, g, b, a)
  if (color.startsWith('rgba')) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
    if (match) {
      const r = Number.parseInt(match[1])
      const g = Number.parseInt(match[2])
      const b = Number.parseInt(match[3])
      const a = match[4] ? Number.parseFloat(match[4]) : 1.0

      const alphaInt = Math.round(a * 255)
      const toHex = (n: number): string => n.toString(16).padStart(2, '0').toUpperCase()

      return `Color(0x${toHex(alphaInt)}${toHex(r)}${toHex(g)}${toHex(b)})`
    }
  }

  // Handle rgb(r, g, b)
  if (color.startsWith('rgb')) {
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (match) {
      const r = Number.parseInt(match[1])
      const g = Number.parseInt(match[2])
      const b = Number.parseInt(match[3])
      const toHex = (n: number): string => n.toString(16).padStart(2, '0').toUpperCase()
      return `Color(0xFF${toHex(r)}${toHex(g)}${toHex(b)})`
    }
  }

  // Map common names
  const map: Record<string, string> = {
    white: 'Color.White',
    black: 'Color.Black',
    red: 'Color.Red',
    blue: 'Color.Blue',
    green: 'Color.Green',
    transparent: 'Color.Transparent',
    gray: 'Color.Gray',
    yellow: 'Color.Yellow',
    cyan: 'Color.Cyan',
    magenta: 'Color.Magenta',
    lightgray: 'Color.LightGray',
    darkgray: 'Color.DarkGray',
    darkgrey: 'Color.DarkGray',
    lightgrey: 'Color.LightGray',
    grey: 'Color.Gray',
  }

  return map[color.toLowerCase()] || 'Color.Black'
}

export function generateComposeCode(style: Record<string, string>): string {
  const composableName = detectComposableName(style)
  const modifiers: string[] = []
  const params: string[] = []

  // 1. Size
  if (style.width) {
    if (style.width === '100%') {
      modifiers.push('.fillMaxWidth()')
    }
    else if (style.width === 'auto') {
      modifiers.push('.wrapContentWidth()')
    }
    else {
      modifiers.push(`.width(${convertComposeUnit(style.width, 'dp')})`)
    }
  }
  if (style.height) {
    if (style.height === '100%') {
      modifiers.push('.fillMaxHeight()')
    }
    else if (style.height === 'auto') {
      modifiers.push('.wrapContentHeight()')
    }
    else {
      modifiers.push(`.height(${convertComposeUnit(style.height, 'dp')})`)
    }
  }

  // Flex Weight (heuristic: if flex-grow is set)
  if (style['flex-grow'] && style['flex-grow'] !== '0') {
    modifiers.push(`.weight(${style['flex-grow']}f)`)
  }

  // 2. Margin (Outer Padding)
  if (style.margin) {
    const m = parseBoxModel('margin', style.margin)
    const args = []
    if (m['android:layout_marginStart'])
      args.push(`start = ${toComposeUnit(m['android:layout_marginStart'])}`)
    if (m['android:layout_marginTop'])
      args.push(`top = ${toComposeUnit(m['android:layout_marginTop'])}`)
    if (m['android:layout_marginEnd'])
      args.push(`end = ${toComposeUnit(m['android:layout_marginEnd'])}`)
    if (m['android:layout_marginBottom'])
      args.push(`bottom = ${toComposeUnit(m['android:layout_marginBottom'])}`)
    if (m['android:layout_margin'])
      args.push(`${toComposeUnit(m['android:layout_margin'])}`)

    if (args.length > 0) {
      modifiers.push(`.padding(${args.join(', ')})`)
    }
  }

  // 3. Clip (Border Radius) - Clip before background to shape the background
  if (style['border-radius']) {
    const radius = convertComposeUnit(style['border-radius'], 'dp')
    modifiers.push(`.clip(RoundedCornerShape(${radius}))`)
  }

  // 4. Background
  if (style['background-color']) {
    modifiers.push(`.background(${convertColor(style['background-color'])})`)
  }
  else if (style.background) {
    if (style.background.startsWith('var(')) {
      // var(--xxx) -> R.drawable.xxx
      const varName = style.background.match(/var\(--([\w-]+)\)/)?.[1]
      if (varName) {
        modifiers.push(`.paint(painterResource(id = R.drawable.${varName}), contentScale = ContentScale.FillBounds)`)
      }
    }
    else if (!style.background.includes('url')) {
      // Simple color fallback
      modifiers.push(`.background(${convertColor(style.background)})`)
    }
  }

  // 5. Border
  if (style.border) {
    // border: 1px solid #000
    const match = style.border.match(/([\d.]+)px\s+\w+\s+(.*)/)
    if (match) {
      const width = match[1]
      const color = match[2]
      const radius = style['border-radius'] ? `RoundedCornerShape(${convertComposeUnit(style['border-radius'], 'dp')})` : 'RectangleShape'
      modifiers.push(`.border(${width}.dp, ${convertColor(color)}, ${radius})`)
    }
  }

  // 6. Padding (Inner)
  if (style.padding) {
    const p = parseBoxModel('padding', style.padding)
    const args = []
    if (p['android:paddingStart'])
      args.push(`start = ${toComposeUnit(p['android:paddingStart'])}`)
    if (p['android:paddingTop'])
      args.push(`top = ${toComposeUnit(p['android:paddingTop'])}`)
    if (p['android:paddingEnd'])
      args.push(`end = ${toComposeUnit(p['android:paddingEnd'])}`)
    if (p['android:paddingBottom'])
      args.push(`bottom = ${toComposeUnit(p['android:paddingBottom'])}`)
    if (p['android:padding'])
      args.push(`${toComposeUnit(p['android:padding'])}`)

    if (args.length > 0) {
      modifiers.push(`.padding(${args.join(', ')})`)
    }
  }

  // Composable Params
  if (composableName === 'Text') {
    params.push(`text = "Some Text"`)
    if (style.color)
      params.push(`color = ${convertColor(style.color)}`)
    if (style['font-size'])
      params.push(`fontSize = ${convertComposeUnit(style['font-size'], 'sp')}`)
    if (style['line-height'])
      params.push(`lineHeight = ${convertComposeUnit(style['line-height'], 'sp')}`)
    if (style['letter-spacing'])
      params.push(`letterSpacing = ${convertComposeUnit(style['letter-spacing'], 'sp')}`)

    if (style['font-weight']) {
      const fw = style['font-weight']
      if (fw === 'bold' || Number.parseInt(fw) >= 700) {
        params.push(`fontWeight = FontWeight.Bold`)
      }
      else if (Number.parseInt(fw) < 400) {
        params.push(`fontWeight = FontWeight.Light`)
      }
      else if (Number.parseInt(fw) === 500) {
        params.push(`fontWeight = FontWeight.Medium`)
      }
    }

    if (style['text-align']) {
      const align = style['text-align']
      if (align === 'center')
        params.push(`textAlign = TextAlign.Center`)
      else if (align === 'right')
        params.push(`textAlign = TextAlign.End`)
      else if (align === 'justify')
        params.push(`textAlign = TextAlign.Justify`)
    }

    if (style['text-overflow'] === 'ellipsis') {
      params.push(`overflow = TextOverflow.Ellipsis`)
      if (style['white-space'] === 'nowrap') {
        params.push(`maxLines = 1`)
      }
    }
  }
  else if (composableName === 'Image') {
    params.push(`painter = painterResource(id = R.drawable.placeholder)`)
    params.push(`contentDescription = null`)
    if (style['object-fit']) {
      if (style['object-fit'] === 'cover')
        params.push(`contentScale = ContentScale.Crop`)
      else if (style['object-fit'] === 'contain')
        params.push(`contentScale = ContentScale.Fit`)
    }
  }
  else if (composableName === 'Column' || composableName === 'Row') {
    // Alignment/Arrangement
    if (composableName === 'Column') {
      if (style['justify-content'] === 'center')
        params.push(`verticalArrangement = Arrangement.Center`)
      else if (style['justify-content'] === 'flex-end')
        params.push(`verticalArrangement = Arrangement.Bottom`)
      else if (style['justify-content'] === 'space-between')
        params.push(`verticalArrangement = Arrangement.SpaceBetween`)

      if (style['align-items'] === 'center')
        params.push(`horizontalAlignment = Alignment.CenterHorizontally`)
      else if (style['align-items'] === 'flex-end')
        params.push(`horizontalAlignment = Alignment.End`)
    }
    else {
      if (style['justify-content'] === 'center')
        params.push(`horizontalArrangement = Arrangement.Center`)
      else if (style['justify-content'] === 'flex-end')
        params.push(`horizontalArrangement = Arrangement.End`)
      else if (style['justify-content'] === 'space-between')
        params.push(`horizontalArrangement = Arrangement.SpaceBetween`)

      if (style['align-items'] === 'center')
        params.push(`verticalAlignment = Alignment.CenterVertically`)
      else if (style['align-items'] === 'flex-end')
        params.push(`verticalAlignment = Alignment.Bottom`)
    }
  }

  // Construct final code
  let modifierStr = 'Modifier'
  if (modifiers.length > 0) {
    modifierStr += `\n        ${modifiers.join('\n        ')}`
  }
  else {
    modifierStr = 'Modifier'
  }

  // Add modifier to params
  params.unshift(`modifier = ${modifierStr}`)

  const paramsStr = params.join(',\n    ')

  const isContainer = ['Box', 'Column', 'Row', 'Card'].includes(composableName)
  const indent = '    '

  let code = ''
  if (isContainer) {
    code = `${composableName}(\n${indent}${paramsStr.replace(/\n/g, `\n${indent}`)}\n${indent}) {\n${indent}${indent}// Content\n${indent}}`
  }
  else {
    code = `${composableName}(\n${indent}${paramsStr.replace(/\n/g, `\n${indent}`)}\n${indent})`
  }

  return code
}
