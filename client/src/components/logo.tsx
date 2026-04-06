export function LeadedlyLogo({ size = 32 }: { size?: number }) {
  const s = size;
  return (
    <div className="flex items-center gap-3">
      <svg
        width={s}
        height={s}
        viewBox="0 0 32 32"
        fill="none"
        aria-label="Leadedly"
      >
        {/* Geometric arrow / lead funnel mark */}
        <rect width="32" height="32" rx="8" fill="hsl(217 91% 60%)" />
        {/* Upward arrow / growth mark */}
        <path d="M16 6L24 14H19V22H13V14H8L16 6Z" fill="white" />
        {/* Bottom bar representing territory */}
        <rect x="8" y="24" width="16" height="2.5" rx="1.25" fill="white" opacity="0.6" />
      </svg>
      <span className="font-display font-bold text-foreground tracking-tight" style={{ fontSize: s * 0.6 }}>
        Leadedly
      </span>
    </div>
  );
}
