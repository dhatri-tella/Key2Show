import React from 'react';

interface LogoProps {
  compact?: boolean;
  showTagline?: boolean;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({
  compact = false,
  showTagline = true,
  onClick,
}) => {
  const iconSize = compact ? 'w-10 h-8' : 'w-12 h-9';
  const titleSize = compact ? 'text-[22px]' : 'text-[26px]';
  const taglineSize = compact ? 'text-[9px]' : 'text-[10px]';

  const content = (
    <span className="inline-flex items-center gap-2.5 text-left select-none">
      {/* Tilted red ticket + film reel play badge */}
      <svg
        viewBox="0 0 64 48"
        className={`${iconSize} shrink-0 drop-shadow-[0_2px_10px_rgba(229,9,20,0.45)]`}
        aria-hidden="true"
      >
        <g transform="rotate(-14 32 24)">
          <rect
            x="4"
            y="8"
            width="56"
            height="32"
            rx="5"
            fill="#E50914"
            stroke="#FF4B52"
            strokeWidth="1.5"
          />
          {/* Film sprocket holes top */}
          <rect x="10" y="11" width="5" height="3.2" rx="0.8" fill="#FFFFFF" opacity="0.92" />
          <rect x="19" y="11" width="5" height="3.2" rx="0.8" fill="#FFFFFF" opacity="0.92" />
          <rect x="28" y="11" width="5" height="3.2" rx="0.8" fill="#FFFFFF" opacity="0.92" />
          <rect x="37" y="11" width="5" height="3.2" rx="0.8" fill="#FFFFFF" opacity="0.92" />
          <rect x="46" y="11" width="5" height="3.2" rx="0.8" fill="#FFFFFF" opacity="0.92" />
          {/* Film sprocket holes bottom */}
          <rect x="10" y="33.8" width="5" height="3.2" rx="0.8" fill="#FFFFFF" opacity="0.92" />
          <rect x="19" y="33.8" width="5" height="3.2" rx="0.8" fill="#FFFFFF" opacity="0.92" />
          <rect x="28" y="33.8" width="5" height="3.2" rx="0.8" fill="#FFFFFF" opacity="0.92" />
          <rect x="37" y="33.8" width="5" height="3.2" rx="0.8" fill="#FFFFFF" opacity="0.92" />
          <rect x="46" y="33.8" width="5" height="3.2" rx="0.8" fill="#FFFFFF" opacity="0.92" />
          {/* Center play frame */}
          <rect x="18" y="16.5" width="28" height="15" rx="2.5" fill="#9E040C" />
          <polygon points="29,19.5 29,28.5 38,24" fill="#FFFFFF" />
        </g>
      </svg>

      <span className="flex flex-col leading-none">
        <span className={`font-display italic font-extrabold tracking-tight ${titleSize} text-white`}>
          Key<span className="text-[#FF141D]">2</span>Show
        </span>
        {showTagline && (
          <span className={`${taglineSize} italic text-white/80 tracking-[0.01em] mt-0.5 whitespace-nowrap`}>
            Your Entertainment. Your Ticket. Your Show.
          </span>
        )}
      </span>
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF141D] rounded-lg cursor-pointer"
        aria-label="Key2Show Home"
      >
        {content}
      </button>
    );
  }

  return content;
};
