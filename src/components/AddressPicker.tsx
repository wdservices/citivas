import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Popup, useMap } from 'react-leaflet';
import { geocodeAddress, reverseGeocode, REGION_COORDINATES } from '@/lib/geocode';
import { Check, LocateFixed, Search, Loader2 } from 'lucide-react';
import { useRegion } from '@/contexts/RegionContext';

interface AddressPickerProps {
  onLocationConfirmed?: (data: { address: string; lat: number; lon: number }) => void;
  initialLat?: number;
  initialLon?: number;
  initialAddress?: string;
  readOnly?: boolean;
}

const DEFAULT_FALLBACK_CENTER: [number, number] = [4.8156, 7.0498]; // Port Harcourt default

function MapRecenter({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, map.getZoom() || 15, { animate: true });
  }, [position, map]);
  return null;
}

function DraggableMarker({
  position,
  onDrag,
  address,
}: {
  position: [number, number];
  onDrag: (lat: number, lon: number) => void;
  address?: string;
}) {
  useMapEvents({
    click(e) {
      onDrag(e.latlng.lat, e.latlng.lng);
    },
  });
  return (
    <Marker
      position={position}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const pos = marker.getLatLng();
          onDrag(pos.lat, pos.lng);
        },
      }}
    >
      <Popup>{address || 'Selected Location (Drag to adjust)'}</Popup>
    </Marker>
  );
}

export function AddressPicker({
  onLocationConfirmed,
  initialLat,
  initialLon,
  initialAddress,
  readOnly,
}: AddressPickerProps) {
  const { userCoords, userAddress, region, locationName, state, detectRegion } = useRegion();

  // Resolve best initial position
  const resolvedInitialPos: [number, number] = (() => {
    if (initialLat && initialLon) return [initialLat, initialLon];
    if (userCoords?.lat && userCoords?.lon) return [userCoords.lat, userCoords.lon];
    if (region && REGION_COORDINATES[region]) return REGION_COORDINATES[region];
    return DEFAULT_FALLBACK_CENTER;
  })();

  const [address, setAddress] = useState(initialAddress || userAddress || (locationName ? `${locationName}, ${state}` : ''));
  const [position, setPosition] = useState<[number, number]>(resolvedInitialPos);
  const [loading, setLoading] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const initializedRef = useRef(false);

  // Auto-sync initial position and address from region / user location if not explicitly provided
  useEffect(() => {
    if (initialLat && initialLon) {
      setPosition([initialLat, initialLon]);
      if (initialAddress) {
        setAddress(initialAddress);
      }
      return;
    }

    if (userCoords?.lat && userCoords?.lon && !initializedRef.current) {
      setPosition([userCoords.lat, userCoords.lon]);
      const initialText = initialAddress || userAddress || `${locationName}, ${state}`;
      setAddress(initialText);
      onLocationConfirmed?.({
        address: initialText,
        lat: userCoords.lat,
        lon: userCoords.lon,
      });
      initializedRef.current = true;
    } else if (!initializedRef.current && region && REGION_COORDINATES[region]) {
      const regionPos = REGION_COORDINATES[region];
      setPosition(regionPos);
      const fallbackText = initialAddress || `${locationName}, ${state}`;
      setAddress(fallbackText);
      onLocationConfirmed?.({
        address: fallbackText,
        lat: regionPos[0],
        lon: regionPos[1],
      });
      initializedRef.current = true;
    }
  }, [userCoords, userAddress, region, locationName, state, initialLat, initialLon, initialAddress, onLocationConfirmed]);

  const handleGeocode = async () => {
    if (!address.trim()) return;
    setLoading(true);
    setError(null);
    const result = await geocodeAddress(address);
    setLoading(false);

    if (!result) {
      setError("Couldn't find that address — try adding more detail, or drop the pin manually on the map below.");
      return;
    }

    const newPos: [number, number] = [result.lat, result.lon];
    setPosition(newPos);
    setConfirmed(true);
    onLocationConfirmed?.({ address, lat: result.lat, lon: result.lon });
  };

  const handleManualMove = async (lat: number, lon: number) => {
    setPosition([lat, lon]);
    setConfirmed(true);

    // Automatically reverse geocode to give the user the updated readable address
    try {
      const rev = await reverseGeocode(lat, lon);
      const updatedAddress = rev || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
      setAddress(updatedAddress);
      onLocationConfirmed?.({ address: updatedAddress, lat, lon });
    } catch {
      onLocationConfirmed?.({ address, lat, lon });
    }
  };

  const handleUseCurrentLocation = async () => {
    setLocatingGps(true);
    setError(null);
    try {
      const result = await detectRegion();
      if (result) {
        const newPos: [number, number] = [result.lat, result.lon];
        setPosition(newPos);
        const rev = await reverseGeocode(result.lat, result.lon);
        const bestAddress = rev || userAddress || `${locationName}, ${state}`;
        setAddress(bestAddress);
        setConfirmed(true);
        onLocationConfirmed?.({ address: bestAddress, lat: result.lat, lon: result.lon });
      } else {
        setError('Could not retrieve current GPS location. Please check browser permissions or search manually.');
      }
    } catch (e) {
      console.warn('GPS Locate error:', e);
      setError('Location request failed. Please check browser permissions.');
    } finally {
      setLocatingGps(false);
    }
  };

  const handleConfirm = () => {
    setConfirmed(true);
    onLocationConfirmed?.({ address, lat: position[0], lon: position[1] });
  };

  if (readOnly) {
    return (
      <div className="rounded-xl overflow-hidden border border-border" style={{ height: 250 }}>
        <MapContainer center={position} zoom={15} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          <MapRecenter position={position} />
          <Marker position={position}>
            <Popup>{address || initialAddress || 'Location'}</Popup>
          </Marker>
        </MapContainer>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onBlur={handleGeocode}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleGeocode();
              }
            }}
            placeholder="e.g. 14 Marina Road, Lagos Island, Lagos"
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleGeocode}
            disabled={loading || !address.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>{loading ? 'Searching...' : 'Find'}</span>
          </button>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={locatingGps}
            title="Use current GPS device location"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50 transition-colors shrink-0"
          >
            {locatingGps ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <LocateFixed className="w-4 h-4 text-primary" />}
            <span className="hidden sm:inline">My Location</span>
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-destructive font-medium">{error}</p>}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>📍 Drag or click the pin on the map to pinpoint the exact entrance/spot.</span>
      </div>

      <div className="rounded-2xl overflow-hidden border border-border shadow-sm" style={{ height: 280, position: 'relative', zIndex: 0 }}>
        <MapContainer center={position} zoom={15} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          <MapRecenter position={position} />
          <DraggableMarker position={position} onDrag={handleManualMove} address={address} />
        </MapContainer>
      </div>

      {confirmed ? (
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full rounded-xl bg-success text-white py-2.5 text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm"
        >
          <Check className="w-4 h-4" /> Location Confirmed ({position[0].toFixed(4)}, {position[1].toFixed(4)})
        </button>
      ) : (
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-bold hover:opacity-90 transition-opacity shadow-sm"
        >
          Confirm This Location
        </button>
      )}
    </div>
  );
}

