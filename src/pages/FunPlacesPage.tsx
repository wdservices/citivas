import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeBusinessDoc } from "@/lib/normalizeBusiness";
import SearchHeader from "@/components/SearchHeader";
import ListingCard from "@/components/ListingCard";

interface FunPlace {
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

const FunPlacesPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [places, setPlaces] = useState<FunPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFunPlaces = async () => {
      try {
        const q = query(collection(db, "businesses"));
        const querySnapshot = await getDocs(q);
        const placesData = querySnapshot.docs
          .map(doc => normalizeBusinessDoc(doc.id, doc.data()))
          .filter((doc: any) => doc.category === "Fun") as FunPlace[];
        setPlaces(placesData);
      } catch (err) {
        setError("Failed to fetch fun places.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchFunPlaces();
  }, []);

  const filteredPlaces = places.filter(place =>
    (place.title?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    (place.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    (place.category?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  );

  const handlePlaceClick = (placeId: string) => {
    navigate(`/fun-places/${placeId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <SearchHeader
        title="Fun Places"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        placeholder="Search fun places..."
      />
      
      <div className="px-4 py-6">
        {loading && <p className="text-center">Loading fun places...</p>}
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
                <p className="text-muted-foreground">No fun places found matching your search.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FunPlacesPage;