import React, { useMemo, useState } from 'react';
import { UtensilsCrossed, Plus, Minus, ShoppingBag, ArrowRight, CheckCircle2 } from 'lucide-react';
import { SkeletonFoodCard } from '../../components/skeletons/LoadingSkeletons';
import { api } from '../../utils/api';
import type { FoodItem, PrimaryBooking } from '../../types/platform';

interface FoodPageProps {
  foodItems: FoodItem[];
  cart: { foodItemId: string; name: string; price: number; quantity: number }[];
  onUpdateCart: (cart: { foodItemId: string; name: string; price: number; quantity: number }[]) => void;
  hasActiveCheckout: boolean;
  onGoToCheckout: () => void;
  primaryBookings: PrimaryBooking[];
  onFoodAddedToBooking: () => void;
}

export const FoodPage: React.FC<FoodPageProps> = ({
  foodItems,
  cart,
  onUpdateCart,
  hasActiveCheckout,
  onGoToCheckout,
  primaryBookings,
  onFoodAddedToBooking,
}) => {
  const [category, setCategory] = useState('All');
  const [selectedBookingId, setSelectedBookingId] = useState<string>(
    () => primaryBookings.find((b) => b.status === 'CONFIRMED')?.id ?? ''
  );
  const [submittingPost, setSubmittingPost] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(foodItems.map((f) => f.category)))],
    [foodItems]
  );

  const visibleItems = useMemo(
    () => foodItems.filter((f) => category === 'All' || f.category === category),
    [foodItems, category]
  );

  const getQty = (id: string) => cart.find((c) => c.foodItemId === id)?.quantity ?? 0;

  const adjustQty = (item: FoodItem, delta: number) => {
    const existing = cart.find((c) => c.foodItemId === item.id);
    const nextQty = Math.max(0, Math.min(10, (existing?.quantity ?? 0) + delta));
    const filtered = cart.filter((c) => c.foodItemId !== item.id);
    if (nextQty > 0) {
      filtered.push({ foodItemId: item.id, name: item.name, price: item.price, quantity: nextQty });
    }
    onUpdateCart(filtered);
  };

  const subtotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const taxes = Math.round(subtotal * 0.18);
  const total = subtotal + taxes;

  const confirmedBookings = primaryBookings.filter((b) => b.status === 'CONFIRMED');

  const handleAttachToExistingBooking = async () => {
    if (!selectedBookingId || cart.length === 0) return;
    setSubmittingPost(true);
    setError('');
    setMessage('');
    try {
      const res = await api.addPostBookingFood(
        selectedBookingId,
        cart.map((c) => ({ foodItemId: c.foodItemId, quantity: c.quantity }))
      );
      setMessage(`Added snacks worth ₹${res.total} to your confirmed booking!`);
      onUpdateCart([]);
      onFoodAddedToBooking();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmittingPost(false);
    }
  };

  return (
    <div className="max-w-[1460px] mx-auto px-4 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#FF252E]">
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Theatre Gourmet & Combos</span>
          </span>
          <h1 className="font-display text-3xl font-extrabold text-white mt-1">
            Food & Beverages
          </h1>
          <p className="text-sm text-white/65 mt-1">
            Pre-order snacks during checkout or attach combos directly to any existing confirmed booking.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${
                category === cat
                  ? 'bg-[#E50914] border-[#FF242C] text-white'
                  : 'bg-[#141418] border-white/15 text-white/75'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div className="rounded-xl bg-emerald-950/60 border border-emerald-500/40 px-4 py-3 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-[#2a1014] border border-[#FF242C]/50 px-4 py-3 text-xs text-[#FF8A8F]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {foodItems.length === 0
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonFoodCard key={i} />)
            : visibleItems.map((item) => {
            const qty = getQty(item.id);
            return (
              <div
                key={item.id}
                className="rounded-2xl bg-[#0e0e13] border border-white/15 p-4 flex gap-3.5 justify-between"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-20 h-20 rounded-xl object-cover border border-white/10 shrink-0"
                />
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm border border-emerald-400 flex items-center justify-center shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      </span>
                      <span className="text-[10.5px] font-bold uppercase text-[#FF3B42]">
                        {item.category}
                      </span>
                    </div>
                    <h2 className="text-sm font-bold text-white mt-0.5 truncate">{item.name}</h2>
                    <p className="text-[11px] text-white/60 line-clamp-2 mt-0.5">{item.description}</p>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm font-extrabold text-white">₹{item.price}</span>
                    {qty === 0 ? (
                      <button
                        type="button"
                        onClick={() => adjustQty(item, 1)}
                        className="px-4 py-1 rounded-full bg-[#1b1b22] border border-[#FF1822]/50 hover:bg-[#E50914] text-white text-xs font-bold cursor-pointer"
                      >
                        + Add
                      </button>
                    ) : (
                      <div className="inline-flex items-center gap-2.5 bg-[#E50914] rounded-full px-2.5 py-1 text-white text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => adjustQty(item, -1)}
                          aria-label={`Remove one ${item.name}`}
                          className="cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="tabular-nums">{qty}</span>
                        <button
                          type="button"
                          onClick={() => adjustQty(item, 1)}
                          aria-label={`Add one ${item.name}`}
                          className="cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Cart Summary */}
        <aside className="rounded-2xl bg-[#0e0e13] border border-white/15 p-5 space-y-4 sticky top-20">
          <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[#FF252E]" />
            <span>Snack Cart ({cart.reduce((s, c) => s + c.quantity, 0)})</span>
          </h2>

          {cart.length === 0 ? (
            <p className="text-xs text-white/60">Your snack cart is empty. Add popcorn, drinks, or combos.</p>
          ) : (
            <div className="space-y-2.5">
              {cart.map((c) => (
                <div key={c.foodItemId} className="flex justify-between text-xs text-white/85">
                  <span>
                    {c.name} × {c.quantity}
                  </span>
                  <span className="font-bold">₹{c.price * c.quantity}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-white/10 space-y-1 text-xs">
                <div className="flex justify-between text-white/65">
                  <span>Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-white/65">
                  <span>Taxes (18%)</span>
                  <span>₹{taxes}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-white pt-1">
                  <span>Food Total</span>
                  <span>₹{total}</span>
                </div>
              </div>
            </div>
          )}

          {hasActiveCheckout && (
            <button
              type="button"
              onClick={onGoToCheckout}
              className="w-full py-2.5 rounded-full bg-gradient-to-r from-[#D90913] to-[#FF1F28] text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Return to Ticket Checkout</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {confirmedBookings.length > 0 && cart.length > 0 && (
            <div className="pt-3 border-t border-white/10 space-y-2.5">
              <p className="text-[11px] font-bold text-white/65 uppercase tracking-wider">
                Or Add to Confirmed Booking
              </p>
              <select
                aria-label="Choose booking to add food"
                value={selectedBookingId}
                onChange={(e) => setSelectedBookingId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#17171d] border border-white/15 text-xs text-white"
              >
                {confirmedBookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.booking_code} — {b.movie_title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={submittingPost}
                onClick={handleAttachToExistingBooking}
                className="w-full py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
              >
                {submittingPost ? 'Adding Food...' : `Add to Booking · ₹${total}`}
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
