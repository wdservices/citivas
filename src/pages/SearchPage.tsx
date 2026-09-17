import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeBusinessDoc, normalizeListingDoc } from "@/lib/normalizeBusiness";
import SearchHeader from "@/components/SearchHeader";
import SEO from "@/components/SEO";
import ListingCard from "@/components/ListingCard";

interface SearchResultItem {
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
  isOpen?: boolean;
  type: 'business' | 'event' | 'house';
}

const SearchPage = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const initialQuery = params.get("q") || "";
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        console.log("Searching for businesses...");
        const [bizSnap, eventSnap, houseSnap] = await Promise.all([
          getDocs(collection(db, "businesses")),
          getDocs(collection(db, "events")),
          getDocs(collection(db, "house_listings"))
        ]);

        console.log(`Found ${bizSnap.docs.length} businesses, ${eventSnap.docs.length} events, ${houseSnap.docs.length} houses`);

        const businesses = bizSnap.docs.map(doc => {
          const data = doc.data();
          if (data.title?.toLowerCase().includes("bluewaves") || data.businessName?.toLowerCase().includes("bluewaves")) {
            console.log("Found Bluewaves match in Firestore:", data);
          }
          return {
            ...normalizeBusinessDoc(doc.id, data),
            type: 'business'
          };
        }) as SearchResultItem[];

        const events = eventSnap.docs.map(doc => {
          const n = normalizeListingDoc(doc.id, doc.data());
          return {
            ...n,
            category: n.category || 'Events',
            type: 'event',
          };
        }) as SearchResultItem[];

        const houses = houseSnap.docs.map(doc => {
          const n = normalizeListingDoc(doc.id, doc.data());
          return {
            ...n,
            type: 'house',
          };
        }) as SearchResultItem[];

        setResults([...businesses, ...events, ...houses]);
      } catch (err) {
        console.error(err);
        setError("Failed to load search results.");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  useEffect(() => {
    // keep URL in sync with input
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (searchTerm) next.set("q", searchTerm);
      else next.delete("q");
      return next;
    });
  }, [searchTerm, setParams]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return results;
    return results.filter((item) => {
      const fields = [
        item.title,
        item.description,
        item.category,
        item.location || "",
        item.price || "",
        ...(Array.isArray(item.images) ? item.images.join(",") : ""),
        ...(Array.isArray((item as any).tags) ? (item as any).tags.join(",") : ""),
      ]
        .filter(Boolean)
        .map((s) => s.toLowerCase());
      return fields.some((f) => f.includes(q));
    });
  }, [results, searchTerm]);

  const handleClick = (item: SearchResultItem) => {
    if (item.type === 'event') {
      navigate(`/events/${item.id}`);
      return;
    }
    if (item.type === 'house') {
      navigate(`/marketplace/${item.id}`);
      return;
    }
    
    // Original business logic
    const pathMap: Record<string, string> = {
      Restaurant: "restaurants",
      Hotel: "hotels",
      Shopping: "shopping",
      Attraction: "attractions",
      "Fun Places": "fun-places",
      Fun: "fun-places",
      Airbnb: "airbnb",
      Lifestyle: "lifestyle",
      "Spa & Wellness": "lifestyle",
      Event: "events",
      Events: "events",
      "Event Venue": "events",
      Other: "others",
      "Business Services": "others",
    };
    const base = pathMap[item.category] || "others";
    navigate(`/${base}/${item.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title={`Search${searchTerm ? `: ${searchTerm}` : ""} | CitivasNG`}
        description="Search businesses across categories like restaurants, hotels, events, attractions, lifestyle, shopping, and more."
        keywords={["Nigeria", "search", "restaurants", "hotels", "events", "attractions", "lifestyle", "shopping", "tourism"]}
        canonicalUrl={`${window.location.origin}/search${searchTerm ? `?q=${encodeURIComponent(searchTerm)}` : ""}`}
      />
      <SearchHeader
        title="Search"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        placeholder="Search restaurants, hotels, events, attractions..."
      />

      <div className="px-4 py-6">
        {loading && <p className="text-center">Loading results...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}
        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((item) => (
                <ListingCard
                  key={`${item.type}-${item.id}`}
                  id={item.id}
                  title={item.title}
                  description={item.description}
                  image={item.image}
                  category={item.category}
                  rating={item.rating}
                  price={item.price}
                  location={item.location || ""}
                  phone={item.phone}
                  website={item.website}
                  isOpen={item.isOpen}
                  onClick={() => handleClick(item)}
                />
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No results found. Try another search.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SearchPage;