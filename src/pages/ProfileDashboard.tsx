import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Building2, ShoppingBag, Home, Calendar, Megaphone,
  Plus, LayoutDashboard, MapPin, Trash2, Edit3, Ticket, Store,
  ChevronRight, Loader2, Download, FileText, BarChart2, Info, CalendarClock, Image as ImageIcon, Hotel, UtensilsCrossed, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useRegion } from "@/contexts/RegionContext";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { getDoc, doc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useMyListings, useBusinessChildren, useCreateDoc, useUpdateDoc, useDeleteDoc, useMyEventOrders, useMyTicketOrders, useMyAttendedEvents, fmt } from "@/lib/useFirestore";
import ImageUpload from "@/components/ImageUpload";
import MultiImageUpload from "@/components/MultiImageUpload";
import { AddressPicker } from "@/components/AddressPicker";
import { CLOUDINARY_FOLDERS, deleteImagesFromCloudinary, collectPublicIdsForListing } from "@/lib/cloudinary";
import { logActivity } from "@/lib/activityLog";
import { getMockImage } from "@/lib/mockImages";
import {
  NIGERIAN_STATES, STATE_CITIES, BUSINESS_CATEGORIES,
  PROPERTY_TYPES, EVENT_CATEGORIES, type NigerianState,
  PROPERTY_SUB_TYPES, PROPERTY_AMENITIES, RENT_BILLING_PERIODS,
  FURNISHING_OPTIONS, LAND_TITLE_TYPES, LAND_SIZE_UNITS,
  COMMERCIAL_USAGES, type PropertySubType,
} from "@/lib/nigerianStates";

interface ListingItem {
  id: string;
  title: string;
  image: string;
  category?: string;
  type?: string;
  location?: string;
  price?: string;
  status?: string;
}

const ProfileDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const {
    state: detectedRegionState,
    locationName: detectedCity,
    userCoords,
    userAddress,
    isLocating,
    detectRegion,
  } = useRegion();

  const initialTab = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [selectedBusinessTitle, setSelectedBusinessTitle] = useState<string | null>(null);

  // Wizard state
  const [createOpen, setCreateOpen] = useState(searchParams.get("action") === "create");
  const [wizardStep, setWizardStep] = useState(1);
  const [listingType, setListingType] = useState<"business" | "product" | "property" | "event" | "restaurant">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const action = searchParams.get("action");
    const type = searchParams.get("type");
    const tab = searchParams.get("tab");

    if (tab) {
      setActiveTab(tab);
    }

    if (type === "restaurant") {
      navigate("/restaurant-wizard", { replace: true });
      return;
    }

    if (action === "create") {
      setCreateOpen(true);
      if (type === "product") {
        setListingType("product");
        setWizardStep(2);
      } else if (type === "event" || tab === "events") {
        setListingType("event");
        setWizardStep(2);
      } else if (type === "property") {
        setListingType("property");
        setWizardStep(2);
      } else if (type === "business") {
        setListingType("business");
        setWizardStep(2);
      } else {
        setWizardStep(1);
      }
    }
  }, [searchParams, navigate]);

  // ── Delete confirmation ──
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: string; title: string } | null>(null);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0); // 0=closed, 1=first confirm, 2=second confirm
  const [deleting, setDeleting] = useState(false);

  // ── Edit mode ──
  const [editTarget, setEditTarget] = useState<{ id: string; type: string; data: any } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // ── Edit form fields ──
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editState, setEditState] = useState<NigerianState | "">("");
  const [editCity, setEditCity] = useState("");
  const [editStreetAddress, setEditStreetAddress] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editImagePublicId, setEditImagePublicId] = useState("");
  const [editMapLat, setEditMapLat] = useState<number | undefined>();
  const [editMapLon, setEditMapLon] = useState<number | undefined>();

  // Product-specific edit fields
  const [editProductPrice, setEditProductPrice] = useState("");
  const [editPromoPrice, setEditPromoPrice] = useState("");
  const [editProductCategory, setEditProductCategory] = useState("");

  // Event-specific edit fields
  const [editEventCategory, setEditEventCategory] = useState("");
  const [editEventStartDate, setEditEventStartDate] = useState("");
  const [editEventEndDate, setEditEventEndDate] = useState("");
  const [editEventStartTime, setEditEventStartTime] = useState("");
  const [editEventEndTime, setEditEventEndTime] = useState("");
  const [editEventVenue, setEditEventVenue] = useState("");
  const [editEventLocation, setEditEventLocation] = useState("");
  const [editTicketTypes, setEditTicketTypes] = useState<{ name: string; price: string; quantity: string }[]>([]);

  // ── Shared form fields ──
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedState, setSelectedState] = useState<NigerianState | "">("");
  const [selectedCity, setSelectedCity] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [uploadedImagePublicId, setUploadedImagePublicId] = useState("");
  const [mapLat, setMapLat] = useState<number | undefined>();
  const [mapLon, setMapLon] = useState<number | undefined>();

  // ── Business-specific ──
  const [bizCategory, setBizCategory] = useState("");
  const [bizImages, setBizImages] = useState<string[]>([]);
  const [bizImagePublicIds, setBizImagePublicIds] = useState<string[]>([]);

  // ── Restaurant-specific ──
  const [cuisineType, setCuisineType] = useState("");
  const [priceRange, setPriceRange] = useState("₦₦ (Casual Dining)");

  // ── Product-specific ──
  const [listAsBizId, setListAsBizId] = useState("individual");
  const [productPrice, setProductPrice] = useState("");
  const [promoPrice, setPromoPrice] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [itemCondition, setItemCondition] = useState("Brand New");
  const [productImages, setProductImages] = useState<string[]>([]);
  const [productImagePublicIds, setProductImagePublicIds] = useState<string[]>([]);

  // ── Property-specific ──
  const [propListAsBizId, setPropListAsBizId] = useState("individual");
  const [propertySubType, setPropertySubType] = useState<PropertySubType | "">("");
  const [propertyType, setPropertyType] = useState("");
  const [propertyPrice, setPropertyPrice] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [uploadedImagePublicIds, setUploadedImagePublicIds] = useState<string[]>([]);
  // Rent fields
  const [rentHouseType, setRentHouseType] = useState("");
  const [rentRoadCondition, setRentRoadCondition] = useState("");
  const [rentRoadImage, setRentRoadImage] = useState("");
  const [rentRoadImagePublicId, setRentRoadImagePublicId] = useState("");
  const [rentBillingPeriod, setRentBillingPeriod] = useState("");
  const [rentBedrooms, setRentBedrooms] = useState(2);
  const [rentBathrooms, setRentBathrooms] = useState(2);
  const [rentHasStore, setRentHasStore] = useState(false);
  const [rentFurnishing, setRentFurnishing] = useState("");
  const [rentServiceCharge, setRentServiceCharge] = useState("");
  const [rentCautionFee, setRentCautionFee] = useState("");
  const [rentLegalFee, setRentLegalFee] = useState("");
  const [rentAgencyFee, setRentAgencyFee] = useState("");
  const [rentDeposit, setRentDeposit] = useState(""); // legacy alias for caution
  const [rentAvailableFrom, setRentAvailableFrom] = useState("");
  // Shortlet fields
  const [shortletMinNights, setShortletMinNights] = useState(1);
  const [shortletMaxGuests, setShortletMaxGuests] = useState(2);
  const [shortletBedrooms, setShortletBedrooms] = useState(1);
  const [shortletBathrooms, setShortletBathrooms] = useState(1);
  const [shortletCheckin, setShortletCheckin] = useState("14:00");
  const [shortletCheckout, setShortletCheckout] = useState("11:00");
  // Hotel fields
  const [hotelStarRating, setHotelStarRating] = useState("");
  const [hotelRoomTypes, setHotelRoomTypes] = useState<{ name: string; pricePerNight: number; maxOccupancy: number; amenities: string[] }[]>([]);
  const [hotelCheckin, setHotelCheckin] = useState("14:00");
  const [hotelCheckout, setHotelCheckout] = useState("11:00");
  // Land fields
  const [landPlotSize, setLandPlotSize] = useState("");
  const [landSizeUnit, setLandSizeUnit] = useState("plots");
  const [landTitleType, setLandTitleType] = useState("");
  const [landUseType, setLandUseType] = useState("");
  const [landTopography, setLandTopography] = useState("");
  const [landAccessRoad, setLandAccessRoad] = useState("");
  const [landFenced, setLandFenced] = useState(false);
  const [landSurveyPlan, setLandSurveyPlan] = useState(false);
  const [landSaleType, setLandSaleType] = useState("sale");
  // Commercial fields
  const [commercialType, setCommercialType] = useState("");
  const [commercialSpaceSize, setCommercialSpaceSize] = useState("");
  const [commercialCapacity, setCommercialCapacity] = useState("");
  const [commercialBillingPeriod, setCommercialBillingPeriod] = useState("");
  const [commercialUsages, setCommercialUsages] = useState<string[]>([]);
  const [commercialHasParking, setCommercialHasParking] = useState(false);
  const [commercialHasSecurity, setCommercialHasSecurity] = useState(false);
  const [commercialHasWater, setCommercialHasWater] = useState(false);
  const [commercialHasPower, setCommercialHasPower] = useState(false);
  const [commercialHasAC, setCommercialHasAC] = useState(false);
  const [commercialHasInternet, setCommercialHasInternet] = useState(false);
  const [commercialHasElevator, setCommercialHasElevator] = useState(false);
  const [commercialHasCanteen, setCommercialHasCanteen] = useState(false);
  const [commercialServiceCharge, setCommercialServiceCharge] = useState("");
  const [commercialCautionFee, setCommercialCautionFee] = useState("");
  const [commercialLegalFee, setCommercialLegalFee] = useState("");
  const [commercialAgencyFee, setCommercialAgencyFee] = useState("");

  // ── Event-specific ──
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventStartTime, setEventStartTime] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");
  const [eventVenue, setEventVenue] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventCategory, setEventCategory] = useState("");
  const [ticketTypes, setTicketTypes] = useState<{ name: string; price: string; quantity: string }[]>([
    { name: "Regular", price: "0", quantity: "100" },
  ]);

  // ── User's businesses (for product/property linking) ──
  const { data: listingsData, isLoading: loadingListings } = useMyListings(user?.id || null);
  const myBusinesses = (listingsData?.businesses || []) as ListingItem[];
  const myProducts = (listingsData?.products || []) as ListingItem[];
  const myProperties = (listingsData?.properties || []) as ListingItem[];
  const myEvents = (listingsData?.events || []) as ListingItem[];

  // ── Hospitality mini-site check ──
  const hasMiniSite = myProperties.some((p: any) => p.miniSiteActive === true || p.status === 'Published' || p.status === 'Approved');

  // ── Children of selected business ──
  const { data: bizChildren, isLoading: loadingBizChildren } = useBusinessChildren(selectedBusinessId);
  const bizProducts = (bizChildren?.products || []) as ListingItem[];
  const bizProperties = (bizChildren?.properties || []) as ListingItem[];



  // ── Event analytics (organized events) ──
  const eventIds = myEvents.map((e) => e.id);
  const { data: allOrders = [] } = useMyEventOrders(user?.id || null, eventIds);

  // ── Attended events (events user has tickets for) ──
  const { data: myTicketOrders = [] } = useMyTicketOrders(user?.id || null);
  const attendedEventIds = [...new Set(myTicketOrders.map((o: any) => o.eventId).filter(Boolean))];
  const { data: attendedEvents = [] } = useMyAttendedEvents(user?.id || null, attendedEventIds);

  const eventAnalytics = useMemo(() => {
    let totalCapacity = 0;
    let totalRevenue = 0;
    const eventStats = myEvents.map((evt: any) => {
      const tickets = evt.ticketTypes || [];
      const capacity = tickets.reduce((s: number, t: any) => s + (Number(t.quantity) || 0), 0);
      const potentialRev = tickets.reduce((s: number, t: any) => s + (Number(t.price) || 0) * (Number(t.quantity) || 0), 0);
      const orders = allOrders.filter((o: any) => o.eventId === evt.id);
      const attendees = orders.map((o: any) => ({
        id: o.id || "",
        name: o.buyerName || o.buyerEmail || "Anonymous",
        email: o.buyerEmail || "",
        amount: Number(o.totalAmount) || Number(o.amount) || 0,
        tier: o.ticketTier || "General",
        quantity: Number(o.quantity) || 1,
        date: o.createdAt || "",
      }));
      const revenue = attendees.reduce((s: number, a: any) => s + a.amount, 0);
      totalCapacity += capacity;
      totalRevenue += revenue;
      return { id: evt.id, title: evt.title || "Untitled", date: evt.startDate || "", location: evt.location || "", capacity, attendees, potentialRevenue: potentialRev, actualRevenue: revenue, ticketTiers: tickets };
    });
    return { totalEvents: myEvents.length, totalCapacity, totalRevenue, totalAttendees: allOrders.length, eventStats };
  }, [myEvents, allOrders]);

  // ── Generate Event Report (PDF/CSV) ──
  const generateEventReport = () => {
    const lines: string[] = [];
    lines.push("CitivasNG — Event Report");
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push("");
    lines.push(`Total Events: ${eventAnalytics.totalEvents}`);
    lines.push(`Total Capacity: ${eventAnalytics.totalCapacity.toLocaleString()}`);
    lines.push(`Total Attendees: ${eventAnalytics.totalAttendees}`);
    lines.push(`Total Revenue: ₦${eventAnalytics.totalRevenue.toLocaleString()}`);
    lines.push("");

    eventAnalytics.eventStats.forEach((evt, i) => {
      lines.push(`${i + 1}. ${evt.title}`);
      lines.push(`   Date: ${evt.date || "TBA"} | Location: ${evt.location || "TBA"}`);
      lines.push(`   Capacity: ${evt.capacity} | Attendees: ${evt.attendees.length} | Revenue: ₦${evt.actualRevenue.toLocaleString()}`);
      if (evt.attendees.length > 0) {
        lines.push("   Attendees:");
        evt.attendees.forEach((a, j) => {
          lines.push(`     ${j + 1}. ${a.name} (${a.email}) — ${a.tier} × ${a.quantity} — ₦${a.amount.toLocaleString()} — ${a.date ? new Date(a.date).toLocaleDateString() : "N/A"}`);
        });
      } else {
        lines.push("   No attendees yet");
      }
      lines.push("");
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `event-report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Report downloaded", description: "Event report saved as CSV." });
  };

  // ── Cached mutations (auto-invalidate queries on success) ──
  const createBusiness = useCreateDoc("businesses");
  const createEvent = useCreateDoc("events");
  const createProduct = useCreateDoc("marketplace");
  const createProperty = useCreateDoc("house_listings");
  const updateListing = useUpdateDoc("businesses");
  const updateProduct = useUpdateDoc("marketplace");
  const updateProperty = useUpdateDoc("house_listings");
  const updateEvent = useUpdateDoc("events");
  const deleteListing = useDeleteDoc("businesses");
  const deleteProduct = useDeleteDoc("marketplace");
  const deleteProperty = useDeleteDoc("house_listings");
  const deleteEvent = useDeleteDoc("events");
  const deleteTicketOrder = useDeleteDoc("ticket_orders");

  // ── Inherited state from selected business ──
  const selectedBiz = myBusinesses.find((b) => b.id === listAsBizId);
  const selectedPropBiz = myBusinesses.find((b) => b.id === propListAsBizId);
  const inheritState = selectedBiz?.location?.split(", ").pop() || "";
  const inheritPropState = selectedPropBiz?.location?.split(", ").pop() || "";

  // Maps RegionContext state names (Rivers, Lagos, FCT, Imo, Kano, Kaduna)
  // to canonical NIGERIAN_STATES keys; handles the "FCT" -> "FCT (Abuja)" alias.
  const resolveNigerianStateFromRegion = (regionState: string): NigerianState | "" => {
    if (regionState === "FCT") return "FCT (Abuja)" as NigerianState;
    if ((NIGERIAN_STATES as readonly string[]).includes(regionState)) {
      return regionState as NigerianState;
    }
    return "";
  };

  // Auto-populate wizard location fields with the user's detected GIS region.
  // Called by resetWizard() and a useEffect that fires when the dialog opens.
  const applyDetectedRegionDefaults = () => {
    const defaultState = resolveNigerianStateFromRegion(detectedRegionState);
    if (defaultState) {
      setSelectedState(defaultState);
    }
    // Default city: RegionContext locationName (e.g. "Port Harcourt")
    // - only if that city is actually in the defaultState's city list
    if (defaultState && detectedCity) {
      const cities = STATE_CITIES[defaultState] || [];
      if (cities.includes(detectedCity)) {
        setSelectedCity(detectedCity);
      } else if (cities.length > 0) {
        setSelectedCity(cities[0]);
      } else {
        setSelectedCity("");
      }
    }
    // GIS coordinates
    if (userCoords?.lat !== undefined) setMapLat(userCoords.lat);
    if (userCoords?.lon !== undefined) setMapLon(userCoords.lon);
    // Reverse-geocoded street address, if available
    if (userAddress) setStreetAddress(userAddress);
  };

  // Auto-populate location defaults whenever the Create New dialog opens.
  // Also re-triggers if detectRegion finishes resolving (isLocating flips from true -> false).
  useEffect(() => {
    if (!createOpen) return;
    // Only auto-fill if the user hasn't already touched these fields manually in this session.
    if (!selectedState || !mapLat) {
      applyDetectedRegionDefaults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createOpen, isLocating]);

  const resetWizard = () => {
    setCreateOpen(false);
    setWizardStep(1);
    setListingType("");
    setTitle("");
    setDescription("");
    setSelectedCity("");
    setStreetAddress("");
    setPhone("");
    setUploadedImageUrl("");
    setUploadedImagePublicId("");
    setBizCategory("");
    setCuisineType("");
    setPriceRange("₦₦ (Casual Dining)");
    setListAsBizId("individual");
    setProductPrice("");
    setPromoPrice("");
    setProductCategory("");
    setItemCondition("Brand New");
    setProductImages([]);
    setProductImagePublicIds([]);
    setPropListAsBizId("individual");
    setPropertyType("");
    setPropertyPrice("");
    setPropertySubType("" as any);
    setSelectedAmenities([]);
    setUploadedImageUrls([]);
    setUploadedImagePublicIds([]);
    setRentHouseType("");
    setRentRoadCondition("");
    setRentRoadImage("");
    setRentRoadImagePublicId("");
    setRentBillingPeriod("");
    setRentBedrooms(1);
    setRentBathrooms(1);
    setRentHasStore(false);
    setRentFurnishing("");
    setRentServiceCharge("");
    setRentCautionFee("");
    setRentLegalFee("");
    setRentAgencyFee("");
    setRentDeposit("");
    setRentAvailableFrom("");
    setLandPlotSize("");
    setLandSizeUnit("plots");
    setLandTitleType("");
    setLandSaleType("sale");
    setCommercialSpaceSize("");
    setCommercialBillingPeriod("");
    setCommercialUsages([]);
    setCommercialHasParking(false);
    setCommercialHasSecurity(false);
    setCommercialHasWater(false);
    setCommercialHasPower(false);
    setCommercialHasAC(false);
    setCommercialHasInternet(false);
    setCommercialHasElevator(false);
    setCommercialHasCanteen(false);
    setBizImages([]);
    setBizImagePublicIds([]);
    setEventStartDate("");
    setEventEndDate("");
    setEventStartTime("");
    setEventEndTime("");
    setEventVenue("");
    setEventLocation("");
    setEventCategory("");
    setTicketTypes([{ name: "Regular", price: "0", quantity: "100" }]);
    // Reset location to detected defaults, not to empty — so every fresh
    // open of Create New already shows the user's detected GIS state/city.
    applyDetectedRegionDefaults();
  };

  const resolveState = (override?: string): string => {
    if (override) return override;
    return selectedState;
  };

  // ── CREATE HANDLERS ──

  const handleCreateBusiness = async () => {
    if (!user?.id) { navigate("/auth"); return; }
    if (!title || !selectedState || !bizCategory) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const fullLocation = [selectedCity, selectedState].filter(Boolean).join(", ");
      const primaryBizImage = bizImages[0] || uploadedImageUrl || getMockImage(bizCategory);
      await createBusiness.mutateAsync({
        title,
        description,
        category: bizCategory,
        location: fullLocation,
        state: selectedState,
        city: selectedCity,
        streetAddress,
        phone,
        image: primaryBizImage,
        images: bizImages.length > 0 ? bizImages : [primaryBizImage],
        imagePublicIds: bizImagePublicIds,
        ownerId: user.id,
        isOpen: true,
        rating: 0,
        lat: mapLat || null,
        lon: mapLon || null,
      });
      logActivity({ userId: user.id, userEmail: user.email, userName: user.name, action: "create_listing", targetType: "business", targetName: title, details: `Created business: ${title}` });
      toast({ title: "Business registered!" });
      resetWizard();
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to create business", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateRestaurant = async () => {
    if (!user?.id) { navigate("/auth"); return; }
    if (!title || !selectedState) {
      toast({ title: "Please provide restaurant name and state", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const fullLocation = [selectedCity, selectedState, "Nigeria"].filter(Boolean).join(", ");
      const primaryImage = bizImages[0] || uploadedImageUrl || getMockImage("Restaurant");
      const newDoc = await createBusiness.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        category: "Restaurant",
        type: "Restaurant",
        cuisine: cuisineType || "Nigerian / Local Delicacies",
        priceTier: priceRange.split(" ")[0] || "₦₦",
        phone: phone.trim(),
        streetAddress: streetAddress.trim(),
        location: fullLocation,
        state: selectedState,
        city: selectedCity,
        image: primaryImage,
        images: bizImages.length > 0 ? bizImages : [primaryImage],
        imagePublicIds: bizImagePublicIds,
        ownerId: user.id,
        isOpen: true,
        rating: 0,
        reviewCount: 0,
        lat: mapLat || null,
        lon: mapLon || null,
        miniSiteActive: true,
      });
      logActivity({
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        action: "create_listing",
        targetType: "business",
        targetName: title,
        details: `Created restaurant: ${title}`,
      });
      toast({
        title: "Restaurant registered!",
        description: "Launching Restaurant Wizard to customize your digital menu & dining options...",
      });
      resetWizard();
      if (newDoc?.id) {
        navigate(`/restaurant-wizard?businessId=${newDoc.id}`);
      } else {
        navigate("/restaurant-wizard");
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: "Failed to create restaurant", description: err?.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateProduct = async () => {
    if (!user?.id) { navigate("/auth"); return; }
    if (!title.trim()) {
      toast({ title: "Please enter a product title", variant: "destructive" });
      return;
    }
    if (!productPrice) {
      toast({ title: "Please enter product price", variant: "destructive" });
      return;
    }

    const isBiz = listAsBizId && listAsBizId !== "individual";
    const chosenState = (isBiz && selectedBiz && inheritState ? inheritState : selectedState) || selectedBiz?.state || selectedState;
    const chosenCity = (isBiz && selectedBiz && inheritState ? (selectedBiz.location?.split(", ").shift() || selectedBiz.city || "") : selectedCity) || selectedCity;

    if (!chosenState) {
      toast({ title: "Please select a state for your product listing", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const fullLocation = [streetAddress, chosenCity, chosenState].filter(Boolean).join(", ") || (selectedBiz?.location) || `${chosenState}, Nigeria`;
      const primaryImage = productImages[0] || uploadedImageUrl || getMockImage(productCategory || "Product");
      const cleanNumPrice = Number(productPrice.toString().replace(/[^0-9.]/g, '')) || 0;
      const cleanPromoPrice = promoPrice ? Number(promoPrice.toString().replace(/[^0-9.]/g, '')) : null;

      await createProduct.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        category: productCategory || "Other",
        price: `₦${cleanNumPrice.toLocaleString()}`,
        rawPrice: cleanNumPrice,
        promoPrice: cleanPromoPrice ? `₦${cleanPromoPrice.toLocaleString()}` : "",
        rawPromoPrice: cleanPromoPrice,
        regularPrice: cleanNumPrice,
        location: fullLocation,
        streetAddress: streetAddress.trim(),
        state: chosenState,
        city: chosenCity,
        businessId: isBiz ? listAsBizId : "individual",
        businessName: isBiz && selectedBiz ? selectedBiz.title : (user.name || "Independent Seller"),
        sellerType: isBiz ? "business" : "individual",
        image: primaryImage,
        images: productImages.length > 0 ? productImages : [primaryImage],
        imagePublicIds: productImagePublicIds,
        ownerId: user.id,
        condition: itemCondition || "Brand New",
        phone: phone.trim() || user.phone || "",
        rating: 5.0,
        status: "Active",
      });

      qc.invalidateQueries({ queryKey: ["myListings"] });
      qc.invalidateQueries({ queryKey: ["marketplace"] });
      qc.invalidateQueries({ queryKey: ["products"] });

      logActivity({
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        action: "create_listing",
        targetType: "product",
        targetName: title,
        details: `Created product: ${title}`,
      });
      toast({ title: "Product listed on Marketplace!" });
      resetWizard();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Failed to list product", description: err?.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateProperty = async () => {
    if (!user?.id) { navigate("/auth"); return; }
    if (!title || !propertySubType) {
      toast({ title: "Please enter a property title and select a property type", variant: "destructive" });
      return;
    }
    const isIndividual = propListAsBizId === "individual" || !propListAsBizId;
    if (!isIndividual && !selectedPropBiz) {
      toast({ title: "Selected business not found", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      let state: string = "";
      let city: string = "";
      if (selectedState) {
        state = selectedState;
        city = selectedCity;
      } else if (selectedPropBiz?.location) {
        state = selectedPropBiz.location?.split(", ").pop() || "";
        city = selectedPropBiz.location?.split(", ").shift() || "";
      }
      const fullLocation = [streetAddress, city, state].filter(Boolean).join(", ");
      const primaryImage = uploadedImageUrls[0] || uploadedImageUrl || getMockImage("Airbnb");

      const details: Record<string, any> = {};
      if (propertySubType === "rent") {
        details.houseType = rentHouseType;
        details.propertyType = rentHouseType;
        details.roadCondition = rentRoadCondition;
        details.roadImage = rentRoadImage;
        details.roadImagePublicId = rentRoadImagePublicId;
        details.billingPeriod = rentBillingPeriod;
        details.paymentPlan = rentBillingPeriod;
        details.bedrooms = rentBedrooms;
        details.bathrooms = rentBathrooms;
        details.hasStore = rentHasStore;
        details.hasKitchenStore = rentHasStore;
        details.furnishing = rentFurnishing;
        details.serviceCharge = rentServiceCharge ? parseFloat(rentServiceCharge) : 0;
        details.cautionFee = (rentCautionFee || rentDeposit) ? parseFloat(rentCautionFee || rentDeposit) : 0;
        details.cautionDeposit = details.cautionFee;
        details.legalFee = rentLegalFee ? parseFloat(rentLegalFee) : 0;
        details.agencyFee = rentAgencyFee ? parseFloat(rentAgencyFee) : 0;
        details.availableFrom = rentAvailableFrom;
        details.price = parseFloat(propertyPrice) || 0;
        details.billingLabel = rentBillingPeriod ? `/${rentBillingPeriod.toLowerCase()}` : "";
        details.totalPackage = details.price + details.cautionFee + details.legalFee + details.agencyFee + details.serviceCharge;
      } else if (propertySubType === "shortlet_hotel") {
        // Redirected to wizard — this path is a fallback
        details.pricePerNight = parseFloat(propertyPrice) || 0;
        details.amenities = selectedAmenities;
      } else if (propertySubType === "land") {
        details.plotSize = landPlotSize;
        details.sizeUnit = landSizeUnit;
        details.titleType = landTitleType;
        details.titleDocument = landTitleType;
        details.landUseType = landUseType;
        details.topography = landTopography;
        details.accessRoad = landAccessRoad;
        details.fenced = landFenced;
        details.surveyPlan = landSurveyPlan;
        details.hasSurveyPlan = landSurveyPlan;
        details.isFenced = landFenced;
        details.saleType = landSaleType;
        details.price = parseFloat(propertyPrice) || 0;
      } else if (propertySubType === "commercial") {
        details.commercialType = commercialType;
        details.spaceSize = commercialSpaceSize;
        details.spaceSizeSqm = parseFloat(commercialSpaceSize) || 0;
        details.capacity = commercialCapacity ? parseInt(commercialCapacity) : 0;
        details.seatingCapacity = details.capacity;
        details.billingPeriod = commercialBillingPeriod;
        details.usages = commercialUsages;
        details.hasParking = commercialHasParking;
        details.hasSecurity = commercialHasSecurity;
        details.hasWater = commercialHasWater;
        details.hasPower = commercialHasPower;
        details.hasAC = commercialHasAC;
        details.hasInternet = commercialHasInternet;
        details.hasElevator = commercialHasElevator;
        details.hasCanteen = commercialHasCanteen;
        details.amenities = [
          commercialHasParking && "Parking",
          commercialHasSecurity && "Security",
          commercialHasWater && "Water",
          commercialHasPower && "Power / Electricity",
          commercialHasAC && "Air Conditioning",
          commercialHasInternet && "WiFi / Internet",
          commercialHasElevator && "Elevator",
          commercialHasCanteen && "Canteen",
        ].filter(Boolean) as string[];
        details.serviceCharge = commercialServiceCharge ? parseFloat(commercialServiceCharge) : 0;
        details.cautionFee = commercialCautionFee ? parseFloat(commercialCautionFee) : 0;
        details.legalFee = commercialLegalFee ? parseFloat(commercialLegalFee) : 0;
        details.agencyFee = commercialAgencyFee ? parseFloat(commercialAgencyFee) : 0;
        details.price = parseFloat(propertyPrice) || 0;
        details.billingLabel = commercialBillingPeriod ? `/${commercialBillingPeriod.toLowerCase()}` : "";
        details.totalPackage = details.price + details.cautionFee + details.legalFee + details.agencyFee + details.serviceCharge;
      }

      const priceNum = parseFloat(propertyPrice) || 0;
      const priceLabel = propertySubType === "shortlet_hotel"
        ? (propertyPrice ? `from ₦${parseFloat(propertyPrice).toLocaleString()}/night` : "")
        : propertySubType === "rent"
          ? (priceNum ? `₦${priceNum.toLocaleString()}${details.billingLabel || ""}` : "")
          : propertySubType === "land"
            ? (priceNum ? `₦${priceNum.toLocaleString()}${landSaleType === "sale" ? "" : "/" + (landSaleType === "rent" ? "yr" : "lease")}` : "")
            : propertySubType === "commercial"
              ? (priceNum ? `₦${priceNum.toLocaleString()}${details.billingLabel || ""}` : "")
              : (priceNum ? `₦${priceNum.toLocaleString()}/night` : "");

      const typeLabel = propertySubType === "rent"
        ? (rentHouseType || "Apartment")
        : propertySubType === "shortlet_hotel"
          ? "Shortlet & Hotel"
          : propertySubType === "land"
            ? "Land"
            : commercialType || "Commercial";

      const propertyPayload: any = {
        title: title.trim(),
        description: description.trim(),
        propertySubType,
        type: typeLabel,
        ...details,
        price: priceLabel,
        priceNum,
        location: fullLocation,
        state,
        city,
        streetAddress,
        lat: mapLat || null,
        lon: mapLon || null,
        businessId: isIndividual ? null : propListAsBizId,
        businessName: isIndividual ? (user.name || user.email || "Individual Listing") : (selectedPropBiz?.title || selectedPropBiz?.businessName || ""),
        sellerType: isIndividual ? "individual" : "business",
        image: primaryImage,
        images: uploadedImageUrls.length > 0 ? uploadedImageUrls : [primaryImage],
        imagePublicIds: uploadedImagePublicIds.length > 0 ? uploadedImagePublicIds : (uploadedImagePublicId ? [uploadedImagePublicId] : []),
        ownerId: user.id,
        bedrooms: details.bedrooms || 0,
        bathrooms: details.bathrooms || 0,
        guests: details.maxGuests || 0,
        amenities: selectedAmenities,
        // Mini-site flag: only Shortlet & Hotel qualify as mini-sites;
        // Rent, Land, Commercial are standard Marketplace listings.
        miniSiteActive: propertySubType === "shortlet_hotel",
        status: "Pending",
        rating: 0,
        reviews: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (!isIndividual && propListAsBizId) {
        await addDoc(collection(db, "businesses", propListAsBizId, "properties"), propertyPayload);
      }
      try {
        await createProperty.mutateAsync(propertyPayload);
      } catch (e) {
        console.warn("Legacy house_listings write note:", e);
      }
      logActivity({ userId: user.id, userEmail: user.email, userName: user.name, action: "create_listing", targetType: "property", targetName: title, details: `Created ${propertySubType} property: ${title}${isIndividual ? " (individual)" : ""}` });
      toast({ title: "Property listed!" });
      resetWizard();
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to list property", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!user?.id) { navigate("/auth"); return; }
    if (!title.trim()) {
      toast({ title: "Please enter an event title", variant: "destructive" });
      return;
    }
    if (!selectedState) {
      toast({ title: "Please select an event location / state", variant: "destructive" });
      return;
    }
    if (!eventStartDate) {
      toast({ title: "Please provide an event start date", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const fullLocation = [eventVenue, eventLocation || streetAddress, selectedCity, selectedState].filter(Boolean).join(", ");
      const validTickets = ticketTypes
        .filter((t) => t.name.trim())
        .map((t) => ({
          name: t.name.trim(),
          price: Number(t.price) || 0,
          quantity: Number(t.quantity) || 100,
        }));

      const primaryImage = uploadedImageUrl || getMockImage(eventCategory || "Event");

      await createEvent.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        category: eventCategory || "General",
        tags: [eventCategory || "General"],
        location: fullLocation,
        venue: eventVenue.trim(),
        eventLocation: eventLocation || streetAddress,
        streetAddress: streetAddress || eventLocation,
        state: selectedState,
        city: selectedCity || "",
        lat: mapLat || null,
        lon: mapLon || null,
        startDate: eventStartDate,
        endDate: eventEndDate || eventStartDate,
        startTime: eventStartTime || "",
        endTime: eventEndTime || "",
        ticketTypes: validTickets.length > 0 ? validTickets : [{ name: "General Admission", price: 0, quantity: 100 }],
        image: primaryImage,
        imageUrl: primaryImage,
        imagePublicId: uploadedImagePublicId || "",
        ownerId: user.id,
        organizerId: user.id,
        organizerName: user.name || "Event Organizer",
        isActive: true,
        rating: 0,
      });

      qc.invalidateQueries({ queryKey: ["myListings"] });
      qc.invalidateQueries({ queryKey: ["events_all"] });
      qc.invalidateQueries({ queryKey: ["events"] });

      logActivity({
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        action: "create_event",
        targetType: "event",
        targetName: title,
        details: `Created event: ${title}`,
      });
      toast({ title: "Event published successfully!" });
      resetWizard();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Failed to create event", description: err?.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const reloadListings = () => {
    // Mutations auto-invalidate queries, no manual reload needed
  };

  const getCollectionForType = (type: string) => {
    switch (type) {
      case "business":
      case "restaurant": return "businesses";
      case "event": return "events";
      case "product": return "marketplace";
      case "property": return "house_listings";
      default: return "businesses";
    }
  };

  const handleDeleteClick = (id: string, type: string, title: string) => {
    setDeleteTarget({ id, type, title });
    setDeleteStep(1);
  };

  const confirmDeleteStep1 = () => {
    setDeleteStep(2);
  };

  const confirmDeleteStep2 = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // Best-effort: delete Cloudinary images
      try {
        const collectionName = getCollectionForType(deleteTarget.type);
        const snap = await getDoc(doc(db, collectionName, deleteTarget.id));
        if (snap.exists()) {
          const data = snap.data() as any;
          const publicIds = collectPublicIdsForListing(data);
          if (publicIds.length > 0) {
            await deleteImagesFromCloudinary(publicIds);
          }
        }
      } catch (e) {
        console.error("Cloudinary delete error (non-blocking):", e);
      }

      // Delete Firestore document
      if (deleteTarget.type === "product") {
        await deleteProduct.mutateAsync(deleteTarget.id);
      } else if (deleteTarget.type === "property") {
        await deleteProperty.mutateAsync(deleteTarget.id);
      } else if (deleteTarget.type === "event") {
        await deleteEvent.mutateAsync(deleteTarget.id);
      } else {
        await deleteListing.mutateAsync(deleteTarget.id);
      }

      // Log activity
      if (user) {
        logActivity({
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          action: deleteTarget.type === "event" ? "delete_event" : "delete_listing",
          targetType: deleteTarget.type as any,
          targetId: deleteTarget.id,
          targetName: deleteTarget.title,
          details: `Deleted ${deleteTarget.type}: ${deleteTarget.title}`,
        });
      }

      toast({ title: `"${deleteTarget.title}" deleted.` });
      setDeleteTarget(null);
      setDeleteStep(0);
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to delete listing", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
    setDeleteStep(0);
  };

  const handleEditClick = async (item: ListingItem, type: string) => {
    const collectionName = getCollectionForType(type);
    try {
      const snap = await getDoc(doc(db, collectionName, item.id));
      if (!snap.exists()) {
        toast({ title: "Listing not found", variant: "destructive" });
        return;
      }
      const raw = snap.data() as any;
      setEditTarget({ id: item.id, type, data: raw });
      setEditTitle(raw.title || "");
      setEditDescription(raw.description || "");
      setEditCategory(raw.category || "");
      setEditState((raw.state as NigerianState) || "");
      setEditCity(raw.city || "");
      setEditStreetAddress(raw.streetAddress || "");
      setEditPhone(raw.phone || "");
      setEditImageUrl(raw.image || "");
      setEditImagePublicId(raw.imagePublicId || "");
      setEditMapLat(raw.lat || undefined);
      setEditMapLon(raw.lon || undefined);
      // Product-specific fields
      if (type === "product") {
        setEditProductPrice(String(raw.price || ""));
        setEditPromoPrice(String(raw.promoPrice || ""));
        setEditProductCategory(raw.productCategory || raw.category || "");
      }
      // Event-specific fields
      if (type === "event") {
        setEditEventCategory(raw.tags?.[0] || raw.category || "");
        setEditEventStartDate(raw.startDate || "");
        setEditEventEndDate(raw.endDate || "");
        setEditEventStartTime(raw.startTime || "");
        setEditEventEndTime(raw.endTime || "");
        setEditEventVenue(raw.venue || "");
        setEditEventLocation(raw.eventLocation || "");
        setEditTicketTypes((raw.ticketTypes || []).map((t: any) => ({
          name: t.name || "",
          price: String(t.price || ""),
          quantity: String(t.quantity || ""),
        })));
      }
      setEditOpen(true);
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to load listing", variant: "destructive" });
    }
  };

  const handleUpdateListing = async () => {
    if (!editTarget || !editTitle.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setEditSaving(true);
    try {
      const fullLocation = [editCity, editState].filter(Boolean).join(", ");
      const updateData: any = {
        title: editTitle.trim(),
        description: editDescription.trim(),
        category: editCategory,
        state: editState,
        city: editCity,
        streetAddress: editStreetAddress.trim(),
        phone: editPhone.trim(),
        image: editImageUrl,
        location: fullLocation,
        lat: editMapLat || null,
        lon: editMapLon || null,
      };
      if (editTarget.type === "product") {
        updateData.price = Number(editProductPrice) || 0;
        updateData.promoPrice = Number(editPromoPrice) || 0;
        updateData.productCategory = editProductCategory;
        await updateProduct.mutateAsync({ id: editTarget.id, data: updateData });
      } else if (editTarget.type === "event") {
        updateData.tags = [editEventCategory || "General"];
        updateData.startDate = editEventStartDate;
        updateData.endDate = editEventEndDate;
        updateData.startTime = editEventStartTime;
        updateData.endTime = editEventEndTime;
        updateData.venue = editEventVenue;
        updateData.eventLocation = editEventLocation;
        updateData.ticketTypes = editTicketTypes.filter(t => t.name.trim()).map(t => ({
          name: t.name,
          price: Number(t.price) || 0,
          quantity: Number(t.quantity) || 0,
        }));
        await updateEvent.mutateAsync({ id: editTarget.id, data: updateData });
      } else if (editTarget.type === "property") {
        await updateProperty.mutateAsync({ id: editTarget.id, data: updateData });
      } else {
        await updateListing.mutateAsync({ id: editTarget.id, data: updateData });
      }
      toast({ title: "Listing updated!" });
      if (user) {
        logActivity({ userId: user.id, userEmail: user.email, userName: user.name, action: editTarget.type === "event" ? "edit_event" : "edit_listing", targetType: editTarget.type as any, targetId: editTarget.id, targetName: editTitle, details: `Updated ${editTarget.type}: ${editTitle}` });
      }
      setEditOpen(false);
      setEditTarget(null);
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to update listing", variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  };

  // ── WIZARD FORMS ──

  const renderBusinessForm = () => (
    <div className="space-y-4 py-2">
      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Business Name *</Label>
        <Input className="mt-1.5" placeholder="e.g. Glokakes Bakehouse" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category *</Label>
        <Select value={bizCategory} onValueChange={setBizCategory}>
          <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>
            {BUSINESS_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">State *</Label>
        <Select value={selectedState} onValueChange={(v) => { setSelectedState(v as NigerianState); setSelectedCity(""); }}>
          <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select state" /></SelectTrigger>
          <SelectContent>
            {NIGERIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {selectedState && (
        <div>
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">City / Area</Label>
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select area" /></SelectTrigger>
            <SelectContent>
              {(STATE_CITIES[selectedState] || []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Location on Map</Label>
        <p className="text-xs text-muted-foreground mt-1 mb-2">Type your address and confirm the pin location</p>
        <AddressPicker
          onLocationConfirmed={(data) => { setStreetAddress(data.address); setMapLat(data.lat); setMapLon(data.lon); }}
          initialAddress={streetAddress}
          initialLat={mapLat}
          initialLon={mapLon}
        />
      </div>
      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone Number *</Label>
        <Input className="mt-1.5" placeholder="+234 801 234 5678" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">About / Description *</Label>
        <Textarea className="mt-1.5" placeholder="Tell people about your business..." rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Images (first image is cover)</Label>
        <MultiImageUpload
          onUploadSuccess={(r) => {
            setBizImages((prev) => [...prev, r.secureUrl]);
            setBizImagePublicIds((prev) => [...prev, r.publicId]);
          }}
          onRemove={(idx) => {
            setBizImages((prev) => prev.filter((_, i) => i !== idx));
            setBizImagePublicIds((prev) => prev.filter((_, i) => i !== idx));
          }}
          folder={CLOUDINARY_FOLDERS.BUSINESSES}
          currentImages={bizImages}
          buttonText="Add Image"
          maxImages={10}
        />
      </div>
    </div>
  );

  const renderProductForm = () => (
    <div className="space-y-4 py-2">
      {/* Seller Profile / Storefront Link */}
      {myBusinesses.length > 0 ? (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Seller Profile / Storefront</Label>
            <span className="text-[11px] text-muted-foreground">Optional Store Link</span>
          </div>
          <Select value={listAsBizId} onValueChange={setListAsBizId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select Seller Profile" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Independent Citizen Seller (Direct Listing)</SelectItem>
              {myBusinesses.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.title} (Registered Business)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedBiz && listAsBizId !== "individual" && (
            <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 text-xs text-primary font-medium">
              <Store className="w-4 h-4 shrink-0" />
              <span>Item will be linked to <strong>{selectedBiz.title}</strong> and featured on the Marketplace.</span>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground">Listing as Citizen Seller</p>
            <p className="text-[11px] text-muted-foreground">Your item will be directly published to Citivas Marketplace for buyers to discover.</p>
          </div>
        </div>
      )}

      {/* Product Photos */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Product Photos</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Upload clear photos of your product. First photo will be the main cover.</p>
          </div>
          {productImages.length > 0 && (
            <Badge variant="secondary" className="font-semibold text-xs">
              {productImages.length} photo{productImages.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <MultiImageUpload
          onUploadSuccess={(r) => {
            setProductImages((prev) => [...prev, r.secureUrl]);
            setProductImagePublicIds((prev) => [...prev, r.publicId]);
            if (!uploadedImageUrl) setUploadedImageUrl(r.secureUrl);
          }}
          onRemove={(idx) => {
            setProductImages((prev) => prev.filter((_, i) => i !== idx));
            setProductImagePublicIds((prev) => prev.filter((_, i) => i !== idx));
          }}
          folder={CLOUDINARY_FOLDERS.MARKETPLACE}
          currentImages={productImages}
          buttonText="Upload Product Photos"
          maxImages={8}
        />
      </div>

      {/* Product Details */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
          <Info className="w-4 h-4 text-primary" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Product Information</h4>
        </div>

        <div>
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Product Title *</Label>
          <Input
            className="mt-1.5"
            placeholder="e.g. Brand New iPhone 15 Pro Max 256GB Natural Titanium"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category *</Label>
            <Select value={productCategory} onValueChange={setProductCategory}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {[
                  "Phones & Tablets",
                  "Electronics & Gadgets",
                  "Fashion & Apparel",
                  "Home, Kitchen & Furniture",
                  "Beauty & Personal Care",
                  "Vehicles & Automotive",
                  "Sports, Fitness & Outdoor",
                  "Food & Provisions",
                  "Services & Freelance",
                  "Baby & Kids",
                  "Health & Wellness",
                  "Other"
                ].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Condition</Label>
            <Select value={itemCondition} onValueChange={setItemCondition}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                {[
                  "Brand New",
                  "Like New / Open Box",
                  "Refurbished",
                  "Used - Excellent",
                  "Used - Good",
                  "Used - Fair"
                ].map((cond) => (
                  <SelectItem key={cond} value={cond}>{cond}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description *</Label>
          <Textarea
            className="mt-1.5"
            rows={3}
            placeholder="Describe your item, key specifications, warranty, what's included in the package, etc..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      {/* Pricing */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
          <BarChart2 className="w-4 h-4 text-primary" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Pricing & Offers</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Regular Price (₦) *</Label>
            <Input
              type="number"
              className="mt-1.5"
              placeholder="e.g. 150000"
              value={productPrice}
              onChange={(e) => setProductPrice(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Promo Price (₦) <span className="text-muted-foreground/60 normal-case font-normal">(Optional)</span>
            </Label>
            <Input
              type="number"
              className="mt-1.5"
              placeholder="e.g. 120000"
              value={promoPrice}
              onChange={(e) => setPromoPrice(e.target.value)}
            />
          </div>
        </div>

        {promoPrice && productPrice && Number(productPrice) > Number(promoPrice) && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg px-3 py-2 text-xs font-medium flex items-center justify-between">
            <span>Special promo discount active</span>
            <span className="font-bold">
              Save ₦{(Number(productPrice) - Number(promoPrice)).toLocaleString()} ({Math.round(((Number(productPrice) - Number(promoPrice)) / Number(productPrice)) * 100)}% off)
            </span>
          </div>
        )}
      </div>

      {/* Location & Contact */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
          <MapPin className="w-4 h-4 text-primary" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Location & Contact</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">State *</Label>
            <Select value={selectedState} onValueChange={(v) => { setSelectedState(v as NigerianState); setSelectedCity(""); }}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {NIGERIAN_STATES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">City / Area *</Label>
            <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedState}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder={selectedState ? "Select area" : "Choose state first"} />
              </SelectTrigger>
              <SelectContent>
                {(STATE_CITIES[selectedState] || []).map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pickup Location / Landmark</Label>
            <Input
              className="mt-1.5"
              placeholder="e.g. Lekki Phase 1, Admiralty Way"
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone / WhatsApp Number</Label>
            <Input
              className="mt-1.5"
              placeholder="e.g. 08012345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderPropertyForm = () => (
    <div className="space-y-4 py-2">
      {/* Always offer mini-site wizard as a shortcut banner */}
      <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-center space-y-1.5">
        <Hotel className="w-6 h-6 text-primary mx-auto" />
        <h4 className="font-bold text-xs text-foreground">Shortlet, Hotel & Villa Mini-Site</h4>
        <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
          Nightly stays, serviced apartments, hotels & guest houses use the full booking wizard.
        </p>
      </div>

      {/* Property Sub-Type Selector — always shown regardless of businesses */}
      {!propertySubType ? (
        <div className="space-y-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">WHAT TYPE OF PROPERTY?</h4>
            <p className="text-xs text-muted-foreground mt-1">Select the category of property you want to list</p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {PROPERTY_SUB_TYPES.map((st) => (
              <button
                key={st.value}
                type="button"
                onClick={() => {
                  if (st.value === "shortlet_hotel") {
                    setCreateOpen(false);
                    navigate("/mini-site-wizard");
                    return;
                  }
                  setPropertySubType(st.value);
                }}
                className="flex items-center gap-3 p-4 rounded-xl border border-border/60 hover:border-primary/50 hover:bg-primary/[0.04] transition-all text-left bg-card"
              >
                <span className="text-2xl">{st.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{st.label}</p>
                  <p className="text-xs text-muted-foreground">{st.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Sub-type badge + change button */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              {PROPERTY_SUB_TYPES.find((s) => s.value === propertySubType)?.icon}{' '}
              {PROPERTY_SUB_TYPES.find((s) => s.value === propertySubType)?.label}
            </Badge>
            <button type="button" onClick={() => setPropertySubType("")} className="text-xs text-primary hover:underline">Change</button>
          </div>

          {/* Seller Profile / optional business link */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Seller Profile (Optional)</Label>
              <span className="text-[11px] text-muted-foreground">Link to an agency or list as individual</span>
            </div>
            <Select value={propListAsBizId} onValueChange={setPropListAsBizId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Individual Listing (no business)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual Listing (Direct)</SelectItem>
                {myBusinesses.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.title} (Registered)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPropBiz && propListAsBizId !== "individual" && (
              <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 text-xs text-primary font-medium">
                <Store className="w-4 h-4 shrink-0" />
                <span>Linked to <strong>{selectedPropBiz.title}</strong></span>
              </div>
            )}
          </div>

          {/* ── Location Section — independent, always shown ── */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-border/60">
              <MapPin className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Location</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">State *</Label>
                <Select
                  value={selectedState}
                  onValueChange={(v) => { setSelectedState(v as NigerianState); setSelectedCity(""); }}
                >
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {NIGERIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">City / Area</Label>
                <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedState}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={selectedState ? "Select area" : "Select state first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(STATE_CITIES[selectedState] || []).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Full Street Address</Label>
              <Input
                className="mt-1"
                placeholder="House number, street name, estate, landmark"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Pin on Map (optional)</Label>
              <p className="text-[10px] text-muted-foreground mt-0.5 mb-1.5">Confirm the exact location for GIS lookup</p>
              <AddressPicker
                onLocationConfirmed={(data) => { setStreetAddress(data.address); setMapLat(data.lat); setMapLon(data.lon); }}
                initialAddress={streetAddress}
                initialLat={mapLat}
                initialLon={mapLon}
              />
            </div>
          </div>

          {/* Common fields */}
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Property Title *</Label>
            <Input className="mt-1.5" placeholder="e.g. Modern 2-Bedroom in GRA" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description *</Label>
            <Textarea className="mt-1.5" placeholder="Describe your property..." rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {/* ── RENT FIELDS ── */}
          {propertySubType === "rent" && (
            <div className="space-y-4 p-4 rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Home className="w-4 h-4 text-primary" />
                <p className="text-xs font-bold uppercase tracking-wider text-foreground">House / Apartment for Rent</p>
              </div>

              <div>
                <Label className="text-xs font-semibold">Property Type / House Type *</Label>
                <Select value={rentHouseType} onValueChange={setRentHouseType}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Duplex">Duplex</SelectItem>
                    <SelectItem value="Bungalow">Bungalow</SelectItem>
                    <SelectItem value="Terraced Duplex">Terraced Duplex</SelectItem>
                    <SelectItem value="Semi-Detached Duplex">Semi-Detached Duplex</SelectItem>
                    <SelectItem value="Detached Duplex">Detached Duplex</SelectItem>
                    <SelectItem value="Flat / Apartment">Flat / Apartment</SelectItem>
                    <SelectItem value="Mini Flat">Mini Flat (1 Bedroom)</SelectItem>
                    <SelectItem value="Room & Parlour">Room & Parlour</SelectItem>
                    <SelectItem value="Penthouse">Penthouse</SelectItem>
                    <SelectItem value="Mansion">Mansion</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Annual Rent (₦) *</Label>
                  <Input className="mt-1" type="number" placeholder="e.g. 1500000" value={propertyPrice} onChange={(e) => setPropertyPrice(e.target.value)} />
                  <p className="text-[10px] text-muted-foreground mt-1">Base rent before fees</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Payment Plan *</Label>
                  <Select value={rentBillingPeriod} onValueChange={setRentBillingPeriod}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select plan" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1 Year">1 Year (Annual)</SelectItem>
                      <SelectItem value="2 Years">2 Years</SelectItem>
                      <SelectItem value="1.5 Years">1.5 Years (1 Year + 6 Months)</SelectItem>
                      <SelectItem value="6 Months">6 Months</SelectItem>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Bedrooms *</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <button type="button" onClick={() => setRentBedrooms(Math.max(0, rentBedrooms - 1))} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted">-</button>
                    <span className="w-8 text-center text-sm font-bold">{rentBedrooms}</span>
                    <button type="button" onClick={() => setRentBedrooms(rentBedrooms + 1)} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted">+</button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Bathrooms *</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <button type="button" onClick={() => setRentBathrooms(Math.max(0, rentBathrooms - 1))} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted">-</button>
                    <span className="w-8 text-center text-sm font-bold">{rentBathrooms}</span>
                    <button type="button" onClick={() => setRentBathrooms(rentBathrooms + 1)} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted">+</button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                  <div>
                    <Label className="text-xs font-semibold">Kitchen with Store?</Label>
                    <p className="text-[10px] text-muted-foreground">Store room attached</p>
                  </div>
                  <button type="button" onClick={() => setRentHasStore(!rentHasStore)} className={`w-10 h-6 rounded-full relative transition-colors ${rentHasStore ? "bg-primary" : "bg-muted-foreground/30"}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all`} style={{ left: rentHasStore ? "18px" : "2px" }} />
                  </button>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Furnishing</Label>
                  <Select value={rentFurnishing} onValueChange={setRentFurnishing}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {FURNISHING_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold">Road Condition</Label>
                <Select value={rentRoadCondition} onValueChange={setRentRoadCondition}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select condition" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tarred">Tarred Road</SelectItem>
                    <SelectItem value="Motorable">Motorable (Untarred but Passable)</SelectItem>
                    <SelectItem value="Bad">Bad Road (Difficult Access)</SelectItem>
                    <SelectItem value="Gated Estate">Gated Estate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Photo of Access Road</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5 mb-1">Upload a picture of the road leading to the house</p>
                {rentRoadImage ? (
                  <div className="relative w-full aspect-[16/9] rounded-lg border border-border overflow-hidden mt-1">
                    <img src={rentRoadImage} alt="Road" className="w-full h-full object-contain bg-muted" />
                    <button
                      type="button"
                      onClick={() => { setRentRoadImage(""); setRentRoadImagePublicId(""); }}
                      className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-md shadow"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <ImageUpload
                    onUploadSuccess={(r) => { setRentRoadImage(r.secureUrl); setRentRoadImagePublicId(r.publicId); }}
                    folder={CLOUDINARY_FOLDERS.BUSINESSES}
                    currentImage={rentRoadImage}
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Service Charge (₦)</Label>
                  <Input className="mt-1" type="number" placeholder="e.g. 150000" value={rentServiceCharge} onChange={(e) => setRentServiceCharge(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Caution Fee (₦)</Label>
                  <Input className="mt-1" type="number" placeholder="e.g. 200000" value={rentCautionFee} onChange={(e) => setRentCautionFee(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Legal Fee (₦)</Label>
                  <Input className="mt-1" type="number" placeholder="e.g. 75000" value={rentLegalFee} onChange={(e) => setRentLegalFee(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Agency Fee (₦)</Label>
                  <Input className="mt-1" type="number" placeholder="e.g. 150000 (10%)" value={rentAgencyFee} onChange={(e) => setRentAgencyFee(e.target.value)} />
                  <p className="text-[10px] text-muted-foreground mt-1">Typically 10% of rent</p>
                </div>
              </div>
              {(propertyPrice || rentCautionFee || rentLegalFee || rentAgencyFee || rentServiceCharge) && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs">
                  <p className="font-bold text-primary mb-1">Total Move-in Cost Preview</p>
                  <p className="font-mono font-bold">
                    ₦{(
                      (Number(propertyPrice) || 0) +
                      (Number(rentCautionFee || rentDeposit) || 0) +
                      (Number(rentLegalFee) || 0) +
                      (Number(rentAgencyFee) || 0) +
                      (Number(rentServiceCharge) || 0)
                    ).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Rent + Caution + Legal + Agency + Service</p>
                </div>
              )}
              <div>
                <Label className="text-xs font-semibold">Available From *</Label>
                <Input className="mt-1" type="date" value={rentAvailableFrom} onChange={(e) => setRentAvailableFrom(e.target.value)} />
              </div>
            </div>
          )}

          {/* ── SHORTLET & HOTEL → Redirect to wizard (fallback) ── */}
          {propertySubType === "shortlet_hotel" && (
            <div className="space-y-3 p-4 rounded-xl border border-primary/30 bg-primary/5 text-center">
              <Hotel className="w-8 h-8 text-primary mx-auto" />
              <p className="text-sm font-bold text-foreground">Shortlet & Hotel Setup</p>
              <p className="text-xs text-muted-foreground">This property type uses the mini-site wizard for a guided setup experience.</p>
              <button type="button" onClick={() => { setCreateOpen(false); navigate("/mini-site-wizard"); }} className="text-sm font-bold text-primary hover:underline">
                Open Full Wizard &rarr;
              </button>
            </div>
          )}

          {/* ── LAND FIELDS ── */}
          {propertySubType === "land" && (
            <div className="space-y-4 p-4 rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2 pb-2 border-b">
                <span className="text-lg">📐</span>
                <p className="text-xs font-bold uppercase tracking-wider text-foreground">Land Details</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Price (₦) *</Label>
                  <Input className="mt-1" type="number" placeholder="e.g. 25000000" value={propertyPrice} onChange={(e) => setPropertyPrice(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Sale Type</Label>
                  <Select value={landSaleType} onValueChange={setLandSaleType}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">Full Sale (Outright Purchase)</SelectItem>
                      <SelectItem value="rent">Hire / Rent</SelectItem>
                      <SelectItem value="lease">Lease (Long-term)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Land Use Type</Label>
                  <Select value={landUseType} onValueChange={setLandUseType}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select use" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Residential">Residential</SelectItem>
                      <SelectItem value="Commercial">Commercial</SelectItem>
                      <SelectItem value="Agricultural">Agricultural / Farm</SelectItem>
                      <SelectItem value="Industrial">Industrial</SelectItem>
                      <SelectItem value="Mixed-Use">Mixed-Use</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Title Document *</Label>
                  <Select value={landTitleType} onValueChange={setLandTitleType}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select title" /></SelectTrigger>
                    <SelectContent>
                      {LAND_TITLE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Plot Size *</Label>
                  <Input className="mt-1" type="number" placeholder="e.g. 500" value={landPlotSize} onChange={(e) => setLandPlotSize(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Unit *</Label>
                  <Select value={landSizeUnit} onValueChange={setLandSizeUnit}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LAND_SIZE_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Topography</Label>
                  <Select value={landTopography} onValueChange={setLandTopography}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dry Flat">Dry & Flat</SelectItem>
                      <SelectItem value="Dry Sloped">Dry & Sloped</SelectItem>
                      <SelectItem value="Wetland">Wetland / Waterlogged</SelectItem>
                      <SelectItem value="Rocky">Rocky / Hilly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Access Road</Label>
                  <Select value={landAccessRoad} onValueChange={setLandAccessRoad}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tarred">Tarred Road</SelectItem>
                      <SelectItem value="Untarred Graded">Graded / Untarred</SelectItem>
                      <SelectItem value="Bush Path">Bush Path</SelectItem>
                      <SelectItem value="No Road">No Road Access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                  <div>
                    <Label className="text-xs font-semibold">Fenced?</Label>
                    <p className="text-[10px] text-muted-foreground">Perimeter fenced</p>
                  </div>
                  <button type="button" onClick={() => setLandFenced(!landFenced)} className={`w-10 h-6 rounded-full relative transition-colors ${landFenced ? "bg-primary" : "bg-muted-foreground/30"}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all`} style={{ left: landFenced ? "18px" : "2px" }} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                  <div>
                    <Label className="text-xs font-semibold">Survey Plan?</Label>
                    <p className="text-[10px] text-muted-foreground">Available & verified</p>
                  </div>
                  <button type="button" onClick={() => setLandSurveyPlan(!landSurveyPlan)} className={`w-10 h-6 rounded-full relative transition-colors ${landSurveyPlan ? "bg-primary" : "bg-muted-foreground/30"}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all`} style={{ left: landSurveyPlan ? "18px" : "2px" }} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Latitude (optional)</Label>
                  <Input className="mt-1" type="number" step="0.000001" placeholder="e.g. 4.8156" value={mapLat ?? ""} onChange={(e) => setMapLat(e.target.value ? parseFloat(e.target.value) : undefined)} />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Longitude (optional)</Label>
                  <Input className="mt-1" type="number" step="0.000001" placeholder="e.g. 7.0498" value={mapLon ?? ""} onChange={(e) => setMapLon(e.target.value ? parseFloat(e.target.value) : undefined)} />
                </div>
              </div>
            </div>
          )}

          {/* ── COMMERCIAL FIELDS ── */}
          {propertySubType === "commercial" && (
            <div className="space-y-4 p-4 rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2 pb-2 border-b">
                <span className="text-lg">🏢</span>
                <p className="text-xs font-bold uppercase tracking-wider text-foreground">Commercial — Halls, Offices, Shops, Warehouses</p>
              </div>
              <div>
                <Label className="text-xs font-semibold">Commercial Type *</Label>
                <Select value={commercialType} onValueChange={setCommercialType}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hall/Event Center">Hall / Event Center</SelectItem>
                    <SelectItem value="Office Space">Office Space</SelectItem>
                    <SelectItem value="Shop/Retail">Shop / Retail Store</SelectItem>
                    <SelectItem value="Warehouse">Warehouse / Storage</SelectItem>
                    <SelectItem value="Plaza/Complex">Plaza / Shopping Complex Unit</SelectItem>
                    <SelectItem value="Co-working Space">Co-working Space</SelectItem>
                    <SelectItem value="Restaurant Space">Restaurant / Eatery Space</SelectItem>
                    <SelectItem value="Filling Station">Filling Station</SelectItem>
                    <SelectItem value="Church/Mosque Space">Church / Mosque Space</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Rent / Price (₦) *</Label>
                  <Input className="mt-1" type="number" placeholder="e.g. 5000000" value={propertyPrice} onChange={(e) => setPropertyPrice(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Billing Period *</Label>
                  <Select value={commercialBillingPeriod} onValueChange={setCommercialBillingPeriod}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Per Annum">Per Annum (1 Year)</SelectItem>
                      <SelectItem value="Per 2 Years">Per 2 Years</SelectItem>
                      <SelectItem value="Per 6 Months">Per 6 Months</SelectItem>
                      <SelectItem value="Per Month">Per Month</SelectItem>
                      <SelectItem value="Per Event">Per Event / Day (Hall)</SelectItem>
                      <SelectItem value="Outright Sale">Outright Sale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Space Size (sqm) *</Label>
                  <Input className="mt-1" type="number" placeholder="e.g. 250" value={commercialSpaceSize} onChange={(e) => setCommercialSpaceSize(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Capacity (people)</Label>
                  <Input className="mt-1" type="number" placeholder="e.g. 300 for hall" value={commercialCapacity} onChange={(e) => setCommercialCapacity(e.target.value)} />
                  <p className="text-[10px] text-muted-foreground mt-1">Seats / occupancy for halls</p>
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold mb-2 block">Amenities</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { k: "commercialHasParking", v: commercialHasParking, s: setCommercialHasParking, label: "Parking" },
                    { k: "commercialHasSecurity", v: commercialHasSecurity, s: setCommercialHasSecurity, label: "Security" },
                    { k: "commercialHasWater", v: commercialHasWater, s: setCommercialHasWater, label: "Water Supply" },
                    { k: "commercialHasPower", v: commercialHasPower, s: setCommercialHasPower, label: "Power / Electricity" },
                    { k: "commercialHasAC", v: commercialHasAC, s: setCommercialHasAC, label: "Air Conditioning" },
                    { k: "commercialHasInternet", v: commercialHasInternet, s: setCommercialHasInternet, label: "WiFi / Internet" },
                    { k: "commercialHasElevator", v: commercialHasElevator, s: setCommercialHasElevator, label: "Elevator / Lift" },
                    { k: "commercialHasCanteen", v: commercialHasCanteen, s: setCommercialHasCanteen, label: "Canteen / Kitchen" },
                  ].map(({ v, s, label }) => (
                    <div key={label} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20">
                      <Label className="text-[11px] font-medium">{label}</Label>
                      <button type="button" onClick={() => s(!v)} className={`w-9 h-5 rounded-full relative transition-colors ${v ? "bg-primary" : "bg-muted-foreground/30"}`}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow`} style={{ left: v ? "16px" : "2px" }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Service Charge (₦)</Label>
                  <Input className="mt-1" type="number" placeholder="e.g. 300000" value={commercialServiceCharge} onChange={(e) => setCommercialServiceCharge(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Caution Fee (₦)</Label>
                  <Input className="mt-1" type="number" placeholder="e.g. 500000" value={commercialCautionFee} onChange={(e) => setCommercialCautionFee(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Legal Fee (₦)</Label>
                  <Input className="mt-1" type="number" placeholder="e.g. 100000" value={commercialLegalFee} onChange={(e) => setCommercialLegalFee(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Agency Fee (₦)</Label>
                  <Input className="mt-1" type="number" placeholder="e.g. 500000 (10%)" value={commercialAgencyFee} onChange={(e) => setCommercialAgencyFee(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold mb-2 block">Suitable For</Label>
                <div className="flex flex-wrap gap-2">
                  {COMMERCIAL_USAGES.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setCommercialUsages((prev) => prev.includes(u) ? prev.filter((x) => x !== u) : [...prev, u])}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        commercialUsages.includes(u) ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Cover Image + Gallery */}
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Images (first image is cover)</Label>
            <MultiImageUpload
              onUploadSuccess={(r) => {
                setUploadedImageUrls((prev) => [...prev, r.secureUrl]);
                setUploadedImagePublicIds((prev) => [...prev, r.publicId]);
              }}
              onRemove={(idx) => {
                setUploadedImageUrls((prev) => prev.filter((_, i) => i !== idx));
                setUploadedImagePublicIds((prev) => prev.filter((_, i) => i !== idx));
              }}
              folder={CLOUDINARY_FOLDERS.BUSINESSES}
              currentImages={uploadedImageUrls}
              buttonText="Add Image"
              maxImages={10}
            />
          </div>
        </>
      )}
    </div>
  );

  const renderEventForm = () => (
    <div className="py-2">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ── Left Column (2/3): General Info, Schedule, Tickets ── */}
        <div className="md:col-span-2 space-y-4">
          {/* General Information */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
              <Info className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wider">General Information</h3>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Event Title *</Label>
                <Input className="mt-1.5" placeholder="e.g. Lagos Food & Wine Festival" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Event Category</Label>
                  <Select value={eventCategory} onValueChange={setEventCategory}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {EVENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Venue Name</Label>
                  <Input className="mt-1.5" placeholder="e.g. Eko Atlantic" value={eventVenue} onChange={(e) => setEventVenue(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description *</Label>
                <Textarea className="mt-1.5" rows={3} placeholder="Describe your event..." value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Schedule & Contact */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
              <CalendarClock className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Schedule & Contact</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Start Date *</Label>
                  <Input type="date" className="mt-1.5" value={eventStartDate} onChange={(e) => setEventStartDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">End Date *</Label>
                  <Input type="date" className="mt-1.5" value={eventEndDate} onChange={(e) => setEventEndDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">State *</Label>
                  <Select value={selectedState} onValueChange={(v) => { setSelectedState(v as NigerianState); setSelectedCity(""); }}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>
                      {NIGERIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">City / Area</Label>
                  <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedState}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder={selectedState ? "Select area" : "Select state first"} /></SelectTrigger>
                    <SelectContent>
                      {(STATE_CITIES[selectedState] || []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Start Time</Label>
                  <Input type="time" className="mt-1.5" value={eventStartTime} onChange={(e) => setEventStartTime(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">End Time</Label>
                  <Input type="time" className="mt-1.5" value={eventEndTime} onChange={(e) => setEventEndTime(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Ticket Settings */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
              <Ticket className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Ticket Settings</h3>
            </div>
            <div className="space-y-2">
              {ticketTypes.length > 0 && (
                <div className="grid grid-cols-12 gap-2 px-1">
                  <span className="col-span-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Tier Name</span>
                  <span className="col-span-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Price (₦)</span>
                  <span className="col-span-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Capacity</span>
                  <span className="col-span-1" />
                </div>
              )}
              {ticketTypes.map((ticket, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <Input placeholder="e.g. Regular" value={ticket.name} onChange={(e) => { const copy = [...ticketTypes]; copy[i] = { ...copy[i], name: e.target.value }; setTicketTypes(copy); }} />
                  </div>
                  <div className="col-span-3">
                    <Input type="number" placeholder="0" value={ticket.price} onChange={(e) => { const copy = [...ticketTypes]; copy[i] = { ...copy[i], price: e.target.value }; setTicketTypes(copy); }} />
                  </div>
                  <div className="col-span-3">
                    <Input type="number" placeholder="100" value={ticket.quantity} onChange={(e) => { const copy = [...ticketTypes]; copy[i] = { ...copy[i], quantity: e.target.value }; setTicketTypes(copy); }} />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {ticketTypes.length > 1 && (
                      <button onClick={() => setTicketTypes(ticketTypes.filter((_, j) => j !== i))} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" className="w-full mt-2 border-dashed" onClick={() => setTicketTypes([...ticketTypes, { name: "", price: "0", quantity: "100" }])}>
                <Plus className="w-4 h-4 mr-1" /> Add Another Ticket Tier
              </Button>
            </div>
          </div>
        </div>

        {/* ── Right Column (1/3): Banner + Map ── */}
        <div className="space-y-4">
          {/* Event Banner */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Event Banner</h3>
              <span className="text-xs text-primary font-medium flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Change</span>
            </div>
            <ImageUpload
              onUploadSuccess={(r) => { setUploadedImageUrl(r.secureUrl); setUploadedImagePublicId(r.publicId); }}
              folder={CLOUDINARY_FOLDERS.EVENTS}
              currentImage={uploadedImageUrl}
              buttonText="Upload Banner"
            />
            <p className="text-xs text-muted-foreground text-center mt-2">Recommended size: 1200 × 630 px</p>
          </div>

          {/* Map Location */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Map Location</h3>
            <AddressPicker
              onLocationConfirmed={(data) => { setEventLocation(data.address); setStreetAddress(data.address); setMapLat(data.lat); setMapLon(data.lon); }}
              initialAddress={eventLocation || streetAddress}
              initialLat={mapLat}
              initialLon={mapLon}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderRestaurantForm = () => (
    <div className="space-y-4 py-2">
      <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border border-orange-500/20 space-y-2.5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ea580c] text-white flex items-center justify-center shrink-0 shadow-sm">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-foreground">Interactive Restaurant & Menu Wizard</h4>
              <Badge variant="secondary" className="text-[10px] bg-orange-100 text-orange-800 font-bold border-0">Recommended</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Build a complete restaurant mini-site with digital menus, dish prices, dietary tags, photos, dining amenities, opening hours, and table reservation booking.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end pt-1">
          <Button
            size="sm"
            className="rounded-xl font-bold bg-[#ea580c] hover:bg-[#c2410c] text-white gap-1.5 shadow-sm"
            onClick={() => {
              setCreateOpen(false);
              navigate("/restaurant-wizard");
            }}
          >
            <Sparkles className="w-3.5 h-3.5" /> Launch Full Restaurant Wizard
          </Button>
        </div>
      </div>

      <div className="relative flex items-center justify-center my-2">
        <div className="border-t border-border w-full" />
        <span className="bg-card px-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider absolute">
          Or Quick Register Profile
        </span>
      </div>

      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Restaurant / Eatery Name *</Label>
        <Input className="mt-1.5" placeholder="e.g. Yellow Chilli Restaurant & Bar" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Primary Cuisine *</Label>
          <Select value={cuisineType} onValueChange={setCuisineType}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select cuisine" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Nigerian / Local Delicacies">Nigerian / Local Delicacies</SelectItem>
              <SelectItem value="Continental & European">Continental & European</SelectItem>
              <SelectItem value="Fast Food & Shawarma">Fast Food & Shawarma</SelectItem>
              <SelectItem value="Afro-fusion & Grills">Afro-fusion & Grills</SelectItem>
              <SelectItem value="Seafood Specialist">Seafood Specialist</SelectItem>
              <SelectItem value="Cafe, Pastry & Bakery">Cafe, Pastry & Bakery</SelectItem>
              <SelectItem value="Asian / Chinese / Pan-Asian">Asian / Chinese / Pan-Asian</SelectItem>
              <SelectItem value="Drinks, Lounge & Cocktails">Drinks, Lounge & Cocktails</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Price Tier</Label>
          <Select value={priceRange} onValueChange={setPriceRange}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select tier" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="₦ (Budget Friendly)">₦ (Budget Friendly)</SelectItem>
              <SelectItem value="₦₦ (Casual Dining)">₦₦ (Casual Dining)</SelectItem>
              <SelectItem value="₦₦₦ (Upscale)">₦₦₦ (Upscale)</SelectItem>
              <SelectItem value="₦₦₦₦ (Fine Dining / Luxury)">₦₦₦₦ (Fine Dining / Luxury)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">State *</Label>
        <Select value={selectedState} onValueChange={(v) => { setSelectedState(v as NigerianState); setSelectedCity(""); }}>
          <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select state" /></SelectTrigger>
          <SelectContent>
            {NIGERIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {selectedState && (
        <div>
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">City / Area</Label>
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select area" /></SelectTrigger>
            <SelectContent>
              {(STATE_CITIES[selectedState] || []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Location on Map</Label>
        <p className="text-xs text-muted-foreground mt-1 mb-2">Pinpoint restaurant location for map discovery and driving directions</p>
        <AddressPicker
          onLocationConfirmed={(data) => { setStreetAddress(data.address); setMapLat(data.lat); setMapLon(data.lon); }}
          initialAddress={streetAddress}
          initialLat={mapLat}
          initialLon={mapLon}
        />
      </div>

      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reservation / Contact Phone *</Label>
        <Input className="mt-1.5" placeholder="+234 801 234 5678" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>

      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">About the Restaurant</Label>
        <Textarea className="mt-1.5" placeholder="Highlight your chef specialties, ambiance, outdoor terrace, or private dining..." rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Restaurant Photos</Label>
        <MultiImageUpload
          onUploadSuccess={(r) => {
            setBizImages((prev) => [...prev, r.secureUrl]);
            setBizImagePublicIds((prev) => [...prev, r.publicId]);
          }}
          onRemove={(idx) => {
            setBizImages((prev) => prev.filter((_, i) => i !== idx));
            setBizImagePublicIds((prev) => prev.filter((_, i) => i !== idx));
          }}
          folder={CLOUDINARY_FOLDERS.BUSINESSES}
          currentImages={bizImages}
          buttonText="Add Restaurant Photo"
          maxImages={10}
        />
      </div>
    </div>
  );

  const getSubmitHandler = () => {
    switch (listingType) {
      case "restaurant": return handleCreateRestaurant;
      case "business": return handleCreateBusiness;
      case "product": return handleCreateProduct;
      case "property": return handleCreateProperty;
      case "event": return handleCreateEvent;
      default: return () => {};
    }
  };

  const ListingCard = ({ item, type }: { item: ListingItem; type: string }) => (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md group">
      <div className="relative aspect-[3/2] overflow-hidden">
        <img
          src={item.image || getMockImage(item.category || item.type)}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-100"
        />
        {item.status && (
          <Badge className={`absolute top-3 left-3 text-[9px] font-bold uppercase tracking-wider ${
            item.status === "Active" ? "bg-green-500 text-white" : "bg-yellow-500 text-white"
          }`}>
            {item.status}
          </Badge>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-bold text-sm text-foreground truncate mb-1">{item.title}</h3>
        {item.location && (
          <div className="flex items-center gap-1 text-muted-foreground text-xs mb-2">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{item.location}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          {item.price && <span className="font-bold text-sm text-primary">{item.price}</span>}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => handleEditClick(item, type)}
              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDeleteClick(item.id, type, item.title)}
              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-primary to-primary/80 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button variant="ghost" className="text-white hover:bg-white/20 mb-4 -ml-2" onClick={() => navigate("/explore")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <LayoutDashboard className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-display font-extrabold">My Dashboard</h1>
                <p className="text-white/80 mt-1">Manage your listings and activity</p>
              </div>
            </div>
            <Button
              variant="secondary"
              className="bg-white text-primary hover:bg-white/90 font-bold shadow-lg flex items-center gap-2"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" /> Create New
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-card border border-border/50 p-1 rounded-xl mb-8 w-fit">
            <TabsTrigger value="overview" className="rounded-lg font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">Overview</TabsTrigger>
            <TabsTrigger value="listings" className="rounded-lg font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">My Listings</TabsTrigger>
            <TabsTrigger value="events" className="rounded-lg font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">My Events</TabsTrigger>
            <TabsTrigger value="ads" className="rounded-lg font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">Ad Manager</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Building2, label: "Businesses", count: myBusinesses.length, color: "primary" },
                { icon: ShoppingBag, label: "Products", count: myProducts.length, color: "accent" },
                { icon: Home, label: "Properties", count: myProperties.length, color: "success" },
                { icon: Calendar, label: "Events", count: myEvents.length, color: "primary" },
              ].map((stat) => (
                <Card key={stat.label} className="border-border/50">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-xl bg-${stat.color}/10 flex items-center justify-center`}>
                        <stat.icon className={`w-5 h-5 text-${stat.color}`} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</span>
                    </div>
                    <p className="text-2xl font-extrabold">{stat.count}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Hospitality Entry Card */}
            {hasMiniSite && (
              <button
                onClick={() => navigate("/hospitality-dashboard")}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border/50 bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Hotel className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">Property Dashboard</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Manage reservations, revenue, rooms & bookings</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            )}

            <Card className="border-border/50">
              <CardContent className="p-5">
                <h3 className="font-bold mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {[
                    { icon: UtensilsCrossed, label: "Add Restaurant", type: "restaurant" },
                    { icon: Building2, label: "Register Business", type: "business" },
                    { icon: ShoppingBag, label: "Post Product", type: "product" },
                    { icon: Home, label: "List Property", type: "property" },
                    { icon: Calendar, label: "Create Event", type: "event" }
                  ].map((action) => (
                    <button
                      key={action.type}
                      onClick={() => {
                        if (action.type === "restaurant") {
                          navigate("/restaurant-wizard");
                          return;
                        }
                        setListingType(action.type);
                        setWizardStep(2);
                        setCreateOpen(true);
                      }}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all"
                    >
                      <action.icon className="w-6 h-6 text-primary" />
                      <span className="text-xs font-bold text-muted-foreground">{action.label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Listings */}
          <TabsContent value="listings" className="space-y-6">
            {!selectedBusinessId ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">My Businesses ({myBusinesses.length})</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Click a business to manage its products & rooms</p>
                  </div>
                  <Button size="sm" className="rounded-xl font-bold" onClick={() => setCreateOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Register Business
                  </Button>
                </div>
                {loadingListings ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-card rounded-2xl border border-border/50 overflow-hidden animate-pulse">
                        <div className="aspect-[4/3] bg-muted/60" />
                        <div className="p-4 space-y-2">
                          <div className="h-4 bg-muted/60 rounded w-3/4" />
                          <div className="h-3 bg-muted/40 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : myBusinesses.length === 0 ? (
                  <div className="text-center py-16 bg-card/30 rounded-2xl border border-dashed border-border">
                    <Building2 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground mb-3">No businesses yet</p>
                    <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
                      <Plus className="w-4 h-4 mr-1" /> Register Your First Business
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myBusinesses.map((item) => (
                      <div
                        key={item.id}
                        className="bg-card border border-border/50 rounded-xl overflow-hidden hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md group"
                      >
                        <div
                          className="cursor-pointer"
                          onClick={() => { setSelectedBusinessId(item.id); setSelectedBusinessTitle(item.title); }}
                        >
                          <div className="relative aspect-[3/2] overflow-hidden">
                            <img
                              src={item.image || getMockImage(item.category)}
                              alt={item.title}
                              className="w-full h-full object-contain bg-muted transition-transform duration-500 group-hover:scale-100"
                            />
                            {item.category && (
                              <Badge className="absolute top-3 left-3 text-[9px] font-bold uppercase tracking-wider bg-primary text-primary-foreground">
                                {item.category}
                              </Badge>
                            )}
                          </div>
                          <div className="p-3">
                            <h3 className="font-bold text-sm text-foreground truncate mb-1">{item.title}</h3>
                            {item.location && (
                              <div className="flex items-center gap-1 text-muted-foreground text-xs mb-2">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">{item.location}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-xs text-primary font-semibold">
                              <span>Manage workspace</span>
                              <ChevronRight className="w-3 h-3" />
                            </div>
                          </div>
                        </div>
                        <div className="px-3 pb-3 flex justify-end gap-1">
                          <button
                            onClick={() => handleEditClick(item, "business")}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(item.id, "business", item.title)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* My Products Section */}
                <div className="pt-8 border-t border-border/50">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold">My Products & Services ({myProducts.length})</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">Products, deals, and items listed on Citivas Marketplace</p>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-xl font-bold"
                      onClick={() => {
                        setListingType("product");
                        setWizardStep(2);
                        setCreateOpen(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Post a Product
                    </Button>
                  </div>
                  {myProducts.length === 0 ? (
                    <div className="text-center py-10 bg-card/30 rounded-2xl border border-dashed border-border">
                      <ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground mb-3">No products posted yet</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setListingType("product");
                          setWizardStep(2);
                          setCreateOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" /> Post Your First Product
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {myProducts.map((item) => (
                        <ListingCard key={item.id} item={item} type="product" />
                      ))}
                    </div>
                  )}
                </div>

                {/* My Properties Section */}
                <div className="pt-8 border-t border-border/50">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold">My Properties & Stays ({myProperties.length})</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">Shortlets, lands, and commercial spaces</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl font-bold"
                      onClick={() => {
                        setListingType("property");
                        setWizardStep(2);
                        setCreateOpen(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" /> List a Property
                    </Button>
                  </div>
                  {myProperties.length === 0 ? (
                    <div className="text-center py-10 bg-card/30 rounded-2xl border border-dashed border-border">
                      <Home className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground mb-3">No properties listed yet</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setListingType("property");
                          setWizardStep(2);
                          setCreateOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" /> List Your First Property
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {myProperties.map((item) => (
                        <ListingCard key={item.id} item={item} type="property" />
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Business Workspace */}
                <div className="flex items-center gap-3 mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => { setSelectedBusinessId(null); setSelectedBusinessTitle(null); }}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Businesses
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">{selectedBusinessTitle}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Products & rooms in this business</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl font-bold border-primary/30 text-primary hover:bg-primary/10"
                      onClick={() => {
                        navigate(`/restaurant-wizard?businessId=${selectedBusinessId}`);
                      }}
                    >
                      <UtensilsCrossed className="w-4 h-4 mr-1" /> Restaurant Wizard & Menu
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl font-bold"
                      onClick={() => {
                        setListingType("product");
                        setListAsBizId(selectedBusinessId!);
                        setWizardStep(2);
                        setCreateOpen(true);
                      }}
                    >
                      <ShoppingBag className="w-4 h-4 mr-1" /> Add Product
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl font-bold"
                      onClick={() => {
                        setListingType("property");
                        setPropListAsBizId(selectedBusinessId!);
                        setWizardStep(2);
                        setCreateOpen(true);
                      }}
                    >
                      <Home className="w-4 h-4 mr-1" /> Add Room
                    </Button>
                  </div>
                </div>

                {loadingBizChildren ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-card rounded-2xl border border-border/50 overflow-hidden animate-pulse">
                        <div className="aspect-[4/3] bg-muted/60" />
                        <div className="p-4 space-y-2">
                          <div className="h-4 bg-muted/60 rounded w-3/4" />
                          <div className="h-3 bg-muted/40 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Products Section */}
                    <div>
                      <h4 className="font-bold text-sm text-foreground mb-3">Products ({bizProducts.length})</h4>
                      {bizProducts.length === 0 ? (
                        <div className="text-center py-10 bg-card/30 rounded-2xl border border-dashed border-border">
                          <ShoppingBag className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                          <p className="text-sm text-muted-foreground mb-2">No products yet</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setListingType("product");
                              setListAsBizId(selectedBusinessId!);
                              setWizardStep(2);
                              setCreateOpen(true);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" /> Add First Product
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {bizProducts.map((item) => (
                            <ListingCard key={item.id} item={item} type="product" />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Properties/Rooms Section */}
                    <div>
                      <h4 className="font-bold text-sm text-foreground mb-3">Rooms / Properties ({bizProperties.length})</h4>
                      {bizProperties.length === 0 ? (
                        <div className="text-center py-10 bg-card/30 rounded-2xl border border-dashed border-border">
                          <Home className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                          <p className="text-sm text-muted-foreground mb-2">No rooms listed yet</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setListingType("property");
                              setPropListAsBizId(selectedBusinessId!);
                              setWizardStep(2);
                              setCreateOpen(true);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" /> Add First Room
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {bizProperties.map((item) => (
                            <ListingCard key={item.id} item={item} type="property" />
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </TabsContent>

          {/* My Events */}
          <TabsContent value="events" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">My Events ({myEvents.length})</h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl font-bold"
                  onClick={generateEventReport}
                  disabled={myEvents.length === 0}
                >
                  <FileText className="w-4 h-4 mr-1" /> Report
                </Button>
                <Button size="sm" className="rounded-xl font-bold" onClick={() => { setListingType("event"); setWizardStep(2); setCreateOpen(true); }}>
                  <Plus className="w-4 h-4 mr-1" /> Create Event
                </Button>
              </div>
            </div>

            {/* Analytics Cards */}
            {myEvents.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-card border border-border/50 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Total Events</p>
                  <p className="text-2xl font-extrabold text-foreground">{eventAnalytics.totalEvents}</p>
                </div>
                <div className="bg-card border border-border/50 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Total Capacity</p>
                  <p className="text-2xl font-extrabold text-foreground">{eventAnalytics.totalCapacity.toLocaleString()}</p>
                </div>
                <div className="bg-card border border-border/50 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Attendees</p>
                  <p className="text-2xl font-extrabold text-primary">{eventAnalytics.totalAttendees}</p>
                </div>
                <div className="bg-card border border-border/50 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Revenue</p>
                  <p className="text-2xl font-extrabold text-green-600">₦{eventAnalytics.totalRevenue.toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* Per-Event Breakdown */}
            {eventAnalytics.eventStats.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-foreground">Event Breakdown</h4>
                {eventAnalytics.eventStats.map((evt) => (
                  <div key={evt.id} className="bg-card border border-border/50 rounded-xl p-4 hover:border-primary/30 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-sm text-foreground truncate">{evt.title}</h5>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {evt.date && <span>{new Date(evt.date).toLocaleDateString()}</span>}
                          {evt.location && <span className="truncate">{evt.location}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-center">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Capacity</p>
                          <p className="font-bold text-sm">{evt.capacity}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Attendees</p>
                          <p className="font-bold text-sm text-primary">{evt.attendees.length}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Revenue</p>
                          <p className="font-bold text-sm text-green-600">₦{evt.actualRevenue.toLocaleString()}</p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditClick({ id: evt.id, title: evt.title, image: "", category: "event" }, "event")}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(evt.id, "event", evt.title)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    {evt.ticketTiers.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Ticket Tiers</p>
                        <div className="flex flex-wrap gap-2">
                          {evt.ticketTiers.map((tier: any, i: number) => (
                            <span key={i} className="px-2.5 py-1 bg-accent text-xs rounded-full font-medium">
                              {tier.name || "Tier"} — ₦{Number(tier.price || 0).toLocaleString()} × {Number(tier.quantity || 0)} seats
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {evt.attendees.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Attendees ({evt.attendees.length})</p>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {evt.attendees.map((a: any, i: number) => (
                            <div key={i} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-accent/30 text-xs">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground truncate">{a.name}</p>
                                {a.email && <p className="text-muted-foreground truncate">{a.email}</p>}
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-bold text-green-600">₦{a.amount.toLocaleString()}</p>
                                <p className="text-muted-foreground">{a.tier} × {a.quantity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Attended Events */}
            {attendedEvents.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-border/50">
                <h4 className="font-bold text-sm text-foreground">My Tickets ({attendedEvents.length})</h4>
                {attendedEvents.map((evt: any) => {
                  const myOrder = myTicketOrders.find((o: any) => o.eventId === evt.id);
                  return (
                    <div key={evt.id} className="bg-card border border-border/50 rounded-xl p-4 hover:border-primary/30 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-sm text-foreground truncate">{evt.title || "Untitled Event"}</h5>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {evt.startDate && <span>{new Date(evt.startDate).toLocaleDateString()}</span>}
                            {evt.location && <span className="truncate">{evt.location}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-center">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">My Ticket</p>
                            <p className="font-bold text-sm text-primary">{myOrder?.ticketTier || "General"}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">Paid</p>
                            <p className="font-bold text-sm text-green-600">₦{Number(myOrder?.amount || 0).toLocaleString()}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">Qty</p>
                            <p className="font-bold text-sm">{Number(myOrder?.quantity || 1)}</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteTicketOrder.mutate(myOrder.id); }}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                            aria-label="Cancel ticket"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {myEvents.length === 0 && attendedEvents.length === 0 && (
              <div className="text-center py-16 bg-card/30 rounded-2xl border border-dashed border-border">
                <p className="text-muted-foreground mb-3">No events yet</p>
                <Button size="sm" variant="outline" onClick={() => { setListingType("event"); setWizardStep(2); setCreateOpen(true); }}>
                  <Plus className="w-4 h-4 mr-1" /> Create Your First Event
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Ad Manager */}
          <TabsContent value="ads" className="space-y-6">
            <div className="text-center py-16 bg-card/30 rounded-2xl border border-dashed border-border">
              <Megaphone className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <h3 className="text-lg font-bold mb-2">Ad Manager</h3>
              <p className="text-muted-foreground text-sm mb-4">Promote your listings to reach more people</p>
              <Button onClick={() => navigate("/run-ads")}>
                <Megaphone className="w-4 h-4 mr-2" /> Start Advertising
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Create Listing Wizard Dialog ── */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) resetWizard(); else setCreateOpen(true); }}>
        <DialogContent className={`max-h-[90vh] overflow-y-auto rounded-2xl ${wizardStep === 1 ? "sm:max-w-2xl" : listingType === "event" ? "sm:max-w-6xl" : "sm:max-w-3xl"}`}>
          {wizardStep === 1 ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">What are you listing today?</DialogTitle>
                <DialogDescription>Choose a listing type to get started</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-3 py-4">
                {[
                  { type: "restaurant" as const, icon: UtensilsCrossed, title: "List a Restaurant / Eatery", desc: "Interactive wizard with digital menus, dining features, opening hours & table bookings" },
                  { type: "business" as const, icon: Store, title: "Register Business", desc: "Register your shop, brand, or service agency" },
                  { type: "product" as const, icon: ShoppingBag, title: "Post a Product/Service", desc: "Sell a physical item, deal, package, or service" },
                  { type: "property" as const, icon: Home, title: "List a Property", desc: "List a shortlet, apartment, land, or house" },
                  { type: "event" as const, icon: Calendar, title: "Create an Event", desc: "Publish a concert, festival, or meetup" },
                ].map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => {
                      if (opt.type === "restaurant") {
                        setCreateOpen(false);
                        navigate("/restaurant-wizard");
                        return;
                      }
                      if (opt.type === "property") {
                        setPropertySubType("" as any);
                      }
                      if (opt.type === "business") {
                        setBizCategory("");
                      }
                      setListingType(opt.type);
                      setWizardStep(2);
                    }}
                    className="flex items-center gap-4 p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <opt.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-foreground">{opt.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  {listingType === "business" && "Register Business"}
                  {listingType === "product" && "Post a Product/Service"}
                  {listingType === "property" && "List a Property"}
                  {listingType === "event" && "Create an Event"}
                  {listingType === "restaurant" && "List a Restaurant / Eatery"}
                </DialogTitle>
                <DialogDescription>
                  {listingType === "restaurant"
                    ? "Configure your restaurant storefront or launch the interactive menu wizard"
                    : "All fields with * are required"}
                </DialogDescription>
              </DialogHeader>

              {listingType === "business" && renderBusinessForm()}
              {listingType === "product" && renderProductForm()}
              {listingType === "property" && renderPropertyForm()}
              {listingType === "event" && renderEventForm()}
              {listingType === "restaurant" && renderRestaurantForm()}

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => {
                  if (listingType === "property" && propertySubType) {
                    setPropertySubType("" as any);
                  } else {
                    // Fully reset per-listing-type state so the next open
                    // starts fresh and the dialog size correctly collapses.
                    setListingType("");
                    setWizardStep(1);
                  }
                }}>Back</Button>
                {listingType === "restaurant" ? (
                  <div className="flex-1 flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl font-bold"
                      onClick={getSubmitHandler()}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving...</span>
                      ) : (
                        "Quick Save"
                      )}
                    </Button>
                    <Button
                      className="flex-1 rounded-xl font-bold bg-[#ea580c] hover:bg-[#c2410c] text-white flex items-center justify-center gap-1.5 shadow-sm"
                      onClick={() => {
                        setCreateOpen(false);
                        navigate("/restaurant-wizard");
                      }}
                    >
                      <Sparkles className="w-4 h-4" /> Full Wizard
                    </Button>
                  </div>
                ) : (
                  <Button className="flex-1 rounded-xl font-bold" onClick={getSubmitHandler()} disabled={isSubmitting || (listingType === "property" && !propertySubType)}>
                    {isSubmitting ? (
                      <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving...</span>
                    ) : (
                      listingType === "product" ? "Post Product to Marketplace" :
                      listingType === "event" ? "Publish Event" :
                      listingType === "business" ? "Register Business" :
                      listingType === "property" ? (propertySubType ? "List Property" : "Select Property Type") :
                      "Create Listing"
                    )}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation: Step 1 ── */}
      <Dialog open={deleteStep === 1} onOpenChange={(open) => { if (!open) cancelDelete(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Delete "{deleteTarget?.title}"?</DialogTitle>
            <DialogDescription>
              This action can be undone, but the listing will be removed from public view immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={cancelDelete}>Cancel</Button>
            <Button variant="destructive" className="flex-1 rounded-xl font-bold" onClick={confirmDeleteStep1}>
              Yes, Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation: Step 2 (final) ── */}
      <Dialog open={deleteStep === 2} onOpenChange={(open) => { if (!open) cancelDelete(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-destructive">Final Confirmation</DialogTitle>
            <DialogDescription>
              Are you absolutely sure? This will permanently delete <strong>"{deleteTarget?.title}"</strong>. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={cancelDelete}>Cancel</Button>
            <Button variant="destructive" className="flex-1 rounded-xl font-bold" onClick={confirmDeleteStep2} disabled={deleting}>
              {deleting ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</span>
              ) : (
                "Delete Permanently"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editTarget?.type === "business" && "Edit Business"}
              {editTarget?.type === "product" && "Edit Product"}
              {editTarget?.type === "property" && "Edit Property"}
              {editTarget?.type === "event" && "Edit Event"}
            </DialogTitle>
            <DialogDescription>Update your listing details below.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {editTarget?.type !== "event" && (
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Title *</Label>
              <Input className="mt-1.5" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            )}

            {editTarget?.type === "business" && (
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {BUSINESS_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {editTarget?.type === "property" && (
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Property Type</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Event-specific fields */}
            {editTarget?.type === "event" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* ── Left Column: Form Fields ── */}
                <div className="md:col-span-2 space-y-4">
                  {/* General Information */}
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                      <Info className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold uppercase tracking-wider">General Information</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Event Title *</Label>
                        <Input className="mt-1.5" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="e.g. GDG Port Harcourt" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Event Category</Label>
                          <Select value={editEventCategory} onValueChange={setEditEventCategory}>
                            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select category" /></SelectTrigger>
                            <SelectContent>
                              {EVENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Venue Name</Label>
                          <Input className="mt-1.5" value={editEventVenue} onChange={(e) => setEditEventVenue(e.target.value)} placeholder="e.g. Techcreek" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
                        <Textarea className="mt-1.5" rows={3} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Describe your event..." />
                      </div>
                    </div>
                  </div>

                  {/* Schedule & Contact */}
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                      <CalendarClock className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold uppercase tracking-wider">Schedule & Contact</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Start Date</Label>
                          <Input type="date" className="mt-1.5" value={editEventStartDate} onChange={(e) => setEditEventStartDate(e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">End Date</Label>
                          <Input type="date" className="mt-1.5" value={editEventEndDate} onChange={(e) => setEditEventEndDate(e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">State</Label>
                          <Select value={editState} onValueChange={(v) => { setEditState(v as NigerianState); setEditCity(""); }}>
                            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select state" /></SelectTrigger>
                            <SelectContent>
                              {NIGERIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">City / Area</Label>
                          <Select value={editCity} onValueChange={setEditCity} disabled={!editState}>
                            <SelectTrigger className="mt-1.5"><SelectValue placeholder={editState ? "Select area" : "Select state first"} /></SelectTrigger>
                            <SelectContent>
                              {(STATE_CITIES[editState] || []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Start Time</Label>
                          <Input type="time" className="mt-1.5" value={editEventStartTime} onChange={(e) => setEditEventStartTime(e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">End Time</Label>
                          <Input type="time" className="mt-1.5" value={editEventEndTime} onChange={(e) => setEditEventEndTime(e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact Phone</Label>
                          <Input className="mt-1.5" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Enter phone number" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ticket Settings */}
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                      <Ticket className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold uppercase tracking-wider">Ticket Settings</h3>
                    </div>
                    <div className="space-y-2">
                      {editTicketTypes.length > 0 && (
                        <div className="grid grid-cols-12 gap-2 px-1">
                          <span className="col-span-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Tier Name</span>
                          <span className="col-span-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Price (₦)</span>
                          <span className="col-span-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Capacity</span>
                          <span className="col-span-1" />
                        </div>
                      )}
                      {editTicketTypes.map((tier, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-5">
                            <Input placeholder="e.g. Regular" value={tier.name} onChange={(e) => { const copy = [...editTicketTypes]; copy[i] = { ...copy[i], name: e.target.value }; setEditTicketTypes(copy); }} />
                          </div>
                          <div className="col-span-3">
                            <Input type="number" placeholder="0" value={tier.price} onChange={(e) => { const copy = [...editTicketTypes]; copy[i] = { ...copy[i], price: e.target.value }; setEditTicketTypes(copy); }} />
                          </div>
                          <div className="col-span-3">
                            <Input type="number" placeholder="100" value={tier.quantity} onChange={(e) => { const copy = [...editTicketTypes]; copy[i] = { ...copy[i], quantity: e.target.value }; setEditTicketTypes(copy); }} />
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <button onClick={() => setEditTicketTypes(editTicketTypes.filter((_, j) => j !== i))} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                      <Button type="button" variant="outline" className="w-full mt-2 border-dashed" onClick={() => setEditTicketTypes([...editTicketTypes, { name: "", price: "0", quantity: "100" }])}>
                        <Plus className="w-4 h-4 mr-1" /> Add Another Ticket Tier
                      </Button>
                    </div>
                  </div>
                </div>

                {/* ── Right Column: Banner + Map ── */}
                <div className="space-y-4">
                  {/* Event Banner */}
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Event Banner</h3>
                      <span className="text-xs text-primary font-medium flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Change</span>
                    </div>
                    <ImageUpload
                      onUploadSuccess={(r) => { setEditImageUrl(r.secureUrl); setEditImagePublicId(r.publicId); }}
                      folder={CLOUDINARY_FOLDERS.BUSINESSES}
                      currentImage={editImageUrl}
                      buttonText="Upload Banner"
                    />
                    <p className="text-xs text-muted-foreground text-center mt-2">Recommended size: 1200 × 630 px</p>
                  </div>

                  {/* Map Location */}
                  <div className="rounded-xl border border-border bg-card p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Map Location</h3>
                    <AddressPicker
                      onLocationConfirmed={(data) => { setEditEventLocation(data.address); setEditMapLat(data.lat); setEditMapLon(data.lon); }}
                      initialAddress={editEventLocation || editStreetAddress}
                      initialLat={editMapLat}
                      initialLon={editMapLon}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Product-specific fields */}
            {editTarget?.type === "product" && (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Price (₦)</Label>
                  <Input type="number" className="mt-1.5" value={editProductPrice} onChange={(e) => setEditProductPrice(e.target.value)} placeholder="e.g. 50000" />
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Promo Price (₦)</Label>
                  <Input type="number" className="mt-1.5" value={editPromoPrice} onChange={(e) => setEditPromoPrice(e.target.value)} placeholder="Optional" />
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</Label>
                  <Select value={editProductCategory} onValueChange={setEditProductCategory}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {["Electronics", "Fashion", "Home & Garden", "Vehicles", "Property", "Health & Beauty", "Sports", "Books", "Other"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Location fields for business, property only (events have these in their own section) */}
            {(editTarget?.type === "business" || editTarget?.type === "property") && (
              <>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">State</Label>
                  <Select value={editState} onValueChange={(v) => { setEditState(v as NigerianState); setEditCity(""); }}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>
                      {NIGERIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {editState && (
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">City / Area</Label>
                    <Select value={editCity} onValueChange={setEditCity}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select area" /></SelectTrigger>
                      <SelectContent>
                        {(STATE_CITIES[editState] || []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Location on Map</Label>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">Update address and pin location</p>
                  <AddressPicker
                    onLocationConfirmed={(data) => { setEditStreetAddress(data.address); setEditMapLat(data.lat); setEditMapLon(data.lon); }}
                    initialAddress={editStreetAddress}
                    initialLat={editMapLat}
                    initialLon={editMapLon}
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone</Label>
                  <Input className="mt-1.5" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </div>
              </>
            )}

            {editTarget?.type !== "event" && (
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
              <Textarea className="mt-1.5" rows={3} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
            )}

            {editTarget?.type !== "event" && (
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cover Image</Label>
              <ImageUpload
                onUploadSuccess={(r) => { setEditImageUrl(r.secureUrl); setEditImagePublicId(r.publicId); }}
                folder={CLOUDINARY_FOLDERS.BUSINESSES}
                currentImage={editImageUrl}
                buttonText="Change Cover"
              />
            </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setEditOpen(false)}>Cancel Changes</Button>
            <Button className="flex-1 rounded-xl font-bold" onClick={handleUpdateListing} disabled={editSaving}>
              {editSaving ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving...</span>
              ) : (
                editTarget?.type === "event" ? "Update Event Details" : "Save Changes"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileDashboard;
