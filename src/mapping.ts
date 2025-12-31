
// Component Class Mapping
// You can customize the Android View classes generated here.
export const COMPONENT_MAPPING: Record<string, string> = {
  // Base Component -> Custom Class
  TextView: 'com.dragon.read.widget.scale.ScaleTextView',
  ImageView: 'com.facebook.drawee.view.SimpleDraweeView',
  
  // Standard Components (can be customized if needed)
  ScrollView: 'ScrollView',
  HorizontalScrollView: 'HorizontalScrollView',
  CardView: 'androidx.cardview.widget.CardView',
  LinearLayout: 'LinearLayout',
  FrameLayout: 'FrameLayout',
  RelativeLayout: 'RelativeLayout',
  View: 'View',
};

export function getMappedTagName(baseName: string): string {
  return COMPONENT_MAPPING[baseName] || baseName;
}
