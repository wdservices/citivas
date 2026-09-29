import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import { Sparkles, MapPin, Calendar, Hotel, ShoppingBag, Utensils, ArrowRight, Star, Users, Shield, Heart, MessageCircle, Share2, ThumbsUp, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate, Link } from 'react-router-dom';
import AnimatedRegionTitle from '@/components/AnimatedRegionTitle';
import { useRegion } from '@/contexts/RegionContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import EventsSection from '@/components/EventsSection';
import MiniSiteCard from '@/components/MiniSiteCard';
import { useMiniSites } from '@/hooks/useMiniSites';
import heroCity from '@/assets/hero-cityscape.jpg';
import heroNightlife from '@/assets/hero-nightlife.jpg';
import heroRestaurant from '@/assets/hero-restaurant.jpg';
import heroHotel from '@/assets/hero-hotel.jpg';

const IMAGE_POOL = [
  '/image/img1.jpg', '/image/img2.jpg', '/image/img3.jpg', '/image/img4.jpg',
  '/image/img5.jpg', '/image/img6.jpg', '/image/img7.jpg', '/image/img8.jpg',
  '/image/img9.jpg', '/image/img10.jpg', '/image/img11.jpg', '/image/img12.jpg',
  '/image/img13.jpg', '/image/img14.jpg',
];

const MOSAIC_SLOTS = [
  { initial: heroCity, alt: 'Cityscape', className: 'h-36 sm:h-44 md:h-56 w-full' },
  { initial: heroRestaurant, alt: 'Restaurant', className: 'h-44 sm:h-56 md:h-72 w-full' },
  { initial: heroNightlife, alt: 'Nightlife', className: 'h-44 sm:h-56 md:h-72 w-full' },
  { initial: heroHotel, alt: 'Hotel', className: 'h-36 sm:h-44 md:h-56 w-full' },
];

const MOSAIC_INTERVALS = [10000, 11200, 10600, 11800];

