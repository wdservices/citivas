import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, collectionGroup, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeListingDoc } from "@/lib/normalizeBusiness";
import SearchHeader from "@/components/SearchHeader";
import ListingCard from "@/components/ListingCard";
import MiniSiteStrip from "@/components/MiniSiteStrip";
import airbnbApartment from "@/assets/airbnb-apartment.jpg";
import airbnbHouse from "@/assets/airbnb-house.jpg";

interface AirbnbPlace {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  rating: number;
  price: string;
  location: string;
  phone?: string;
  website?: string;
  isOpen?: boolean;
}

const u = (id: string, w = 900) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

const mockData: AirbnbPlace[] = [
  {
    id: "mock-prop-001",
    title: "Luxury Oceanview Penthouse",
    description: "Stunning 3-bedroom penthouse with panoramic ocean views, modern interiors, private rooftop terrace and infinity plunge pool. Chef kitchen, home automation, 24/7 concierge.",
    image: u("1600596542815-ffad4c1539a9"),
    category: "Penthouse",
    rating: 4.9,
    price: "₦120,000/night",
    location: "Victoria Island, Lagos",
    phone: "+234 803 000 1001",
    isOpen: true,
  },
  {
    id: "mock-prop-002",
    title: "Modern Lekki Studio Apartment",
    description: "Sleek and cozy studio apartment in the heart of Lekki Phase 1. Open-plan living, fitted kitchen, fast Wi-Fi, 24/7 security. Perfect for business travellers and short stays.",
    image: u("1522708323590-d24dbb6b0267"),
    category: "For Rent",
    rating: 4.6,
    price: "₦850,000/month",
    location: "Lekki Phase 1, Lagos",
    phone: "+234 810 222 0011",
    isOpen: true,
  },
  {
    id: "mock-prop-003",
    title: "Ikoyi Villa with Private Pool",
    description: "Exquisite 5-bedroom detached villa with swimming pool, home cinema, smart home systems, boys quarters and lush gardens. Ideal for family retreats and executive stays.",
    image: u("1613490493576-7fde63acd811"),
    category: "For Sale",
    rating: 5.0,
    price: "₦480,000,000",
    location: "Banana Island, Ikoyi, Lagos",
    phone: "+234 805 555 0003",
    isOpen: true,
  },
  {
    id: "mock-prop-004",
    title: "Cozy Island Loft",
    description: "A beautifully designed loft space with exposed brick, industrial-chic decor, floor-to-ceiling windows and Lagos skyline views. Rooftop lounge shared with 6 other units.",
    image: u("1502672260266-1c1ef2d93688"),
    category: "Loft",
    rating: 4.7,
    price: "₦65,000/night",
    location: "Oniru, Lekki, Lagos",
    phone: "+234 809 444 0004",
    isOpen: true,
  },
  {
    id: "mock-prop-005",
    title: "Port Harcourt Executive 2-Bed Flat",
    description: "Premium 2-bedroom flat in GRA with 24/7 power, treated water, private car park and estate security. 3-minute drive to Port Harcourt Club and business districts.",
    image: u("1600585154340-be6161a56a0c"),
    category: "Apartment",
    rating: 4.5,
    price: "₦1,200,000/year",
    location: "Old GRA, Port Harcourt",
    phone: "+234 803 777 0005",
    isOpen: true,
  },
  {
    id: "mock-prop-006",
    title: "Waterfront Townhouse",
    description: "Elegant 4-bedroom townhouse on the Lagos lagoon with private dock access, lush gardens, double-volume living areas and a rooftop terrace for events.",
    image: u("1600607687939-ce8a6c25118c"),
    category: "Townhouse",
    rating: 4.8,
    price: "₦200,000/night",
    location: "Banana Island, Lagos",
    phone: "+234 803 666 0006",
    isOpen: true,
  },
  {
    id: "mock-prop-007",
    title: "Asemi Premium 3-Bed Shortlet (FCT)",
    description: "Fully serviced 3-bedroom short-let apartment with premium finishes in a high-security estate. 24/7 power, inverter backup, 3 smart TVs, sound system, all rooms ensuite.",
    image: u("1600566753086-00f18fb6b3ea"),
    category: "Shortlet",
    rating: 4.9,
    price: "₦95,000/night",
    location: "Wuye, Abuja FCT",
    phone: "+234 703 999 0007",
    isOpen: true,
  },
  {
    id: "mock-prop-008",
    title: "Maitama 4-Bed Terrace Duplex",
    description: "Newly built 4-bedroom terrace duplex with BQ, fitted kitchen, spacious compound, all bedrooms ensuite, excellent drainage, interlocked compound.",
    image: u("1582719478250-c89cae4dc85b"),
    category: "For Sale",
    rating: 4.4,
    price: "₦125,000,000",
    location: "Maitama, Abuja FCT",
    phone: "+234 803 333 0008",
    isOpen: true,
  },
  {
    id: "mock-prop-009",
    title: "Lekki Scheme 2 — Land Parcel",
    description: "500 sqm dry land plot in a developed area of Lekki Scheme 2. 100% dry, corner piece, accessible road, C of O ready. Suitable for 4-bedroom duplex with BQ.",
    image: u("1500381123146-e5131e291f67"),
    category: "Land",
    rating: 0,
    price: "₦18,000,000",
    location: "Lekki Scheme 2, Lagos",
    phone: "+234 803 111 0009",
    isOpen: true,
  },
  {
    id: "mock-prop-010",
    title: "Guzape Hills 1.2 Hectare Land",
    description: "Premium 1.2 hectare (12,000 sqm) parcel at Guzape Hills with panoramic Abuja city views. Serene environment, perfect for estate development or luxury mansion.",
    image: u("1464146071629-c2f83e42bd37"),
    category: "Land",
    rating: 0,
    price: "₦450,000,000",
    location: "Guzape Hills, Abuja FCT",
    phone: "+234 805 222 0010",
    isOpen: true,
  },
  {
    id: "mock-prop-011",
    title: "The Citadel Boutique Hotel (Port Harcourt)",
    description: "28-room boutique hotel with rooftop bar, conference room (80 pax), restaurant, 24/7 gym and spa. Fully operational with existing occupancy rates, staff and FnB structure.",
    image: u("1566073771259-6a8506099945"),
    category: "Hotel",
    rating: 4.7,
    price: "₦85,000 avg/night",
    location: "GRA Phase 3, Port Harcourt",
    phone: "+234 700 248 2335",
    website: "https://citadelhotelph.ng",
    isOpen: true,
  },
  {
    id: "mock-prop-012",
    title: "Ibadan 600 sqm Residential Plot (Bodija)",
    description: "Fenced and gated 600 sqm residential plot on a tarred street in Bodija. Corner piece, drainage on both sides, already sand-filled. Registered survey + deed of assignment.",
    image: u("1526720234285-12a741fd22ef"),
    category: "Land",
    rating: 0,
    price: "₦6,500,000",
    location: "Bodija, Ibadan, Oyo",
    phone: "+234 803 444 0012",
    isOpen: true,
  },
  {
    id: "mock-prop-013",
    title: "Millennium Estate 3-Bed Flat",
    description: "Well-maintained 3-bedroom flat with BQ, POP ceilings, two sitting areas, water treatment, borehole, two-phase prepaid meters, two car parking spaces.",
    image: u("1596394516093-501ba68a0ba6"),
    category: "For Rent",
    rating: 4.3,
    price: "₦950,000/year",
    location: "Millennium Estate, Gbagada, Lagos",
    phone: "+234 810 555 0013",
    isOpen: true,
  },
  {
    id: "mock-prop-014",
    title: "The Grand Asaba Hotel & Suites",
    description: "45-room 4-star hotel with pool, event hall (300 pax), two restaurants, executive floor, gym. Located off the Asaba Expressway with high corporate and events occupancy.",
    image: u("1571003123894-1f0594d2b5d9"),
    category: "Hotel",
    rating: 4.5,
    price: "₦60,000 avg/night",
    location: "Asaba, Delta",
    phone: "+234 700 472 6348",
    website: "https://grandasaba.ng",
    isOpen: true,
  },
];

const AirbnbPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [places, setPlaces] = useState<AirbnbPlace[]>(mockData);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        const [topSnap, groupSnap] = await Promise.all([
          getDocs(collection(db, "house_listings")),
          getDocs(collectionGroup(db, "properties")).catch(() => ({ docs: [] }) as any),
        ]);
        const seen = new Set<string>();
        const firebasePlaces: AirbnbPlace[] = [];
        for (const doc of [...topSnap.docs, ...groupSnap.docs]) {
          if (seen.has(doc.id)) continue;
          seen.add(doc.id);
          const n = normalizeListingDoc(doc.id, doc.data());
          firebasePlaces.push({
            id: n.id,
            title: n.title || "Untitled Property",
            description: n.description || "",
            image: n.image || "",
            category: n.category || "Rental",
            rating: Number(n.rating || 0),
            price: typeof n.price === "string" ? n.price : String(n.price || ""),
            location: n.location || "",
            phone: n.phone || "",
            website: (doc.data() as any).website || "",
            isOpen: true,
          } as AirbnbPlace);
        }
        
        // Remove duplicates between mock data and firebase data if any
        const allPlaces = [...mockData];
        firebasePlaces.forEach(fbPlace => {
          if (!allPlaces.find(p => p.id === fbPlace.id)) {
            allPlaces.push(fbPlace);
          }
        });
        
        setPlaces(allPlaces);
      } catch (err) {
        console.error("Failed to fetch house listings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaces();
  }, []);

  const filteredPlaces = places.filter(place =>
    (place.title?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (place.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (place.category?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (place.location?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  const handlePlaceClick = (placeId: string) => {
    navigate(`/airbnb/${placeId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <SearchHeader
        title="Airbnb & Rentals"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        placeholder="Search rentals..."
      />
      
      <div className="px-4 py-6">
        {loading && <p className="text-center py-4">Loading rentals...</p>}
        
        <MiniSiteStrip types={["shortlet", "hotel"]} title="Serviced shortlets with their own storefront" subtitle="Self check-in, live rates and verified photos." />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlaces.map((place) => (
            <ListingCard
              key={place.id}
              {...place}
              location={place.location}
              onClick={() => handlePlaceClick(place.id)}
            />
          ))}
        </div>
        
        {!loading && filteredPlaces.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No rentals found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AirbnbPage;