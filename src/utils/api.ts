import type {
  AdminOverview,
  AdminUser,
  CatalogEvent,
  CatalogMovie,
  CatalogTheatre,
  CheckoutDraft,
  FoodItem,
  MovieSyncStatus,
  NotificationItem,
  OfferItem,
  PrimaryBooking,
  ReviewItem,
  SafeUser,
  SharedTicketItem,
  ShowItem,
  ShowSeat,
} from '../types/platform';

let userAuthToken: string | null = null;
let adminAuthToken: string | null = null;

export function setUserToken(token: string | null) {
  userAuthToken = token;
}

export function getUserToken(): string | null {
  return userAuthToken;
}

export function setAdminToken(token: string | null) {
  adminAuthToken = token;
}

export function getAdminToken(): string | null {
  return adminAuthToken;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  tokenKind: 'user' | 'admin' | 'none' = 'user'
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const activeToken =
    tokenKind === 'admin' ? adminAuthToken : tokenKind === 'user' ? userAuthToken : null;
  if (activeToken) {
    headers.set('Authorization', `Bearer ${activeToken}`);
  }

  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.reason || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  // Public Catalog
  getCatalog: () =>
    apiFetch<{
      movies: CatalogMovie[];
      theatres: CatalogTheatre[];
      events: CatalogEvent[];
      shows: ShowItem[];
      foodItems: FoodItem[];
      offers: OfferItem[];
      syncStatus?: MovieSyncStatus;
    }>('/api/catalog', {}, 'none'),

  syncMovies: () =>
    apiFetch<{ syncStatus: MovieSyncStatus }>(
      '/api/movies/sync',
      { method: 'POST' },
      'none'
    ),

  getShowSeats: (showId: string) =>
    apiFetch<{ show: ShowItem & Record<string, unknown>; seats: ShowSeat[] }>(
      `/api/shows/${encodeURIComponent(showId)}/seats`,
      {},
      'none'
    ),

  validateCoupon: (payload: {
    code: string;
    subtotal: number;
    movieId?: string;
    theatreId?: string;
  }) =>
    apiFetch<{ valid: boolean; discount: number; reason?: string }>(
      '/api/coupons/validate',
      { method: 'POST', body: JSON.stringify(payload) },
      'none'
    ),

  getReviews: (targetType: 'MOVIE' | 'THEATRE', targetId: string) =>
    apiFetch<{ reviews: ReviewItem[] }>(
      `/api/reviews/${targetType}/${encodeURIComponent(targetId)}`,
      {},
      'none'
    ),

  postReview: (payload: {
    targetType: 'MOVIE' | 'THEATRE';
    targetId: string;
    rating: number;
    comment: string;
  }) =>
    apiFetch<{ review: ReviewItem }>(
      '/api/reviews',
      { method: 'POST', body: JSON.stringify(payload) },
      'user'
    ),

  // Auth & User Profile
  sendOtp: (target: string, purpose: 'LOGIN' | 'SIGNUP' | 'RESET') =>
    apiFetch<{ sent: boolean; target: string; sandboxOtp?: string }>(
      '/api/auth/otp/send',
      { method: 'POST', body: JSON.stringify({ target, purpose }) },
      'none'
    ),

  signup: (payload: {
    name: string;
    mobile: string;
    email: string;
    password: string;
    confirmPassword: string;
    otpCode: string;
    acceptedTerms: boolean;
  }) =>
    apiFetch<{ token: string; user: SafeUser }>(
      '/api/auth/signup',
      { method: 'POST', body: JSON.stringify(payload) },
      'none'
    ),

  login: (payload: {
    mode: 'password' | 'otp';
    email?: string;
    password?: string;
    mobile?: string;
    otpCode?: string;
  }) =>
    apiFetch<{ token: string; user: SafeUser }>(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify(payload) },
      'none'
    ),

  demoSwitch: (userId: string) =>
    apiFetch<{ token: string; user: SafeUser }>(
      '/api/auth/demo-switch',
      { method: 'POST', body: JSON.stringify({ userId }) },
      'none'
    ),

  firebaseExchange: (idToken: string) =>
    apiFetch<{ token: string; user: SafeUser }>(
      '/api/auth/firebase-exchange',
      { method: 'POST', body: JSON.stringify({ idToken }) },
      'none'
    ),

  resetPassword: (payload: { target: string; otpCode: string; newPassword: string }) =>
    apiFetch<{ reset: boolean }>(
      '/api/auth/reset-password',
      { method: 'POST', body: JSON.stringify(payload) },
      'none'
    ),

  getMe: () => apiFetch<{ user: SafeUser }>('/api/auth/me', {}, 'user'),

  updateProfile: (payload: {
    name?: string;
    preferredCity?: string;
    savedLocations?: string[];
    savedPaymentMethods?: string[];
    wishlist?: string[];
  }) =>
    apiFetch<{ user: SafeUser }>(
      '/api/auth/profile',
      { method: 'PUT', body: JSON.stringify(payload) },
      'user'
    ),

  getNotifications: () =>
    apiFetch<{ notifications: NotificationItem[] }>('/api/auth/notifications', {}, 'user'),

  markAllNotificationsRead: () =>
    apiFetch<{ ok: boolean }>('/api/auth/notifications/read-all', { method: 'POST' }, 'user'),

  // Bookings, Locking, Companions, Food, Transfer & Cancellation
  lockSeats: (showId: string, seatCodes: string[]) =>
    apiFetch<{ locked: boolean; seatCodes: string[]; expiresAt: number }>(
      `/api/shows/${encodeURIComponent(showId)}/lock`,
      { method: 'POST', body: JSON.stringify({ seatCodes }) },
      'user'
    ),

  releaseSeats: (showId: string) =>
    apiFetch<{ released: boolean }>(
      `/api/shows/${encodeURIComponent(showId)}/release`,
      { method: 'POST' },
      'user'
    ),

  createPaymentSession: (payload: { draft: CheckoutDraft; idempotencyKey?: string }) =>
    apiFetch<{
      sessionId: string;
      amount: number;
      currency: string;
      expiresAt: number;
      razorpayOrderId: string;
      razorpayKeyId: string;
      status?: string;
      bookingId?: string;
      summary: {
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
      };
    }>(
      '/api/payments/create-session',
      {
        method: 'POST',
        body: JSON.stringify({
          kind: payload.draft.kind,
          showId: payload.draft.show?.id,
          eventId: payload.draft.event?.id,
          eventTierName: payload.draft.eventTierName,
          eventQty: payload.draft.eventQty,
          seatCodes: payload.draft.selectedSeats.map((seat) => seat.seatCode),
          foodCart: payload.draft.foodCart.map(({ foodItemId, quantity }) => ({
            foodItemId,
            quantity,
          })),
          companions: payload.draft.companions,
          couponCode: payload.draft.couponCode,
          isFamilyBooking: payload.draft.isFamilyBooking,
          idempotencyKey: payload.idempotencyKey,
        }),
      },
      'user'
    ),

  verifyPaymentAndBook: (payload: {
    sessionId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    simulateFailure?: boolean;
  }) =>
    apiFetch<{
      verified: boolean;
      status: 'SUCCESS' | 'FAILED';
      bookingId?: string;
      bookingCode?: string;
      qrToken?: string;
      transactionRef?: string;
      reason?: string;
      duplicateDetected?: boolean;
    }>('/api/payments/verify-and-book', { method: 'POST', body: JSON.stringify(payload) }, 'user'),

  getBookings: () =>
    apiFetch<{ primaryBookings: PrimaryBooking[]; sharedWithMe: SharedTicketItem[] }>(
      '/api/bookings',
      {},
      'user'
    ),

  sendCompanionOtp: (mobile: string) =>
    apiFetch<{ sent: boolean; mobile: string; sandboxOtp?: string }>(
      '/api/companions/send-otp',
      { method: 'POST', body: JSON.stringify({ mobile }) },
      'user'
    ),

  verifyCompanionOtp: (payload: {
    mobile: string;
    otpCode: string;
    accessId?: string;
    participantId?: string;
  }) =>
    apiFetch<{ verified: boolean; mobile: string }>(
      '/api/companions/verify',
      { method: 'POST', body: JSON.stringify(payload) },
      'user'
    ),

  addCompanionToBooking: (
    bookingId: string,
    payload: { name: string; mobile: string; relation: string; verified?: boolean }
  ) =>
    apiFetch<{ added: boolean; accessId: string }>(
      `/api/bookings/${encodeURIComponent(bookingId)}/companions`,
      { method: 'POST', body: JSON.stringify(payload) },
      'user'
    ),

  removeCompanionFromBooking: (bookingId: string, accessId: string) =>
    apiFetch<{ removed: boolean }>(
      `/api/bookings/${encodeURIComponent(bookingId)}/companions/${encodeURIComponent(accessId)}`,
      { method: 'DELETE' },
      'user'
    ),

  assignCompanionPostBooking: (
    bookingId: string,
    payload: { participantId: string; name: string; mobile: string; relation: string; verified: boolean }
  ) =>
    apiFetch<{ updated: boolean }>(
      `/api/bookings/${encodeURIComponent(bookingId)}/assign-companion`,
      { method: 'POST', body: JSON.stringify(payload) },
      'user'
    ),

  transferBookingAccess: (
    bookingId: string,
    payload: { recipientName: string; recipientMobile: string; otpCode: string }
  ) =>
    apiFetch<{ transferred: boolean; qrToken: string }>(
      `/api/bookings/${encodeURIComponent(bookingId)}/transfer`,
      { method: 'POST', body: JSON.stringify(payload) },
      'user'
    ),

  addPostBookingFood: (
    bookingId: string,
    foodCart: { foodItemId: string; quantity: number }[]
  ) =>
    apiFetch<{ added: boolean; total: number }>(
      `/api/bookings/${encodeURIComponent(bookingId)}/food`,
      { method: 'POST', body: JSON.stringify({ foodCart }) },
      'user'
    ),

  cancelBooking: (bookingId: string, reason = 'User requested cancellation') =>
    apiFetch<{
      cancelled: boolean;
      refund: {
        eligible: boolean;
        tier: string;
        originalAmount: number;
        cancellationFee: number;
        refundAmount: number;
      };
    }>(
      `/api/bookings/${encodeURIComponent(bookingId)}/cancel`,
      { method: 'POST', body: JSON.stringify({ reason, hoursUntilShow: 6 }) },
      'user'
    ),

  // Admin Portal APIs
  getAdminBootstrapStatus: () =>
    apiFetch<{ envPasscodeActive: boolean; needsFirstRunSetup: boolean }>(
      '/api/admin/bootstrap-status',
      {},
      'none'
    ),

  bootstrapAdmin: (payload: { name: string; email: string; password: string }) =>
    apiFetch<{ token: string; admin: AdminUser }>(
      '/api/admin/bootstrap',
      { method: 'POST', body: JSON.stringify(payload) },
      'none'
    ),

  loginAdmin: (payload: { email?: string; password?: string; passcode?: string }) =>
    apiFetch<{ token: string; admin: AdminUser }>(
      '/api/admin/login',
      { method: 'POST', body: JSON.stringify(payload) },
      'none'
    ),

  getAdminOverview: () => apiFetch<AdminOverview>('/api/admin/overview', {}, 'admin'),

  adminGetMovies: () =>
    apiFetch<{ movies: Record<string, unknown>[] }>('/api/admin/movies', {}, 'admin'),

  adminCreateMovie: (payload: Record<string, unknown>) =>
    apiFetch<{ id: string }>(
      '/api/admin/movies',
      { method: 'POST', body: JSON.stringify(payload) },
      'admin'
    ),

  adminUpdateMovie: (id: string, payload: Record<string, unknown>) =>
    apiFetch<{ updated: boolean }>(
      `/api/admin/movies/${encodeURIComponent(id)}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      'admin'
    ),

  adminDeleteMovie: (id: string) =>
    apiFetch<{ deleted: boolean }>(
      `/api/admin/movies/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      'admin'
    ),

  adminGetTheatres: () =>
    apiFetch<{ theatres: Record<string, unknown>[]; screens: Record<string, unknown>[] }>(
      '/api/admin/theatres',
      {},
      'admin'
    ),

  adminCreateTheatre: (payload: Record<string, unknown>) =>
    apiFetch<{ id: string }>(
      '/api/admin/theatres',
      { method: 'POST', body: JSON.stringify(payload) },
      'admin'
    ),

  adminGetScreenSeats: (screenId: string) =>
    apiFetch<{ seats: Record<string, unknown>[] }>(
      `/api/admin/screens/${encodeURIComponent(screenId)}/seats`,
      {},
      'admin'
    ),

  adminUpdateScreenSeats: (
    screenId: string,
    updates: { seat_code: string; category: string; price_delta: number; is_blocked: boolean }[]
  ) =>
    apiFetch<{ updated: boolean }>(
      `/api/admin/screens/${encodeURIComponent(screenId)}/seats`,
      { method: 'PUT', body: JSON.stringify({ updates }) },
      'admin'
    ),

  adminGetShows: () =>
    apiFetch<{ shows: Record<string, unknown>[] }>('/api/admin/shows', {}, 'admin'),

  adminCreateShow: (payload: Record<string, unknown>) =>
    apiFetch<{ id: string }>(
      '/api/admin/shows',
      { method: 'POST', body: JSON.stringify(payload) },
      'admin'
    ),

  adminCancelShow: (id: string) =>
    apiFetch<{ cancelled: boolean }>(
      `/api/admin/shows/${encodeURIComponent(id)}/cancel`,
      { method: 'PUT' },
      'admin'
    ),

  adminGetFood: () =>
    apiFetch<{ foodItems: FoodItem[] }>('/api/admin/food', {}, 'admin'),

  adminCreateFood: (payload: Record<string, unknown>) =>
    apiFetch<{ id: string }>(
      '/api/admin/food',
      { method: 'POST', body: JSON.stringify(payload) },
      'admin'
    ),

  adminUpdateFood: (id: string, payload: { available?: boolean; price?: number }) =>
    apiFetch<{ updated: boolean }>(
      `/api/admin/food/${encodeURIComponent(id)}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      'admin'
    ),

  adminGetEvents: () =>
    apiFetch<{ events: Record<string, unknown>[] }>('/api/admin/events', {}, 'admin'),

  adminCreateEvent: (payload: Record<string, unknown>) =>
    apiFetch<{ id: string }>(
      '/api/admin/events',
      { method: 'POST', body: JSON.stringify(payload) },
      'admin'
    ),

  adminGetCoupons: () =>
    apiFetch<{ coupons: Record<string, unknown>[]; offers: OfferItem[] }>(
      '/api/admin/coupons',
      {},
      'admin'
    ),

  adminCreateCoupon: (payload: Record<string, unknown>) =>
    apiFetch<{ id: string }>(
      '/api/admin/coupons',
      { method: 'POST', body: JSON.stringify(payload) },
      'admin'
    ),

  adminGetBookings: (q = '') =>
    apiFetch<{ bookings: Record<string, unknown>[] }>(
      `/api/admin/bookings?q=${encodeURIComponent(q)}`,
      {},
      'admin'
    ),

  adminGetUsers: () =>
    apiFetch<{ users: Record<string, unknown>[] }>('/api/admin/users', {}, 'admin'),

  adminGetRefunds: () =>
    apiFetch<{ refunds: Record<string, unknown>[] }>('/api/admin/refunds', {}, 'admin'),

  adminScanQr: (token: string) =>
    apiFetch<{
      valid: boolean;
      status: string;
      reason: string;
      booking?: Record<string, unknown>;
    }>(`/api/admin/qr/scan/${encodeURIComponent(token)}`, {}, 'admin'),

  adminMarkQrEntry: (qrToken: string) =>
    apiFetch<{ markedUsed: boolean; scannedAt: string; bookingCode?: string }>(
      '/api/admin/qr/mark-entry',
      { method: 'POST', body: JSON.stringify({ qrToken }) },
      'admin'
    ),

  adminUpdateSettings: (payload: Record<string, string | number>) =>
    apiFetch<{ updated: boolean }>(
      '/api/admin/settings',
      { method: 'PUT', body: JSON.stringify(payload) },
      'admin'
    ),

  // Gemini AI Concierge & Grounding
  aiChat: async (
    payload: {
      message: string;
      history?: { role: 'user' | 'model'; text: string }[];
      mode?: string;
      rolePreset?: string;
      city?: string;
      latLng?: { latitude: number; longitude: number };
      sessionId?: number | null;
      contextSummary?: string;
    },
    firebaseIdToken?: string | null
  ) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (firebaseIdToken) headers.Authorization = `Bearer ${firebaseIdToken}`;
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `AI request failed (${res.status})`);
    return data as {
      text: string;
      model: string;
      mode: string;
      webSources: { title: string; uri: string }[];
      mapsSources: { title: string; uri: string; placeId?: string; snippet?: string }[];
      sessionId: number | null;
    };
  },

  aiSearchGrounding: (payload: { query?: string; title?: string; kind?: string; city?: string }) =>
    apiFetch<{
      text: string;
      model: string;
      webSources: { title: string; uri: string }[];
    }>('/api/ai/search-grounding', { method: 'POST', body: JSON.stringify(payload) }, 'none'),

  aiMapsGrounding: (payload: {
    query?: string;
    venueName?: string;
    city?: string;
    latLng?: { latitude: number; longitude: number };
  }) =>
    apiFetch<{
      text: string;
      model: string;
      mapsSources: { title: string; uri: string; placeId?: string; snippet?: string }[];
    }>('/api/ai/maps-grounding', { method: 'POST', body: JSON.stringify(payload) }, 'none'),

  // Cloud SQL Persistence (Firebase Auth Bearer)
  cloudGetMe: async (firebaseIdToken: string) => {
    const res = await fetch('/api/cloud/me', {
      headers: { Authorization: `Bearer ${firebaseIdToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to load Cloud SQL profile');
    return data as {
      user: Record<string, unknown>;
      sessions: { id: number; title: string; mode: string; updatedAt: string }[];
      savedVenues: { theatreId: string; theatreName: string; city: string; note?: string | null }[];
    };
  },

  cloudSaveVenue: async (
    firebaseIdToken: string,
    payload: { theatreId: string; theatreName: string; city: string; note?: string }
  ) => {
    const res = await fetch('/api/cloud/saved-venues', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${firebaseIdToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to save venue');
    return data;
  },

  cloudRemoveSavedVenue: async (firebaseIdToken: string, theatreId: string) => {
    const res = await fetch(`/api/cloud/saved-venues/${encodeURIComponent(theatreId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${firebaseIdToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to remove venue');
    return data;
  },

  cloudGetChatSession: async (firebaseIdToken: string, sessionId: number) => {
    const res = await fetch(`/api/cloud/chats/${sessionId}`, {
      headers: { Authorization: `Bearer ${firebaseIdToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to load chat session');
    return data as {
      session: {
        id: number;
        title: string;
        mode: string;
        messages: { id: number; role: 'user' | 'model'; content: string; sourcesJson?: string | null }[];
      };
    };
  },

  getRealtimeStreamUrl: (options: { showId?: string; asAdmin?: boolean } = {}) => {
    const params = new URLSearchParams();
    const token = options.asAdmin ? adminAuthToken : userAuthToken;
    if (token) params.set('token', token);
    if (options.showId) params.set('showId', options.showId);
    const qs = params.toString();
    return `/api/realtime/stream${qs ? `?${qs}` : ''}`;
  },
};
