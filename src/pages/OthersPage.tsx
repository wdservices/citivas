import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeBusinessDoc } from "@/lib/normalizeBusiness";
import SearchHeader from "@/components/SearchHeader";
import SEO from "@/components/SEO";
import ListingCard from "@/components/ListingCard";

interface OtherItem {
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
}

const OthersPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState<OtherItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const q = query(collection(db, "businesses"));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs
          .map(doc => normalizeBusinessDoc(doc.id, doc.data()))
          .filter((d: any) => d.category === "Other" || d.category === "Business Services") as OtherItem[];
        setItems(data);
      } catch (err) {
        setError("Failed to fetch items.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  const filtered = items.filter(item =>
    (item.title?.toLowerCase()?.includes(searchTerm.toLowerCase()) ?? false) ||
    (item.description?.toLowerCase()?.includes(searchTerm.toLowerCase()) ?? false) ||
    (item.category?.toLowerCase()?.includes(searchTerm.toLowerCase()) ?? false)
  );

  const handleClick = (id: string) => {
    navigate(`/others/${id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Others | CitivasNG"
        description="Browse businesses that don't fit common categories. Discover unique services and offerings across Nigeria."
        keywords={["others", "misc", "unique", "Nigeria", "business", "services"]}
        canonicalUrl={`${window.location.origin}/others`}
      />
      <SearchHeader
        title="Others"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        placeholder="Search others..."
      />
      <div className="px-4 py-6">
        {loading && <p className="text-center">Loading...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}
        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((item) => (
                <ListingCard key={item.id} {...item} onClick={() => handleClick(item.id)} />
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No items found matching your search.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OthersPage;