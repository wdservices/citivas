import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  ActivityIndicator, Modal, KeyboardAvoidingView, Platform, Alert, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Store, ShoppingBag, Home, Calendar, ChevronRight, X, Loader2, Plus, Trash2, Camera } from '../lib/icons';
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
  COMMERCIAL_USAGES, type PropertySubType,
} from '../lib/nigerianStates';

type ListingType = 'business' | 'product' | 'property' | 'event';

const TYPE_OPTIONS = [
  { type: 'business' as const, icon: Store, title: 'Register Business', desc: 'Register your shop, brand, or service agency' },
  { type: 'product' as const, icon: ShoppingBag, title: 'Post a Product/Service', desc: 'Sell a physical item, deal, package, or service' },
  { type: 'property' as const, icon: Home, title: 'List a Property', desc: 'List a shortlet, apartment, land, or house' },
  { type: 'event' as const, icon: Calendar, title: 'Create an Event', desc: 'Publish a concert, festival, or meetup' },
];

export default function CreateListingScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const editType = route.params?.editType as ListingType | undefined;
  const editData = route.params?.editData as Record<string, any> | undefined;
  const isEdit = !!editType && !!editData;

  const [step, setStep] = useState<1 | 2>(editType ? 2 : 1);
  const [listingType, setListingType] = useState<ListingType>(editType || 'business');
  const [submitting, setSubmitting] = useState(false);

  // Business form
  const [bizName, setBizName] = useState('');
  const [bizCategory, setBizCategory] = useState('');
  const [selectedState, setSelectedState] = useState<NigerianState | ''>('');
  const [selectedCity, setSelectedCity] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');

  // Product form
  const [parentBusinessId, setParentBusinessId] = useState('');
  const [myBusinesses, setMyBusinesses] = useState<{ id: string; name: string }[]>([]);
  const [productTitle, setProductTitle] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [promoPrice, setPromoPrice] = useState('');

  // Property form
  const [propParentBusinessId, setPropParentBusinessId] = useState('');
  const [propertyTitle, setPropertyTitle] = useState('');
  const [propertySubType, setPropertySubType] = useState<PropertySubType | ''>('');
  const [propertyType, setPropertyType] = useState('');
  const [propertyPrice, setPropertyPrice] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  // Rent fields
  const [rentBillingPeriod, setRentBillingPeriod] = useState('');
  const [rentBedrooms, setRentBedrooms] = useState(1);
  const [rentBathrooms, setRentBathrooms] = useState(1);
  const [rentFurnishing, setRentFurnishing] = useState('');
  // Shortlet fields
  const [shortletMaxGuests, setShortletMaxGuests] = useState(2);
  const [shortletBedrooms, setShortletBedrooms] = useState(1);
  const [shortletBathrooms, setShortletBathrooms] = useState(1);
  // Hotel fields
  const [hotelStarRating, setHotelStarRating] = useState('');
  const [hotelRoomTypes, setHotelRoomTypes] = useState<{ name: string; pricePerNight: number; maxOccupancy: number }[]>([]);
  // Land fields
  const [landPlotSize, setLandPlotSize] = useState('');
  const [landSizeUnit, setLandSizeUnit] = useState('plots');
  const [landTitleType, setLandTitleType] = useState('');
  // Commercial fields
  const [commercialSpaceSize, setCommercialSpaceSize] = useState('');
  const [commercialBillingPeriod, setCommercialBillingPeriod] = useState('');
  const [commercialUsages, setCommercialUsages] = useState<string[]>([]);

  // Event form
  const [eventTitle, setEventTitle] = useState('');
  const [eventCategory, setEventCategory] = useState('');
  const [eventVenue, setEventVenue] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [eventState, setEventState] = useState<NigerianState | ''>('');
  const [eventCity, setEventCity] = useState('');
  const [eventTicketTypes, setEventTicketTypes] = useState<{ name: string; price: string; quantity: string }[]>([
    { name: 'Regular', price: '0', quantity: '100' },
  ]);

  // Dropdowns
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showEventTypeDropdown, setShowEventTypeDropdown] = useState(false);
  const [showProductCategoryDropdown, setShowProductCategoryDropdown] = useState(false);
  const [showPropertyTypeDropdown, setShowPropertyTypeDropdown] = useState(false);
  const [showPropertySubTypeDropdown, setShowPropertySubTypeDropdown] = useState(false);
  const [showParentBizDropdown, setShowParentBizDropdown] = useState(false);
  const [showEventStateDropdown, setShowEventStateDropdown] = useState(false);
  const [showEventCityDropdown, setShowEventCityDropdown] = useState(false);

  const loadMyBusinesses = useCallback(async () => {
    if (!user?.id) return;
    try {
      const q = query(collection(db, 'businesses'), where('ownerId', '==', user.id));
      const snap = await getDocs(q);
      setMyBusinesses(snap.docs.map((d) => ({ id: d.id, name: d.data().name || 'Unnamed Business' })));
    } catch {}
  }, [user?.id]);

  useFocusEffect(useCallback(() => { loadMyBusinesses(); }, [loadMyBusinesses]));

  useEffect(() => {
    if (isEdit && editData) {
      if (editType === 'business') {
        setBizName(editData.name || '');
        setBizCategory(editData.category || '');
        setSelectedState(editData.state || '');
        setSelectedCity(editData.city || '');
        setStreetAddress(editData.location || '');
        setPhone(editData.phone || '');
        setDescription(editData.description || '');
      } else if (editType === 'product') {
        setParentBusinessId(editData.businessId || '');
        setProductTitle(editData.name || editData.title || '');
        setProductCategory(editData.category || '');
        setProductPrice(String(editData.price || ''));
        setPromoPrice(String(editData.promoPrice || ''));
        setDescription(editData.description || '');
      } else if (editType === 'event') {
        setEventTitle(editData.name || editData.title || '');
        setEventCategory(editData.category || '');
        setEventVenue(editData.venue || '');
        setEventDescription(editData.description || '');
        setEventStartDate(editData.startDate || '');
        setEventEndDate(editData.endDate || '');
        setEventStartTime(editData.startTime || '');
        setEventEndTime(editData.endTime || '');
        setEventState(editData.state || '');
        setEventCity(editData.city || '');
        if (Array.isArray(editData.ticketTypes) && editData.ticketTypes.length > 0) {
          setEventTicketTypes(editData.ticketTypes.map((t: any) => ({
            name: t.name || 'Regular',
            price: String(t.price || '0'),
            quantity: String(t.quantity || '100'),
          })));
        }
      }
    }
  }, [isEdit, editData, editType]);

  const resetWizard = () => {
    setStep(1);
    setListingType('business');
    setBizName(''); setBizCategory(''); setSelectedState(''); setSelectedCity('');
    setStreetAddress(''); setPhone(''); setDescription('');
    setParentBusinessId(''); setProductTitle(''); setProductCategory('');
    setProductPrice(''); setPromoPrice('');
    setPropParentBusinessId(''); setPropertyTitle(''); setPropertySubType(''); setPropertyType(''); setPropertyPrice('');
    setSelectedAmenities([]); setRentBillingPeriod(''); setRentBedrooms(1); setRentBathrooms(1); setRentFurnishing('');
    setShortletMaxGuests(2); setShortletBedrooms(1); setShortletBathrooms(1);
    setHotelStarRating(''); setHotelRoomTypes([]);
    setLandPlotSize(''); setLandSizeUnit('plots'); setLandTitleType('');
    setCommercialSpaceSize(''); setCommercialBillingPeriod(''); setCommercialUsages([]);
    setEventTitle(''); setEventCategory(''); setEventVenue(''); setEventDescription(''); setEventStartDate(''); setEventEndDate('');
    setEventStartTime(''); setEventEndTime(''); setEventState(''); setEventCity('');
    setEventTicketTypes([{ name: 'Regular', price: '0', quantity: '100' }]);
  };

  const canSubmit = () => {
    if (listingType === 'business') return bizName.trim() && bizCategory && selectedState && phone.trim() && description.trim();
    if (listingType === 'product') return parentBusinessId && productTitle.trim() && productPrice.trim() && description.trim();
    if (listingType === 'property') return propParentBusinessId && propertyTitle.trim() && propertySubType && propertyPrice.trim() && description.trim();
    if (listingType === 'event') return eventTitle.trim() && eventDescription.trim() && eventStartDate && eventEndDate && eventState;
    return false;
  };

  const handleSubmit = async () => {
    if (!canSubmit() || !user?.id) return;
    setSubmitting(true);
    try {
      if (listingType === 'business') {
        const payload = {
          name: bizName.trim(),
          category: bizCategory,
          state: selectedState,
          city: selectedCity,
          location: streetAddress.trim(),
          phone: phone.trim(),
          description: description.trim(),
          ownerId: user.id,
          status: 'Active',
          updatedAt: serverTimestamp(),
        };
        if (isEdit && editData?.id) {
          await updateDoc(doc(db, 'businesses', editData.id), payload);
        } else {
          await addDoc(collection(db, 'businesses'), { ...payload, createdAt: serverTimestamp() });
        }
      } else if (listingType === 'product') {
        const biz = myBusinesses.find((b) => b.id === parentBusinessId);
        const payload = {
          name: productTitle.trim(),
          category: productCategory || 'Other',
          price: Number(productPrice.replace(/,/g, '')),
          promoPrice: promoPrice ? Number(promoPrice.replace(/,/g, '')) : null,
          description: description.trim(),
          businessId: parentBusinessId,
          businessName: biz?.name || '',
          ownerId: user.id,
          status: 'Active',
          updatedAt: serverTimestamp(),
        };
        if (isEdit && editData?.id) {
          await updateDoc(doc(db, 'marketplace', editData.id), payload);
        } else {
          await addDoc(collection(db, 'marketplace'), { ...payload, createdAt: serverTimestamp() });
        }
      } else if (listingType === 'property') {
        const biz = myBusinesses.find((b) => b.id === propParentBusinessId);
        const details: Record<string, any> = {};
        if (propertySubType === 'rent') {
          details.billingPeriod = rentBillingPeriod;
          details.bedrooms = rentBedrooms;
          details.bathrooms = rentBathrooms;
          details.furnishing = rentFurnishing;
        } else if (propertySubType === 'shortlet') {
          details.pricePerNight = Number(propertyPrice.replace(/,/g, ''));
          details.maxGuests = shortletMaxGuests;
          details.bedrooms = shortletBedrooms;
          details.bathrooms = shortletBathrooms;
          details.amenities = selectedAmenities;
        } else if (propertySubType === 'hotel') {
          details.starRating = hotelStarRating ? Number(hotelStarRating) : 0;
          details.roomTypes = hotelRoomTypes;
          details.amenities = selectedAmenities;
        } else if (propertySubType === 'land') {
          details.plotSize = landPlotSize;
          details.sizeUnit = landSizeUnit;
          details.titleType = landTitleType;
        } else if (propertySubType === 'commercial') {
          details.spaceSize = commercialSpaceSize;
          details.billingPeriod = commercialBillingPeriod;
          details.usages = commercialUsages;
        }
        const priceNum = Number(propertyPrice.replace(/,/g, ''));
        const payload = {
          title: propertyTitle.trim(),
          name: propertyTitle.trim(),
          propertySubType,
          type: propertySubType === 'rent' ? 'Apartment' : propertySubType === 'shortlet' ? 'Shortlet' : propertySubType === 'hotel' ? 'Hotel' : propertySubType === 'land' ? 'Land' : 'Commercial',
          ...details,
          price: priceNum,
          priceNum,
          description: description.trim(),
          businessId: propParentBusinessId,
          businessName: biz?.name || '',
          ownerId: user.id,
          status: 'Active',
          amenities: selectedAmenities,
          bedrooms: details.bedrooms || 0,
          bathrooms: details.bathrooms || 0,
          guests: details.maxGuests || 0,
          updatedAt: serverTimestamp(),
        };
        if (isEdit && editData?.id) {
          await updateDoc(doc(db, 'house_listings', editData.id), payload);
        } else {
          await addDoc(collection(db, 'house_listings'), { ...payload, createdAt: serverTimestamp() });
        }
      } else if (listingType === 'event') {
        const payload = {
          name: eventTitle.trim(),
          category: eventCategory || 'Other',
          venue: eventVenue.trim(),
          description: eventDescription.trim(),
          startDate: eventStartDate,
          endDate: eventEndDate,
          startTime: eventStartTime,
          endTime: eventEndTime,
          state: eventState,
          city: eventCity,
          ticketTypes: eventTicketTypes
            .filter((t) => t.name.trim())
            .map((t) => ({
              name: t.name.trim(),
              price: Number(t.price) || 0,
              quantity: Number(t.quantity) || 100,
            })),
          ownerId: user.id,
          status: 'Active',
          updatedAt: serverTimestamp(),
        };
        if (isEdit && editData?.id) {
          await updateDoc(doc(db, 'events', editData.id), payload);
        } else {
          await addDoc(collection(db, 'events'), { ...payload, createdAt: serverTimestamp() });
        }
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save listing');
    } finally {
      setSubmitting(false);
    }
  };

  const cities = selectedState ? STATE_CITIES[selectedState as NigerianState] || [] : [];
  const eventCities = eventState ? STATE_CITIES[eventState as NigerianState] || [] : [];

  const renderLabel = (text: string, required = false) => (
    <Text style={[s.label, { color: colors.mutedForeground }]}>
      {text} {required ? <Text style={{ color: colors.destructive }}>*</Text> : null}
    </Text>
  );

  const renderInput = (
    value: string, onChangeText: (v: string) => void, placeholder: string,
    opts?: { multiline?: boolean; keyboardType?: any; numberOfLines?: number },
  ) => (
    <TextInput
      style={[s.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card },
        opts?.multiline && { height: (opts.numberOfLines || 3) * 20 + 24, textAlignVertical: 'top' }]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.mutedForeground}
      multiline={opts?.multiline}
      numberOfLines={opts?.numberOfLines}
      keyboardType={opts?.keyboardType}
    />
  );

  const renderDropdown = (
    label: string, value: string, options: string[], onSelect: (v: string) => void,
    visible: boolean, setVisible: (v: boolean) => void,
  ) => (
    <View>
      {renderLabel(label, true)}
      <TouchableOpacity
        style={[s.input, { borderColor: colors.border, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={{ color: value ? colors.foreground : colors.mutedForeground, fontSize: 14 }}>
          {value || `Select ${label.replace(' *', '')}`}
        </Text>
        <ChevronRight size={16} color={colors.mutedForeground} style={{ transform: [{ rotate: '90deg' }] }} />
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={[s.modalContent, { backgroundColor: colors.card, maxHeight: '60%' }]}>
            <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[s.modalTitle, { color: colors.foreground }]}>Select {label.replace(' *', '')}</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[s.modalItem, value === opt && { backgroundColor: colors.primary + '15' }]}
                  onPress={() => { onSelect(opt); setVisible(false); }}
                >
                  <Text style={[s.modalItemText, { color: value === opt ? colors.primary : colors.foreground }]}>
                    {opt}
                  </Text>
                  {value === opt && <View style={[s.radioDot, { backgroundColor: colors.primary }]} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );

  const renderTypeSelection = () => (
    <View style={s.scrollContent}>
      <Text style={[s.wizardTitle, { color: colors.foreground }]}>What are you listing today?</Text>
      <Text style={[s.wizardDesc, { color: colors.mutedForeground }]}>Choose a listing type to get started</Text>
      <View style={s.typeList}>
        {TYPE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.type}
            style={[s.typeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => { setListingType(opt.type); setStep(2); }}
            activeOpacity={0.7}
          >
            <View style={[s.typeIcon, { backgroundColor: colors.primary + '15' }]}>
              <opt.icon size={24} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={s.typeText}>
              <Text style={[s.typeTitle, { color: colors.foreground }]}>{opt.title}</Text>
              <Text style={[s.typeDesc, { color: colors.mutedForeground }]}>{opt.desc}</Text>
            </View>
            <ChevronRight size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderBusinessForm = () => (
    <View style={s.formSection}>
      {renderLabel('Business Name', true)}
      {renderInput(bizName, setBizName, 'e.g. Glokakes Bakehouse')}
      {renderDropdown('Category *', bizCategory, [...BUSINESS_CATEGORIES], setBizCategory, showCategoryDropdown, setShowCategoryDropdown)}
      {renderDropdown('State *', selectedState, [...NIGERIAN_STATES], (v) => { setSelectedState(v as NigerianState); setSelectedCity(''); }, showStateDropdown, setShowStateDropdown)}
      {selectedState ? renderDropdown('City / Area', selectedCity, cities, setSelectedCity, showCityDropdown, setShowCityDropdown) : null}
      {renderLabel('Street Address')}
      {renderInput(streetAddress, setStreetAddress, 'e.g. 15 Bode Thomas, Surulere')}
      {renderLabel('Phone Number', true)}
      {renderInput(phone, setPhone, '+234 801 234 5678', { keyboardType: 'phone-pad' })}
      {renderLabel('About / Description', true)}
      {renderInput(description, setDescription, 'Tell people about your business...', { multiline: true, numberOfLines: 4 })}
    </View>
  );

  const renderProductForm = () => (
    <View style={s.formSection}>
      {myBusinesses.length === 0 ? (
        <View style={[s.emptyBiz, { borderColor: colors.border, backgroundColor: colors.muted }]}>
          <Store size={36} color={colors.mutedForeground} strokeWidth={1.5} />
          <Text style={[s.emptyBizTitle, { color: colors.foreground }]}>No business registered</Text>
          <Text style={[s.emptyBizDesc, { color: colors.mutedForeground }]}>Create a business listing first before posting products.</Text>
          <TouchableOpacity
            style={[s.emptyBizBtn, { borderColor: colors.primary }]}
            onPress={() => { setListingType('business'); }}
          >
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Register Business First</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {renderDropdown('Parent Business *', myBusinesses.find((b) => b.id === parentBusinessId)?.name || '', myBusinesses.map((b) => b.name), (v) => {
            const biz = myBusinesses.find((b) => b.name === v);
            setParentBusinessId(biz?.id || '');
          }, showParentBizDropdown, setShowParentBizDropdown)}
          {renderLabel('Product / Service Title', true)}
          {renderInput(productTitle, setProductTitle, 'e.g. Brand New iPhone 15 Pro')}
          {renderDropdown('Category', productCategory, [...PRODUCT_CATEGORIES], setProductCategory, showProductCategoryDropdown, setShowProductCategoryDropdown)}
          <View style={s.row}>
            <View style={s.halfField}>
              {renderLabel('Regular Price (₦)', true)}
              {renderInput(productPrice, setProductPrice, 'e.g. 150000', { keyboardType: 'numeric' })}
            </View>
            <View style={s.halfField}>
              {renderLabel('Promo Price (₦)')}
              {renderInput(promoPrice, setPromoPrice, 'e.g. 120000', { keyboardType: 'numeric' })}
            </View>
          </View>
          {promoPrice && productPrice ? (
            <Text style={[s.discountPreview, { color: colors.mutedForeground }]}>
              UI will show: <Text style={{ textDecorationLine: 'line-through', color: colors.destructive }}>₦{productPrice}</Text>{' '}
              <Text style={{ fontWeight: '700', color: colors.primary }}>₦{promoPrice}</Text>
            </Text>
          ) : null}
          {renderLabel('Description', true)}
          {renderInput(description, setDescription, 'Describe your product...', { multiline: true, numberOfLines: 4 })}
        </>
      )}
    </View>
  );

  const renderPropertyForm = () => (
    <View style={s.formSection}>
      {myBusinesses.length === 0 ? (
        <View style={[s.emptyBiz, { borderColor: colors.border, backgroundColor: colors.muted }]}>
          <Home size={36} color={colors.mutedForeground} strokeWidth={1.5} />
          <Text style={[s.emptyBizTitle, { color: colors.foreground }]}>No business registered</Text>
          <Text style={[s.emptyBizDesc, { color: colors.mutedForeground }]}>Create a business listing first before adding properties.</Text>
          <TouchableOpacity
            style={[s.emptyBizBtn, { borderColor: colors.primary }]}
            onPress={() => { setListingType('business'); }}
          >
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Register Business First</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {renderDropdown('Parent Business *', myBusinesses.find((b) => b.id === propParentBusinessId)?.name || '', myBusinesses.map((b) => b.name), (v) => {
            const biz = myBusinesses.find((b) => b.name === v);
            setPropParentBusinessId(biz?.id || '');
          }, showParentBizDropdown, setShowParentBizDropdown)}

          {/* Sub-type selector */}
          {!propertySubType ? (
            <View style={{ gap: 8, marginTop: 8 }}>
              <Text style={[s.label, { color: colors.mutedForeground }]}>What type of property? *</Text>
              {PROPERTY_SUB_TYPES.map((st) => (
                <TouchableOpacity
                  key={st.value}
                  style={[s.typeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setPropertySubType(st.value)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 24 }}>{st.icon}</Text>
                  <View style={s.typeText}>
                    <Text style={[s.typeTitle, { color: colors.foreground }]}>{st.label}</Text>
                    <Text style={[s.typeDesc, { color: colors.mutedForeground }]}>{st.desc}</Text>
                  </View>
                  <ChevronRight size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <>
              {/* Current sub-type badge */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <View style={[s.badge, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[s.badgeText, { color: colors.primary }]}>
                    {PROPERTY_SUB_TYPES.find((s) => s.value === propertySubType)?.icon}{' '}
                    {PROPERTY_SUB_TYPES.find((s) => s.value === propertySubType)?.label}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setPropertySubType('')}>
                  <Text style={{ color: colors.primary, fontSize: 12 }}>Change</Text>
                </TouchableOpacity>
              </View>

              {/* Common fields */}
              {renderLabel('Property Title', true)}
              {renderInput(propertyTitle, setPropertyTitle, 'e.g. Modern 2-Bedroom in GRA')}
              {renderLabel('Description', true)}
              {renderInput(description, setDescription, 'Describe your property...', { multiline: true, numberOfLines: 4 })}

              {/* RENT */}
              {propertySubType === 'rent' && (
                <View style={[s.typeFields, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                  <Text style={[s.typeFieldsTitle, { color: colors.foreground }]}>Rental Details</Text>
                  <View style={s.row}>
                    <View style={s.halfField}>
                      {renderLabel('Rent Amount (₦)', true)}
                      {renderInput(propertyPrice, setPropertyPrice, 'e.g. 500000', { keyboardType: 'numeric' })}
                    </View>
                    <View style={s.halfField}>
                      {renderDropdown('Billing Period *', rentBillingPeriod, [...RENT_BILLING_PERIODS], setRentBillingPeriod, showPropertyTypeDropdown, setShowPropertyTypeDropdown)}
                    </View>
                  </View>
                  <View style={s.row}>
                    <View style={s.halfField}>
                      {renderLabel('Bedrooms')}
                      <View style={s.stepperRow}>
                        <TouchableOpacity style={[s.stepperBtn, { borderColor: colors.border }]} onPress={() => setRentBedrooms(Math.max(0, rentBedrooms - 1))}>
                          <Text style={{ fontWeight: '700' }}>-</Text>
                        </TouchableOpacity>
                        <Text style={s.stepperValue}>{rentBedrooms}</Text>
                        <TouchableOpacity style={[s.stepperBtn, { borderColor: colors.border }]} onPress={() => setRentBedrooms(rentBedrooms + 1)}>
                          <Text style={{ fontWeight: '700' }}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={s.halfField}>
                      {renderLabel('Bathrooms')}
                      <View style={s.stepperRow}>
                        <TouchableOpacity style={[s.stepperBtn, { borderColor: colors.border }]} onPress={() => setRentBathrooms(Math.max(0, rentBathrooms - 1))}>
                          <Text style={{ fontWeight: '700' }}>-</Text>
                        </TouchableOpacity>
                        <Text style={s.stepperValue}>{rentBathrooms}</Text>
                        <TouchableOpacity style={[s.stepperBtn, { borderColor: colors.border }]} onPress={() => setRentBathrooms(rentBathrooms + 1)}>
                          <Text style={{ fontWeight: '700' }}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  {renderDropdown('Furnishing', rentFurnishing, [...FURNISHING_OPTIONS], setRentFurnishing, showPropertyTypeDropdown, setShowPropertyTypeDropdown)}
                </View>
              )}

              {/* SHORTLET */}
              {propertySubType === 'shortlet' && (
                <View style={[s.typeFields, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                  <Text style={[s.typeFieldsTitle, { color: colors.foreground }]}>Short-let Details</Text>
                  {renderLabel('Price per Night (₦)', true)}
                  {renderInput(propertyPrice, setPropertyPrice, 'e.g. 25000', { keyboardType: 'numeric' })}
                  <View style={s.row}>
                    <View style={s.halfField}>
                      {renderLabel('Max Guests')}
                      {renderInput(String(shortletMaxGuests), (v) => setShortletMaxGuests(Number(v) || 1), '2', { keyboardType: 'numeric' })}
                    </View>
                    <View style={s.halfField}>
                      {renderLabel('Bedrooms')}
                      <View style={s.stepperRow}>
                        <TouchableOpacity style={[s.stepperBtn, { borderColor: colors.border }]} onPress={() => setShortletBedrooms(Math.max(0, shortletBedrooms - 1))}>
                          <Text style={{ fontWeight: '700' }}>-</Text>
                        </TouchableOpacity>
                        <Text style={s.stepperValue}>{shortletBedrooms}</Text>
                        <TouchableOpacity style={[s.stepperBtn, { borderColor: colors.border }]} onPress={() => setShortletBedrooms(shortletBedrooms + 1)}>
                          <Text style={{ fontWeight: '700' }}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  {renderLabel('Amenities')}
                  <View style={s.amenitiesGrid}>
                    {PROPERTY_AMENITIES.map((a) => (
                      <TouchableOpacity
                        key={a.id}
                        style={[s.amenityChip, {
                          borderColor: selectedAmenities.includes(a.id) ? colors.primary : colors.border,
                          backgroundColor: selectedAmenities.includes(a.id) ? colors.primary + '15' : 'transparent',
                        }]}
                        onPress={() => setSelectedAmenities((prev) => prev.includes(a.id) ? prev.filter((x) => x !== a.id) : [...prev, a.id])}
                      >
                        <Text style={{ fontSize: 12 }}>{a.icon}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '500', color: selectedAmenities.includes(a.id) ? colors.primary : colors.foreground }}>{a.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* HOTEL */}
              {propertySubType === 'hotel' && (
                <View style={[s.typeFields, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                  <Text style={[s.typeFieldsTitle, { color: colors.foreground }]}>Hotel / Serviced Apartment</Text>
                  {renderDropdown('Star Rating', hotelStarRating, ['1', '2', '3', '4', '5'].map((s) => `${s} Star${s !== '1' ? 's' : ''}`), (v) => setHotelStarRating(v.charAt(0)), showPropertyTypeDropdown, setShowPropertyTypeDropdown)}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    {renderLabel('Room Types')}
                    <TouchableOpacity onPress={() => setHotelRoomTypes([...hotelRoomTypes, { name: '', pricePerNight: 0, maxOccupancy: 2 }])}>
                      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>+ Add Room</Text>
                    </TouchableOpacity>
                  </View>
                  {hotelRoomTypes.map((rt, idx) => (
                    <View key={idx} style={[s.roomTypeCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TextInput
                          style={[s.input, { flex: 1, borderColor: colors.border, color: colors.foreground, backgroundColor: colors.muted }]}
                          placeholder="Room name"
                          placeholderTextColor={colors.mutedForeground}
                          value={rt.name}
                          onChangeText={(v) => { const u = [...hotelRoomTypes]; u[idx].name = v; setHotelRoomTypes(u); }}
                        />
                        <TouchableOpacity onPress={() => setHotelRoomTypes(hotelRoomTypes.filter((_, i) => i !== idx))}>
                          <Text style={{ color: colors.destructive, fontSize: 12, padding: 8 }}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={s.row}>
                        <View style={s.halfField}>
                          <Text style={[s.miniLabel, { color: colors.mutedForeground }]}>Price/Night (₦)</Text>
                          <TextInput
                            style={[s.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.muted }]}
                            placeholder="35000"
                            placeholderTextColor={colors.mutedForeground}
                            keyboardType="numeric"
                            value={rt.pricePerNight ? String(rt.pricePerNight) : ''}
                            onChangeText={(v) => { const u = [...hotelRoomTypes]; u[idx].pricePerNight = Number(v) || 0; setHotelRoomTypes(u); }}
                          />
                        </View>
                        <View style={s.halfField}>
                          <Text style={[s.miniLabel, { color: colors.mutedForeground }]}>Max Occupancy</Text>
                          <TextInput
                            style={[s.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.muted }]}
                            placeholder="2"
                            placeholderTextColor={colors.mutedForeground}
                            keyboardType="numeric"
                            value={rt.maxOccupancy ? String(rt.maxOccupancy) : ''}
                            onChangeText={(v) => { const u = [...hotelRoomTypes]; u[idx].maxOccupancy = Number(v) || 1; setHotelRoomTypes(u); }}
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                  {renderLabel('Property Amenities')}
                  <View style={s.amenitiesGrid}>
                    {PROPERTY_AMENITIES.map((a) => (
                      <TouchableOpacity
                        key={a.id}
                        style={[s.amenityChip, {
                          borderColor: selectedAmenities.includes(a.id) ? colors.primary : colors.border,
                          backgroundColor: selectedAmenities.includes(a.id) ? colors.primary + '15' : 'transparent',
                        }]}
                        onPress={() => setSelectedAmenities((prev) => prev.includes(a.id) ? prev.filter((x) => x !== a.id) : [...prev, a.id])}
                      >
                        <Text style={{ fontSize: 12 }}>{a.icon}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '500', color: selectedAmenities.includes(a.id) ? colors.primary : colors.foreground }}>{a.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* LAND */}
              {propertySubType === 'land' && (
                <View style={[s.typeFields, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                  <Text style={[s.typeFieldsTitle, { color: colors.foreground }]}>Land Details</Text>
                  {renderLabel('Price (₦)', true)}
                  {renderInput(propertyPrice, setPropertyPrice, 'e.g. 25000000', { keyboardType: 'numeric' })}
                  <View style={s.row}>
                    <View style={s.halfField}>
                      {renderLabel('Plot Size', true)}
                      {renderInput(landPlotSize, setLandPlotSize, 'e.g. 500', { keyboardType: 'numeric' })}
                    </View>
                    <View style={s.halfField}>
                      {renderDropdown('Unit *', landSizeUnit, [...LAND_SIZE_UNITS], setLandSizeUnit, showPropertyTypeDropdown, setShowPropertyTypeDropdown)}
                    </View>
                  </View>
                  {renderDropdown('Title Document Type', landTitleType, [...LAND_TITLE_TYPES], setLandTitleType, showPropertyTypeDropdown, setShowPropertyTypeDropdown)}
                </View>
              )}

              {/* COMMERCIAL */}
              {propertySubType === 'commercial' && (
                <View style={[s.typeFields, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                  <Text style={[s.typeFieldsTitle, { color: colors.foreground }]}>Commercial Details</Text>
                  <View style={s.row}>
                    <View style={s.halfField}>
                      {renderLabel('Rent Amount (₦)', true)}
                      {renderInput(propertyPrice, setPropertyPrice, 'e.g. 2000000', { keyboardType: 'numeric' })}
                    </View>
                    <View style={s.halfField}>
                      {renderDropdown('Billing Period *', commercialBillingPeriod, [...RENT_BILLING_PERIODS], setCommercialBillingPeriod, showPropertyTypeDropdown, setShowPropertyTypeDropdown)}
                    </View>
                  </View>
                  {renderLabel('Space Size (sqm)')}
                  {renderInput(commercialSpaceSize, setCommercialSpaceSize, 'e.g. 200', { keyboardType: 'numeric' })}
                  {renderLabel('Suitable For')}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {COMMERCIAL_USAGES.map((u) => (
                      <TouchableOpacity
                        key={u}
                        style={[s.amenityChip, {
                          borderColor: commercialUsages.includes(u) ? colors.primary : colors.border,
                          backgroundColor: commercialUsages.includes(u) ? colors.primary + '15' : 'transparent',
                        }]}
                        onPress={() => setCommercialUsages((prev) => prev.includes(u) ? prev.filter((x) => x !== u) : [...prev, u])}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '500', color: commercialUsages.includes(u) ? colors.primary : colors.foreground }}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </>
      )}
    </View>
  );

  const renderEventForm = () => (
    <View style={s.formSection}>
      {renderLabel('Event Title', true)}
      {renderInput(eventTitle, setEventTitle, 'e.g. Lagos Food & Wine Festival')}
      {renderDropdown('Category', eventCategory, [...EVENT_CATEGORIES], setEventCategory, showEventTypeDropdown, setShowEventTypeDropdown)}
      {renderLabel('Venue Name')}
      {renderInput(eventVenue, setEventVenue, 'e.g. Eko Atlantic')}
      {renderLabel('Description', true)}
      {renderInput(eventDescription, setEventDescription, 'Describe your event...', { multiline: true, numberOfLines: 4 })}
      <View style={s.row}>
        <View style={s.halfField}>
          {renderLabel('Start Date', true)}
          {renderInput(eventStartDate, setEventStartDate, 'YYYY-MM-DD')}
        </View>
        <View style={s.halfField}>
          {renderLabel('End Date', true)}
          {renderInput(eventEndDate, setEventEndDate, 'YYYY-MM-DD')}
        </View>
      </View>
      <View style={s.row}>
        <View style={s.halfField}>
          {renderLabel('Start Time')}
          {renderInput(eventStartTime, setEventStartTime, 'HH:MM')}
        </View>
        <View style={s.halfField}>
          {renderLabel('End Time')}
          {renderInput(eventEndTime, setEventEndTime, 'HH:MM')}
        </View>
      </View>
      {renderDropdown('State *', eventState, [...NIGERIAN_STATES], (v) => { setEventState(v as NigerianState); setEventCity(''); }, showEventStateDropdown, setShowEventStateDropdown)}
      {eventState ? renderDropdown('City / Area', eventCity, eventCities, setEventCity, showEventCityDropdown, setShowEventCityDropdown) : null}

      {/* Ticket Settings */}
      <View style={[s.typeFields, { borderColor: colors.border, backgroundColor: colors.muted }]}>
        <Text style={[s.typeFieldsTitle, { color: colors.foreground }]}>Ticket Settings</Text>
        <View style={s.ticketHeader}>
          <Text style={[s.ticketHeaderCell, { color: colors.mutedForeground, flex: 2 }]}>Tier Name</Text>
          <Text style={[s.ticketHeaderCell, { color: colors.mutedForeground, flex: 1 }]}>Price (₦)</Text>
          <Text style={[s.ticketHeaderCell, { color: colors.mutedForeground, flex: 1 }]}>Capacity</Text>
          <Text style={[s.ticketHeaderCell, { color: colors.mutedForeground }]} />
        </View>
        {eventTicketTypes.map((ticket, i) => (
          <View key={i} style={s.ticketRow}>
            <View style={s.ticketCell}>
              <TextInput
                style={[s.ticketInput, { flex: 1, color: colors.foreground, backgroundColor: colors.card }]}
                value={ticket.name}
                onChangeText={(v) => {
                  const copy = [...eventTicketTypes];
                  copy[i] = { ...copy[i], name: v };
                  setEventTicketTypes(copy);
                }}
                placeholder="e.g. Regular"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <View style={s.ticketCell}>
              <TextInput
                style={[s.ticketInput, { flex: 1, color: colors.foreground, backgroundColor: colors.card }]}
                value={ticket.price}
                onChangeText={(v) => {
                  const copy = [...eventTicketTypes];
                  copy[i] = { ...copy[i], price: v };
                  setEventTicketTypes(copy);
                }}
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
              />
            </View>
            <View style={s.ticketCell}>
              <TextInput
                style={[s.ticketInput, { flex: 1, color: colors.foreground, backgroundColor: colors.card }]}
                value={ticket.quantity}
                onChangeText={(v) => {
                  const copy = [...eventTicketTypes];
                  copy[i] = { ...copy[i], quantity: v };
                  setEventTicketTypes(copy);
                }}
                placeholder="100"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
              />
            </View>
            {eventTicketTypes.length > 1 && (
              <TouchableOpacity
                style={[s.ticketRemoveBtn]}
                onPress={() => {
                  setEventTicketTypes(eventTicketTypes.filter((_, j) => j !== i));
                }}
              >
                <Trash2 size={18} color={colors.destructive} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
        ))}
        <TouchableOpacity
          style={[s.addTicketBtn, { borderColor: colors.primary, backgroundColor: 'transparent' }]}
          onPress={() => setEventTicketTypes([...eventTicketTypes, { name: '', price: '0', quantity: '100' }])}
        >
          <Plus size={16} color={colors.primary} strokeWidth={2} />
          <Text style={[s.addTicketText, { color: colors.primary }]}>Add Another Ticket Tier</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: insets.top + 6, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={colors.foreground} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.foreground }]}>
          {isEdit ? 'Edit Listing' : step === 1 ? 'Create Listing' : listingType === 'business' ? 'Register Business' : listingType === 'product' ? 'Post Product' : listingType === 'property' ? 'List Property' : 'Create Event'}
        </Text>
        <View style={{ width: 30 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
          {step === 1 && !isEdit ? renderTypeSelection() : null}
          {step === 2 || isEdit ? (
            <>
              {listingType === 'business' && renderBusinessForm()}
              {listingType === 'product' && renderProductForm()}
              {listingType === 'property' && renderPropertyForm()}
              {listingType === 'event' && renderEventForm()}
            </>
          ) : null}
          <View style={{ height: insets.bottom + 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {(step === 2 || isEdit) && (
        <View style={[s.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
          {step === 2 && !isEdit ? (
            <TouchableOpacity
              style={[s.bottomBtn, { backgroundColor: colors.muted }]}
              onPress={() => setStep(1)}
            >
              <Text style={[s.bottomBtnText, { color: colors.foreground }]}>Back</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[s.bottomBtn, { backgroundColor: colors.primary, opacity: canSubmit() && !submitting ? 1 : 0.5, flex: 1 }]}
            onPress={handleSubmit}
            disabled={!canSubmit() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[s.bottomBtnText, { color: '#fff' }]}>{isEdit ? 'Save Changes' : 'Create Listing'}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', letterSpacing: -0.3, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },

  wizardTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3, marginBottom: 4 },
  wizardDesc: { fontSize: 14, marginBottom: 20 },
  typeList: { gap: 12 },
  typeCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, gap: 14 },
  typeIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  typeText: { flex: 1 },
  typeTitle: { fontSize: 15, fontWeight: '700' },
  typeDesc: { fontSize: 12, marginTop: 2 },

  formSection: { gap: 12 },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  miniLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginTop: 6 },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },

  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  typeFields: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  typeFieldsTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  stepperBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { fontSize: 15, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  roomTypeCard: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },

  discountPreview: { fontSize: 12, marginTop: -4 },

  emptyBiz: { borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', padding: 32, alignItems: 'center', gap: 8 },
  emptyBizTitle: { fontSize: 15, fontWeight: '700' },
  emptyBizDesc: { fontSize: 13, textAlign: 'center' },
  emptyBizBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, marginTop: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalContent: { borderRadius: 16, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  modalItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F020' },
  modalItemText: { fontSize: 14, fontWeight: '500' },
  radioDot: { width: 8, height: 8, borderRadius: 4 },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, gap: 12 },
  bottomBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  bottomBtnText: { fontSize: 15, fontWeight: '700' },

  ticketHeader: { flexDirection: 'row', gap: 8, marginBottom: 6, paddingHorizontal: 2 },
  ticketHeaderCell: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  ticketRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8, paddingHorizontal: 2 },
  ticketCell: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, fontSize: 13 },
  ticketInput: { fontSize: 13 },
  ticketRemoveBtn: { padding: 6 },
  addTicketBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8, alignSelf: 'flex-start' },
  addTicketText: { fontSize: 13, fontWeight: '600' },
});
