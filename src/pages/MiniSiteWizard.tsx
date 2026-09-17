import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRegion } from "@/contexts/RegionContext";
import { useMyListings, useCreateDoc, useUpdateDoc } from "@/lib/useFirestore";
import { PROPERTY_AMENITIES, NIGERIAN_STATES } from "@/lib/nigerianStates";
import { CLOUDINARY_FOLDERS } from "@/lib/cloudinary";
import MultiImageUpload from "@/components/MultiImageUpload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Eye, Phone, MessageCircle, Mail, Upload, Check, Building2, Plus, Trash2, MapPin } from "lucide-react";

const STEPS = ["Details", "About", "Facilities", "Pricing", "Publish"];

interface RoomCategory {
  id: string;
  name: string;
  bedType: string;
  bathrooms: number;
  maxOccupancy: number;
  quantity: number;
  pricePerNight: number;
  minNights: number;
  deposit: number;
  images: string[];
  imagePublicIds: string[];
}

const BED_TYPES = ["1 King Bed", "1 Queen Bed", "2 Double Beds", "2 Twin Beds", "1 King + 1 Twin", "3 Single Beds", "Bunk Bed", "Sofa Bed"];

function newRoom(): RoomCategory {
  return { id: crypto.randomUUID(), name: "", bedType: "1 King Bed", bathrooms: 1, maxOccupancy: 2, quantity: 1, pricePerNight: 0, minNights: 1, deposit: 0, images: [], imagePublicIds: [] };
}

