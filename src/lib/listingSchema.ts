import { z } from "zod";
import { type NigerianState, type PropertySubType } from "@/lib/nigerianStates";
import { getMockImage } from "@/lib/mockImages";

export type ListingKind = "property" | "product" | "restaurant" | "event" | "business";

export interface TicketTierInput {
  name: string;
  price: string;
  quantity: string;
}

export interface StarterMenuItemInput {
  name: string;
  category: string;
  price: string;
}

export interface UnifiedListingForm {
  listingType: ListingKind | "";
  // Core details & location
  title: string;
  description: string;
  state: NigerianState | "";
  city: string;
  streetAddress: string;
  phone: string;
  lat?: number;
  lon?: number;
  businessLinkId: string; // "individual" or businessId

  // Media
  imageUrl: string;
  imagePublicId: string;
  images: string[];
  imagePublicIds: string[];

  // Business
  bizCategory: string;

  // Restaurant
  cuisineType: string;
  establishmentType: string;
  priceTier: string;
  openingHours: string;
  restaurantAmenities: string[];
  starterMenu: StarterMenuItemInput[];

  // Product
  productCategory: string;
  itemCondition: string;
  productPrice: string;
  promoPrice: string;

  // Property
  propertySubType: PropertySubType | "";
  propertyPrice: string;
  selectedAmenities: string[];
  // Rent
  rentHouseType: string;
  rentRoadCondition: string;
  rentRoadImage: string;
  rentRoadImagePublicId: string;
  rentBillingPeriod: string;
  rentBedrooms: number;
  rentBathrooms: number;
  rentHasStore: boolean;
  rentFurnishing: string;
  rentServiceCharge: string;
  rentCautionFee: string;
  rentLegalFee: string;
  rentAgencyFee: string;
  rentAvailableFrom: string;
  // Shortlet & Hotel
  shortletMinNights: number;
  shortletMaxGuests: number;
  shortletBedrooms: number;
  shortletBathrooms: number;
  checkinTime: string;
  checkoutTime: string;
  // Land
  landPlotSize: string;
  landSizeUnit: string;
  landTitleType: string;
  landUseType: string;
  landTopography: string;
  landAccessRoad: string;
  landFenced: boolean;
  landSurveyPlan: boolean;
  landSaleType: string;
  // Commercial
  commercialType: string;
  commercialSpaceSize: string;
  commercialCapacity: string;
  commercialBillingPeriod: string;
  commercialUsages: string[];
  commercialHasParking: boolean;
  commercialHasSecurity: boolean;
  commercialHasWater: boolean;
  commercialHasPower: boolean;
  commercialHasAC: boolean;
  commercialHasInternet: boolean;
  commercialHasElevator: boolean;
  commercialHasCanteen: boolean;
  commercialServiceCharge: string;
  commercialCautionFee: string;
  commercialLegalFee: string;
  commercialAgencyFee: string;

  // Event
  eventCategory: string;
  eventVenue: string;
  eventLocation: string;
  eventStartDate: string;
  eventEndDate: string;
  eventStartTime: string;
  eventEndTime: string;
  ticketTypes: TicketTierInput[];
}

