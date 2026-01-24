import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { Search, Filter, X } from 'lucide-react-native';
import { getDonations } from '../services/apiService';

export default function DonationManagement() {
    const [donations, setDonations] = useState<any[]>([]);
    const [filteredDonations, setFilteredDonations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [amountFilter, setAmountFilter] = useState('all');

    const [dateFilter, setDateFilter] = useState('all');
    const [purposeFilter, setPurposeFilter] = useState('all');

    useEffect(() => {
        fetchDonations();
    }, []);

    useEffect(() => {
        filterDonations();
    }, [searchQuery, amountFilter, dateFilter, purposeFilter, donations]);

    const fetchDonations = async () => {
        setLoading(true);
        try {
            const res = await getDonations();
            if (res.success && res.donations) {
                setDonations(res.donations);
            } else if (Array.isArray(res)) {
                setDonations(res);
            }
        } catch (error) {
            console.error('Error fetching donations:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterDonations = () => {
        let result = [...donations];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(d =>
                (d.userName || '').toLowerCase().includes(query) ||
                (d.userEmail || '').toLowerCase().includes(query) ||
                (d.purpose || '').toLowerCase().includes(query)
            );
        }

        if (amountFilter !== 'all') {
            result = result.filter(d => {
                const amount = d.amount;
                switch (amountFilter) {
                    case '0-500': return amount <= 500;
                    case '500-1000': return amount > 500 && amount <= 1000;
                    case '1000-5000': return amount > 1000 && amount <= 5000;
                    case '5000+': return amount > 5000;
                    default: return true;
                }
            });
        }

        if (dateFilter !== 'all') {
            const now = new Date();
            result = result.filter(d => {
                const date = new Date(d.createdAt);
                switch (dateFilter) {
                    case 'today': return date.toDateString() === now.toDateString();
                    case 'week': return date >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    case 'month': return date >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    case 'year': return date >= new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                    default: return true;
                }
            });
        }

        if (purposeFilter !== 'all') {
            result = result.filter(d => d.purpose === purposeFilter);
        }

        setFilteredDonations(result);
    };

    const renderItem = ({ item }: { item: any }) => (
        <View className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-3">
            <View className="flex-row justify-between items-start mb-2">
                <View>
                    <Text className="font-bold text-gray-900 text-lg">{item.userName || 'Anonymous'}</Text>
                    <Text className="text-xs text-gray-500">{item.userEmail}</Text>
                </View>
                <View className="bg-green-100 px-2 py-1 rounded">
                    <Text className="text-green-800 font-bold">₹{item.amount}</Text>
                </View>
            </View>
            <Text className="text-gray-700 mb-2">Purpose: {item.purpose || 'General'}</Text>
            <Text className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
    );

    // Get unique purposes
    const uniquePurposes = Array.from(new Set(donations.map(d => d.purpose).filter(Boolean)));

    return (
        <View className="flex-1 bg-gray-50 p-4">
            <View className="flex-row mb-4">
                <View className="flex-1 bg-white border border-gray-300 rounded-lg flex-row items-center px-3 mr-2">
                    <Search size={20} color="#9CA3AF" />
                    <TextInput
                        className="flex-1 ml-2 py-2"
                        placeholder="Search donations..."
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

            {/* Count Display */}
            {!loading && (
                <Text className="text-sm text-gray-500 mb-2">
                    Showing {filteredDonations.length} of {donations.length} donations
                </Text>
            )}

            {loading ? (
                <ActivityIndicator size="large" color="#0077B6" />
            ) : (
                <FlatList
                    data={filteredDonations}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    ListEmptyComponent={<Text className="text-center text-gray-500 mt-10">No donations found</Text>}
                />
            )}

            <Modal visible={isFilterModalOpen} animationType="slide" transparent={true}>
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl p-6 h-[80%]">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-xl font-bold">Filter Donations</Text>
                            <TouchableOpacity onPress={() => setIsFilterModalOpen(false)}>
                                <X size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            <Text className="font-bold mb-2">Amount Range</Text>
                            <View className="flex-row flex-wrap mb-4">
                                {['all', '0-500', '500-1000', '1000-5000', '5000+'].map(range => (
                                    <TouchableOpacity
                                        key={range}
                                        onPress={() => setAmountFilter(range)}
                                        className={`px-3 py-2 rounded-full mr-2 mb-2 border ${amountFilter === range ? 'bg-[#0077B6] border-[#0077B6]' : 'bg-white border-gray-300'}`}
                                    >
                                        <Text className={amountFilter === range ? 'text-white' : 'text-gray-700'}>
                                            {range === 'all' ? 'All' : range}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text className="font-bold mb-2">Date Range</Text>
                            <View className="flex-row flex-wrap mb-4">
                                {['all', 'today', 'week', 'month', 'year'].map(range => (
                                    <TouchableOpacity
                                        key={range}
                                        onPress={() => setDateFilter(range)}
                                        className={`px-3 py-2 rounded-full mr-2 mb-2 border ${dateFilter === range ? 'bg-[#0077B6] border-[#0077B6]' : 'bg-white border-gray-300'}`}
                                    >
                                        <Text className={dateFilter === range ? 'text-white' : 'text-gray-700'}>
                                            {range === 'all' ? 'All' : range.charAt(0).toUpperCase() + range.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text className="font-bold mb-2">Purpose</Text>
                            <View className="flex-row flex-wrap mb-4">
                                <TouchableOpacity
                                    onPress={() => setPurposeFilter('all')}
                                    className={`px-3 py-2 rounded-full mr-2 mb-2 border ${purposeFilter === 'all' ? 'bg-[#0077B6] border-[#0077B6]' : 'bg-white border-gray-300'}`}
                                >
                                    <Text className={purposeFilter === 'all' ? 'text-white' : 'text-gray-700'}>All</Text>
                                </TouchableOpacity>
                                {uniquePurposes.map((purpose: any) => (
                                    <TouchableOpacity
                                        key={purpose}
                                        onPress={() => setPurposeFilter(purpose)}
                                        className={`px-3 py-2 rounded-full mr-2 mb-2 border ${purposeFilter === purpose ? 'bg-[#0077B6] border-[#0077B6]' : 'bg-white border-gray-300'}`}
                                    >
                                        <Text className={purposeFilter === purpose ? 'text-white' : 'text-gray-700'}>
                                            {purpose}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        <TouchableOpacity
                            onPress={() => setIsFilterModalOpen(false)}
                            className="bg-[#0077B6] p-4 rounded-xl items-center mt-4"
                        >
                            <Text className="text-white font-bold">Apply Filters</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
