import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Modal, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Plus, Edit, Trash2, XCircle, Search, Filter } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { getFishingZones, createFishingZone, updateFishingZone, deleteFishingZone, getCirculars, createCircular, updateCircular, deleteCircular } from '../services/apiService';

export default function FishermanManagement() {
    const [activeTab, setActiveTab] = useState('zones');
    const [zones, setZones] = useState<any[]>([]);
    const [circulars, setCirculars] = useState<any[]>([]);
    const [filteredZones, setFilteredZones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const webViewRef = useRef<WebView>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

    // Modal States
    const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
    const [editingZone, setEditingZone] = useState<any | null>(null);
    const [zoneForm, setZoneForm] = useState({ name: '', coordinatesStr: '', status: 'safe', details: '' });

    const [isCircularModalOpen, setIsCircularModalOpen] = useState(false);
    const [editingCircular, setEditingCircular] = useState<any | null>(null);
    const [circularForm, setCircularForm] = useState({ title: '', content: '', category: 'fishing', priority: 'medium', issuedDate: '', expiryDate: '' });

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        filterZones();
    }, [searchQuery, statusFilter, typeFilter, zones]);

    // Update map when filtered zones change
    useEffect(() => {
        if (activeTab === 'map' && webViewRef.current && filteredZones.length > 0) {
            const script = `
                if (window.updateZones) {
                    window.updateZones(${JSON.stringify(filteredZones)});
                }
            `;
            webViewRef.current.injectJavaScript(script);
        }
    }, [activeTab, filteredZones]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [zonesRes, circularsRes] = await Promise.all([
                getFishingZones(),
                getCirculars()
            ]);

            if (zonesRes.success && zonesRes.zones) setZones(zonesRes.zones);
            if (circularsRes.success && circularsRes.circulars) setCirculars(circularsRes.circulars);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterZones = () => {
        let result = [...zones];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(z => z.name.toLowerCase().includes(query));
        }

        if (statusFilter !== 'all') {
            result = result.filter(z => z.status === statusFilter);
        }

        if (typeFilter !== 'all') {
            // Simple heuristic: if name has digits, it's a sub-zone
            const isSubZone = (z: any) => /\d/.test(z.name);
            if (typeFilter === 'parent') result = result.filter(z => !isSubZone(z));
            if (typeFilter === 'sub') result = result.filter(z => isSubZone(z));
        }

        setFilteredZones(result);
    };

    // Zone Handlers
    const handleSaveZone = async () => {
        try {
            let coordinates;
            try {
                coordinates = JSON.parse(zoneForm.coordinatesStr);
                if (!Array.isArray(coordinates)) throw new Error();
            } catch {
                Alert.alert('Error', 'Invalid coordinates. Must be JSON array of [lat, lng].');
                return;
            }

            const data = { ...zoneForm, coordinates };
            if (editingZone) {
                await updateFishingZone(editingZone.id, data);
                Alert.alert('Success', 'Zone updated');
            } else {
                await createFishingZone(data);
                Alert.alert('Success', 'Zone created');
            }
            setIsZoneModalOpen(false);
            fetchData();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save zone');
        }
    };

    const handleDeleteZone = async (id: string) => {
        Alert.alert('Confirm Delete', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await deleteFishingZone(id);
                        fetchData();
                    } catch (error) {
                        Alert.alert('Error', 'Failed to delete zone');
                    }
                }
            }
        ]);
    };

    // Circular Handlers
    const handleSaveCircular = async () => {
        try {
            const data = { ...circularForm };
            if (!data.issuedDate) data.issuedDate = new Date().toISOString().split('T')[0];

            if (editingCircular) {
                await updateCircular(editingCircular.id, data);
                Alert.alert('Success', 'Circular updated');
            } else {
                await createCircular(data);
                Alert.alert('Success', 'Circular created');
            }
            setIsCircularModalOpen(false);
            fetchData();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save circular');
        }
    };

    const handleDeleteCircular = async (id: string) => {
        Alert.alert('Confirm Delete', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await deleteCircular(id);
                        fetchData();
                    } catch (error) {
                        Alert.alert('Error', 'Failed to delete circular');
                    }
                }
            }
        ]);
    };

    const leafletHtml = `
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
                var map = L.map('map').setView([20.5937, 78.9629], 5);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(map);

                var zoneLayers = L.layerGroup().addTo(map);

                window.updateZones = function(zones) {
                    zoneLayers.clearLayers();
                    var bounds = L.latLngBounds();
                    var hasZones = false;

                    zones.forEach(function(zone) {
                        if (zone.coordinates && zone.coordinates.length > 0) {
                            var color = zone.status === 'safe' ? '#16a34a' : 
                                        zone.status === 'dangerous' ? '#dc2626' : '#ea580c';
                            
                            var polygon = L.polygon(zone.coordinates, {
                                color: color,
                                fillColor: color,
                                fillOpacity: 0.3,
                                weight: 2
                            }).bindPopup('<b>' + zone.name + '</b><br>Status: ' + zone.status);
                            
                            zoneLayers.addLayer(polygon);
                            bounds.extend(polygon.getBounds());
                            hasZones = true;
                        }
                    });

                    if (hasZones) {
                        map.fitBounds(bounds, { padding: [20, 20] });
                    }
                }
            </script>
        </body>
        </html>
    `;

    return (
        <View className="flex-1 bg-gray-50">
            <View className="flex-row bg-white border-b border-gray-200">
                {['zones', 'map', 'circulars'].map(tab => (
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

            <View className="p-4 flex-1">
                {activeTab === 'zones' && (
                    <>
                        <View className="flex-row mb-4">
                            <View className="flex-1 bg-white border border-gray-300 rounded-lg flex-row items-center px-3 mr-2">
                                <Search size={20} color="#9CA3AF" />
                                <TextInput
                                    className="flex-1 ml-2 py-2"
                                    placeholder="Search zones..."
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                            </View>
                            <TouchableOpacity
                                onPress={() => setIsFilterModalOpen(true)}
                                className="bg-white border border-gray-300 rounded-lg p-3 justify-center"
                            >
                                <Filter size={20} color="#4B5563" />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={() => {
                                setEditingZone(null);
                                setZoneForm({ name: '', coordinatesStr: '', status: 'safe', details: '' });
                                setIsZoneModalOpen(true);
                            }}
                            className="bg-[#0077B6] p-3 rounded-xl mb-4 items-center"
                        >
                            <View className="flex-row items-center">
                                <Plus size={20} color="white" />
                                <Text className="text-white font-bold ml-2">Add Fishing Zone</Text>
                            </View>
                        </TouchableOpacity>
                        <FlatList
                            data={filteredZones}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <View className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-3 flex-row justify-between items-center">
                                    <View className="flex-1">
                                        <Text className="font-bold text-gray-900">{item.name}</Text>
                                        <Text className={`text-xs font-bold capitalize ${item.status === 'safe' ? 'text-green-600' :
                                                item.status === 'dangerous' ? 'text-red-600' : 'text-orange-600'
                                            }`}>{item.status}</Text>
                                    </View>
                                    <View className="flex-row">
                                        <TouchableOpacity onPress={() => {
                                            setEditingZone(item);
                                            setZoneForm({
                                                name: item.name,
                                                coordinatesStr: JSON.stringify(item.coordinates),
                                                status: item.status,
                                                details: item.details || ''
                                            });
                                            setIsZoneModalOpen(true);
                                        }} className="mr-3">
                                            <Edit size={20} color="#4B5563" />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleDeleteZone(item.id)}>
                                            <Trash2 size={20} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        />
                    </>
                )}

                {activeTab === 'map' && (
                    <View className="flex-1 rounded-xl overflow-hidden bg-white">
                        <WebView
                            ref={webViewRef}
                            source={{ html: leafletHtml }}
                            style={{ flex: 1 }}
                            onLoadEnd={() => {
                                const script = `
                                    if (window.updateZones) {
                                        window.updateZones(${JSON.stringify(filteredZones)});
                                    }
                                `;
                                webViewRef.current?.injectJavaScript(script);
                            }}
                        />
                    </View>
                )}

                {activeTab === 'circulars' && (
                    <>
                        <TouchableOpacity
                            onPress={() => {
                                setEditingCircular(null);
                                setCircularForm({ title: '', content: '', category: 'fishing', priority: 'medium', issuedDate: '', expiryDate: '' });
                                setIsCircularModalOpen(true);
                            }}
                            className="bg-[#0077B6] p-3 rounded-xl mb-4 items-center"
                        >
                            <View className="flex-row items-center">
                                <Plus size={20} color="white" />
                                <Text className="text-white font-bold ml-2">Add Circular</Text>
                            </View>
                        </TouchableOpacity>
                        <FlatList
                            data={circulars}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <View className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-3 flex-row justify-between items-center">
                                    <View className="flex-1">
                                        <Text className="font-bold text-gray-900">{item.title}</Text>
                                        <Text className="text-xs text-gray-500">{item.category} • {item.priority}</Text>
                                    </View>
                                    <View className="flex-row">
                                        <TouchableOpacity onPress={() => {
                                            setEditingCircular(item);
                                            setCircularForm({
                                                title: item.title,
                                                content: item.content,
                                                category: item.category,
                                                priority: item.priority,
                                                issuedDate: item.issuedDate,
                                                expiryDate: item.expiryDate || ''
                                            });
                                            setIsCircularModalOpen(true);
                                        }} className="mr-3">
                                            <Edit size={20} color="#4B5563" />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleDeleteCircular(item.id)}>
                                            <Trash2 size={20} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        />
                    </>
                )}
            </View>

            {/* Zone Modal */}
            <Modal visible={isZoneModalOpen} animationType="slide" transparent={true}>
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl p-6 h-[80%]">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-xl font-bold">{editingZone ? 'Edit Zone' : 'Add Zone'}</Text>
                            <TouchableOpacity onPress={() => setIsZoneModalOpen(false)}>
                                <XCircle size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            <Text className="mb-1 font-bold">Name</Text>
                            <TextInput className="border border-gray-300 rounded-lg p-3 mb-4" value={zoneForm.name} onChangeText={t => setZoneForm({ ...zoneForm, name: t })} />

                            <Text className="mb-1 font-bold">Status (safe, caution, dangerous)</Text>
                            <TextInput className="border border-gray-300 rounded-lg p-3 mb-4" value={zoneForm.status} onChangeText={t => setZoneForm({ ...zoneForm, status: t })} />

                            <Text className="mb-1 font-bold">Coordinates (JSON Array)</Text>
                            <TextInput className="border border-gray-300 rounded-lg p-3 mb-4 h-24" multiline value={zoneForm.coordinatesStr} onChangeText={t => setZoneForm({ ...zoneForm, coordinatesStr: t })} />

                            <Text className="mb-1 font-bold">Details</Text>
                            <TextInput className="border border-gray-300 rounded-lg p-3 mb-4" multiline value={zoneForm.details} onChangeText={t => setZoneForm({ ...zoneForm, details: t })} />
                        </ScrollView>
                        <TouchableOpacity onPress={handleSaveZone} className="bg-[#0077B6] p-4 rounded-xl items-center mt-4">
                            <Text className="text-white font-bold">Save Zone</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Circular Modal */}
            <Modal visible={isCircularModalOpen} animationType="slide" transparent={true}>
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl p-6 h-[80%]">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-xl font-bold">{editingCircular ? 'Edit Circular' : 'Add Circular'}</Text>
                            <TouchableOpacity onPress={() => setIsCircularModalOpen(false)}>
                                <XCircle size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            <Text className="mb-1 font-bold">Title</Text>
                            <TextInput className="border border-gray-300 rounded-lg p-3 mb-4" value={circularForm.title} onChangeText={t => setCircularForm({ ...circularForm, title: t })} />

                            <Text className="mb-1 font-bold">Content</Text>
                            <TextInput className="border border-gray-300 rounded-lg p-3 mb-4 h-24" multiline value={circularForm.content} onChangeText={t => setCircularForm({ ...circularForm, content: t })} />

                            <Text className="mb-1 font-bold">Category</Text>
                            <TextInput className="border border-gray-300 rounded-lg p-3 mb-4" value={circularForm.category} onChangeText={t => setCircularForm({ ...circularForm, category: t })} />

                            <Text className="mb-1 font-bold">Priority</Text>
                            <TextInput className="border border-gray-300 rounded-lg p-3 mb-4" value={circularForm.priority} onChangeText={t => setCircularForm({ ...circularForm, priority: t })} />
                        </ScrollView>
                        <TouchableOpacity onPress={handleSaveCircular} className="bg-[#0077B6] p-4 rounded-xl items-center mt-4">
                            <Text className="text-white font-bold">Save Circular</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
