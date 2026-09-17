import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeBusinessDoc } from "@/lib/normalizeBusiness";
import SearchHeader from "@/components/SearchHeader";
import ListingCard from "@/components/ListingCard";

interface Attraction {
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

const AttractionsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAttractions = async () => {
      try {
        const q = query(collection(db, "businesses"));
        const querySnapshot = await getDocs(q);
        const attractionsData = querySnapshot.docs
          .map(doc => normalizeBusinessDoc(doc.id, doc.data()))
          .filter((doc: any) => doc.category === "Attraction") as Attraction[];
        setAttractions(attractionsData);
      } catch (err) {
        setError("Failed to fetch attractions.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAttractions();
  }, []);

  const filteredAttractions = attractions.filter(attraction =>
    (attraction.title?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    (attraction.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    (attraction.category?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  );

  const handleAttractionClick = (attractionId: string) => {
    navigate(`/attractions/${attractionId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <SearchHeader
        title="Attractions"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        placeholder="Search attractions..."
      />
      
      <div className="px-4 py-6">
        {loading && <p className="text-center">Loading attractions...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}
        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAttractions.map((attraction) => (
                <ListingCard
                  key={attraction.id}
                  {...attraction}
                  onClick={() => handleAttractionClick(attraction.id)}
                />
              ))}
            </div>
            
            {filteredAttractions.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No attractions found matching your search.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AttractionsPage;