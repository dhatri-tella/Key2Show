import React from 'react';
import {
  Clapperboard,
  CalendarDays,
  Landmark,
  Music,
  Smile,
  Trophy,
  Palette,
  LayoutGrid,
} from 'lucide-react';
import type { CategoryFilter } from '../utils/bookingLogic';

interface CategoryNavProps {
  activeCategory: CategoryFilter;
  onSelectCategory: (cat: CategoryFilter) => void;
}

const CATEGORIES: {
  id: CategoryFilter;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'Movies', label: 'Movies', icon: Clapperboard },
  { id: 'Events', label: 'Events', icon: CalendarDays },
  { id: 'Theatres', label: 'Theatres', icon: Landmark },
  { id: 'Concerts', label: 'Concerts', icon: Music },
  { id: 'Comedy Shows', label: 'Comedy Shows', icon: Smile },
  { id: 'Sports', label: 'Sports', icon: Trophy },
  { id: 'Arts & Culture', label: 'Arts & Culture', icon: Palette },
  { id: 'More', label: 'More', icon: LayoutGrid },
];

export const CategoryNav: React.FC<CategoryNavProps> = ({
  activeCategory,
  onSelectCategory,
}) => {
  return (
    <div className="max-w-[1460px] mx-auto px-4 lg:px-8 mt-3">
      <div
        role="tablist"
        aria-label="Entertainment categories"
        className="flex items-center justify-start lg:justify-center gap-2.5 overflow-x-auto no-scrollbar py-1"
      >
        {CATEGORIES.map(({ id, label, icon: Icon }) => {
          const isActive = activeCategory === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelectCategory(id)}
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap shrink-0 border transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-[#D90913] to-[#FF1F28] border-[#FF3D44] text-white font-semibold k2s-red-glow'
                  : 'bg-[#0b0b0e] border-white/20 text-white/90 hover:border-[#FF1822]/75 hover:text-white hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(229,9,20,0.2)]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
