import { convertUnit, parseBoxModel } from './utils'

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
function convertColor(color: string): string {
  if (!color) {
    return 'Color.Unspecified'
  }
  if (color.startsWith('#')) {
    // Simple hex conversion or keep as is if using a helper
    // Assuming we output generic Color(0xFF...) or Color.Red
    return `Color(0xFF${color.replace('#', '')})`
  }
  // Map common names
  const map: Record<string, string> = {
    white: 'Color.White',
    black: 'Color.Black',
    red: 'Color.Red',
    blue: 'Color.Blue',
    green: 'Color.Green',
    transparent: 'Color.Transparent',
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
    } else if (style.width === 'auto') {
      modifiers.push('.wrapContentWidth()')
    } else {
      modifiers.push(`.width(${convertUnit(style.width, 'dp')})`)
    }
  }
  if (style.height) {
    if (style.height === '100%') {
      modifiers.push('.fillMaxHeight()')
    } else if (style.height === 'auto') {
      modifiers.push('.wrapContentHeight()')
    } else {
      modifiers.push(`.height(${convertUnit(style.height, 'dp')})`)
    }
  }

  // 2. Padding/Margin
  // Margin in Compose is usually handled by padding on the parent or spacer,
  // but if we treat this as a single component, outer padding is effectively margin.
  // However, strict translation: margin -> padding (outer), padding -> padding (inner).
  // Compose Modifiers order matters.

  if (style.margin) {
    const m = parseBoxModel('margin', style.margin)
    // Convert android attrs to Compose padding
    // android:layout_marginTop -> top
    const args = []
    if (m['android:layout_marginStart']) args.push(`start = ${m['android:layout_marginStart']}`)
    if (m['android:layout_marginTop']) args.push(`top = ${m['android:layout_marginTop']}`)
    if (m['android:layout_marginEnd']) args.push(`end = ${m['android:layout_marginEnd']}`)
    if (m['android:layout_marginBottom']) args.push(`bottom = ${m['android:layout_marginBottom']}`)
    if (m['android:layout_margin']) args.push(`${m['android:layout_margin']}`) // uniform

    if (args.length > 0) {
      modifiers.push(`.padding(${args.join(', ')})`)
    }
  }

  // 3. Background (before padding/content)
  if (style['background-color']) {
    modifiers.push(`.background(${convertColor(style['background-color'])})`)
  }

  // 4. Padding (Inner)
  if (style.padding) {
    const p = parseBoxModel('padding', style.padding)
    const args = []
    if (p['android:paddingStart']) args.push(`start = ${p['android:paddingStart']}`)
    if (p['android:paddingTop']) args.push(`top = ${p['android:paddingTop']}`)
    if (p['android:paddingEnd']) args.push(`end = ${p['android:paddingEnd']}`)
    if (p['android:paddingBottom']) args.push(`bottom = ${p['android:paddingBottom']}`)
    if (p['android:padding']) args.push(`${p['android:padding']}`)

    if (args.length > 0) {
      modifiers.push(`.padding(${args.join(', ')})`)
    }
  }

  // 5. Border Radius (Clip)
  if (style['border-radius']) {
    const radius = convertUnit(style['border-radius'], 'dp')
    modifiers.push(`.clip(RoundedCornerShape(${radius}))`)
  }

  // Composable Params
  if (composableName === 'Text') {
    params.push(`text = "Some Text"`)
    if (style.color) params.push(`color = ${convertColor(style.color)}`)
    if (style['font-size']) params.push(`fontSize = ${convertUnit(style['font-size'], 'sp')}`)
    if (style['font-weight']) {
      const fw = style['font-weight']
      if (fw === 'bold' || parseInt(fw) >= 700) {
        params.push(`fontWeight = FontWeight.Bold`)
      }
    }
    if (style['text-align']) {
      const align = style['text-align']
      if (align === 'center') params.push(`textAlign = TextAlign.Center`)
      else if (align === 'right') params.push(`textAlign = TextAlign.End`)
    }
    if (style['text-overflow'] === 'ellipsis') {
      params.push(`overflow = TextOverflow.Ellipsis`)
      if (style['white-space'] === 'nowrap') {
        params.push(`maxLines = 1`)
      }
    }
  } else if (composableName === 'Image') {
    params.push(`painter = painterResource(id = R.drawable.placeholder)`)
    params.push(`contentDescription = null`)
    if (style['object-fit']) {
      if (style['object-fit'] === 'cover') params.push(`contentScale = ContentScale.Crop`)
      else if (style['object-fit'] === 'contain') params.push(`contentScale = ContentScale.Fit`)
    }
  } else if (composableName === 'Column' || composableName === 'Row') {
    // Alignment/Arrangement
    if (composableName === 'Column') {
      if (style['justify-content'] === 'center') params.push(`verticalArrangement = Arrangement.Center`)
      if (style['align-items'] === 'center') params.push(`horizontalAlignment = Alignment.CenterHorizontally`)
    } else {
      if (style['justify-content'] === 'center') params.push(`horizontalArrangement = Arrangement.Center`)
      if (style['align-items'] === 'center') params.push(`verticalAlignment = Alignment.CenterVertically`)
    }
  }

  // Construct final code
  let modifierStr = 'Modifier'
  if (modifiers.length > 0) {
    modifierStr += `\n        ${modifiers.join('\n        ')}`
  } else {
    modifierStr = 'Modifier'
  }

  // Add modifier to params
  params.unshift(`modifier = ${modifierStr}`)

  const paramsStr = params.join(',\n    ')

  const isContainer = ['Box', 'Column', 'Row', 'Card'].includes(composableName)

  if (isContainer) {
    return `${composableName}(\n    ${paramsStr}\n) {\n    // Content\n}`
  } else {
    return `${composableName}(\n    ${paramsStr}\n)`
  }
}
