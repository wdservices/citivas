import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Star, Heart, ArrowRight, Loader2, ChevronRight, Store, Calendar, ShoppingBag, Home } from "lucide-react";
import CategoryGrid from "@/components/CategoryGrid";
import HeroSlider from "@/components/HeroSlider";
import SEO from "@/components/SEO";
import { getMockImage } from "@/lib/mockImages";
import { propertySlug } from "@/content/miniSites";
import { useRegion } from "@/contexts/RegionContext";
import { useBusinesses, useEvents, useMarketplaceItems, useHouseListings, fmt } from "@/lib/useFirestore";
import { normalizeBusinessDoc, normalizeListingDoc } from "@/lib/normalizeBusiness";

function isRecentlyListed(createdAt?: any): boolean {
  if (!createdAt) return false;
  try {
    let ts: number;
    if (typeof createdAt === "string") ts = new Date(createdAt).getTime();
    else if (typeof createdAt === "number") ts = createdAt;
    else if (createdAt?.seconds) ts = createdAt.seconds * 1000;
    else return false;
    if (isNaN(ts)) return false;
    return Date.now() - ts < 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

type ListingItem = {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  rating?: number;
  location?: string;
  price?: string;
  createdAt?: any;
  miniSiteActive?: boolean;
  slug?: string;
};

const PLACEHOLDER_IMG = "/placeholder.svg";

const CategoriesPage = () => {
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { brandName, state } = useRegion();

  const { data: bizData, isLoading: bizLoading } = useBusinesses();
  const { data: mktData, isLoading: mktLoading } = useMarketplaceItems();
  const { data: propData, isLoading: propLoading } = useHouseListings();
  const { data: eventData, isLoading: eventLoading } = useEvents();

  const loading = bizLoading || mktLoading || propLoading || eventLoading;

  const businesses = useMemo(() => {
    if (!bizData) return [];
    return bizData
      .map((b: any) => normalizeBusinessDoc(b.id, b))
      .filter((b: any) => b.category !== "Event" && b.category !== "Events")
      .slice(0, 4)
      .map((b: any) => ({ id: b.id, title: fmt(b.title), description: fmt(b.description), image: b.image || "", category: fmt(b.category), rating: b.rating || 0, location: fmt(b.location), price: fmt(b.price), createdAt: b.createdAt }));
  }, [bizData]);

  const events = useMemo(() => {
    if (!eventData) return [];
    return eventData
      .map((e: any) => normalizeListingDoc(e.id, e))
      .slice(0, 4)
      .map((b: any) => ({ id: b.id, title: fmt(b.title), description: fmt(b.description), image: b.image || "", category: fmt(b.category), rating: b.rating || 0, location: fmt(b.location), price: fmt(b.price), createdAt: b.createdAt }));
  }, [eventData]);

  const isProperty = (cat: unknown) =>
    ["property", "properties", "apartment", "shortlet", "house", "real estate", "stays"].includes(
      String(cat || "").toLowerCase()
    );

  const marketplace = useMemo(() => {
    if (!mktData) return [];
    return mktData
      .map((m: any) => normalizeListingDoc(m.id, m))
      .filter((m: any) => !isProperty(m.category) && !isProperty((m as any).type))
      .slice(0, 4)
      .map((m: any) => ({ id: m.id, title: fmt(m.title), description: fmt(m.description), image: m.image || "", category: fmt(m.category), rating: m.rating || 0, location: fmt(m.location), price: fmt(m.price), createdAt: m.createdAt }));
  }, [mktData]);

  const properties = useMemo(() => {
    const propItems = propData
      ? propData.map((p: any) => {
        const n = normalizeListingDoc(p.id, p);
        return {
          id: n.id,
          title: fmt(n.title),
          description: fmt(n.description),
          image: n.image || "",
          category: fmt(n.category),
          rating: n.rating || 0,
          location: fmt(n.location),
          price: fmt(n.price),
          createdAt: n.createdAt,
          miniSiteActive: (p as any).miniSiteActive || false,
          slug: (n.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, ""),
        };
      })
      : [];
    const mktPropertyItems = mktData
      ? mktData
          .map((m: any) => normalizeListingDoc(m.id, m))
          .filter((m: any) => isProperty(m.category))
          .map((m: any) => ({
            id: m.id,
            title: fmt(m.title),
            description: fmt(m.description),
            image: m.image || "",
            category: fmt(m.category),
            rating: m.rating || 0,
            location: fmt(m.location),
            price: fmt(m.price),
            createdAt: m.createdAt,
            fromMarketplace: true,
          }))
      : [];
    return [...propItems, ...mktPropertyItems].slice(0, 8);
  }, [propData, mktData]);

  const toggleLike = (id: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const bizPathMap: Record<string, string> = {
    Restaurant: "restaurants", Hotel: "hotels", Shopping: "shopping", Attraction: "attractions",
    "Fun Places": "fun-places", Airbnb: "airbnb", Lifestyle: "lifestyle", Other: "others",
    "Event Venue": "events", Entertainment: "fun-places", "Spa & Wellness": "lifestyle", "Business Services": "others",
  };

  const handleBizClick = (item: ListingItem) => navigate(`/${bizPathMap[item.category] || "others"}/${item.id}`);
  const handleEventClick = (item: ListingItem) => navigate(`/events/${item.id}`);
  const handleMktClick = (item: ListingItem) => navigate(`/marketplace/${item.id}`);
  const handlePropClick = (item: ListingItem) => {
    if ((item as any).fromMarketplace) {
      navigate(`/marketplace/${item.id}`);
      return;
    }
    if (item.miniSiteActive && item.slug) {
      navigate(`/property/${item.slug}`);
    } else {
      navigate(`/property/${propertySlug(r(item.title) || "listing", item.id)}`);
    }
  };

  const r = (val: any): string => fmt(val);

  const imgSrc = (item: ListingItem) => r(item.image) || getMockImage(item.category) || PLACEHOLDER_IMG;

  const renderRow = (
    title: string, items: ListingItem[], onCardClick: (item: ListingItem) => void,
    viewAllPath: string, viewAllLabel: string, emptyIcon: React.ReactNode, cardSubtitle?: (item: ListingItem) => React.ReactNode
  ) => (
    <section className="py-6">
      <div className="px-4 md:px-6 mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">{title}</h2>
        {items.length > 0 && (
          <button onClick={() => navigate(viewAllPath)} className="flex items-center gap-2 text-primary font-bold text-sm hover:underline transition-all group shrink-0">
            {viewAllLabel}<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 text-primary animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="px-4 md:px-6">
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
            <div className="flex-shrink-0 w-[280px] bg-muted/40 rounded-2xl border border-border/50 flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">{emptyIcon}</div>
              <p className="text-sm font-semibold text-foreground mb-1">Nothing here yet</p>
              <p className="text-xs text-muted-foreground">Check back soon — new listings drop regularly.</p>
            </div>
          </div>
        </div>
      ) : (
<div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
            {items.map((item, index) => (
              <div key={item.id} className="group flex-shrink-0 w-[280px] snap-start bg-card/60 dark:bg-card/40 backdrop-blur-sm rounded-xl overflow-hidden border border-border/50 hover:border-primary/30 transition-all duration-300 cursor-pointer hover:shadow-md animate-fade-in"
                style={{ animationDelay: `${index * 0.08}s` }} onClick={() => onCardClick(item)}>
                <div className="relative aspect-[3/2] overflow-hidden bg-muted">
                  <img src={imgSrc(item)} alt={r(item.title)} className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-100" />
                <button onClick={(e) => { e.stopPropagation(); toggleLike(item.id); }}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:text-red-400 transition-colors"
                  aria-label={likedIds.has(item.id) ? "Unlike" : "Like"}>
                  <Heart className={`w-4 h-4 ${likedIds.has(item.id) ? "fill-red-500 text-red-500" : ""}`} />
                </button>
                {isRecentlyListed(item.createdAt) && (
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider bg-emerald-500 text-white">
                      Just Listed
                    </span>
                  </div>
                )}
                {item.rating != null && item.rating > 0 && (
                  <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-md px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /><span className="text-[11px] font-bold text-foreground">{r(item.rating)}</span>
                  </div>
                )}
              </div>
              <div className="p-3.5">
                <h3 className="font-semibold text-sm text-foreground truncate">{r(item.title)}</h3>
                {item.location && (<div className="flex items-center gap-1 text-muted-foreground text-xs mt-0.5 mb-1.5"><MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{r(item.location)}</span></div>)}
                {cardSubtitle ? cardSubtitle(item) : <span className="font-bold text-xs text-primary">{r(item.category)}</span>}
              </div>
            </div>
          ))}
          {items.length >= 4 && (
            <button onClick={() => navigate(viewAllPath)}
              className="flex-shrink-0 w-[280px] snap-start bg-muted/30 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 cursor-pointer min-h-[240px]">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"><ChevronRight className="w-6 h-6 text-primary" /></div>
              <span className="font-bold text-sm text-muted-foreground">{viewAllLabel}</span>
            </button>
          )}
        </div>
      )}
    </section>
  );

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`Explore ${brandName} | CitivasNG`} description="Discover businesses, events, marketplace, and properties across Nigeria."
        keywords={["Nigeria", "restaurants", "hotels", "events", "marketplace", "properties"]} canonicalUrl={`${window.location.origin}/explore`} ogImage="/favicon.ico" />
      <main className="pb-12">
        <HeroSlider /><CategoryGrid />
        <div className="px-4 md:px-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Discovered in {brandName}</h1>
          <p className="text-muted-foreground text-sm md:text-base mb-6">Top local businesses, events, and experiences near you</p>
        </div>
        {renderRow("Local Businesses", businesses, handleBizClick, "/businesses", "View All Businesses", <Store className="w-6 h-6 text-primary" />)}
        {renderRow("Upcoming Events", events, handleEventClick, "/events", "View All Events", <Calendar className="w-6 h-6 text-primary" />,
          (item) => <span className="font-bold text-xs text-primary">{item.price ? `₦${item.price}` : "Free"}</span>)}
        {renderRow("Marketplace", marketplace, handleMktClick, "/marketplace", "View All Products", <ShoppingBag className="w-6 h-6 text-primary" />,
          (item) => <span className="font-bold text-xs text-primary">{item.price || "Price on request"}</span>)}
        {renderRow("Properties & Stays", properties, handlePropClick, "/airbnb", "View All Properties", <Home className="w-6 h-6 text-primary" />,
          (item) => <span className="font-bold text-xs text-primary">{item.price || "Price on request"}</span>)}
      </main>
    </div>
  );
};

export default CategoriesPage;
