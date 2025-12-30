// Helper to convert px to dp/sp
export function convertUnit(value: string, type: 'dp' | 'sp' = 'dp'): string {
  if (!value)
    return ''
  // Handle percentage
  if (value.endsWith('%'))
    return value // Can't easily convert %, might need context

  const match = value.match(/^(-?[\d.]+)px$/)
  if (match) {
    const num = Number.parseFloat(match[1])
    return `${num}${type}`
  }
  return value
}

// Parse padding/margin shorthand
export function parseBoxModel(property: string, value: string): Record<string, string> {
  const values = value.split(/\s+/).filter(Boolean)
  const result: Record<string, string> = {}
  const map: Record<string, string> = {}

  if (values.length === 1) {
    map.top = map.right = map.bottom = map.left = values[0]
  }
  else if (values.length === 2) {
    map.top = map.bottom = values[0]
    map.right = map.left = values[1]
  }
  else if (values.length === 3) {
    map.top = values[0]
    map.right = map.left = values[1]
    map.bottom = values[2]
  }
  else if (values.length === 4) {
    map.top = values[0]
    map.right = values[1]
    map.bottom = values[2]
    map.left = values[3]
  }

  if (values.length === 1) {
    if (property === 'padding')
      result['android:padding'] = convertUnit(values[0], 'dp')
    if (property === 'margin')
      result['android:layout_margin'] = convertUnit(values[0], 'dp')
  }
  else {
    if (map.top)
      result[property === 'padding' ? 'android:paddingTop' : 'android:layout_marginTop'] = convertUnit(map.top, 'dp')
    if (map.bottom)
      result[property === 'padding' ? 'android:paddingBottom' : 'android:layout_marginBottom'] = convertUnit(map.bottom, 'dp')
    if (map.left)
      result[property === 'padding' ? 'android:paddingStart' : 'android:layout_marginStart'] = convertUnit(map.left, 'dp')
    if (map.right)
      result[property === 'padding' ? 'android:paddingEnd' : 'android:layout_marginEnd'] = convertUnit(map.right, 'dp')
  }

  return result
}

// Map of Android attributes
type AndroidAttributes = Record<string, string>

// Detect widget type based on style
function detectTagName(style: Record<string, string>): string {
  // 1. ScrollView
  if (style['overflow-y'] === 'scroll' || style['overflow-y'] === 'auto')
    return 'ScrollView'
  if (style['overflow-x'] === 'scroll' || style['overflow-x'] === 'auto')
    return 'HorizontalScrollView'

  // 2. CardView (Shadow + Radius)
  if (style['box-shadow'])
    return 'androidx.cardview.widget.CardView'

  // 3. ImageView
  if ((style['background-image'] && style['background-image'].includes('url')) || style['object-fit'])
    return 'ImageView'

  // 4. LinearLayout (Flex)
  if (style.display === 'flex')
    return 'LinearLayout'

  // 5. TextView (Text content)
  // Strong signals for text
  if (style['font-family'] || style.color || style['font-size'] || style['text-align'] || style['line-height'] || style['text-overflow'])
    return 'TextView'

  // 6. View (Simple shape)
  // If it has dimensions and background but no layout/text props, it's likely a View
  const hasDim = style.width || style.height
  const hasBg = style.background || style['background-color']
  const isContainer = style.padding || style.display
  if (hasDim && hasBg && !isContainer)
    return 'View'

  // Default container
  return 'RelativeLayout'
}

