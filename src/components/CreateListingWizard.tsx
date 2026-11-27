import { useEffect, useReducer, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  Building2, Calendar, Check, ChevronLeft, ChevronRight, Home,
  Hotel, Image as ImageIcon, Loader2, MapPin, Plus, ShoppingBag,
  Sparkles, Store, Ticket, Trash2, UtensilsCrossed, CheckCircle2,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useRegion } from "@/contexts/RegionContext";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { useCreateDoc } from "@/lib/useFirestore";
import { logActivity } from "@/lib/activityLog";
import { CLOUDINARY_FOLDERS } from "@/lib/cloudinary";
import ImageUpload from "@/components/ImageUpload";
import MultiImageUpload from "@/components/MultiImageUpload";
import { AddressPicker } from "@/components/AddressPicker";
import {
  BUSINESS_CATEGORIES, COMMERCIAL_USAGES, EVENT_CATEGORIES,
  FURNISHING_OPTIONS, LAND_SIZE_UNITS, LAND_TITLE_TYPES,
  MENU_CATEGORIES, NIGERIAN_STATES, PROPERTY_AMENITIES,
  PROPERTY_SUB_TYPES, RENT_BILLING_PERIODS, RESTAURANT_AMENITIES,
  RESTAURANT_CUISINES, RESTAURANT_PRICE_TIERS, RESTAURANT_TYPES,
  STATE_CITIES, type NigerianState, type PropertySubType,
} from "@/lib/nigerianStates";
import {
  buildUnifiedListingPayload, createInitialListingForm,
  validateListingStep, type ListingKind, type UnifiedListingForm,
} from "@/lib/listingSchema";

interface LinkedBusinessOption {
  id: string;
  title: string;
  location?: string;
  state?: string;
  city?: string;
}

interface CreateListingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: ListingKind | "";
  defaultBusinessId?: string;
  myBusinesses: LinkedBusinessOption[];
  onCreated?: (collectionName: string, docId?: string) => void;
}

type Action =
  | { type: "SET_FIELD"; field: keyof UnifiedListingForm; value: UnifiedListingForm[keyof UnifiedListingForm] }
  | { type: "PATCH"; patch: Partial<UnifiedListingForm> }
  | { type: "RESET"; initial: UnifiedListingForm };

function formReducer(state: UnifiedListingForm, action: Action): UnifiedListingForm {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "PATCH":
      return { ...state, ...action.patch };
    case "RESET":
      return action.initial;
    default:
      return state;
  }
}

const MAIN_LISTING_TYPES: {
  type: ListingKind;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}[] = [
  {
    type: "property",
    title: "Property",
    subtitle: "Rentals, shortlets, hotels, land & commercial spaces",
    icon: Home,
    accent: "text-[#1E88E5] bg-[#1E88E5]/10",
  },
  {
    type: "product",
    title: "Product",
    subtitle: "Physical goods, fashion, gadgets & marketplace deals",
    icon: ShoppingBag,
    accent: "text-[#D9891F] bg-[#D9891F]/10",
  },
  {
    type: "restaurant",
    title: "Restaurant",
    subtitle: "Eateries, lounges, cafes with cuisine & starter menu",
    icon: UtensilsCrossed,
    accent: "text-[#ea580c] bg-[#ea580c]/10",
  },
  {
    type: "event",
    title: "Event",
    subtitle: "Concerts, festivals, conferences & ticketed experiences",
    icon: Calendar,
    accent: "text-[#10B981] bg-[#10B981]/10",
  },
];

const PRODUCT_CATEGORIES = [
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
  "Other",
];

const ITEM_CONDITIONS = [
  "Brand New",
  "Like New / Open Box",
  "Refurbished",
  "Used - Excellent",
  "Used - Good",
  "Used - Fair",
];

const STEP_LABELS = ["Category", "Details & Location", "Specifications", "Media & Review"];

