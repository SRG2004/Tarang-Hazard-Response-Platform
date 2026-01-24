import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import { Search, Filter, X, UserCheck, UserX, Phone, Mail, MapPin, Plus } from 'lucide-react-native';
import { getVolunteers, updateVolunteerStatus } from '../services/apiService';

export default function VolunteerManagement() {
    const [activeTab, setActiveTab] = useState('list');
    const [volunteers, setVolunteers] = useState<any[]>([]);
    const [filteredVolunteers, setFilteredVolunteers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedVolunteer, setSelectedVolunteer] = useState<any | null>(null);

    useEffect(() => {
        fetchVolunteers();
    }, []);

    useEffect(() => {
        filterVolunteers();
    }, [searchQuery, statusFilter, volunteers]);

    const fetchVolunteers = async () => {
        setLoading(true);
        try {
            const res = await getVolunteers();
            if (res.success && res.volunteers) {
                setVolunteers(res.volunteers);
            } else if (Array.isArray(res)) {
                setVolunteers(res);
            }
        } catch (error) {
            console.error('Error fetching volunteers:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterVolunteers = () => {
        let result = [...volunteers];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(v =>
                (v.userName || v.name || '').toLowerCase().includes(query) ||
                (v.userEmail || v.email || '').toLowerCase().includes(query) ||
                (v.location || '').toLowerCase().includes(query) ||
                (v.phone || '').toLowerCase().includes(query) ||
                (v.skills || []).some((skill: string) => skill.toLowerCase().includes(query))
            );
        }

        if (statusFilter !== 'all') {
            result = result.filter(v => v.status === statusFilter);
        }

        setFilteredVolunteers(result);
    };

    const handleStatusUpdate = async (id: string, status: string) => {
        try {
            const res = await updateVolunteerStatus(id, status);
            if (res.success) {
                Alert.alert('Success', `Volunteer ${status} successfully`);
                fetchVolunteers();
                setSelectedVolunteer(null);
            } else {
                Alert.alert('Error', 'Failed to update status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            Alert.alert('Error', 'An error occurred');
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            onPress={() => setSelectedVolunteer(item)}
            className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-3 flex-row items-center"
        >
            <View className="w-12 h-12 bg-gray-200 rounded-full items-center justify-center mr-4">
                <Text className="text-lg font-bold text-gray-500">
                    {(item.userName || item.name || '?').charAt(0).toUpperCase()}
                </Text>
            </View>
            <View className="flex-1">
                <Text className="font-bold text-gray-900">{item.userName || item.name}</Text>
                <Text className="text-gray-500 text-xs">{item.userEmail || item.email}</Text>
                <View className="flex-row mt-1">
                    <View className={`px-2 py-0.5 rounded-full ${item.status === 'active' ? 'bg-green-100' :
                        item.status === 'pending' ? 'bg-yellow-100' : 'bg-gray-100'
                        }`}>
                        <Text className={`text-[10px] font-bold capitalize ${item.status === 'active' ? 'text-green-700' :
                            item.status === 'pending' ? 'text-yellow-700' : 'text-gray-700'
                            }`}>
                            {item.status}
                        </Text>
                    </View>
                </View>
            </View>
            <View>
                <Phone size={20} color="#9CA3AF" />
            </View>
        </TouchableOpacity>
    );

    return (
        <View className="flex-1 bg-gray-50">
            <View className="flex-row bg-white border-b border-gray-200">
                {['list', 'map'].map(tab => (
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

            {activeTab === 'list' && (
                <View className="p-4 flex-1">
                    <View className="flex-row mb-4">
                        <View className="flex-1 bg-white border border-gray-300 rounded-lg flex-row items-center px-3 mr-2">
                            <Search size={20} color="#9CA3AF" />
                            <TextInput
                                className="flex-1 ml-2 py-2"
                                placeholder="Search volunteers..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>
                        <TouchableOpacity
                            onPress={() => Alert.alert('Add Volunteer', 'This feature is coming soon!')}
                            className="bg-[#0077B6] p-3 rounded-lg justify-center"
                        >
                            <Plus size={20} color="white" />
                        </TouchableOpacity>
                    </View>

                    <View className="flex-row mb-4">
                        {['all', 'active', 'pending', 'inactive'].map(status => (
                            <TouchableOpacity
                                key={status}
                                onPress={() => setStatusFilter(status)}
                                className={`mr-2 px-3 py-1 rounded-full ${statusFilter === status ? 'bg-[#0077B6]' : 'bg-gray-200'}`}
                            >
                                <Text className={`${statusFilter === status ? 'text-white' : 'text-gray-700'} capitalize`}>{status}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color="#0077B6" />
                    ) : (
                        <FlatList
                            data={filteredVolunteers}
                            renderItem={renderItem}
                            keyExtractor={item => item.id}
                            ListEmptyComponent={<Text className="text-center text-gray-500 mt-10">No volunteers found</Text>}
                        />
                    )}
                </View>
            )}

            {activeTab === 'map' && (
                <View className="flex-1">
                    <WebView
                        source={{
                            html: `
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                                <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                                <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                                <style>
                                    body { margin: 0; padding: 0; }
                                    #map { width: 100%; height: 100vh; }
                                </style>
                            </head>
                            <body>
                                <div id="map"></div>
                                <script>
                                    const map = L.map('map').setView([20.5937, 78.9629], 5);
                                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                        attribution: '© OpenStreetMap contributors'
                                    }).addTo(map);

                                    const volunteers = ${JSON.stringify(filteredVolunteers.filter(v => v.latitude && v.longitude))};
                                    
                                    volunteers.forEach(v => {
                                        const color = v.status === 'active' ? 'green' : v.status === 'pending' ? 'yellow' : 'gray';
                                        const markerHtml = \`
                                            <div style="background-color: \${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>
                                        \`;
                                        
                                        const icon = L.divIcon({
                                            className: 'custom-marker',
                                            html: markerHtml,
                                            iconSize: [16, 16],
                                            iconAnchor: [8, 8]
                                        });

                                        L.marker([v.latitude, v.longitude], { icon: icon })
                                            .addTo(map)
                                            .bindPopup(\`
                                                <b>\${v.userName || v.name}</b><br>
                                                Status: \${v.status}<br>
                                                \${v.location || ''}
                                            \`);
                                    });
                                </script>
                            </body>
                            </html>
                        `
                        }}
                        style={{ flex: 1 }}
                    />
                </View>
            )}

            {/* Volunteer Detail Modal */}
            <Modal visible={!!selectedVolunteer} animationType="slide" transparent={true}>
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl p-6 h-[80%]">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-xl font-bold">Volunteer Profile</Text>
                            <TouchableOpacity onPress={() => setSelectedVolunteer(null)}>
                                <X size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {selectedVolunteer && (
                            <ScrollView>
                                <View className="items-center mb-6">
                                    <View className="w-20 h-20 bg-gray-200 rounded-full items-center justify-center mb-2">
                                        <Text className="text-2xl font-bold text-gray-500">
                                            {(selectedVolunteer.userName || selectedVolunteer.name || '?').charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <Text className="text-xl font-bold">{selectedVolunteer.userName || selectedVolunteer.name}</Text>
                                    <Text className="text-gray-500">{selectedVolunteer.userEmail || selectedVolunteer.email}</Text>
                                    <View className={`mt-2 px-3 py-1 rounded-full ${selectedVolunteer.status === 'active' ? 'bg-green-100' :
                                        selectedVolunteer.status === 'inactive' ? 'bg-gray-100' : 'bg-yellow-100'
                                        }`}>
                                        <Text className={`font-bold capitalize ${selectedVolunteer.status === 'active' ? 'text-green-700' :
                                            selectedVolunteer.status === 'inactive' ? 'text-gray-700' : 'text-yellow-700'
                                            }`}>
                                            {selectedVolunteer.status}
                                        </Text>
                                    </View>
                                </View>

                                <View className="bg-gray-50 p-4 rounded-xl mb-4">
                                    <View className="flex-row items-center mb-2">
                                        <Phone size={18} color="#6B7280" />
                                        <Text className="ml-2 text-gray-700">{selectedVolunteer.phone || 'N/A'}</Text>
                                    </View>
                                    <View className="flex-row items-center mb-2">
                                        <Mail size={18} color="#6B7280" />
                                        <Text className="ml-2 text-gray-700">{selectedVolunteer.userEmail || selectedVolunteer.email}</Text>
                                    </View>
                                    <View className="flex-row items-center">
                                        <MapPin size={18} color="#6B7280" />
                                        <Text className="ml-2 text-gray-700">{selectedVolunteer.location || 'Unknown'}</Text>
                                    </View>
                                </View>

                                <Text className="font-bold mb-2">Skills</Text>
                                <View className="flex-row flex-wrap mb-4">
                                    {(selectedVolunteer.skills || []).map((skill: string, idx: number) => (
                                        <View key={idx} className="bg-blue-50 px-3 py-1 rounded-full mr-2 mb-2">
                                            <Text className="text-blue-700">{skill}</Text>
                                        </View>
                                    ))}
                                </View>

                                {selectedVolunteer.status === 'pending' && (
                                    <View className="flex-row justify-between mt-4">
                                        <TouchableOpacity
                                            onPress={() => handleStatusUpdate(selectedVolunteer.id, 'inactive')}
                                            className="bg-red-100 p-4 rounded-xl flex-1 mr-2 items-center"
                                        >
                                            <View className="flex-row items-center">
                                                <UserX size={20} color="#B91C1C" />
                                                <Text className="text-red-700 font-bold ml-2">Reject</Text>
                                            </View>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => handleStatusUpdate(selectedVolunteer.id, 'active')}
                                            className="bg-green-100 p-4 rounded-xl flex-1 items-center"
                                        >
                                            <View className="flex-row items-center">
                                                <UserCheck size={20} color="#15803D" />
                                                <Text className="text-green-700 font-bold ml-2">Approve</Text>
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}
