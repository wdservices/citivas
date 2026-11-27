import { type NigerianState, type PropertySubType } from './nigerianStates';
import { getMockImage } from './mockImages';

export type ListingKind = 'property' | 'product' | 'restaurant' | 'event' | 'business';

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

export interface UnifiedNativeListingState {
  listingType: ListingKind | '';
  // Core details & location
  title: string;
  description: string;
  state: NigerianState | '';
  city: string;
  streetAddress: string;
  phone: string;
  businessLinkId: string; // 'individual' or business doc id

  // Media
  images: string[];

  // Business (edit compatibility)
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
  propertySubType: PropertySubType | '';
  propertyPrice: string;
  selectedAmenities: string[];
  rentHouseType: string;
  rentBillingPeriod: string;
  rentBedrooms: number;
  rentBathrooms: number;
  rentFurnishing: string;
  shortletMaxGuests: number;
  shortletBedrooms: number;
  shortletBathrooms: number;
  landPlotSize: string;
  landSizeUnit: string;
  landTitleType: string;
  commercialType: string;
  commercialSpaceSize: string;
  commercialBillingPeriod: string;
  commercialUsages: string[];

  // Event
  eventCategory: string;
  eventVenue: string;
  eventStartDate: string;
  eventEndDate: string;
  eventStartTime: string;
  eventEndTime: string;
  ticketTypes: TicketTierInput[];
}

export function createInitialNativeListingState(
  overrides?: Partial<UnifiedNativeListingState>
): UnifiedNativeListingState {
  return {
    listingType: '',
    title: '',
    description: '',
    state: '',
    city: '',
    streetAddress: '',
    phone: '',
    businessLinkId: 'individual',

    images: [],

    bizCategory: '',

    cuisineType: 'Nigerian / Local Delicacies',
    establishmentType: 'CASUAL EATERY',
    priceTier: '₦₦',
    openingHours: '08:00 AM - 10:00 PM',
    restaurantAmenities: ['dine_in', 'takeaway', 'pos_cards'],
    starterMenu: [{ name: '', category: 'Main Dishes', price: '' }],

    productCategory: '',
    itemCondition: 'Brand New',
    productPrice: '',
    promoPrice: '',

    propertySubType: '',
    propertyPrice: '',
    selectedAmenities: [],
    rentHouseType: 'Flat / Apartment',
    rentBillingPeriod: 'Annually',
    rentBedrooms: 2,
    rentBathrooms: 2,
    rentFurnishing: 'Unfurnished',
    shortletMaxGuests: 2,
    shortletBedrooms: 1,
    shortletBathrooms: 1,
    landPlotSize: '',
    landSizeUnit: 'plots',
    landTitleType: '',
    commercialType: 'Office Space',
    commercialSpaceSize: '',
    commercialBillingPeriod: 'Annually',
    commercialUsages: [],

    eventCategory: '',
    eventVenue: '',
    eventStartDate: '',
    eventEndDate: '',
    eventStartTime: '',
    eventEndTime: '',
    ticketTypes: [{ name: 'Regular', price: '0', quantity: '100' }],
    ...overrides,
  };
}

export type ListingAction =
  | { type: 'SET_FIELD'; field: keyof UnifiedNativeListingState; value: any }
  | { type: 'PATCH'; patch: Partial<UnifiedNativeListingState> }
  | { type: 'RESET'; initial?: UnifiedNativeListingState };

export function listingFormReducer(
  state: UnifiedNativeListingState,
  action: ListingAction
): UnifiedNativeListingState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'PATCH':
      return { ...state, ...action.patch };
    case 'RESET':
      return action.initial ?? createInitialNativeListingState();
    default:
      return state;
  }
}

export function validateNativeListingStep(
  step: 1 | 2 | 3 | 4,
  data: UnifiedNativeListingState
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (step === 1) {
    if (!data.listingType) {
      errors.listingType = 'Please choose a listing type to continue';
    }
    return { valid: Object.keys(errors).length === 0, errors };
  }

  if (step === 2) {
    if (!data.title || data.title.trim().length < 2) {
      errors.title = 'Please enter a valid title (min 2 characters)';
    }
    if (!data.description || data.description.trim().length < 5) {
      errors.description = 'Please enter a brief description';
    }
    if (!data.state) {
      errors.state = 'Please select a state';
    }
    if ((data.listingType === 'restaurant' || data.listingType === 'business') && !data.phone.trim()) {
      errors.phone = 'Contact phone number is required';
    }
    if (data.listingType === 'business' && !data.bizCategory) {
      errors.bizCategory = 'Please select a business category';
    }
    return { valid: Object.keys(errors).length === 0, errors };
  }

  if (step === 3) {
    if (data.listingType === 'product') {
      if (!data.productCategory) errors.productCategory = 'Please select a product category';
      const priceNum = Number(String(data.productPrice).replace(/[^0-9.]/g, ''));
      if (!data.productPrice || !Number.isFinite(priceNum) || priceNum <= 0) {
        errors.productPrice = 'Enter a valid price greater than 0';
      }
    } else if (data.listingType === 'property') {
      if (!data.propertySubType) {
        errors.propertySubType = 'Please select a property category';
      } else {
        const priceNum = Number(String(data.propertyPrice).replace(/[^0-9.]/g, ''));
        if (!data.propertyPrice || !Number.isFinite(priceNum) || priceNum <= 0) {
          errors.propertyPrice = 'Enter a valid price';
        }
        if (data.propertySubType === 'land' && !data.landPlotSize.trim()) {
          errors.landPlotSize = 'Enter the plot size';
        }
      }
    } else if (data.listingType === 'restaurant') {
      if (!data.cuisineType) errors.cuisineType = 'Select a primary cuisine';
    } else if (data.listingType === 'event') {
      if (!data.eventStartDate.trim()) errors.eventStartDate = 'Enter a start date (YYYY-MM-DD)';
      if (!data.ticketTypes.some((t) => t.name.trim())) {
        errors.ticketTypes = 'Add at least one ticket tier';
      }
    }
    return { valid: Object.keys(errors).length === 0, errors };
  }

  const s2 = validateNativeListingStep(2, data);
  const s3 = validateNativeListingStep(3, data);
  return {
    valid: s2.valid && s3.valid,
    errors: { ...s2.errors, ...s3.errors },
  };
}