export function CreateListingWizard({
  open,
  onOpenChange,
  defaultType = "",
  defaultBusinessId = "individual",
  myBusinesses,
  onCreated,
}: CreateListingWizardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const {
    state: detectedRegionState,
    locationName: detectedCity,
    userCoords,
    userAddress,
  } = useRegion();

  const resolveState = (regionState: string): NigerianState | "" => {
    if (regionState === "FCT") return "FCT (Abuja)" as NigerianState;
    if ((NIGERIAN_STATES as readonly string[]).includes(regionState)) {
      return regionState as NigerianState;
    }
    return "";
  };

  const buildInitialWithRegion = (typeOverride?: ListingKind | "", bizId?: string): UnifiedListingForm => {
    const defState = resolveState(detectedRegionState);
    const cities = defState ? STATE_CITIES[defState] || [] : [];
    const defCity = defState && detectedCity && cities.includes(detectedCity)
      ? detectedCity
      : cities[0] || "";
    return createInitialListingForm({
      listingType: typeOverride || "",
      businessLinkId: bizId || "individual",
      state: defState,
      city: defCity,
      streetAddress: userAddress || "",
      lat: userCoords?.lat,
      lon: userCoords?.lon,
    });
  };

  const [form, dispatch] = useReducer(formReducer, undefined, () =>
    buildInitialWithRegion(defaultType, defaultBusinessId)
  );
  const [step, setStep] = useState<1 | 2 | 3 | 4>(defaultType ? 2 : 1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createBusiness = useCreateDoc("businesses");
  const createEvent = useCreateDoc("events");
  const createProduct = useCreateDoc("marketplace");
  const createProperty = useCreateDoc("house_listings");

  useEffect(() => {
    if (open) {
      dispatch({
        type: "RESET",
        initial: buildInitialWithRegion(defaultType, defaultBusinessId),
      });
      setStep(defaultType ? 2 : 1);
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultType, defaultBusinessId]);

  const setField = <K extends keyof UnifiedListingForm>(field: K, value: UnifiedListingForm[K]) => {
    dispatch({ type: "SET_FIELD", field, value });
    if (errors[field as string]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field as string];
        return next;
      });
    }
  };

  const handleSelectType = (type: ListingKind) => {
    dispatch({
      type: "PATCH",
      patch: {
        listingType: type,
        propertySubType: "",
        bizCategory: "",
      },
    });
    setErrors({});
    setStep(2);
  };

  const handleNext = () => {
    const check = validateListingStep(step, form);
    if (!check.valid) {
      setErrors(check.errors);
      const firstMsg = Object.values(check.errors)[0];
      toast({ title: firstMsg || "Please complete required fields", variant: "destructive" });
      return;
    }
    setErrors({});
    if (step < 4) setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
  };

  const handleBack = () => {
    setErrors({});
    if (step > 1) {
      if (step === 2 && defaultType) {
        onOpenChange(false);
        return;
      }
      setStep((s) => (s - 1) as 1 | 2 | 3 | 4);
    } else {
      onOpenChange(false);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      navigate("/auth");
      return;
    }
    const check = validateListingStep(4, form);
    if (!check.valid) {
      setErrors(check.errors);
      const firstMsg = Object.values(check.errors)[0];
      toast({ title: firstMsg || "Please check required fields", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const linkedBiz = myBusinesses.find((b) => b.id === form.businessLinkId);
      const serialized = buildUnifiedListingPayload(form, {
        userId: user.id,
        userName: user.name || "Citizen",
        userEmail: user.email || "",
        userPhone: user.phone || "",
        linkedBusiness: linkedBiz,
      });

      if (serialized.subCollectionPath) {
        await addDoc(
          collection(
            db,
            serialized.subCollectionPath.parentCollection,
            serialized.subCollectionPath.parentId,
            serialized.subCollectionPath.subCollection
          ),
          { ...serialized.payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }
        ).catch((e) => console.warn("Subcollection mirror warning:", e));
      }

      let createdRef: { id?: string } | undefined;
      if (serialized.collectionName === "businesses") {
        createdRef = await createBusiness.mutateAsync(serialized.payload);
      } else if (serialized.collectionName === "marketplace") {
        createdRef = await createProduct.mutateAsync(serialized.payload);
      } else if (serialized.collectionName === "house_listings") {
        createdRef = await createProperty.mutateAsync(serialized.payload);
      } else if (serialized.collectionName === "events") {
        createdRef = await createEvent.mutateAsync(serialized.payload);
      }

      qc.invalidateQueries({ queryKey: ["myListings"] });
      qc.invalidateQueries({ queryKey: ["marketplace_all"] });
      qc.invalidateQueries({ queryKey: ["house_listings_and_properties"] });
      qc.invalidateQueries({ queryKey: ["events_all"] });

      logActivity({
        userId: user.id,
        userEmail: user.email || "",
        userName: user.name || "",
        action: serialized.activityAction,
        targetType: serialized.activityTargetType,
        targetId: createdRef?.id || "",
        targetName: form.title,
        details: `Created ${form.listingType}: ${form.title}`,
      });

      toast({ title: serialized.successTitle });
      onOpenChange(false);
      onCreated?.(serialized.collectionName, createdRef?.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Please try again";
      console.error("[CreateListingWizard] submit error:", err);
      toast({
        title: "Failed to publish listing",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const titleLabel =
    form.listingType === "property"
      ? "List a Property"
      : form.listingType === "product"
      ? "Post a Product"
      : form.listingType === "restaurant"
      ? "List a Restaurant"
      : form.listingType === "event"
      ? "Create an Event"
      : form.listingType === "business"
      ? "Register Business"
      : "Create Listing";

  const cities = form.state ? STATE_CITIES[form.state as NigerianState] || [] : [];
  const cloudinaryFolder =
    form.listingType === "event"
      ? CLOUDINARY_FOLDERS.EVENTS
      : form.listingType === "product"
      ? CLOUDINARY_FOLDERS.MARKETPLACE
      : CLOUDINARY_FOLDERS.BUSINESSES;

  const renderFieldError = (key: string) =>
    errors[key] ? <p className="text-xs text-destructive mt-1">{errors[key]}</p> : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl p-0">
        {/* Top Progress Header */}
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border px-6 pt-5 pb-4">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4 pr-6">
              <div>
                <DialogTitle className="text-xl font-bold">{titleLabel}</DialogTitle>
                <DialogDescription className="mt-0.5">
                  Step {step} of 4 · {STEP_LABELS[step - 1]}
                </DialogDescription>
              </div>
              {form.listingType && (
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground tabular-nums">
                  {form.listingType}
                </span>
              )}
            </div>
          </DialogHeader>

          {/* Stepper Bar */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {STEP_LABELS.map((label, idx) => {
              const sNum = (idx + 1) as 1 | 2 | 3 | 4;
              const isDone = step > sNum;
              const isActive = step === sNum;
              return (
                <button
                  key={label}
                  type="button"
                  disabled={sNum > step}
                  onClick={() => sNum < step && setStep(sNum)}
                  className="text-left group disabled:cursor-default"
                >
                  <div
                    className={`h-1.5 rounded-full transition-colors ${
                      isActive ? "bg-primary" : isDone ? "bg-emerald-500" : "bg-muted"
                    }`}
                  />
                  <div className="flex items-center gap-1 mt-1.5">
                    {isDone && <Check className="w-3 h-3 text-emerald-500 shrink-0" />}
                    <span
                      className={`text-[11px] font-medium truncate ${
                        isActive ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {sNum}. {label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* STEP 1: LISTING TYPE SELECTION */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Choose what you want to list
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  One unified flow for properties, marketplace products, restaurants, and events.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MAIN_LISTING_TYPES.map((opt) => {
                  const Icon = opt.icon;
                  const active = form.listingType === opt.type;
                  return (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => handleSelectType(opt.type)}
                      className={`flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all ${
                        active
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40 hover:bg-muted/30"
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${opt.accent}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-foreground">{opt.title}</h4>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {opt.subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Running a general shop, salon, or service agency?
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectType("business")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <Store className="w-3.5 h-3.5" /> Register General Business
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CORE DETAILS & LOCATION */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Optional Business Workspace Link for Property / Product */}
              {(form.listingType === "product" || form.listingType === "property") && (
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Seller Profile
                    </Label>
                    <span className="text-[11px] text-muted-foreground">Optional storefront link</span>
                  </div>
                  <Select
                    value={form.businessLinkId}
                    onValueChange={(v) => setField("businessLinkId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Independent Citizen Seller" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Independent Citizen Listing</SelectItem>
                      {myBusinesses.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.title} (Registered Business)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {form.listingType === "restaurant"
                    ? "Restaurant Name *"
                    : form.listingType === "event"
                    ? "Event Title *"
                    : form.listingType === "product"
                    ? "Product Title *"
                    : form.listingType === "business"
                    ? "Business Name *"
                    : "Property Title *"}
                </Label>
                <Input
                  className="mt-1.5"
                  placeholder={
                    form.listingType === "restaurant"
                      ? "e.g. Yellow Chilli Kitchen & Grill"
                      : form.listingType === "event"
                      ? "e.g. Lagos Food & Culture Night"
                      : form.listingType === "product"
                      ? "e.g. iPhone 15 Pro Max 256GB"
                      : form.listingType === "business"
                      ? "e.g. Glokakes Bakehouse"
                      : "e.g. Modern 2-Bedroom Apartment in Lekki"
                  }
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                />
                {renderFieldError("title")}
              </div>

              {form.listingType === "business" && (
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Business Category *
                  </Label>
                  <Select
                    value={form.bizCategory}
                    onValueChange={(v) => setField("bizCategory", v)}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {renderFieldError("bizCategory")}
                </div>
              )}

              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Description *
                </Label>
                <Textarea
                  className="mt-1.5"
                  rows={3}
                  placeholder="Share key highlights, condition, or what guests should expect..."
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                />
                {renderFieldError("description")}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    State *
                  </Label>
                  <Select
                    value={form.state}
                    onValueChange={(v) => {
                      dispatch({
                        type: "PATCH",
                        patch: { state: v as NigerianState, city: "" },
                      });
                    }}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {NIGERIAN_STATES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {renderFieldError("state")}
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    City / Area
                  </Label>
                  <Select
                    value={form.city}
                    onValueChange={(v) => setField("city", v)}
                    disabled={!form.state}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder={form.state ? "Select area" : "Select state first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Street Address / Landmark
                  </Label>
                  <Input
                    className="mt-1.5"
                    placeholder="e.g. 14 Admiralty Way, Lekki Phase 1"
                    value={form.streetAddress}
                    onChange={(e) => setField("streetAddress", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Contact Phone {form.listingType === "restaurant" || form.listingType === "business" ? "*" : "(Optional)"}
                  </Label>
                  <Input
                    className="mt-1.5"
                    placeholder="+234 801 234 5678"
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                  />
                  {renderFieldError("phone")}
                </div>
              </div>

              <div className="rounded-xl border border-border p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span>Pin Exact Location on Map (Optional)</span>
                </div>
                <AddressPicker
                  onLocationConfirmed={(data) => {
                    dispatch({
                      type: "PATCH",
                      patch: { streetAddress: data.address, lat: data.lat, lon: data.lon },
                    });
                  }}
                  initialAddress={form.streetAddress}
                  initialLat={form.lat}
                  initialLon={form.lon}
                />
              </div>
            </div>
          )}

          {/* STEP 3: TYPE-SPECIFIC SPECIFICATIONS */}
          {step === 3 && (
            <div className="space-y-5">
              {/* PROPERTY SPECIFICATIONS */}
              {form.listingType === "property" && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Property Category *
                    </Label>
                    <div className="grid grid-cols-2 gap-2.5 mt-2">
                      {PROPERTY_SUB_TYPES.map((st) => {
                        const active = form.propertySubType === st.value;
                        return (
                          <button
                            key={st.value}
                            type="button"
                            onClick={() => setField("propertySubType", st.value)}
                            className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                              active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
                            }`}
                          >
                            <span className="text-xl">{st.icon}</span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground">{st.label}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{st.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {renderFieldError("propertySubType")}
                  </div>

                  {form.propertySubType === "rent" && (
                    <div className="space-y-4 p-4 rounded-xl border border-border bg-muted/10">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-semibold">House Type *</Label>
                          <Select value={form.rentHouseType} onValueChange={(v) => setField("rentHouseType", v)}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                            <SelectContent>
                              {["Duplex", "Bungalow", "Terraced Duplex", "Semi-Detached Duplex", "Detached Duplex", "Flat / Apartment", "Mini Flat", "Room & Parlour", "Penthouse", "Mansion"].map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {renderFieldError("rentHouseType")}
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Payment Plan</Label>
                          <Select value={form.rentBillingPeriod} onValueChange={(v) => setField("rentBillingPeriod", v)}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select plan" /></SelectTrigger>
                            <SelectContent>
                              {RENT_BILLING_PERIODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs font-semibold">Base Rent (₦) *</Label>
                          <Input
                            className="mt-1 tabular-nums"
                            type="number"
                            placeholder="1500000"
                            value={form.propertyPrice}
                            onChange={(e) => setField("propertyPrice", e.target.value)}
                          />
                          {renderFieldError("propertyPrice")}
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Bedrooms</Label>
                          <Input
                            className="mt-1 tabular-nums"
                            type="number"
                            min={0}
                            value={form.rentBedrooms}
                            onChange={(e) => setField("rentBedrooms", Math.max(0, Number(e.target.value) || 0))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Bathrooms</Label>
                          <Input
                            className="mt-1 tabular-nums"
                            type="number"
                            min={0}
                            value={form.rentBathrooms}
                            onChange={(e) => setField("rentBathrooms", Math.max(0, Number(e.target.value) || 0))}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs font-semibold">Service Charge (₦)</Label>
                          <Input className="mt-1" type="number" value={form.rentServiceCharge} onChange={(e) => setField("rentServiceCharge", e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Caution Fee (₦)</Label>
                          <Input className="mt-1" type="number" value={form.rentCautionFee} onChange={(e) => setField("rentCautionFee", e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Legal Fee (₦)</Label>
                          <Input className="mt-1" type="number" value={form.rentLegalFee} onChange={(e) => setField("rentLegalFee", e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Agency Fee (₦)</Label>
                          <Input className="mt-1" type="number" value={form.rentAgencyFee} onChange={(e) => setField("rentAgencyFee", e.target.value)} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-semibold">Furnishing</Label>
                          <Select value={form.rentFurnishing} onValueChange={(v) => setField("rentFurnishing", v)}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {FURNISHING_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Available From</Label>
                          <Input className="mt-1" type="date" value={form.rentAvailableFrom} onChange={(e) => setField("rentAvailableFrom", e.target.value)} />
                        </div>
                      </div>
                    </div>
                  )}

                  {form.propertySubType === "shortlet_hotel" && (
                    <div className="space-y-4 p-4 rounded-xl border border-border bg-muted/10">
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border">
                        <div className="flex items-center gap-2">
                          <Hotel className="w-4 h-4 text-primary" />
                          <span className="text-xs font-bold uppercase tracking-wider">Shortlet & Hotel Rate</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onOpenChange(false);
                            navigate("/mini-site-wizard");
                          }}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Open Multi-Room Mini-Site Wizard →
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs font-semibold">Nightly Rate (₦) *</Label>
                          <Input className="mt-1 tabular-nums" type="number" placeholder="75000" value={form.propertyPrice} onChange={(e) => setField("propertyPrice", e.target.value)} />
                          {renderFieldError("propertyPrice")}
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Bedrooms</Label>
                          <Input className="mt-1 tabular-nums" type="number" min={0} value={form.shortletBedrooms} onChange={(e) => setField("shortletBedrooms", Math.max(0, Number(e.target.value) || 0))} />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Bathrooms</Label>
                          <Input className="mt-1 tabular-nums" type="number" min={0} value={form.shortletBathrooms} onChange={(e) => setField("shortletBathrooms", Math.max(0, Number(e.target.value) || 0))} />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Max Guests</Label>
                          <Input className="mt-1 tabular-nums" type="number" min={1} value={form.shortletMaxGuests} onChange={(e) => setField("shortletMaxGuests", Math.max(1, Number(e.target.value) || 1))} />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold mb-2 block">Amenities</Label>
                        <div className="flex flex-wrap gap-2">
                          {PROPERTY_AMENITIES.slice(0, 12).map((a) => {
                            const active = form.selectedAmenities.includes(a.label);
                            return (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() =>
                                  setField(
                                    "selectedAmenities",
                                    active
                                      ? form.selectedAmenities.filter((x) => x !== a.label)
                                      : [...form.selectedAmenities, a.label]
                                  )
                                }
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                  active ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                                }`}
                              >
                                {a.icon} {a.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {form.propertySubType === "land" && (
                    <div className="space-y-4 p-4 rounded-xl border border-border bg-muted/10">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-semibold">Price (₦) *</Label>
                          <Input className="mt-1 tabular-nums" type="number" placeholder="25000000" value={form.propertyPrice} onChange={(e) => setField("propertyPrice", e.target.value)} />
                          {renderFieldError("propertyPrice")}
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Sale Type</Label>
                          <Select value={form.landSaleType} onValueChange={(v) => setField("landSaleType", v)}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sale">Outright Sale</SelectItem>
                              <SelectItem value="rent">Rent / Hire</SelectItem>
                              <SelectItem value="lease">Long-term Lease</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs font-semibold">Plot Size *</Label>
                          <Input className="mt-1 tabular-nums" type="number" placeholder="500" value={form.landPlotSize} onChange={(e) => setField("landPlotSize", e.target.value)} />
                          {renderFieldError("landPlotSize")}
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Unit</Label>
                          <Select value={form.landSizeUnit} onValueChange={(v) => setField("landSizeUnit", v)}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {LAND_SIZE_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <Label className="text-xs font-semibold">Title Document</Label>
                          <Select value={form.landTitleType} onValueChange={(v) => setField("landTitleType", v)}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select title" /></SelectTrigger>
                            <SelectContent>
                              {LAND_TITLE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  {form.propertySubType === "commercial" && (
                    <div className="space-y-4 p-4 rounded-xl border border-border bg-muted/10">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-semibold">Commercial Type *</Label>
                          <Select value={form.commercialType} onValueChange={(v) => setField("commercialType", v)}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                            <SelectContent>
                              {["Hall/Event Center", "Office Space", "Shop/Retail", "Warehouse", "Plaza/Complex", "Co-working Space", "Restaurant Space", "Other"].map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {renderFieldError("commercialType")}
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Rent / Price (₦) *</Label>
                          <Input className="mt-1 tabular-nums" type="number" placeholder="5000000" value={form.propertyPrice} onChange={(e) => setField("propertyPrice", e.target.value)} />
                          {renderFieldError("propertyPrice")}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs font-semibold">Billing Period</Label>
                          <Select value={form.commercialBillingPeriod} onValueChange={(v) => setField("commercialBillingPeriod", v)}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {["Per Annum", "Per 2 Years", "Per 6 Months", "Per Month", "Per Event", "Outright Sale"].map((b) => (
                                <SelectItem key={b} value={b}>{b}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Size (sqm)</Label>
                          <Input className="mt-1 tabular-nums" type="number" placeholder="250" value={form.commercialSpaceSize} onChange={(e) => setField("commercialSpaceSize", e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Capacity (seats)</Label>
                          <Input className="mt-1 tabular-nums" type="number" placeholder="300" value={form.commercialCapacity} onChange={(e) => setField("commercialCapacity", e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold mb-2 block">Suitable For</Label>
                        <div className="flex flex-wrap gap-2">
                          {COMMERCIAL_USAGES.map((u) => {
                            const active = form.commercialUsages.includes(u);
                            return (
                              <button
                                key={u}
                                type="button"
                                onClick={() =>
                                  setField(
                                    "commercialUsages",
                                    active
                                      ? form.commercialUsages.filter((x) => x !== u)
                                      : [...form.commercialUsages, u]
                                  )
                                }
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                                  active ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                                }`}
                              >
                                {u}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PRODUCT SPECIFICATIONS */}
              {form.listingType === "product" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Product Category *
                      </Label>
                      <Select value={form.productCategory} onValueChange={(v) => setField("productCategory", v)}>
                        <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          {PRODUCT_CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {renderFieldError("productCategory")}
                    </div>
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Item Condition
                      </Label>
                      <Select value={form.itemCondition} onValueChange={(v) => setField("itemCondition", v)}>
                        <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ITEM_CONDITIONS.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Regular Price (₦) *
                      </Label>
                      <Input
                        type="number"
                        className="mt-1.5 tabular-nums"
                        placeholder="150000"
                        value={form.productPrice}
                        onChange={(e) => setField("productPrice", e.target.value)}
                      />
                      {renderFieldError("productPrice")}
                    </div>
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Promo Price (₦) (Optional)
                      </Label>
                      <Input
                        type="number"
                        className="mt-1.5 tabular-nums"
                        placeholder="120000"
                        value={form.promoPrice}
                        onChange={(e) => setField("promoPrice", e.target.value)}
                      />
                      {renderFieldError("promoPrice")}
                    </div>
                  </div>

                  {form.promoPrice && form.productPrice && Number(form.productPrice) > Number(form.promoPrice) && (
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                      <span>Promo discount active</span>
                      <span className="font-bold tabular-nums">
                        Save ₦{(Number(form.productPrice) - Number(form.promoPrice)).toLocaleString()} (
                        {Math.round(((Number(form.productPrice) - Number(form.promoPrice)) / Number(form.productPrice)) * 100)}% off)
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* RESTAURANT SPECIFICATIONS */}
              {form.listingType === "restaurant" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-orange-500/25 bg-orange-500/5 p-3">
                    <div className="flex items-center gap-2.5">
                      <UtensilsCrossed className="w-4 h-4 text-[#ea580c] shrink-0" />
                      <span className="text-xs text-muted-foreground">
                        Need full table reservations &amp; multi-category menu builder?
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenChange(false);
                        navigate("/restaurant-wizard");
                      }}
                      className="text-xs font-bold text-[#ea580c] hover:underline shrink-0"
                    >
                      Open Full Studio →
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Primary Cuisine *
                      </Label>
                      <Select value={form.cuisineType} onValueChange={(v) => setField("cuisineType", v)}>
                        <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select cuisine" /></SelectTrigger>
                        <SelectContent>
                          {RESTAURANT_CUISINES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {renderFieldError("cuisineType")}
                    </div>
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Establishment Style
                      </Label>
                      <Select value={form.establishmentType} onValueChange={(v) => setField("establishmentType", v)}>
                        <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {RESTAURANT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Price Tier
                      </Label>
                      <Select value={form.priceTier} onValueChange={(v) => setField("priceTier", v)}>
                        <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {RESTAURANT_PRICE_TIERS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Opening Hours
                      </Label>
                      <Input
                        className="mt-1.5"
                        placeholder="08:00 AM - 10:00 PM"
                        value={form.openingHours}
                        onChange={(e) => setField("openingHours", e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
                      Dining Amenities
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {RESTAURANT_AMENITIES.slice(0, 12).map((a) => {
                        const active = form.restaurantAmenities.includes(a.id);
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() =>
                              setField(
                                "restaurantAmenities",
                                active
                                  ? form.restaurantAmenities.filter((x) => x !== a.id)
                                  : [...form.restaurantAmenities, a.id]
                              )
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                              active ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                            }`}
                          >
                            {a.icon} {a.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Starter Menu Items (Optional)
                      </Label>
                      <button
                        type="button"
                        onClick={() =>
                          setField("starterMenu", [
                            ...form.starterMenu,
                            { name: "", category: "Main Dishes", price: "" },
                          ])
                        }
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Dish
                      </button>
                    </div>
                    {form.starterMenu.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                        <Input
                          className="col-span-5"
                          placeholder="Dish name (e.g. Smokey Jollof)"
                          value={item.name}
                          onChange={(e) => {
                            const copy = [...form.starterMenu];
                            copy[idx] = { ...copy[idx], name: e.target.value };
                            setField("starterMenu", copy);
                          }}
                        />
                        <Select
                          value={item.category}
                          onValueChange={(v) => {
                            const copy = [...form.starterMenu];
                            copy[idx] = { ...copy[idx], category: v };
                            setField("starterMenu", copy);
                          }}
                        >
                          <SelectTrigger className="col-span-4"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {MENU_CATEGORIES.map((mc) => <SelectItem key={mc} value={mc}>{mc}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input
                          className="col-span-2 tabular-nums"
                          type="number"
                          placeholder="₦"
                          value={item.price}
                          onChange={(e) => {
                            const copy = [...form.starterMenu];
                            copy[idx] = { ...copy[idx], price: e.target.value };
                            setField("starterMenu", copy);
                          }}
                        />
                        <div className="col-span-1 flex justify-center">
                          {form.starterMenu.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setField(
                                  "starterMenu",
                                  form.starterMenu.filter((_, i) => i !== idx)
                                )
                              }
                              className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* EVENT SPECIFICATIONS */}
              {form.listingType === "event" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Event Category
                      </Label>
                      <Select value={form.eventCategory} onValueChange={(v) => setField("eventCategory", v)}>
                        <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          {EVENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Venue Name
                      </Label>
                      <Input
                        className="mt-1.5"
                        placeholder="e.g. Eko Convention Centre"
                        value={form.eventVenue}
                        onChange={(e) => setField("eventVenue", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Start Date *
                      </Label>
                      <Input
                        type="date"
                        className="mt-1.5"
                        value={form.eventStartDate}
                        onChange={(e) => setField("eventStartDate", e.target.value)}
                      />
                      {renderFieldError("eventStartDate")}
                    </div>
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        End Date
                      </Label>
                      <Input
                        type="date"
                        className="mt-1.5"
                        value={form.eventEndDate}
                        onChange={(e) => setField("eventEndDate", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Start Time
                      </Label>
                      <Input
                        type="time"
                        className="mt-1.5"
                        value={form.eventStartTime}
                        onChange={(e) => setField("eventStartTime", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        End Time
                      </Label>
                      <Input
                        type="time"
                        className="mt-1.5"
                        value={form.eventEndTime}
                        onChange={(e) => setField("eventEndTime", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-primary" />
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Ticket Tiers *
                        </Label>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setField("ticketTypes", [
                            ...form.ticketTypes,
                            { name: "", price: "0", quantity: "100" },
                          ])
                        }
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Tier
                      </button>
                    </div>
                    {form.ticketTypes.map((ticket, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center">
                        <Input
                          className="col-span-5"
                          placeholder="Tier name (e.g. VIP)"
                          value={ticket.name}
                          onChange={(e) => {
                            const copy = [...form.ticketTypes];
                            copy[i] = { ...copy[i], name: e.target.value };
                            setField("ticketTypes", copy);
                          }}
                        />
                        <Input
                          className="col-span-3 tabular-nums"
                          type="number"
                          placeholder="Price ₦"
                          value={ticket.price}
                          onChange={(e) => {
                            const copy = [...form.ticketTypes];
                            copy[i] = { ...copy[i], price: e.target.value };
                            setField("ticketTypes", copy);
                          }}
                        />
                        <Input
                          className="col-span-3 tabular-nums"
                          type="number"
                          placeholder="Qty"
                          value={ticket.quantity}
                          onChange={(e) => {
                            const copy = [...form.ticketTypes];
                            copy[i] = { ...copy[i], quantity: e.target.value };
                            setField("ticketTypes", copy);
                          }}
                        />
                        <div className="col-span-1 flex justify-center">
                          {form.ticketTypes.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setField(
                                  "ticketTypes",
                                  form.ticketTypes.filter((_, j) => j !== i)
                                )
                              }
                              className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {renderFieldError("ticketTypes")}
                  </div>
                </div>
              )}

              {/* GENERAL BUSINESS CONFIRMATION */}
              {form.listingType === "business" && (
                <div className="rounded-xl border border-border bg-muted/15 p-4 flex items-center gap-3">
                  <Building2 className="w-6 h-6 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      Category: {form.bizCategory || "Business Services"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      You can add products, rooms, or menu items directly from your Business Workspace after publishing.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: MEDIA & REVIEW */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {form.listingType === "event" ? "Event Banner" : "Photos & Media"}
                  </h4>
                </div>
                {form.listingType === "event" ? (
                  <ImageUpload
                    onUploadSuccess={(r) => {
                      dispatch({
                        type: "PATCH",
                        patch: { imageUrl: r.secureUrl, imagePublicId: r.publicId },
                      });
                    }}
                    folder={cloudinaryFolder}
                    currentImage={form.imageUrl}
                    buttonText="Upload Event Banner"
                  />
                ) : (
                  <MultiImageUpload
                    onUploadSuccess={(r) => {
                      dispatch({
                        type: "PATCH",
                        patch: {
                          images: [...form.images, r.secureUrl],
                          imagePublicIds: [...form.imagePublicIds, r.publicId],
                          imageUrl: form.imageUrl || r.secureUrl,
                        },
                      });
                    }}
                    onRemove={(idx) => {
                      dispatch({
                        type: "PATCH",
                        patch: {
                          images: form.images.filter((_, i) => i !== idx),
                          imagePublicIds: form.imagePublicIds.filter((_, i) => i !== idx),
                        },
                      });
                    }}
                    folder={cloudinaryFolder}
                    currentImages={form.images}
                    buttonText="Upload Photos (First is Cover)"
                    maxImages={10}
                  />
                )}
              </div>

              {/* Summary Preview */}
              <div className="rounded-xl border border-border bg-muted/15 p-4 space-y-3">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Ready to Publish</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Title</p>
                    <p className="font-bold text-foreground mt-0.5">{form.title}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Type</p>
                    <p className="font-semibold text-foreground mt-0.5 capitalize">
                      {form.listingType}
                      {form.listingType === "property" && form.propertySubType ? ` · ${form.propertySubType.replace("_", " / ")}` : ""}
                      {form.listingType === "restaurant" && form.cuisineType ? ` · ${form.cuisineType}` : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Location</p>
                    <p className="text-foreground mt-0.5">
                      {[form.streetAddress, form.city, form.state].filter(Boolean).join(", ") || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {form.listingType === "event"
                        ? "Schedule & Tickets"
                        : form.listingType === "restaurant"
                        ? "Hours & Tier"
                        : "Pricing"}
                    </p>
                    <p className="font-semibold text-foreground mt-0.5 tabular-nums">
                      {form.listingType === "product" && form.productPrice
                        ? `₦${Number(form.productPrice).toLocaleString()}`
                        : form.listingType === "property" && form.propertyPrice
                        ? `₦${Number(form.propertyPrice).toLocaleString()}`
                        : form.listingType === "event"
                        ? `${form.eventStartDate || "TBA"} · ${form.ticketTypes.filter((t) => t.name).length} tier(s)`
                        : form.listingType === "restaurant"
                        ? `${form.priceTier} · ${form.openingHours}`
                        : form.bizCategory || "General"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer Controls */}
        <div className="sticky bottom-0 z-10 bg-card/95 backdrop-blur border-t border-border px-6 py-4 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={isSubmitting}
            className="rounded-xl"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {step === 1 ? "Cancel" : "Back"}
          </Button>

          {step === 1 ? (
            <Button
              type="button"
              onClick={() => (form.listingType ? setStep(2) : toast({ title: "Choose a listing type first", variant: "destructive" }))}
              disabled={!form.listingType}
              className="rounded-xl font-bold"
            >
              Continue <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : step < 4 ? (
            <Button type="button" onClick={handleNext} className="rounded-xl font-bold">
              Next Step <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded-xl font-bold"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Publishing...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Publish {form.listingType === "event" ? "Event" : "Listing"}
                </span>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
