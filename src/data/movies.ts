export interface Movie {
  id: string;
  title: string;
  subtitle?: string;
  poster: string;
  genre: string[];
  language: string;
  duration: string;
  rating: number;
  votes: string;
  certification: string;
  formats: string[];
  releaseYear: number;
  basePrice: number;
  featured: boolean;
  synopsis: string;
  cast: string[];
  director: string;
}

export const MOVIES: Movie[] = [
  {
    id: 'pushpa-2',
    title: 'Pushpa: The Rule',
    subtitle: 'Part 2',
    poster: '/assets/images/movie-pushpa.jpg',
    genre: ['Action', 'Drama', 'Thriller'],
    language: 'Telugu / Hindi',
    duration: '3h 20m',
    rating: 9.1,
    votes: '412K',
    certification: 'UA',
    formats: ['2D', 'IMAX 2D', 'Dolby Atmos'],
    releaseYear: 2025,
    basePrice: 280,
    featured: true,
    synopsis:
      'Pushpa Raj expands his red sandalwood syndicate across international borders while facing ruthless opposition from Superintendent Bhanwar Singh Shekhawat.',
    cast: ['Allu Arjun', 'Rashmika Mandanna', 'Fahadh Faasil'],
    director: 'Sukumar',
  },
  {
    id: 'kalki-2898',
    title: 'Kalki 2898-AD',
    poster: '/assets/images/movie-kalki.jpg',
    genre: ['Sci-Fi', 'Action', 'Mythology'],
    language: 'Telugu / Hindi',
    duration: '3h 01m',
    rating: 8.9,
    votes: '680K',
    certification: 'UA',
    formats: ['IMAX 3D', '3D', 'Dolby Atmos'],
    releaseYear: 2024,
    basePrice: 320,
    featured: true,
    synopsis:
      'In a dystopian future set in the sacred city of Kashi, a bounty hunter and an immortal warrior cross paths to protect the arrival of the final avatar.',
    cast: ['Prabhas', 'Amitabh Bachchan', 'Deepika Padukone', 'Kamal Haasan'],
    director: 'Nag Ashwin',
  },
  {
    id: 'devara',
    title: 'Devara',
    subtitle: 'Part 1',
    poster: '/assets/images/movie-devara.jpg',
    genre: ['Action', 'Drama'],
    language: 'Telugu / Hindi',
    duration: '2h 58m',
    rating: 8.4,
    votes: '295K',
    certification: 'UA',
    formats: ['2D', 'IMAX 2D', '4DX'],
    releaseYear: 2024,
    basePrice: 260,
    featured: true,
    synopsis:
      'A fearless guardian of coastal villages takes a stand against smuggling syndicates along the Red Sea, leaving behind a legacy feared across generations.',
    cast: ['Jr. NTR', 'Janhvi Kapoor', 'Saif Ali Khan'],
    director: 'Koratala Siva',
  },
  {
    id: 'jawan',
    title: 'Jawan',
    poster: '/assets/images/movie-jawan.jpg',
    genre: ['Action', 'Thriller'],
    language: 'Hindi / Telugu',
    duration: '2h 49m',
    rating: 8.7,
    votes: '540K',
    certification: 'UA',
    formats: ['2D', 'IMAX 2D', 'Dolby Atmos'],
    releaseYear: 2024,
    basePrice: 250,
    featured: true,
    synopsis:
      'A man driven by a personal vendetta sets out to rectify systemic injustices with an elite all-women tactical squad while confronting a powerful arms dealer.',
    cast: ['Shah Rukh Khan', 'Nayanthara', 'Vijay Sethupathi'],
    director: 'Atlee',
  },
  {
    id: 'fighter',
    title: 'Fighter',
    poster: '/assets/images/movie-fighter.jpg',
    genre: ['Action', 'Adventure'],
    language: 'Hindi',
    duration: '2h 46m',
    rating: 8.3,
    votes: '238K',
    certification: 'UA',
    formats: ['IMAX 3D', '3D', '4DX'],
    releaseYear: 2024,
    basePrice: 290,
    featured: true,
    synopsis:
      'Top Indian Air Force aviators unite under the Air Dragons unit to defend the skies and execute high-altitude strike missions against looming threats.',
    cast: ['Hrithik Roshan', 'Deepika Padukone', 'Anil Kapoor'],
    director: 'Siddharth Anand',
  },
  {
    id: 'tiger-3',
    title: 'Tiger 3',
    poster: '/assets/images/movie-tiger3.jpg',
    genre: ['Action', 'Spy Thriller'],
    language: 'Hindi / Telugu',
    duration: '2h 35m',
    rating: 8.1,
    votes: '310K',
    certification: 'UA',
    formats: ['2D', 'IMAX 2D', 'ICE'],
    releaseYear: 2024,
    basePrice: 240,
    featured: true,
    synopsis:
      'Veteran RAW operative Tiger and Zoya race across continents to clear their names and stop a rogue intelligence mastermind from destabilizing the region.',
    cast: ['Salman Khan', 'Katrina Kaif', 'Emraan Hashmi'],
    director: 'Manish Sharma',
  },
  {
    id: 'salaar',
    title: 'Salaar: Cease Fire',
    poster: '/assets/images/movie-devara.jpg',
    genre: ['Action', 'Crime'],
    language: 'Telugu / Hindi',
    duration: '2h 55m',
    rating: 8.8,
    votes: '485K',
    certification: 'A',
    formats: ['2D', 'IMAX 2D', 'Dolby Atmos'],
    releaseYear: 2024,
    basePrice: 270,
    featured: false,
    synopsis:
      'Two childhood friends bound by an unbreakable vow clash inside the brutal walled city-state of Khansaar as tribal succession erupts into war.',
    cast: ['Prabhas', 'Prithviraj Sukumaran', 'Shruti Haasan'],
    director: 'Prashanth Neel',
  },
  {
    id: 'hanuman',
    title: 'HanuMan',
    poster: '/assets/images/movie-kalki.jpg',
    genre: ['Action', 'Fantasy'],
    language: 'Telugu / Hindi',
    duration: '2h 38m',
    rating: 9.0,
    votes: '390K',
    certification: 'UA',
    formats: ['2D', 'Dolby Atmos'],
    releaseYear: 2024,
    basePrice: 220,
    featured: false,
    synopsis:
      'An ordinary young man in the remote village of Anjanadri discovers mystical superpowers and rises to protect his people from a mercenary obsessed with superhuman dominance.',
    cast: ['Teja Sajja', 'Amritha Aiyer', 'Varalaxmi Sarathkumar'],
    director: 'Prasanth Varma',
  },
];
