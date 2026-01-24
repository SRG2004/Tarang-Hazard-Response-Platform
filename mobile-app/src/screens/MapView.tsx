import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function MapViewScreen() {
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const webViewRef = useRef<WebView>(null);

    useEffect(() => {
        (async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission denied', 'Defaulting to India view.');
                    setLocation({
                        coords: {
                            latitude: 20.5937,
                            longitude: 78.9629,
                            altitude: 0,
                            accuracy: 0,
                            altitudeAccuracy: 0,
                            heading: 0,
                            speed: 0
                        },
                        timestamp: Date.now()
                    });
                    return;
                }

                let location = await Location.getCurrentPositionAsync({});
                setLocation(location);
            } catch (error) {
                console.error("Error getting location:", error);
                setLocation({
                    coords: {
                        latitude: 20.5937,
                        longitude: 78.9629,
                        altitude: 0,
                        accuracy: 0,
                        altitudeAccuracy: 0,
                        heading: 0,
                        speed: 0
                    },
                    timestamp: Date.now()
                });
            }
        })();

        const q = query(collection(db, 'reports'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reportsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setReports(reportsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Update markers when reports change or WebView loads
    useEffect(() => {
        if (webViewRef.current && reports.length > 0) {
            const script = `
                if (window.updateMarkers) {
                    window.updateMarkers(${JSON.stringify(reports)});
                }
            `;
            webViewRef.current.injectJavaScript(script);
        }
    }, [reports]);

    if (loading || !location) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#0077B6" />
                <Text style={{ marginTop: 10 }}>Loading Map...</Text>
            </View>
        );
    }

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <style>
                body, html, #map { height: 100%; width: 100%; margin: 0; padding: 0; }
                .user-marker {
                    background-color: #4285F4;
                    width: 15px;
                    height: 15px;
                    border-radius: 50%;
                    border: 3px solid white;
                    box-shadow: 0 0 5px rgba(0,0,0,0.5);
                }
                
                /* Blinking Marker CSS */
                @keyframes pulse-ring {
                    0% { transform: translate(-50%, -50%) scale(0.33); opacity: 1; }
                    80%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
                }
                @keyframes pulse-dot {
                    0% { transform: translate(-50%, -50%) scale(0.8); }
                    50% { transform: translate(-50%, -50%) scale(1); }
                    100% { transform: translate(-50%, -50%) scale(0.8); }
                }
            </style>
        </head>
        <body>
            <div id="map"></div>
            <script>
                // Base Layers
                var streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '© OpenStreetMap'
                });

                var satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                    attribution: 'Tiles © Esri'
                });

                // Default to Street View and Zoom 5 (India View)
                var map = L.map('map', {
                    center: [20.5937, 78.9629], // Fixed center for India
                    zoom: 5, 
                    layers: [streetLayer] 
                });

                var baseMaps = {
                    "Street": streetLayer,
                    "Satellite": satelliteLayer
                };

                L.control.layers(baseMaps).addTo(map);

                // User Location Marker
                var userIcon = L.divIcon({
                    className: 'user-marker',
                    html: '<div style="background-color: #4285F4; width: 15px; height: 15px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                });
                L.marker([${location.coords.latitude}, ${location.coords.longitude}], {icon: userIcon}).addTo(map);

                var markersLayer = L.layerGroup().addTo(map);

                window.updateMarkers = function(reports) {
                    try {
                        markersLayer.clearLayers();
                        
                        reports.forEach(function(report) {
                            if (report.status === 'solved') return;

                            // Determine coordinates (support both root-level and nested)
                            var lat, lng;
                            if (typeof report.latitude === 'number' && typeof report.longitude === 'number') {
                                lat = report.latitude;
                                lng = report.longitude;
                            } else if (report.location && typeof report.location.latitude === 'number' && typeof report.location.longitude === 'number') {
                                lat = report.location.latitude;
                                lng = report.location.longitude;
                            }

                            if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
                                
                                // Color coding based on severity
                                var mainColor = '#3B82F6'; // blue
                                var lightColor = '#DBEAFE';
                                var darkColor = '#2563EB';

                                if (report.severity === 'critical') {
                                    mainColor = '#EF4444'; lightColor = '#FEE2E2'; darkColor = '#DC2626';
                                } else if (report.severity === 'high') {
                                    mainColor = '#F97316'; lightColor = '#FFEDD5'; darkColor = '#EA580C';
                                } else if (report.severity === 'medium') {
                                    mainColor = '#EAB308'; lightColor = '#FEF9C3'; darkColor = '#CA8A04';
                                }

                                // Create Blinking Marker HTML
                                // Create Blinking Marker HTML
                                var iconHtml = \`
                                    <div style="position: relative; width: 50px; height: 50px;">
                                        <!-- Pulse Ring -->
                                        <div style="
                                            position: absolute;
                                            top: 50%; left: 50%;
                                            width: 40px; height: 40px;
                                            border-radius: 50%;
                                            border: 2px solid \${mainColor};
                                            opacity: 0.6;
                                            animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
                                        "></div>
                                        <!-- Main Dot -->
                                        <div style="
                                            position: absolute;
                                            top: 50%; left: 50%;
                                            width: 16px; height: 16px;
                                            background-color: \${mainColor};
                                            border: 2px solid \${darkColor};
                                            border-radius: 50%;
                                            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                                            animation: pulse-dot 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
                                        "></div>
                                    </div>
                                \`;

                                var customIcon = L.divIcon({
                                    className: 'custom-div-icon',
                                    html: iconHtml,
                                    iconSize: [50, 50],
                                    iconAnchor: [25, 25],
                                    popupAnchor: [0, -10]
                                });

                                var locationName = report.locationName || (typeof report.location === 'string' ? report.location : report.location?.address) || 'Unknown location';
                                
                                var popupContent = "<b>" + (report.title || report.type || 'Hazard Report') + "</b><br>" +
                                                   locationName + "<br>" +
                                                   "Severity: <span style='color:" + mainColor + "'>" + (report.severity || 'Not specified').toUpperCase() + "</span>";

                                var marker = L.marker([lat, lng], { icon: customIcon })
                                    .bindPopup(popupContent);
                                    
                                markersLayer.addLayer(marker);
                            }
                        });
                    } catch (e) {
                         if (window.ReactNativeWebView) {
                            window.ReactNativeWebView.postMessage("Error: " + e.toString());
                        }
                    }
                }
                
                // Initial load
                window.updateMarkers(${JSON.stringify(reports)});
            </script>
        </body>
        </html>
    `;

    return (
        <View style={styles.container}>
            <WebView
                ref={webViewRef}
                originWhitelist={['*']}
                source={{ html: htmlContent }}
                style={styles.map}
                androidLayerType="hardware"
                onMessage={(event) => {
                    console.log("WebView Log:", event.nativeEvent.data);
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    map: {
        flex: 1,
    },
});
