import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapViewProps {
  latitude: number;
  longitude: number;
  title: string;
  address: string;
  zoom?: number;
}

const MapView = ({ 
  latitude, 
  longitude, 
  title, 
  address,
  zoom = 15 
}: MapViewProps) => {
  return (
    <div className="w-full h-64 rounded-lg overflow-hidden border">
      <MapContainer
        center={[latitude, longitude]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <Marker position={[latitude, longitude]}>
          <Popup>
            <div className="text-center">
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{address}</p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default MapView;