export const createInitialListingForm = (
  overrides?: Partial<UnifiedListingForm>
): UnifiedListingForm => ({
  listingType: "",
  title: "",
  description: "",
  state: "",
  city: "",
  streetAddress: "",
  phone: "",
  lat: undefined,
  lon: undefined,
  businessLinkId: "individual",

  imageUrl: "",
  imagePublicId: "",
  images: [],
  imagePublicIds: [],

  bizCategory: "",

  cuisineType: "Nigerian / Local Delicacies",
  establishmentType: "CASUAL EATERY",
  priceTier: "₦₦",
  openingHours: "08:00 AM - 10:00 PM",
  restaurantAmenities: ["dine_in", "takeaway", "pos_cards"],
  starterMenu: [{ name: "", category: "Main Dishes", price: "" }],

  productCategory: "",
  itemCondition: "Brand New",
  productPrice: "",
  promoPrice: "",

  propertySubType: "",
  propertyPrice: "",
  selectedAmenities: [],

  rentHouseType: "",
  rentRoadCondition: "",
  rentRoadImage: "",
  rentRoadImagePublicId: "",
  rentBillingPeriod: "1 Year",
  rentBedrooms: 2,
  rentBathrooms: 2,
  rentHasStore: false,
  rentFurnishing: "",
  rentServiceCharge: "",
  rentCautionFee: "",
  rentLegalFee: "",
  rentAgencyFee: "",
  rentAvailableFrom: "",

  shortletMinNights: 1,
  shortletMaxGuests: 2,
  shortletBedrooms: 1,
  shortletBathrooms: 1,
  checkinTime: "14:00",
  checkoutTime: "11:00",

  landPlotSize: "",
  landSizeUnit: "plots",
  landTitleType: "",
  landUseType: "",
  landTopography: "",
  landAccessRoad: "",
  landFenced: false,
  landSurveyPlan: false,
  landSaleType: "sale",

  commercialType: "",
  commercialSpaceSize: "",
  commercialCapacity: "",
  commercialBillingPeriod: "Per Annum",
  commercialUsages: [],
  commercialHasParking: false,
  commercialHasSecurity: false,
  commercialHasWater: false,
  commercialHasPower: false,
  commercialHasAC: false,
  commercialHasInternet: false,
  commercialHasElevator: false,
  commercialHasCanteen: false,
  commercialServiceCharge: "",
  commercialCautionFee: "",
  commercialLegalFee: "",
  commercialAgencyFee: "",

  eventCategory: "",
  eventVenue: "",
  eventLocation: "",
  eventStartDate: "",
  eventEndDate: "",
  eventStartTime: "",
  eventEndTime: "",
  ticketTypes: [{ name: "Regular", price: "0", quantity: "100" }],
  ...overrides,
});

// Unified Zod Schemas per step & listing kind
const step1Schema = z.object({
  listingType: z.enum(["property", "product", "restaurant", "event", "business"], {
    errorMap: () => ({ message: "Please select a listing type to continue" }),
  }),
});

const step2CoreSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters"),
  description: z.string().trim().min(5, "Please add a short description (at least 5 characters)"),
  state: z.string().min(1, "Please select a state"),
});

export function validateListingStep(
  step: 1 | 2 | 3 | 4,
  data: UnifiedListingForm
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (step === 1) {
    const res = step1Schema.safeParse(data);
    if (!res.success) {
      res.error.errors.forEach((e) => {
        errors[String(e.path[0] || "listingType")] = e.message;
      });
    }
    return { valid: Object.keys(errors).length === 0, errors };
  }

  if (step === 2) {
    const res = step2CoreSchema.safeParse(data);
    if (!res.success) {
      res.error.errors.forEach((e) => {
        errors[String(e.path[0] || "title")] = e.message;
      });
    }
    if ((data.listingType === "restaurant" || data.listingType === "business") && !data.phone.trim()) {
      errors.phone = "Contact phone number is required";
    }
    if (data.listingType === "business" && !data.bizCategory) {
      errors.bizCategory = "Please select a business category";
    }
    return { valid: Object.keys(errors).length === 0, errors };
  }

  if (step === 3) {
    if (data.listingType === "product") {
      if (!data.productCategory) errors.productCategory = "Please select a product category";
      const priceNum = Number(String(data.productPrice).replace(/[^0-9.]/g, ""));
      if (!data.productPrice || !Number.isFinite(priceNum) || priceNum <= 0) {
        errors.productPrice = "Please enter a valid price greater than 0";
      }
      if (data.promoPrice) {
        const promoNum = Number(String(data.promoPrice).replace(/[^0-9.]/g, ""));
        if (promoNum >= priceNum && priceNum > 0) {
          errors.promoPrice = "Promo price should be lower than regular price";
        }
      }
    } else if (data.listingType === "property") {
      if (!data.propertySubType) {
        errors.propertySubType = "Please choose a property category";
      } else {
        const propPrice = Number(String(data.propertyPrice).replace(/[^0-9.]/g, ""));
        if (!data.propertyPrice || !Number.isFinite(propPrice) || propPrice <= 0) {
          errors.propertyPrice = "Please enter a valid amount";
        }
        if (data.propertySubType === "rent" && !data.rentHouseType) {
          errors.rentHouseType = "Please select the house/apartment type";
        }
        if (data.propertySubType === "land" && !data.landPlotSize) {
          errors.landPlotSize = "Please specify the plot size";
        }
        if (data.propertySubType === "commercial" && !data.commercialType) {
          errors.commercialType = "Please select the commercial space type";
        }
      }
    } else if (data.listingType === "restaurant") {
      if (!data.cuisineType) errors.cuisineType = "Please choose a primary cuisine";
    } else if (data.listingType === "event") {
      if (!data.eventStartDate) errors.eventStartDate = "Please select an event start date";
      const hasValidTier = data.ticketTypes.some((t) => t.name.trim().length > 0);
      if (!hasValidTier) errors.ticketTypes = "Add at least one ticket tier";
    }
    return { valid: Object.keys(errors).length === 0, errors };
  }

  // Step 4: Media & Review (re-verify core + specifics before submit)
  const s2 = validateListingStep(2, data);
  const s3 = validateListingStep(3, data);
  return {
    valid: s2.valid && s3.valid,
    errors: { ...s2.errors, ...s3.errors },
  };
}

