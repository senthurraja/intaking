import { WATERMARK_PHONE_SVG } from './watermarkSvg';

/** The crossing-vine floral watermark that sits behind every screen: five
 *  strands at different angles, two rotated pattern layers for depth, and a
 *  radial mask (in .wm) that clears the centre so copy stays legible and the
 *  ornament blooms at the edges. */
export function Watermark() {
  return (
    <svg
      className="wm"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: WATERMARK_PHONE_SVG }}
    />
  );
}
