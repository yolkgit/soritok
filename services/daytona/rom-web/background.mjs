// External GPU snapshots include flat widescreen padding around a 496-column
// System-24 backdrop. Sample the complete original art across the viewport.
// Foreground HUD and 3D geometry use their existing wide coordinates.
export function backgroundRange(width,nativeWidth=496){
 if(width<=nativeWidth)return [0,1];
 const margin=(width-nativeWidth)/2;
 // Texel centres avoid blending the padding into the two outermost pixels.
 return [(margin+.5)/width,(margin+nativeWidth-.5)/width];
}
