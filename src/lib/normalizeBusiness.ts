// Shared normalizer: Firestore `businesses` docs exist in two shapes:
//  - Legacy seed (seed.js): { businessName, logoUrl, address, contactPhone, contactEmail, state: "Port Harcourt" | "Abuja" | ..., city }
//  - New write path (BusinessListingPage): { title, image, images, location, phone, state: "Rivers" | "FCT" | ... }
// This module bridges both so DB rows always render.

export interface NormalizedBusiness {
  id: string;
  title: string;
  businessName: string;
  description: string;
  image: string;
  images: string[];
  category: string;
  rating: number;
  price: string;
  location: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  website: string;
  whatsapp: string;
  isOpen: boolean;
  tags: string[];
  [key: string]: any;
}

const firstString = (...vals: any[]): string => {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
};

export function normalizeBusinessDoc(id: string, data: any = {}): NormalizedBusiness {
  const title = firstString(data.title, data.businessName, data.name, "Untitled");
  const image =
    firstString(data.image, data.logoUrl) ||
    (Array.isArray(data.images) && typeof data.images[0] === "string" ? data.images[0] : "");
  const images = Array.isArray(data.images)
    ? data.images.filter((x: any) => typeof x === "string")
    : image
      ? [image]
      : [];
  const city = firstString(data.city, "");
  const state = firstString(data.state, "");
  const location =
    firstString(data.location, data.address) ||
    [city, state].filter(Boolean).join(", ");
  const phone = firstString(data.phone, data.contactPhone, data.whatsapp, "");
  const email = firstString(data.email, data.contactEmail, "");
  const address = firstString(data.address, data.location, location);

  return {
    ...data,
    id,
    title,
    businessName: firstString(data.businessName, title),
    description: firstString(data.description, ""),
    image,
    images,
    category: firstString(data.category, "Other"),
    rating: typeof data.rating === "number" ? data.rating : 0,
    price: firstString(data.price, data.priceRange, ""),
    location,
    address,
    city,
    state,
    phone,
    email,
    website: firstString(data.website, ""),
    whatsapp: firstString(data.whatsapp, phone),
    isOpen: data.isOpen !== undefined ? !!data.isOpen : true,
    tags: Array.isArray(data.tags) ? data.tags : [],
  };
}

// ── Generic listing normalizer ──
// Products / properties / house_listings / events store media + location
// under different keys: photos[], coverImageUrl, imageUrl, venue, address.
// Normalize once so every card renders with image + location + price.
export function normalizeListingDoc(id: string, data: any = {}): NormalizedBusiness {
  const photo0 =
    Array.isArray(data.photos) && typeof data.photos[0] === "string" ? data.photos[0] : "";
  const image =
    firstString(data.image, data.coverImageUrl, data.imageUrl, photo0) ||
    (Array.isArray(data.images) && typeof data.images[0] === "string" ? data.images[0] : "");
  const images: string[] = Array.isArray(data.images)
    ? data.images.filter((x: any) => typeof x === "string")
    : image
      ? [image]
      : photo0
        ? [photo0]
        : [];
  const city = firstString(data.city, "");
  const state = firstString(data.state, "");
  const location =
    firstString(data.location, data.address, data.venue, data.streetAddress) ||
    [city, state].filter(Boolean).join(", ");
  let price = "";
  if (typeof data.price === "string" && data.price.trim()) price = data.price;
  else if (typeof data.price === "number") price = `₦${data.price.toLocaleString()}`;
  else if (typeof data.priceNum === "number") price = `₦${data.priceNum.toLocaleString()}`;
  else if (typeof data.pricePerNight === "number")
    price = `₦${data.pricePerNight.toLocaleString()}/night`;
  else price = firstString(data.priceLabel, data.priceRange, "");

  return {
    ...data,
    id,
    title: firstString(data.title, data.name, data.businessName, "Untitled"),
    description: firstString(data.description, ""),
    image,
    images,
    category: firstString(data.category, data.type, data.propertySubType, "Other"),
    rating:
      typeof data.rating === "number"
        ? data.rating
        : Number(data.rating) || 0,
    price,
    location,
    address: firstString(data.address, data.location, location),
    city,
    state,
    phone: firstString(data.phone, data.contactPhone, data.whatsapp, ""),
    email: firstString(data.email, data.contactEmail, ""),
    website: firstString(data.website, ""),
    isOpen: data.isOpen !== undefined ? !!data.isOpen : true,
    tags: Array.isArray(data.tags) ? data.tags : [],
  };
}

// Firestore stores city names ("Port Harcourt", "Abuja", "Owerri") while
// RegionContext filters by state names ("Rivers", "FCT", "Imo").
// Keep both spellings equivalent everywhere.
const STATE_GROUPS: string[][] = [
  ["Rivers", "Port Harcourt"],
  ["FCT", "Abuja", "Federal Capital Territory"],
  ["Imo", "Owerri"],
  ["Lagos", "Lagos"],
  ["Kano", "Kano"],
  ["Kaduna", "Kaduna"],
];

export function stateVariants(state: string): string[] {
  if (!state) return [];
  const needle = state.trim().toLowerCase();
  for (const group of STATE_GROUPS) {
    if (group.some((s) => s.toLowerCase() === needle)) return group;
  }
  return [state];
}

export function matchesState(docState: any, filterState: string): boolean {
  if (!filterState) return true;
  if (!docState) return false;
  const variants = stateVariants(filterState).map((s) => s.toLowerCase());
  return variants.includes(String(docState).trim().toLowerCase());
}
