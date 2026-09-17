import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, collection, getDocs, query, where, addDoc, serverTimestamp, arrayUnion, collectionGroup } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ArrowLeft, Star, MapPin, Phone, Globe, MessageCircle,
  Heart, Share2, Ticket, Loader2, Info, Layers, Clock, PhoneCall,
  MessageSquare, FileText, Send, ShoppingBag, Home, ChevronRight, Mail, Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import SEO from "@/components/SEO";
import { AddressPicker } from "@/components/AddressPicker";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ChatWidget } from "@/components/ChatWidget";
import { BusinessChatInbox } from "@/components/BusinessChatInbox";

type DetailData = {
  title: string;
  description: string;
  image: string;
  images?: string[];
  category: string;
  rating?: number;
  reviews?: number;
  price?: string;
  location?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  lat?: number;
  lon?: number;
  whatsapp?: string;
  latitude?: number;
  longitude?: number;
  features?: string[];
  hours?: string;
  hasTickets?: boolean;
  tags?: string[];
  isOpen?: boolean;
  ownerId?: string;
};

type ReviewData = {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: any;
};

const DetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  // Extract category from path: /others/abc → "others"
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const categorySlug = pathSegments[0] || "";

  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [childProducts, setChildProducts] = useState<any[]>([]);
  const [childProperties, setChildProperties] = useState<any[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [ownerUid, setOwnerUid] = useState<string | null>(null);

  const isOwner = user && ownerUid === user.id;

  useEffect(() => {
    if (!id) return;

    const fetchDetail = async () => {
      setLoading(true);
      try {
        let snap = await getDoc(doc(db, "businesses", id));
        let source: "businesses" | "house_listings" | "property" | "product" | "restaurant" | "event" = "businesses";
        let inspectionData: any = null;
        let inspectionBusinessId: string | null = null;

        if (!snap.exists()) {
          snap = await getDoc(doc(db, "house_listings", id));
          source = "house_listings";
        }
        // Try business subcollections via collectionGroup if still not found (inspection routes)
        if (!snap.exists()) {
          for (const g of ["properties", "products", "restaurants", "events"] as const) {
            try {
              const groupSnap = await getDocs(collectionGroup(db, g));
              const found = groupSnap.docs.find((d) => d.id === id);
              if (found) {
                snap = found as any;
                inspectionData = found.data();
                // Extract businessId from document path: businesses/{bid}/{collection}/{id}
                inspectionBusinessId = found.ref.parent.parent?.id || null;
                source = g === "properties" ? "property" : g === "products" ? "product" : g as any;
                break;
              }
            } catch {}
          }
        }

        if (snap.exists()) {
          const raw = snap.data() as any;

          if (source === "house_listings" && raw.miniSiteActive && raw.title) {
            const slug = raw.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
            navigate(`/property/${slug}`, { replace: true });
            return;
          }

          const resolvedOwnerId = raw.ownerId || raw.userId || raw.uid || '';
          setOwnerUid(resolvedOwnerId || null);
          setData({
            title: raw.title || raw.businessName || "Untitled",
            description: raw.description || "No description provided.",
            image: raw.image || raw.coverImageUrl || raw.imageUrl || raw.logoUrl || (Array.isArray(raw.photos) && raw.photos[0]) || "",
            images: raw.images || (raw.image ? [raw.image] : raw.logoUrl ? [raw.logoUrl] : Array.isArray(raw.photos) ? raw.photos : []),
            category: raw.category || raw.type || categorySlug,
            rating: raw.rating,
            reviews: raw.reviews,
            price: typeof raw.price === "number" ? `₦${raw.price.toLocaleString()}` : raw.price || (typeof raw.priceNum === "number" ? `₦${raw.priceNum.toLocaleString()}` : undefined),
            location: raw.location || raw.address || raw.venue || [raw.city, raw.state].filter(Boolean).join(", "),
            address: raw.address || raw.location || [raw.city, raw.state].filter(Boolean).join(", ") || "Address not provided",
            phone: raw.phone || raw.contactPhone,
            email: raw.email || raw.contactEmail,
            website: raw.website,
            lat: raw.lat,
            lon: raw.lon,
            whatsapp: raw.whatsapp || raw.phone || raw.contactPhone,
            latitude: raw.latitude,
            longitude: raw.longitude,
            features: raw.features || raw.tags || [],
            hours: raw.hours || "9:00 AM - 5:00 PM (Mon-Fri)",
            hasTickets: raw.hasTickets || false,
            tags: raw.tags,
            isOpen: raw.isOpen !== undefined ? raw.isOpen : true,
            ownerId: raw.ownerId || raw.userId || raw.uid,
          });

          if (source === "businesses") {
            try {
              const [prodSnap, propSnap, restaurSnap, eventSnap] = await Promise.all([
                getDocs(collection(db, "businesses", id, "products")),
                getDocs(collection(db, "businesses", id, "properties")),
                getDocs(collection(db, "businesses", id, "restaurants")),
                getDocs(collection(db, "businesses", id, "events")),
              ]);
              setChildProducts(prodSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
              setChildProperties(propSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
              // Restaurants/events children currently not displayed but fetched for future use
            } catch (e) {
              console.error("Error fetching business children (subcollections):", e);
              // Fallback to legacy top-level for backward compat during migration
              try {
                const [prodSnap, propSnap] = await Promise.all([
                  getDocs(query(collection(db, "marketplace"), where("businessId", "==", id))),
                  getDocs(query(collection(db, "house_listings"), where("businessId", "==", id))),
                ]);
                setChildProducts(prodSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
                setChildProperties(propSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
              } catch {}
            }
          }
        } else {
          setData(null);
        }
      } catch (err) {
        console.error("Error fetching detail:", err);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id, categorySlug]);

  // Backfill ownerId if missing (old listings created before chat feature) — businesses only
  useEffect(() => {
    if (!id || !user || ownerUid === user.id) return;
    const backfill = async () => {
      try {
        await updateDoc(doc(db, "businesses", id), { ownerId: user.id });
        setOwnerUid(user.id);
        const chatsSnap = await getDocs(
          query(collection(db, "chats"), where("businessId", "==", id))
        );
        for (const chatDoc of chatsSnap.docs) {
          const chatData = chatDoc.data();
          if (!chatData.participants?.includes(user.id)) {
            await updateDoc(chatDoc.ref, { participants: arrayUnion(user.id) });
          }
        }
      } catch { /* ignore — may be a house_listings doc, not businesses */ }
    };
    if (!ownerUid) backfill();
  }, [id, user, ownerUid]);

  // Fetch child products & properties handled inside fetchDetail for businesses

  useEffect(() => {
    if (!id) return;
    const fetchReviews = async () => {
      try {
        const revQuery = query(collection(db, "reviews"), where("targetId", "==", id));
        const revSnap = await getDocs(revQuery);
        const revs = revSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ReviewData[];
        revs.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setReviews(revs);
      } catch (err) {
        console.error("Error fetching reviews:", err);
      }
    };
    fetchReviews();
  }, [id]);

  const handleSubmitReview = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!reviewComment.trim()) {
      toast({ title: "Please write a review", variant: "destructive" });
      return;
    }
    setSubmittingReview(true);
    try {
      await addDoc(collection(db, "reviews"), {
        targetId: id,
        targetType: "business",
        userId: user.id,
        userName: user.name || user.email || "Anonymous",
        rating: reviewRating,
        comment: reviewComment.trim(),
        createdAt: serverTimestamp(),
      });
      toast({ title: "Review submitted!" });
      setReviewComment("");
      setReviewRating(5);
      const revQuery = query(collection(db, "reviews"), where("targetId", "==", id));
      const revSnap = await getDocs(revQuery);
      const revs = revSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ReviewData[];
      revs.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setReviews(revs);
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to submit review", variant: "destructive" });
    } finally {
      setSubmittingReview(false);
    }
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  const renderValue = (val: any): string => {
    if (val === null || val === undefined) return "";
    if (typeof val === "object") {
      if (val._lat !== undefined && val._long !== undefined) {
        return `${val._lat.toFixed(4)}, ${val._long.toFixed(4)}`;
      }
      return JSON.stringify(val);
    }
    return String(val);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
          <div className="flex items-center px-4 py-4 max-w-7xl mx-auto w-full">
            <Button variant="ghost" size="icon" onClick={() => window.history.length > 2 ? navigate(-1) : navigate('/explore')} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Business not found</h2>
          <p className="text-muted-foreground mb-8 text-lg">This profile may have been removed or doesn't exist.</p>
          <Button onClick={() => window.history.length > 2 ? navigate(-1) : navigate('/explore')} size="lg" className="rounded-xl px-8">Go Back</Button>
        </div>
      </div>
    );
  }

  const mainImage = data.images && data.images.length > 0 ? data.images[0] : data.image;

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-foreground pb-0">
      <SEO
        title={`${renderValue(data.title)} | CitivasNG`}
        description={renderValue(data.description)}
      />

      {/* Mobile Back Button (Floating over Hero) */}
      <div className="lg:hidden absolute top-4 left-4 z-50">
        <Button variant="secondary" size="icon" onClick={() => window.history.length > 2 ? navigate(-1) : navigate('/explore')} className="rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* ── Hero Section (Full-Width Dark) ── */}
      <section className="relative h-[50vh] sm:h-[55vh] md:h-[60vh] w-full bg-black">
        {mainImage ? (
          <img
            src={renderValue(mainImage)}
            alt={renderValue(data.title)}
            className="w-full h-full object-cover opacity-60"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/40">No image available</div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Content over hero */}
        <div className="absolute bottom-0 left-0 w-full p-6 sm:p-10 md:p-14">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {data.isOpen !== undefined && (
                    <span className={`px-3 py-1.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${data.isOpen ? 'bg-white text-black' : 'bg-white/20 text-white'}`}>
                      {data.isOpen ? "Open Now" : "Closed"}
                    </span>
                  )}
                  <span className="px-3 py-1.5 bg-white/10 backdrop-blur-sm text-white text-[10px] font-bold rounded-full border border-white/20 uppercase tracking-wider">
                    {renderValue(data.category)}
                  </span>
                </div>
                <div>
                  <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-tight">
                    {renderValue(data.title)}
                  </h1>
                  <p className="text-white/70 text-base sm:text-lg mt-3 max-w-2xl leading-relaxed">
                    {renderValue(data.description).slice(0, 200)}{renderValue(data.description).length > 200 ? '...' : ''}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 shrink-0">
                <Button
                  variant="outline"
                  className="h-12 px-6 sm:px-8 text-sm font-bold rounded-full gap-2 bg-transparent border-white/30 text-white hover:bg-white/10"
                >
                  <FileText className="w-4 h-4" />
                  Request Quote
                </Button>
                <Button
                  className="h-12 px-6 sm:px-8 text-sm font-bold rounded-full gap-2 bg-white text-black hover:bg-white/90"
                  onClick={() => setChatOpen(true)}
                >
                  <MessageSquare className="w-4 h-4" />
                  Message Business
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Content ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">

          {/* ── Left Column (2/3) ── */}
          <div className="lg:col-span-2 space-y-8">

            {/* About Section */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-black/5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">
                About {renderValue(data.title)}
              </p>
              <div className="text-muted-foreground leading-relaxed text-sm sm:text-base whitespace-pre-wrap">
                {renderValue(data.description).split('\n').map((paragraph, i) => (
                  <p key={i} className={i > 0 ? 'mt-4' : ''}>{paragraph}</p>
                ))}
              </div>
            </div>

            {/* Our Products */}
            {childProducts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Our Products</p>
                  <button className="text-xs font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1">
                    View All <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {childProducts.map((product: any) => (
                    <button
                      key={product.id}
                      onClick={() => navigate(`/listing/product/${product.id}`)}
                      className="bg-white rounded-2xl overflow-hidden border border-black/5 hover:shadow-lg transition-all text-left group"
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-muted">
                        {product.image ? (
                          <img src={product.image} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="w-10 h-10 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{product.category || 'Product'}</p>
                        <p className="font-bold text-sm text-foreground truncate">{product.title}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Available Rooms */}
            {childProperties.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    {childProperties[0]?.propertySubType === 'hotel' ? 'Room Types' : 'Available Rooms'}
                  </p>
                  <button className="text-xs font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1">
                    View All <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {childProperties.map((prop: any) => {
                    const subType = prop.propertySubType;
                    let priceDisplay = '';
                    if (subType === 'hotel' && prop.roomTypes?.length > 0) {
                      const lowest = Math.min(...prop.roomTypes.map((r: any) => r.pricePerNight || 0).filter(Boolean));
                      priceDisplay = lowest ? `from ₦${lowest.toLocaleString()}/night` : '';
                    } else if (subType === 'rent') {
                      priceDisplay = prop.price || (prop.details?.price ? `₦${prop.details.price.toLocaleString()}${prop.details.billingLabel || ''}` : '');
                    } else if (subType === 'land') {
                      priceDisplay = prop.price || (prop.details?.price ? `₦${prop.details.price.toLocaleString()}` : '');
                    } else if (subType === 'commercial') {
                      priceDisplay = prop.price || (prop.details?.price ? `₦${prop.details.price.toLocaleString()}${prop.details.billingLabel || ''}` : '');
                    } else {
                      priceDisplay = prop.price || (prop.pricePerNight ? `₦${prop.pricePerNight.toLocaleString()}/night` : '');
                    }
                    return (
                      <button
                        key={prop.id}
                        onClick={() => navigate(`/listing/property/${prop.id}`)}
                        className="bg-white rounded-2xl overflow-hidden border border-black/5 hover:shadow-lg transition-all text-left group"
                      >
                        <div className="aspect-[4/3] overflow-hidden bg-muted">
                          {prop.image ? (
                            <img src={prop.image} alt={prop.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Home className="w-10 h-10 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                            {prop.propertySubType === 'rent' ? 'For Rent' : prop.propertySubType === 'shortlet' ? 'Short-let' : prop.propertySubType === 'hotel' ? 'Hotel' : prop.propertySubType === 'land' ? 'Land' : prop.propertySubType === 'commercial' ? 'Commercial' : prop.type || prop.propertyType || 'Property'}
                          </p>
                          <p className="font-bold text-sm text-foreground truncate">{prop.title}</p>
                          {priceDisplay && (
                            <p className="text-xs font-bold text-primary mt-1">{priceDisplay}</p>
                          )}
                          {subType === 'rent' && prop.bedrooms > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">{prop.bedrooms} bed · {prop.bathrooms} bath</p>
                          )}
                          {subType === 'land' && prop.details?.plotSize && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">{prop.details.plotSize} {prop.details.sizeUnit}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Features & Tags */}
            {data.features && data.features.length > 0 && (
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-black/5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">Features & Tags</p>
                <div className="flex flex-wrap gap-2">
                  {data.features.map((feature, index) => (
                    <span key={index} className="px-3 py-1.5 rounded-full font-medium text-xs bg-black/5 text-foreground">
                      {renderValue(feature)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Reviews Section ── */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-black/5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: Rating Summary */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">Reviews</p>
                  {avgRating ? (
                    <div className="mb-4">
                      <div className="flex items-baseline gap-3 mb-1">
                        <span className="text-5xl font-extrabold text-foreground">{avgRating}</span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`w-4 h-4 ${s <= Math.round(Number(avgRating)) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">Based on {reviews.length} verified review{reviews.length !== 1 ? 's' : ''}</p>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <span className="text-5xl font-extrabold text-muted-foreground/30">—</span>
                      <p className="text-sm text-muted-foreground mt-2">No reviews yet</p>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {renderValue(data.title)} consistently delivers top-tier service to the community.
                  </p>
                </div>

                {/* Right: Write a Review */}
                <div>
                  <p className="font-bold text-base mb-4">Write a Review</p>
                  <div className="space-y-3">
                    <Input
                      placeholder="Your Name"
                      value={user?.name || user?.email || ""}
                      readOnly
                      className="bg-muted/50"
                    />
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">Rating:</span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button key={s} onClick={() => setReviewRating(s)}>
                            <Star className={`w-5 h-5 transition-colors ${s <= reviewRating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground hover:text-yellow-300"}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <Textarea
                      placeholder="Share your experience with our services..."
                      rows={4}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="resize-none"
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={handleSubmitReview}
                        disabled={submittingReview || !reviewComment.trim()}
                        className="px-8 font-bold rounded-full bg-foreground text-background hover:bg-foreground/90"
                      >
                        {submittingReview ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Post Review
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Existing Reviews */}
              {reviews.length > 0 && (
                <div className="mt-8 pt-8 border-t border-border/50 space-y-4">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {(rev.userName || "A").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-sm text-foreground">{rev.userName}</p>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className={`w-3 h-3 ${s <= (rev.rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{rev.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right Column: Sidebar (1/3) ── */}
          <div className="space-y-6">

            {/* Contact Information (Dark Card) */}
            <div className="bg-[#1A1A1A] text-white rounded-2xl p-6 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 mb-5">Contact Information</p>

              {/* Location */}
              <div className="mb-5">
                <div className="flex items-start gap-3 mb-3">
                  <MapPin className="w-4 h-4 text-white/60 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-0.5">Location</p>
                    <p className="text-sm font-semibold">{renderValue(data.address || data.location)}</p>
                  </div>
                </div>
                {data.lat && data.lon && (
                  <div className="rounded-xl overflow-hidden h-36 bg-white/10">
                    <AddressPicker readOnly initialLat={data.lat} initialLon={data.lon} initialAddress={data.address} />
                  </div>
                )}
              </div>

              {/* Phone */}
              {data.phone && (
                <a href={`tel:${renderValue(data.phone)}`} className="flex items-start gap-3 mb-4 group">
                  <Phone className="w-4 h-4 text-white/60 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-0.5">Phone Number</p>
                    <p className="text-sm font-semibold group-hover:text-primary transition-colors">{renderValue(data.phone)}</p>
                  </div>
                </a>
              )}

              {/* Email */}
              {data.email && (
                <a href={`mailto:${renderValue(data.email)}`} className="flex items-start gap-3 mb-5 group">
                  <Mail className="w-4 h-4 text-white/60 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-0.5">Business Email</p>
                    <p className="text-sm font-semibold group-hover:text-primary transition-colors">{renderValue(data.email)}</p>
                  </div>
                </a>
              )}

              {/* Get Directions */}
              {data.lat && data.lon && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${data.lat},${data.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-3 rounded-full border border-white/20 text-sm font-bold hover:bg-white/10 transition-colors"
                >
                  Get Directions
                </a>
              )}
            </div>

            {/* Business Hours */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-5">Business Hours</p>
              <div className="space-y-0 text-sm">
                <div className="flex justify-between items-center py-3 border-b border-border/50">
                  <span className="text-foreground">Monday - Friday</span>
                  <span className="font-medium text-foreground">{renderValue(data.hours) || '09:00 - 18:00'}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-border/50">
                  <span className="text-foreground">Saturday</span>
                  <span className="font-medium text-foreground">10:00 - 16:00</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-foreground">Sunday</span>
                  <span className="font-medium text-muted-foreground">Closed</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-[#1A1A1A] text-white/50 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs font-bold uppercase tracking-wider text-white/80">{renderValue(data.title)}</p>
            <div className="flex items-center gap-6 text-[11px]">
              <a href="/privacy" className="hover:text-white transition-colors uppercase tracking-wider font-medium">Privacy Policy</a>
              <a href="/terms" className="hover:text-white transition-colors uppercase tracking-wider font-medium">Terms of Service</a>
              <span className="text-white/30">© {new Date().getFullYear()} CitivasNG</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Chat Widget (customer side) ── */}
      {user && !isOwner && (
        <ChatWidget
          businessId={id || ''}
          businessName={data.title}
          businessAvatar={data.image}
          isOpen={chatOpen}
          onOpenChange={setChatOpen}
        />
      )}

      {/* ── Business Chat Inbox (owner side) ── */}
      {isOwner && (
        <BusinessChatInbox
          businessId={id || ''}
          businessAvatar={data.image}
          businessName={data.title}
        />
      )}
    </div>
  );
};

export default DetailPage;