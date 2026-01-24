import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, ScrollView, TextInput } from 'react-native';
import { CheckCircle, XCircle, ExternalLink, MapPin, Calendar } from 'lucide-react-native';
import { getSocialMediaReports, verifySocialMediaPost, getVerificationData } from '../services/apiService';

export default function SocialMediaVerification() {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState<any | null>(null);
    const [verificationNotes, setVerificationNotes] = useState('');
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const res = await getSocialMediaReports();
            if (res.success && res.reports) {
                // Filter for pending posts
                const pending = res.reports.filter((p: any) => !p.verified && p.status !== 'rejected');
                setPosts(pending);
            }
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (verified: boolean) => {
        if (!selectedPost) return;

        setVerifying(true);
        try {
            await verifySocialMediaPost(selectedPost.id, verified, verificationNotes, '');
            Alert.alert('Success', `Post ${verified ? 'verified' : 'rejected'}`);
            setSelectedPost(null);
            fetchPosts();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to verify post');
        } finally {
            setVerifying(false);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-3"
            onPress={() => setSelectedPost(item)}
        >
            <View className="flex-row justify-between mb-2">
                <Text className="font-bold text-gray-900">{item.platform}</Text>
                <Text className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleDateString()}</Text>
            </View>
            <Text className="text-gray-800 mb-2" numberOfLines={2}>{item.text || item.description}</Text>
            <View className="flex-row items-center">
                <Text className="text-xs text-gray-500 mr-2">by {item.author}</Text>
                {item.aiAnalysis && (
                    <View className="bg-blue-50 px-2 py-1 rounded">
                        <Text className="text-xs text-blue-700">
                            Confidence: {((item.aiAnalysis.confidence || 0) * 100).toFixed(0)}%
                        </Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <View className="flex-1 bg-gray-50 p-4">
            <Text className="text-2xl font-bold text-gray-900 mb-4">Verify Posts</Text>

            {loading ? (
                <ActivityIndicator size="large" color="#0077B6" />
            ) : (
                <FlatList
                    data={posts}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => item.id || index.toString()}
                    ListEmptyComponent={<Text className="text-center text-gray-500 mt-10">No pending posts</Text>}
                />
            )}

            <Modal
                visible={!!selectedPost}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSelectedPost(null)}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl p-6 h-[85%]">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-xl font-bold text-gray-900">Verify Post</Text>
                            <TouchableOpacity onPress={() => setSelectedPost(null)}>
                                <XCircle size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="flex-1">
                            <View className="bg-gray-50 p-4 rounded-xl mb-4">
                                <Text className="text-gray-900 mb-2 text-lg">{selectedPost?.text || selectedPost?.description}</Text>
                                <View className="flex-row justify-between mt-2">
                                    <Text className="text-sm text-gray-500">Platform: {selectedPost?.platform}</Text>
                                    <Text className="text-sm text-gray-500">Author: {selectedPost?.author}</Text>
                                </View>
                            </View>

                            <Text className="font-bold mb-2">Verification Notes</Text>
                            <TextInput
                                className="bg-white border border-gray-300 rounded-lg p-3 h-24 text-gray-900 mb-4"
                                multiline
                                placeholder="Add notes..."
                                value={verificationNotes}
                                onChangeText={setVerificationNotes}
                                textAlignVertical="top"
                            />

                            {/* Placeholder for comparison data - in a real app, we'd fetch and display it here */}
                            <Text className="text-xs text-gray-400 italic mb-4">
                                Comparison data (Weather, News, INCOIS) would be displayed here.
                            </Text>
                        </ScrollView>

                        <View className="flex-row justify-between pt-4 border-t border-gray-200">
                            <TouchableOpacity
                                onPress={() => handleVerify(false)}
                                className="bg-red-100 p-4 rounded-xl flex-1 mr-2 items-center"
                            >
                                <Text className="text-red-700 font-bold">Reject</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleVerify(true)}
                                className="bg-green-100 p-4 rounded-xl flex-1 items-center"
                            >
                                <Text className="text-green-700 font-bold">Verify</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
