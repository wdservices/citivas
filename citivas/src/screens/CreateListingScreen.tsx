import React, { useReducer, useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  ActivityIndicator, Modal, KeyboardAvoidingView, Platform, Alert, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft, Store, ShoppingBag, Home, Calendar, UtensilsCrossed,
  ChevronRight, X, Plus, Trash2, Camera, Check,
} from '../lib/icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { uploadImageToCloudinary, CLOUDINARY_FOLDERS } from '../lib/cloudinary';
import {
  NIGERIAN_STATES, STATE_CITIES, BUSINESS_CATEGORIES, EVENT_CATEGORIES,
  PRODUCT_CATEGORIES, type NigerianState,
  PROPERTY_SUB_TYPES, PROPERTY_AMENITIES, RENT_BILLING_PERIODS,
  FURNISHING_OPTIONS, LAND_TITLE_TYPES, LAND_SIZE_UNITS,
  COMMERCIAL_USAGES, RESTAURANT_CUISINES, RESTAURANT_TYPES,
  RESTAURANT_PRICE_TIERS, RESTAURANT_AMENITIES, MENU_CATEGORIES,
  type PropertySubType,
} from '../lib/nigerianStates';
import {
  type ListingKind,
  type UnifiedNativeListingState,
  createInitialNativeListingState,
  listingFormReducer,
  validateNativeListingStep,
  buildNativeFirestorePayload,
} from '../lib/listingSchema';

const MAIN_TYPES: {
  type: ListingKind;
  icon: any;
  title: string;
  desc: string;
  tint: string;
}[] = [
  { type: 'property', icon: Home, title: 'Property', desc: 'Rentals, shortlets, hotels, land & commercial', tint: '#1E88E5' },
  { type: 'product', icon: ShoppingBag, title: 'Product / Service', desc: 'Sell items, deals, or freelance services', tint: '#D9891F' },
  { type: 'restaurant', icon: UtensilsCrossed, title: 'Restaurant & Dining', desc: 'Eateries, cafes, lounges & starter menus', tint: '#10B981' },
  { type: 'event', icon: Calendar, title: 'Event & Tickets', desc: 'Concerts, festivals, conferences & meetups', tint: '#8B5CF6' },
];

const STEPS = [
  { id: 1 as const, label: 'Category' },
  { id: 2 as const, label: 'Details' },
  { id: 3 as const, label: 'Specs' },
  { id: 4 as const, label: 'Media' },
];

const HOUSE_TYPES = ['Flat / Apartment', 'Duplex', 'Detached House', 'Terrace', 'Bungalow', 'Self-Contain / Studio'];
const COMMERCIAL_TYPES = ['Office Space', 'Shop / Retail', 'Warehouse', 'Co-working Space', 'Event Hall'];
const ITEM_CONDITIONS = ['Brand New', 'Fairly Used', 'Refurbished'];

interface PickerModalState {
  title: string;
  options: string[];
  value: string;
  onSelect: (v: string) => void;
}

function mapEditDataToState(
  editType: ListingKind,
  editData: Record<string, any>
): UnifiedNativeListingState {
  const existingImages: string[] = Array.isArray(editData.images) && editData.images.length > 0
    ? editData.images.filter((x: any) => typeof x === 'string' && x.length > 0)
    : typeof editData.image === 'string' && editData.image
    ? [editData.image]
    : [];

  const resolvedPropertySubType = (): PropertySubType | '' => {
    const raw = String(editData.propertySubType || '').toLowerCase();
    if (raw === 'rent' || raw === 'land' || raw === 'commercial') return raw;
    if (raw === 'shortlet' || raw === 'hotel' || raw === 'shortlet_hotel') return 'shortlet_hotel';
    return 'rent';
  };

  const cleanNumericString = (v: any) => {
    if (v === null || v === undefined || v === '') return '';
    const num = String(v).replace(/[^0-9.]/g, '');
    return num;
  };

  return createInitialNativeListingState({
    listingType: editType,
    title: editData.title || editData.name || '',
    description: editData.description || '',
    state: (editData.state || '') as NigerianState | '',
    city: editData.city || '',
    streetAddress: editData.streetAddress || (editType === 'business' || editType === 'restaurant' ? editData.location || '' : ''),
    phone: editData.phone || '',
    businessLinkId: editData.businessId && editData.businessId !== 'individual' ? editData.businessId : 'individual',
    images: existingImages,
    bizCategory: editData.category || '',

    // Restaurant
    cuisineType: editData.cuisine || 'Nigerian / Local Delicacies',
    establishmentType: editData.establishmentType || 'CASUAL EATERY',
    priceTier: editData.priceTier || '₦₦',
    openingHours: editData.openingHours || '08:00 AM - 10:00 PM',
    restaurantAmenities: Array.isArray(editData.amenities) && editType === 'restaurant'
      ? editData.amenities
      : ['dine_in', 'takeaway', 'pos_cards'],
    starterMenu: Array.isArray(editData.menuItems) && editData.menuItems.length > 0
      ? editData.menuItems.map((m: any) => ({
          name: m.name || '',
          category: m.category || 'Main Dishes',
          price: String(m.price || ''),
        }))
      : [{ name: '', category: 'Main Dishes', price: '' }],

    // Product
    productCategory: editType === 'product' ? (editData.category || '') : '',
    itemCondition: editData.condition || 'Brand New',
    productPrice: editType === 'product'
      ? cleanNumericString(editData.rawPrice ?? editData.regularPrice ?? editData.price)
      : '',
    promoPrice: editType === 'product'
      ? cleanNumericString(editData.rawPromoPrice ?? editData.promoPrice)
      : '',

    // Property
    propertySubType: editType === 'property' ? resolvedPropertySubType() : '',
    propertyPrice: editType === 'property'
      ? cleanNumericString(editData.priceNum ?? editData.pricePerNight ?? editData.price)
      : '',
    selectedAmenities: editType === 'property' && Array.isArray(editData.amenities) ? editData.amenities : [],
    rentHouseType: editData.houseType || 'Flat / Apartment',
    rentBillingPeriod: editData.billingPeriod || 'Annually',
    rentBedrooms: Number(editData.bedrooms ?? 2),
    rentBathrooms: Number(editData.bathrooms ?? 2),
    rentFurnishing: editData.furnishing || 'Unfurnished',
    shortletMaxGuests: Number(editData.maxGuests ?? editData.guests ?? 2),
    shortletBedrooms: Number(editData.bedrooms ?? 1),
    shortletBathrooms: Number(editData.bathrooms ?? 1),
    landPlotSize: String(editData.plotSize || ''),
    landSizeUnit: editData.sizeUnit || 'plots',
    landTitleType: editData.titleType || '',
    commercialType: editData.commercialType || 'Office Space',
    commercialSpaceSize: String(editData.spaceSize || ''),
    commercialBillingPeriod: editData.billingPeriod || 'Annually',
    commercialUsages: Array.isArray(editData.usages) ? editData.usages : [],

    // Event
    eventCategory: editType === 'event' ? (editData.category || '') : '',
    eventVenue: editData.venue || '',
    eventStartDate: editData.startDate || '',
    eventEndDate: editData.endDate || '',
    eventStartTime: editData.startTime || '',
    eventEndTime: editData.endTime || '',
    ticketTypes: Array.isArray(editData.ticketTypes) && editData.ticketTypes.length > 0
      ? editData.ticketTypes.map((t: any) => ({
          name: t.name || 'Regular',
          price: String(t.price ?? '0'),
          quantity: String(t.quantity ?? '100'),
        }))
      : [{ name: 'Regular', price: '0', quantity: '100' }],
  });
}

