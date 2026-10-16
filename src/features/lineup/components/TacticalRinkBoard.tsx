import React from 'react';

/**
 * Modern High-Fidelity Tactical Hockey Board (Carbon/Obsidian & Orange Theme)
 */
export const RinkBackground = () => (
  <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-xl bg-gradient-to-b from-[#0b0f17] via-[#111827] to-[#090d14] border-2 border-border/80 shadow-2xl">
    <svg width="100%" height="100%" viewBox="0 0 500 900" preserveAspectRatio="none" className="opacity-90">
      <defs>
        {/* Subtle charcoal surface gradient */}
        <linearGradient id="iceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0b0f17" />
          <stop offset="50%" stopColor="#111827" />
          <stop offset="100%" stopColor="#090d14" />
        </linearGradient>

        <linearGradient id="centerCircleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ea580c" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#ea580c" stopOpacity="0.02" />
        </linearGradient>

        {/* Crease gradient */}
        <radialGradient id="creaseGrad" cx="50%" cy="100%" r="100%">
          <stop offset="0%" stopColor="#ea580c" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#334155" stopOpacity="0.03" />
        </radialGradient>
      </defs>

      {/* Main Surface */}
      <rect width="500" height="900" fill="url(#iceGradient)" />

      {/* Rink Outer Boards */}
      <rect x="8" y="8" width="484" height="884" rx="42" ry="42" fill="none" stroke="#334155" strokeWidth="2" opacity="0.6" />
      <rect x="12" y="12" width="476" height="876" rx="38" ry="38" fill="none" stroke="#ea580c" strokeWidth="1" strokeOpacity="0.15" />

      {/* Goal Line (Top) */}
      <line x1="20" y1="70" x2="480" y2="70" stroke="#475569" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.4" />

      {/* Goal Crease (Bottom Defending Zone) */}
      <path d="M 205 845 A 45 45 0 0 1 295 845 Z" fill="url(#creaseGrad)" stroke="#ea580c" strokeWidth="1.5" strokeOpacity="0.4" />
      <rect x="225" y="845" width="50" height="15" fill="#0b0f17" stroke="#ea580c" strokeWidth="2" rx="2" />

      {/* Goal Line (Bottom) */}
      <line x1="20" y1="845" x2="480" y2="845" stroke="#ef4444" strokeWidth="2.5" opacity="0.75" />

      {/* Defensive Blue Line */}
      <line x1="12" y1="620" x2="488" y2="620" stroke="#3b82f6" strokeWidth="4" opacity="0.5" />

      {/* Neutral Center Red Line */}
      <line x1="12" y1="450" x2="488" y2="450" stroke="#ea580c" strokeWidth="3" strokeDasharray="16,8" opacity="0.45" />

      {/* Attacking Blue Line */}
      <line x1="12" y1="280" x2="488" y2="280" stroke="#3b82f6" strokeWidth="4" opacity="0.5" />

      {/* Center Ice Circle & Dot */}
      <circle cx="250" cy="450" r="75" fill="url(#centerCircleGrad)" stroke="#ea580c" strokeWidth="2" strokeOpacity="0.35" />
      <circle cx="250" cy="450" r="6" fill="#ea580c" opacity="0.8" />

      {/* Faceoff Spots & Circles (Defensive Zone) */}
      <g stroke="#334155" strokeWidth="1.5" fill="none" opacity="0.5">
        <circle cx="110" cy="740" r="55" />
        <circle cx="110" cy="740" r="4" fill="#ea580c" stroke="none" />
        <circle cx="390" cy="740" r="55" />
        <circle cx="390" cy="740" r="4" fill="#ea580c" stroke="none" />
      </g>

      {/* Faceoff Spots (Neutral Zone) */}
      <g fill="#ea580c" opacity="0.6">
        <circle cx="110" cy="360" r="4" />
        <circle cx="390" cy="360" r="4" />
        <circle cx="110" cy="540" r="4" />
        <circle cx="390" cy="540" r="4" />
      </g>

      {/* Faceoff Spots & Circles (Attacking Zone) */}
      <g stroke="#334155" strokeWidth="1.5" fill="none" opacity="0.5">
        <circle cx="110" cy="160" r="55" />
        <circle cx="110" cy="160" r="4" fill="#ea580c" stroke="none" />
        <circle cx="390" cy="160" r="55" />
        <circle cx="390" cy="160" r="4" fill="#ea580c" stroke="none" />
      </g>

      {/* Subtle Club Watermark in Center Ice */}
      <text x="250" y="456" fill="#ffffff" fillOpacity="0.04" fontSize="32" fontWeight="900" textAnchor="middle" fontFamily="sans-serif" letterSpacing="4">
        ACES
      </text>
    </svg>
  </div>
);
