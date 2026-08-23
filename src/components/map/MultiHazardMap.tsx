import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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

// Component to handle dynamic map updates
const MapUpdater: React.FC<{ center: { lat: number; lng: number }; zoom: number }> = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        map.setView([center.lat, center.lng], zoom);
    }, [center, zoom, map]);
    return null;
};

// Helper function to create custom DivIcon
const createCustomIcon = (color: string, isUrgent: boolean) => {
    return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div style="
            width: 16px; 
            height: 16px; 
            background-color: ${color}; 
            border-radius: 50%; 
            border: 2px solid white; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ${isUrgent ? `animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; box-shadow: 0 0 0 4px ${color}80;` : ''}
        "></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        popupAnchor: [0, -10]
    });
};

export const MultiHazardMap: React.FC<MultiHazardMapProps> = ({
    center = { lat: 20.5937, lng: 78.9629 }, // India Center
    zoom = 5,
    selectedSeverity = ['all'],
    selectedTypes = ['all'],
    activeLayers = { hazards: true, resources: true, satellite: false }
}) => {
    const [reports, setReports] = useState<HazardReport[]>([]);

    useEffect(() => {
        // Add pulse animation styles
        if (!document.getElementById('leaflet-pulse-style')) {
            const style = document.createElement('style');
            style.id = 'leaflet-pulse-style';
            style.innerHTML = `
                @keyframes pulse-ring {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(0, 0, 0, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 0, 0, 0); }
                }
            `;
            document.head.appendChild(style);
        }
    }, []);

    // Load Hazard Reports (VERIFIED ONLY)
    useEffect(() => {
        const fetchReports = async () => {
            try {
                const q = query(collection(db, 'reports'));
                const snapshot = await getDocs(q);
                const allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as HazardReport));

                // FILTER: Only show verified or solved reports on the map
                const verifiedData = allData.filter(report =>
                    report.status === 'verified' || report.status === 'solved'
                );

                setReports(verifiedData);
                console.log(`Loaded ${verifiedData.length} verified reports`);
            } catch (error) {
                console.error("Error loading map data:", error);
            }
        };

        fetchReports();
    }, []);

    // Filter reports based on props
    const filteredReports = reports.filter(report => {
        if (!activeLayers.hazards) return false;
        if (!selectedTypes.includes('all') && !selectedTypes.includes(report.type)) return false;
        if (!selectedSeverity.includes('all') && !selectedSeverity.includes(report.severity)) return false;
        return true;
    });

    const getBaseLayerUrl = () => {
        if (activeLayers.satellite) {
            return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        }
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    };

    return (
        <div className="relative w-full h-[calc(100vh-64px)] bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 z-0">
            <MapContainer
                center={[center.lat, center.lng]}
                zoom={zoom}
                style={{ width: '100%', height: '100%', zIndex: 0 }}
                zoomControl={true}
                scrollWheelZoom={true}
            >
                <MapUpdater center={center} zoom={zoom} />
                
                <TileLayer
                    url={getBaseLayerUrl()}
                    attribution={activeLayers.satellite 
                        ? 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    }
                />

                {filteredReports.map(report => {
                    const hazardConfig = HAZARDS[report.type as HazardType];
                    if (!hazardConfig) return null;

                    const isUrgent = report.severity === 'critical' || report.severity === 'high';
                    const icon = createCustomIcon(hazardConfig.color, isUrgent);

                    // Map specific radii based on severity
                    let radius = 1000; // default 1km
                    if (report.severity === 'critical') radius = 5000;
                    if (report.severity === 'high') radius = 3000;

                    return (
                        <React.Fragment key={report.id}>
                            <Marker
                                position={[report.latitude, report.longitude]}
                                icon={icon}
                            >
                                <Popup>
                                    <div className="p-1 max-w-[280px]">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-bold text-gray-900 m-0 leading-tight">
                                                {report.title || hazardConfig.label}
                                            </h3>
                                            <span className="inline-block px-2 py-1 rounded text-[10px] font-bold text-white uppercase" style={{ backgroundColor: hazardConfig.color }}>
                                                {report.severity}
                                            </span>
                                        </div>
                                        <div className="mb-2 pl-3 border-l-2" style={{ borderColor: hazardConfig.color }}>
                                            <p className="text-sm text-gray-700 m-0 line-clamp-3">
                                                {report.description || 'No detailed description provided.'}
                                            </p>
                                        </div>
                                        <div className="mt-2 text-xs text-gray-500 flex justify-between border-t pt-2">
                                            <span className="font-semibold text-gray-700">{report.status?.toUpperCase() || 'NEW'}</span>
                                            <span className="truncate max-w-[120px]">{report.location}</span>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                            
                            <Circle
                                center={[report.latitude, report.longitude]}
                                radius={radius}
                                pathOptions={{
                                    color: hazardConfig.color,
                                    fillColor: hazardConfig.color,
                                    fillOpacity: isUrgent ? 0.3 : 0.1,
                                    weight: 1
                                }}
                            />
                        </React.Fragment>
                    );
                })}
            </MapContainer>

            {/* Floating Legends */}
            <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-[400] pointer-events-none hidden md:flex">
                <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col gap-1 pointer-events-auto text-xs">
                    <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Severity Indicator</div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-500/50"></div>
                        <span className="text-slate-600 dark:text-slate-400">Critical (5km radius)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span className="text-slate-600 dark:text-slate-400">High (3km radius)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span className="text-slate-600 dark:text-slate-400">Medium (1km radius)</span>
                    </div>
                </div>
            </div>
            
            {/* Legend for active hazards */}
            <div className="absolute bottom-6 left-6 z-[400] bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-gray-200 hidden md:block">
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
