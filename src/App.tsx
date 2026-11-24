import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { TopBar } from './components/TopBar';
import { Navbar, type NavSection } from './components/Navbar';
import { Hero } from './components/Hero';
import { SearchBar } from './components/SearchBar';
import { CategoryNav } from './components/CategoryNav';
import { MovieSection } from './components/MovieSection';
import { TheatreSection } from './components/TheatreSection';
import { BenefitsBar } from './components/BenefitsBar';
import { Footer } from './components/Footer';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AuthModal } from './components/modals/AuthModal';
import { InfoModal, type InfoTopic } from './components/modals/InfoModal';
import { OfflineIndicator } from './components/PWAInstallBanner';
import { AiConciergeView } from './components/AiConciergeView';
import { MoviesPage } from './pages/user/MoviesPage';
import { MovieDetailsPage } from './pages/user/MovieDetailsPage';
import { TheatresPage, TheatreDetailsPage } from './pages/user/TheatresPages';
import { EventsPage, EventDetailsPage } from './pages/user/EventsPages';
import { SeatSelectionPage } from './pages/user/SeatSelectionPage';
import { BookingFoodStepPage } from './pages/user/BookingFoodStepPage';
import { BookingCompanionsStepPage } from './pages/user/BookingCompanionsStepPage';
import { FoodPage } from './pages/user/FoodPage';
import { CheckoutPage } from './pages/user/CheckoutPage';
import { PaymentPage } from './pages/user/PaymentPage';
import { BookingFailurePage } from './pages/user/BookingFailurePage';
import { BookingSuccessPage } from './pages/user/BookingSuccessPage';
import { BookingsTicketsPage } from './pages/user/BookingsTicketsPage';
import { SearchPage } from './pages/user/SearchPage';
import { AboutPage, ContactPage, HelpPage } from './pages/user/StaticInfoPages';
import {
  NotificationsPage,
  OffersPage,
  ProfilePage,
} from './pages/user/UserAccountPages';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import {
  AdminDashboardView,
  AdminLayout,
} from './pages/admin/AdminDashboardAndQr';
import { AdminQrScannerView } from './pages/admin/AdminQrScannerView';
import {
  AdminCatalogMiscView,
  AdminMoviesView,
  AdminShowsAndBookingsView,
  AdminTheatresAndSeatsView,
} from './pages/admin/AdminOperationsPages';
import { MOVIES } from './data/movies';
import { THEATRES } from './data/theatres';
import { LIVE_EVENTS, type CityName } from './data/events';
import {
  filterEvents,
  filterMovies,
  filterTheatres,
  type CategoryFilter,
} from './utils/bookingLogic';
import { api, setAdminToken, setUserToken } from './utils/api';
import { navigate, parseRoute, usePathname } from './utils/router';
import type {
  AdminUser,
  CatalogEvent,
  CatalogMovie,
  CatalogTheatre,
  CheckoutDraft,
  FoodItem,
  MovieSyncStatus,
  NotificationItem,
  OfferItem,
  PaymentSession,
  PrimaryBooking,
  SafeUser,
  SharedTicketItem,
  ShowItem,
} from './types/platform';

const FALLBACK_MOVIES: CatalogMovie[] = MOVIES.map((m) => ({
  ...m,
  banner: '/assets/images/hero-cast.jpg',
  trailerUrl: '',
  releaseDate: `${m.releaseYear}-01-01`,
  castDetails: m.cast.map((actor, i) => ({
    id: `${m.id}-c${i}`,
    movie_id: m.id,
    actor_name: actor,
    role_name: 'Lead',
  })),
  crewDetails: [{ id: `${m.id}-cr1`, movie_id: m.id, member_name: m.director, department: 'Director' }],
}));

const FALLBACK_THEATRES: CatalogTheatre[] = THEATRES.map((t) => ({
  ...t,
  category: 'Multiplex',
  foodAvailable: true,
  lat: 17.42,
  lng: 78.45,
}));