export default function MiniSiteWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editingPropertyId = searchParams.get("propertyId");
  const isEditing = !!editingPropertyId;
  const { toast } = useToast();
  const { data: myListingsData } = useMyListings(user?.id || null);
  const myBusinesses = myListingsData?.businesses || [];
  const myProperties = myListingsData?.properties || [];
  const createProperty = useCreateDoc("house_listings");
  const updateProperty = useUpdateDoc("house_listings");

  // If editing, find the existing property to prefill
  const existingProperty = isEditing ? myProperties.find((p: any) => p.id === editingPropertyId) : null;

  const [step, setStep] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [initialized, setInitialized] = useState(false);

  const { state: regionState, locationName: regionCity, userAddress } = useRegion();

  // Step 0: Details
  const [selectedBizId, setSelectedBizId] = useState("");
  const [title, setTitle] = useState("");
  const [propertyType, setPropertyType] = useState("VILLA");
  const [city, setCity] = useState(regionCity || "");
  const [state, setState] = useState(regionState || "");

  // Step 1: About (now includes check-in/out)
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState(userAddress || regionCity || "");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [imagePublicIds, setImagePublicIds] = useState<string[]>([]);
  const [logo, setLogo] = useState("");
  const [logoPublicId, setLogoPublicId] = useState("");
  const [checkin, setCheckin] = useState("14:00");
  const [checkout, setCheckout] = useState("11:00");

  // Step 2: Facilities
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [rooms, setRooms] = useState<RoomCategory[]>([newRoom()]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Prefill from existing property
  useEffect(() => {
    if (existingProperty && !initialized) {
      const p = existingProperty as any;
      setSelectedBizId(p.businessId || "");
      setTitle(p.title || "");
      setPropertyType(p.propertyType || "VILLA");
      setCity(p.city || "");
      setState(p.state || "");
      setDescription(p.description || "");
      setAddress(p.address || "");
      setPhone(p.phone || "");
      setWhatsapp(p.whatsapp || "");
      setEmail(p.contactEmail || "");
      setImages(p.images || (p.image ? [p.image] : []));
      setImagePublicIds(p.imagePublicIds || []);
      setLogo(p.logo || "");
      setLogoPublicId(p.logoPublicId || "");
      setCheckin(p.checkin || "14:00");
      setCheckout(p.checkout || "11:00");
      setSelectedAmenities(p.amenities || []);
      if (p.rooms && p.rooms.length > 0) {
        setRooms(p.rooms.map((r: any, i: number) => ({
          id: r.id || crypto.randomUUID(),
          name: r.name || "",
          bedType: r.bedType || "1 King Bed",
          bathrooms: r.bathrooms || 1,
          maxOccupancy: r.maxOccupancy || 2,
          quantity: r.quantity || 1,
          pricePerNight: r.pricePerNight || 0,
          minNights: r.minNights || 1,
          deposit: r.deposit || 0,
          images: r.images || [],
          imagePublicIds: r.imagePublicIds || [],
        })));
      }
      setInitialized(true);
    }
  }, [existingProperty, initialized]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (title || description || phone || images.length > 0) setLastSaved(new Date());
    }, 120000);
    return () => clearInterval(timer);
  }, [title, description, phone, images]);

  if (!user) { navigate("/auth"); return null; }
  if (isEditing && !initialized && !existingProperty) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#1a56db] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Loading property data...</p>
        </div>
      </div>
    );
  }

  const selectedBiz = myBusinesses.find((b: any) => b.id === selectedBizId);
  const propertySlug = title ? title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "") : "your-property";

  const totalRooms = rooms.reduce((s, r) => s + r.quantity, 0);
  const minPrice = rooms.filter(r => r.pricePerNight > 0).length > 0
    ? Math.min(...rooms.filter(r => r.pricePerNight > 0).map(r => r.pricePerNight))
    : 0;

  const canNext = () => {
    switch (step) {
      case 0: return !!selectedBizId && title.trim().length > 0;
      case 1: return true;
      case 2: return rooms.length > 0;
      case 3: return rooms.some(r => r.pricePerNight > 0);
      case 4: return true;
      default: return false;
    }
  };

  const formatTimeAgo = (date: Date | null) => {
    if (!date) return "";
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 1) return "JUST NOW";
    if (mins < 60) return `${mins}M AGO`;
    return `${Math.floor(mins / 60)}H AGO`;
  };

  const formatTime = (t: string) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hr = h % 12 || 12;
    return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  const updateRoom = (id: string, field: keyof RoomCategory, value: any) => {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addRoom = () => setRooms(prev => [...prev, newRoom()]);
  const removeRoom = (id: string) => setRooms(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);


  const handleSubmit = async () => {
    if (!selectedBiz || !title.trim()) return;
    setIsSubmitting(true);
    try {
      const bizLocation = selectedBiz.location || "";
      const derivedState = state || bizLocation.split(", ").pop() || "";
      const derivedCity = city || bizLocation.split(", ").shift() || "";
      const fullLocation = [derivedCity, derivedState, "Nigeria"].filter(Boolean).join(", ");
      const primaryImage = images[0] || logo || "";
      const priceNum = rooms.filter(r => r.pricePerNight > 0).length > 0
        ? Math.min(...rooms.filter(r => r.pricePerNight > 0).map(r => r.pricePerNight))
        : 0;

      const primary = images[0] || logo || "";

      const payload = {
        title: title.trim(),
        description: description.trim(),
        address: address.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        contactEmail: email.trim(),
        propertySubType: "shortlet_hotel",
        type: "Shortlet & Hotel",
        propertyType,
        checkin,
        checkout,
        rooms: rooms.map(({ id, ...rest }) => rest),
        price: priceNum ? `from \u20A6${priceNum.toLocaleString()}/night` : "",
        priceNum,
        location: fullLocation,
        state: derivedState,
        city: derivedCity,
        businessId: selectedBizId,
        sellerType: "business",
        image: primary,
        images: images.length > 0 ? images : primary ? [primary] : [],
        imagePublicIds: imagePublicIds.length > 0 ? imagePublicIds : [],
        logo: logo,
        logoPublicId: logoPublicId || "",
        totalRooms: rooms.reduce((s, r) => s + r.quantity, 0),
        amenities: selectedAmenities,
        miniSiteActive: true,
      };

      if (isEditing && editingPropertyId) {
        await updateProperty.mutateAsync({ id: editingPropertyId, data: payload });
        toast({ title: "Mini-site updated!", description: "Your changes have been saved and published." });
      } else {
        await createProperty.mutateAsync({
          ...payload,
          ownerId: user.id,
          status: "Pending",
          rating: 0,
          reviewCount: 0,
        });
        toast({ title: "Property listing created!", description: "Your listing is now pending review." });
      }
      navigate("/profile/dashboard?tab=listings");
    } catch (e: any) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPct = ((step + 1) / STEPS.length) * 100;

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-[13px] font-medium text-foreground">Select Your Business *</Label>
              {myBusinesses.length === 0 ? (
                <div className="mt-2 text-center py-8 bg-muted/30 rounded-xl border border-dashed border-border">
                  <Building2 className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm font-semibold text-foreground mb-1">No business registered</p>
                  <p className="text-xs text-muted-foreground mb-3">Create a business listing first.</p>
                  <button onClick={() => navigate("/profile/dashboard?tab=listings&action=create&type=business")} className="text-sm text-primary font-semibold hover:underline">
                    Register Business &rarr;
                  </button>
                </div>
              ) : (
                <Select value={selectedBizId} onValueChange={setSelectedBizId}>
                  <SelectTrigger className="mt-1.5 h-11 rounded-xl"><SelectValue placeholder="Choose a business" /></SelectTrigger>
                  <SelectContent>
                    {myBusinesses.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label className="text-[13px] font-medium text-foreground">Property Name *</Label>
              <Input className="mt-1.5 h-11 rounded-xl" placeholder="e.g. The Azure Villa" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[13px] font-medium text-foreground">City *</Label>
                <Input className="mt-1.5 h-11 rounded-xl" placeholder="e.g. Lagos" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div>
                <Label className="text-[13px] font-medium text-foreground">State *</Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger className="mt-1.5 h-11 rounded-xl"><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {NIGERIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-[13px] font-medium text-foreground">Property Type</Label>
              <div className="flex gap-2 mt-2">
                {["VILLA", "APARTMENT", "HOTEL", "GUESTHOUSE", "RESORT"].map((t) => (
                  <button key={t} type="button" onClick={() => setPropertyType(t)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      propertyType === t ? "border-[#1a56db] bg-[#1a56db] text-white" : "border-gray-300 text-gray-500 hover:border-[#1a56db]/50"
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-0">
            <div className="space-y-6">
              <div>
                <Label className="text-[13px] font-medium text-gray-500">Property Name</Label>
                <Input className="mt-1.5 h-11 rounded-xl" placeholder="e.g. The Azure Villa" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <Label className="text-[13px] font-medium text-gray-500">About the Property (Description)</Label>
                <Textarea className="mt-1.5 rounded-xl resize-none" placeholder="Describe the atmosphere, unique features, and the guest experience..." rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div>
                <Label className="text-[13px] font-medium text-gray-500">Property Address</Label>
                <div className="relative mt-1.5">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input className="h-11 rounded-xl pl-10" placeholder="e.g. 12 Admiralty Way, Lekki Phase 1" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="my-8 border-t border-gray-200" />

            <div>
              <h3 className="text-[15px] font-bold text-foreground mb-4">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[13px] font-medium text-gray-500">Phone Number</Label>
                  <div className="relative mt-1.5">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input className="h-11 rounded-xl pl-10" placeholder="+234 800 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label className="text-[13px] font-medium text-gray-500">WhatsApp (Optional)</Label>
                  <div className="relative mt-1.5">
                    <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input className="h-11 rounded-xl pl-10" placeholder="+234 800 000 0000" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <Label className="text-[13px] font-medium text-gray-500">Business Email</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input className="h-11 rounded-xl pl-10" placeholder="hello@azurevilla.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="my-8 border-t border-gray-200" />

            <div>
              <h3 className="text-[15px] font-bold text-foreground mb-4">Logo</h3>
              <MultiImageUpload
                onUploadSuccess={(r) => {
                  setLogo(r.secureUrl);
                  setLogoPublicId(r.publicId);
                }}
                onRemove={() => {
                  setLogo("");
                  setLogoPublicId("");
                }}
                folder={CLOUDINARY_FOLDERS.LISTINGS}
                currentImages={logo ? [logo] : []}
                buttonText="Upload Logo"
                placeholder="Upload your brand logo"
                maxImages={1}
              />
            </div>

            <div className="my-8 border-t border-gray-200" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-bold text-foreground">Gallery</h3>
                <span className="text-[11px] text-gray-400">Recommended: 1920x1080 px (Min 3 photos)</span>
              </div>
              <MultiImageUpload
                onUploadSuccess={(r) => {
                  setImages((prev) => [...prev, r.secureUrl]);
                  setImagePublicIds((prev) => [...prev, r.publicId]);
                }}
                onRemove={(idx) => {
                  setImages((prev) => prev.filter((_, i) => i !== idx));
                  setImagePublicIds((prev) => prev.filter((_, i) => i !== idx));
                }}
                folder={CLOUDINARY_FOLDERS.LISTINGS}
                currentImages={images}
                buttonText="Upload Images"
                placeholder="Drop your images here or click to browse"
                maxImages={10}
              />
              {images.length > 0 && (
                <div className="flex gap-3 mt-4">
                  {images.map((img, i) => (
                    <div key={i} className="relative w-[140px] h-[100px] rounded-xl overflow-hidden border border-gray-200">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      {i === 0 && <span className="absolute top-2 left-2 bg-[#1a56db] text-white text-[10px] font-bold px-2 py-0.5 rounded-md">COVER</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="my-8 border-t border-gray-200" />

            <div>
              <h3 className="text-[15px] font-bold text-foreground mb-4">House Policies</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[13px] font-medium text-gray-500">Check-in Time</Label>
                  <Input className="mt-1.5 h-11 rounded-xl" type="time" value={checkin} onChange={(e) => setCheckin(e.target.value)} />
                </div>
                <div>
                  <Label className="text-[13px] font-medium text-gray-500">Check-out Time</Label>
                  <Input className="mt-1.5 h-11 rounded-xl" type="time" value={checkout} onChange={(e) => setCheckout(e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-0">
            {/* Global Amenities */}
            <div>
              <h3 className="text-[15px] font-bold text-foreground mb-4">Property Amenities</h3>
              <p className="text-[12px] text-gray-400 mb-4">Select all amenities available across the entire property.</p>
              <div className="grid grid-cols-2 gap-3">
                {PROPERTY_AMENITIES.map((a) => (
                  <button key={a.id} type="button"
                    onClick={() => setSelectedAmenities((prev) => prev.includes(a.id) ? prev.filter((x) => x !== a.id) : [...prev, a.id])}
                    className={`flex items-center gap-2.5 p-3.5 rounded-xl border text-[13px] font-medium transition-all ${
                      selectedAmenities.includes(a.id) ? "border-[#1a56db] bg-[#1a56db]/5 text-[#1a56db]" : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}>
                    <span className="text-base">{a.icon}</span> {a.label}
                    {selectedAmenities.includes(a.id) && <Check className="w-4 h-4 ml-auto" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="my-8 border-t border-gray-200" />

            {/* Dynamic Room Categories */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[15px] font-bold text-foreground">Room Categories</h3>
                  <p className="text-[12px] text-gray-400 mt-1">Add room types available at your property (e.g. Deluxe, Executive).</p>
                </div>
                <button type="button" onClick={addRoom}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1a56db] text-white text-[12px] font-bold hover:bg-[#1548b8] transition-colors">
                  <Plus className="w-4 h-4" /> Add Room
                </button>
              </div>

              <div className="space-y-4">
                {rooms.map((room, idx) => (
                  <div key={room.id} className="p-5 rounded-xl border border-gray-200 bg-gray-50/50 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-bold text-foreground">Room {idx + 1}</span>
                      {rooms.length > 1 && (
                        <button type="button" onClick={() => removeRoom(room.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label className="text-[12px] font-medium text-gray-500">Room Name</Label>
                        <Input className="mt-1 h-10 rounded-xl" placeholder="e.g. Deluxe Suite, Ocean View Room" value={room.name} onChange={(e) => updateRoom(room.id, "name", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-[12px] font-medium text-gray-500">Bed Type</Label>
                        <Select value={room.bedType} onValueChange={(v) => updateRoom(room.id, "bedType", v)}>
                          <SelectTrigger className="mt-1 h-10 rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {BED_TYPES.map((bt) => <SelectItem key={bt} value={bt}>{bt}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[12px] font-medium text-gray-500">Bathrooms</Label>
                        <Input className="mt-1 h-10 rounded-xl" type="number" min="0" value={room.bathrooms} onChange={(e) => updateRoom(room.id, "bathrooms", parseInt(e.target.value) || 0)} />
                      </div>
                      <div>
                        <Label className="text-[12px] font-medium text-gray-500">Max Occupancy</Label>
                        <Input className="mt-1 h-10 rounded-xl" type="number" min="1" value={room.maxOccupancy} onChange={(e) => updateRoom(room.id, "maxOccupancy", parseInt(e.target.value) || 1)} />
                      </div>
                      <div>
                        <Label className="text-[12px] font-medium text-gray-500">Quantity Available</Label>
                        <Input className="mt-1 h-10 rounded-xl" type="number" min="1" value={room.quantity} onChange={(e) => updateRoom(room.id, "quantity", parseInt(e.target.value) || 1)} />
                      </div>
                    </div>

                    {/* Room Images */}
                    <div>
                      <Label className="text-[12px] font-medium text-gray-500">Room Images (max 5)</Label>
                      <MultiImageUpload
                        onUploadSuccess={(r) => {
                          setRooms(prev => prev.map(rm => rm.id === room.id ? { ...rm, images: [...rm.images, r.secureUrl], imagePublicIds: [...rm.imagePublicIds, r.publicId] } : rm));
                        }}
                        onRemove={(idx) => {
                          setRooms(prev => prev.map(rm => rm.id === room.id ? { ...rm, images: rm.images.filter((_, i) => i !== idx), imagePublicIds: rm.imagePublicIds.filter((_, i) => i !== idx) } : rm));
                        }}
                        folder={CLOUDINARY_FOLDERS.LISTINGS}
                        currentImages={room.images}
                        buttonText="Add Image"
                        placeholder="Upload room photos"
                        maxImages={5}
                      />
                      {room.images.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {room.images.map((img, i) => (
                            <div key={i} className="relative w-[72px] h-[56px] rounded-lg overflow-hidden border border-gray-200">
                              <img src={img} alt="" className="w-full h-full object-cover" />
                              {i === 0 && <span className="absolute top-0.5 left-0.5 bg-[#1a56db] text-white text-[7px] font-bold px-1 py-px rounded">COVER</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-0">
            <div>
              <h3 className="text-[15px] font-bold text-foreground mb-1">Room Pricing</h3>
              <p className="text-[12px] text-gray-400 mb-6">Set the nightly rate for each room category you created.</p>

              <div className="space-y-4">
                {rooms.map((room, idx) => (
                  <div key={room.id} className="p-5 rounded-xl border border-gray-200 bg-gray-50/50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-[#1a56db]/10 flex items-center justify-center text-[12px] font-bold text-[#1a56db]">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-foreground">{room.name || `Room ${idx + 1}`}</p>
                        <p className="text-[11px] text-gray-400">{room.bedType} &middot; {room.maxOccupancy} guests &middot; {room.quantity} unit{room.quantity > 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-[12px] font-medium text-gray-500">Price / Night (&#8358;) *</Label>
                        <Input className="mt-1 h-10 rounded-xl" type="number" placeholder="e.g. 35000" value={room.pricePerNight || ""} onChange={(e) => updateRoom(room.id, "pricePerNight", parseFloat(e.target.value) || 0)} />
                      </div>
                      <div>
                        <Label className="text-[12px] font-medium text-gray-500">Min. Nights</Label>
                        <Input className="mt-1 h-10 rounded-xl" type="number" min="1" value={room.minNights} onChange={(e) => updateRoom(room.id, "minNights", parseInt(e.target.value) || 1)} />
                      </div>
                      <div>
                        <Label className="text-[12px] font-medium text-gray-500">Deposit (&#8358;)</Label>
                        <Input className="mt-1 h-10 rounded-xl" type="number" placeholder="Optional" value={room.deposit || ""} onChange={(e) => updateRoom(room.id, "deposit", parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="my-8 border-t border-gray-200" />

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
              <p className="text-[12px] text-[#1a56db] font-medium">
                <strong>Starting from &#8358;{minPrice.toLocaleString()}/night</strong> &middot; {totalRooms} total room{totalRooms !== 1 ? "s" : ""} across {rooms.length} categories
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="flex gap-8">
            {/* Left: Checklist */}
            <div className="flex-1 space-y-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#ecfdf5] flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-5 h-5 text-[#16a34a]" />
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-gray-900">You're almost there!</h3>
                  <p className="text-[13px] text-gray-500 mt-0.5">Complete all required fields to proceed with publishing your property.</p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { label: "Basic Info", sub: "Property title, type, and location details", targetStep: 0 },
                  { label: "Amenities & Features", sub: "What your property offers to guests", targetStep: 2 },
                  { label: "Photos & Media", sub: "Images of your property and rooms", targetStep: 1 },
                  { label: "Pricing & Policies", sub: "Room rates, deposits, and house rules", targetStep: 3 },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-4 rounded-xl bg-[#f8f9fa] hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#dcfce7] flex items-center justify-center">
                        <Check className="w-3 h-3 text-[#16a34a]" />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-gray-900">{item.label}</p>
                        <p className="text-[12px] text-gray-500">{item.sub}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setStep(item.targetStep)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-[#1a56db] bg-[#1a56db]/10 hover:bg-[#1a56db]/20 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Browser preview (same as live preview panel but inside the form area) */}
            <div className="w-[320px] shrink-0 hidden xl:block">
              <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm">
                <div className="bg-gray-100 px-3 py-2 space-y-1.5">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                  </div>
                  <div className="bg-white rounded-md px-2.5 py-1 text-[9px] text-gray-400 truncate">citivas.com/{propertySlug}</div>
                </div>

                {/* Hero */}
                <div className="relative h-44 bg-gray-200">
                  {images[0] ? (
                    <img src={images[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                      <Upload className="w-7 h-7 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-white/95 rounded-lg px-2 py-1 shadow">
                    {logo ? (
                      <img src={logo} alt="" className="h-5 w-5 object-contain rounded" />
                    ) : (
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-[#1a56db] font-bold text-[7px] text-white">
                        {(title || "P").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
                      </span>
                    )}
                    <span className="text-[9px] font-bold text-gray-800">{title || "Brand"}</span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-8">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="bg-[#1a56db] text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full">{propertyType}</span>
                      <span className="bg-white/90 text-gray-800 text-[7px] font-bold px-1.5 py-0.5 rounded-full">Verified</span>
                    </div>
                    <p className="text-white text-[12px] font-bold leading-tight">{title || "The Azure Villa"}</p>
                    <p className="text-white/70 text-[8px] mt-0.5">{[city, state].filter(Boolean).join(", ") || "Location"}</p>
                  </div>
                </div>

                {/* About + Key Facts */}
                <div className="px-3 py-3 text-center">
                  <p className="text-[7px] font-bold uppercase tracking-widest text-[#1a56db] mb-0.5">Welcome to</p>
                  <h4 className="text-[12px] font-extrabold text-gray-800 mb-1">{title || "Brand"}</h4>
                  <p className="text-[8px] text-gray-500 leading-[1.5] line-clamp-2 mb-3">
                    {description || "Experience unparalleled luxury."}
                  </p>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { label: "Rating", value: "0 (0)" },
                      { label: "Location", value: city || "City" },
                      { label: "Hours", value: `In ${formatTime(checkin) || "14:00"}` },
                      { label: "From", value: minPrice > 0 ? `\u20A6${minPrice.toLocaleString()}` : "\u20A60" },
                    ].map((f) => (
                      <div key={f.label} className="p-1 rounded-lg border border-gray-200 bg-white">
                        <p className="text-[6px] font-semibold uppercase tracking-wider text-gray-400">{f.label}</p>
                        <p className="text-[7px] font-bold text-gray-800">{f.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rooms */}
            {rooms.filter(r => r.name).length > 0 && (
              <div className="px-3 pb-2.5">
                <h4 className="text-[10px] font-bold text-gray-800 mb-1.5">Featured Rooms</h4>
                <div className="grid grid-cols-2 gap-1.5">
                  {rooms.filter(r => r.name).slice(0, 4).map((room) => (
                    <div key={room.id} className="flex flex-col gap-1 p-1.5 rounded-lg bg-gray-50">
                          {room.images[0] ? (
                            <img src={room.images[0]} alt="" className="w-full h-14 object-cover rounded" />
                          ) : (
                            <div className="w-full h-14 rounded bg-gray-100" />
                          )}
                          <div className="min-w-0">
                            <p className="text-[8px] font-semibold text-gray-700 truncate">{room.name}</p>
                            <p className="text-[7px] text-gray-400 truncate">{room.bedType}</p>
                            {room.pricePerNight > 0 && <p className="text-[7px] font-bold text-[#1a56db]">\u20A6{room.pricePerNight.toLocaleString()}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gallery — bento */}
                <div className="px-3 pb-2.5">
                  <h4 className="text-[10px] font-bold text-gray-800 mb-1.5">Gallery</h4>
                  {images.length > 1 ? (
                    <div className="space-y-1.5">
                      <div className="flex gap-1.5" style={{ height: "80px" }}>
                        <div className="flex-[3] overflow-hidden rounded-lg">
                          <img src={images[0]} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-[2] flex flex-col gap-1.5">
                          {images[1] && <div className="flex-1 overflow-hidden rounded-lg"><img src={images[1]} alt="" className="w-full h-full object-cover" /></div>}
                          {images[2] ? <div className="flex-1 overflow-hidden rounded-lg"><img src={images[2]} alt="" className="w-full h-full object-cover" /></div> : <div className="flex-1" />}
                        </div>
                      </div>
                      {images.slice(3, 5).length > 0 && (
                        <div className="flex gap-1.5">
                          {images.slice(3, 5).map((img, i) => (
                            <div key={i} className="flex-1 overflow-hidden rounded-lg" style={{ height: "50px" }}>
                              <img src={img} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex gap-1.5" style={{ height: "80px" }}>
                        <div className="flex-[3] rounded-lg bg-gray-100" />
                        <div className="flex-[2] flex flex-col gap-1.5">
                          <div className="flex-1 rounded-lg bg-gray-100" />
                          <div className="flex-1 rounded-lg bg-gray-100" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-3 py-3 bg-gray-900 text-white">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {logo ? (
                      <img src={logo} alt="" className="h-5 w-5 object-contain rounded bg-white/10 p-0.5" />
                    ) : (
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-[#1a56db] font-bold text-[7px] text-white">
                        {(title || "P").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
                      </span>
                    )}
                    <span className="text-[10px] font-bold">{title || "Brand"}</span>
                  </div>
                  <p className="text-[7px] text-gray-400">&copy; {new Date().getFullYear()} {title || "Property"}</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 h-12 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#1a56db] rounded-md flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white fill-current">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <span className="text-[13px] font-semibold text-gray-800">{title || "Property Name"}</span>
        </div>
        <span className="text-[11px] text-gray-400">Powered by Citivas</span>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex justify-center overflow-y-auto pb-24">
          <div className="w-full max-w-[860px] px-8 py-8">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-0">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[22px] font-bold text-gray-800">{isEditing ? `Edit ${STEPS[step]}` : `Step ${step + 1}: ${STEPS[step]}`}</h2>
                <span className="bg-[#1a56db] text-white text-[11px] font-bold px-3 py-1 rounded-full">
                  Step {step + 1} of {STEPS.length}
                </span>
              </div>
              <div className="w-full h-[3px] bg-gray-200 rounded-full mb-0 relative">
                <div className="absolute left-0 top-0 h-full bg-[#1a56db] rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="flex items-center -mb-[1px]">
                {STEPS.map((s, i) => (
                  <button key={s} onClick={() => i < step && setStep(i)}
                    className={`flex-1 py-4 text-[13px] font-medium transition-all border-b-[2.5px] ${
                      i === step ? "border-b-[#1a56db] text-[#1a56db] font-bold"
                        : i < step ? "border-b-transparent text-[#1a56db] cursor-pointer hover:opacity-80"
                          : "border-b-transparent text-gray-400"
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 border-t-0 p-6">
              {renderStepContent()}
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div className="w-[480px] bg-white border-l border-gray-200 px-6 py-6 hidden lg:block shrink-0 overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-gray-600" />
              <span className="text-[13px] font-bold text-gray-800">LIVE PREVIEW</span>
            </div>
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#f87171]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#fbbf24]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#34d399]" />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm">
            <div className="bg-gray-100 px-4 py-2.5 space-y-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
              </div>
              <div className="bg-white rounded-md px-3 py-1.5 text-[10px] text-gray-400 truncate">citivas.com/{propertySlug}</div>
            </div>

            {/* Hero */}
            <div className="relative h-56 bg-gray-200">
              {images[0] ? (
                <img src={images[0]} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-gray-300" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
              {/* Logo + name */}
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-white/95 rounded-lg px-2.5 py-1.5 shadow">
                {logo ? (
                  <img src={logo} alt="" className="h-6 w-6 object-contain rounded" />
                ) : (
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded bg-[#1a56db] font-bold text-[8px] text-white">
                    {(title || "P").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </span>
                )}
                <span className="text-[10px] font-bold text-gray-800">{title || "Brand Name"}</span>
              </div>
              {/* Badges */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="bg-[#1a56db] text-white text-[8px] font-bold px-2 py-0.5 rounded-full">{propertyType}</span>
                  <span className="bg-white/90 text-gray-800 text-[8px] font-bold px-2 py-0.5 rounded-full">Verified by Citivas</span>
                </div>
                <h3 className="text-white text-[16px] font-bold leading-tight">{title || "The Azure Villa"}</h3>
                <p className="text-white/70 text-[10px] mt-0.5">{[city, state].filter(Boolean).join(", ") || "Location"}</p>
              </div>
            </div>

            {/* About + Key Facts */}
            <div className="px-5 py-5 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#1a56db] mb-1">Welcome to</p>
              <h4 className="text-[16px] font-extrabold text-gray-800 mb-2">{title || "The Azure Villa"}</h4>
              <p className="text-[11px] text-gray-500 leading-[1.7] line-clamp-3 mb-5">
                {description || "Experience unparalleled luxury in the heart of the Aegean. Our villa offers a private sanctuary with breathtaking views."}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Rating", value: "0 (0)" },
                  { label: "Location", value: city || "City" },
                  { label: "Hours", value: `In ${formatTime(checkin) || "14:00"} · Out ${formatTime(checkout) || "12:00"}` },
                  { label: "Starting from", value: minPrice > 0 ? `\u20A6${minPrice.toLocaleString()}` : "\u20A60" },
                ].map((f) => (
                  <div key={f.label} className="p-2 rounded-xl border border-gray-200 bg-white">
                    <p className="text-[7px] font-semibold uppercase tracking-wider text-gray-400">{f.label}</p>
                    <p className="text-[9px] font-bold text-gray-800 mt-0.5">{f.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Rooms */}
            {rooms.filter(r => r.name).length > 0 && (
              <div className="px-5 pb-4">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#1a56db] mb-1 text-center">Availability</p>
                <h4 className="text-[14px] font-extrabold text-gray-800 mb-3 text-center">Featured Rooms</h4>
                <div className="grid grid-cols-2 gap-2">
                  {rooms.filter(r => r.name).slice(0, 4).map((room) => (
                    <div key={room.id} className="rounded-xl border border-gray-200 overflow-hidden">
                      {room.images[0] ? (
                        <div className="h-20 bg-gray-100">
                          <img src={room.images[0]} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-20 bg-gray-100 flex items-center justify-center">
                          <span className="text-[10px] text-gray-400">No image</span>
                        </div>
                      )}
                      <div className="p-2">
                        <p className="text-[10px] font-bold text-gray-800 truncate">{room.name}</p>
                        <p className="text-[8px] text-gray-400 mt-0.5 truncate">{room.bedType} · {room.maxOccupancy} guests</p>
                        {room.pricePerNight > 0 && <p className="text-[10px] font-bold text-[#1a56db] mt-1">\u20A6{room.pricePerNight.toLocaleString()}</p>}
                      </div>
                    </div>
                  ))}
                  {rooms.filter(r => r.name).length > 4 && (
                    <p className="col-span-2 text-[10px] text-gray-400 text-center">+{rooms.filter(r => r.name).length - 4} more</p>
                  )}
                </div>
              </div>
            )}

            {/* Gallery — bento flex */}
            <div className="px-5 pb-4">
              <h4 className="text-[14px] font-extrabold text-gray-800 mb-3">Gallery</h4>
              {images.length > 1 ? (
                <div className="space-y-2">
                  <div className="flex gap-2" style={{ height: "140px" }}>
                    <div className="flex-[3] overflow-hidden rounded-xl">
                      <img src={images[0]} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-[2] flex flex-col gap-2">
                      {images[1] && (
                        <div className="flex-1 overflow-hidden rounded-xl">
                          <img src={images[1]} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      {images[2] ? (
                        <div className="flex-1 overflow-hidden rounded-xl">
                          <img src={images[2]} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : <div className="flex-1" />}
                    </div>
                  </div>
                  {images.slice(3, 5).length > 0 && (
                    <div className="flex gap-2">
                      {images.slice(3, 5).map((img, i) => (
                        <div key={i} className="flex-1 overflow-hidden rounded-xl" style={{ height: "90px" }}>
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2" style={{ height: "140px" }}>
                    <div className="flex-[3] rounded-xl bg-gray-100" />
                    <div className="flex-[2] flex flex-col gap-2">
                      <div className="flex-1 rounded-xl bg-gray-100" />
                      <div className="flex-1 rounded-xl bg-gray-100" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 rounded-xl bg-gray-100" style={{ height: "90px" }} />
                    <div className="flex-1 rounded-xl bg-gray-100" style={{ height: "90px" }} />
                  </div>
                </div>
              )}
            </div>

            {/* Amenities */}
            {selectedAmenities.length > 0 && (
              <div className="px-5 pb-4">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#1a56db] mb-1 text-center">What we offer</p>
                <h4 className="text-[14px] font-extrabold text-gray-800 mb-3 text-center">Amenities</h4>
                <div className="grid grid-cols-2 gap-2">
                  {selectedAmenities.slice(0, 4).map((a) => (
                    <div key={a} className="flex items-center gap-2 p-2 rounded-xl border border-gray-200 bg-white">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-[#1a56db]" />
                      </div>
                      <span className="text-[10px] font-medium text-gray-700">{a}</span>
                    </div>
                  ))}
                </div>
                {selectedAmenities.length > 4 && (
                  <p className="text-[10px] text-gray-400 text-center mt-2">+{selectedAmenities.length - 4} more</p>
                )}
              </div>
            )}

            {/* Contact */}
            {(phone || whatsapp || email || address) && (
              <div className="px-5 pb-4 border-t border-gray-100 pt-4">
                <h4 className="text-[14px] font-extrabold text-gray-800 mb-3">Contact</h4>
                <div className="space-y-2 text-[11px]">
                  {address && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-400 font-medium w-16 shrink-0">Address</span>
                      <span className="text-gray-600">{address}</span>
                    </div>
                  )}
                  {phone && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 font-medium w-16 shrink-0">Phone</span>
                      <span className="text-[#1a56db]">{phone}</span>
                    </div>
                  )}
                  {email && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 font-medium w-16 shrink-0">Email</span>
                      <span className="text-[#1a56db]">{email}</span>
                    </div>
                  )}
                  {whatsapp && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 font-medium w-16 shrink-0">WhatsApp</span>
                      <span className="text-green-600">{whatsapp}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-5 py-4 bg-gray-900 text-white">
              <div className="flex items-center gap-2 mb-3">
                {logo ? (
                  <img src={logo} alt="" className="h-7 w-7 object-contain rounded bg-white/10 p-0.5" />
                ) : (
                  <span className="inline-flex items-center justify-center h-7 w-7 rounded bg-[#1a56db] font-bold text-[9px] text-white">
                    {(title || "P").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </span>
                )}
                <span className="text-[12px] font-bold">{title || "Brand Name"}</span>
              </div>
              <p className="text-[9px] text-gray-400">&copy; {new Date().getFullYear()} {title || "Property"}. All rights reserved.</p>
              <p className="text-[8px] text-gray-500 mt-0.5">Powered by Bluewaves Technologies</p>
            </div>
          </div>

          <div className="mt-4 text-center">
            <p className="text-[10px] text-gray-400">
              Public link will be: <span className="font-semibold text-gray-600">citivas.com/{propertySlug}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="max-w-[860px] mx-auto px-8 py-3.5 flex items-center justify-between">
          {step < STEPS.length - 1 ? (
            <>
              <button onClick={() => step === 0 ? navigate("/profile/dashboard?tab=listings") : setStep(step - 1)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-300 text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <div className="text-[11px] text-gray-400 font-medium tracking-wide">
                {lastSaved ? `AUTO-SAVED ${formatTimeAgo(lastSaved)}` : ""}
              </div>
              <button onClick={() => setStep(step + 1)} disabled={!canNext()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1a56db] text-white text-[13px] font-bold hover:bg-[#1548b8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => navigate("/profile/dashboard?tab=listings")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-300 text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Exit
              </button>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#16a34a]" />
                <span className="text-[12px] font-semibold text-gray-700">Step {step + 1} of {STEPS.length}</span>
              </div>
              <button
                onClick={() => termsAccepted ? handleSubmit() : setShowTermsModal(true)}
                disabled={isSubmitting || !canNext()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1a56db] text-white text-[13px] font-bold hover:bg-[#1548b8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {isSubmitting ? (isEditing ? "Updating..." : "Publishing...") : <><Check className="w-4 h-4" /> {isEditing ? "Update Property" : "Publish Property"}</>}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white border-t border-gray-200 px-8 py-4 flex items-center justify-between text-[11px] text-gray-400 mt-auto pb-16">
        <span>&copy; 2024 {title || "Property Name"}. Powered by Citivas Hospitality.</span>
        <div className="flex gap-5">
          <a href="/privacy" className="hover:text-gray-600 transition-colors">Privacy Policy</a>
          <a href="/terms" className="hover:text-gray-600 transition-colors">Terms of Service</a>
          <a href="/contact-support" className="hover:text-gray-600 transition-colors">Contact Us</a>
        </div>
      </div>
      {/* Terms & Conditions Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) setShowTermsModal(false); }}>
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-bold text-gray-900">Hospitality Partner Terms</h2>
                <button onClick={() => { setShowTermsModal(false); setTermsAccepted(false); }} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <p className="text-[13px] text-gray-500 mt-1">Please read and accept the following terms before publishing.</p>
            </div>

            <div className="p-6 max-h-[400px] overflow-y-auto text-[13px] text-gray-600 leading-relaxed space-y-4">
              <p>By publishing this listing on Citivas Hospitality, you agree to the following terms and conditions:</p>

              <div>
                <h4 className="font-bold text-gray-900 mb-1">1. Commission &amp; Fees</h4>
                <p>A 7% commission will be charged on each successful booking made through the Citivas platform. This commission covers payment processing, platform maintenance, and customer support.</p>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-1">2. Listing Accuracy</h4>
                <p>You confirm that all information provided in this listing — including property description, images, pricing, and amenities — is accurate and up to date. Misleading or fraudulent listings may result in suspension.</p>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-1">3. Cancellation Policy</h4>
                <p>Guest cancellations and refund requests will be handled according to the cancellation policy you define. Citivas is not responsible for disputes between hosts and guests regarding cancellations.</p>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-1">4. Guest Safety</h4>
                <p>You are responsible for ensuring your property meets basic safety standards, including fire safety, clean sanitary conditions, and structural integrity. Citivas reserves the right to remove listings that pose safety risks.</p>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-1">5. Payouts</h4>
                <p>Guest payments are processed through Paystack and disbursed to your registered bank account after the guest checks in, minus the applicable commission.</p>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-1">6. Content Rights</h4>
                <p>By uploading images and content to Citivas, you grant us a non-exclusive license to display, promote, and market your listing across the platform and affiliated channels.</p>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-1">7. Termination</h4>
                <p>Citivas reserves the right to suspend or terminate your listing or account at any time for violations of these terms, fraudulent activity, or conduct that harms the platform's reputation.</p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 space-y-4">
              <button
                onClick={() => setTermsAccepted(!termsAccepted)}
                className="flex items-center gap-3 text-left group"
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                  termsAccepted ? "bg-[#16a34a] border-[#16a34a]" : "border-gray-300 border-dashed group-hover:border-gray-400"
                }`}>
                  {termsAccepted && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-[13px] text-gray-600">I accept all Terms and Conditions</span>
              </button>

              <button
                onClick={() => { setShowTermsModal(false); }}
                disabled={!termsAccepted}
                className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[14px] font-bold transition-all ${
                  termsAccepted
                    ? "bg-[#16a34a] text-white hover:bg-[#15803d]"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                Publish Property
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
