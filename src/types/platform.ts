import type { SeatCategory } from '../utils/bookingLogic';

export interface CastMember {
  id: string;
  movie_id: string;
  actor_name: string;
  role_name: string;
}

export interface CrewMember {
  id: string;
  movie_id: string;
  member_name: string;
  department: string;
}

export interface CatalogMovie {
  id: string;
  title: string;
  subtitle?: string;
  poster: string;
  banner: string;
  trailerUrl: string;
  youtubeVideoId?: string;
  trailerThumbnail?: string;
  genre: string[];
  language: string;
  duration: string;
  rating: number;
  votes: string;
  certification: string;
  formats: string[];
  releaseDate: string;
  releaseYear: number;
  basePrice: number;
  featured: boolean;
  synopsis: string;
  cast: string[];
  castDetails: CastMember[];
  crewDetails: CrewMember[];
  director: string;
}

export interface MovieSyncStatus {
  mode: 'LIVE' | 'DEMO';
  lastSyncedAt: string;
  apiAvailable: boolean;
  errorBanner: string | null;
  movieCount: number;
  syncedNewCount: number;
}

export interface CatalogTheatre {
  id: string;
  name: string;
  location: string;
  city: string;
  address: string;
  category: string;
  rating: number;
  image: string;
  screens: number;
  formats: string[];
  amenities: string[];
  foodAvailable: boolean;
  lat: number;
  lng: number;
  featured: boolean;
}

export interface EventTier {
  id: string;
  event_id: string;
  tier_name: string;
  price: number;
  total_qty: number;
  sold_qty: number;
}

export interface CatalogEvent {
  id: string;
  title: string;
  category: 'Concerts' | 'Comedy Shows' | 'Sports' | 'Arts & Culture';
  venue: string;
  city: string;
  date: string;
  time: string;
  price: number;
  image: string;
  badge: string;
  description: string;
  tiers: EventTier[];
}

export interface ShowItem {
  id: string;
  movie_id: string;
  theatre_id: string;
  screen_id: string;
  show_date: string;
  show_time: string;
  time_slot: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  format: string;
  base_price: number;
  status: 'ACTIVE' | 'CANCELLED';
  screen_name: string;
  sound_system: string;
  projection: string;
}

export interface ShowSeat {
  id: string;
  seat_code: string;
  category: SeatCategory;
  price: number;
  status: 'AVAILABLE' | 'LOCKED' | 'BOOKED' | 'UNAVAILABLE';
  locked_by_user_id: string | null;
  lock_expires_at: number | null;
}

export interface FoodItem {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  image: string;
  is_combo: number;
  is_veg: number;
  available: number;
}

export interface OfferItem {
  id: string;
  title: string;
  code: string;
  description: string;
  badge: string;
  valid_till: string;
  active: number;
}

export interface CompanionLink {
  id: string;
  companion_name: string;
  companion_mobile: string;
  relation: string;
  status: string;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: 'USER' | 'ADMIN';
  isVerified: boolean;
  avatarUrl: string;
  preferredCity: string;
  savedLocations: string[];
  savedPaymentMethods: string[];
  wishlist: string[];
  companionLinks: CompanionLink[];
}

export interface BookingParticipant {
  id: string;
  user_id: string | null;
  name: string;
  mobile: string;
  relation: string;
  seat_code: string;
  role: 'PRIMARY' | 'COMPANION';
  verification_status: 'VERIFIED' | 'PENDING';
}

export interface CompanionAccessItem {
  id: string;
  companion_user_id: string | null;
  companion_name: string;
  companion_mobile: string;
  relation: string;
  verification_status: 'VERIFIED' | 'PENDING';
  access_status: 'VERIFIED' | 'PENDING';
  invited_at: string;
  verified_at: string | null;
}

export interface BookingFoodItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface PrimaryBooking {
  id: string;
  booking_code: string;
  user_id: string;
  kind: 'MOVIE' | 'EVENT';
  show_id: string | null;
  event_id: string | null;
  movie_title: string;
  theatre_name: string;
  screen_name: string;
  show_date: string;
  show_time: string;
  format: string;
  seats_subtotal: number;
  food_subtotal: number;
  convenience_fee: number;
  taxes: number;
  discount: number;
  total_amount: number;
  coupon_code: string | null;
  status: 'CONFIRMED' | 'CANCELLED';
  payment_status: 'PAID' | 'PENDING' | 'REFUNDED';
  qr_token: string;
  qr_status: 'ACTIVE' | 'USED' | 'CANCELLED';
  scanned_at: string | null;
  is_family_booking: number;
  created_at: string;
  seats: string[];
  participants: BookingParticipant[];
  companionAccess: CompanionAccessItem[];
  foodItems: BookingFoodItem[];
  refund: {
    original_amount: number;
    cancellation_fee: number;
    refund_amount: number;
    status: string;
    created_at: string;
  } | null;
}

export interface SharedTicketItem {
  accessId: string;
  bookingId: string;
  bookingCode: string;
  movieTitle: string;
  theatreName: string;
  screenName: string;
  showDate: string;
  showTime: string;
  format: string;
  allSeats: string[];
  seatCode: string;
  ticketCount: number;
  sharedByName: string;
  sharedWith: { companion_name: string; relation: string; verification_status: string }[];
  relation: string;
  verificationStatus: 'VERIFIED' | 'PENDING';
  accessStatus: 'VERIFIED' | 'PENDING';
  qrToken: string | null;
  qrStatus: 'ACTIVE' | 'USED' | 'CANCELLED';
  scannedAt: string | null;
  bookingStatus: 'CONFIRMED' | 'CANCELLED';
  foodSummary: { name: string; quantity: number }[];
  isPrimaryBooker: false;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: number;
  created_at: string;
}

export interface ReviewItem {
  id: string;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface CompanionDraft {
  seatCode: string;
  name: string;
  mobile: string;
  relation: string;
  verified: boolean;
  sandboxOtp?: string;
}

export interface CheckoutDraft {
  kind: 'MOVIE' | 'EVENT';
  show?: ShowItem & { movie_title?: string; theatre_name?: string; theatre_location?: string };
  movie?: CatalogMovie;
  theatre?: CatalogTheatre;
  selectedSeats: { seatCode: string; price: number; category: string }[];
  lockExpiresAt?: number;
  event?: CatalogEvent;
  eventTierName?: string;
  eventUnitPrice?: number;
  eventQty?: number;
  couponCode?: string;
  foodCart: { foodItemId: string; name: string; price: number; quantity: number }[];
  companions: CompanionDraft[];
  isFamilyBooking?: boolean;
}

export interface PaymentSessionSummary {
  kind: string;
  title: string;
  venue: string;
  showTime: string;
  seats: string[];
  ticketCount: number;
  foodCount: number;
  total: number;
  subtotal?: number;
  convenienceFee?: number;
  taxes?: number;
  discount?: number;
}

export interface PaymentSession {
  sessionId: string;
  amount: number;
  currency: string;
  expiresAt: number;
  summary: PaymentSessionSummary;
  razorpayOrderId: string;
  razorpayKeyId: string;
  idempotencyKey?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN';
}

export interface AdminOverview {
  kpis: {
    totalUsers: number;
    totalBookings: number;
    todayBookings: number;
    todayRevenue: number;
    activeShows: number;
    totalMovies: number;
    totalEvents: number;
    totalTheatres: number;
    foodOrdersCount: number;
    cancelledBookings: number;
    refundsTotal: number;
    companionTicketsCount: number;
  };
  revenueByMovie: { label: string; revenue: number; bookings: number }[];
  settings: Record<string, string>;
}
