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

export function convertColorToHex(color: string): string {
  if (!color)
    return ''

  // Pre-process hex shorthand and normalization
  let hex = ''
  let alpha = 'FF'

  if (color.startsWith('#')) {
    const raw = color.substring(1)
    if (raw.length === 3) {
      hex = raw.split('').map(c => c + c).join('').toUpperCase()
    }
    else if (raw.length === 4) {
      // #RGBA -> #RRGGBBAA
      const full = raw.split('').map(c => c + c).join('').toUpperCase()
      // CSS: RRGGBBAA
      hex = full.substring(0, 6)
      alpha = full.substring(6, 8)
    }
    else if (raw.length === 6) {
      hex = raw.toUpperCase()
    }
    else if (raw.length === 8) {
      // CSS: RRGGBBAA -> Android: AARRGGBB
      // But for color map lookup we need #AARRGGBB format usually
      // Android colors.xml usually stores #AARRGGBB
      const r = raw.substring(0, 2)
      const g = raw.substring(2, 4)
      const b = raw.substring(4, 6)
      const a = raw.substring(6, 8)
      hex = (r + g + b).toUpperCase()
      alpha = a.toUpperCase()
    }
  }
  else if (color.startsWith('rgb')) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
    if (match) {
      const r = Number.parseInt(match[1]).toString(16).padStart(2, '0').toUpperCase()
      const g = Number.parseInt(match[2]).toString(16).padStart(2, '0').toUpperCase()
      const b = Number.parseInt(match[3]).toString(16).padStart(2, '0').toUpperCase()
      hex = r + g + b
      if (match[4]) {
        alpha = Math.round(Number.parseFloat(match[4]) * 255).toString(16).padStart(2, '0').toUpperCase()
      }
    }
  }
  else {
    // Named colors map
    const map: Record<string, string> = {
      white: '#FFFFFF',
      black: '#000000',
      red: '#FF0000',
      blue: '#0000FF',
      green: '#008000',
      transparent: '#00000000',
      // ... (add more if needed)
    }
    const mapped = map[color.toLowerCase()]
    if (mapped) return convertColorToHex(mapped)
    return '#000000' // Default fallback
  }

  // Construct Android Hex: #AARRGGBB
  const androidHex = `#${alpha}${hex}`

  // Try to find in color map (assets/colors.xml)
  // Since we can't read file in browser environment, we hardcode the map or inject it.
  // For this environment, I will embed the map derived from the file content you provided.
  const colorResource = findColorResource(androidHex)
  if (colorResource) {
    return `@color/${colorResource}`
  }

  return androidHex
}

// Embedded Color Map from assets/colors.xml
// Key: #AARRGGBB (uppercase), Value: resource name
const COLOR_MAP: Record<string, string> = {
  '#FFFF5F00': 'color_orange_brand',
  '#1AFF5F00': 'color_orange_brand_10',
  '#FF000000': 'color_black_100',
  '#CC000000': 'color_black_80',
  '#B3000000': 'color_black_70',
  '#99000000': 'color_black_60',
  '#80000000': 'color_black_50',
  '#66000000': 'color_black_40',
  '#4D000000': 'color_black_30',
  '#33000000': 'color_black_20',
  '#1A000000': 'color_black_10',
  '#14000000': 'color_black_8',
  '#0F000000': 'color_black_6',
  '#0A000000': 'color_black_4',
  '#08000000': 'color_black_3',
  '#00000000': 'color_black_0',
  '#FFFFFFFF': 'color_white_100',
  '#E6FFFFFF': 'color_white_90',
  '#CCFFFFFF': 'color_white_80',
  '#D9FFFFFF': 'color_white_85',
  '#99FFFFFF': 'color_white_60',
  '#66FFFFFF': 'color_white_40',
  '#80FFFFFF': 'color_white_50',
  '#4DFFFFFF': 'color_white_30',
  '#33FFFFFF': 'color_white_20',
  '#1AFFFFFF': 'color_white_10',
  '#14FFFFFF': 'color_white_8',
  '#08FFFFFF': 'color_white_3',
  '#0AFFFFFF': 'color_white_4',
  '#00FFFFFF': 'color_white_0',
  '#FFF5F5F5': 'bg_f5f5f5',
  '#E6000000': 'bg_black_90',
  '#FF141414': 'bg_141414',
  '#E6141414': 'bg_141414_90',
  '#FF527EB0': 'color_link',
  '#FFCE9B52': 'color_ce9b52',
  '#FF333333': 'bg_seek_hint_black_v525',
  '#FF999999': 'color_999999',
  '#FFCCCCCC': 'color_CCCCCC',
  '#FF1A1A1A': 'color_1A1A1A',
  '#FFFA6725': 'color_FA6725',
  '#FFFA6726': 'color_FA6726',
}

