import type { DayPoint } from '../lib/analytics';
import { fmt, rollingAverage } from '../lib/analytics';
import type { InkPalette, Settings } from '../types';

/* The trend chart, and the payoff for "Your chart, your way": every switch in
   that settings group actually redraws this — shape, ink, the comparison
   overlays, weekend shading, the zero baseline and the handwritten figures.

   Geometry follows the prototype's SVG: a 300×150 viewBox, the plot between
   y=30 and y=124, the baseline rule at y=130 and the day letters at y=146. */

const W = 300;
const H = 150;
const TOP = 30;
const BOTTOM = 124;
const BASELINE = 130;

interface Ink {
  line: string;
  mark: string;
  goal: string;
  over: string;
}

/* Magenta is reserved for two roles — the goal line and anything over goal —
   so the "ink" choice sets the *other* colour, exactly as the design settled. */
const PALETTES: Record<InkPalette, Ink> = {
  cyan: { line: '#201e1d', mark: '#0088b0', goal: '#d6006c', over: '#d6006c' },
  magenta: { line: '#201e1d', mark: '#d6006c', goal: '#d6006c', over: '#d6006c' },
  process: { line: '#201e1d', mark: '#0088b0', goal: '#d6006c', over: '#edbb00' },
  ink: { line: '#201e1d', mark: '#201e1d', goal: '#605d5d', over: '#605d5d' },
};

/** Catmull-Rom through the points, converted to cubic beziers — the sketched
 *  line's organic curve, but following the real data. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return pts.length ? `M${pts[0].x} ${pts[0].y}` : '';
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

function straightPath(pts: { x: number; y: number }[]): string {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
}

export interface ChartProps {
  points: DayPoint[];
  settings: Settings;
  /** Averages of the previous period, drawn faintly when "Last month" is on. */
  lastMonthAvg?: number;
}

