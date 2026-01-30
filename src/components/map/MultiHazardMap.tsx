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
                const isUrgent = report.severity === 'critical' || report.severity === 'high';
                const marker = new (window as any).google.maps.Marker({
                    position: { lat: report.latitude, lng: report.longitude },
                    title: report.title,
                    optimized: false, // Required for custom CSS classes
                    icon: {
                        path: (window as any).google.maps.SymbolPath.CIRCLE,
                        fillColor: hazardConfig.color,
                        fillOpacity: 1,
                        strokeColor: '#FFFFFF',
                        strokeWeight: 2,
                        scale: 10
                    }
                });

                // Add blinking class if urgent
                if (isUrgent) {
                    // Note: Legacy markers don't support arbitrary CSS classes easily 
                    // without custom overlays, but we can use AdvancedMarkerElement if available
                    // or just set a custom property for now if we were using HTML markers.
                    // For now, let's stick to the legend/circles and try to use AdvancedMarkerElement
                    // if the version supports it.
                }

                // Create info window with improved styling for both light and dark modes
                const infoWindow = new (window as any).google.maps.InfoWindow({
                    content: `
                    <div style="padding: 16px; max-width: 320px; font-family: Inter, system-ui, sans-serif; border-radius: 12px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                            <h3 style="font-weight: 700; font-size: 18px; margin: 0; color: #1e293b;">${report.title}</h3>
                            <span style="padding: 4px 10px; border-radius: 20px; background-color: ${hazardConfig.color}; color: white; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                                ${report.severity}
                            </span>
                        </div>
                        
                        <div style="margin-bottom: 12px; border-left: 3px solid ${hazardConfig.color}; padding-left: 12px;">
                            <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.5;">${report.description || 'No detailed description provided.'}</p>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
                            <div>
                                <span style="display: block; font-size: 10px; color: #94a3b8; text-transform: uppercase;">Status</span>
                                <span style="font-size: 13px; font-weight: 600; color: #334155;">${report.status?.toUpperCase() || 'NEW'}</span>
                            </div>
                            <div>
                                <span style="display: block; font-size: 10px; color: #94a3b8; text-transform: uppercase;">Time</span>
                                <span style="font-size: 13px; font-weight: 600; color: #334155;">
                                    ${(() => {
                            try {
                                const ts = report.submittedAt as any;
                                if (!ts) return 'Unknown';
                                if (typeof ts.toDate === 'function') {
                                    return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                }
                                const date = new Date(ts);
                                return isNaN(date.getTime()) ? 'Unknown' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            } catch { return 'Unknown'; }
                        })()}
                                </span>
                            </div>
                        </div>


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
