
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix for default icon issue with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Report {
  id: string;
  title?: string;
  hazardType?: string;
  location?: string;
  locationName?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  latitude?: number;
  longitude?: number;
  status?: string;
}

interface InteractiveMapProps {
  reports: Report[];
  height?: string;
}

export function InteractiveMap({ reports, height = '100%' }: InteractiveMapProps) {
  return (
    <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height, width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {reports
        .filter(report => {
          // Don't show solved reports on the map
          if (report.status === 'solved') return false;

          const lat = report.latitude;
          const lng = report.longitude;
          return (
            typeof lat === 'number' && typeof lng === 'number' &&
            !isNaN(lat) && !isNaN(lng) &&
            isFinite(lat) && isFinite(lng) &&
            lat >= -90 && lat <= 90 &&
            lng >= -180 && lng <= 180
          );
        })
        .map(report => (
          <Marker key={report.id} position={[report.latitude!, report.longitude!]}>
            <Popup>
              <div>
                <h3>{report.title || report.hazardType || 'Hazard Report'}</h3>
                <p>
                  {report.locationName ||
                    (typeof report.location === 'string' ? report.location :
                      (report.location && typeof report.location === 'object' && 'address' in report.location) ? (report.location as any).address :
                        'Unknown location')}
                </p>
                <p>Severity: {report.severity || 'Not specified'}</p>
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}