export function Chart({ points, settings, lastMonthAvg }: ChartProps) {
  const ink = PALETTES[settings.ink];
  const goal = settings.goal;
  const logged = points.filter((p) => p.count > 0);

  if (logged.length < 2) {
    return (
      <div
        style={{
          height: 150,
          display: 'grid',
          placeItems: 'center',
          borderTop: '1px solid rgba(32,30,29,.15)',
          borderBottom: '1px solid rgba(32,30,29,.15)',
          marginTop: 14,
        }}
      >
        <p
          className="hand"
          style={{ fontSize: 20, color: 'var(--color-accent-700)', margin: 0 }}
        >
          {logged.length === 0 ? 'nothing to draw yet' : 'one day drawn — two makes a line'}
        </p>
      </div>
    );
  }

  const values = points.map((p) => p.total);
  const maxV = Math.max(goal, ...values) * 1.06;
  const minV = settings.zeroBaseline ? 0 : Math.min(goal, ...logged.map((p) => p.total)) * 0.9;
  const span = Math.max(1, maxV - minV);

  const y = (v: number) => BOTTOM - ((v - minV) / span) * (BOTTOM - TOP);
  const x = (i: number) =>
    points.length === 1 ? W / 2 : 4 + (i * (W - 8)) / (points.length - 1);

  const plotted = points
    .map((p, i) => ({ ...p, x: x(i), y: y(p.total), i }))
    .filter((p) => p.count > 0);

  const goalY = y(goal);
  const rolling = rollingAverage(points, 7);
  const rollingPts = points
    .map((p, i) => ({ x: x(i), y: y(rolling[i]), count: p.count }))
    .filter((p) => p.count > 0);

  const last = plotted[plotted.length - 1];
  const barW = Math.max(6, (W - 8) / points.length - 6);

  return (
    <svg
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ marginTop: 14, overflow: 'visible' }}
      role="img"
      aria-label={`Daily totals for the last ${points.length} days against a goal of ${goal}`}
    >
      {/* weekend shading, in the second ink */}
      {settings.shadeWeekends &&
        points.map((p, i) =>
          p.weekend ? (
            <rect
              key={p.key}
              x={x(i) - barW / 2 - 2}
              y={TOP - 6}
              width={barW + 4}
              height={BOTTOM - TOP + 12}
              fill={ink.mark}
              opacity={0.07}
            />
          ) : null,
        )}

      {/* goal line */}
      {settings.compareGoal && (
        <>
          <path
            d={`M0 ${goalY} C90 ${goalY - 2} 200 ${goalY + 3} ${W} ${goalY}`}
            stroke={ink.goal}
            strokeWidth="1.2"
            strokeDasharray="5 4"
            fill="none"
          />
          <text
            x={W - 46}
            y={goalY - 6}
            fontFamily="Caveat"
            fontSize="15"
            fill={ink.goal}
            opacity="0.85"
          >
            goal
          </text>
        </>
      )}

      {/* last month's average */}
      {settings.compareLastMonth && lastMonthAvg ? (
        <path
          d={`M0 ${y(lastMonthAvg)} L${W} ${y(lastMonthAvg)}`}
          stroke={ink.line}
          strokeWidth="1"
          strokeDasharray="2 5"
          opacity="0.45"
          fill="none"
        />
      ) : null}

      {/* the series itself */}
      {settings.chartShape === 'bars' ? (
        plotted.map((p) => (
          <rect
            key={p.key}
            x={p.x - barW / 2}
            y={p.y}
            width={barW}
            height={Math.max(1, BOTTOM - p.y)}
            fill={p.total > goal + settings.inRangeBand ? ink.over : ink.mark}
            opacity={p.total > goal + settings.inRangeBand ? 0.75 : 0.55}
          />
        ))
      ) : settings.chartShape === 'dots' ? null : (
        <path
          d={
            settings.chartShape === 'sketched'
              ? smoothPath(plotted)
              : straightPath(plotted)
          }
          fill="none"
          stroke={ink.line}
          strokeWidth={settings.chartShape === 'sketched' ? 2 : 1.1}
          strokeLinecap="round"
        />
      )}

      {/* the faint 7-day rolling average behind it */}
      {settings.compareAvg7 && rollingPts.length > 1 && (
        <path
          d={smoothPath(rollingPts)}
          fill="none"
          stroke={ink.line}
          strokeWidth="1"
          opacity="0.35"
        />
      )}

      {/* real point marks */}
      {settings.chartShape !== 'bars' &&
        plotted.map((p) => (
          <circle
            key={p.key}
            cx={p.x}
            cy={p.y}
            r={p === last ? 4.4 : 3.2}
            fill={p === last ? ink.line : '#f3f2f2'}
            stroke={p.total > goal + settings.inRangeBand ? ink.over : ink.line}
            strokeWidth="1.6"
          />
        ))}

      {/* the value on the last point */}
      {last && (
        <text
          x={Math.min(last.x + 8, W - 40)}
          y={Math.max(TOP + 8, last.y - 10)}
          fontFamily={settings.handwrittenFigures ? 'Caveat' : 'Source Serif 4 Variable'}
          fontSize={settings.handwrittenFigures ? 17 : 12}
          fill={ink.line}
        >
          {fmt(last.total)}
        </text>
      )}

      {/* axis values */}
      <text x="0" y={TOP + 10} fontFamily="Source Serif 4 Variable" fontSize="9" fill="#605d5d">
        {fmt(maxV)}
      </text>
      <text x="0" y={BOTTOM} fontFamily="Source Serif 4 Variable" fontSize="9" fill="#605d5d">
        {fmt(minV)}
      </text>

      <path d={`M4 ${BASELINE} L${W - 4} ${BASELINE}`} stroke="#201e1d" strokeWidth="1" opacity=".5" />

      {/* day letters */}
      {points.map((p, i) => (
        <text
          key={p.key}
          x={x(i)}
          y={146}
          textAnchor="middle"
          fontFamily="Source Serif 4 Variable"
          fontSize="10"
          fill="#605d5d"
        >
          {'SMTWTFS'[p.date.getDay()]}
        </text>
      ))}
    </svg>
  );
}
