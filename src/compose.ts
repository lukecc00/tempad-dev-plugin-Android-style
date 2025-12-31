import { convertColorToHex, parseBoxModel, sanitizeResourceName } from './utils'

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
  const bg = style['background-image'] || style.background
  const isImageResource = (bg && bg.includes('url')) || style['object-fit']

  // Icon heuristic
  const w = Number.parseFloat(style.width || '0')
  const h = Number.parseFloat(style.height || '0')
  const isSmall = w > 0 && h > 0 && w <= 64 && h <= 64
  const isFlex = style.display === 'flex'
  const hasTextProps = style['font-family'] || style['font-size'] || style.color
  const isIcon = isSmall && !isFlex && !hasTextProps

  if (isImageResource || isIcon) {
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

  // Handle var(...)
  if (color.startsWith('var(')) {
    const varMatch = color.match(/var\(([^)]+)\)/)
    if (varMatch) {
      const content = varMatch[1]
      const parts = content.split(',').map(s => s.trim())
      const varNameRaw = parts[0]
      const fallback = parts[1]

      // Try fallback
      if (fallback && (fallback.startsWith('#') || fallback.startsWith('rgb'))) {
        return convertColor(fallback)
      }

      // Sanitize name
      const name = sanitizeResourceName(varNameRaw)
      if (name) {
        return `colorResource(id = R.color.${name})`
      }
    }
  }

  // Use shared utility to resolve color (handles mapping to colors.xml)
  const hexOrRes = convertColorToHex(color)

  if (hexOrRes.startsWith('@color/')) {
    // @color/name -> colorResource(id = R.color.name)
    const name = hexOrRes.substring(7)
    return `colorResource(id = R.color.${name})`
  }

  if (hexOrRes.startsWith('#')) {
    const hex = hexOrRes.substring(1)
    if (hex.length === 6) {
      return `Color(0xFF${hex.toUpperCase()})`
    }
    if (hex.length === 8) {
      return `Color(0x${hex.toUpperCase()})`
    }
  }

  return 'Color.Black'
}