export interface NativeSerializedListing {
  collectionName: 'businesses' | 'marketplace' | 'house_listings' | 'events';
  subCollection?: { parentId: string; subName: 'products' | 'properties' };
  payload: Record<string, any>;
}

export function buildNativeFirestorePayload(
  data: UnifiedNativeListingState,
  ctx: {
    userId: string;
    userName: string;
    linkedBusiness?: { id: string; name: string };
  }
): NativeSerializedListing {
  const isBiz = data.businessLinkId !== 'individual' && !!data.businessLinkId && !!ctx.linkedBusiness;
  const fullLocation = [data.streetAddress.trim(), data.city, data.state].filter(Boolean).join(', ');

  if (data.listingType === 'restaurant') {
    const primaryImage = data.images[0] || getMockImage('Restaurant');
    const menuItems = data.starterMenu
      .filter((m) => m.name.trim())
      .map((m) => ({
        name: m.name.trim(),
        category: m.category || 'Main Dishes',
        price: Number(String(m.price).replace(/[^0-9.]/g, '')) || 0,
      }));
    return {
      collectionName: 'businesses',
      payload: {
        title: data.title.trim(),
        name: data.title.trim(),
        description: data.description.trim(),
        category: 'Restaurant',
        type: 'Restaurant',
        cuisine: data.cuisineType || 'Nigerian / Local Delicacies',
        establishmentType: data.establishmentType || 'CASUAL EATERY',
        priceTier: data.priceTier || '₦₦',
        openingHours: data.openingHours || '08:00 AM - 10:00 PM',
        amenities: data.restaurantAmenities,
        menuItems,
        state: data.state,
        city: data.city,
        streetAddress: data.streetAddress.trim(),
        location: fullLocation,
        phone: data.phone.trim(),
        image: primaryImage,
        images: data.images.length > 0 ? data.images : [primaryImage],
        ownerId: ctx.userId,
        isOpen: true,
        miniSiteActive: true,
        status: 'Active',
      },
    };
  }

  if (data.listingType === 'business') {
    const primaryImage = data.images[0] || getMockImage(data.bizCategory || 'Business');
    return {
      collectionName: 'businesses',
      payload: {
        title: data.title.trim(),
        name: data.title.trim(),
        description: data.description.trim(),
        category: data.bizCategory || 'Business Services',
        state: data.state,
        city: data.city,
        streetAddress: data.streetAddress.trim(),
        location: fullLocation,
        phone: data.phone.trim(),
        image: primaryImage,
        images: data.images.length > 0 ? data.images : [primaryImage],
        ownerId: ctx.userId,
        isOpen: true,
        status: 'Active',
      },
    };
  }

  if (data.listingType === 'product') {
    const cleanPrice = Number(String(data.productPrice).replace(/[^0-9.]/g, '')) || 0;
    const cleanPromo = data.promoPrice
      ? Number(String(data.promoPrice).replace(/[^0-9.]/g, '')) || null
      : null;
    const primaryImage = data.images[0] || getMockImage(data.productCategory || 'Product');

    return {
      collectionName: 'marketplace',
      subCollection: isBiz ? { parentId: data.businessLinkId, subName: 'products' } : undefined,
      payload: {
        title: data.title.trim(),
        name: data.title.trim(),
        description: data.description.trim(),
        category: data.productCategory || 'Other',
        condition: data.itemCondition || 'Brand New',
        price: `₦${cleanPrice.toLocaleString()}`,
        rawPrice: cleanPrice,
        regularPrice: cleanPrice,
        promoPrice: cleanPromo ? `₦${cleanPromo.toLocaleString()}` : '',
        rawPromoPrice: cleanPromo,
        state: data.state,
        city: data.city,
        streetAddress: data.streetAddress.trim(),
        location: fullLocation,
        phone: data.phone.trim(),
        businessId: isBiz ? data.businessLinkId : 'individual',
        businessName: isBiz && ctx.linkedBusiness ? ctx.linkedBusiness.name : ctx.userName || 'Independent Seller',
        sellerType: isBiz ? 'business' : 'individual',
        image: primaryImage,
        images: data.images.length > 0 ? data.images : [primaryImage],
        ownerId: ctx.userId,
        status: 'Active',
      },
    };
  }

  if (data.listingType === 'property') {
    const subType = (data.propertySubType || 'rent') as PropertySubType;
    const priceNum = Number(String(data.propertyPrice).replace(/[^0-9.]/g, '')) || 0;
    const primaryImage = data.images[0] || getMockImage('Airbnb');

    const details: Record<string, any> = {};
    if (subType === 'rent') {
      details.houseType = data.rentHouseType || 'Apartment';
      details.billingPeriod = data.rentBillingPeriod || 'Annually';
      details.bedrooms = data.rentBedrooms;
      details.bathrooms = data.rentBathrooms;
      details.furnishing = data.rentFurnishing;
    } else if (subType === 'shortlet_hotel') {
      details.pricePerNight = priceNum;
      details.maxGuests = data.shortletMaxGuests;
      details.bedrooms = data.shortletBedrooms;
      details.bathrooms = data.shortletBathrooms;
      details.amenities = data.selectedAmenities;
    } else if (subType === 'land') {
      details.plotSize = data.landPlotSize;
      details.sizeUnit = data.landSizeUnit;
      details.titleType = data.landTitleType;
    } else if (subType === 'commercial') {
      details.commercialType = data.commercialType;
      details.spaceSize = data.commercialSpaceSize;
      details.billingPeriod = data.commercialBillingPeriod;
      details.usages = data.commercialUsages;
    }

    const priceLabel =
      subType === 'shortlet_hotel'
        ? `from ₦${priceNum.toLocaleString()}/night`
        : subType === 'land'
        ? `₦${priceNum.toLocaleString()}`
        : `₦${priceNum.toLocaleString()}/${(details.billingPeriod || 'yr').toLowerCase()}`;

    const typeLabel =
      subType === 'rent'
        ? data.rentHouseType || 'Apartment'
        : subType === 'shortlet_hotel'
        ? 'Shortlet & Hotel'
        : subType === 'land'
        ? 'Land'
        : data.commercialType || 'Commercial';

    return {
      collectionName: 'house_listings',
      subCollection: isBiz ? { parentId: data.businessLinkId, subName: 'properties' } : undefined,
      payload: {
        title: data.title.trim(),
        name: data.title.trim(),
        description: data.description.trim(),
        propertySubType: subType,
        type: typeLabel,
        ...details,
        price: priceLabel,
        priceNum,
        state: data.state,
        city: data.city,
        streetAddress: data.streetAddress.trim(),
        location: fullLocation,
        phone: data.phone.trim(),
        businessId: isBiz ? data.businessLinkId : null,
        businessName: isBiz && ctx.linkedBusiness ? ctx.linkedBusiness.name : ctx.userName || 'Individual Listing',
        sellerType: isBiz ? 'business' : 'individual',
        image: primaryImage,
        images: data.images.length > 0 ? data.images : [primaryImage],
        ownerId: ctx.userId,
        bedrooms: details.bedrooms || 0,
        bathrooms: details.bathrooms || 0,
        guests: details.maxGuests || 0,
        amenities: data.selectedAmenities,
        miniSiteActive: subType === 'shortlet_hotel',
        status: 'Active',
      },
    };
  }

  // Event
  const primaryImage = data.images[0] || getMockImage(data.eventCategory || 'Event');
  const validTickets = data.ticketTypes
    .filter((t) => t.name.trim())
    .map((t) => ({
      name: t.name.trim(),
      price: Number(t.price) || 0,
      quantity: Number(t.quantity) || 100,
    }));

  return {
    collectionName: 'events',
    payload: {
      title: data.title.trim(),
      name: data.title.trim(),
      description: data.description.trim(),
      category: data.eventCategory || 'Other',
      tags: [data.eventCategory || 'Other'],
      venue: data.eventVenue.trim(),
      location: [data.eventVenue.trim(), fullLocation].filter(Boolean).join(', '),
      streetAddress: data.streetAddress.trim(),
      state: data.state,
      city: data.city,
      startDate: data.eventStartDate,
      endDate: data.eventEndDate || data.eventStartDate,
      startTime: data.eventStartTime,
      endTime: data.eventEndTime,
      ticketTypes:
        validTickets.length > 0
          ? validTickets
          : [{ name: 'General Admission', price: 0, quantity: 100 }],
      image: primaryImage,
      imageUrl: primaryImage,
      ownerId: ctx.userId,
      organizerId: ctx.userId,
      organizerName: ctx.userName || 'Event Organizer',
      isActive: true,
      status: 'Active',
    },
  };
}
