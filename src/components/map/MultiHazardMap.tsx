import React, { useState, useEffect, useRef } from 'react';
import { HAZARDS } from '../../config/hazards';
import { HazardType, HazardReport } from '../../types';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface MultiHazardMapProps {
    center?: { lat: number; lng: number };
    zoom?: number;
    showAllHazards?: boolean;
    selectedSeverity?: string[];
    selectedTypes?: string[];
    activeLayers?: {
        hazards: boolean;
        resources: boolean;
        satellite: boolean;
    };
}

export const MultiHazardMap: React.FC<MultiHazardMapProps> = ({
    center = { lat: 20.5937, lng: 78.9629 }, // India Center
    zoom = 5,
    showAllHazards = true,
    selectedSeverity = ['all'],
    selectedTypes = ['all'],
    activeLayers = { hazards: true, resources: true, satellite: false }
}) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const googleMapRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const circlesRef = useRef<any[]>([]);
    const markerClustererRef = useRef<any>(null); // MarkerClusterer instance
    const [reports, setReports] = useState<HazardReport[]>([]);

    // Load Hazard Reports (VERIFIED ONLY)
    useEffect(() => {
        const fetchReports = async () => {
            try {
                const q = query(collection(db, 'reports'));
                const snapshot = await getDocs(q);
                const allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as HazardReport));

                // FILTER: Only show verified or solved reports on the map
                // This ensures auto-rejected (low confidence) and pending reports don't appear
                const verifiedData = allData.filter(report =>
                    report.status === 'verified' || report.status === 'solved'
                );

                setReports(verifiedData);
                console.log(`Loaded ${verifiedData.length} verified reports (filtered from ${allData.length} total)`);
            } catch (error) {
                console.error("Error loading map data:", error);
            }
        };

        fetchReports();
    }, []);

    // Initialize Google Map
    useEffect(() => {
        if (!mapRef.current || googleMapRef.current) return;

        // Wait for Google Maps to be ready
        const initMap = () => {
            if (typeof window.google?.maps?.Map !== 'function') {
                console.log('⏳ Google Maps not ready yet');
                return false;
            }

            console.log('🗺️ Initializing Google Map');



            const map = new window.google.maps.Map(mapRef.current!, {
                center,
                zoom,
                mapTypeControl: true,
                mapTypeControlOptions: {
                    style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
                    position: window.google.maps.ControlPosition.TOP_RIGHT,
                    mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain']
                },
                zoomControl: true,
                streetViewControl: false,
                fullscreenControl: true,
            });

            googleMapRef.current = map;
            console.log('✅ Google Map initialized');
            return true;
        };

        // Poll for Google Maps
        let attempts = 0;
        const maxAttempts = 50;
        const checkInterval = setInterval(() => {
            attempts++;
            if (initMap()) {
                clearInterval(checkInterval);
            } else if (attempts >= maxAttempts) {
                console.error('❌ Failed to initialize Google Map');
                clearInterval(checkInterval);
            }
        }, 100);

        return () => clearInterval(checkInterval);
    }, [center, zoom]);

    // Update markers when reports or active layers change
    useEffect(() => {
        if (!googleMapRef.current) return;

        // Clear existing markers, circles, and clusterer
        markersRef.current.forEach(marker => marker.setMap(null));
        circlesRef.current.forEach(circle => circle.setMap(null));
        if (markerClustererRef.current) {
            markerClustererRef.current.clearMarkers();
        }
        markersRef.current = [];
        circlesRef.current = [];

        const newMarkers: any[] = [];

        // Update Satellite View
        if (googleMapRef.current) {
            googleMapRef.current.setMapTypeId(activeLayers.satellite ? 'satellite' : 'roadmap');
        }

        // Add markers for active hazards
        if (activeLayers.hazards) {
            reports.forEach(report => {
                // Filter by Type
                if (!selectedTypes.includes('all') && !selectedTypes.includes(report.type)) return;

                // Filter by Severity
                if (!selectedSeverity.includes('all') && !selectedSeverity.includes(report.severity)) return;

                const hazardConfig = HAZARDS[report.type as HazardType];
                if (!hazardConfig) return;

                // Create standard legacy marker
                const marker = new (window as any).google.maps.Marker({
                    position: { lat: report.latitude, lng: report.longitude },
                    title: report.title,
                    icon: {
                        path: (window as any).google.maps.SymbolPath.CIRCLE,
                        fillColor: hazardConfig.color,
                        fillOpacity: 1,
                        strokeColor: '#FFFFFF',
                        strokeWeight: 2,
                        scale: 10
                    }
                });

                // Create info window
                const infoWindow = new (window as any).google.maps.InfoWindow({
                    content: `
                    <div style="padding: 12px; max-width: 300px;">
                        <h3 style="font-weight: bold; font-size: 16px; margin: 0 0 8px 0;">${report.title}</h3>
                        <span style="display: inline-block; padding: 4px 8px; border-radius: 12px; background-color: ${hazardConfig.color}; color: white; font-size: 11px; font-weight: bold; text-transform: uppercase; margin-bottom: 8px;">
                            ${report.severity}
                        </span>
                        <p style="margin: 8px 0; font-size: 14px; color: #666;">${report.description || 'No description'}</p>
                        <p style="margin: 4px 0; font-size: 12px; color: #999;">
                            Reported: ${(() => {
                            try {
                                const ts = report.submittedAt as any;
                                if (!ts) return 'Unknown';
                                // Handle Firestore Timestamp
                                if (typeof ts.toDate === 'function') {
                                    return ts.toDate().toLocaleDateString();
                                }
                                // Handle string or number timestamps
                                const date = new Date(ts);
                                return isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString();
                            } catch {
                                return 'Unknown';
                            }
                        })()}
                        </p>
                    </div>
                `
                });

                marker.addListener('click', () => {
                    infoWindow.open(googleMapRef.current!, marker);
                });

                newMarkers.push(marker);

                // Create risk radius circle
                const radius = report.severity === 'critical' ? 5000 : report.severity === 'high' ? 3000 : 1000;
                const circle = new (window as any).google.maps.Circle({
                    strokeColor: hazardConfig.color,
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: hazardConfig.color,
                    fillOpacity: 0.2,
                    map: googleMapRef.current!,
                    center: { lat: report.latitude, lng: report.longitude },
                    radius: radius
                });

                circlesRef.current.push(circle);
            });
        }

        markersRef.current = newMarkers;

        // Initialize MarkerClusterer if available
        const win = window as any;
        if (typeof win.markerClusterer !== 'undefined' && win.markerClusterer.MarkerClusterer) {
            markerClustererRef.current = new win.markerClusterer.MarkerClusterer({
                map: googleMapRef.current,
                markers: newMarkers
            });
        } else {
            // Fallback: add markers directly without clustering
            console.warn('MarkerClusterer not loaded, adding markers without clustering');
            newMarkers.forEach(marker => marker.setMap(googleMapRef.current!));
        }

        console.log(`📍 Added ${newMarkers.length} markers with clustering`);
    }, [reports, activeLayers, selectedSeverity, selectedTypes]);

    return (
        <div className="h-full w-full relative z-0">
            <div ref={mapRef} className="h-[calc(100vh-64px)] w-full" />

            {/* Legend */}
            <div className="absolute bottom-8 left-8 z-[1000] bg-white p-4 rounded-lg shadow-lg border border-gray-200 hidden md:block">
                <h4 className="font-bold text-gray-800 mb-2">Active Hazards</h4>
                <div className="space-y-2">
                    {Object.values(HAZARDS).map(hazard => (
                        <div key={hazard.id} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: hazard.color }}></div>
                            <span className="text-sm">{hazard.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
