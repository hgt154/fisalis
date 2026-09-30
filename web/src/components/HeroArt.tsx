// Home illustration: arcade, reflecting pool and garden (from the design, "Composição geométrica")
const ARCH_X = [5, 80, 155, 230, 305, 380, 455, 530]

export default function HeroArt({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 600 520" role="img" aria-label={label} style={{ display: 'block', width: '100%', height: 'auto' }}>
      <defs>
        <pattern id="heroBeam" width="600" height="14" patternUnits="userSpaceOnUse">
          <rect width="600" height="14" fill="#8d887e" />
          <line x1="0" x2="600" y1="13.5" y2="13.5" stroke="#7a756b" />
        </pattern>
        <pattern id="heroGlass" width="30" height="110" patternUnits="userSpaceOnUse">
          <rect width="30" height="110" fill="#34413d" />
          <line x1="0.5" x2="0.5" y1="0" y2="110" stroke="#6d7a74" />
          <line x1="0" x2="30" y1="55" y2="55" stroke="#4f5c57" />
        </pattern>
      </defs>
      <rect width="600" height="520" fill="#e7e4dd" />
      <circle cx="530" cy="52" r="24" fill="#d9a13a" />
      <rect y="80" width="600" height="36" fill="url(#heroBeam)" />
      <rect y="80" width="600" height="3" fill="#b9b3a8" />
      <rect y="116" width="600" height="364" fill="url(#heroGlass)" />
      {/* concrete wall with arched openings */}
      <path fillRule="evenodd" fill="#d6d1c7"
        d={'M0 116H600V480H0Z ' + ARCH_X.map((x) => `M${x} 480V150A32.5 32.5 0 0 1 ${x + 65} 150V480Z`).join(' ')} />
      <path fill="none" stroke="#a8a296" strokeWidth="3"
        d={ARCH_X.map((x) => `M${x} 150A32.5 32.5 0 0 1 ${x + 65} 150`).join(' ')} />
      {/* garden */}
      <path d="M0 410 C40 372 90 396 120 368 C150 340 200 378 230 358 C270 332 300 378 340 362 C380 348 420 388 460 368 C500 348 560 378 600 356 V480 H0Z" fill="#1f4a33" />
      <g fill="#8fb05a">
        <ellipse cx="96" cy="392" rx="44" ry="8" transform="rotate(-28 96 392)" />
        <ellipse cx="104" cy="396" rx="40" ry="7" transform="rotate(18 104 396)" />
        <ellipse cx="372" cy="380" rx="46" ry="8" transform="rotate(-20 372 380)" />
        <ellipse cx="380" cy="384" rx="38" ry="7" transform="rotate(26 380 384)" />
      </g>
      <path d="M0 446 C50 418 100 442 150 422 C210 398 260 438 320 428 C380 418 430 448 480 428 C530 408 570 438 600 428 V480 H0Z" fill="#2f6b45" />
      <path d="M600 292 C536 304 494 360 506 440 C560 428 600 384 600 292Z" fill="#2f6b45" />
      <path d="M600 300 C570 340 540 390 510 436" stroke="#8fb05a" strokeWidth="2" fill="none" />
      {/* reflecting pool */}
      <rect y="478" width="600" height="42" fill="#3e5a55" />
      <g stroke="#9fb3ad" strokeOpacity=".5">
        <line x1="40" x2="140" y1="492" y2="492" />
        <line x1="220" x2="300" y1="500" y2="500" />
        <line x1="360" x2="500" y1="490" y2="490" />
        <line x1="120" x2="200" y1="508" y2="508" />
      </g>
      <g fill="#6f9a4a">
        <ellipse cx="180" cy="494" rx="16" ry="5" />
        <ellipse cx="214" cy="506" rx="12" ry="4" />
        <ellipse cx="452" cy="504" rx="18" ry="5" />
      </g>
    </svg>
  )
}
