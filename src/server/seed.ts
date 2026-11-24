import { db } from './db.ts';
import { hashPassword, generateQrToken } from './security.ts';

export function seedDatabaseIfEmpty(): void {
  const movieCount = db.prepare('SELECT COUNT(*) AS c FROM movies').get() as { c: number };
  if (movieCount.c > 0) return;

  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  // 1. Platform Settings
  const insertSetting = db.prepare(
    'INSERT OR IGNORE INTO platform_settings (key, value) VALUES (?, ?)'
  );
  insertSetting.run('free_cancel_hours', '4');
  insertSetting.run('partial_refund_pct', '60');
  insertSetting.run('convenience_fee_pct', '8');
  insertSetting.run('tax_pct', '18');

  // 2. Demo Family & Guest Users (Note: Admin is claimed via ADMIN_PASSCODE env or first-run setup)
  const demoUserPassHash = hashPassword('Key2ShowDemo#2026');
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, mobile, password_hash, role, is_verified, created_at)
    VALUES (?, ?, ?, ?, ?, 'USER', 1, ?)
  `);
  const insertProfile = db.prepare(`
    INSERT INTO user_profiles (user_id, avatar_url, preferred_city, saved_locations_json, saved_payment_methods_json, wishlist_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const demoUsers = [
    {
      id: 'user-father',
      name: 'Ramesh Sharma',
      email: 'ramesh@key2show.demo',
      mobile: '+91 98480 11111',
      city: 'Hyderabad',
      wishlist: '["pushpa-2","kalki-2898"]',
    },
    {
      id: 'user-mother',
      name: 'Lakshmi Sharma',
      email: 'lakshmi@key2show.demo',
      mobile: '+91 98480 22222',
      city: 'Hyderabad',
      wishlist: '["kalki-2898"]',
    },
    {
      id: 'user-daughter',
      name: 'Ananya Sharma',
      email: 'ananya@key2show.demo',
      mobile: '+91 98480 33333',
      city: 'Hyderabad',
      wishlist: '["jawan","fighter"]',
    },
    {
      id: 'user-friend',
      name: 'Arjun Reddy',
      email: 'arjun@key2show.demo',
      mobile: '+91 98480 44444',
      city: 'Bengaluru',
      wishlist: '["devara"]',
    },
  ];

  for (const u of demoUsers) {
    insertUser.run(u.id, u.name, u.email, u.mobile, demoUserPassHash, now);
    insertProfile.run(
      u.id,
      '',
      u.city,
      JSON.stringify(['Hyderabad', 'Bengaluru']),
      JSON.stringify(['UPI (PhonePe / GPay)', 'HDFC Visa •••• 4821']),
      u.wishlist,
      now
    );
  }

  // Companion links for Father -> Mother & Daughter
  const insertLink = db.prepare(`
    INSERT INTO companion_links (id, owner_user_id, companion_name, companion_mobile, companion_user_id, relation, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'VERIFIED', ?)
  `);
  insertLink.run('link-1', 'user-father', 'Lakshmi Sharma', '+91 98480 22222', 'user-mother', 'Mother', now);
  insertLink.run('link-2', 'user-father', 'Ananya Sharma', '+91 98480 33333', 'user-daughter', 'Daughter', now);
  insertLink.run('link-3', 'user-father', 'Arjun Reddy', '+91 98480 44444', 'user-friend', 'Friend', now);

  // 3. Movies + Cast + Crew
  const insertMovie = db.prepare(`
    INSERT INTO movies (
      id, title, subtitle, poster, banner, trailer_url, genre_json, language, duration,
      rating, votes, certification, formats_json, release_date, release_year, base_price,
      featured, published, synopsis, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);
  const insertCast = db.prepare(
    'INSERT INTO movie_cast (id, movie_id, actor_name, role_name) VALUES (?, ?, ?, ?)'
  );
  const insertCrew = db.prepare(
    'INSERT INTO movie_crew (id, movie_id, member_name, department) VALUES (?, ?, ?, ?)'
  );

  const seededMovies = [
    {
      id: 'pushpa-2',
      title: 'Pushpa: The Rule',
      subtitle: 'Part 2',
      poster: '/assets/images/movie-pushpa.jpg',
      banner: '/assets/images/hero-cast.jpg',
      trailer_url: 'https://www.youtube.com/embed/qxbHtcfHq2s',
      genre: ['Action', 'Drama', 'Thriller'],
      language: 'Telugu / Hindi',
      duration: '3h 20m',
      rating: 9.1,
      votes: '412K',
      certification: 'UA',
      formats: ['2D', 'IMAX 2D', 'Dolby Atmos'],
      releaseDate: '2025-12-05',
      year: 2025,
      price: 280,
      featured: 1,
      synopsis:
        'Pushpa Raj expands his red sandalwood syndicate across international borders while facing ruthless opposition from Superintendent Bhanwar Singh Shekhawat.',
      cast: [
        ['Allu Arjun', 'Pushpa Raj'],
        ['Rashmika Mandanna', 'Srivalli'],
        ['Fahadh Faasil', 'SP Bhanwar Singh'],
      ],
      crew: [
        ['Sukumar', 'Director & Writer'],
        ['Devi Sri Prasad', 'Music Composer'],
        ['Miroslaw Kuba Brozek', 'Cinematography'],
      ],
    },
    {
      id: 'kalki-2898',
      title: 'Kalki 2898-AD',
      subtitle: '',
      poster: '/assets/images/movie-kalki.jpg',
      banner: '/assets/images/hero-cast.jpg',
      trailer_url: 'https://www.youtube.com/embed/kQDd1AhGIHk',
      genre: ['Sci-Fi', 'Action', 'Mythology'],
      language: 'Telugu / Hindi',
      duration: '3h 01m',
      rating: 8.9,
      votes: '680K',
      certification: 'UA',
      formats: ['IMAX 3D', '3D', 'Dolby Atmos'],
      releaseDate: '2024-06-27',
      year: 2024,
      price: 320,
      featured: 1,
      synopsis:
        'In a dystopian future set in the sacred city of Kashi, a bounty hunter and an immortal warrior cross paths to protect the arrival of the final avatar.',
      cast: [
        ['Prabhas', 'Bhairava'],
        ['Amitabh Bachchan', 'Ashwatthama'],
        ['Deepika Padukone', 'Sumathi'],
        ['Kamal Haasan', 'Supreme Yaskin'],
      ],
      crew: [
        ['Nag Ashwin', 'Director'],
        ['Santhosh Narayanan', 'Music Composer'],
      ],
    },
    {
      id: 'devara',
      title: 'Devara',
      subtitle: 'Part 1',
      poster: '/assets/images/movie-devara.jpg',
      banner: '/assets/images/hero-cast.jpg',
      trailer_url: 'https://www.youtube.com/embed/5cx7rvMvAWo',
      genre: ['Action', 'Drama'],
      language: 'Telugu / Hindi',
      duration: '2h 58m',
      rating: 8.4,
      votes: '295K',
      certification: 'UA',
      formats: ['2D', 'IMAX 2D', '4DX'],
      releaseDate: '2024-09-27',
      year: 2024,
      price: 260,
      featured: 1,
      synopsis:
        'A fearless guardian of coastal villages takes a stand against smuggling syndicates along the Red Sea, leaving behind a legacy feared across generations.',
      cast: [
        ['Jr. NTR', 'Devara / Vara'],
        ['Janhvi Kapoor', 'Thangam'],
        ['Saif Ali Khan', 'Bhaira'],
      ],
      crew: [
        ['Koratala Siva', 'Director'],
        ['Anirudh Ravichander', 'Music Composer'],
      ],
    },
    {
      id: 'jawan',
      title: 'Jawan',
      subtitle: '',
      poster: '/assets/images/movie-jawan.jpg',
      banner: '/assets/images/hero-cast.jpg',
      trailer_url: 'https://www.youtube.com/embed/COv52Qyctws',
      genre: ['Action', 'Thriller'],
      language: 'Hindi / Telugu',
      duration: '2h 49m',
      rating: 8.7,
      votes: '540K',
      certification: 'UA',
      formats: ['2D', 'IMAX 2D', 'Dolby Atmos'],
      releaseDate: '2024-09-07',
      year: 2024,
      price: 250,
      featured: 1,
      synopsis:
        'A man driven by a personal vendetta sets out to rectify systemic injustices with an elite all-women tactical squad while confronting a powerful arms dealer.',
      cast: [
        ['Shah Rukh Khan', 'Vikram Rathore / Azad'],
        ['Nayanthara', 'Narmada Rai'],
        ['Vijay Sethupathi', 'Kaalee Gaikwad'],
      ],
      crew: [
        ['Atlee', 'Director'],
        ['Anirudh Ravichander', 'Music Composer'],
      ],
    },
    {
      id: 'fighter',
      title: 'Fighter',
      subtitle: '',
      poster: '/assets/images/movie-fighter.jpg',
      banner: '/assets/images/hero-cast.jpg',
      trailer_url: 'https://www.youtube.com/embed/6amIq_jxQA4',
      genre: ['Action', 'Adventure'],
      language: 'Hindi',
      duration: '2h 46m',
      rating: 8.3,
      votes: '238K',
      certification: 'UA',
      formats: ['IMAX 3D', '3D', '4DX'],
      releaseDate: '2024-01-25',
      year: 2024,
      price: 290,
      featured: 1,
      synopsis:
        'Top Indian Air Force aviators unite under the Air Dragons unit to defend the skies and execute high-altitude strike missions against looming threats.',
      cast: [
        ['Hrithik Roshan', 'Sqn Ldr Shamsher Pathania'],
        ['Deepika Padukone', 'Sqn Ldr Minal Rathore'],
        ['Anil Kapoor', 'Gp Capt Rakesh Jai Singh'],
      ],
      crew: [
        ['Siddharth Anand', 'Director'],
        ['Vishal-Shekhar', 'Music Composer'],
      ],
    },
    {
      id: 'tiger-3',
      title: 'Tiger 3',
      subtitle: '',
      poster: '/assets/images/movie-tiger3.jpg',
      banner: '/assets/images/hero-cast.jpg',
      trailer_url: 'https://www.youtube.com/embed/vEjTUDjjU6A',
      genre: ['Action', 'Spy Thriller'],
      language: 'Hindi / Telugu',
      duration: '2h 35m',
      rating: 8.1,
      votes: '310K',
      certification: 'UA',
      formats: ['2D', 'IMAX 2D', 'ICE'],
      releaseDate: '2024-11-12',
      year: 2024,
      price: 240,
      featured: 1,
      synopsis:
        'Veteran RAW operative Tiger and Zoya race across continents to clear their names and stop a rogue intelligence mastermind from destabilizing the region.',
      cast: [
        ['Salman Khan', 'Avinash Singh Rathore'],
        ['Katrina Kaif', 'Zoya'],
        ['Emraan Hashmi', 'Aatish Rehman'],
      ],
      crew: [
        ['Maneesh Sharma', 'Director'],
        ['Pritam', 'Music Composer'],
      ],
    },
    {
      id: 'salaar',
      title: 'Salaar: Cease Fire',
      subtitle: 'Part 1',
      poster: '/assets/images/movie-devara.jpg',
      banner: '/assets/images/hero-cast.jpg',
      trailer_url: 'https://www.youtube.com/embed/bUR_FKt7Iso',
      genre: ['Action', 'Crime'],
      language: 'Telugu / Hindi',
      duration: '2h 55m',
      rating: 8.8,
      votes: '485K',
      certification: 'A',
      formats: ['2D', 'IMAX 2D', 'Dolby Atmos'],
      releaseDate: '2024-12-22',
      year: 2024,
      price: 270,
      featured: 0,
      synopsis:
        'Two childhood friends bound by an unbreakable vow clash inside the brutal walled city-state of Khansaar as tribal succession erupts into war.',
      cast: [
        ['Prabhas', 'Deva'],
        ['Prithviraj Sukumaran', 'Varadha'],
        ['Shruti Haasan', 'Aadhya'],
      ],
      crew: [
        ['Prashanth Neel', 'Director'],
        ['Ravi Basrur', 'Music Composer'],
      ],
    },
    {
      id: 'hanuman',
      title: 'HanuMan',
      subtitle: '',
      poster: '/assets/images/movie-kalki.jpg',
      banner: '/assets/images/hero-cast.jpg',
      trailer_url: 'https://www.youtube.com/embed/Oqvly3MvlXA',
      genre: ['Action', 'Fantasy'],
      language: 'Telugu / Hindi',
      duration: '2h 38m',
      rating: 9.0,
      votes: '390K',
      certification: 'UA',
      formats: ['2D', 'Dolby Atmos'],
      releaseDate: '2024-01-12',
      year: 2024,
      price: 220,
      featured: 0,
      synopsis:
        'An ordinary young man in the remote village of Anjanadri discovers mystical superpowers and rises to protect his people from a mercenary obsessed with superhuman dominance.',
      cast: [
        ['Teja Sajja', 'Hanumanthu'],
        ['Amritha Aiyer', 'Meenakshi'],
      ],
      crew: [
        ['Prasanth Varma', 'Director'],
        ['GowraHari', 'Music Composer'],
      ],
    },
  ];

  for (const m of seededMovies) {
    insertMovie.run(
      m.id,
      m.title,
      m.subtitle,
      m.poster,
      m.banner,
      m.trailer_url,
      JSON.stringify(m.genre),
      m.language,
      m.duration,
      m.rating,
      m.votes,
      m.certification,
      JSON.stringify(m.formats),
      m.releaseDate,
      m.year,
      m.price,
      m.featured,
      m.synopsis,
      now
    );
    m.cast.forEach(([actor, role], i) => {
      insertCast.run(`${m.id}-cast-${i + 1}`, m.id, actor, role);
    });
    m.crew.forEach(([member, dept], i) => {
      insertCrew.run(`${m.id}-crew-${i + 1}`, m.id, member, dept);
    });
  }

  // 4. Theatres + Screens + Master Seat Grid
  const insertTheatre = db.prepare(`
    INSERT INTO theatres (
      id, name, location, city, address, category, rating, image, screens_count,
      formats_json, amenities_json, food_available, lat, lng, featured
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
  `);
  const insertScreen = db.prepare(`
    INSERT INTO screens (id, theatre_id, name, rows_count, cols_count, sound_system, projection)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSeat = db.prepare(`
    INSERT INTO seats (id, screen_id, row_label, seat_number, seat_code, category, price_delta, is_blocked)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seededTheatres = [
    {
      id: 'pvr-next-galleria',
      name: 'PVR Next Galleria',
      location: 'Panjagutta',
      city: 'Hyderabad',
      address: 'Next Galleria Mall, Punjagutta Metro Station, Hyderabad 500082',
      category: 'Multiplex',
      rating: 4.6,
      image: '/assets/images/theatre-pvr.jpg',
      screens: 8,
      formats: ['IMAX 2D', 'Dolby Atmos', 'P[XL]'],
      amenities: ['Valet Parking', 'Gourmet Lounge', 'Wheelchair Access', 'QR Ticket Entry'],
      lat: 17.4256,
      lng: 78.4508,
      featured: 1,
    },
    {
      id: 'inox-gvk-one',
      name: 'INOX',
      location: 'GVK One',
      city: 'Hyderabad',
      address: 'GVK One Mall, Road No. 1, Banjara Hills, Hyderabad 500034',
      category: 'Luxury',
      rating: 4.5,
      image: '/assets/images/theatre-inox.jpg',
      screens: 6,
      formats: ['INSIGNIA', 'Dolby 7.1', '3D'],
      amenities: ['Recliner Seats', 'Cafe Express', 'Covered Parking', 'QR Entry'],
      lat: 17.4192,
      lng: 78.4485,
      featured: 1,
    },
    {
      id: 'prasads-imax',
      name: 'Prasads IMAX',
      location: 'Necklace Road',
      city: 'Hyderabad',
      address: 'NTR Gardens, Necklace Road, Khairatabad, Hyderabad 500063',
      category: 'IMAX',
      rating: 4.7,
      image: '/assets/images/theatre-prasads.jpg',
      screens: 6,
      formats: ['PCX Large Screen', 'Dolby Atmos', '4K Dual Laser'],
      amenities: ['Giant PCX Screen', 'Food Court', 'Gaming Zone', 'QR Entry'],
      lat: 17.4126,
      lng: 78.4658,
      featured: 1,
    },
    {
      id: 'amb-cinemas',
      name: 'AMB Cinemas',
      location: 'Gachibowli',
      city: 'Hyderabad',
      address: 'Sarath City Capital Mall, Kondapur-Gachibowli, Hyderabad 500084',
      category: 'Premium',
      rating: 4.5,
      image: '/assets/images/theatre-amb.jpg',
      screens: 7,
      formats: ['Laser Projection', 'Dolby Atmos', 'M-Lounge'],
      amenities: ['VIP Lounge', 'Artisan Dining', 'Valet Parking', 'QR Entry'],
      lat: 17.4569,
      lng: 78.3627,
      featured: 1,
    },
    {
      id: 'asian-cinemas',
      name: 'Asian Cinemas',
      location: 'Dilsukhnagar',
      city: 'Hyderabad',
      address: 'Satyam Complex, Main Road, Dilsukhnagar, Hyderabad 500060',
      category: 'Multiplex',
      rating: 4.4,
      image: '/assets/images/theatre-asian.jpg',
      screens: 5,
      formats: ['2K Laser', 'Dolby Atmos', '3D'],
      amenities: ['Value Snacks', 'Metro Access', 'Family Seating', 'QR Entry'],
      lat: 17.3688,
      lng: 78.5247,
      featured: 1,
    },
    {
      id: 'pvr-vega-city',
      name: 'PVR Vega City IMAX',
      location: 'Bannerghatta Road',
      city: 'Bengaluru',
      address: 'Vega City Mall, JP Nagar, Bengaluru 560076',
      category: 'IMAX',
      rating: 4.7,
      image: '/assets/images/theatre-pvr.jpg',
      screens: 12,
      formats: ['IMAX', '4DX', 'Gold Class'],
      amenities: ['IMAX Laser', 'Valet Parking', 'Lounge'],
      lat: 12.9079,
      lng: 77.6011,
      featured: 0,
    },
    {
      id: 'pvr-icon-phoenix',
      name: 'PVR ICON',
      location: 'Lower Parel',
      city: 'Mumbai',
      address: 'High Street Phoenix, Lower Parel, Mumbai 400013',
      category: 'Luxury',
      rating: 4.8,
      image: '/assets/images/theatre-amb.jpg',
      screens: 11,
      formats: ['IMAX', 'LUXE', 'Dolby Atmos'],
      amenities: ['Chef Dining', 'Valet Parking', 'VIP Loungers'],
      lat: 18.9949,
      lng: 72.8253,
      featured: 0,
    },
    {
      id: 'sathyam-cinemas',
      name: 'SPI Sathyam',
      location: 'Royapettah',
      city: 'Chennai',
      address: 'Thiru Vi Ka Road, Royapettah, Chennai 600014',
      category: 'Premium',
      rating: 4.8,
      image: '/assets/images/theatre-prasads.jpg',
      screens: 6,
      formats: ['4K Laser', 'Dolby Atmos'],
      amenities: ['Signature Popcorn', 'QR Entry', 'Parking'],
      lat: 13.0558,
      lng: 80.2584,
      featured: 0,
    },
    {
      id: 'pvr-directors-cut',
      name: 'PVR Director’s Cut',
      location: 'Vasant Kunj',
      city: 'Delhi NCR',
      address: 'Ambience Mall, Vasant Kunj, New Delhi 110070',
      category: 'Luxury',
      rating: 4.7,
      image: '/assets/images/theatre-amb.jpg',
      screens: 7,
      formats: ['Luxury Recliner', 'Dolby Atmos'],
      amenities: ['Butler Service', 'Fine Dining', 'Valet'],
      lat: 28.5416,
      lng: 77.1553,
      featured: 0,
    },
  ];

  const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];
  for (const t of seededTheatres) {
    insertTheatre.run(
      t.id,
      t.name,
      t.location,
      t.city,
      t.address,
      t.category,
      t.rating,
      t.image,
      t.screens,
      JSON.stringify(t.formats),
      JSON.stringify(t.amenities),
      t.lat,
      t.lng,
      t.featured
    );

    const screenConfigs = [
      { id: `${t.id}-scr-1`, name: 'Screen 1 (Dolby Atmos)', sound: 'Dolby Atmos', proj: '4K Laser' },
      { id: `${t.id}-scr-2`, name: 'Screen 2 (IMAX / PCX)', sound: 'IMAX 12-Ch', proj: 'Dual 4K Laser' },
    ];

    for (const sc of screenConfigs) {
      insertScreen.run(sc.id, t.id, sc.name, 6, 10, sc.sound, sc.proj);
      for (const row of ROW_LABELS) {
        for (let num = 1; num <= 10; num++) {
          const seatCode = `${row}${num}`;
          let category = 'STANDARD';
          let delta = 0;
          if (row === 'F') {
            category = num >= 3 && num <= 8 ? 'RECLINER' : 'COUPLE';
            delta = num >= 3 && num <= 8 ? 180 : 140;
          } else if (row === 'D' || row === 'E') {
            category = 'PREMIUM';
            delta = 70;
          } else if (row === 'A' && num === 1) {
            category = 'DISABLED';
            delta = 0;
          }
          insertSeat.run(
            `${sc.id}-${seatCode}`,
            sc.id,
            row,
            num,
            seatCode,
            category,
            delta,
            0
          );
        }
      }
    }
  }

  // 5. Shows + Show Seats
  const insertShow = db.prepare(`
    INSERT INTO shows (id, movie_id, theatre_id, screen_id, show_date, show_time, time_slot, format, base_price, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
  `);
  const insertShowSeat = db.prepare(`
    INSERT INTO show_seats (id, show_id, seat_code, category, price, status, locked_by_user_id, lock_expires_at, booking_id)
    VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?)
  `);

  const showTemplates = [
    { time: '10:30 AM', slot: 'Morning', formatIdx: 0, screenIdx: 1 },
    { time: '02:00 PM', slot: 'Afternoon', formatIdx: 1, screenIdx: 2 },
    { time: '06:30 PM', slot: 'Evening', formatIdx: 1, screenIdx: 2 },
    { time: '09:45 PM', slot: 'Night', formatIdx: 0, screenIdx: 1 },
  ];

  const createdShows: { id: string; movieId: string; theatreId: string; screenId: string; date: string; time: string; format: string; basePrice: number }[] = [];

  for (const movie of seededMovies.slice(0, 6)) {
    for (const theatre of seededTheatres.slice(0, 5)) {
      for (const d of [today, tomorrow]) {
        const tmpl = showTemplates[(seededMovies.indexOf(movie) + seededTheatres.indexOf(theatre)) % showTemplates.length];
        const showId = `show-${movie.id}-${theatre.id}-${d}-${tmpl.slot.toLowerCase()}`;
        const screenId = `${theatre.id}-scr-${tmpl.screenIdx}`;
        const fmt = movie.formats[tmpl.formatIdx % movie.formats.length] ?? '2D';
        insertShow.run(
          showId,
          movie.id,
          theatre.id,
          screenId,
          d,
          tmpl.time,
          tmpl.slot,
          fmt,
          movie.price
        );
        createdShows.push({
          id: showId,
          movieId: movie.id,
          theatreId: theatre.id,
          screenId,
          date: d,
          time: tmpl.time,
          format: fmt,
          basePrice: movie.price,
        });
      }
    }
  }

  // Also ensure evening 7:30 PM Pushpa 2 show at PVR Next Galleria exists for deterministic testing & demo booking
  const flagshipShowId = `show-pushpa-2-pvr-next-galleria-${today}-prime`;
  insertShow.run(
    flagshipShowId,
    'pushpa-2',
    'pvr-next-galleria',
    'pvr-next-galleria-scr-2',
    today,
    '07:30 PM',
    'Evening',
    'IMAX 2D',
    350
  );
  createdShows.push({
    id: flagshipShowId,
    movieId: 'pushpa-2',
    theatreId: 'pvr-next-galleria',
    screenId: 'pvr-next-galleria-scr-2',
    date: today,
    time: '07:30 PM',
    format: 'IMAX 2D',
    basePrice: 350,
  });

  // Add city shows for Bengaluru / Mumbai / Chennai / Delhi NCR
  for (const t of seededTheatres.slice(5)) {
    const showId = `show-pushpa-2-${t.id}-${today}-evening`;
    insertShow.run(
      showId,
      'pushpa-2',
      t.id,
      `${t.id}-scr-1`,
      today,
      '07:15 PM',
      'Evening',
      'Dolby Atmos',
      320
    );
    createdShows.push({
      id: showId,
      movieId: 'pushpa-2',
      theatreId: t.id,
      screenId: `${t.id}-scr-1`,
      date: today,
      time: '07:15 PM',
      format: 'Dolby Atmos',
      basePrice: 320,
    });
  }

  // Populate show_seats for all shows
  const selectScreenSeats = db.prepare(
    'SELECT seat_code, category, price_delta, is_blocked FROM seats WHERE screen_id = ?'
  );
  const preBooked = new Set(['C4', 'C5', 'B7', 'B8']);
  for (const sh of createdShows) {
    const screenSeats = selectScreenSeats.all(sh.screenId) as {
      seat_code: string;
      category: string;
      price_delta: number;
      is_blocked: number;
    }[];
    for (const s of screenSeats) {
      const isFlagshipFamilySeat =
        sh.id === flagshipShowId && ['D7', 'D8', 'D9', 'D10'].includes(s.seat_code);
      const isOccupied =
        preBooked.has(s.seat_code) ||
        (sh.id === flagshipShowId && ['D7', 'D8', 'D9', 'D10'].includes(s.seat_code));
      const status = s.is_blocked
        ? 'UNAVAILABLE'
        : isOccupied
          ? 'BOOKED'
          : 'AVAILABLE';
      insertShowSeat.run(
        `${sh.id}-${s.seat_code}`,
        sh.id,
        s.seat_code,
        s.category,
        sh.basePrice + s.price_delta,
        status,
        isFlagshipFamilySeat ? 'booking-demo-family' : null
      );
    }
  }

  // 6. Seed Food & Beverages
  const insertFood = db.prepare(`
    INSERT INTO food_items (id, name, category, description, price, image, is_combo, is_veg, available)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  const foodCatalog = [
    ['food-caramel-popcorn', 'Tub Caramel Popcorn', 'Popcorn', 'Large freshly popped gourmet caramel & butter popcorn tub.', 260, '/assets/images/theatre-pvr.jpg', 0, 1],
    ['food-cheese-popcorn', 'Cheddar Cheese Popcorn', 'Popcorn', 'Savory warm white-cheddar dusted cinema popcorn.', 240, '/assets/images/theatre-inox.jpg', 0, 1],
    ['food-pepsi-large', 'Pepsi Fountain (600ml)', 'Drinks', 'Chilled fountain Pepsi served with ice.', 140, '/assets/images/theatre-amb.jpg', 0, 1],
    ['food-coke-zero', 'Coca-Cola Zero (500ml)', 'Drinks', 'Crisp chilled Coca-Cola Zero Sugar.', 150, '/assets/images/theatre-asian.jpg', 0, 1],
    ['food-water', 'Mineral Water (750ml)', 'Drinks', 'Chilled Himalayan packaged drinking water.', 60, '/assets/images/theatre-prasads.jpg', 0, 1],
    ['food-nachos', 'Loaded Jalapeño Nachos', 'Snacks', 'Crispy corn tortillas with warm cheese dip & salsa.', 220, '/assets/images/theatre-pvr.jpg', 0, 1],
    ['food-burger', 'Crispy Peri-Peri Burger', 'Burgers', 'Toasted brioche bun with spicy peri-peri patty & slaw.', 250, '/assets/images/theatre-amb.jpg', 0, 1],
    ['food-sandwich', 'Grilled Paneer Tikka Sandwich', 'Sandwiches', 'Multigrain grilled sandwich with smoky tandoori paneer.', 210, '/assets/images/theatre-inox.jpg', 0, 1],
    ['food-pizza', 'Margherita Artisan Slice Box', 'Pizza', 'Stone-baked mozzarella & basil personal pan pizza.', 310, '/assets/images/theatre-prasads.jpg', 0, 1],
    ['food-brownie', 'Warm Belgian Chocolate Brownie', 'Desserts', 'Rich fudgy dark-chocolate brownie square.', 180, '/assets/images/theatre-amb.jpg', 0, 1],
    ['food-family-combo', 'Family Blockbuster Combo', 'Combos', '2 Large Tub Popcorns + 4 Chilled Drinks + Loaded Nachos.', 790, '/assets/images/theatre-prasads.jpg', 1, 1],
    ['food-couple-combo', 'Couple Classic Combo', 'Combos', '1 Large Butter Popcorn + 2 Chilled Beverages.', 450, '/assets/images/theatre-pvr.jpg', 1, 1],
  ] as const;

  for (const f of foodCatalog) {
    insertFood.run(...f);
  }

  // 7. Seed Coupons & Offers
  const insertCoupon = db.prepare(`
    INSERT INTO coupons (id, code, title, discount_type, discount_value, min_amount, max_discount, expiry_date, applicable_movie_id, applicable_theatre_id, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 1)
  `);
  insertCoupon.run('coup-1', 'KEY2SHOW100', 'Flat ₹100 Off Blockbusters', 'FLAT', 100, 400, 100, '2027-12-31');
  insertCoupon.run('coup-2', 'FIRST20', '20% Off First Booking', 'PERCENT', 20, 300, 200, '2027-12-31');
  insertCoupon.run('coup-3', 'FAMILY150', '₹150 Off Family Bookings (3+ Seats)', 'FLAT', 150, 900, 150, '2027-12-31');
  insertCoupon.run('coup-4', 'EXPIRED50', 'Expired Seasonal Promo', 'FLAT', 50, 200, 50, '2024-01-01');

  const insertOffer = db.prepare(`
    INSERT INTO offers (id, title, code, description, badge, valid_till, active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);
  insertOffer.run('off-1', 'Flat ₹100 Off on All Movies', 'KEY2SHOW100', 'Applicable on minimum order of ₹400 across all formats.', 'Popular', '31 Dec 2027');
  insertOffer.run('off-2', '20% Instant Savings', 'FIRST20', 'Save up to ₹200 on movies & live events.', 'New Users', '31 Dec 2027');
  insertOffer.run('off-3', 'Family Group Bonus ₹150 Off', 'FAMILY150', 'Valid on group bookings above ₹900 with companion tickets.', 'Family', '31 Dec 2027');

  // 8. Seed Events + Tiers
  const insertEvent = db.prepare(`
    INSERT INTO events (id, title, category, venue, city, event_date, event_time, price, image, badge, description, published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  const insertEventTier = db.prepare(`
    INSERT INTO event_tickets (id, event_id, tier_name, price, total_qty, sold_qty)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const seededEvents = [
    ['arijit-hyderabad', 'Arijit Singh Live in Concert', 'Concerts', 'GMR Arena, Shamshabad', 'Hyderabad', 'Sat, 14 Dec', '06:30 PM', 1999, '/assets/images/live-events-bg.jpg', 'Selling Fast', 'An unforgettable open-air symphonic night featuring India’s most celebrated playback voice with a 40-piece live orchestra.'],
    ['sunburn-arena', 'Sunburn Arena: Electronic Nights', 'Concerts', 'HITEX Exhibition Grounds', 'Hyderabad', 'Sun, 22 Dec', '05:00 PM', 1499, '/assets/images/live-events-bg.jpg', 'VIP Fan Pit', 'High-energy festival stage production with synchronized laser choreography, pyrotechnics, and headline electronic DJs.'],
    ['zakir-khan-tathastu', 'Zakir Khan: Tathastu Live', 'Comedy Shows', 'Shilpakala Vedika, Madhapur', 'Hyderabad', 'Fri, 20 Dec', '07:30 PM', 999, '/assets/images/theatre-amb.jpg', 'Few Seats Left', 'Storytelling, razor-sharp observational humor, and heartfelt anecdotes from India’s beloved stand-up icon.'],
    ['hyd-comedy-collective', 'Hyderabad Midnight Laugh Club', 'Comedy Shows', 'Heart Cup Coffee, Jubilee Hills', 'Hyderabad', 'Sat, 21 Dec', '08:30 PM', 499, '/assets/images/theatre-inox.jpg', 'Weekend Special', 'Five top touring comics deliver fresh crowd-work sets in an intimate acoustic lounge setting.'],
    ['hyderabad-derby-fc', 'Deccan Strikers vs Royal Titans', 'Sports', 'Gachibowli Athletic Stadium', 'Hyderabad', 'Sun, 15 Dec', '07:30 PM', 750, '/assets/images/theatre-prasads.jpg', 'Derby Clash', 'Prime-time floodlit football derby featuring official fan zones, live halftime music, and stadium hospitality.'],
    ['classical-kuchipudi-gala', 'Nartanam: Kuchipudi & Sitar Gala', 'Arts & Culture', 'Ravindra Bharathi Auditorium', 'Hyderabad', 'Sat, 28 Dec', '06:00 PM', 600, '/assets/images/hero-cast.jpg', 'Heritage Showcase', 'A grand celebration of Telangana and Andhra classical dance, classical percussion, and live ragas.'],
  ] as const;

  for (const ev of seededEvents) {
    insertEvent.run(...ev);
    insertEventTier.run(`${ev[0]}-silver`, ev[0], 'Silver Access', ev[7], 300, 124);
    insertEventTier.run(`${ev[0]}-gold`, ev[0], 'Gold Lounge', ev[7] + 1000, 150, 72);
    insertEventTier.run(`${ev[0]}-vip`, ev[0], 'VIP Fan Pit', ev[7] + 2500, 60, 41);
  }

  // 9. Seed Sample Family Booking with ONE SINGLE BOOKING QR shared with verified companions
  const bookingId = 'booking-demo-family';
  const singleBookingQr = generateQrToken();
  db.prepare(`
    INSERT INTO bookings (
      id, booking_code, user_id, kind, show_id, event_id, movie_title, theatre_name, screen_name,
      show_date, show_time, format, seats_subtotal, food_subtotal, convenience_fee, taxes, discount,
      total_amount, coupon_code, status, payment_status, qr_token, qr_status, is_family_booking, created_at
    ) VALUES (?, ?, ?, 'MOVIE', ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', 'PAID', ?, 'ACTIVE', 1, ?)
  `).run(
    bookingId,
    'K2S-2026-100421',
    'user-father',
    flagshipShowId,
    'Pushpa: The Rule',
    'PVR Next Galleria (Panjagutta)',
    'Screen 2 (IMAX / PCX)',
    today,
    '07:30 PM',
    'IMAX 2D',
    1680,
    790,
    134,
    166,
    150,
    2620,
    'FAMILY150',
    singleBookingQr,
    now
  );

  db.prepare(`
    INSERT INTO payments (id, booking_id, user_id, method, masked_reference, amount, status, transaction_ref, created_at)
    VALUES (?, ?, ?, 'UPI', 'ramesh@okicici', 2620, 'SUCCESS', 'TXN-K2S-998120', ?)
  `).run('pay-demo-1', bookingId, 'user-father', now);

  db.prepare(`
    INSERT INTO food_orders (id, booking_id, user_id, subtotal, taxes, discount, total, status, created_at)
    VALUES (?, ?, ?, 790, 142, 0, 932, 'CONFIRMED', ?)
  `).run('food-order-demo-1', bookingId, 'user-father', now);

  db.prepare(`
    INSERT INTO food_order_items (id, food_order_id, food_item_id, name, quantity, unit_price, total_price)
    VALUES (?, ?, ?, 'Family Blockbuster Combo', 1, 790, 790)
  `).run('foi-demo-1', 'food-order-demo-1', 'food-family-combo');

  const familyParticipants = [
    {
      pid: 'part-demo-1',
      uid: 'user-father',
      name: 'Ramesh Sharma',
      mobile: '+91 98480 11111',
      relation: 'Self',
      seat: 'D7',
      role: 'PRIMARY',
      status: 'VERIFIED',
    },
    {
      pid: 'part-demo-2',
      uid: 'user-mother',
      name: 'Lakshmi Sharma',
      mobile: '+91 98480 22222',
      relation: 'Mother',
      seat: 'D8',
      role: 'COMPANION',
      status: 'VERIFIED',
    },
    {
      pid: 'part-demo-3',
      uid: 'user-daughter',
      name: 'Ananya Sharma',
      mobile: '+91 98480 33333',
      relation: 'Daughter',
      seat: 'D9',
      role: 'COMPANION',
      status: 'VERIFIED',
    },
    {
      pid: 'part-demo-4',
      uid: 'user-friend',
      name: 'Arjun Reddy',
      mobile: '+91 98480 44444',
      relation: 'Friend',
      seat: 'D10',
      role: 'COMPANION',
      status: 'VERIFIED',
    },
  ];

  const insertParticipant = db.prepare(`
    INSERT INTO booking_participants (id, booking_id, user_id, name, mobile, relation, seat_code, role, verification_status, invited_at, verified_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertCompanionAccess = db.prepare(`
    INSERT INTO companion_access (id, booking_id, companion_user_id, companion_name, companion_mobile, relation, verification_status, access_status, invited_at, verified_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'VERIFIED', ?, ?)
  `);

  for (const fp of familyParticipants) {
    insertParticipant.run(
      fp.pid,
      bookingId,
      fp.uid,
      fp.name,
      fp.mobile,
      fp.relation,
      fp.seat,
      fp.role,
      fp.status,
      now,
      now
    );
    if (fp.role === 'COMPANION') {
      insertCompanionAccess.run(
        `ca-${fp.pid}`,
        bookingId,
        fp.uid,
        fp.name,
        fp.mobile,
        fp.relation,
        fp.status,
        now,
        now
      );
    }
  }

  // 10. Reviews & Notifications
  db.prepare(`
    INSERT INTO reviews (id, target_type, target_id, user_id, user_name, rating, comment, created_at)
    VALUES (?, 'MOVIE', 'pushpa-2', 'user-father', 'Ramesh Sharma', 5, 'Mass theatrical experience in IMAX 2D! Sound and climax are electrifying.', ?)
  `).run('rev-1', now);
  db.prepare(`
    INSERT INTO reviews (id, target_type, target_id, user_id, user_name, rating, comment, created_at)
    VALUES (?, 'MOVIE', 'kalki-2898', 'user-daughter', 'Ananya Sharma', 4.8, 'Incredible futuristic world-building on the giant screen.', ?)
  `).run('rev-2', now);

  const insertNotif = db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `);
  insertNotif.run(
    'notif-1',
    'user-mother',
    'TICKET_SHARED',
    'Shared Booking Ready: Pushpa: The Rule',
    'Ramesh Sharma shared booking access (Seats D7, D8, D9, D10) at PVR Next Galleria (07:30 PM) with you.',
    now
  );
  insertNotif.run(
    'notif-2',
    'user-daughter',
    'TICKET_SHARED',
    'Shared Booking Ready: Pushpa: The Rule',
    'Ramesh Sharma shared booking access (Seats D7, D8, D9, D10) at PVR Next Galleria (07:30 PM) with you.',
    now
  );
  insertNotif.run(
    'notif-3',
    'user-father',
    'BOOKING_CONFIRMED',
    'Booking Confirmed: K2S-2026-100421',
    '4 IMAX 2D tickets + Family Blockbuster Combo confirmed with 1 shared booking QR.',
    now
  );
}
