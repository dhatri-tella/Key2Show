import React from 'react';

/**
 * Base skeleton pulsing block with subtle obsidian/crimson undertone
 */
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = 'h-32' }) => {
  return (
    <div
      aria-hidden="true"
      className={`rounded-2xl bg-[#121217]/90 border border-white/5 animate-pulse relative overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
    </div>
  );
};

export const SkeletonMovieCard: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="relative rounded-xl overflow-hidden border border-white/10 bg-[#0e0e12] h-[226px] lg:h-[204px] xl:h-[214px] w-[166px] sm:w-[174px] lg:w-auto shrink-0 snap-start flex flex-col justify-between animate-pulse p-2"
    >
      {/* Poster area */}
      <div className="flex-1 w-full rounded-lg bg-[#181822] mb-2" />
      {/* Title & info placeholders */}
      <div className="space-y-1.5 px-1 pb-1">
        <div className="h-3 w-4/5 rounded bg-white/10" />
        <div className="h-2.5 w-1/2 rounded bg-white/5" />
      </div>
      {/* Button placeholder */}
      <div className="h-6 w-full rounded-full bg-[#E50914]/20 border border-[#FF252E]/30 mt-1" />
    </div>
  );
};

export const SkeletonMovieDetails: React.FC = () => {
  return (
    <div aria-hidden="true" className="max-w-[1460px] mx-auto px-4 lg:px-8 py-5 space-y-5 animate-pulse">
      {/* Back button */}
      <div className="h-5 w-28 rounded-full bg-white/10" />

      {/* Hero card */}
      <div className="rounded-3xl border border-white/10 bg-[#0c0c10] p-6 flex flex-col sm:flex-row gap-6">
        <div className="w-36 sm:w-48 h-56 sm:h-72 rounded-2xl bg-[#181822] shrink-0" />
        <div className="flex-1 space-y-4">
          <div className="flex gap-2">
            <div className="h-5 w-12 rounded-full bg-[#E50914]/30" />
            <div className="h-5 w-16 rounded-full bg-white/10" />
            <div className="h-5 w-20 rounded-full bg-white/10" />
          </div>
          <div className="h-8 w-3/4 rounded bg-white/15" />
          <div className="space-y-2">
            <div className="h-3.5 w-full rounded bg-white/10" />
            <div className="h-3.5 w-5/6 rounded bg-white/10" />
            <div className="h-3.5 w-2/3 rounded bg-white/10" />
          </div>
          <div className="flex gap-3 pt-3">
            <div className="h-10 w-36 rounded-full bg-[#E50914]/40" />
            <div className="h-10 w-32 rounded-full bg-white/10" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <div className="h-9 w-28 rounded-full bg-[#E50914]/30" />
        <div className="h-9 w-28 rounded-full bg-white/10" />
        <div className="h-9 w-36 rounded-full bg-white/10" />
      </div>

      {/* Shows section */}
      <div className="rounded-3xl border border-white/10 bg-[#0c0c10] p-6 space-y-4">
        <div className="h-6 w-48 rounded bg-white/15" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-[#14141c] border border-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
};

export const SkeletonTheatreCard: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="bg-[#0e0e12] border border-white/10 rounded-xl p-2 flex items-center gap-3 w-[268px] sm:w-[276px] lg:w-auto shrink-0 snap-start animate-pulse"
    >
      <div className="w-[96px] h-[58px] rounded-lg bg-[#1a1a24] shrink-0" />
      <div className="flex-1 min-w-0 space-y-2 py-1">
        <div className="h-3.5 w-3/4 rounded bg-white/15" />
        <div className="h-2.5 w-1/2 rounded bg-white/10" />
        <div className="h-2 w-1/4 rounded bg-amber-400/20" />
      </div>
    </div>
  );
};

export const SkeletonEventCard: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="rounded-2xl bg-[#0e0e13] border border-white/10 overflow-hidden flex flex-col justify-between animate-pulse h-80"
    >
      <div className="h-44 bg-[#181822] w-full" />
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-[#FF252E]/30" />
          <div className="h-4 w-4/5 rounded bg-white/15" />
          <div className="h-3 w-1/2 rounded bg-white/10" />
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-white/5">
          <div className="h-4 w-20 rounded bg-white/15" />
          <div className="h-7 w-24 rounded-full bg-[#E50914]/40" />
        </div>
      </div>
    </div>
  );
};

export const SkeletonSeatMap: React.FC = () => {
  return (
    <div aria-hidden="true" className="max-w-[1040px] mx-auto px-4 lg:px-8 py-6 space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-8 w-36 rounded-xl bg-white/10" />
        <div className="h-8 w-56 rounded-xl bg-white/10" />
      </div>
      <div className="h-10 rounded-2xl bg-[#0e0e13] border border-white/10" />
      <div className="rounded-3xl bg-[#0c0c10] border border-white/10 p-6 space-y-6">
        <div className="h-2 w-3/4 mx-auto rounded-full bg-[#FF252E]/30" />
        <div className="space-y-3 max-w-xl mx-auto py-4">
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div key={row} className="flex gap-2 justify-center">
              {[...Array(10)].map((_, col) => (
                <div key={col} className="w-8 h-8 rounded-lg bg-[#1a1a24]" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const SkeletonBooking: React.FC = () => {
  return (
    <div aria-hidden="true" className="rounded-2xl bg-[#0e0e13] border border-white/10 p-5 space-y-4 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-[#FF252E]/30" />
          <div className="h-5 w-48 rounded bg-white/15" />
          <div className="h-3 w-36 rounded bg-white/10" />
        </div>
        <div className="h-6 w-20 rounded-full bg-emerald-500/20" />
      </div>
      <div className="h-12 rounded-xl bg-[#15151c] border border-white/5" />
      <div className="flex justify-between pt-2 border-t border-white/5">
        <div className="h-4 w-28 rounded bg-white/10" />
        <div className="h-8 w-24 rounded-full bg-white/10" />
      </div>
    </div>
  );
};

export const SkeletonBookingConfirmation: React.FC = () => {
  return (
    <div aria-hidden="true" className="max-w-[800px] mx-auto px-4 py-8 space-y-6 animate-pulse">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40" />
        <div className="h-7 w-56 mx-auto rounded bg-white/15" />
        <div className="h-4 w-40 mx-auto rounded bg-white/10" />
      </div>
      <div className="rounded-3xl bg-[#0e0e13] border border-white/10 p-6 sm:p-8 space-y-6">
        <div className="h-48 w-48 mx-auto rounded-2xl bg-[#181822] border border-white/10" />
        <div className="space-y-3">
          <div className="h-4 w-full rounded bg-white/10" />
          <div className="h-4 w-5/6 rounded bg-white/10" />
          <div className="h-4 w-2/3 rounded bg-white/10" />
        </div>
        <div className="flex justify-center gap-3 pt-4">
          <div className="h-10 w-36 rounded-full bg-[#E50914]/40" />
          <div className="h-10 w-36 rounded-full bg-white/10" />
        </div>
      </div>
    </div>
  );
};

export const SkeletonFoodCard: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="rounded-2xl bg-[#0e0e13] border border-white/10 p-3.5 flex gap-3.5 items-center animate-pulse"
    >
      <div className="w-20 h-20 rounded-xl bg-[#1a1a24] shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 rounded bg-white/15" />
        <div className="h-3 w-1/2 rounded bg-white/10" />
        <div className="h-4 w-16 rounded bg-[#FF252E]/30" />
      </div>
      <div className="w-20 h-8 rounded-full bg-white/10 shrink-0" />
    </div>
  );
};

export const SkeletonProfile: React.FC = () => {
  return (
    <div aria-hidden="true" className="max-w-[1200px] mx-auto px-4 lg:px-8 py-8 space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 w-32 rounded bg-[#FF252E]/30" />
        <div className="h-7 w-48 rounded bg-white/15" />
        <div className="h-3.5 w-64 rounded bg-white/10" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-64 rounded-2xl bg-[#0e0e13] border border-white/10" />
        <div className="h-64 rounded-2xl bg-[#0e0e13] border border-white/10" />
      </div>
      <div className="h-48 rounded-2xl bg-[#0e0e13] border border-white/10" />
    </div>
  );
};

export const SkeletonSearchResults: React.FC = () => {
  return (
    <div aria-hidden="true" className="space-y-3 py-2 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[#141419] border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-white/10" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-36 rounded bg-white/15" />
              <div className="h-2.5 w-24 rounded bg-white/10" />
            </div>
          </div>
          <div className="h-3 w-14 rounded bg-[#FF252E]/30" />
        </div>
      ))}
    </div>
  );
};