// Core conversion logic
export function cssToAndroidAttrs(style: Record<string, string>, tagName: string): AndroidAttributes {
  const attrs: AndroidAttributes = {}

  // 1. Size
  if (style.width) {
    let w = style.width
    if (w === '100%')
      w = 'match_parent'
    else if (w === 'auto')
      w = 'wrap_content'
    else w = convertUnit(w, 'dp')
    attrs['android:layout_width'] = w
  }
  else {
    attrs['android:layout_width'] = 'wrap_content' // Default
  }

  if (style.height) {
    let h = style.height
    if (h === '100%')
      h = 'match_parent'
    else if (h === 'auto')
      h = 'wrap_content'
    else h = convertUnit(h, 'dp')
    attrs['android:layout_height'] = h
  }
  else {
    attrs['android:layout_height'] = 'wrap_content' // Default
  }

  // Max/Min Size
  if (style['max-width'])
    attrs['android:maxWidth'] = convertUnit(style['max-width'], 'dp')
  if (style['min-width'])
    attrs['android:minWidth'] = convertUnit(style['min-width'], 'dp')
  if (style['max-height'])
    attrs['android:maxHeight'] = convertUnit(style['max-height'], 'dp')
  if (style['min-height'])
    attrs['android:minHeight'] = convertUnit(style['min-height'], 'dp')

  // 2. Background
  // CardView uses cardBackgroundColor instead of background
  const isCard = tagName.includes('CardView')
  const bgProp = isCard ? 'app:cardBackgroundColor' : 'android:background'

  if (style['background-color']) {
    attrs[bgProp] = style['background-color']
  }
  else if (style.background && style.background.startsWith('var(')) {
    const match = style.background.match(/var\(--([\w-]+)\)/)
    if (match) {
      attrs[bgProp] = `@drawable/${match[1]}`
    }
    else {
      attrs[bgProp] = '@drawable/bg_placeholder'
    }
  }

  // 3. Text (Only for TextView)
  if (tagName === 'TextView') {
    if (style.color)
      attrs['android:textColor'] = style.color
    if (style['font-size'])
      attrs['android:textSize'] = convertUnit(style['font-size'], 'sp')

    if (style['font-weight']) {
      if (style['font-weight'] === 'bold' || Number.parseInt(style['font-weight']) >= 700) {
        attrs['android:textStyle'] = 'bold'
      }
    }

    if (style['text-align']) {
      const align = style['text-align']
      let gravity = ''
      if (align === 'center')
        gravity = 'center_horizontal'
      else if (align === 'right')
        gravity = 'end'
      else if (align === 'left')
        gravity = 'start'
      attrs['android:gravity'] = gravity
    }

    // Line Height
    if (style['line-height']) {
      const lhMatch = style['line-height'].match(/^(-?[\d.]+)px$/)
      const fsMatch = style['font-size']?.match(/^(-?[\d.]+)px$/)

      if (lhMatch && fsMatch) {
        const lh = Number.parseFloat(lhMatch[1])
        const fs = Number.parseFloat(fsMatch[1])
        const extra = lh - fs
        if (extra > 0) {
          attrs['android:lineSpacingExtra'] = `${extra}sp`
          attrs['android:translationY'] = `-${extra / 2}sp`
        }
      }
    }

    if (style['text-overflow'] === 'ellipsis') {
      attrs['android:ellipsize'] = 'end'
      if (style['white-space'] === 'nowrap') {
        attrs['android:maxLines'] = '1'
      }
    }
  }

  // 4. Box Model
  if (style.padding) {
    const p = parseBoxModel('padding', style.padding)
    Object.assign(attrs, p)
  }
  if (style.margin) {
    const m = parseBoxModel('margin', style.margin)
    Object.assign(attrs, m)
  }

  // 5. Opacity
  if (style.opacity) {
    attrs['android:alpha'] = style.opacity
  }

  // 6. Border Radius & Elevation (Specific handling)
  if (style['border-radius']) {
    const radius = convertUnit(style['border-radius'], 'dp')
    if (isCard) {
      attrs['app:cardCornerRadius'] = radius
    }
    else {
      // For regular views, radius usually implies a shape drawable or outline clipping
      attrs['android:clipToOutline'] = 'true'
      if (!attrs['android:background']) {
        attrs['android:background'] = '@drawable/bg_rounded'
      }
    }
  }

  if (style['box-shadow']) {
    // Very basic heuristic for elevation
    // box-shadow: 0px 4px 10px rgba(...)
    // We just assume existence implies elevation
    if (isCard) {
      attrs['app:cardElevation'] = '4dp' // Default or parse from shadow
    }
    else {
      attrs['android:elevation'] = '4dp'
    }
  }

  // 7. LinearLayout Specifics
  if (tagName === 'LinearLayout') {
    if (style['flex-direction'] === 'column') {
      attrs['android:orientation'] = 'vertical'
    }
    else {
      attrs['android:orientation'] = 'horizontal' // default
    }
  }

  // 8. ImageView Specifics
  if (tagName === 'ImageView') {
    attrs['android:src'] = '@drawable/placeholder'
    if (style['object-fit']) {
      if (style['object-fit'] === 'cover')
        attrs['android:scaleType'] = 'centerCrop'
      else if (style['object-fit'] === 'contain')
        attrs['android:scaleType'] = 'centerInside'
    }
  }

  // 9. Gravity for Containers (RelativeLayout, LinearLayout, etc.)
  if (tagName !== 'TextView') {
    if (style['justify-content'] === 'center' || style['align-items'] === 'center') {
      let gravity = ''
      if (tagName === 'LinearLayout') {
        // Flex to Gravity mapping depends on orientation
        const isVert = attrs['android:orientation'] === 'vertical'
        // Main Axis: justify-content
        if (style['justify-content'] === 'center') {
          gravity += isVert ? 'center_vertical' : 'center_horizontal'
        }
        // Cross Axis: align-items
        if (style['align-items'] === 'center') {
          gravity += (gravity ? '|' : '') + (isVert ? 'center_horizontal' : 'center_vertical')
        }
      }
      else {
        // RelativeLayout / FrameLayout generic centering
        if (style['justify-content'] === 'center')
          gravity += 'center_horizontal'
        if (style['align-items'] === 'center')
          gravity += `${gravity ? '|' : ''}center_vertical`
      }
      if (gravity)
        attrs['android:gravity'] = gravity
    }
  }

  return attrs
}

