import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeBusinessDoc, normalizeListingDoc, matchesState } from "@/lib/normalizeBusiness";
import { Search, Star, MapPin, ChevronRight, ArrowLeft, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import { getMockImage } from "@/lib/mockImages";
import { useRegion } from "@/contexts/RegionContext";

type BusinessItem = {
  id: string;
  title: string;
  description: string;
  image: string;
  images?: string[];
  category: string;
  rating?: number;
  price?: string;
  location?: string;
  phone?: string;
  website?: string;
  whatsapp?: string;
  isOpen?: boolean;
  tags?: string[];
  _source?: "business" | "house_listing";
  slug?: string;
};

const pathMap: Record<string, string> = {
  Restaurant: "restaurants",
  Hotel: "hotels",
  Shopping: "shopping",
  Attraction: "attractions",
  "Fun Places": "fun-places",
  Airbnb: "airbnb",
  Lifestyle: "lifestyle",
  Event: "events",
  Events: "events",
  Other: "others",
  "Event Venue": "events",
  Entertainment: "fun-places",
  "Spa & Wellness": "lifestyle",
  "Business Services": "others",
};

const categories = [
  "All",
  "Restaurant",
  "Hotel",
  "Shortlet & Hotel",
  "Shopping",
  "Attraction",
  "Fun Places",
  "Lifestyle",
  "Events",
  "Airbnb",
];

const categoryEmojis: Record<string, string> = {
  All: "✨",
  Restaurant: "🍽️",
  Hotel: "🏨",
  "Shortlet & Hotel": "🏡",
  Shopping: "🛍️",
  Attraction: "🎡",
  "Fun Places": "🎉",
  Lifestyle: "💆",
  Events: "🎪",
  Airbnb: "🏠",
};

const AllBusinessesPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [items, setItems] = useState<BusinessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { state } = useRegion();

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const [bizSnap, propSnap] = await Promise.all([
          getDocs(collection(db, "businesses")),
          getDocs(query(collection(db, "house_listings"), where("miniSiteActive", "==", true))),
        ]);

        const bizItems: BusinessItem[] = bizSnap.docs
          .map((doc) => ({ ...normalizeBusinessDoc(doc.id, doc.data()), _source: "business" as const }))
          .filter((item) => matchesState((item as any).state, state))
          .filter((item) => {
            if (item.category === "Event" || item.category === "Events" || item.category === "Event Venue") return false;
            return true;
          });

        const propItems: BusinessItem[] = propSnap.docs
          .filter((doc) => matchesState((doc.data() as any).state, state))
          .map((doc) => {
          const n = normalizeListingDoc(doc.id, doc.data());
          const slug = (n.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
          return {
            id: n.id,
            title: n.title || "",
            description: n.description || "",
            image: n.image || "",
            images: n.images || [],
            category: "Shortlet & Hotel",
            rating: n.rating || 0,
            price: typeof n.price === "string" ? n.price : String(n.price || ""),
            location: n.location || "",
            phone: n.phone || "",
            whatsapp: (doc.data() as any).whatsapp || n.phone || "",
            tags: ["shortlet", "hotel", "property"],
            _source: "house_listing",
            slug,
          };
        });

        setItems([...bizItems, ...propItems]);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch businesses.");
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [state]);

  const filtered = useMemo(() => {
    let result = items;
    if (activeCategory !== "All") {
      result = result.filter((item) => item.category === activeCategory);
    }
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      result = result.filter((item) => {
        const fields = [
          item.title,
          item.description,
          item.category,
          item.location || "",
          item.price || "",
          ...(Array.isArray(item.tags) ? item.tags.join(",") : []),
        ]
          .filter(Boolean)
          .map((s) => s.toLowerCase());
        return fields.some((f) => f.includes(q));
      });
    }
    return result;
  }, [items, searchTerm, activeCategory]);

  const handleClick = (item: BusinessItem) => {
    if (item._source === "house_listing" && item.slug) {
      navigate(`/property/${item.slug}`);
      return;
    }
    const base = pathMap[item.category] || "others";
    navigate(`/${base}/${item.id}`);
  };

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

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="All Businesses | CitivasNG"
        description="Browse all premium business spots in Lagos & Port Harcourt."
        keywords={["all businesses", "Nigeria", "restaurants", "hotels", "shopping", "lifestyle"]}
        canonicalUrl={`${window.location.origin}/businesses`}
      />

      {/* Blue Header */}
      <div className="bg-gradient-to-br from-primary via-primary to-primary/80 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            className="text-white hover:bg-white/20 mb-4 -ml-2"
            onClick={() => navigate('/explore')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Store className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-display font-extrabold">All Businesses</h1>
                <p className="text-white/80 mt-1">Curated premium spots across Nigeria</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Search */}
        <div className="mb-6">
          <div className="flex items-center bg-card/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-border/50 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all shadow-sm max-w-xl">
            <Search className="text-muted-foreground w-5 h-5 mr-3 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, category, or location..."
              className="bg-transparent border-none focus:outline-none focus:ring-0 text-foreground w-full text-base placeholder:text-muted-foreground/70"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="mb-8 overflow-x-auto pb-2 -mx-4 px-4">
          <div className="flex gap-2 min-w-max">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "bg-card border border-border/50 text-muted-foreground hover:bg-card/80 hover:text-foreground"
                }`}
              >
                <span className="text-base">{categoryEmojis[cat]}</span>
                <span>{cat}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card/40 rounded-2xl border border-border/50 overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-muted/60" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-muted/60 rounded w-3/4" />
                  <div className="h-3 bg-muted/40 rounded w-full" />
                  <div className="h-3 bg-muted/40 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-20">
            <p className="text-destructive bg-destructive/10 inline-block px-4 py-2 rounded-lg">{error}</p>
          </div>
        )}

        {/* Grid */}
        {!loading && !error && (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((biz) => (
              <div
                key={biz.id}
                onClick={() => handleClick(biz)}
                className="group bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer"
              >
                {/* Image */}
                <div className="relative aspect-[3/2] overflow-hidden bg-muted">
                  <img
                    src={renderValue(biz.image) || getMockImage(biz.category)}
                    alt={renderValue(biz.title)}
                    className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  {biz.rating != null && biz.rating > 0 && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg">
                      <Star className="text-yellow-400 fill-yellow-400 w-3.5 h-3.5" />
                      <span className="font-bold text-white text-xs">{renderValue(biz.rating)}</span>
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3">
                    <span className={`px-2.5 py-1 font-bold text-[10px] uppercase tracking-wider rounded-full backdrop-blur-sm ${
                      activeCategory === biz.category
                        ? "bg-primary text-primary-foreground"
                        : "bg-white/90 text-foreground"
                    }`}>
                      {renderValue(biz.category || "Business")}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-base font-display font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {renderValue(biz.title)}
                    </h3>
                    {(biz as any).verified || (biz as any).featured ? (
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-dashed border-success/50 text-success">
                        {(biz as any).featured ? "Featured" : "Verified"}
                      </span>
                    ) : biz._source === "house_listing" ? (
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        Mini Site
                      </span>
                    ) : null}
                  </div>

                  <p className="text-muted-foreground text-sm line-clamp-2 mb-3 leading-relaxed">
                    {renderValue(biz.description)}
                  </p>

                  {biz.location && (
                    <div className="flex items-center text-muted-foreground mb-4">
                      <MapPin className="text-primary w-3.5 h-3.5 mr-1.5 shrink-0" />
                      <span className="text-xs line-clamp-1">{renderValue(biz.location)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <span className="text-xs text-muted-foreground/70">View details</span>
                    <ChevronRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Empty State */}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-20 bg-card/30 rounded-2xl border border-border/50 border-dashed">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-muted-foreground text-lg">No businesses found matching your search.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AllBusinessesPage;
