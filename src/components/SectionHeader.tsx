import React from 'react';
import { ArrowRight } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  actionLabel = 'View All',
  onAction,
}) => {
  return (
    <div className="flex items-center justify-between gap-4 mb-3.5">
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className="w-[3.5px] h-5 bg-[#FF1018] rounded-full shrink-0 shadow-[0_0_8px_rgba(255,16,24,0.8)]"
          aria-hidden="true"
        />
        <h2 className="font-display text-[19px] sm:text-[21px] font-bold text-white tracking-tight truncate">
          {title}
        </h2>
      </div>

      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-white/85 hover:text-[#FF333B] transition-colors whitespace-nowrap shrink-0 cursor-pointer group"
        >
          <span>{actionLabel}</span>
          <ArrowRight className="w-4 h-4 text-[#FF1822] group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}
    </div>
  );
};
