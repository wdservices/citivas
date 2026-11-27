import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Dimensions,
  ActivityIndicator, Linking, FlatList, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft, Phone, Mail, MapPin, Camera, ChevronLeft, ChevronRight, Share,
} from '../lib/icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { usePropertyDetail, RoomCategory } from '../lib/usePropertyDetail';
import { DetailScreenSkeleton } from '../components/SkeletonLoader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PROPERTY_AMENITIES: Record<string, { icon: string; label: string }> = {
  wifi: { icon: '📶', label: 'WiFi' },
  pool: { icon: '🏊', label: 'Pool' },
  parking: { icon: '🅿️', label: 'Parking' },
  gym: { icon: '💪', label: 'Gym' },
  restaurant: { icon: '🍽️', label: 'Restaurant' },
  bar: { icon: '🍸', label: 'Bar' },
  laundry: { icon: '👕', label: 'Laundry' },
  ac: { icon: '❄️', label: 'Air Conditioning' },
  tv: { icon: '📺', label: 'TV' },
  kitchen: { icon: '🍳', label: 'Kitchen' },
  security: { icon: '🔒', label: 'Security' },
  generator: { icon: '⚡', label: 'Generator' },
  elevator: { icon: '🛗', label: 'Elevator' },
  spa: { icon: '🧖', label: 'Spa' },
  garden: { icon: '🌿', label: 'Garden' },
  balcony: { icon: '🌅', label: 'Balcony' },
  'hot-tub': { icon: '🛁', label: 'Hot Tub' },
  workspace: { icon: '💻', label: 'Workspace' },
  'pet-friendly': { icon: '🐾', label: 'Pet Friendly' },
  breakfast: { icon: '🥐', label: 'Breakfast' },
};