export default function CreateListingScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const defaultType = route.params?.defaultType as ListingKind | undefined;
  const editType = route.params?.editType as ListingKind | undefined;
  const editData = route.params?.editData as Record<string, any> | undefined;
  const isEdit = !!editType && !!editData;

  const [step, setStep] = useState<1 | 2 | 3 | 4>(isEdit || defaultType ? 2 : 1);
  const [state, dispatch] = useReducer(
    listingFormReducer,
    undefined,
    () => {
      if (isEdit && editType && editData) return mapEditDataToState(editType, editData);
      if (defaultType) return createInitialNativeListingState({ listingType: defaultType });
      return createInitialNativeListingState();
    }
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [myBusinesses, setMyBusinesses] = useState<{ id: string; name: string }[]>([]);
  const [picker, setPicker] = useState<PickerModalState | null>(null);

  const setField = useCallback(
    <K extends keyof UnifiedNativeListingState>(field: K, value: UnifiedNativeListingState[K]) => {
      dispatch({ type: 'SET_FIELD', field, value });
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    []
  );

  const loadMyBusinesses = useCallback(async () => {
    if (!user?.id) return;
    try {
      const q = query(collection(db, 'businesses'), where('ownerId', '==', user.id));
      const snap = await getDocs(q);
      setMyBusinesses(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || d.data().title || 'Unnamed Business',
        }))
      );
    } catch {
      setMyBusinesses([]);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadMyBusinesses();
    }, [loadMyBusinesses])
  );

  useEffect(() => {
    if (isEdit && editType && editData) {
      dispatch({ type: 'RESET', initial: mapEditDataToState(editType, editData) });
      setStep(2);
    } else if (defaultType) {
      dispatch({ type: 'RESET', initial: createInitialNativeListingState({ listingType: defaultType }) });
      setStep(2);
    }
  }, [isEdit, editType, editData, defaultType]);

  const handleSelectKind = (kind: ListingKind) => {
    dispatch({
      type: 'PATCH',
      patch: {
        listingType: kind,
        propertySubType: kind === 'property' && !state.propertySubType ? 'rent' : state.propertySubType,
      },
    });
    setErrors({});
    setStep(2);
  };

  const handleNext = () => {
    const check = validateNativeListingStep(step, state);
    if (!check.valid) {
      setErrors(check.errors);
      const firstErr = Object.values(check.errors)[0];
      if (firstErr) Alert.alert('Missing Details', firstErr);
      return;
    }
    setErrors({});
    if (step < 4) setStep((step + 1) as 1 | 2 | 3 | 4);
  };

  const handlePickImage = async () => {
    if (state.images.length >= 6) {
      Alert.alert('Photo Limit', 'You can upload up to 6 photos per listing.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Needed', 'Please allow photo library access to upload listing images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    setUploadingPhoto(true);
    try {
      const folder =
        state.listingType === 'product'
          ? CLOUDINARY_FOLDERS.MARKETPLACE
          : state.listingType === 'property'
          ? CLOUDINARY_FOLDERS.PROPERTIES
          : state.listingType === 'event'
          ? CLOUDINARY_FOLDERS.EVENTS
          : CLOUDINARY_FOLDERS.BUSINESSES;
      const uploaded = await uploadImageToCloudinary(result.assets[0].uri, folder);
      setField('images', [...state.images, uploaded.secureUrl]);
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.message || 'Could not upload image right now.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) return;
    const validation = validateNativeListingStep(4, state);
    if (!validation.valid) {
      setErrors(validation.errors);
      Alert.alert('Check Required Fields', Object.values(validation.errors)[0] || 'Please review your listing details.');
      return;
    }

    setSubmitting(true);
    try {
      const linkedBusiness = myBusinesses.find((b) => b.id === state.businessLinkId);
      const serialized = buildNativeFirestorePayload(state, {
        userId: user.id,
        userName: user.name || user.email || 'Citivas User',
        linkedBusiness,
      });

      if (isEdit && editData?.id) {
        await updateDoc(doc(db, serialized.collectionName, editData.id), {
          ...serialized.payload,
          updatedAt: serverTimestamp(),
        });
      } else {
        const docRef = await addDoc(collection(db, serialized.collectionName), {
          ...serialized.payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        if (serialized.subCollection) {
          try {
            await addDoc(
              collection(db, 'businesses', serialized.subCollection.parentId, serialized.subCollection.subName),
              {
                ...serialized.payload,
                parentDocId: docRef.id,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              }
            );
          } catch {
            // Non-blocking subcollection mirror
          }
        }
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Save Error', e?.message || 'Failed to publish listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const cities = state.state ? STATE_CITIES[state.state as NigerianState] || [] : [];

  const renderLabel = (text: string, required = false) => (
    <Text style={[s.label, { color: colors.mutedForeground }]}>
      {text} {required ? <Text style={{ color: colors.destructive }}>*</Text> : null}
    </Text>
  );

  const renderError = (field: string) =>
    errors[field] ? (
      <Text style={[s.errorText, { color: colors.destructive }]}>{errors[field]}</Text>
    ) : null;

  const renderInput = (
    value: string,
    onChangeText: (v: string) => void,
    placeholder: string,
    opts?: { multiline?: boolean; keyboardType?: any; numberOfLines?: number; hasError?: boolean }
  ) => (
    <TextInput
      style={[
        s.input,
        {
          borderColor: opts?.hasError ? colors.destructive : colors.border,
          color: colors.foreground,
          backgroundColor: colors.card,
        },
        opts?.multiline && { height: (opts.numberOfLines || 3) * 20 + 24, textAlignVertical: 'top' },
      ]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.mutedForeground}
      multiline={opts?.multiline}
      numberOfLines={opts?.numberOfLines}
      keyboardType={opts?.keyboardType}
    />
  );

  const openPicker = (title: string, options: string[], value: string, onSelect: (v: string) => void) => {
    setPicker({ title, options, value, onSelect });
  };

  const renderDropdownField = (
    label: string,
    value: string,
    options: string[],
    onSelect: (v: string) => void,
    opts?: { required?: boolean; placeholder?: string; errorKey?: string }
  ) => (
    <View>
      {renderLabel(label, opts?.required)}
      <TouchableOpacity
        style={[
          s.input,
          s.dropdownBtn,
          {
            borderColor: opts?.errorKey && errors[opts.errorKey] ? colors.destructive : colors.border,
            backgroundColor: colors.card,
          },
        ]}
        onPress={() => openPicker(label, options, value, onSelect)}
        activeOpacity={0.7}
      >
        <Text style={{ color: value ? colors.foreground : colors.mutedForeground, fontSize: 14, flex: 1 }} numberOfLines={1}>
          {value || opts?.placeholder || `Select ${label}`}
        </Text>
        <ChevronRight size={16} color={colors.mutedForeground} style={{ transform: [{ rotate: '90deg' }] }} />
      </TouchableOpacity>
      {opts?.errorKey ? renderError(opts.errorKey) : null}
    </View>
  );

  const renderStepper = (label: string, value: number, onChange: (n: number) => void, min = 0) => (
    <View style={s.halfField}>
      {renderLabel(label)}
      <View style={s.stepperRow}>
        <TouchableOpacity
          style={[s.stepperBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={() => onChange(Math.max(min, value - 1))}
          activeOpacity={0.7}
        >
          <Text style={[s.stepperBtnTxt, { color: colors.foreground }]}>−</Text>
        </TouchableOpacity>
        <Text style={[s.stepperValue, { color: colors.foreground }]}>{value}</Text>
        <TouchableOpacity
          style={[s.stepperBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={() => onChange(value + 1)}
          activeOpacity={0.7}
        >
          <Text style={[s.stepperBtnTxt, { color: colors.foreground }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const toggleInList = (field: 'selectedAmenities' | 'commercialUsages' | 'restaurantAmenities', val: string) => {
    const curr = state[field];
    const next = curr.includes(val) ? curr.filter((x) => x !== val) : [...curr, val];
    setField(field, next);
  };

  // STEP 1: Category Picker
  const renderStep1 = () => (
    <View style={s.stepContainer}>
      <Text style={[s.wizardTitle, { color: colors.foreground }]}>What are you listing today?</Text>
      <Text style={[s.wizardDesc, { color: colors.mutedForeground }]}>
        Choose one of the 4 listing categories to launch the guided setup.
      </Text>
      <View style={s.typeList}>
        {MAIN_TYPES.map((opt) => {
          const active = state.listingType === opt.type;
          return (
            <TouchableOpacity
              key={opt.type}
              style={[
                s.typeCard,
                {
                  backgroundColor: colors.card,
                  borderColor: active ? colors.primary : colors.border,
                  borderWidth: active ? 1.5 : 1,
                },
              ]}
              onPress={() => handleSelectKind(opt.type)}
              activeOpacity={0.75}
            >
              <View style={[s.typeIcon, { backgroundColor: `${opt.tint}15` }]}>
                <opt.icon size={24} color={opt.tint} strokeWidth={2} />
              </View>
              <View style={s.typeText}>
                <Text style={[s.typeTitle, { color: colors.foreground }]}>{opt.title}</Text>
                <Text style={[s.typeDesc, { color: colors.mutedForeground }]}>{opt.desc}</Text>
              </View>
              <ChevronRight size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[s.secondaryKindBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
        onPress={() => handleSelectKind('business')}
        activeOpacity={0.75}
      >
        <Store size={18} color={colors.mutedForeground} strokeWidth={2} />
        <View style={{ flex: 1 }}>
          <Text style={[s.secondaryKindTitle, { color: colors.foreground }]}>Register a General Business</Text>
          <Text style={[s.secondaryKindDesc, { color: colors.mutedForeground }]}>
            Salons, pharmacies, auto shops, fitness & local services
          </Text>
        </View>
        <ChevronRight size={16} color={colors.mutedForeground} />
      </TouchableOpacity>
    </View>
  );

  // STEP 2: Core Details & Location
  const renderStep2 = () => {
    const titleLabel =
      state.listingType === 'restaurant'
        ? 'Restaurant Name'
        : state.listingType === 'event'
        ? 'Event Title'
        : state.listingType === 'property'
        ? 'Property Title'
        : state.listingType === 'business'
        ? 'Business Name'
        : 'Product / Service Title';

    const titlePlaceholder =
      state.listingType === 'restaurant'
        ? 'e.g. Nok by Alara'
        : state.listingType === 'event'
        ? 'e.g. Lagos Food & Wine Festival'
        : state.listingType === 'property'
        ? 'e.g. 2-Bedroom Serviced Flat in Lekki'
        : state.listingType === 'business'
        ? 'e.g. Glokakes Bakehouse'
        : 'e.g. Brand New iPhone 15 Pro';

    const linkedBizName =
      state.businessLinkId === 'individual'
        ? 'Individual / Personal Account'
        : myBusinesses.find((b) => b.id === state.businessLinkId)?.name || 'Individual / Personal Account';

    return (
      <View style={s.formSection}>
        {renderLabel(titleLabel, true)}
        {renderInput(state.title, (v) => setField('title', v), titlePlaceholder, { hasError: !!errors.title })}
        {renderError('title')}

        {state.listingType === 'business' &&
          renderDropdownField(
            'Business Category',
            state.bizCategory,
            [...BUSINESS_CATEGORIES],
            (v) => setField('bizCategory', v),
            { required: true, errorKey: 'bizCategory' }
          )}

        {(state.listingType === 'product' || state.listingType === 'property') && myBusinesses.length > 0 && (
          <View>
            {renderDropdownField(
              'List Under Account',
              linkedBizName,
              ['Individual / Personal Account', ...myBusinesses.map((b) => b.name)],
              (choice) => {
                if (choice === 'Individual / Personal Account') {
                  setField('businessLinkId', 'individual');
                } else {
                  const found = myBusinesses.find((b) => b.name === choice);
                  setField('businessLinkId', found?.id || 'individual');
                }
              }
            )}
          </View>
        )}

        {renderLabel('Description', true)}
        {renderInput(
          state.description,
          (v) => setField('description', v),
          'Describe key highlights, features, or what buyers should expect...',
          { multiline: true, numberOfLines: 4, hasError: !!errors.description }
        )}
        {renderError('description')}

        <View style={s.row}>
          <View style={s.halfField}>
            {renderDropdownField(
              'State',
              state.state,
              [...NIGERIAN_STATES],
              (v) => dispatch({ type: 'PATCH', patch: { state: v as NigerianState, city: '' } }),
              { required: true, errorKey: 'state' }
            )}
          </View>
          <View style={s.halfField}>
            {renderDropdownField(
              'City / Area',
              state.city,
              cities.length > 0 ? cities : ['Select a state first'],
              (v) => {
                if (v !== 'Select a state first') setField('city', v);
              },
              { placeholder: state.state ? 'Select city' : 'Choose state first' }
            )}
          </View>
        </View>

        {renderLabel('Street Address / Landmark')}
        {renderInput(state.streetAddress, (v) => setField('streetAddress', v), 'e.g. 15 Admiralty Way, Lekki Phase 1')}

        {renderLabel(
          'Contact Phone Number',
          state.listingType === 'restaurant' || state.listingType === 'business'
        )}
        {renderInput(state.phone, (v) => setField('phone', v), '+234 801 234 5678', {
          keyboardType: 'phone-pad',
          hasError: !!errors.phone,
        })}
        {renderError('phone')}
      </View>
    );
  };

  // STEP 3: Type-Specific Details
  const renderStep3 = () => {
    if (state.listingType === 'property') {
      const sub = state.propertySubType || 'rent';
      return (
        <View style={s.formSection}>
          {renderLabel('Property Type', true)}
          <View style={s.subTypeGrid}>
            {PROPERTY_SUB_TYPES.map((st) => {
              const active = sub === st.value;
              return (
                <TouchableOpacity
                  key={st.value}
                  style={[
                    s.subTypeCard,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? `${colors.primary}12` : colors.card,
                    },
                  ]}
                  onPress={() => setField('propertySubType', st.value)}
                  activeOpacity={0.75}
                >
                  <Text style={{ fontSize: 20 }}>{st.icon}</Text>
                  <Text style={[s.subTypeTitle, { color: active ? colors.primary : colors.foreground }]}>
                    {st.label}
                  </Text>
                  <Text style={[s.subTypeDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                    {st.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {renderError('propertySubType')}

          {sub === 'rent' && (
            <View style={[s.specBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[s.specBoxTitle, { color: colors.foreground }]}>Rental Specifications</Text>
              {renderDropdownField('House Type', state.rentHouseType, HOUSE_TYPES, (v) => setField('rentHouseType', v))}
              <View style={s.row}>
                <View style={s.halfField}>
                  {renderLabel('Rent Price (₦)', true)}
                  {renderInput(state.propertyPrice, (v) => setField('propertyPrice', v), '1500000', {
                    keyboardType: 'numeric',
                    hasError: !!errors.propertyPrice,
                  })}
                  {renderError('propertyPrice')}
                </View>
                <View style={s.halfField}>
                  {renderDropdownField('Billing Cycle', state.rentBillingPeriod, [...RENT_BILLING_PERIODS], (v) =>
                    setField('rentBillingPeriod', v)
                  )}
                </View>
              </View>
              <View style={s.row}>
                {renderStepper('Bedrooms', state.rentBedrooms, (n) => setField('rentBedrooms', n), 0)}
                {renderStepper('Bathrooms', state.rentBathrooms, (n) => setField('rentBathrooms', n), 0)}
              </View>
              {renderDropdownField('Furnishing', state.rentFurnishing, [...FURNISHING_OPTIONS], (v) =>
                setField('rentFurnishing', v)
              )}
            </View>
          )}

          {sub === 'shortlet_hotel' && (
            <View style={[s.specBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[s.specBoxTitle, { color: colors.foreground }]}>Shortlet & Hotel Details</Text>
              {renderLabel('Nightly Rate (₦)', true)}
              {renderInput(state.propertyPrice, (v) => setField('propertyPrice', v), '45000', {
                keyboardType: 'numeric',
                hasError: !!errors.propertyPrice,
              })}
              {renderError('propertyPrice')}
              <View style={s.row}>
                {renderStepper('Max Guests', state.shortletMaxGuests, (n) => setField('shortletMaxGuests', n), 1)}
                {renderStepper('Bedrooms', state.shortletBedrooms, (n) => setField('shortletBedrooms', n), 1)}
              </View>
              {renderStepper('Bathrooms', state.shortletBathrooms, (n) => setField('shortletBathrooms', n), 1)}
              {renderLabel('Amenities')}
              <View style={s.chipWrap}>
                {PROPERTY_AMENITIES.map((a) => {
                  const active = state.selectedAmenities.includes(a.id);
                  return (
                    <TouchableOpacity
                      key={a.id}
                      style={[
                        s.chip,
                        {
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? `${colors.primary}15` : colors.muted,
                        },
                      ]}
                      onPress={() => toggleInList('selectedAmenities', a.id)}
                    >
                      <Text style={{ fontSize: 12 }}>{a.icon}</Text>
                      <Text style={[s.chipText, { color: active ? colors.primary : colors.foreground }]}>
                        {a.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {sub === 'land' && (
            <View style={[s.specBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[s.specBoxTitle, { color: colors.foreground }]}>Land Details</Text>
              {renderLabel('Total Price (₦)', true)}
              {renderInput(state.propertyPrice, (v) => setField('propertyPrice', v), '25000000', {
                keyboardType: 'numeric',
                hasError: !!errors.propertyPrice,
              })}
              {renderError('propertyPrice')}
              <View style={s.row}>
                <View style={s.halfField}>
                  {renderLabel('Plot Size', true)}
                  {renderInput(state.landPlotSize, (v) => setField('landPlotSize', v), '600', {
                    keyboardType: 'numeric',
                    hasError: !!errors.landPlotSize,
                  })}
                  {renderError('landPlotSize')}
                </View>
                <View style={s.halfField}>
                  {renderDropdownField('Unit', state.landSizeUnit, [...LAND_SIZE_UNITS], (v) =>
                    setField('landSizeUnit', v)
                  )}
                </View>
              </View>
              {renderDropdownField('Title Document', state.landTitleType, [...LAND_TITLE_TYPES], (v) =>
                setField('landTitleType', v)
              )}
            </View>
          )}

          {sub === 'commercial' && (
            <View style={[s.specBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[s.specBoxTitle, { color: colors.foreground }]}>Commercial Property</Text>
              {renderDropdownField('Space Type', state.commercialType, COMMERCIAL_TYPES, (v) =>
                setField('commercialType', v)
              )}
              <View style={s.row}>
                <View style={s.halfField}>
                  {renderLabel('Lease Price (₦)', true)}
                  {renderInput(state.propertyPrice, (v) => setField('propertyPrice', v), '3500000', {
                    keyboardType: 'numeric',
                    hasError: !!errors.propertyPrice,
                  })}
                  {renderError('propertyPrice')}
                </View>
                <View style={s.halfField}>
                  {renderDropdownField('Billing Cycle', state.commercialBillingPeriod, [...RENT_BILLING_PERIODS], (v) =>
                    setField('commercialBillingPeriod', v)
                  )}
                </View>
              </View>
              {renderLabel('Floor Size (sqm)')}
              {renderInput(state.commercialSpaceSize, (v) => setField('commercialSpaceSize', v), '250', {
                keyboardType: 'numeric',
              })}
              {renderLabel('Suitable Usages')}
              <View style={s.chipWrap}>
                {COMMERCIAL_USAGES.map((u) => {
                  const active = state.commercialUsages.includes(u);
                  return (
                    <TouchableOpacity
                      key={u}
                      style={[
                        s.chip,
                        {
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? `${colors.primary}15` : colors.muted,
                        },
                      ]}
                      onPress={() => toggleInList('commercialUsages', u)}
                    >
                      <Text style={[s.chipText, { color: active ? colors.primary : colors.foreground }]}>{u}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      );
    }

    if (state.listingType === 'product') {
      return (
        <View style={s.formSection}>
          {renderDropdownField(
            'Product Category',
            state.productCategory,
            [...PRODUCT_CATEGORIES],
            (v) => setField('productCategory', v),
            { required: true, errorKey: 'productCategory' }
          )}

          {renderLabel('Condition')}
          <View style={s.chipWrap}>
            {ITEM_CONDITIONS.map((cond) => {
              const active = state.itemCondition === cond;
              return (
                <TouchableOpacity
                  key={cond}
                  style={[
                    s.chip,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? `${colors.primary}15` : colors.card,
                    },
                  ]}
                  onPress={() => setField('itemCondition', cond)}
                >
                  <Text style={[s.chipText, { color: active ? colors.primary : colors.foreground }]}>{cond}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={s.row}>
            <View style={s.halfField}>
              {renderLabel('Regular Price (₦)', true)}
              {renderInput(state.productPrice, (v) => setField('productPrice', v), '150000', {
                keyboardType: 'numeric',
                hasError: !!errors.productPrice,
              })}
              {renderError('productPrice')}
            </View>
            <View style={s.halfField}>
              {renderLabel('Promo Price (₦)')}
              {renderInput(state.promoPrice, (v) => setField('promoPrice', v), 'Optional', {
                keyboardType: 'numeric',
              })}
            </View>
          </View>

          {state.promoPrice && state.productPrice ? (
            <Text style={[s.previewHint, { color: colors.mutedForeground }]}>
              Display price:{' '}
              <Text style={{ textDecorationLine: 'line-through', color: colors.destructive }}>
                ₦{Number(state.productPrice.replace(/[^0-9.]/g, '') || 0).toLocaleString()}
              </Text>{' '}
              <Text style={{ fontWeight: '700', color: colors.primary }}>
                ₦{Number(state.promoPrice.replace(/[^0-9.]/g, '') || 0).toLocaleString()}
              </Text>
            </Text>
          ) : null}
        </View>
      );
    }

    if (state.listingType === 'restaurant') {
      return (
        <View style={s.formSection}>
          {renderDropdownField(
            'Primary Cuisine',
            state.cuisineType,
            [...RESTAURANT_CUISINES],
            (v) => setField('cuisineType', v),
            { required: true, errorKey: 'cuisineType' }
          )}
          <View style={s.row}>
            <View style={s.halfField}>
              {renderDropdownField(
                'Dining Style',
                state.establishmentType,
                [...RESTAURANT_TYPES],
                (v) => setField('establishmentType', v)
              )}
            </View>
            <View style={s.halfField}>
              {renderDropdownField(
                'Price Tier',
                RESTAURANT_PRICE_TIERS.find((t) => t.value === state.priceTier)?.label || state.priceTier,
                RESTAURANT_PRICE_TIERS.map((t) => t.label),
                (label) => {
                  const found = RESTAURANT_PRICE_TIERS.find((t) => t.label === label);
                  setField('priceTier', found?.value || '₦₦');
                }
              )}
            </View>
          </View>

          {renderLabel('Opening Hours')}
          {renderInput(state.openingHours, (v) => setField('openingHours', v), '08:00 AM - 10:00 PM')}

          {renderLabel('Restaurant Features')}
          <View style={s.chipWrap}>
            {RESTAURANT_AMENITIES.map((a) => {
              const active = state.restaurantAmenities.includes(a.id);
              return (
                <TouchableOpacity
                  key={a.id}
                  style={[
                    s.chip,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? `${colors.primary}15` : colors.card,
                    },
                  ]}
                  onPress={() => toggleInList('restaurantAmenities', a.id)}
                >
                  <Text style={[s.chipText, { color: active ? colors.primary : colors.foreground }]}>
                    {a.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[s.specBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[s.specBoxTitle, { color: colors.foreground }]}>Starter Menu Highlights</Text>
            {state.starterMenu.map((item, idx) => (
              <View key={idx} style={[s.tierRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <View style={{ flex: 1, gap: 6 }}>
                  <TextInput
                    style={[s.compactInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
                    value={item.name}
                    onChangeText={(v) => {
                      const next = [...state.starterMenu];
                      next[idx] = { ...next[idx], name: v };
                      setField('starterMenu', next);
                    }}
                    placeholder="Dish name (e.g. Smokey Jollof & Chicken)"
                    placeholderTextColor={colors.mutedForeground}
                  />
                  <View style={s.row}>
                    <TouchableOpacity
                      style={[
                        s.compactInput,
                        s.dropdownBtn,
                        { flex: 1.4, borderColor: colors.border, backgroundColor: colors.card },
                      ]}
                      onPress={() =>
                        openPicker('Menu Category', [...MENU_CATEGORIES], item.category, (val) => {
                          const next = [...state.starterMenu];
                          next[idx] = { ...next[idx], category: val };
                          setField('starterMenu', next);
                        })
                      }
                    >
                      <Text style={{ fontSize: 12, color: colors.foreground }} numberOfLines={1}>
                        {item.category}
                      </Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[
                        s.compactInput,
                        { flex: 1, borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card },
                      ]}
                      value={item.price}
                      onChangeText={(v) => {
                        const next = [...state.starterMenu];
                        next[idx] = { ...next[idx], price: v };
                        setField('starterMenu', next);
                      }}
                      placeholder="Price (₦)"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                {state.starterMenu.length > 1 && (
                  <TouchableOpacity
                    onPress={() =>
                      setField(
                        'starterMenu',
                        state.starterMenu.filter((_, j) => j !== idx)
                      )
                    }
                    style={{ padding: 6 }}
                  >
                    <Trash2 size={18} color={colors.destructive} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity
              style={[s.addInlineBtn, { borderColor: colors.primary }]}
              onPress={() =>
                setField('starterMenu', [
                  ...state.starterMenu,
                  { name: '', category: 'Main Dishes', price: '' },
                ])
              }
            >
              <Plus size={15} color={colors.primary} />
              <Text style={[s.addInlineBtnText, { color: colors.primary }]}>Add Menu Item</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (state.listingType === 'event') {
      return (
        <View style={s.formSection}>
          {renderDropdownField('Event Category', state.eventCategory, [...EVENT_CATEGORIES], (v) =>
            setField('eventCategory', v)
          )}
          {renderLabel('Venue Name')}
          {renderInput(state.eventVenue, (v) => setField('eventVenue', v), 'e.g. Eko Atlantic City')}

          <View style={s.row}>
            <View style={s.halfField}>
              {renderLabel('Start Date', true)}
              {renderInput(state.eventStartDate, (v) => setField('eventStartDate', v), 'YYYY-MM-DD', {
                hasError: !!errors.eventStartDate,
              })}
              {renderError('eventStartDate')}
            </View>
            <View style={s.halfField}>
              {renderLabel('End Date')}
              {renderInput(state.eventEndDate, (v) => setField('eventEndDate', v), 'YYYY-MM-DD')}
            </View>
          </View>

          <View style={s.row}>
            <View style={s.halfField}>
              {renderLabel('Start Time')}
              {renderInput(state.eventStartTime, (v) => setField('eventStartTime', v), '18:00')}
            </View>
            <View style={s.halfField}>
              {renderLabel('End Time')}
              {renderInput(state.eventEndTime, (v) => setField('eventEndTime', v), '23:00')}
            </View>
          </View>

          <View style={[s.specBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[s.specBoxTitle, { color: colors.foreground }]}>Ticket Tiers</Text>
            {renderError('ticketTypes')}
            {state.ticketTypes.map((ticket, i) => (
              <View key={i} style={[s.tierRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <View style={{ flex: 1, gap: 6 }}>
                  <TextInput
                    style={[s.compactInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
                    value={ticket.name}
                    onChangeText={(v) => {
                      const next = [...state.ticketTypes];
                      next[i] = { ...next[i], name: v };
                      setField('ticketTypes', next);
                    }}
                    placeholder="Tier name (e.g. Regular, VIP)"
                    placeholderTextColor={colors.mutedForeground}
                  />
                  <View style={s.row}>
                    <TextInput
                      style={[
                        s.compactInput,
                        { flex: 1, borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card },
                      ]}
                      value={ticket.price}
                      onChangeText={(v) => {
                        const next = [...state.ticketTypes];
                        next[i] = { ...next[i], price: v };
                        setField('ticketTypes', next);
                      }}
                      placeholder="Price (₦)"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="numeric"
                    />
                    <TextInput
                      style={[
                        s.compactInput,
                        { flex: 1, borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card },
                      ]}
                      value={ticket.quantity}
                      onChangeText={(v) => {
                        const next = [...state.ticketTypes];
                        next[i] = { ...next[i], quantity: v };
                        setField('ticketTypes', next);
                      }}
                      placeholder="Capacity"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                {state.ticketTypes.length > 1 && (
                  <TouchableOpacity
                    onPress={() =>
                      setField(
                        'ticketTypes',
                        state.ticketTypes.filter((_, j) => j !== i)
                      )
                    }
                    style={{ padding: 6 }}
                  >
                    <Trash2 size={18} color={colors.destructive} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity
              style={[s.addInlineBtn, { borderColor: colors.primary }]}
              onPress={() =>
                setField('ticketTypes', [...state.ticketTypes, { name: '', price: '0', quantity: '100' }])
              }
            >
              <Plus size={15} color={colors.primary} />
              <Text style={[s.addInlineBtnText, { color: colors.primary }]}>Add Ticket Tier</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // General Business
    return (
      <View style={[s.specBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[s.specBoxTitle, { color: colors.foreground }]}>Business Directory Readiness</Text>
        <Text style={{ fontSize: 13, lineHeight: 20, color: colors.mutedForeground }}>
          Your business profile ({state.title || 'Untitled'}) under {state.bizCategory || 'Business Services'} is
          ready for media upload and directory publication. Customers will be able to find you in{' '}
          {[state.city, state.state].filter(Boolean).join(', ') || 'your city'} and reach out directly.
        </Text>
      </View>
    );
  };

  // STEP 4: Media & Review
  const renderStep4 = () => {
    const typeLabel =
      state.listingType === 'property'
        ? 'Property'
        : state.listingType === 'product'
        ? 'Product / Service'
        : state.listingType === 'restaurant'
        ? 'Restaurant'
        : state.listingType === 'event'
        ? 'Event'
        : 'Business';

    const priceDisplay =
      state.listingType === 'property' && state.propertyPrice
        ? `₦${Number(state.propertyPrice.replace(/[^0-9.]/g, '') || 0).toLocaleString()}`
        : state.listingType === 'product' && state.productPrice
        ? `₦${Number(state.productPrice.replace(/[^0-9.]/g, '') || 0).toLocaleString()}`
        : state.listingType === 'restaurant'
        ? `${state.cuisineType} · ${state.priceTier}`
        : state.listingType === 'event'
        ? `${state.ticketTypes.length} ticket tier${state.ticketTypes.length === 1 ? '' : 's'}`
        : state.bizCategory || 'Directory';

    return (
      <View style={s.formSection}>
        <View style={[s.specBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[s.specBoxTitle, { color: colors.foreground }]}>Photos ({state.images.length}/6)</Text>
            <TouchableOpacity
              style={[s.uploadBtn, { backgroundColor: `${colors.primary}15` }]}
              onPress={handlePickImage}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Camera size={16} color={colors.primary} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>Add Photo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {state.images.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 6 }}>
              {state.images.map((uri, idx) => (
                <View key={`${uri}-${idx}`} style={s.photoThumbWrap}>
                  <Image source={{ uri }} style={s.photoThumb} resizeMode="cover" />
                  <TouchableOpacity
                    style={[s.photoDeleteBtn, { backgroundColor: colors.destructive }]}
                    onPress={() =>
                      setField(
                        'images',
                        state.images.filter((_, j) => j !== idx)
                      )
                    }
                  >
                    <X size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          ) : (
            <TouchableOpacity
              style={[s.emptyPhotoBox, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={handlePickImage}
              disabled={uploadingPhoto}
            >
              <Camera size={24} color={colors.mutedForeground} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>
                Tap to upload listing photos
              </Text>
              <Text style={{ fontSize: 11, color: colors.mutedForeground, textAlign: 'center' }}>
                Optional — high quality photos help buyers trust your listing
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[s.specBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[s.specBoxTitle, { color: colors.foreground }]}>Review Summary</Text>
          <View style={s.summaryRow}>
            <Text style={[s.summaryKey, { color: colors.mutedForeground }]}>Category</Text>
            <Text style={[s.summaryVal, { color: colors.foreground }]}>{typeLabel}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={[s.summaryKey, { color: colors.mutedForeground }]}>Title</Text>
            <Text style={[s.summaryVal, { color: colors.foreground }]} numberOfLines={1}>
              {state.title}
            </Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={[s.summaryKey, { color: colors.mutedForeground }]}>Location</Text>
            <Text style={[s.summaryVal, { color: colors.foreground }]} numberOfLines={1}>
              {[state.city, state.state].filter(Boolean).join(', ') || 'Nigeria'}
            </Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={[s.summaryKey, { color: colors.mutedForeground }]}>Highlight</Text>
            <Text style={[s.summaryVal, { color: colors.primary, fontVariant: ['tabular-nums'] }]}>
              {priceDisplay}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const stepHeaderTitle = isEdit
    ? 'Edit Listing'
    : step === 1
    ? 'Create Listing'
    : state.listingType === 'property'
    ? 'List a Property'
    : state.listingType === 'product'
    ? 'Post a Product'
    : state.listingType === 'restaurant'
    ? 'Add Restaurant'
    : state.listingType === 'event'
    ? 'Create Event'
    : 'Register Business';

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: insets.top + 6, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => {
            if (step > 1 && !isEdit) setStep((step - 1) as 1 | 2 | 3 | 4);
            else navigation.goBack();
          }}
          style={s.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={22} color={colors.foreground} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.foreground }]}>{stepHeaderTitle}</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Progress Stepper */}
      <View style={[s.stepperHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {STEPS.map((st, index) => {
          const isDone = step > st.id;
          const isCurrent = step === st.id;
          const canJump = (st.id === 1 && !isEdit) || st.id < step;
          return (
            <React.Fragment key={st.id}>
              <TouchableOpacity
                style={s.stepPill}
                disabled={!canJump}
                onPress={() => {
                  if (canJump) setStep(st.id);
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    s.stepDot,
                    {
                      backgroundColor: isDone || isCurrent ? colors.primary : colors.muted,
                      borderColor: isCurrent ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  {isDone ? (
                    <Check size={12} color="#fff" strokeWidth={3} />
                  ) : (
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '800',
                        color: isCurrent ? '#fff' : colors.mutedForeground,
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {st.id}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    s.stepText,
                    { color: isCurrent ? colors.foreground : colors.mutedForeground },
                  ]}
                >
                  {st.label}
                </Text>
              </TouchableOpacity>
              {index < STEPS.length - 1 && (
                <View
                  style={[
                    s.stepLine,
                    { backgroundColor: step > st.id ? colors.primary : colors.border },
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          <View style={{ height: insets.bottom + 96 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {step > 1 && (
        <View
          style={[
            s.bottomBar,
            { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 12 },
          ]}
        >
          {!(isEdit && step === 2) && (
            <TouchableOpacity
              style={[s.bottomBtn, { backgroundColor: colors.muted }]}
              onPress={() => setStep((step - 1) as 1 | 2 | 3 | 4)}
              activeOpacity={0.8}
            >
              <Text style={[s.bottomBtnText, { color: colors.foreground }]}>Back</Text>
            </TouchableOpacity>
          )}

          {step < 4 ? (
            <TouchableOpacity
              style={[s.bottomBtn, { backgroundColor: colors.primary, flex: 1.5 }]}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={[s.bottomBtnText, { color: '#fff' }]}>Continue</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                s.bottomBtn,
                { backgroundColor: colors.primary, flex: 1.5, opacity: submitting || uploadingPhoto ? 0.6 : 1 },
              ]}
              onPress={handleSubmit}
              disabled={submitting || uploadingPhoto}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[s.bottomBtnText, { color: '#fff' }]}>
                  {isEdit ? 'Save Changes' : 'Publish Listing'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Shared Picker Modal */}
      <Modal
        visible={!!picker}
        transparent
        animationType="fade"
        onRequestClose={() => setPicker(null)}
      >
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setPicker(null)}>
          <View style={[s.modalContent, { backgroundColor: colors.card, maxHeight: '65%' }]}>
            <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[s.modalTitle, { color: colors.foreground }]}>{picker?.title}</Text>
              <TouchableOpacity onPress={() => setPicker(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {picker?.options.map((opt) => {
                const selected = picker.value === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[s.modalItem, selected && { backgroundColor: `${colors.primary}15` }]}
                    onPress={() => {
                      picker.onSelect(opt);
                      setPicker(null);
                    }}
                  >
                    <Text style={[s.modalItemText, { color: selected ? colors.primary : colors.foreground }]}>
                      {opt}
                    </Text>
                    {selected && <View style={[s.radioDot, { backgroundColor: colors.primary }]} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, gap: 12 },
  backBtn: { padding: 6, minWidth: 40, minHeight: 40, justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 19, fontWeight: '800', letterSpacing: -0.3, textAlign: 'center' },

  stepperHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  stepPill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 12, fontWeight: '700' },
  stepLine: { flex: 1, height: 1.5, marginHorizontal: 6 },

  scrollContent: { paddingHorizontal: 16, paddingTop: 18 },
  stepContainer: {},
  wizardTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3, marginBottom: 4 },
  wizardDesc: { fontSize: 14, marginBottom: 18, lineHeight: 20 },
  typeList: { gap: 12 },
  typeCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, gap: 14 },
  typeIcon: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  typeText: { flex: 1 },
  typeTitle: { fontSize: 15, fontWeight: '700' },
  typeDesc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  secondaryKindBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  secondaryKindTitle: { fontSize: 13, fontWeight: '700' },
  secondaryKindDesc: { fontSize: 11, marginTop: 2 },

  formSection: { gap: 12 },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  errorText: { fontSize: 11, fontWeight: '600', marginTop: 3 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginTop: 5, minHeight: 46 },
  dropdownBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', gap: 10 },
  halfField: { flex: 1 },

  subTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  subTypeCard: { width: '48%', flexGrow: 1, borderWidth: 1.5, borderRadius: 14, padding: 12, gap: 4 },
  subTypeTitle: { fontSize: 14, fontWeight: '700' },
  subTypeDesc: { fontSize: 11, lineHeight: 15 },

  specBox: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10, marginTop: 4 },
  specBoxTitle: { fontSize: 13, fontWeight: '800', letterSpacing: -0.2 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  stepperBtn: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepperBtnTxt: { fontSize: 18, fontWeight: '700' },
  stepperValue: { fontSize: 16, fontWeight: '800', minWidth: 26, textAlign: 'center', fontVariant: ['tabular-nums'] },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },
  previewHint: { fontSize: 12, marginTop: 2 },

  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, padding: 10 },
  compactInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, fontSize: 13, minHeight: 40 },
  addInlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, alignSelf: 'flex-start' },
  addInlineBtnText: { fontSize: 12, fontWeight: '700' },

  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, minHeight: 36 },
  photoThumbWrap: { position: 'relative', width: 96, height: 84, borderRadius: 12, overflow: 'hidden' },
  photoThumb: { width: 96, height: 84 },
  photoDeleteBtn: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  emptyPhotoBox: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, padding: 22, alignItems: 'center', gap: 6, marginTop: 4 },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  summaryKey: { fontSize: 12, fontWeight: '600' },
  summaryVal: { fontSize: 13, fontWeight: '700', maxWidth: '62%', textAlign: 'right' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalContent: { borderRadius: 16, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  modalItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F020' },
  modalItemText: { fontSize: 14, fontWeight: '500' },
  radioDot: { width: 8, height: 8, borderRadius: 4 },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, gap: 12 },
  bottomBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  bottomBtnText: { fontSize: 15, fontWeight: '700' },
});
