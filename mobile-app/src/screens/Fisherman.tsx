import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { MapPin, FileText, AlertTriangle, Filter } from 'lucide-react-native';
import { getFishingZones, getCirculars } from '../services/apiService';

export default function Fisherman() {
    const [activeTab, setActiveTab] = useState('zones');
    const [zones, setZones] = useState<any[]>([]);
    const [filteredZones, setFilteredZones] = useState<any[]>([]);
    const [circulars, setCirculars] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [zoneFilter, setZoneFilter] = useState<'all' | 'parent' | 'sub'>('all');

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (zoneFilter === 'all') {
            setFilteredZones(zones);
        } else if (zoneFilter === 'parent') {
            const parentZones = zones.filter(zone => /^Zone [A-F]( \(.*\))?$/i.test(zone.name));
            setFilteredZones(parentZones);
        } else if (zoneFilter === 'sub') {
            const subZones = zones.filter(zone => /^Zone [A-F]\d+/i.test(zone.name));
            setFilteredZones(subZones);
        }
    }, [zoneFilter, zones]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [zonesRes, circularsRes] = await Promise.all([
                getFishingZones(),
                getCirculars()
            ]);

            if (zonesRes.success && zonesRes.zones) {
                setZones(zonesRes.zones);
                setFilteredZones(zonesRes.zones);
            }
            if (circularsRes.success && circularsRes.circulars) {
                setCirculars(circularsRes.circulars);
            }
        } catch (error) {
            console.error('Error fetching fisherman data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'safe': return '#10B981'; // green-500
            case 'caution': return '#F59E0B'; // yellow-500
            case 'dangerous': return '#EF4444'; // red-500
            default: return '#6B7280'; // gray-500
        }
    };

    const renderZoneItem = ({ item }: { item: any }) => (
        <View className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-3">
            <View className="flex-row justify-between items-center mb-2">
                <Text className="font-bold text-gray-900 text-lg">{item.name}</Text>
                <View className="px-2 py-1 rounded-full" style={{ backgroundColor: getStatusColor(item.status) + '20' }}>
                    <Text style={{ color: getStatusColor(item.status) }} className="text-xs font-bold capitalize">
                        {item.status}
                    </Text>
                </View>
            </View>
            <Text className="text-gray-600 mb-2">{item.details || 'No details available.'}</Text>
            <View className="flex-row items-center">
                <MapPin size={14} color="#6B7280" />
                <Text className="text-xs text-gray-500 ml-1">{item.coordinates?.length || 0} points</Text>
            </View>
        </View>
    );

    const renderCircularItem = ({ item }: { item: any }) => (
        <View className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-3">
            <View className="flex-row items-center mb-2">
                <FileText size={18} color="#3B82F6" />
                <Text className="font-bold text-gray-900 ml-2 flex-1">{item.title}</Text>
                <View className={`px-2 py-1 rounded-full ml-2 ${item.priority === 'high' ? 'bg-red-100' :
                    item.priority === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
                    }`}>
                    <Text className={`text-xs font-bold capitalize ${item.priority === 'high' ? 'text-red-700' :
                        item.priority === 'medium' ? 'text-yellow-700' : 'text-blue-700'
                        }`}>
                        {item.priority}
                    </Text>
                </View>
            </View>
            {item.category && (
                <View className="self-start px-2 py-1 rounded-full bg-gray-100 mb-2 border border-gray-200">
                    <Text className="text-xs text-gray-600 capitalize">{item.category}</Text>
                </View>
            )}
            <Text className="text-gray-800 mb-2">{item.content}</Text>
            <View className="flex-row justify-between">
                <Text className="text-xs text-gray-500">Issued: {new Date(item.issuedDate).toLocaleDateString()}</Text>
                {item.expiryDate && (
                    <Text className="text-xs text-gray-500">Expires: {new Date(item.expiryDate).toLocaleDateString()}</Text>
                )}
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-gray-50">
            {/* Tabs */}
            <View className="flex-row bg-white border-b border-gray-200">
                {['zones', 'circulars', 'map'].map(tab => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        className={`flex-1 py-3 items-center border-b-2 ${activeTab === tab ? 'border-[#0077B6]' : 'border-transparent'}`}
                    >
                        <Text className={`font-bold capitalize ${activeTab === tab ? 'text-[#0077B6]' : 'text-gray-500'}`}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#0077B6" />
                </View>
            ) : (
                <View className="flex-1 p-4">
                    {/* Filters - Visible for Zones and Map */}
                    {(activeTab === 'zones' || activeTab === 'map') && (
                        <View className="flex-row mb-4 bg-white p-1 rounded-lg border border-gray-200">
                            {['all', 'parent', 'sub'].map((filter) => (
                                <TouchableOpacity
                                    key={filter}
                                    onPress={() => setZoneFilter(filter as any)}
                                    className={`flex-1 py-2 items-center rounded-md ${zoneFilter === filter ? 'bg-blue-50' : 'bg-transparent'}`}
                                >
                                    <Text className={`text-xs font-medium capitalize ${zoneFilter === filter ? 'text-blue-700' : 'text-gray-600'}`}>
                                        {filter === 'all' ? 'All' : filter + ' Zones'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {activeTab === 'zones' && (
                        <FlatList
                            data={filteredZones}
                            renderItem={renderZoneItem}
                            keyExtractor={item => item.id}
                            ListEmptyComponent={<Text className="text-center text-gray-500 mt-10">No fishing zones found</Text>}
                        />
                    )}

                    {activeTab === 'circulars' && (
                        <FlatList
                            data={circulars}
                            renderItem={renderCircularItem}
                            keyExtractor={item => item.id}
                            ListEmptyComponent={<Text className="text-center text-gray-500 mt-10">No circulars found</Text>}
                        />
                    )}

                    {activeTab === 'map' && (
                        <View className="flex-1 rounded-xl overflow-hidden border border-gray-200">
                            <WebView
                                originWhitelist={['*']}
                                source={{
                                    html: `
                                    <!DOCTYPE html>
                                    <html>
                                    <head>
                                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                                        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                                        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                                        <style>
                                            body, html, #map { height: 100%; width: 100%; margin: 0; padding: 0; }
                                        </style>
                                    </head>
                                    <body>
                                        <div id="map"></div>
                                        <script>
                                            var streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                                maxZoom: 19,
                                                attribution: '© OpenStreetMap'
                                            });

                                            var satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                                                attribution: 'Tiles © Esri'
                                            });

                                            var map = L.map('map', {
                                                center: [20.5937, 78.9629],
                                                zoom: 5,
                                                layers: [streetLayer]
                                            });

                                            var baseMaps = {
                                                "Street": streetLayer,
                                                "Satellite": satelliteLayer
                                            };

                                            L.control.layers(baseMaps).addTo(map);

                                            var zones = ${JSON.stringify(filteredZones)};

                                            zones.forEach(function(zone) {
                                                if (!zone.coordinates || zone.coordinates.length === 0) return;

                                                var color = '#3b82f6';
                                                if (zone.status === 'safe') color = '#22c55e';
                                                else if (zone.status === 'caution') color = '#eab308';
                                                else if (zone.status === 'dangerous') color = '#ef4444';

                                                var latLngs = zone.coordinates.map(function(coord) {
                                                    var val1 = coord[0];
                                                    var val2 = coord[1];
                                                    
                                                    // Heuristic for India (Lat: 8-37, Lon: 68-97)
                                                    // If val1 is Longitude (> 60) and val2 is Latitude (< 40), swap to [Lat, Lon]
                                                    if (val1 > 60 && val2 < 40) {
                                                        return [val2, val1];
                                                    }
                                                    // If val1 is Latitude (< 40) and val2 is Longitude (> 60), keep as [Lat, Lon]
                                                    if (val1 < 40 && val2 > 60) {
                                                        return [val1, val2];
                                                    }
                                                    
                                                    // Fallback: assume [Lat, Lon]
                                                    return [val1, val2];
                                                });

                                                var polygon = L.polygon(latLngs, {
                                                    color: color,
                                                    fillColor: color,
                                                    fillOpacity: 0.3,
                                                    weight: 2
                                                }).addTo(map);

                                                var popupContent = "<b>" + zone.name + "</b><br>" +
                                                                   "Status: <span style='color:" + color + "'>" + zone.status.toUpperCase() + "</span><br>" +
                                                                   (zone.details || '');
                                                
                                                polygon.bindPopup(popupContent);
                                            });
                                        </script>
                                    </body>
                                    </html>
                                `}}
                                style={{ flex: 1 }}
                            />
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}
