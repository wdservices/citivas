import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Heart, MapPin, ShoppingBag, Car,
  Plus, Grid3X3, List, Monitor, Shirt, Home, Building2, SlidersHorizontal,
  Loader2, Star,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import { useMarketplaceItems, fmt } from "@/lib/useFirestore";
import { normalizeListingDoc } from "@/lib/normalizeBusiness";
import { getMockImage } from "@/lib/mockImages";

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

const PLACEHOLDER_IMG = "/placeholder.svg";

const categories = [
  { id: "all", label: "All Products", icon: ShoppingBag },
  { id: "electronics", label: "Electronics", icon: Monitor },
  { id: "fashion", label: "Fashion", icon: Shirt },
  { id: "home", label: "Home", icon: Home },
  { id: "vehicles", label: "Vehicles", icon: Car },
  { id: "land", label: "Land", icon: Building2 },
  { id: "shortlet & hotel", label: "Shortlet & Hotel", icon: Building2 },
  { id: "for rent", label: "Rent", icon: Building2 },
  { id: "commercial", label: "Commercial", icon: Building2 },
];

const MarketplacePage = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("all");
  const [condition, setCondition] = useState("all");
  const [radius, setRadius] = useState("15km");
  const [search, setSearch] = useState("");
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const { data: rawItems, isLoading } = useMarketplaceItems();

  const marketplaceItems = useMemo(() => {
    if (!rawItems) return [];
    return rawItems.map((raw: any) => {
      const n = normalizeListingDoc(raw.id, raw);
      const isHouse = raw._source === "house_listings";
      const cat = isHouse ? (raw.type || "Property") : String(n.category || "Other");
      return {
        id: n.id,
        title: String(n.title || "Untitled"),
        image: n.image || getMockImage(n.category) || PLACEHOLDER_IMG,
        location: fmt(n.location || [raw.city, raw.state].filter(Boolean).join(", ")),
        price: fmt(n.price) || "Price on request",
        promoPrice: fmt(raw.promoPrice) || "",
        category: cat,
        rating: n.rating || 0,
        createdAt: raw.createdAt,
        _source: isHouse ? "house_listings" : "marketplace",
      };
    });
  }, [rawItems]);

  const toggleLike = (id: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredProducts = useMemo(() => {
    return marketplaceItems.filter((l) => {
      const q = search.trim().toLowerCase();
      const matchSearch = !q || l.title.toLowerCase().includes(q) || l.location.toLowerCase().includes(q);
      const matchCat = activeCategory === "all" || l.category.toLowerCase() === activeCategory;
      return matchSearch && matchCat;
    });
  }, [marketplaceItems, search, activeCategory]);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Marketplace | CitivasNG"
        description="Buy and sell electronics, fashion, vehicles, home goods and more on the CitivasNG marketplace."
        keywords={["marketplace", "buy", "sell", "Nigeria", "electronics", "fashion", "vehicles", "home goods"]}
        canonicalUrl={`${window.location.origin}/marketplace`}
      />

      <div className="max-w-7xl mx-auto flex gap-5 px-4 md:px-6 pt-4">
        {/* ── Sidebar (lg+) ── */}
        <aside className="hidden lg:flex flex-col w-60 shrink-0 sticky top-[72px] h-[calc(100vh-88px)] overflow-y-auto">
          <div className="bg-card/60 dark:bg-card/40 backdrop-blur-sm rounded-2xl p-5 border border-border/50 shadow-card">
            <div className="mb-6">
              <h2 className="font-bold text-lg text-primary mb-0.5">Categories</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Premium Selection</p>
            </div>

            <nav className="flex flex-col gap-1.5 mb-6">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const active = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      active
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground hover:translate-x-0.5"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {cat.label}
                  </button>
                );
              })}
            </nav>

            <div className="border-t border-border/50 pt-5">
              <h3 className="font-semibold text-foreground mb-4">Filters</h3>
              <div className="mb-5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">Condition</label>
                <div className="flex flex-wrap gap-1.5">
                  {["all", "new", "used"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setCondition(c)}
                      className={`px-3 py-1 text-[11px] font-bold rounded-full capitalize transition-colors ${
                        condition === c
                          ? "bg-primary text-primary-foreground"
                          : "bg-accent text-muted-foreground hover:bg-primary/20"
                      }`}
                    >
                      {c === "all" ? "All" : c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-6">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">Radius (KM)</label>
                <div className="flex gap-1.5">
                  {["5km", "15km", "30km"].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRadius(r)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                        radius === r
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border/50 bg-accent text-muted-foreground"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate("/profile/dashboard?tab=listings&action=create&type=product")}
              className="w-full py-3.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Post a Product
            </button>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 pb-24 lg:pb-8 min-w-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Marketplace</h1>
              <p className="text-muted-foreground text-sm md:text-base">
                Discover exclusive listings and find exactly what you need.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <Button
                onClick={() => navigate("/profile/dashboard?tab=listings&action=create&type=product")}
                className="rounded-xl font-bold gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Post a Product
              </Button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className="lg:hidden p-2 bg-card/60 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <SlidersHorizontal className="w-5 h-5" />
                </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg border border-border/50 transition-colors ${
                  viewMode === "grid" ? "bg-card text-foreground" : "bg-card/40 text-muted-foreground opacity-50"
                }`}
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg border border-border/50 transition-colors ${
                  viewMode === "list" ? "bg-card text-foreground" : "bg-card/40 text-muted-foreground opacity-50"
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

          <div className="lg:hidden mb-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search marketplace..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 bg-accent border-border/50 rounded-full"
              />
            </div>
          </div>

          {showMobileFilters && (
            <div className="lg:hidden mb-5 bg-card/60 backdrop-blur-sm rounded-2xl p-4 border border-border/50 animate-fade-in">
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const active = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors ${
                        active ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground"
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-8 h-8 text-primary" />
              </div>
              <p className="text-lg font-semibold text-foreground mb-1">No products found</p>
              <p className="text-sm text-muted-foreground mb-6">Try a different category or search term.</p>
              <button
                onClick={() => navigate("/profile/dashboard?tab=listings&action=create")}
                className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:scale-[1.02] active:scale-95 transition-transform"
              >
                Create a Listing
              </button>
            </div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5"
                  : "flex flex-col gap-4"
              }
            >
              {filteredProducts.map((item, index) => (
                <div
                  key={item.id}
                  className={`group bg-card/60 dark:bg-card/40 backdrop-blur-sm rounded-2xl border border-border/50 hover:border-primary/30 transition-all duration-300 shadow-card animate-fade-in cursor-pointer p-3 ${
                    viewMode === "list" ? "flex" : ""
                  }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={() => navigate(`/marketplace/${item.id}`)}
                >
                  <div className={`relative overflow-hidden rounded-xl ${viewMode === "list" ? "w-32 sm:w-44 shrink-0" : "aspect-[4/3]"}`}>
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleLike(item.id); }}
                      className="absolute top-2.5 right-2.5 w-8 h-8 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:text-destructive transition-colors"
                    >
                      <Heart className={`w-4 h-4 ${likedIds.has(item.id) ? "fill-destructive text-destructive" : ""}`} />
                    </button>
                    {isRecentlyListed(item.createdAt) && (
                      <div className="absolute top-2.5 left-2.5">
                        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider bg-emerald-500 text-white">
                          Just Listed
                        </span>
                      </div>
                    )}
                    {item.badge && (
                      <div className="absolute bottom-2.5 left-2.5">
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={`px-1 pt-3 pb-1 ${viewMode === "list" ? "flex-1 flex flex-col justify-center" : ""}`}>
                    <h3 className="font-semibold text-sm md:text-base text-foreground truncate">{item.title}</h3>
                    <div className="flex items-center gap-1 text-muted-foreground text-xs mt-1.5 mb-2.5">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.promoPrice && Number(item.promoPrice.replace(/[^0-9]/g, '')) < Number(item.price.replace(/[^0-9]/g, '')) ? (
                        <>
                          <span className="font-medium text-sm text-muted-foreground line-through">{item.price}</span>
                          <span className="font-bold text-base text-primary">{item.promoPrice}</span>
                        </>
                      ) : (
                        <span className="font-bold text-base text-accent">{item.price}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* ── Mobile FAB ── */}
      <button
        onClick={() => navigate("/profile/dashboard?tab=listings&action=create")}
        className="fixed bottom-20 right-5 lg:hidden w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-40"
        aria-label="Create a listing"
      >
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
};

export default MarketplacePage;