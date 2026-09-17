import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeBusinessDoc } from "@/lib/normalizeBusiness";
import SearchHeader from "@/components/SearchHeader";
import ListingCard from "@/components/ListingCard";

interface LifestylePlace {
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

const LifestylePage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [places, setPlaces] = useState<LifestylePlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLifestylePlaces = async () => {
      try {
        const q = query(collection(db, "businesses"));
        const querySnapshot = await getDocs(q);
        const placesData = querySnapshot.docs
          .map(doc => normalizeBusinessDoc(doc.id, doc.data()))
          .filter((doc: any) => doc.category === "Lifestyle") as LifestylePlace[];
        setPlaces(placesData);
      } catch (err) {
        setError("Failed to fetch lifestyle places.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLifestylePlaces();
  }, []);

  const filteredPlaces = places.filter(place =>
    (place.title?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    (place.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    (place.category?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  );

  const handlePlaceClick = (placeId: string) => {
    navigate(`/lifestyle/${placeId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <SearchHeader
        title="Lifestyle & Wellness"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        placeholder="Search lifestyle places..."
      />
      
      <div className="px-4 py-6">
        {loading && <p className="text-center">Loading lifestyle places...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}
        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlaces.map((place) => (
                <ListingCard
                  key={place.id}
                  {...place}
                  onClick={() => handlePlaceClick(place.id)}
                />
              ))}
            </div>
            
            {filteredPlaces.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No lifestyle places found matching your search.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LifestylePage;