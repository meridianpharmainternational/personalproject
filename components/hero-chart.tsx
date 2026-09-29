/**
 * Hero background art: a 15° line-art globe tilted 23.4° (Earth's axial tilt)
 * with a degree-tick ring and one brand-green meridian that draws once, plus a
 * single export route that an aircraft (from the logo) flies ONCE on load
 * (4.6 s total, never loops, so no pause control is needed under WCAG 2.2.2).
 * Server component, no JS. Decorative only. Reduced motion lives in globals.css.
 */
const CX = 1130, CY = 360, R = 300;
const STEPS = [15, 30, 45, 60, 75];
const rad = (d: number) => (d * Math.PI) / 180;
const MERIDIANS = STEPS.map((d) => R * Math.sin(rad(d)));
const PARALLELS = STEPS.map((d) => ({ dy: R * Math.sin(rad(d)), hw: R * Math.cos(rad(d)) }));
const ROUTE = "M520 668Q800 716 930 560"; // hub (520,668) -> landing (930,560), runs under the CTAs
const PLANE = "M12 0 4-1.5-2-8h-2.5L-1-1.5h-5L-8-4h-1.5l1 4-1 4H-8l2-2.5h5L-4.5 8H-2l6-6.5Z";

export function HeroChart() {
  return (
    <svg className="hero-art" viewBox="0 0 1440 720" aria-hidden="true" focusable="false" fill="none" stroke="currentColor">
      <defs>
        <mask id="ha-trail" maskUnits="userSpaceOnUse" x="0" y="0" width="1440" height="720">
          <path className="ha-trail-mask" d={ROUTE} pathLength={1} stroke="#fff" strokeWidth={10} strokeDashoffset={1}>
            <animate attributeName="stroke-dashoffset" dur="4.6s" fill="freeze" calcMode="spline"
              values="1;1;0" keyTimes="0;.26;1" keySplines="0 0 1 1;.4 0 .2 1" />
          </path>
        </mask>
      </defs>

      <g transform={`rotate(-23.4 ${CX} ${CY})`}>
        <g className="ha-grid" strokeWidth={1}>
          <circle cx={CX} cy={CY} r={R} />
          <line x1={CX} y1={CY - R} x2={CX} y2={CY + R} />
          <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} />
          {MERIDIANS.map((rx) => <ellipse key={`m${rx}`} cx={CX} cy={CY} rx={rx} ry={R} />)}
          {PARALLELS.map(({ dy, hw }) => (
            <g key={`p${dy}`}>
              <line x1={CX - hw} y1={CY - dy} x2={CX + hw} y2={CY - dy} />
              <line x1={CX - hw} y1={CY + dy} x2={CX + hw} y2={CY + dy} />
            </g>
          ))}
        </g>
        <g className="ha-rings">
          {/* pathLength 360 -> dash units are degrees: minor tick every 5°, major every 30° */}
          <circle cx={CX} cy={CY} r={R + 26} pathLength={360} strokeWidth={8} strokeDasharray="0.3 4.7" />
          <circle cx={CX} cy={CY} r={R + 32} pathLength={360} strokeWidth={16} strokeDasharray="0.45 29.55" />
        </g>
        {/* front half of the 30°E meridian, in brand green */}
        <path className="ha-prime" d={`M${CX} ${CY - R}A${R * 0.5} ${R} 0 0 1 ${CX} ${CY + R}`} pathLength={1} />
      </g>

      <g className="ha-flight">
        <path d={ROUTE} mask="url(#ha-trail)" stroke="#7fd174" strokeWidth={2} strokeDasharray="6 7" strokeLinecap="round" />
        <circle cx={520} cy={668} r={26} stroke="#37a12d" strokeOpacity={0.25} />
        <circle cx={520} cy={668} r={13} stroke="#37a12d" strokeOpacity={0.55} />
        <circle cx={520} cy={668} r={5} fill="#37a12d" stroke="none" />
        <g className="ha-dest">
          <circle cx={930} cy={560} r={14} stroke="#7fd174" strokeOpacity={0.5} />
          <circle cx={930} cy={560} r={5} fill="#7fd174" stroke="none" />
        </g>
        <g className="ha-plane" opacity={0}>
          <path d={PLANE} transform="scale(1.6)" fill="#fff" stroke="none" />
          <animateMotion dur="4.6s" fill="freeze" rotate="auto" calcMode="spline"
            keyPoints="0;0;1" keyTimes="0;.26;1" keySplines="0 0 1 1;.4 0 .2 1" path={ROUTE} />
          <animate attributeName="opacity" dur="4.6s" fill="freeze" values="0;0;1;1;0" keyTimes="0;.24;.3;.9;1" />
        </g>
      </g>
    </svg>
  );
}
