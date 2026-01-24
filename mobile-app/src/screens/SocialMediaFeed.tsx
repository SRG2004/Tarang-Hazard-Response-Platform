import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { MessageSquare, Twitter, Youtube, RefreshCw, Activity } from 'lucide-react-native';
import { getSocialMediaReports, getMonitoringStatus, monitorSocialMedia } from '../services/apiService';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function SocialMediaFeed() {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [monitoring, setMonitoring] = useState(false);
    const [userRole, setUserRole] = useState<string>('citizen');
    const [platformFilter, setPlatformFilter] = useState<string>('all');

    useEffect(() => {
        fetchUserRole();
        fetchPosts();
        fetchMonitoringStatus();
    }, [platformFilter]); // Trigger fetch when filter changes

    const fetchMonitoringStatus = async () => {
        try {
            const res = await getMonitoringStatus();
            if (res.success) {
                // You might want to store more details here if available in res
                // For now, we just check status
            }
        } catch (error) {
            console.error('Error fetching status:', error);
        }
    };

    const fetchUserRole = async () => {
        const user = auth.currentUser;
        if (user) {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                setUserRole(userDoc.data().role || 'citizen');
            }
        }
    };

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const res = await getSocialMediaReports(platformFilter !== 'all' ? platformFilter.toLowerCase() : undefined);
            if (res.success && res.reports) {
                setPosts(res.reports);
            } else {
                setPosts([]);
            }
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleStartMonitoring = async () => {
        setMonitoring(true);
        try {
            await monitorSocialMedia();
            Alert.alert('Success', 'Social media monitoring started');
            fetchPosts();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to start monitoring');
        } finally {
            setMonitoring(false);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <View className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-3">
            <View className="flex-row items-center mb-2">
                {item.platform === 'twitter' || item.platform === 'threads' ? (
                    <Twitter size={20} color="#1DA1F2" />
                ) : item.platform === 'youtube' ? (
                    <Youtube size={20} color="#FF0000" />
                ) : (
                    <MessageSquare size={20} color="#6B7280" />
                )}
                <Text className="ml-2 font-bold text-gray-900">{item.author || 'Unknown'}</Text>
                <View className={`ml-auto px-2 py-1 rounded-full ${item.sentiment === 'alert' ? 'bg-red-100' :
                    item.sentiment === 'warning' ? 'bg-orange-100' : 'bg-green-100'
                    }`}>
                    <Text className={`text-xs font-bold capitalize ${item.sentiment === 'alert' ? 'text-red-700' :
                        item.sentiment === 'warning' ? 'text-orange-700' : 'text-green-700'
                        }`}>
                        {item.sentiment || 'Neutral'}
                    </Text>
                </View>
            </View>
            <Text className="text-gray-800 mb-2">{item.text || item.description}</Text>
            <View className="flex-row justify-between items-center">
                <Text className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleString()}</Text>
                {item.url && (
                    <TouchableOpacity onPress={() => Linking.openURL(item.url)}>
                        <Text className="text-blue-600 text-xs font-bold">View Original</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-gray-50 p-4">
            <View className="flex-row justify-between items-center mb-4">
                <Text className="text-2xl font-bold text-gray-900">Social Feed</Text>
                <View className="flex-row">
                    <TouchableOpacity onPress={fetchPosts} className="mr-2 p-2 bg-gray-200 rounded-full">
                        <RefreshCw size={20} color="#4B5563" />
                    </TouchableOpacity>
                    {(userRole === 'official' || userRole === 'admin') && (
                        <TouchableOpacity
                            onPress={handleStartMonitoring}
                            disabled={monitoring}
                            className={`p-2 rounded-full ${monitoring ? 'bg-gray-300' : 'bg-[#0077B6]'}`}
                        >
                            {monitoring ? <ActivityIndicator size="small" color="white" /> : <Activity size={20} color="white" />}
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View className="flex-row mb-4">
                {['all', 'twitter', 'threads', 'youtube'].map(platform => (
                    <TouchableOpacity
                        key={platform}
                        onPress={() => setPlatformFilter(platform)}
                        className={`mr-2 px-3 py-1 rounded-full ${platformFilter === platform ? 'bg-[#0077B6]' : 'bg-gray-200'}`}
                    >
                        <Text className={`${platformFilter === platform ? 'text-white' : 'text-gray-700'} capitalize`}>{platform}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#0077B6" />
            ) : (
                <FlatList
                    data={posts}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    ListEmptyComponent={<Text className="text-center text-gray-500 mt-10">No posts found</Text>}
                    refreshing={refreshing}
                    onRefresh={() => {
                        setRefreshing(true);
                        fetchPosts();
                    }}
                />
            )}
        </View>
    );
}