function formatTime(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

interface Props {
  route: { params: { propertyId: string } };
}

export default function PropertyDetailScreen({ route }: Props) {
  const { propertyId } = route.params;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { loading, property } = usePropertyDetail(propertyId);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const scrollRef = useRef<FlatList>(null);

  if (loading) {
    return (
      <View style={[s.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <DetailScreenSkeleton />
      </View>
    );
  }

  if (!property) {
    return (
      <View style={[s.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[s.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <ArrowLeft size={22} color={colors.foreground} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.foreground }]}>Property</Text>
        </View>
        <View style={s.emptyState}>
          <Text style={[s.emptyTitle, { color: colors.foreground }]}>Property not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[s.emptyLink, { color: colors.primary }]}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const allImages = property.images.length > 0 ? property.images : (property.image ? [property.image] : []);
  const rooms = property.rooms || [];
  const totalRooms = rooms.reduce((sum: number, r: RoomCategory) => sum + (r.quantity || 1), 0);
  const amenityObjects = property.amenities
    .map((id) => PROPERTY_AMENITIES[id])
    .filter(Boolean);

  const handleShare = () => {
    // Basic share via Linking
    const msg = `Check out ${property.title} on Citivas!`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(msg)}`).catch(() => {});
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 6, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={colors.foreground} strokeWidth={2} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[s.headerTitle, { color: colors.foreground }]} numberOfLines={1}>{property.title}</Text>
          {(property.city || property.state) && (
            <Text style={[s.headerSub, { color: colors.mutedForeground }]} numberOfLines={1}>
              {[property.city, property.state].filter(Boolean).join(', ')}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={handleShare} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Share size={20} color={colors.foreground} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Hero Image Carousel */}
        {allImages.length > 0 ? (
          <View style={s.heroWrap}>
            <FlatList
              ref={scrollRef}
              data={allImages}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setActiveImageIndex(idx);
              }}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={s.heroImage} resizeMode="contain" />
              )}
            />
            {allImages.length > 1 && (
              <View style={s.heroCounter}>
                <Text style={s.heroCounterText}>{activeImageIndex + 1} / {allImages.length}</Text>
              </View>
            )}
            {/* Nav arrows */}
            {activeImageIndex > 0 && (
              <TouchableOpacity
                style={[s.heroArrow, { left: 12 }]}
                onPress={() => {
                  const prev = Math.max(0, activeImageIndex - 1);
                  scrollRef.current?.scrollToOffset({ offset: prev * SCREEN_WIDTH, animated: true });
                }}
              >
                <ChevronLeft size={20} color="#fff" />
              </TouchableOpacity>
            )}
            {activeImageIndex < allImages.length - 1 && (
              <TouchableOpacity
                style={[s.heroArrow, { right: 12 }]}
                onPress={() => {
                  const next = Math.min(allImages.length - 1, activeImageIndex + 1);
                  scrollRef.current?.scrollToOffset({ offset: next * SCREEN_WIDTH, animated: true });
                }}
              >
                <ChevronRight size={20} color="#fff" />
              </TouchableOpacity>
            )}
            {/* Gradient overlay + title */}
            <View style={s.heroOverlay}>
              <View style={s.heroContent}>
                {(property.city || property.state) && (
                  <View style={s.heroLocationTag}>
                    <View style={s.heroLocationLine} />
                    <Text style={s.heroLocationText}>
                      {[property.city, property.state].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                )}
                <Text style={s.heroTitle}>{property.title}</Text>
                {property.description ? (
                  <Text style={s.heroDesc} numberOfLines={2}>{property.description}</Text>
                ) : null}
                {/* Stats row */}
                <View style={s.heroStats}>
                  {property.rating > 0 && (
                    <View style={s.heroStatItem}>
                      <Text style={s.heroStatValue}>{property.rating}★</Text>
                      <Text style={s.heroStatLabel}>Rating</Text>
                    </View>
                  )}
                  {rooms.length > 0 && (
                    <View style={s.heroStatItem}>
                      <Text style={s.heroStatValue}>{rooms.length}</Text>
                      <Text style={s.heroStatLabel}>{rooms.length === 1 ? 'Room Type' : 'Room Types'}</Text>
                    </View>
                  )}
                  {totalRooms > 0 && (
                    <View style={s.heroStatItem}>
                      <Text style={s.heroStatValue}>{totalRooms}</Text>
                      <Text style={s.heroStatLabel}>Total Units</Text>
                    </View>
                  )}
                  {property.city && (
                    <View style={s.heroStatItem}>
                      <Text style={s.heroStatValue}>{property.city}</Text>
                      <Text style={s.heroStatLabel}>{property.state || 'Nigeria'}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={[s.heroImage, { backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }]}>
            <Camera size={40} color={colors.mutedForeground} />
          </View>
        )}

        {/* About Section */}
        <View style={s.section}>
          <View style={s.sectionLabelRow}>
            <View style={[s.sectionAccentLine, { backgroundColor: colors.primary }]} />
            <Text style={[s.sectionLabel, { color: colors.primary }]}>About Us</Text>
          </View>
          <Text style={[s.aboutTitle, { color: colors.foreground }]}>
            Welcome to{'\n'}<Text style={{ color: colors.primary }}>{property.title}.</Text>
          </Text>
          <Text style={[s.aboutDesc, { color: colors.mutedForeground }]}>
            {property.description || 'Experience unparalleled luxury and privacy at this exclusive retreat. Our property offers bespoke service, breathtaking views, and exquisite accommodations.'}
          </Text>
          <View style={s.aboutMeta}>
            {property.checkin ? (
              <Text style={[s.aboutMetaText, { color: colors.mutedForeground }]}>
                <Text style={{ fontWeight: '700', color: colors.foreground }}>Check-in: </Text>
                {formatTime(property.checkin)}
              </Text>
            ) : null}
            {property.checkout ? (
              <Text style={[s.aboutMetaText, { color: colors.mutedForeground }]}>
                <Text style={{ fontWeight: '700', color: colors.foreground }}>Check-out: </Text>
                {formatTime(property.checkout)}
              </Text>
            ) : null}
          </View>
          {property.address ? (
            <View style={s.addressRow}>
              <MapPin size={14} color={colors.mutedForeground} strokeWidth={2} />
              <Text style={[s.addressText, { color: colors.mutedForeground }]} numberOfLines={2}>{property.address}</Text>
            </View>
          ) : null}
        </View>

        {/* Gallery Section */}
        {allImages.length > 1 && (
          <View style={s.section}>
            <View style={s.sectionLabelRow}>
              <Camera size={18} color={colors.primary} strokeWidth={2} />
              <Text style={[s.sectionTitle, { color: colors.foreground }]}>Gallery</Text>
              <Text style={[s.galleryCount, { color: colors.mutedForeground }]}>{allImages.length} photos</Text>
            </View>
            <View style={s.galleryGrid}>
              {allImages.slice(0, 9).map((img, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    s.galleryItem,
                    i === 0 && s.galleryItemLarge,
                    i === 0 && allImages.length > 1 && { marginBottom: 3 },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setLightboxIndex(i)}
                >
                  <Image source={{ uri: img }} style={s.galleryImage} resizeMode="cover" />
                  {i === 0 && allImages.length > 1 && (
                    <View style={s.galleryMoreBadge}>
                      <Text style={s.galleryMoreText}>+{allImages.length - 1} more</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Rooms Section */}
        {rooms.length > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.foreground }]}>Rooms</Text>
            <View style={s.roomsGrid}>
              {rooms.map((room: RoomCategory, idx: number) => (
                <TouchableOpacity
                  key={idx}
                  style={[s.roomCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => navigation.navigate('Booking', { propertyId: property.id, preselectedRoom: idx })}
                  activeOpacity={0.85}
                >
                  {room.images?.[0] ? (
                    <Image source={{ uri: room.images[0] }} style={s.roomImage} resizeMode="cover" />
                  ) : (
                    <View style={[s.roomImage, { backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }]}>
                      <Camera size={24} color={colors.mutedForeground} />
                    </View>
                  )}
                  <View style={s.roomContent}>
                    <Text style={[s.roomName, { color: colors.foreground }]} numberOfLines={1}>{room.name || `Room ${idx + 1}`}</Text>
                    <Text style={[s.roomPrice, { color: colors.primary }]}>
                      {room.pricePerNight > 0 ? `₦${room.pricePerNight.toLocaleString()}/night` : 'Price on request'}
                    </Text>
                    <View style={s.roomMeta}>
                      <Text style={[s.roomMetaText, { color: colors.mutedForeground }]}>Max {room.maxOccupancy}</Text>
                      <Text style={[s.roomMetaDot, { color: colors.mutedForeground }]}>·</Text>
                      <Text style={[s.roomMetaText, { color: colors.mutedForeground }]}>{room.bedType || 'Standard'}</Text>
                    </View>
                    <View style={[s.roomSelectBtn, { backgroundColor: colors.primary, marginTop: 8 }]}>
                      <Text style={s.roomSelectBtnText}>Select</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Amenities Section */}
        {amenityObjects.length > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.foreground, textAlign: 'center', marginBottom: 16 }]}>Amenities</Text>
            <View style={s.amenitiesGrid}>
              {amenityObjects.map((a, i) => (
                <View key={i} style={s.amenityItem}>
                  <View style={[s.amenityIcon, { borderColor: `${colors.primary}30` }]}>
                    <Text style={s.amenityEmoji}>{a!.icon}</Text>
                  </View>
                  <Text style={[s.amenityLabel, { color: colors.mutedForeground }]}>{a!.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Contact Section */}
        <View style={[s.section, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 24 }]}>
          <View style={s.contactGrid}>
            {property.address ? (
              <View style={s.contactItem}>
                <MapPin size={14} color={colors.primary} strokeWidth={2} />
                <Text style={[s.contactLabel, { color: colors.mutedForeground }]}>ADDRESS</Text>
                <Text style={[s.contactValue, { color: colors.foreground }]} numberOfLines={2}>{property.address}</Text>
              </View>
            ) : null}
            <View style={s.contactItem}>
              <Phone size={14} color={colors.primary} strokeWidth={2} />
              <Text style={[s.contactLabel, { color: colors.mutedForeground }]}>PHONE</Text>
              {property.phone ? (
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${property.phone}`)}>
                  <Text style={[s.contactValue, { color: colors.primary }]}>{property.phone}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={[s.contactValue, { color: colors.mutedForeground }]}>Not available</Text>
              )}
              {property.whatsapp ? (
                <TouchableOpacity onPress={() => Linking.openURL(`https://wa.me/${property.whatsapp.replace(/[^0-9]/g, '')}`)}>
                  <Text style={[s.contactValue, { color: colors.primary, marginTop: 4 }]}>WhatsApp</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <View style={s.contactItem}>
              <Mail size={14} color={colors.primary} strokeWidth={2} />
              <Text style={[s.contactLabel, { color: colors.mutedForeground }]}>EMAIL</Text>
              {property.contactEmail ? (
                <TouchableOpacity onPress={() => Linking.openURL(`mailto:${property.contactEmail}`)}>
                  <Text style={[s.contactValue, { color: colors.primary }]} numberOfLines={1}>{property.contactEmail}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={[s.contactValue, { color: colors.mutedForeground }]}>Not available</Text>
              )}
            </View>
            <View style={[s.contactItem, { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14 }]}>
              <Text style={[s.contactLabel, { color: colors.mutedForeground }]}>RESERVATIONS</Text>
              <Text style={[s.contactReservations, { color: colors.primary }]}>Open 24/7</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={[s.footer, { borderTopColor: colors.border }]}>
          <Text style={[s.footerTitle, { color: colors.primary }]}>{property.title}</Text>
          {property.address ? (
            <View style={s.footerAddress}>
              <MapPin size={10} color={colors.mutedForeground} />
              <Text style={[s.footerAddressText, { color: colors.mutedForeground }]} numberOfLines={1}>{property.address}</Text>
            </View>
          ) : null}
          <View style={s.footerLinks}>
            {property.phone ? (
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${property.phone}`)} style={s.footerLink}>
                <Phone size={12} color={colors.mutedForeground} />
                <Text style={[s.footerLinkText, { color: colors.mutedForeground }]}>{property.phone}</Text>
              </TouchableOpacity>
            ) : null}
            {property.contactEmail ? (
              <TouchableOpacity onPress={() => Linking.openURL(`mailto:${property.contactEmail}`)} style={s.footerLink}>
                <Mail size={12} color={colors.mutedForeground} />
                <Text style={[s.footerLinkText, { color: colors.mutedForeground }]} numberOfLines={1}>{property.contactEmail}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={[s.footerBottom, { borderTopColor: colors.border }]}>
            <Text style={[s.footerCopy, { color: colors.mutedForeground }]}>
              © {new Date().getFullYear()} {property.title}
            </Text>
            <Text style={[s.footerPowered, { color: colors.mutedForeground }]}>Powered by Citivas Hospitality</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Lightbox Modal */}
      <Modal visible={lightboxIndex !== null} transparent animationType="fade">
        <View style={s.lightbox}>
          <TouchableOpacity style={s.lightboxClose} onPress={() => setLightboxIndex(null)}>
            <Text style={s.lightboxCloseText}>✕</Text>
          </TouchableOpacity>
          {lightboxIndex !== null && (
            <>
              <Text style={s.lightboxCounter}>{lightboxIndex + 1} / {allImages.length}</Text>
              <Image source={{ uri: allImages[lightboxIndex] }} style={s.lightboxImage} resizeMode="contain" />
              {lightboxIndex > 0 && (
                <TouchableOpacity style={[s.lightboxArrow, { left: 12 }]} onPress={() => setLightboxIndex(lightboxIndex - 1)}>
                  <ChevronLeft size={28} color="#fff" />
                </TouchableOpacity>
              )}
              {lightboxIndex < allImages.length - 1 && (
                <TouchableOpacity style={[s.lightboxArrow, { right: 12 }]} onPress={() => setLightboxIndex(lightboxIndex + 1)}>
                  <ChevronRight size={28} color="#fff" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },
  scroll: { paddingBottom: 20 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyLink: { fontSize: 14, fontWeight: '600' },

  // Hero
  heroWrap: { height: 360, position: 'relative' },
  heroImage: { width: SCREEN_WIDTH, height: 360 },
  heroCounter: {
    position: 'absolute', top: 16, left: 16,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  heroCounterText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  heroArrow: {
    position: 'absolute', top: '45%',
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  heroOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 220, justifyContent: 'flex-end',
    paddingHorizontal: 20, paddingBottom: 20,
  },
  heroContent: {
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 16, padding: 16,
  },
  heroLocationTag: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  heroLocationLine: { width: 20, height: 2, backgroundColor: 'rgba(255,255,255,0.6)' },
  heroLocationText: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 6 },
  heroDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 18, marginBottom: 12 },
  heroStats: { flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 12 },
  heroStatItem: {},
  heroStatValue: { color: '#fff', fontSize: 16, fontWeight: '700' },
  heroStatLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },

  // Sections
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionAccentLine: { width: 20, height: 2 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  sectionTitle: { fontSize: 20, fontWeight: '800', marginBottom: 12 },

  // About
  aboutTitle: { fontSize: 22, fontWeight: '800', lineHeight: 30, marginBottom: 12 },
  aboutDesc: { fontSize: 14, lineHeight: 22, marginBottom: 12 },
  aboutMeta: { flexDirection: 'row', gap: 16, marginBottom: 10, flexWrap: 'wrap' },
  aboutMetaText: { fontSize: 13 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  addressText: { fontSize: 13, flex: 1 },

  // Gallery
  galleryCount: { fontSize: 12, marginLeft: 'auto' },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  galleryItem: { width: '48.5%', height: 120, borderRadius: 10, overflow: 'hidden' },
  galleryItemLarge: { width: '100%', height: 200 },
  galleryImage: { width: '100%', height: '100%' },
  galleryMoreBadge: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  galleryMoreText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Rooms
  roomsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  roomCard: {
    width: '48%', borderRadius: 14, overflow: 'hidden', borderWidth: 1,
  },
  roomImage: { width: '100%', height: 110 },
  roomContent: { padding: 10 },
  roomName: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  roomPrice: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  roomMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  roomMetaText: { fontSize: 10 },
  roomMetaDot: { fontSize: 10 },
  roomSelectBtn: { borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  roomSelectBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Amenities
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16 },
  amenityItem: { alignItems: 'center', width: 72, gap: 6 },
  amenityIcon: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  amenityEmoji: { fontSize: 22 },
  amenityLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },

  // Contact
  contactGrid: { gap: 14 },
  contactItem: { gap: 4 },
  contactLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  contactValue: { fontSize: 14 },
  contactReservations: { fontSize: 18, fontWeight: '700' },

  // Footer
  footer: { marginTop: 24, borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 20 },
  footerTitle: { fontSize: 16, fontWeight: '700' },
  footerAddress: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  footerAddressText: { fontSize: 12, flex: 1 },
  footerLinks: { flexDirection: 'row', gap: 16, marginTop: 12 },
  footerLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerLinkText: { fontSize: 12 },
  footerBottom: { borderTopWidth: 1, marginTop: 16, paddingTop: 14, alignItems: 'center', gap: 4 },
  footerCopy: { fontSize: 12 },
  footerPowered: { fontSize: 11 },

  // Lightbox
  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  lightboxClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  lightboxCloseText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  lightboxCounter: { position: 'absolute', top: 54, left: 20, zIndex: 10, color: '#fff', fontSize: 13, fontWeight: '600', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  lightboxImage: { width: SCREEN_WIDTH - 32, height: 400 },
  lightboxArrow: { position: 'absolute', top: '45%', width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
});
