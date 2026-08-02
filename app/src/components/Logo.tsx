/** The percent mark: two ink circles with the diagonal stroke in the app's
 *  cyan. The logo the user asked for — "the logo should be based on %". */
export function Logo({ size = 30, strokeWidth = 2.4 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-label="Intaking">
      <circle cx="11" cy="11" r="7.5" fill="none" stroke="#201e1d" strokeWidth={strokeWidth} />
      <circle cx="29" cy="29" r="7.5" fill="none" stroke="#201e1d" strokeWidth={strokeWidth} />
      <line
        x1="33"
        y1="6"
        x2="7"
        y2="34"
        stroke="#0088b0"
        strokeWidth={strokeWidth + 0.4}
        strokeLinecap="round"
      />
    </svg>
  );
}
