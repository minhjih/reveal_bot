export function LogoIcon({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00d4ff" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="eye-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00d4ff" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      {/* Outer ring — network node */}
      <circle cx="20" cy="20" r="18" stroke="url(#logo-grad)" strokeWidth="2.5" fill="none" />
      {/* Inner face plate */}
      <rect x="10" y="11" width="20" height="18" rx="4" fill="url(#logo-grad)" opacity="0.12" />
      <rect x="10" y="11" width="20" height="18" rx="4" stroke="url(#logo-grad)" strokeWidth="1.5" fill="none" />
      {/* Left eye */}
      <rect x="14" y="17" width="4" height="4" rx="1" fill="url(#eye-grad)" />
      {/* Right eye */}
      <rect x="22" y="17" width="4" height="4" rx="1" fill="url(#eye-grad)" />
      {/* Mouth — data stream */}
      <line x1="15" y1="25" x2="25" y2="25" stroke="url(#eye-grad)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
      {/* Antenna / signal */}
      <line x1="20" y1="2" x2="20" y2="8" stroke="url(#logo-grad)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="20" cy="2" r="1.5" fill="#00d4ff" />
    </svg>
  );
}

export function LogoFull({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoIcon size={32} />
      <div className="flex flex-col leading-none">
        <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-cyan to-purple bg-clip-text text-transparent">
          Reveal Bot
        </span>
        <span className="text-[9px] font-medium tracking-[0.2em] uppercase text-muted">
          LinkedIn for Bots
        </span>
      </div>
    </div>
  );
}

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LogoIcon size={28} />
      <span className="text-base font-bold tracking-tight bg-gradient-to-r from-cyan to-purple bg-clip-text text-transparent">
        Reveal Bot
      </span>
    </div>
  );
}