export function generateComposeCode(style: Record<string, string>): string {
  const composableName = detectComposableName(style)
  const modifiers: string[] = []
  const params: string[] = []
  const indent = '    '

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
  if (style.margin || style['margin-top'] || style['margin-bottom'] || style['margin-left'] || style['margin-right'] || style['margin-start'] || style['margin-end']) {
    const m = style.margin ? parseBoxModel('margin', style.margin) : {}
    const args = []

    // Merge individual props
    if (style['margin-top']) {
      m['android:layout_marginTop'] = convertComposeUnit(style['margin-top'], 'dp')
    }
    if (style['margin-bottom']) {
      m['android:layout_marginBottom'] = convertComposeUnit(style['margin-bottom'], 'dp')
    }
    if (style['margin-left']) {
      m['android:layout_marginStart'] = convertComposeUnit(style['margin-left'], 'dp')
    }
    if (style['margin-right']) {
      m['android:layout_marginEnd'] = convertComposeUnit(style['margin-right'], 'dp')
    }
    if (style['margin-start']) {
      m['android:layout_marginStart'] = convertComposeUnit(style['margin-start'], 'dp')
    }
    if (style['margin-end']) {
      m['android:layout_marginEnd'] = convertComposeUnit(style['margin-end'], 'dp')
    }

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
    if (style['border-radius'] === '50%') {
      modifiers.push('.clip(CircleShape)')
    }
    else {
      const radius = convertComposeUnit(style['border-radius'], 'dp')
      modifiers.push(`.clip(RoundedCornerShape(${radius}))`)
    }
  }

  // 4. Background
  // Gradient Support
  const bg = style['background-image'] || style.background
  if (bg && bg.includes('linear-gradient')) {
    const colorRegex = /(#[0-9a-fA-F]{3,8}|rgba?\(.*?\))/g
    const colors = bg.match(colorRegex)
    if (colors && colors.length >= 2) {
      const color1 = convertColor(colors[0])
      const color2 = convertColor(colors[colors.length - 1])

      // Determine direction
      // CSS default is 'to bottom' (180deg)
      const isToTop = bg.includes('to top') || bg.includes('0deg')
      const isToRight = bg.includes('to right') || bg.includes('90deg')
      const isToLeft = bg.includes('to left') || bg.includes('270deg')
      // 'to bottom' is default or 180deg

      if (isToRight) {
        // Left -> Right
        modifiers.push(`.background(Brush.horizontalGradient(listOf(${color1}, ${color2})))`)
      }
      else if (isToLeft) {
        // Right -> Left (Swap colors for horizontal)
        modifiers.push(`.background(Brush.horizontalGradient(listOf(${color2}, ${color1})))`)
      }
      else if (isToTop) {
        // Bottom -> Top (Swap colors for vertical)
        modifiers.push(`.background(Brush.verticalGradient(listOf(${color2}, ${color1})))`)
      }
      else {
        // Top -> Bottom (Default)
        modifiers.push(`.background(Brush.verticalGradient(listOf(${color1}, ${color2})))`)
      }
    }
  }
  else if (style['background-color']) {
    modifiers.push(`.background(${convertColor(style['background-color'])})`)
  }
  else if (style.background) {
    if (style.background.startsWith('var(')) {
      // var(--xxx) -> R.drawable.xxx
      const varMatch = style.background.match(/var\(([^)]+)\)/)
      if (varMatch) {
        // Sanitize name for drawable
        const name = sanitizeResourceName(varMatch[1].split(',')[0].trim())
        if (name) {
          modifiers.push(`.paint(painterResource(id = R.drawable.${name}), contentScale = ContentScale.FillBounds)`)
        }
      }
    }
    else if (!style.background.includes('url')) {
      // Simple color fallback
      modifiers.push(`.background(${convertColor(style.background)})`)
    }
  }

  // Visibility
  if (style.display === 'none') {
    // gone -> size(0)
    modifiers.push('.size(0.dp)')
  }
  else if (style.visibility === 'hidden') {
    // invisible -> alpha(0)
    modifiers.push('.alpha(0f)')
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
  if (style.padding || style['padding-top'] || style['padding-bottom'] || style['padding-left'] || style['padding-right'] || style['padding-start'] || style['padding-end']) {
    const p = style.padding ? parseBoxModel('padding', style.padding) : {}
    const args = []

    // Merge individual props
    if (style['padding-top']) {
      p['android:paddingTop'] = convertComposeUnit(style['padding-top'], 'dp')
    }
    if (style['padding-bottom']) {
      p['android:paddingBottom'] = convertComposeUnit(style['padding-bottom'], 'dp')
    }
    if (style['padding-left']) {
      p['android:paddingStart'] = convertComposeUnit(style['padding-left'], 'dp')
    }
    if (style['padding-right']) {
      p['android:paddingEnd'] = convertComposeUnit(style['padding-right'], 'dp')
    }
    if (style['padding-start']) {
      p['android:paddingStart'] = convertComposeUnit(style['padding-start'], 'dp')
    }
    if (style['padding-end']) {
      p['android:paddingEnd'] = convertComposeUnit(style['padding-end'], 'dp')
    }

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
    if (style['line-height']) {
      const lh = style['line-height']
      if (lh.endsWith('px')) {
        params.push(`lineHeight = ${convertComposeUnit(lh, 'sp')}`)
      }
      else if (lh.endsWith('em')) {
        params.push(`lineHeight = ${lh.replace('em', '.em')}`)
      }
      else if (!Number.isNaN(Number.parseFloat(lh))) {
        // Unitless -> em
        params.push(`lineHeight = ${lh}.em`)
      }
    }
    if (style['letter-spacing']) {
      const ls = style['letter-spacing']
      if (ls.endsWith('em')) {
        params.push(`letterSpacing = ${ls.replace('em', '.em')}`)
      }
      else {
        params.push(`letterSpacing = ${convertComposeUnit(ls, 'sp')}`)
      }
    }

    if (style['font-weight']) {
      const fw = style['font-weight']
      const fwNum = Number.parseInt(fw)
      if (fw === 'bold' || fwNum >= 700) {
        params.push(`fontWeight = FontWeight.Bold`)
      }
      else if (fwNum === 100) {
        params.push(`fontWeight = FontWeight.Thin`)
      }
      else if (fwNum === 200) {
        params.push(`fontWeight = FontWeight.ExtraLight`)
      }
      else if (fwNum === 300 || fwNum < 400) {
        params.push(`fontWeight = FontWeight.Light`)
      }
      else if (fwNum === 400 || fw === 'normal') {
        params.push(`fontWeight = FontWeight.Normal`)
      }
      else if (fwNum === 500) {
        params.push(`fontWeight = FontWeight.Medium`)
      }
      else if (fwNum === 600) {
        params.push(`fontWeight = FontWeight.SemiBold`)
      }
      else if (fwNum === 800) {
        params.push(`fontWeight = FontWeight.ExtraBold`)
      }
      else if (fwNum === 900) {
        params.push(`fontWeight = FontWeight.Black`)
      }
    }

    if (style['font-family']) {
      const ff = style['font-family'].toLowerCase()
      if (ff.includes('monospace'))
        params.push(`fontFamily = FontFamily.Monospace`)
      else if (ff.includes('serif') && !ff.includes('sans-serif'))
        params.push(`fontFamily = FontFamily.Serif`)
      else if (ff.includes('sans-serif'))
        params.push(`fontFamily = FontFamily.SansSerif`)
    }

    if (style['font-style'] === 'italic') {
      params.push(`fontStyle = FontStyle.Italic`)
    }

    if (style['text-decoration']) {
      const td = style['text-decoration']
      const hasUnderline = td.includes('underline')
      const hasLineThrough = td.includes('line-through')
      if (hasUnderline && hasLineThrough) {
        params.push(`textDecoration = TextDecoration.combine(\n${indent}${indent}listOf(TextDecoration.Underline, TextDecoration.LineThrough)\n${indent})`)
      }
      else if (hasUnderline) {
        params.push(`textDecoration = TextDecoration.Underline`)
      }
      else if (hasLineThrough) {
        params.push(`textDecoration = TextDecoration.LineThrough`)
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

    // Text Shadow
    if (style['text-shadow'] && style['text-shadow'] !== 'none') {
      const match = style['text-shadow'].match(/(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(.+)/)
      if (match) {
        const dx = match[1]
        const dy = match[2]
        const radius = match[3]
        const color = convertColor(match[4])
        params.push(`style = TextStyle(\n${indent}${indent}shadow = Shadow(\n${indent}${indent}${indent}color = ${color},\n${indent}${indent}${indent}offset = Offset(${dx}f, ${dy}f),\n${indent}${indent}${indent}blurRadius = ${radius}f\n${indent}${indent})\n${indent})`)
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
  else if (composableName === 'Card') {
    // Add Elevation
    if (style['box-shadow']) {
      params.push(`elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)`)
    }
    else {
      params.push(`elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)`)
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
  else if (composableName === 'Box') {
    // Box Content Alignment
    if (style['justify-content'] === 'center' || style['align-items'] === 'center') {
      if (style['justify-content'] === 'center' && style['align-items'] === 'center') {
        params.push(`contentAlignment = Alignment.Center`)
      }
      else if (style['justify-content'] === 'center') {
        // Justify in Box (usually horizontal if row, but Box has no axis)
        // Actually, CSS justify-content aligns along main axis, align-items along cross.
        // For a generic box, we assume it centers children.
        // But without flex-direction, it's ambiguous.
        // Let's assume standard centering behavior if both are present.
        // If only one...
        params.push(`contentAlignment = Alignment.Center`)
      }
      else if (style['align-items'] === 'center') {
        params.push(`contentAlignment = Alignment.Center`)
      }
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

  let code = ''
  if (isContainer) {
    code = `${composableName}(\n${indent}${paramsStr.replace(/\n/g, `\n${indent}`)}\n${indent}) {\n${indent}${indent}// Content\n${indent}}`
  }
  else {
    code = `${composableName}(\n${indent}${paramsStr.replace(/\n/g, `\n${indent}`)}\n${indent})`
  }

  return code
}
