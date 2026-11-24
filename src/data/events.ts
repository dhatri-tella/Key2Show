export type EventCategory = 'Concerts' | 'Comedy Shows' | 'Sports' | 'Arts & Culture';

export interface LiveEvent {
  id: string;
  title: string;
  category: EventCategory;
  venue: string;
  city: string;
  date: string;
  time: string;
  price: number;
  image: string;
  badge: string;
  description: string;
}

export const LIVE_EVENTS: LiveEvent[] = [
  {
    id: 'arijit-hyderabad',
    title: 'Arijit Singh Live in Concert',
    category: 'Concerts',
    venue: 'GMR Arena, Shamshabad',
    city: 'Hyderabad',
    date: 'Sat, 14 Dec',
    time: '06:30 PM',
    price: 1999,
    image: '/assets/images/live-events-bg.jpg',
    badge: 'Selling Fast',
    description:
      'An unforgettable open-air symphonic night featuring India’s most celebrated playback voice with a 40-piece live orchestra.',
  },
  {
    id: 'sunburn-arena',
    title: 'Sunburn Arena: Electronic Nights',
    category: 'Concerts',
    venue: 'HITEX Exhibition Grounds',
    city: 'Hyderabad',
    date: 'Sun, 22 Dec',
    time: '05:00 PM',
    price: 1499,
    image: '/assets/images/live-events-bg.jpg',
    badge: 'VIP Fan Pit',
    description:
      'High-energy festival stage production with synchronized laser choreography, pyrotechnics, and headline electronic DJs.',
  },
  {
    id: 'zakir-khan-tathastu',
    title: 'Zakir Khan: Tathastu Live',
    category: 'Comedy Shows',
    venue: 'Shilpakala Vedika, Madhapur',
    city: 'Hyderabad',
    date: 'Fri, 20 Dec',
    time: '07:30 PM',
    price: 999,
    image: '/assets/images/theatre-amb.jpg',
    badge: 'Few Seats Left',
    description:
      'Storytelling, razor-sharp observational humor, and heartfelt anecdotes from India’s beloved stand-up icon.',
  },
  {
    id: 'hyd-comedy-collective',
    title: 'Hyderabad Midnight Laugh Club',
    category: 'Comedy Shows',
    venue: 'Heart Cup Coffee, Jubilee Hills',
    city: 'Hyderabad',
    date: 'Sat, 21 Dec',
    time: '08:30 PM',
    price: 499,
    image: '/assets/images/theatre-inox.jpg',
    badge: 'Weekend Special',
    description:
      'Five top touring comics deliver fresh crowd-work sets in an intimate acoustic lounge setting.',
  },
  {
    id: 'hyderabad-derby-fc',
    title: 'Deccan Strikers vs Royal Titans',
    category: 'Sports',
    venue: 'Gachibowli Athletic Stadium',
    city: 'Hyderabad',
    date: 'Sun, 15 Dec',
    time: '07:30 PM',
    price: 750,
    image: '/assets/images/theatre-prasads.jpg',
    badge: 'Derby Clash',
    description:
      'Prime-time floodlit football derby featuring official fan zones, live halftime music, and stadium hospitality.',
  },
  {
    id: 'classical-kuchipudi-gala',
    title: 'Nartanam: Kuchipudi & Sitar Gala',
    category: 'Arts & Culture',
    venue: 'Ravindra Bharathi Auditorium',
    city: 'Hyderabad',
    date: 'Sat, 28 Dec',
    time: '06:00 PM',
    price: 600,
    image: '/assets/images/hero-cast.jpg',
    badge: 'Heritage Showcase',
    description:
      'A grand celebration of Telangana and Andhra classical dance, classical percussion, and live ragas.',
  },
];

export const CITIES = ['Hyderabad', 'Bengaluru', 'Mumbai', 'Chennai', 'Delhi NCR'] as const;
export type CityName = (typeof CITIES)[number];
