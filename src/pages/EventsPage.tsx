import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Users, Ticket, Heart, Share2, Star, ArrowLeft, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import SEO from "@/components/SEO";
import EventDetailModal from '../components/EventDetailModal';
import { getMockImage } from '@/lib/mockImages';
import { useEvents, fmt } from '@/lib/useFirestore';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  price: number;
  currency: string;
  image: string;
  category: string;
  organizer: string;
  attendees: number;
  maxAttendees: number;
  rating: number;
  reviews: number;
  isFeatured?: boolean;
  tags: string[];
  ownerId: string;
  ticketTypes: { name: string; price: number; quantity: number }[];
  lat?: number;
  lon?: number;
}

const EventsPage = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [likedEvents, setLikedEvents] = useState<Set<string>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: rawEvents, isLoading } = useEvents();

  const events = useMemo(() => {
    if (!rawEvents) return [];
    return rawEvents.map((raw: any) => {
      const tickets = raw.ticketTypes || [];
      const totalMax = tickets.reduce((sum: number, t: any) => sum + (Number(t.quantity) || 0), 0);
      const cover = raw.image || raw.coverImageUrl || (Array.isArray(raw.images) && raw.images[0]) || (Array.isArray(raw.photos) && raw.photos[0]) || getMockImage('Event');
      return {
        id: raw.id,
        title: fmt(raw.title) || 'Untitled Event',
        description: fmt(raw.description) || '',
        date: raw.startDate || raw.startDateTime || '',
        time: raw.startTime || '',
        location: fmt(raw.location || raw.venue || [raw.city, raw.state].filter(Boolean).join(', ')) || 'Location TBA',
        price: tickets.length > 0 ? Number(tickets[0].price) || 0 : Number(raw.priceNum) || 0,
        currency: 'NGN',
        image: cover,
        category: raw.tags?.[0] || raw.category || raw.eventType || 'General',
        organizer: '',
        attendees: 0,
        maxAttendees: totalMax,
        rating: raw.rating || 0,
        reviews: 0,
        tags: raw.tags || [],
        ownerId: raw.ownerId || '',
        ticketTypes: tickets.map((t: any) => ({ name: t.name || 'General', price: Number(t.price) || 0, quantity: Number(t.quantity) || 0 })),
        lat: raw.lat,
        lon: raw.lon,
      };
    });
  }, [rawEvents]);

  const categories = ['All', 'Food & Drink', 'Technology', 'Music & Entertainment', 'Arts & Culture', 'Business', 'Sports & Recreation', 'General'];

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesCategory = selectedCategory === 'All' || event.category === selectedCategory;
      const matchesSearch = searchTerm.trim() === '' ||
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [events, selectedCategory, searchTerm]);

  const handleLikeEvent = (eventId: string) => {
    setLikedEvents(prev => {
      const newLikes = new Set(prev);
      newLikes.has(eventId) ? newLikes.delete(eventId) : newLikes.add(eventId);
      return newLikes;
    });
  };

  const handleViewEvent = (event: Event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleShareEvent = (event: Event) => {
    if (navigator.share) {
      navigator.share({ title: event.title, text: event.description, url: window.location.origin + `/events/${event.id}` });
    } else {
      navigator.clipboard.writeText(`${event.title} - ${window.location.origin}/events/${event.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Events | CitivasNG"
        description="Discover the best events happening in Lagos & Port Harcourt."
        keywords={["events", "Nigeria", "parties", "concerts", "gatherings"]}
        canonicalUrl={`${window.location.origin}/events`}
      />

      <div className="bg-gradient-to-br from-primary via-primary to-primary/80 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button variant="ghost" className="text-white hover:bg-white/20 mb-4 -ml-2" onClick={() => navigate('/explore')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Calendar className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-display font-extrabold">Events</h1>
                <p className="text-white/80 mt-1">Discover amazing events happening around you</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/30 rounded-xl font-bold"
                onClick={() => navigate('/host-an-event')}
              >
                Host an Event
              </Button>
              <Button
                className="bg-white text-primary hover:bg-white/90 rounded-xl font-bold shadow-md"
                onClick={() => navigate('/profile/dashboard?tab=events&action=create&type=event')}
              >
                <Plus className="w-4 h-4 mr-1.5" /> Create Event
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input type="text" placeholder="Search events..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-wrap justify-center gap-2 mb-12">
          {categories.map((category) => (
            <Button key={category} variant={selectedCategory === category ? "default" : "outline"} onClick={() => setSelectedCategory(category)}
              className={`rounded-full ${selectedCategory === category ? 'bg-primary text-white' : 'hover:border-primary'}`}>
              {category}
            </Button>
          ))}
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16 bg-card/40 rounded-3xl border border-dashed border-border/70 max-w-lg mx-auto p-8">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-foreground font-bold text-lg mb-1">No events found</p>
            <p className="text-muted-foreground text-sm mb-4">Be the first to create and publish an event in your area!</p>
            <Button
              onClick={() => navigate('/profile/dashboard?tab=events&action=create&type=event')}
              className="rounded-xl font-bold"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Create an Event
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event, index) => (
              <motion.div key={event.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} whileHover={{ y: -4 }}>
                <Card className="group overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer" onClick={() => handleViewEvent(event)}>
                  <div className="relative h-48 overflow-hidden bg-primary/10">
                    <img src={event.image || getMockImage(event.category)} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full">
                      {event.currency} {event.price.toLocaleString()}
                    </div>
                    {event.maxAttendees > 0 && (
                      <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full flex items-center gap-1">
                        <Users className="w-3 h-3" /><span className="text-xs">{event.attendees}/{event.maxAttendees}</span>
                      </div>
                    )}
                  </div>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg mb-2 group-hover:text-primary transition-colors">{event.title}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2"><MapPin className="w-4 h-4" /><span>{event.location}</span></div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" /><span>{event.date ? new Date(event.date).toLocaleDateString() : 'Date TBA'}</span>
                      {event.time && (<><Clock className="w-4 h-4 ml-2" /><span>{event.time}</span></>)}
                    </div>
                    {event.rating > 0 && (<div className="flex items-center gap-1 mt-2"><Star className="w-4 h-4 text-yellow-500 fill-current" /><span className="text-sm font-medium">{event.rating}</span></div>)}
                    {event.tags.length > 0 && (<div className="flex flex-wrap gap-1 mt-2">{event.tags.slice(0, 3).map((tag) => (<Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>))}</div>)}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{event.description || 'No description available'}</p>
                    <div className="flex items-center gap-2">
                      <Button onClick={(e) => { e.stopPropagation(); handleViewEvent(event); }} className="flex-1 bg-primary hover:opacity-90"><Ticket className="w-4 h-4 mr-2" />View Details</Button>
                      <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); handleLikeEvent(event.id); }} className={likedEvents.has(event.id) ? 'text-red-500 border-red-500' : ''}>
                        <Heart className={`w-4 h-4 ${likedEvents.has(event.id) ? 'fill-current' : ''}`} />
                      </Button>
                      <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); handleShareEvent(event); }}><Share2 className="w-4 h-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <EventDetailModal event={selectedEvent} isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedEvent(null); }} />
    </div>
  );
};

export default EventsPage;
