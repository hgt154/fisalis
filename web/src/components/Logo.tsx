// The Arco mark: an arch (text color) framing a spiral staircase (accent color)
const STEPS = [
  [8.8, 8.7, 12.7], [8, 14.1, 9.7], [10.4, 19.4, 6.3], [15.1, 24.8, 4.2], [19.8, 30.2, 4.1],
  [22.3, 35.6, 6.4], [21.5, 40.9, 9.7], [17.7, 46.2, 12.6], [12.7, 51.6, 13.7],
]

export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={(size * 3) / 4} height={size} viewBox="-2 -2 44 59" fill="none" aria-hidden="true" style={{ flex: '0 0 auto', display: 'block' }}>
      <path d="M0 57V20A20 20 0 0 1 40 20V57" stroke="var(--color-text)" strokeWidth={2.4} />
      {STEPS.map(([x, y, w]) => (
        <rect key={y} x={x} y={y} width={w} height={1.8} fill="var(--color-accent)" />
      ))}
    </svg>
  )
}