import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where, collectionGroup } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeBusinessDoc, normalizeListingDoc } from "@/lib/normalizeBusiness";
import SearchHeader from "@/components/SearchHeader";
import ListingCard from "@/components/ListingCard";
import MiniSiteStrip from "@/components/MiniSiteStrip";

interface Hotel {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  rating: number;
  price: string;
  location: string;
  phone: string;
  website: string;
  isOpen: boolean;
  _source?: "business" | "house_listing";
  slug?: string;
}

const HotelsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const [bizSnap, houseSnap, groupSnap] = await Promise.all([
          getDocs(query(collection(db, "businesses"))),
          getDocs(query(collection(db, "house_listings"))),
          getDocs(collectionGroup(db, "properties")).catch(() => ({ docs: [] }) as any),
        ]);

        const bizHotels: Hotel[] = bizSnap.docs
          .map(doc => ({ ...normalizeBusinessDoc(doc.id, doc.data()), _source: "business" as const }))
          .filter((doc: any) => doc.category === "Hotel") as Hotel[];

        const toHotel = (doc: any): Hotel | null => {
          const raw = doc.data ? (doc.data() as any) : doc;
          const n = normalizeListingDoc(doc.id, raw);
          const haystack = `${raw.type || ""} ${raw.propertySubType || ""} ${raw.propertyType || ""} ${n.category} ${n.title}`.toLowerCase();
          // Skip non-stay listings (land, commercial, office)
          if (/\bland\b|\bcommercial\b|\boffice\b/.test(haystack)) return null;
          const slug = (n.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
          return {
            id: n.id,
            title: n.title || "",
            description: n.description || "",
            image: n.image || "",
            category: "Shortlet & Hotel",
            rating: n.rating || 0,
            price: typeof n.price === "string" ? n.price : String(n.price || ""),
            location: n.location || "",
            phone: n.phone || "",
            isOpen: true,
            _source: "house_listing",
            slug,
          } as Hotel;
        };

        const seen = new Set(bizHotels.map((h) => h.id));
        const propHotels: Hotel[] = [];
        for (const doc of [...houseSnap.docs, ...groupSnap.docs]) {
          if (seen.has(doc.id)) continue;
          const h = toHotel(doc);
          if (h) {
            seen.add(doc.id);
            propHotels.push(h);
          }
        }

        setHotels([...bizHotels, ...propHotels]);
      } catch (err) {
        setError("Failed to fetch hotels.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchHotels();
  }, []);

  const filteredHotels = hotels.filter(hotel => {
    const q = searchTerm.toLowerCase();
    return (
      (hotel.title?.toLowerCase().includes(q) ?? false) ||
      (hotel.description?.toLowerCase().includes(q) ?? false) ||
      (hotel.category?.toLowerCase().includes(q) ?? false)
    );
  });

  const handleHotelClick = (hotel: Hotel) => {
    if (hotel._source === "house_listing" && hotel.slug) {
      navigate(`/property/${hotel.slug}`);
      return;
    }
    navigate(`/hotels/${hotel.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <SearchHeader
        title="Hotels"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        placeholder="Search hotels..."
      />
      
      <div className="px-4 py-6">
        {loading && <p className="text-center">Loading hotels...</p>}
        {error && <p className="text-center text-destructive">{error}</p>}
        {!loading && !error && (
          <>
            <MiniSiteStrip types={["hotel", "shortlet"]} title="Hotels & shortlets with their own storefront" subtitle="Browse rooms, rates and photos, then reserve in one tap." />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredHotels.map((hotel) => (
                <ListingCard
                  key={hotel.id}
                  {...hotel}
                  onClick={() => handleHotelClick(hotel)}
                />
              ))}
            </div>
            
            {filteredHotels.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No hotels found matching your search.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HotelsPage;