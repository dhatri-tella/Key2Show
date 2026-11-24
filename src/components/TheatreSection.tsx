import React from 'react';
import { SectionHeader } from './SectionHeader';
import { TheatreCard } from './TheatreCard';
import type { Theatre } from '../data/theatres';
import type { CityName } from '../data/events';

interface TheatreSectionProps {
  theatres: Theatre[];
  selectedCity: CityName;
  showAllTheatres: boolean;
  onToggleViewAll: () => void;
  onSelectTheatre: (theatre: Theatre) => void;
}

export const TheatreSection: React.FC<TheatreSectionProps> = ({
  theatres,
  selectedCity,
  showAllTheatres,
  onToggleViewAll,
  onSelectTheatre,
}) => {
  return (
    <section id="top-theatres" className="max-w-[1460px] mx-auto px-4 lg:px-8 mt-4 pb-5">
      <SectionHeader
        title={`Top Theatres in ${selectedCity}`}
        actionLabel={showAllTheatres ? 'Show Top 5' : 'View All'}
        onAction={onToggleViewAll}
      />

      {theatres.length === 0 ? (
        <div className="rounded-xl border border-white/15 bg-[#0e0e12] p-6 text-center text-sm text-white/75">
          No theatres found matching your search.
        </div>
      ) : (
        <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-3.5 pb-1 lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0">
          {theatres.map((theatre) => (
            <TheatreCard
              key={theatre.id}
              theatre={theatre}
              onSelect={onSelectTheatre}
            />
          ))}
        </div>
      )}
    </section>
  );
};
