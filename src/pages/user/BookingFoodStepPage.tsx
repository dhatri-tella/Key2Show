import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, UtensilsCrossed, Plus, Minus } from 'lucide-react';
import type { CheckoutDraft, FoodItem } from '../../types/platform';

interface BookingFoodStepPageProps {
  draft: CheckoutDraft;
  foodItems: FoodItem[];
  onUpdateFoodCart: (
    cart: { foodItemId: string; name: string; price: number; quantity: number }[]
  ) => void;
  onContinueToCompanions: () => void;
  onSkipFood: () => void;
  onBack: () => void;
}

export const BookingFoodStepPage: React.FC<BookingFoodStepPageProps> = ({
  draft,
  foodItems,
  onUpdateFoodCart,
  onContinueToCompanions,
  onSkipFood,
  onBack,
}) => {
  const [category, setCategory] = useState<string>('All');
  const categories = ['All', ...Array.from(new Set(foodItems.map((f) => f.category)))];

  const visibleItems =
    category === 'All' ? foodItems : foodItems.filter((f) => f.category === category);

  const foodTotal = draft.foodCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const foodCount = draft.foodCart.reduce((sum, item) => sum + item.quantity, 0);

  const adjustFood = (item: FoodItem, delta: number) => {
    const existing = draft.foodCart.find((c) => c.foodItemId === item.id);
    const nextQty = Math.max(0, Math.min(10, (existing?.quantity ?? 0) + delta));
    const others = draft.foodCart.filter((c) => c.foodItemId !== item.id);
    if (nextQty > 0) {
      others.push({ foodItemId: item.id, name: item.name, price: item.price, quantity: nextQty });
    }
    onUpdateFoodCart(others);
  };

  return (
    <div className="max-w-[1040px] mx-auto px-4 lg:px-8 py-5 pb-32 sm:pb-10 space-y-5">
      {/* Stepper */}
      <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-white/50">
        <span className="text-emerald-400">1. Seats ({draft.selectedSeats.length})</span>
        <span>→</span>
        <span className="text-[#FF3B42]">2. Food &amp; Drinks</span>
        <span>→</span>
        <span>3. Companions</span>
        <span>→</span>
        <span>4. Checkout</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/70 hover:text-white cursor-pointer mb-1 min-h-[36px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Seats</span>
          </button>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <UtensilsCrossed className="w-6 h-6 text-[#FF252E]" />
            <span>Pre-Order Snacks &amp; Drinks</span>
          </h1>
          <p className="text-xs text-white/60 mt-1">
            Optional step — skip anytime or grab popcorn combos delivered to your seat.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            onUpdateFoodCart([]);
            onSkipFood();
          }}
          className="px-5 py-2.5 rounded-full bg-[#17171f] border border-white/20 hover:border-white/40 text-xs font-bold text-white cursor-pointer min-h-[44px]"
        >
          Skip Food &amp; Continue →
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border cursor-pointer min-h-[40px] ${
              category === cat
                ? 'bg-[#E50914] border-[#FF242C] text-white'
                : 'bg-[#121218] border-white/15 text-white/75 hover:border-white/30'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Clean Snacks Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {visibleItems.map((item) => {
          const qty = draft.foodCart.find((c) => c.foodItemId === item.id)?.quantity ?? 0;
          return (
            <div
              key={item.id}
              className="rounded-2xl bg-[#0e0e13] border border-white/15 p-4 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-16 h-16 rounded-xl object-cover border border-white/10 shrink-0"
                />
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                    {item.category}
                  </span>
                  <h2 className="text-sm font-bold text-white truncate">{item.name}</h2>
                  <p className="text-[11px] text-white/55 line-clamp-1">{item.description}</p>
                  <p className="text-sm font-extrabold text-white mt-0.5 tabular-nums">₹{item.price}</p>
                </div>
              </div>

              {qty === 0 ? (
                <button
                  type="button"
                  onClick={() => adjustFood(item, 1)}
                  className="px-4 py-2 rounded-full bg-white/10 hover:bg-[#E50914] text-xs font-bold text-white cursor-pointer shrink-0 min-h-[44px]"
                >
                  + Add
                </button>
              ) : (
                <div className="inline-flex items-center gap-2.5 bg-[#E50914] rounded-full px-3 py-1.5 text-white text-xs font-bold shrink-0 min-h-[44px]">
                  <button
                    type="button"
                    aria-label={`Remove one ${item.name}`}
                    onClick={() => adjustFood(item, -1)}
                    className="p-1 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="tabular-nums">{qty}</span>
                  <button
                    type="button"
                    aria-label={`Add one ${item.name}`}
                    onClick={() => adjustFood(item, 1)}
                    className="p-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sticky Bottom CTA */}
      <div className="sticky bottom-14 md:bottom-3 z-30 rounded-2xl bg-[#111116]/95 backdrop-blur-md border border-white/15 p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-2xl">
        <div>
          <p className="text-xs text-white/65">
            {foodCount > 0
              ? `${foodCount} snack item${foodCount > 1 ? 's' : ''} added`
              : 'No snacks selected (you can still add later)'}
          </p>
          <p className="text-lg font-extrabold text-white tabular-nums">
            Snacks Total: ₹{foodTotal}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onSkipFood}
            className="px-5 py-3 rounded-full bg-[#1a1a22] border border-white/15 text-xs font-bold text-white cursor-pointer min-h-[44px]"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={onContinueToCompanions}
            className="flex-1 sm:flex-none px-7 py-3 rounded-full bg-gradient-to-r from-[#D90913] to-[#FF1F28] text-white text-xs sm:text-sm font-bold shadow-[0_4px_18px_rgba(229,9,20,0.45)] hover:brightness-110 cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
          >
            <span>Continue to Companions</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