const LandingPage = () => {
  const navigate = useNavigate();
  const { brandName } = useRegion();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const { sites: miniSites } = useMiniSites();
  const staySites = miniSites.filter((s) => s.type !== 'restaurant').slice(0, 6);

  // Lightweight live stats and social feed for fun interactions
  const [activeUsers, setActiveUsers] = useState(52340);
  const [liveCheckins, setLiveCheckins] = useState(132);
  const [reviewsToday, setReviewsToday] = useState(348);

  useEffect(() => {
    const statTimer = setInterval(() => {
      setActiveUsers((p) => p + Math.floor(Math.random() * 4));
      setLiveCheckins((p) => (p + Math.floor(Math.random() * 3)) % 999);
      setReviewsToday((p) => p + Math.floor(Math.random() * 2));
    }, 2600);
    return () => clearInterval(statTimer);
  }, []);

  type SocialEvent = { id: number; name: string; action: string; place: string; x: number; y: number; initials: string };
  const [events, setEvents] = useState<SocialEvent[]>([]);
  const names = ['Ada', 'Uche', 'Chidi', 'Ngozi', 'Kola', 'Tola', 'Ife', 'Bisi'];
  const actions = ['checked in at', 'liked', 'reviewed', 'shared'];
  const places = ['Cafe Noir', 'Eko Hotel', 'Freedom Park', 'Terra Kulture', 'The Backyard', 'Skye Mall'];

  useEffect(() => {
    const feedTimer = setInterval(() => {
      const name = names[Math.floor(Math.random() * names.length)];
      const action = actions[Math.floor(Math.random() * actions.length)];
      const place = places[Math.floor(Math.random() * places.length)];
      const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
      const x = 10 + Math.random() * 80; // percent
      const y = 18 + Math.random() * 55; // percent
      const evt = { id: Date.now(), name, action, place, x, y, initials };
      setEvents((prev) => {
        const next = [...prev, evt];
        return next.slice(-8);
      });
    }, 2800);
    return () => clearInterval(feedTimer);
  }, []);

  // Mosaic image rotation — 4 unique images, one slot changes at a time
  const shuffledStart = useCallback(() => {
    const indices = [...Array(IMAGE_POOL.length).keys()];
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices.slice(0, 4);
  }, []);

  const [mosaicSlots, setMosaicSlots] = useState<number[]>(() => shuffledStart());
  const [mosaicFading, setMosaicFading] = useState([false, false, false, false]);

  const changeMosaicSlot = useCallback((slot: number) => {
    setMosaicFading((prev) => {
      const next = [...prev];
      next[slot] = true;
      return next;
    });
    setTimeout(() => {
      setMosaicSlots((prev) => {
        const used = new Set(prev);
        const available: number[] = [];
        for (let i = 0; i < IMAGE_POOL.length; i++) {
          if (!used.has(i)) available.push(i);
        }
        const next = [...prev];
        next[slot] = available[Math.floor(Math.random() * available.length)];
        return next;
      });
      setMosaicFading((prev) => {
        const next = [...prev];
        next[slot] = false;
        return next;
      });
    }, 800);
  }, []);

  useEffect(() => {
    const timers = MOSAIC_INTERVALS.map((interval, i) =>
      setInterval(() => changeMosaicSlot(i), interval)
    );
    return () => timers.forEach(clearInterval);
  }, [changeMosaicSlot]);

  const features = [
    {
      icon: MapPin,
      title: 'Discover Places',
      description: 'Explore the best hotels, restaurants, and attractions in your area'
    },
    {
      icon: Calendar,
      title: 'Book Events',
      description: 'Find and book tickets to exciting events and experiences'
    },
    {
      icon: ShoppingBag,
      title: 'Shop Local',
      description: 'Support local businesses and discover unique shopping destinations'
    },
    {
      icon: Utensils,
      title: 'Dine Out',
      description: 'Find the perfect restaurant for any occasion or craving'
    }
  ];

  const stats = [
    { icon: Users, value: '50K+', label: 'Active Users' },
    { icon: MapPin, value: '1000+', label: 'Locations' },
    { icon: Star, value: '4.9', label: 'Rating' },
    { icon: Shield, value: '100%', label: 'Secure' }
  ];

  const trendingTags = [
    { label: '#Restaurants', path: '/restaurants' },
    { label: '#Events', path: '/events' },
    { label: '#Hotels', path: '/hotels' },
    { label: '#Attractions', path: '/attractions' },
    { label: '#Lifestyle', path: '/lifestyle' },
    { label: '#Shopping', path: '/shopping' },
    { label: '#FunPlaces', path: '/funplaces' },
  ];

  // Brand-consistent color rotation for the stats band — maps back to the
  // design tokens (primary/accent/success), never arbitrary Tailwind hues.
  const statIconColors = ['text-primary', 'text-accent', 'text-success', 'text-primary-dark'];

  return (
    <div className="min-h-screen relative bg-background text-foreground">
      {/* Light theme global gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-card via-background to-muted/40 -z-20" />
      {/* Hero Section */}
      <section
        className="relative overflow-hidden"
        onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
      >
        {/* Interactive Background: visible grid + parallax blobs + floating particles */}
        <div className="absolute inset-0 -z-10">
          {/* Visible grid texture */}
          <div
            className="absolute inset-0 opacity-[0.10] dark:opacity-[0.12]"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.08) 1px, transparent 1px)',
              backgroundSize: '22px 22px'
            }}
          />
          {/* Parallax gradient blobs */}
          {(() => {
            const cx = typeof window !== 'undefined' ? window.innerWidth / 2 : 0;
            const cy = typeof window !== 'undefined' ? window.innerHeight / 2 : 0;
            const dx = mousePos.x - cx;
            const dy = mousePos.y - cy;
            return (
              <>
                <motion.div
                  className="absolute -top-48 -left-40 w-[40rem] h-[40rem] rounded-full blur-3xl mix-blend-multiply"
                  style={{
                    background:
                      'radial-gradient(circle at center, rgba(217,137,31,0.12) 0%, rgba(217,137,31,0) 60%)'
                  }}
                  animate={{ x: dx * 0.03, y: dy * 0.02 }}
                  transition={{ type: 'spring', stiffness: 30, damping: 20 }}
                />
                <motion.div
                  className="absolute top-20 -right-32 w-[34rem] h-[34rem] rounded-full blur-3xl mix-blend-multiply"
                  style={{
                    background:
                      'radial-gradient(circle at center, rgba(217,66,46,0.10) 0%, rgba(217,66,46,0) 60%)'
                  }}
                  animate={{ x: -dx * 0.02, y: dy * 0.03 }}
                  transition={{ type: 'spring', stiffness: 30, damping: 20 }}
                />
                <motion.div
                  className="absolute bottom-0 left-1/3 w-[28rem] h-[28rem] rounded-full blur-3xl mix-blend-multiply"
                  style={{
                    background:
                      'radial-gradient(circle at center, rgba(20,107,94,0.08) 0%, rgba(20,107,94,0) 60%)'
                  }}
                  animate={{ x: dx * 0.015, y: -dy * 0.02 }}
                  transition={{ type: 'spring', stiffness: 30, damping: 20 }}
                />
              </>
            );
          })()}
          {/* Floating particles (reduced for subtlety) */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(10)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-primary/18"
                initial={{
                  x: typeof window !== 'undefined' ? Math.random() * window.innerWidth : Math.random() * 1200,
                  y: typeof window !== 'undefined' ? Math.random() * window.innerHeight : Math.random() * 800
                }}
                animate={{ y: [null, -120, null], opacity: [0, 1, 0] }}
                transition={{ duration: Math.random() * 5 + 4, repeat: Infinity, delay: Math.random() * 2 }}
              />
            ))}
          </div>
        </div>

        <div className="relative container mx-auto px-4 pt-20 pb-32">
          <motion.nav
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-between items-center mb-20 gap-4"
          >
            {/* Logo on the Left */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <img src="/citivas-logo.png" alt="Citivas Logo" className="h-14 w-14 rounded-xl object-cover" />
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest border-l pl-2 border-border h-5 flex items-center mt-0.5">Concierge</span>
            </div>

            {/* Actions on the Right */}
        <div className="flex items-center gap-2">
        {/* Events Button */}
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            const eventsSection = document.getElementById('events');
            if (eventsSection) {
              eventsSection.scrollIntoView({ behavior: 'smooth' });
            } else {
              navigate('/events');
            }
          }}
          className="flex items-center gap-2 rounded-full border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/10 transition-all duration-200 text-foreground"
        >
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline font-medium">Events</span>
        </Button>
        
        {/* Sign In Button - enhanced visibility */}
        <Button 
          onClick={() => navigate('/auth?force=true')}
          className="rounded-full bg-primary text-white px-6 py-2 hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
        >
          <span className="font-semibold">Sign In</span>
        </Button>
        </div>
          </motion.nav>

          {/* Mobile Search Bar */}
          <div className="md:hidden px-4 pb-6">
            <div className="relative max-w-sm mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search restaurants, events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                  }
                }}
                className="pl-10 pr-4 bg-muted dark:bg-muted border border-border focus:bg-card dark:focus:bg-card focus:border-primary transition-colors rounded-full"
              />
            </div>
          </div>

          {/* Hero Content - two-column layout with details and mosaic */}
          <div className="relative">

            <div className="grid md:grid-cols-2 gap-10 items-center relative z-10">
              {/* Left: Title and details */}
              <div className="max-w-xl text-center md:text-left">
                 <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05 }}
                  className="flex justify-center md:justify-start mb-6"
                >
                  <div className="inline-flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full bg-primary/10 border border-dashed border-primary/40 backdrop-blur-md">
                    <img src="/citivas-logo.png" alt="Citivas Logo" className="h-7 w-7 rounded-lg object-cover" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">Citivas Premium Concierge</span>
                  </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <AnimatedRegionTitle />
                </motion.div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="mt-4 text-lg md:text-xl text-muted-foreground"
                >
                  Discover, book and enjoy the best experiences around you.
                </motion.p>

                {/* Quick value bullets */}
                <motion.ul
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="mt-6 space-y-3"
                >
                  <li className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <span className="text-foreground/90">Handpicked spots near you</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-accent" />
                    <span className="text-foreground/90">Easy booking for events and activities</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-success" />
                    <span className="text-foreground/90">Secure and community‑trusted reviews</span>
                  </li>
                </motion.ul>

                {/* CTA + social stats */}
                <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
                  <Button
                    size="lg"
                    className="text-lg px-8 py-5 rounded-full bg-primary text-white hover:bg-primary/90 shadow-soft"
                    onClick={() => navigate('/auth?force=true')}
                  >
                    Get Started
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">{activeUsers.toLocaleString()} active</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-accent" />
                      <span className="text-muted-foreground">{reviewsToday.toLocaleString()} reviews today</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-success" />
                      <span className="text-muted-foreground">{liveCheckins} live check‑ins</span>
                    </div>
                  </div>
                </div>

                {/* Notifications: stacked list under the Get Started button (no overlap) */}
                <div className="mt-4 w-full max-w-md mx-auto md:mx-0">
                  <AnimatePresence initial={false}>
                    <div className="space-y-2">
                      {events.slice(-3).map((evt) => (
                        <motion.div
                          key={evt.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.25 }}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card/90 dark:bg-card/80 backdrop-blur-sm shadow-soft text-sm"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarFallback>{evt.initials}</AvatarFallback>
                          </Avatar>
                          <span className="text-foreground/90 font-medium">{evt.name}</span>
                          <span className="text-muted-foreground">{evt.action}</span>
                          <span className="text-foreground/90 font-semibold">{evt.place}</span>
                          <Heart className="h-4 w-4 text-accent" />
                        </motion.div>
                      ))}
                    </div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Right: Mosaic gallery */}
              <div className="relative">
                <div className="grid grid-cols-2 grid-rows-2 gap-3">
                  {MOSAIC_SLOTS.map((slot, i) => {
                    const src = IMAGE_POOL[mosaicSlots[i]];
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.15 + i * 0.1 }}
                        className="relative overflow-hidden rounded-2xl shadow-soft"
                      >
                        <img
                          src={src}
                          alt={slot.alt}
                          className={`rounded-2xl object-cover ${slot.className} w-full transition-all duration-1000 ease-in-out ${mosaicFading[i] ? 'opacity-0 scale-[1.02]' : 'opacity-100 scale-100'}`}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Hero Image / Mockup removed for a cleaner, non-card hero */}
        </div>
      </section>

      {/* Features Section — signature "passport stamp" motif.
          Each capability reads like a stamp collected as you move through a city:
          a dashed customs-stamp ring that straightens and locks flat on hover,
          tying the visual language directly back to the "touring" concept. */}
      <section className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mb-20"
          >
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent">What's inside</span>
            <h2 className="font-display text-4xl md:text-5xl font-extrabold tracking-tight mt-3 text-foreground">
              Stamped into every city you visit
            </h2>
            <p className="text-lg text-muted-foreground mt-4">
              Four passes in one app — collect them as you move from Lagos to Abuja to Port Harcourt.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
            {features.map((feature, index) => {
              const rotations = ['-rotate-6', 'rotate-3', '-rotate-3', 'rotate-6'];
              const ring = ['border-primary text-primary', 'border-accent text-accent', 'border-success text-success', 'border-primary-dark text-primary-dark'];
              const [ringBorder, ringText] = ring[index % ring.length].split(' ');
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  whileHover={{ rotate: 0, scale: 1.05 }}
                  className={`group flex flex-col items-center text-center ${rotations[index % rotations.length]} transition-transform duration-300`}
                >
                  <div className={`relative flex items-center justify-center w-24 h-24 rounded-full border-2 border-dashed ${ringBorder}/50 mb-5 group-hover:${ringBorder} transition-colors`}>
                    <div className={`absolute inset-2 rounded-full border ${ringBorder}/20`} />
                    <feature.icon className={`w-8 h-8 ${ringText}`} />
                  </div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-1.5">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-[220px]">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trending Section — departure-board ticker. Continuous horizontal
          motion on a dark ink band reinforces the "touring" concept (a
          departures display) instead of a static row of pills. */}
      <section className="py-16 overflow-hidden bg-foreground text-background dark:bg-card">
        <div className="container mx-auto px-4 mb-8">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary-light">Now boarding</span>
          <h2 className="font-display text-3xl md:text-4xl font-extrabold mt-2">Trending across the city</h2>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-foreground dark:from-card to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-foreground dark:from-card to-transparent z-10 pointer-events-none" />
          <motion.div
            className="flex whitespace-nowrap"
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
          >
            {[...trendingTags, ...trendingTags].map((tag, i) => (
              <button
                key={i}
                onClick={() => navigate(tag.path)}
                className="flex items-center gap-3 px-8 py-3 border-r border-background/15 hover:text-primary-light transition-colors shrink-0"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span className="font-display text-lg font-semibold uppercase tracking-wide">
                  {tag.label.replace('#', '')}
                </span>
              </button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Property & Stays — every shortlet, apartment and hotel listed on
          Citivas, including properties users list themselves. */}
      <section className="py-20 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Property &amp; stays</p>
              <h2 className="font-display text-3xl md:text-4xl font-extrabold text-foreground mt-2">
                Shortlets, apartments &amp; hotels
              </h2>
              <p className="text-muted-foreground mt-2 max-w-xl text-sm md:text-base">
                Verified places to stay across Nigeria — each with its own mini website, photos, rates and direct booking.
              </p>
            </div>
            <Link to="/airbnb" className="hidden sm:inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline">
              See all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {staySites.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {staySites.map((site) => (
                <MiniSiteCard key={site.slug} site={site} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading stays…</p>
          )}

          <div className="mt-6 sm:hidden">
            <Link to="/airbnb" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              See all property &amp; stays <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section — a single editorial band with bold display numbers
          and vertical rules, rather than four identical icon-boxes. */}
      <section className="py-20 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="text-center px-4"
              >
                <div className={`font-display text-4xl md:text-5xl font-extrabold ${statIconColors[index % statIconColors.length]}`}>
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-2 uppercase tracking-wide">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section — flips to the same dark ink band as the ticker above,
          giving the page a light / dark / light rhythm instead of one flat
          gradient wash. Faint dashed stamp rings continue the motif. */}
      <section className="py-28 relative overflow-hidden bg-foreground text-background dark:bg-card">
        <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full border-[3px] border-dashed border-background/10 rotate-12" />
        <div className="absolute -left-10 -bottom-20 w-56 h-56 rounded-full border-[3px] border-dashed border-background/10 -rotate-12" />
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="font-display text-4xl md:text-5xl font-extrabold mb-6">
              Ready to start exploring?
            </h2>
            <p className="text-xl text-background/70 mb-10">
              Join thousands discovering amazing places and experiences across Nigeria.
            </p>
            <Button
              size="lg"
              className="text-lg px-10 py-6 rounded-full bg-primary text-primary-foreground hover:opacity-90 group shadow-soft"
              onClick={() => navigate('/auth?force=true')}
            >
              Create Your Free Account
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Events Section */}
      <EventsSection />

      {/* Footer sitemap */}
      <footer className="border-t border-border bg-card">
        <div className="container mx-auto px-4 py-14">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2 md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <img src="/citivas-logo.png" alt="Citivas" className="w-9 h-9 rounded-lg object-cover" />
                <span className="font-display text-2xl font-extrabold">Citivas</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">Nigeria\u2019s urban concierge. Discover, book and split bills across Lagos, Abuja and Port Harcourt.</p>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Cities</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/nigeria/lagos" className="hover:text-primary">Lagos</Link></li>
                <li><Link to="/nigeria/abuja" className="hover:text-primary">Abuja</Link></li>
                <li><Link to="/nigeria/rivers" className="hover:text-primary">Port Harcourt</Link></li>
                <li><Link to="/nigeria/kano" className="hover:text-primary">Kano (soon)</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/split-it" className="hover:text-primary">Split It</Link></li>
                <li><Link to="/profile/dashboard?tab=events" className="hover:text-primary">Host an event</Link></li>
                <li><Link to="/profile/dashboard?tab=listings" className="hover:text-primary">List your business</Link></li>
                <li><Link to="/blog" className="hover:text-primary">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/privacy" className="hover:text-primary">Privacy</Link></li>
                <li><Link to="/terms" className="hover:text-primary">Terms</Link></li>
                <li><Link to="/docs" className="hover:text-primary">Help Center</Link></li>
                <li><Link to="/contact-support" className="hover:text-primary">Support</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-border flex flex-col md:flex-row justify-between gap-2 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} Citivas. Made in Nigeria.</p>
            <p>Discover. Book. Split. Repeat.</p>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            A product of Bluewaves Technology and Software Development —{" "}
            <a href="https://bwtng.live" target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">
              www.bwtng.live
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
