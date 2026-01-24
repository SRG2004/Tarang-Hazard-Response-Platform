import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert, Modal, ScrollView } from 'react-native';
import { Search, Filter, CheckCircle, XCircle, AlertTriangle } from 'lucide-react-native';
import { getReports, verifyReport, rejectReport, solveReport } from '../services/apiService';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function ReportsManagement() {
    const [reports, setReports] = useState<any[]>([]);
    const [filteredReports, setFilteredReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [userRole, setUserRole] = useState<string>('official');
    const [selectedReport, setSelectedReport] = useState<any | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        filterReports();
    }, [reports, searchQuery, statusFilter]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (user) {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    setUserRole(userDoc.data().role || 'official');
                }
            }

            const res = await getReports();
            if (res.reports) {
                setReports(res.reports);
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterReports = () => {
        let result = reports;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(r =>
                (r.title && r.title.toLowerCase().includes(query)) ||
                (r.description && r.description.toLowerCase().includes(query)) ||
                (r.locationName && r.locationName.toLowerCase().includes(query))
            );
        }

        if (statusFilter !== 'all') {
            result = result.filter(r => r.status === statusFilter);
        }

        setFilteredReports(result);
    };

    const handleAction = async (action: 'verify' | 'reject' | 'solve', reportId: string) => {
        const user = auth.currentUser;
        if (!user) return;

        try {
            if (action === 'verify') {
                await verifyReport(reportId, user.uid, userRole);
                Alert.alert('Success', 'Report verified');
            } else if (action === 'reject') {
                await rejectReport(reportId, user.uid, userRole, 'Rejected via mobile app');
                Alert.alert('Success', 'Report rejected');
            } else if (action === 'solve') {
                await solveReport(reportId, user.uid, userRole, 'Solved via mobile app');
                Alert.alert('Success', 'Report solved');
            }

            // Update local state
            const updatedReports = reports.map(r => {
                if (r.id !== reportId) return r;
                return {
                    ...r,
                    status: action === 'verify' ? 'verified' : action === 'reject' ? 'rejected' : 'solved',
                    verified: action === 'verify' || action === 'solve'
                };
            });
            setReports(updatedReports);
            setSelectedReport(null); // Close modal if open
        } catch (error) {
            Alert.alert('Error', `Failed to ${action} report`);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-3"
            onPress={() => setSelectedReport(item)}
        >
            <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 mr-2">
                    <Text className="font-bold text-gray-900 text-lg">{item.title || item.hazardType || 'Hazard Report'}</Text>
                    <Text className="text-gray-500 text-xs">{new Date(item.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()}</Text>
                </View>
                <View className={`px-2 py-1 rounded-full ${item.severity === 'critical' ? 'bg-red-100' : 'bg-orange-100'}`}>
                    <Text className={`text-xs font-bold ${item.severity === 'critical' ? 'text-red-700' : 'text-orange-700'} capitalize`}>
                        {item.severity || 'Medium'}
                    </Text>
                </View>
            </View>
            <Text className="text-gray-700 mb-2" numberOfLines={2}>{item.description}</Text>
            <View className="flex-row justify-between items-center">
                <Text className="text-xs text-gray-500">{item.locationName || 'Unknown Location'}</Text>
                <Text className={`text-xs font-bold capitalize ${item.status === 'verified' ? 'text-green-600' :
                        item.status === 'rejected' ? 'text-red-600' :
                            item.status === 'solved' ? 'text-blue-600' : 'text-yellow-600'
                    }`}>
                    {item.status}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View className="flex-1 bg-gray-50 p-4">
            <View className="flex-row items-center bg-white rounded-lg border border-gray-200 px-3 py-2 mb-4">
                <Search size={20} color="#6B7280" />
                <TextInput
                    className="flex-1 ml-2 text-gray-900"
                    placeholder="Search reports..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <View className="flex-row mb-4">
                {['all', 'pending', 'verified', 'critical'].map(status => (
                    <TouchableOpacity
                        key={status}
                        onPress={() => setStatusFilter(status === 'critical' ? 'all' : status)} // Simplified logic for now
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
                    data={filteredReports}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    ListEmptyComponent={<Text className="text-center text-gray-500 mt-10">No reports found</Text>}
                />
            )}

            {/* Detail Modal */}
            <Modal
                visible={!!selectedReport}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSelectedReport(null)}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl p-6 h-[80%]">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-2xl font-bold text-gray-900 flex-1">{selectedReport?.title || 'Report Details'}</Text>
                            <TouchableOpacity onPress={() => setSelectedReport(null)}>
                                <XCircle size={28} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="flex-1">
                            <View className="flex-row mb-4">
                                <View className={`px-3 py-1 rounded-full mr-2 ${selectedReport?.severity === 'critical' ? 'bg-red-100' : 'bg-orange-100'}`}>
                                    <Text className={`font-bold ${selectedReport?.severity === 'critical' ? 'text-red-700' : 'text-orange-700'} capitalize`}>
                                        {selectedReport?.severity}
                                    </Text>
                                </View>
                                <View className="px-3 py-1 rounded-full bg-gray-100">
                                    <Text className="text-gray-700 capitalize">{selectedReport?.status}</Text>
                                </View>
                            </View>

                            <Text className="text-gray-500 mb-1">Description</Text>
                            <Text className="text-gray-900 text-lg mb-4">{selectedReport?.description}</Text>

                            <Text className="text-gray-500 mb-1">Location</Text>
                            <Text className="text-gray-900 text-lg mb-4">{selectedReport?.locationName || 'Unknown'}</Text>

                            <Text className="text-gray-500 mb-1">Submitted By</Text>
                            <Text className="text-gray-900 text-lg mb-4">{selectedReport?.submittedBy || 'Anonymous'}</Text>

                            <Text className="text-gray-500 mb-1">Date</Text>
                            <Text className="text-gray-900 text-lg mb-6">
                                {selectedReport?.createdAt?.seconds ? new Date(selectedReport.createdAt.seconds * 1000).toLocaleString() : 'Unknown'}
                            </Text>
                        </ScrollView>

                        <View className="flex-row justify-between mt-4 pt-4 border-t border-gray-200">
                            <TouchableOpacity
                                onPress={() => handleAction('verify', selectedReport.id)}
                                className="bg-green-100 p-3 rounded-xl flex-1 mr-2 items-center"
                            >
                                <Text className="text-green-700 font-bold">Verify</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleAction('reject', selectedReport.id)}
                                className="bg-red-100 p-3 rounded-xl flex-1 mr-2 items-center"
                            >
                                <Text className="text-red-700 font-bold">Reject</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleAction('solve', selectedReport.id)}
                                className="bg-blue-100 p-3 rounded-xl flex-1 items-center"
                            >
                                <Text className="text-blue-700 font-bold">Solve</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
