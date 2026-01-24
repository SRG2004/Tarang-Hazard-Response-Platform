import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue with Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LocationPickerMapProps {
  onLocationSelect: (lat: number, lng: number, address?: string) => void;
  initialLat?: number;
  initialLng?: number;
  height?: string;
}

export function LocationPickerMap({ 
  onLocationSelect, 
  initialLat = 20.5937, 
  initialLng = 78.9629,
  height = '400px'
}: LocationPickerMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map only once
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([initialLat, initialLng], 5);

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);

      // Add click event to map
      mapRef.current.on('click', async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        
        // Remove existing marker if any
        if (markerRef.current) {
          mapRef.current?.removeLayer(markerRef.current);
        }

        // Create custom icon for selected location
        const customIcon = L.divIcon({
          className: 'custom-location-marker',
          html: `
            <div style="
              background-color: #0077B6;
              width: 32px;
              height: 32px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 3px solid white;
              box-shadow: 0 3px 10px rgba(0,0,0,0.4);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="
                width: 10px;
                height: 10px;
                background: white;
                border-radius: 50%;
                transform: rotate(45deg);
              "></div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });

        // Add new marker at clicked location
        markerRef.current = L.marker([lat, lng], { icon: customIcon }).addTo(mapRef.current!);

        // Try to get address from coordinates (reverse geocoding)
        let address = '';
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await response.json();
          address = data.display_name || '';
        } catch (error) {
          console.error('Error fetching address:', error);
        }

        // Update popup
        markerRef.current.bindPopup(`
          <div style="min-width: 200px;">
            <strong>Selected Location</strong><br/>
            <small>Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}</small>
            ${address ? `<br/><small>${address}</small>` : ''}
          </div>
        `).openPopup();

        setSelectedLocation({ lat, lng });
        onLocationSelect(lat, lng, address);
      });
    }

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Handle initial location if provided later, or clear marker if undefined
  useEffect(() => {
    if (!mapRef.current) return;

    // Check if coordinates are explicitly provided (not using defaults)
    const hasExplicitCoordinates = initialLat !== undefined && initialLng !== undefined && 
                                    !isNaN(initialLat) && !isNaN(initialLng) &&
                                    isFinite(initialLat) && isFinite(initialLng);

    if (hasExplicitCoordinates) {
      // Only show marker if coordinates are different from default center
      // This prevents showing a marker when switching tabs and coordinates are cleared
      const isDefaultCenter = Math.abs(initialLat - 20.5937) < 0.0001 && 
                             Math.abs(initialLng - 78.9629) < 0.0001;
      
      if (!isDefaultCenter) {
        mapRef.current.setView([initialLat, initialLng], 13);
        
        // Remove existing marker
        if (markerRef.current) {
          mapRef.current.removeLayer(markerRef.current);
          markerRef.current = null;
        }

        // Add marker at initial location
        const customIcon = L.divIcon({
          className: 'custom-location-marker',
          html: `
            <div style="
              background-color: #0077B6;
              width: 32px;
              height: 32px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 3px solid white;
              box-shadow: 0 3px 10px rgba(0,0,0,0.4);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="
                width: 10px;
                height: 10px;
                background: white;
                border-radius: 50%;
                transform: rotate(45deg);
              "></div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });

        markerRef.current = L.marker([initialLat, initialLng], { icon: customIcon }).addTo(mapRef.current);
        markerRef.current.bindPopup(`
          <div style="min-width: 200px;">
            <strong>Your Location</strong><br/>
            <small>Lat: ${initialLat.toFixed(6)}, Lng: ${initialLng.toFixed(6)}</small>
          </div>
        `);
        setSelectedLocation({ lat: initialLat, lng: initialLng });
      }
    } else {
      // Clear marker if coordinates are undefined or invalid
      if (markerRef.current) {
        mapRef.current.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      setSelectedLocation(null);
      // Reset map view to default (India center) only if not already there
      if (mapRef.current) {
        const currentCenter = mapRef.current.getCenter();
        const isAtDefault = Math.abs(currentCenter.lat - 20.5937) < 0.1 && 
                           Math.abs(currentCenter.lng - 78.9629) < 0.1;
        if (!isAtDefault) {
          mapRef.current.setView([20.5937, 78.9629], 5);
        }
      }
    }
  }, [initialLat, initialLng]);

  return (
    <div>
      <div 
        ref={mapContainerRef} 
        style={{ 
          height, 
          width: '100%',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '2px solid #e5e7eb',
          cursor: 'crosshair',
        }} 
      />
      <div className="mt-2 text-sm text-gray-600 text-center">
        {selectedLocation ? (
          <span className="text-green-600">
            ✓ Location selected: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
          </span>
        ) : (
          <span>
            📍 Click anywhere on the map to select location
          </span>
        )}
      </div>
    </div>
  );
}