// Generate full XML tag
export function generateAndroidTag(style: Record<string, string>): string {
  const tagName = detectTagName(style)
  const attrs = cssToAndroidAttrs(style, tagName)

  // Add IDs and namespaces
  if (tagName === 'TextView') {
    if (!attrs['android:text'])
      attrs['android:text'] = '@string/some_text'
    attrs['android:id'] = '@+id/some_id'

    // Merge gravity for TextView
    if (style['text-align'] === 'center' && !attrs['android:gravity']?.includes('center_vertical')) {
      attrs['android:gravity'] = `${attrs['android:gravity'] || ''}|top`
    }
  }
  else {
    attrs['android:id'] = `@+id/view_${Math.floor(Math.random() * 10000)}`
    attrs['xmlns:android'] = 'http://schemas.android.com/apk/res/android'
    if (tagName.includes('CardView')) {
      attrs['xmlns:app'] = 'http://schemas.android.com/apk/res-auto'
    }
  }

  // Sort attributes
  const sortedKeys = Object.keys(attrs).sort((a, b) => {
    const priority = (key: string): number => {
      if (key.startsWith('xmlns:'))
        return 0
      if (key === 'android:id')
        return 1
      if (key === 'android:layout_width')
        return 2
      if (key === 'android:layout_height')
        return 3
      return 4
    }
    return priority(a) - priority(b)
  })

  const propsString = sortedKeys
    .map((key) => {
      let value = attrs[key]
      if (key === 'android:gravity') {
        if (value.startsWith('|'))
          value = value.substring(1)
        if (value.endsWith('|'))
          value = value.substring(0, value.length - 1)
      }
      return `${key}="${value}"`
    })
    .join('\n  ')

  return `<${tagName}\n  ${propsString}\n/>`
}

// Backward compatibility (deprecated)
export function cssToAndroidXml(style: Record<string, string>): string {
  const attrs = cssToAndroidAttrs(style, 'RelativeLayout')
  return Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join('\n')
}