function findColorResource(hex: string): string | null {
  // Direct match
  if (COLOR_MAP[hex]) return COLOR_MAP[hex]

  return null
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

  // 6. Generic Box (FrameLayout/RelativeLayout/View)
  const hasDim = style.width || style.height
  const hasBg = style.background || style['background-color']
  const isContainer = style.padding || style.display

  // Prefer FrameLayout for generic containers (Figma Frames)
  if (hasDim || hasBg || isContainer)
    return 'FrameLayout'

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

  let hasSetBackground = false

  // Prioritize simple background color
  if (style['background-color']) {
    attrs[bgProp] = convertColorToHex(style['background-color'])
    hasSetBackground = true
  }
  // Check for background property if background-color is missing
  else if (style.background) {
    if (style.background.startsWith('#') || style.background.startsWith('rgb')) {
      attrs[bgProp] = convertColorToHex(style.background)
      hasSetBackground = true
    }
    else if (style.background.startsWith('var(')) {
      const match = style.background.match(/var\(--([\w-]+)\)/)
      if (match) {
        attrs[bgProp] = `@drawable/${match[1]}`
        hasSetBackground = true
      }
    }
  }

  // 3. Text (Only for TextView)
  if (tagName === 'TextView') {
    if (style.color)
      attrs['android:textColor'] = convertColorToHex(style.color)
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
      // Only default to generic bg_rounded if NO background color was found.
      // If we have a color (e.g. #FFF), we keep it.
      // Note: android:background="#FFF" with clipToOutline="true" works on API 21+ for Outline clipping.
      if (!hasSetBackground) {
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

  // 10. Positioning (Absolute)
  // Check for explicit top/left/right/bottom in style (passed by tempad for absolute pos)
  if (style.position === 'absolute' || style.top || style.left || style.right || style.bottom) {
    const parseVal = (v: string | undefined): number | null => {
      if (!v)
        return null
      const match = v.match(/^(-?[\d.]+)px$/)
      return match ? Number.parseFloat(match[1]) : null
    }

    const t = parseVal(style.top)
    const b = parseVal(style.bottom)
    const l = parseVal(style.left)
    const r = parseVal(style.right)

    // Helper to check for centering transform
    const hasCenterY = (s: Record<string, string>): boolean => {
      const t = s.transform || ''
      return t.includes('translateY(-50%)') || t.includes('translate(-50%, -50%)') || t.includes('translate3d(-50%, -50%')
    }
    const hasCenterX = (s: Record<string, string>): boolean => {
      const t = s.transform || ''
      return t.includes('translateX(-50%)') || t.includes('translate(-50%, -50%)') || t.includes('translate3d(-50%, -50%')
    }

    // Vertical Positioning Heuristics
    if (style.top === '50%' && hasCenterY(style)) {
      attrs['android:layout_centerVertical'] = 'true'
    }
    else if (t !== null && b !== null) {
      // Both top and bottom are set
      if (Math.abs(t - b) < 5) {
        // Almost equal -> Center Vertical
        attrs['android:layout_centerVertical'] = 'true'
      }
      else if (t < b) {
        // Closer to top
        attrs['android:layout_alignParentTop'] = 'true'
        attrs['android:layout_marginTop'] = convertUnit(style.top, 'dp')
      }
      else {
        // Closer to bottom
        attrs['android:layout_alignParentBottom'] = 'true'
        attrs['android:layout_marginBottom'] = convertUnit(style.bottom, 'dp')
      }
    }
    else if (t !== null) {
      // Only top
      attrs['android:layout_alignParentTop'] = 'true'
      attrs['android:layout_marginTop'] = convertUnit(style.top, 'dp')
    }
    else if (b !== null) {
      // Only bottom
      attrs['android:layout_alignParentBottom'] = 'true'
      attrs['android:layout_marginBottom'] = convertUnit(style.bottom, 'dp')
    }

    // Horizontal Positioning Heuristics
    if (style.left === '50%' && hasCenterX(style)) {
      attrs['android:layout_centerHorizontal'] = 'true'
    }
    else if (l !== null && r !== null) {
      // Both left and right are set
      if (Math.abs(l - r) < 5) {
        // Almost equal -> Center Horizontal
        attrs['android:layout_centerHorizontal'] = 'true'
      }
      else if (l < r) {
        // Closer to left
        attrs['android:layout_alignParentStart'] = 'true'
        attrs['android:layout_marginStart'] = convertUnit(style.left, 'dp')
      }
      else {
        // Closer to right
        attrs['android:layout_alignParentEnd'] = 'true'
        attrs['android:layout_marginEnd'] = convertUnit(style.right, 'dp')
      }
    }
    else if (l !== null) {
      // Only left
      attrs['android:layout_alignParentStart'] = 'true'
      attrs['android:layout_marginStart'] = convertUnit(style.left, 'dp')
    }
    else if (r !== null) {
      // Only right
      attrs['android:layout_alignParentEnd'] = 'true'
      attrs['android:layout_marginEnd'] = convertUnit(style.right, 'dp')
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
    attrs['android:id'] = `@+id/frame_${Math.floor(Math.random() * 10000)}`
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