const FALLBACK_EVENTS: CatalogEvent[] = LIVE_EVENTS.map((ev) => ({
  ...ev,
  tiers: [
    {
      id: `${ev.id}-silver`,
      event_id: ev.id,
      tier_name: 'Silver Access',
      price: ev.price,
      total_qty: 200,
      sold_qty: 60,
    },
  ],
}));

export default function App() {
  const pathname = usePathname();
  const route = useMemo(() => parseRoute(pathname), [pathname]);

  // Storefront state
  const [selectedCity, setSelectedCity] = useState<CityName>('Hyderabad');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('Movies');
  const [searchQuery, setSearchQuery] = useState('');

  // Catalog from backend
  const [movies, setMovies] = useState<CatalogMovie[]>(FALLBACK_MOVIES);
  const [theatres, setTheatres] = useState<CatalogTheatre[]>(FALLBACK_THEATRES);
  const [events, setEvents] = useState<CatalogEvent[]>(FALLBACK_EVENTS);
  const [shows, setShows] = useState<ShowItem[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [syncStatus, setSyncStatus] = useState<MovieSyncStatus | null>(null);

  // User Auth & Bookings (strictly in-memory tokens)
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [firebaseIdToken, setFirebaseIdToken] = useState<string | null>(null);
  const [primaryBookings, setPrimaryBookings] = useState<PrimaryBooking[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<SharedTicketItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Booking Flow Drafts
  const [activeShowId, setActiveShowId] = useState<string>('');
  const [checkoutDraft, setCheckoutDraft] = useState<CheckoutDraft | null>(null);
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null);
  const [failureReason, setFailureReason] = useState<string>('');
  const [standaloneFoodCart, setStandaloneFoodCart] = useState<
    { foodItemId: string; name: string; price: number; quantity: number }[]
  >([]);
  const [lastConfirmedBookingId, setLastConfirmedBookingId] = useState<string | null>(null);

  // Admin Auth
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  // Modals & Alerts
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [infoTopic, setInfoTopic] = useState<InfoTopic | null>(null);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  const loadCatalog = useCallback(async () => {
    try {
      const cat = await api.getCatalog();
      if (cat.movies.length > 0) setMovies(cat.movies);
      if (cat.theatres.length > 0) setTheatres(cat.theatres);
      if (cat.events.length > 0) setEvents(cat.events);
      setShows(cat.shows);
      setFoodItems(cat.foodItems);
      setOffers(cat.offers);
      setSyncStatus(cat.syncStatus ?? null);
    } catch {
      // Fallback already populated
    }
  }, []);

  const loadUserWorkspace = useCallback(async () => {
    try {
      const [bRes, nRes] = await Promise.all([api.getBookings(), api.getNotifications()]);
      setPrimaryBookings(bRes.primaryBookings);
      setSharedWithMe(bRes.sharedWithMe);
      setNotifications(nRes.notifications);
    } catch {
      // Ignore if unauthenticated
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // Listen for Google Maps quota exceeded notifications from TheatreMapExplorer
  useEffect(() => {
    const onQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  // Real-time SSE Sync for bookings, companions, gate check-ins, and new movie releases
  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    const streamUrl = api.getRealtimeStreamUrl();
    const es = new EventSource(streamUrl);

    const refreshWorkspace = () => {
      if (currentUser) {
        void loadUserWorkspace();
      }
    };
    const refreshCatalog = () => {
      void loadCatalog();
    };

    es.addEventListener('booking:created', refreshWorkspace);
    es.addEventListener('booking:updated', refreshWorkspace);
    es.addEventListener('booking:checked_in', refreshWorkspace);
    es.addEventListener('companion:connected', refreshWorkspace);
    es.addEventListener('movies:synced', refreshCatalog);

    return () => {
      es.close();
    };
  }, [currentUser?.id, loadCatalog, loadUserWorkspace]);

  const handleAuthSuccess = useCallback(
    (token: string, user: SafeUser, fbToken?: string) => {
      setUserToken(token);
      setCurrentUser(user);
      if (fbToken) setFirebaseIdToken(fbToken);
      void loadUserWorkspace();
    },
    [loadUserWorkspace]
  );

  const handleUserLogout = () => {
    setUserToken(null);
    setCurrentUser(null);
    setFirebaseIdToken(null);
    setPrimaryBookings([]);
    setSharedWithMe([]);
    setNotifications([]);
    if (
      route.page === 'profile' ||
      route.page === 'notifications' ||
      route.page === 'my-bookings' ||
      route.page === 'shared-tickets'
    ) {
      navigate('/');
    }
  };

  const handleToggleWishlist = async (movieId: string) => {
    if (!currentUser) {
      setAuthModalOpen(true);
      return;
    }
    const nextWishlist = currentUser.wishlist.includes(movieId)
      ? currentUser.wishlist.filter((id) => id !== movieId)
      : [...currentUser.wishlist, movieId];
    const res = await api.updateProfile({ wishlist: nextWishlist });
    setCurrentUser(res.user);
  };

  const handleSelectNav = (nav: NavSection) => {
    if (nav === 'Home') {
      setActiveCategory('Movies');
      setSearchQuery('');
      navigate('/');
    } else if (nav === 'Movies') {
      navigate('/movies');
    } else if (nav === 'Events') {
      navigate('/events');
    } else if (nav === 'Theatres') {
      navigate('/theatres');
    } else if (nav === 'About Us') {
      navigate('/about');
    } else if (nav === 'Contact') {
      navigate('/contact');
    }
  };

  const handleSelectCategory = (cat: CategoryFilter) => {
    setActiveCategory(cat);
    if (cat === 'Theatres') {
      navigate('/theatres');
    } else if (cat === 'More') {
      navigate('/events');
    }
  };

  const handleOpenShowSeats = (show: ShowItem) => {
    setActiveShowId(show.id);
    navigate(`/show/${show.id}`);
  };

  // Filtered home collections preserving exact 6 featured movies + 5 featured theatres
  const visibleMovies = useMemo(
    () => filterMovies(movies, searchQuery, false),
    [movies, searchQuery]
  );
  const visibleTheatres = useMemo(
    () => filterTheatres(theatres, selectedCity, searchQuery, false),
    [theatres, selectedCity, searchQuery]
  );
  const visibleEvents = useMemo(
    () => filterEvents(events, activeCategory, searchQuery),
    [events, activeCategory, searchQuery]
  );

  // ADMIN PORTAL ROUTES
  if (route.area === 'admin') {
    if (!adminUser || route.page === 'admin-login') {
      return (
        <AdminLoginPage
          onLoginSuccess={(token, admin) => {
            setAdminToken(token);
            setAdminUser(admin);
            navigate('/admin');
          }}
          onBackToSite={() => navigate('/')}
        />
      );
    }

    return (
      <AdminLayout
        currentPage={route.page}
        adminUser={adminUser}
        onNavigate={navigate}
        onLogout={() => {
          setAdminToken(null);
          setAdminUser(null);
          navigate('/admin/login');
        }}
      >
        {(route.page === 'admin-dashboard' || route.page === 'admin-analytics') && (
          <AdminDashboardView onNavigate={navigate} />
        )}
        {route.page === 'admin-qr-scanner' && <AdminQrScannerView />}
        {route.page === 'admin-movies' && <AdminMoviesView onCatalogChanged={loadCatalog} />}
        {(route.page === 'admin-theatres' ||
          route.page === 'admin-screens' ||
          route.page === 'admin-seats') && (
          <AdminTheatresAndSeatsView
            initialSection={route.page === 'admin-seats' ? 'seats' : 'theatres'}
            onCatalogChanged={loadCatalog}
          />
        )}
        {(route.page === 'admin-shows' || route.page === 'admin-bookings') && (
          <AdminShowsAndBookingsView
            mode={route.page === 'admin-bookings' ? 'bookings' : 'shows'}
            onCatalogChanged={loadCatalog}
          />
        )}
        {(route.page === 'admin-users' ||
          route.page === 'admin-food' ||
          route.page === 'admin-events' ||
          route.page === 'admin-coupons' ||
          route.page === 'admin-offers' ||
          route.page === 'admin-refunds' ||
          route.page === 'admin-settings') && (
          <AdminCatalogMiscView
            section={
              route.page === 'admin-users'
                ? 'users'
                : route.page === 'admin-food'
                  ? 'food'
                  : route.page === 'admin-events'
                    ? 'events'
                    : route.page === 'admin-refunds'
                      ? 'refunds'
                      : route.page === 'admin-settings'
                        ? 'settings'
                        : 'coupons'
            }
            onCatalogChanged={loadCatalog}
          />
        )}
      </AdminLayout>
    );
  }

  // USER STOREFRONT ROUTES
  const activeNav: NavSection | null =
    route.page === 'home'
      ? 'Home'
      : route.page === 'movies' ||
          route.page === 'movie-details' ||
          route.page === 'seat-selection' ||
          route.page === 'booking-food' ||
          route.page === 'booking-companions'
        ? 'Movies'
        : route.page === 'events' || route.page === 'event-details'
          ? 'Events'
          : route.page === 'theatres' || route.page === 'theatre-details'
            ? 'Theatres'
            : route.page === 'about'
              ? 'About Us'
              : route.page === 'contact'
                ? 'Contact'
                : null;

  const unreadNotifications = notifications.filter((n) => n.is_read === 0).length;
  const selectedMovie = movies.find((m) => m.id === route.paramId) ?? movies[0];
  const selectedTheatre = theatres.find((t) => t.id === route.paramId) ?? theatres[0];
  const selectedEvent = events.find((e) => e.id === route.paramId) ?? events[0];
  const resolvedShowId =
    route.page === 'seat-selection'
      ? route.paramId || activeShowId || shows[0]?.id || ''
      : activeShowId;

  const confirmedBookingObj =
    primaryBookings.find((b) => b.id === lastConfirmedBookingId) ?? primaryBookings[0] ?? null;

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-white overflow-x-hidden">
      <OfflineIndicator />

      {mapsQuotaExceeded && (
        <div
          role="alert"
          className="sticky top-0 z-50 bg-amber-950/95 border-b border-amber-400/50 px-4 py-2.5 text-xs text-amber-100 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2 max-w-[1400px] mx-auto">
            <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
            <span>
              Google Maps API free tier daily quota exceeded. Try again tomorrow, or configure your Cloud project&apos;s Billing &amp; API Key in Google AI Studio.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMapsQuotaExceeded(false)}
            aria-label="Dismiss Google Maps quota notice"
            className="p-1 rounded hover:bg-white/10 text-amber-200 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <TopBar
        selectedCity={selectedCity}
        onSelectCity={setSelectedCity}
        onOpenInfo={(topic) => setInfoTopic(topic)}
        onOpenOffersPage={() => navigate('/offers')}
      />

      <Navbar
        activeNav={activeNav}
        onSelectNav={handleSelectNav}
        selectedCity={selectedCity}
        onSelectCity={setSelectedCity}
        userName={currentUser?.name ?? null}
        bookingCount={primaryBookings.length}
        sharedCount={sharedWithMe.length}
        unreadNotifications={unreadNotifications}
        onOpenLogin={() => setAuthModalOpen(true)}
        onOpenBookings={() => navigate('/my-bookings')}
        onNavigate={navigate}
        onLogout={handleUserLogout}
      />

      <main className="flex-1">
        {route.page === 'home' && (
          <>
            <Hero onBookNow={() => navigate(`/movies/${movies[0]?.id ?? 'pushpa-2'}`)} />

            <SearchBar
              query={searchQuery}
              onQueryChange={setSearchQuery}
              onSubmitSearch={() => {
                if (searchQuery.trim()) {
                  navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                } else {
                  navigate('/search');
                }
              }}
              selectedCity={selectedCity}
              onSelectCity={setSelectedCity}
              movies={movies}
              theatres={theatres}
              events={events}
              onPickMovie={(id) => navigate(`/movies/${id}`)}
              onPickTheatre={(id) => navigate(`/theatres/${id}`)}
              onPickEvent={(id) => navigate(`/events/${id}`)}
            />

            <CategoryNav
              activeCategory={activeCategory}
              onSelectCategory={handleSelectCategory}
            />

            <MovieSection
              movies={visibleMovies}
              events={visibleEvents}
              activeCategory={activeCategory}
              searchQuery={searchQuery}
              showAllMovies={false}
              syncStatus={syncStatus}
              onToggleViewAll={() => navigate('/movies')}
              onBookMovie={(m) => navigate(`/movies/${m.id}`)}
              onSelectMovie={(m) => navigate(`/movies/${m.id}`)}
              onExploreEvents={() => navigate('/events')}
              onBookEvent={(ev) => navigate(`/events/${ev.id}`)}
              onResetFilters={() => {
                setSearchQuery('');
                setActiveCategory('Movies');
              }}
            />

            <TheatreSection
              theatres={visibleTheatres}
              selectedCity={selectedCity}
              showAllTheatres={false}
              onToggleViewAll={() => navigate('/theatres')}
              onSelectTheatre={(t) => navigate(`/theatres/${t.id}`)}
            />
          </>
        )}

        {route.page === 'movies' && (
          <MoviesPage
            movies={movies}
            wishlist={currentUser?.wishlist ?? []}
            onToggleWishlist={handleToggleWishlist}
            onSelectMovie={(id) => navigate(`/movies/${id}`)}
          />
        )}

        {route.page === 'movie-details' && selectedMovie && (
          <MovieDetailsPage
            movie={selectedMovie}
            theatres={theatres}
            shows={shows}
            selectedCity={selectedCity}
            currentUser={currentUser}
            wishlist={currentUser?.wishlist ?? []}
            syncStatus={syncStatus}
            onToggleWishlist={handleToggleWishlist}
            onSelectShow={handleOpenShowSeats}
            onBack={() => navigate('/movies')}
            onRequireLogin={() => setAuthModalOpen(true)}
          />
        )}

        {route.page === 'theatres' && (
          <TheatresPage
            theatres={theatres}
            selectedCity={selectedCity}
            onSelectCity={setSelectedCity}
            onSelectTheatre={(id) => navigate(`/theatres/${id}`)}
          />
        )}

        {route.page === 'theatre-details' && selectedTheatre && (
          <TheatreDetailsPage
            theatre={selectedTheatre}
            movies={movies}
            shows={shows}
            currentUser={currentUser}
            firebaseIdToken={firebaseIdToken}
            onSelectShow={handleOpenShowSeats}
            onBack={() => navigate('/theatres')}
            onRequireLogin={() => setAuthModalOpen(true)}
          />
        )}

        {route.page === 'events' && (
          <EventsPage
            events={events}
            onSelectEvent={(id) => navigate(`/events/${id}`)}
          />
        )}

        {route.page === 'event-details' && selectedEvent && (
          <EventDetailsPage
            event={selectedEvent}
            onProceedToCheckout={(draft) => {
              setCheckoutDraft({ ...draft, foodCart: standaloneFoodCart });
              navigate('/checkout');
            }}
            onBack={() => navigate('/events')}
          />
        )}

        {/* Step 1: Seats Only */}
        {route.page === 'seat-selection' && (
          <SeatSelectionPage
            showId={resolvedShowId}
            movies={movies}
            theatres={theatres}
            currentUser={currentUser}
            onRequireLogin={() => setAuthModalOpen(true)}
            onProceedToFoodStep={(draft) => {
              setCheckoutDraft({ ...draft, foodCart: standaloneFoodCart });
              navigate('/booking/food');
            }}
            onBack={() => navigate(`/movies/${movies[0]?.id ?? 'pushpa-2'}`)}
          />
        )}

        {/* Step 2: Separated Food & Drinks with Skip */}
        {route.page === 'booking-food' && checkoutDraft && (
          <BookingFoodStepPage
            draft={checkoutDraft}
            foodItems={foodItems}
            onUpdateFoodCart={(cart) => {
              setStandaloneFoodCart(cart);
              setCheckoutDraft({ ...checkoutDraft, foodCart: cart });
            }}
            onContinueToCompanions={() => navigate('/booking/companions')}
            onSkipFood={() => {
              setStandaloneFoodCart([]);
              setCheckoutDraft({ ...checkoutDraft, foodCart: [] });
              navigate('/booking/companions');
            }}
            onBack={() => navigate(`/show/${checkoutDraft.show?.id ?? resolvedShowId}`)}
          />
        )}

        {route.page === 'booking-food' && !checkoutDraft && (
          <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
            <p className="text-sm text-white/75">Select movie seats first before adding food.</p>
            <button
              type="button"
              onClick={() => navigate('/movies')}
              className="px-6 py-2.5 rounded-full bg-[#E50914] text-white text-xs font-bold cursor-pointer min-h-[44px]"
            >
              Browse Movies
            </button>
          </div>
        )}

        {/* Step 3: Companion Ticket Sharing ("Who else is attending?") */}
        {route.page === 'booking-companions' && checkoutDraft && (
          <BookingCompanionsStepPage
            draft={checkoutDraft}
            currentUser={currentUser}
            onUpdateCompanions={(companions, isFamilyBooking) => {
              setCheckoutDraft({ ...checkoutDraft, companions, isFamilyBooking });
            }}
            onContinueToCheckout={() => navigate('/checkout')}
            onBack={() => navigate('/booking/food')}
            onRequireLogin={() => setAuthModalOpen(true)}
          />
        )}

        {route.page === 'booking-companions' && !checkoutDraft && (
          <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
            <p className="text-sm text-white/75">No active seat reservation found.</p>
            <button
              type="button"
              onClick={() => navigate('/movies')}
              className="px-6 py-2.5 rounded-full bg-[#E50914] text-white text-xs font-bold cursor-pointer min-h-[44px]"
            >
              Browse Movies
            </button>
          </div>
        )}

        {route.page === 'food' && (
          <FoodPage
            foodItems={foodItems}
            cart={checkoutDraft ? checkoutDraft.foodCart : standaloneFoodCart}
            onUpdateCart={(cart) => {
              setStandaloneFoodCart(cart);
              if (checkoutDraft) {
                setCheckoutDraft({ ...checkoutDraft, foodCart: cart });
              }
            }}
            hasActiveCheckout={Boolean(checkoutDraft)}
            onGoToCheckout={() => navigate('/checkout')}
            primaryBookings={primaryBookings}
            onFoodAddedToBooking={loadUserWorkspace}
          />
        )}

        {/* Step 4: Clean Checkout */}
        {route.page === 'checkout' && checkoutDraft && (
          <CheckoutPage
            draft={checkoutDraft}
            offers={offers}
            currentUser={currentUser}
            onEditFood={() => navigate('/booking/food')}
            onEditCompanions={() => navigate('/booking/companions')}
            onProceedToPayment={(updatedDraft, session) => {
              setCheckoutDraft(updatedDraft);
              setPaymentSession(session);
              navigate('/payment');
            }}
            onBack={() =>
              checkoutDraft.kind === 'EVENT'
                ? navigate(`/events/${checkoutDraft.event?.id ?? ''}`)
                : navigate('/booking/companions')
            }
            onRequireLogin={() => setAuthModalOpen(true)}
          />
        )}

        {route.page === 'checkout' && !checkoutDraft && (
          <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
            <p className="text-sm text-white/75">No active seat or event checkout session found.</p>
            <button
              type="button"
              onClick={() => navigate('/movies')}
              className="px-6 py-2.5 rounded-full bg-[#E50914] text-white text-xs font-bold cursor-pointer min-h-[44px]"
            >
              Browse Movies
            </button>
          </div>
        )}

        {/* Step 5: Dedicated Payment Gateway Page */}
        {route.page === 'payment' && !checkoutDraft && (
          <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
            <p className="text-sm text-white/75">No active checkout found. Please select your seats or event again.</p>
            <button
              type="button"
              onClick={() => navigate('/movies')}
              className="px-6 py-2.5 rounded-full bg-[#E50914] text-white text-xs font-bold cursor-pointer min-h-[44px]"
            >
              Browse Movies
            </button>
          </div>
        )}

        {route.page === 'payment' && checkoutDraft && (
          <PaymentPage
            draft={checkoutDraft}
            paymentSession={paymentSession}
            currentUser={currentUser}
            onPaymentSuccess={async (bookingId) => {
              setLastConfirmedBookingId(bookingId);
              setCheckoutDraft(null);
              setPaymentSession(null);
              setStandaloneFoodCart([]);
              await loadUserWorkspace();
              navigate('/booking-success');
            }}
            onPaymentFailure={(reason) => {
              setFailureReason(reason);
              navigate('/booking-failure');
            }}
            onBack={() => navigate('/checkout')}
          />
        )}

        {/* Payment / Booking Failure Page */}
        {route.page === 'booking-failure' && (
          <BookingFailurePage
            reason={failureReason}
            onRetry={() => navigate('/checkout')}
            onGoHome={() => navigate('/')}
            onGoBookings={() => navigate('/my-bookings')}
          />
        )}

        {route.page === 'booking-success' && (
          <BookingSuccessPage
            booking={confirmedBookingObj}
            onRefresh={loadUserWorkspace}
            onGoToBookings={() => navigate('/my-bookings')}
            onGoHome={() => navigate('/')}
          />
        )}

        {(route.page === 'my-bookings' ||
          route.page === 'my-tickets' ||
          route.page === 'shared-tickets') && (
          <BookingsTicketsPage
            initialTab={route.page === 'shared-tickets' ? 'shared-with-me' : 'upcoming'}
            currentUser={currentUser}
            primaryBookings={primaryBookings}
            sharedWithMe={sharedWithMe}
            foodItems={foodItems}
            onRefresh={loadUserWorkspace}
            onRequireLogin={() => setAuthModalOpen(true)}
          />
        )}

        {route.page === 'profile' && (
          <ProfilePage
            currentUser={currentUser}
            movies={movies}
            firebaseIdToken={firebaseIdToken}
            onSelectTheatre={(id) => navigate(`/theatres/${id}`)}
            onUserUpdated={setCurrentUser}
            onSelectMovie={(id) => navigate(`/movies/${id}`)}
            onRequireLogin={() => setAuthModalOpen(true)}
          />
        )}

        {route.page === 'offers' && <OffersPage offers={offers} />}

        {route.page === 'notifications' && (
          <NotificationsPage
            notifications={notifications}
            onMarkAllRead={async () => {
              await api.markAllNotificationsRead();
              await loadUserWorkspace();
            }}
          />
        )}

        {route.page === 'ai-concierge' && (
          <AiConciergeView
            selectedCity={selectedCity}
            firebaseIdToken={firebaseIdToken}
            onBackHome={() => navigate('/')}
          />
        )}

        {/* Global Search Page */}
        {route.page === 'search' && (
          <SearchPage
            movies={movies}
            theatres={theatres}
            events={events}
            initialQuery={searchQuery}
            onSelectMovie={(id) => navigate(`/movies/${id}`)}
            onSelectTheatre={(id) => navigate(`/theatres/${id}`)}
            onSelectEvent={(id) => navigate(`/events/${id}`)}
          />
        )}

        {/* Static Information Pages */}
        {route.page === 'about' && <AboutPage onBack={() => navigate('/')} />}
        {route.page === 'contact' && <ContactPage onBack={() => navigate('/')} />}
        {route.page === 'help' && <HelpPage onBack={() => navigate('/')} />}
      </main>

      <BenefitsBar
        onLogoClick={() => handleSelectNav('Home')}
        onOpenInfo={(topic) => setInfoTopic(topic)}
      />

      <Footer
        onOpenTopic={(topic) => {
          if (topic === 'faq') navigate('/help');
          else if (topic === 'contact') navigate('/contact');
          else setInfoTopic(topic);
        }}
        onOpenAdmin={() => navigate('/admin/login')}
      />

      <MobileBottomNav
        currentPage={route.page}
        onNavigate={navigate}
        onOpenAuthOrProfile={() => (currentUser ? navigate('/profile') : setAuthModalOpen(true))}
      />

      {authModalOpen && (
        <AuthModal
          currentUser={currentUser}
          onClose={() => setAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
          onLogout={handleUserLogout}
        />
      )}

      {infoTopic && <InfoModal topic={infoTopic} onClose={() => setInfoTopic(null)} />}
    </div>
  );
}
