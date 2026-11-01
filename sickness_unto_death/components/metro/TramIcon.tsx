export default function TramIcon({ color, label }: { color: string; label: string }) {
  return (
    <svg
      role="img"
      aria-label={label}
      width="28"
      height="19"
      viewBox="0 0 40 26"
      style={{ display: "block", overflow: "visible", pointerEvents: "none", filter: "drop-shadow(0 1px 1px rgba(0, 0, 0, 0.5))" }}
    >
      {/* Pantograph and a continuous low-floor body distinguish the tram. */}
      <path d="M15 8 19 4 23 8M19 4 16 1h9" fill="none" stroke="#334155" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 8h28c3 0 5 3 6 7v5H2V12c0-2 1-4 2-4Z" fill={color} stroke="white" strokeWidth="1.2" />
      <path d="M29 10h3c2 0 3 2 4 5h-7Z" fill="#cbe8ee" />
      <rect x="5" y="10" width="6" height="5" rx="0.6" fill="#cbe8ee" />
      <rect x="13" y="10" width="5" height="9" rx="0.6" fill="#dceef0" stroke="#334155" strokeWidth="0.6" />
      <path d="M15.5 10v9" stroke="#334155" strokeWidth="0.6" />
      <rect x="20" y="9" width="3" height="11" fill="#475569" />
      <path d="M21 10v9m1-9v9" stroke="#94a3b8" strokeWidth="0.5" />
      <rect x="25" y="10" width="2" height="5" rx="0.4" fill="#cbe8ee" />
      <path d="M3 20h34" stroke="#334155" strokeWidth="1.5" />
      <circle cx="9" cy="21" r="1.7" fill="#334155" />
      <circle cx="30" cy="21" r="1.7" fill="#334155" />
      <path d="M35 17h2" stroke="#fff6c2" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