export interface SerializedListingResult {
  collectionName: "businesses" | "marketplace" | "house_listings" | "events";
  subCollectionPath?: { parentCollection: "businesses"; parentId: string; subCollection: "properties" | "products" };
  payload: Record<string, unknown>;
  activityTargetType: "business" | "product" | "property" | "event";
  activityAction: "create_listing" | "create_event";
  successTitle: string;
}

export function buildUnifiedListingPayload(
  data: UnifiedListingForm,
  ctx: {
    userId: string;
    userName: string;
    userEmail: string;
    userPhone?: string;
    linkedBusiness?: { id: string; title: string; location?: string; state?: string; city?: string };
  }
): SerializedListingResult {
  const isBiz = data.businessLinkId !== "individual" && !!data.businessLinkId && !!ctx.linkedBusiness;
  const chosenState = data.state || ctx.linkedBusiness?.state || "";
  const chosenCity = data.city || ctx.linkedBusiness?.city || "";

  if (data.listingType === "restaurant") {
    const fullLocation = [chosenCity, chosenState, "Nigeria"].filter(Boolean).join(", ");
    const primaryImage = data.images[0] || data.imageUrl || getMockImage("Restaurant");
    const validMenu = data.starterMenu
      .filter((m) => m.name.trim())
      .map((m) => ({
        name: m.name.trim(),
        category: m.category || "Main Dishes",
        price: Number(String(m.price).replace(/[^0-9.]/g, "")) || 0,
      }));

    return {
      collectionName: "businesses",
      activityTargetType: "business",
      activityAction: "create_listing",
      successTitle: "Restaurant listed!",
      payload: {
        title: data.title.trim(),
        description: data.description.trim(),
        category: "Restaurant",
        type: "Restaurant",
        cuisine: data.cuisineType || "Nigerian / Local Delicacies",
        establishmentType: data.establishmentType || "CASUAL EATERY",
        priceTier: data.priceTier || "₦₦",
        openingHours: data.openingHours || "08:00 AM - 10:00 PM",
        amenities: data.restaurantAmenities,
        menuItems: validMenu,
        phone: data.phone.trim() || ctx.userPhone || "",
        streetAddress: data.streetAddress.trim(),
        location: fullLocation,
        state: chosenState,
        city: chosenCity,
        image: primaryImage,
        images: data.images.length > 0 ? data.images : [primaryImage],
        imagePublicIds: data.imagePublicIds,
        ownerId: ctx.userId,
        isOpen: true,
        rating: 0,
        reviewCount: 0,
        lat: data.lat ?? null,
        lon: data.lon ?? null,
        miniSiteActive: true,
      },
    };
  }

  if (data.listingType === "business") {
    const fullLocation = [chosenCity, chosenState].filter(Boolean).join(", ");
    const primaryImage = data.images[0] || data.imageUrl || getMockImage(data.bizCategory || "Business");
    return {
      collectionName: "businesses",
      activityTargetType: "business",
      activityAction: "create_listing",
      successTitle: "Business registered!",
      payload: {
        title: data.title.trim(),
        description: data.description.trim(),
        category: data.bizCategory || "Business Services",
        location: fullLocation,
        state: chosenState,
        city: chosenCity,
        streetAddress: data.streetAddress.trim(),
        phone: data.phone.trim() || ctx.userPhone || "",
        image: primaryImage,
        images: data.images.length > 0 ? data.images : [primaryImage],
        imagePublicIds: data.imagePublicIds,
        ownerId: ctx.userId,
        isOpen: true,
        rating: 0,
        lat: data.lat ?? null,
        lon: data.lon ?? null,
      },
    };
  }

  if (data.listingType === "product") {
    const fullLocation =
      [data.streetAddress, chosenCity, chosenState].filter(Boolean).join(", ") ||
      ctx.linkedBusiness?.location ||
      `${chosenState}, Nigeria`;
    const primaryImage = data.images[0] || data.imageUrl || getMockImage(data.productCategory || "Product");
    const cleanPrice = Number(String(data.productPrice).replace(/[^0-9.]/g, "")) || 0;
    const cleanPromo = data.promoPrice
      ? Number(String(data.promoPrice).replace(/[^0-9.]/g, "")) || null
      : null;

    return {
      collectionName: "marketplace",
      subCollectionPath: isBiz
        ? { parentCollection: "businesses", parentId: data.businessLinkId, subCollection: "products" }
        : undefined,
      activityTargetType: "product",
      activityAction: "create_listing",
      successTitle: "Product listed on Marketplace!",
      payload: {
        title: data.title.trim(),
        description: data.description.trim(),
        category: data.productCategory || "Other",
        price: `₦${cleanPrice.toLocaleString()}`,
        rawPrice: cleanPrice,
        promoPrice: cleanPromo ? `₦${cleanPromo.toLocaleString()}` : "",
        rawPromoPrice: cleanPromo,
        regularPrice: cleanPrice,
        location: fullLocation,
        streetAddress: data.streetAddress.trim(),
        state: chosenState,
        city: chosenCity,
        businessId: isBiz ? data.businessLinkId : "individual",
        businessName: isBiz && ctx.linkedBusiness ? ctx.linkedBusiness.title : ctx.userName || "Independent Seller",
        sellerType: isBiz ? "business" : "individual",
        image: primaryImage,
        images: data.images.length > 0 ? data.images : [primaryImage],
        imagePublicIds: data.imagePublicIds,
        ownerId: ctx.userId,
        condition: data.itemCondition || "Brand New",
        phone: data.phone.trim() || ctx.userPhone || "",
        rating: 5.0,
        status: "Active",
      },
    };
  }

  if (data.listingType === "property") {
    const subType = (data.propertySubType || "rent") as PropertySubType;
    const fullLocation = [data.streetAddress, chosenCity, chosenState].filter(Boolean).join(", ");
    const primaryImage = data.images[0] || data.imageUrl || getMockImage("Airbnb");
    const priceNum = Number(String(data.propertyPrice).replace(/[^0-9.]/g, "")) || 0;

    const details: Record<string, unknown> = {};
    if (subType === "rent") {
      const serviceCharge = data.rentServiceCharge ? parseFloat(data.rentServiceCharge) : 0;
      const cautionFee = data.rentCautionFee ? parseFloat(data.rentCautionFee) : 0;
      const legalFee = data.rentLegalFee ? parseFloat(data.rentLegalFee) : 0;
      const agencyFee = data.rentAgencyFee ? parseFloat(data.rentAgencyFee) : 0;
      details.houseType = data.rentHouseType || "Apartment";
      details.propertyType = data.rentHouseType || "Apartment";
      details.roadCondition = data.rentRoadCondition;
      details.roadImage = data.rentRoadImage;
      details.roadImagePublicId = data.rentRoadImagePublicId;
      details.billingPeriod = data.rentBillingPeriod;
      details.paymentPlan = data.rentBillingPeriod;
      details.bedrooms = data.rentBedrooms;
      details.bathrooms = data.rentBathrooms;
      details.hasStore = data.rentHasStore;
      details.hasKitchenStore = data.rentHasStore;
      details.furnishing = data.rentFurnishing;
      details.serviceCharge = serviceCharge;
      details.cautionFee = cautionFee;
      details.cautionDeposit = cautionFee;
      details.legalFee = legalFee;
      details.agencyFee = agencyFee;
      details.availableFrom = data.rentAvailableFrom;
      details.price = priceNum;
      details.billingLabel = data.rentBillingPeriod ? `/${data.rentBillingPeriod.toLowerCase()}` : "";
      details.totalPackage = priceNum + cautionFee + legalFee + agencyFee + serviceCharge;
    } else if (subType === "shortlet_hotel") {
      details.pricePerNight = priceNum;
      details.minNights = data.shortletMinNights;
      details.maxGuests = data.shortletMaxGuests;
      details.bedrooms = data.shortletBedrooms;
      details.bathrooms = data.shortletBathrooms;
      details.checkinTime = data.checkinTime;
      details.checkoutTime = data.checkoutTime;
      details.amenities = data.selectedAmenities;
    } else if (subType === "land") {
      details.plotSize = data.landPlotSize;
      details.sizeUnit = data.landSizeUnit;
      details.titleType = data.landTitleType;
      details.titleDocument = data.landTitleType;
      details.landUseType = data.landUseType;
      details.topography = data.landTopography;
      details.accessRoad = data.landAccessRoad;
      details.fenced = data.landFenced;
      details.isFenced = data.landFenced;
      details.surveyPlan = data.landSurveyPlan;
      details.hasSurveyPlan = data.landSurveyPlan;
      details.saleType = data.landSaleType;
      details.price = priceNum;
    } else if (subType === "commercial") {
      const serviceCharge = data.commercialServiceCharge ? parseFloat(data.commercialServiceCharge) : 0;
      const cautionFee = data.commercialCautionFee ? parseFloat(data.commercialCautionFee) : 0;
      const legalFee = data.commercialLegalFee ? parseFloat(data.commercialLegalFee) : 0;
      const agencyFee = data.commercialAgencyFee ? parseFloat(data.commercialAgencyFee) : 0;
      details.commercialType = data.commercialType;
      details.spaceSize = data.commercialSpaceSize;
      details.spaceSizeSqm = parseFloat(data.commercialSpaceSize) || 0;
      details.capacity = data.commercialCapacity ? parseInt(data.commercialCapacity, 10) : 0;
      details.seatingCapacity = details.capacity;
      details.billingPeriod = data.commercialBillingPeriod;
      details.usages = data.commercialUsages;
      details.hasParking = data.commercialHasParking;
      details.hasSecurity = data.commercialHasSecurity;
      details.hasWater = data.commercialHasWater;
      details.hasPower = data.commercialHasPower;
      details.hasAC = data.commercialHasAC;
      details.hasInternet = data.commercialHasInternet;
      details.hasElevator = data.commercialHasElevator;
      details.hasCanteen = data.commercialHasCanteen;
      details.amenities = [
        data.commercialHasParking && "Parking",
        data.commercialHasSecurity && "Security",
        data.commercialHasWater && "Water",
        data.commercialHasPower && "Power / Electricity",
        data.commercialHasAC && "Air Conditioning",
        data.commercialHasInternet && "WiFi / Internet",
        data.commercialHasElevator && "Elevator",
        data.commercialHasCanteen && "Canteen",
      ].filter(Boolean) as string[];
      details.serviceCharge = serviceCharge;
      details.cautionFee = cautionFee;
      details.legalFee = legalFee;
      details.agencyFee = agencyFee;
      details.price = priceNum;
      details.billingLabel = data.commercialBillingPeriod ? `/${data.commercialBillingPeriod.toLowerCase()}` : "";
      details.totalPackage = priceNum + cautionFee + legalFee + agencyFee + serviceCharge;
    }

    const priceLabel =
      subType === "shortlet_hotel"
        ? priceNum
          ? `from ₦${priceNum.toLocaleString()}/night`
          : ""
        : subType === "rent"
        ? priceNum
          ? `₦${priceNum.toLocaleString()}${details.billingLabel || ""}`
          : ""
        : subType === "land"
        ? priceNum
          ? `₦${priceNum.toLocaleString()}${data.landSaleType === "sale" ? "" : "/" + (data.landSaleType === "rent" ? "yr" : "lease")}`
          : ""
        : priceNum
        ? `₦${priceNum.toLocaleString()}${details.billingLabel || ""}`
        : "";

    const typeLabel =
      subType === "rent"
        ? data.rentHouseType || "Apartment"
        : subType === "shortlet_hotel"
        ? "Shortlet & Hotel"
        : subType === "land"
        ? "Land"
        : data.commercialType || "Commercial";

    return {
      collectionName: "house_listings",
      subCollectionPath: isBiz
        ? { parentCollection: "businesses", parentId: data.businessLinkId, subCollection: "properties" }
        : undefined,
      activityTargetType: "property",
      activityAction: "create_listing",
      successTitle: "Property listed!",
      payload: {
        title: data.title.trim(),
        description: data.description.trim(),
        propertySubType: subType,
        type: typeLabel,
        ...details,
        price: priceLabel,
        priceNum,
        location: fullLocation,
        state: chosenState,
        city: chosenCity,
        streetAddress: data.streetAddress.trim(),
        phone: data.phone.trim() || ctx.userPhone || "",
        lat: data.lat ?? null,
        lon: data.lon ?? null,
        businessId: isBiz ? data.businessLinkId : null,
        businessName: isBiz && ctx.linkedBusiness ? ctx.linkedBusiness.title : ctx.userName || ctx.userEmail || "Individual Listing",
        sellerType: isBiz ? "business" : "individual",
        image: primaryImage,
        images: data.images.length > 0 ? data.images : [primaryImage],
        imagePublicIds:
          data.imagePublicIds.length > 0
            ? data.imagePublicIds
            : data.imagePublicId
            ? [data.imagePublicId]
            : [],
        ownerId: ctx.userId,
        bedrooms: details.bedrooms || 0,
        bathrooms: details.bathrooms || 0,
        guests: details.maxGuests || 0,
        amenities: details.amenities || data.selectedAmenities,
        miniSiteActive: subType === "shortlet_hotel",
        status: "Pending",
        rating: 0,
        reviews: 0,
      },
    };
  }

  // Event
  const fullLocation = [data.eventVenue, data.eventLocation || data.streetAddress, chosenCity, chosenState]
    .filter(Boolean)
    .join(", ");
  const validTickets = data.ticketTypes
    .filter((t) => t.name.trim())
    .map((t) => ({
      name: t.name.trim(),
      price: Number(t.price) || 0,
      quantity: Number(t.quantity) || 100,
    }));
  const primaryImage = data.imageUrl || data.images[0] || getMockImage(data.eventCategory || "Event");

  return {
    collectionName: "events",
    activityTargetType: "event",
    activityAction: "create_event",
    successTitle: "Event published successfully!",
    payload: {
      title: data.title.trim(),
      description: data.description.trim(),
      category: data.eventCategory || "General",
      tags: [data.eventCategory || "General"],
      location: fullLocation,
      venue: data.eventVenue.trim(),
      eventLocation: data.eventLocation || data.streetAddress,
      streetAddress: data.streetAddress || data.eventLocation,
      state: chosenState,
      city: chosenCity,
      lat: data.lat ?? null,
      lon: data.lon ?? null,
      startDate: data.eventStartDate,
      endDate: data.eventEndDate || data.eventStartDate,
      startTime: data.eventStartTime || "",
      endTime: data.eventEndTime || "",
      ticketTypes:
        validTickets.length > 0
          ? validTickets
          : [{ name: "General Admission", price: 0, quantity: 100 }],
      image: primaryImage,
      imageUrl: primaryImage,
      imagePublicId: data.imagePublicId || "",
      ownerId: ctx.userId,
      organizerId: ctx.userId,
      organizerName: ctx.userName || "Event Organizer",
      isActive: true,
      rating: 0,
    },
  };
}
