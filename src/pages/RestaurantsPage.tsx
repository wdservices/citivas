import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeBusinessDoc } from "@/lib/normalizeBusiness";
import SearchHeader from "@/components/SearchHeader";
import ListingCard from "@/components/ListingCard";
import MiniSiteStrip from "@/components/MiniSiteStrip";

interface Restaurant {
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

const RestaurantsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const q = query(collection(db, "businesses"));
        const querySnapshot = await getDocs(q);
        const restaurantsData = querySnapshot.docs
          .map(doc => normalizeBusinessDoc(doc.id, doc.data()))
          .filter((doc: any) => doc.category === "Restaurant") as Restaurant[];
        setRestaurants(restaurantsData);
      } catch (err) {
        setError("Failed to fetch restaurants.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  const filteredRestaurants = restaurants.filter(restaurant =>
    ((restaurant as any).title?.toLowerCase()?.includes(searchTerm.toLowerCase()) || false) ||
    (restaurant.description?.toLowerCase()?.includes(searchTerm.toLowerCase()) || false) ||
    (restaurant.category?.toLowerCase()?.includes(searchTerm.toLowerCase()) || false)
  );

  const handleRestaurantClick = (restaurantId: string) => {
    navigate(`/restaurants/${restaurantId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <SearchHeader
        title="Restaurants"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        placeholder="Search restaurants..."
      />
      
      <div className="px-4 py-6">
        {loading && <p className="text-center">Loading restaurants...</p>}
        {error && <p className="text-center text-destructive">{error}</p>}
        {!loading && !error && (
          <>
            <MiniSiteStrip types={["restaurant"]} title="Restaurants you can order from" subtitle="Full food menus with online ordering, straight from the kitchen." />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRestaurants.map((restaurant) => (
                <ListingCard
                  key={restaurant.id}
                  {...restaurant}
                  onClick={() => handleRestaurantClick(restaurant.id)}
                />
              ))}
            </div>
            
            {filteredRestaurants.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No restaurants found matching your search.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RestaurantsPage;