import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Send, History, Users, AlertTriangle } from 'lucide-react-native';
import { getUserCount, getFlashSMSStatus, getFlashSMSHistory, sendFlashSMS } from '../services/apiService';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function FlashSMSAlert() {
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [userCount, setUserCount] = useState(0);
    const [history, setHistory] = useState<any[]>([]);
    const [userRole, setUserRole] = useState<string>('official');

    const [smsStatus, setSmsStatus] = useState<any>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const role = userDoc.data().role || 'official';
                    setUserRole(role);

                    const [countRes, historyRes, statusRes] = await Promise.all([
                        getUserCount(role),
                        getFlashSMSHistory(role),
                        getFlashSMSStatus()
                    ]);

                    setUserCount(countRes.count || 0);

                    if (Array.isArray(historyRes)) {
                        setHistory(historyRes);
                    } else if (historyRes.history) {
                        setHistory(historyRes.history);
                    }

                    setSmsStatus(statusRes);
                }
            }
        } catch (error) {
            console.error('Error fetching SMS data:', error);
        }
    };

    const handleSend = async () => {
        if (!message.trim()) {
            Alert.alert('Error', 'Please enter a message');
            return;
        }

        Alert.alert(
            'Confirm Send',
            `Are you sure you want to send this alert to ${userCount} users?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const user = auth.currentUser;
                            if (!user) return;

                            const res = await sendFlashSMS(message, userRole, user.uid);
                            if (res.success) {
                                Alert.alert('Success', `SMS sent to ${res.sentCount} users`);
                                setMessage('');
                                fetchData(); // Refresh history
                            } else {
                                Alert.alert('Error', res.message || 'Failed to send SMS');
                            }
                        } catch (error) {
                            Alert.alert('Error', 'An error occurred');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <ScrollView className="flex-1 bg-gray-50 p-4">
            <Text className="text-2xl font-bold mb-2 text-gray-900">Flash SMS Alert</Text>
            <Text className="text-gray-500 mb-6">Send emergency alerts to all registered users.</Text>

            <View className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
                <View className="flex-row items-center mb-4">
                    <Users size={20} color="#0077B6" />
                    <Text className="ml-2 text-gray-900 font-bold">Recipients: {userCount}</Text>
                </View>

                <View className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mb-4 flex-row items-start">
                    <AlertTriangle size={20} color="#D97706" />
                    <Text className="ml-2 text-yellow-800 flex-1 text-sm">
                        Warning: This will send an SMS to all users. Use only for emergencies.
                    </Text>
                </View>

                {/* SMS Status Display */}
                <View className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
                    <Text className="font-bold text-blue-900 mb-1">System Status:</Text>
                    {loading ? (
                        <Text className="text-blue-800 text-xs">Checking configuration...</Text>
                    ) : (
                        <View>
                            <Text className="text-blue-800 text-xs">🔔 Push Notifications: Active (Primary)</Text>
                            <Text className="text-blue-800 text-xs mt-1">
                                💬 SMS Mode: {smsStatus?.mode === 'msg91' ? 'MSG91 (Live)' :
                                    smsStatus?.mode === 'twofactor' ? '2Factor (Live)' :
                                        smsStatus?.mode === 'email-to-sms' ? 'Email-to-SMS' :
                                            'Demo Mode (Simulated)'}
                            </Text>
                        </View>
                    )}
                </View>

                <Text className="text-gray-700 font-medium mb-2">Message</Text>
                <TextInput
                    className="bg-gray-50 border border-gray-300 rounded-lg p-3 h-32 text-gray-900 mb-2"
                    multiline
                    placeholder="Enter emergency message..."
                    value={message}
                    onChangeText={setMessage}
                    maxLength={160}
                    textAlignVertical="top"
                />
                <Text className="text-right text-gray-400 text-xs mb-4">{message.length}/160</Text>

                <TouchableOpacity
                    onPress={handleSend}
                    disabled={loading || !message.trim()}
                    className={`flex-row justify-center items-center py-3 rounded-xl ${loading || !message.trim() ? 'bg-gray-300' : 'bg-red-600'}`}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Send size={20} color="white" />
                            <Text className="text-white font-bold ml-2">Send Alert</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <View className="flex-row items-center mb-4">
                <History size={20} color="#4B5563" />
                <Text className="ml-2 text-lg font-bold text-gray-800">Alert History</Text>
            </View>

            {history.length === 0 ? (
                <Text className="text-center text-gray-500 italic">No alert history.</Text>
            ) : (
                history.map((alert, index) => (
                    <View key={index} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-3">
                        <View className="flex-row justify-between mb-1">
                            <Text className="text-xs text-gray-500">{new Date(alert.createdAt).toLocaleString()}</Text>
                            <Text className={`text-xs font-bold ${alert.status === 'sent' ? 'text-green-600' : 'text-red-600'}`}>
                                {alert.status?.toUpperCase()}
                            </Text>
                        </View>
                        <Text className="text-gray-800">{alert.message}</Text>
                        <Text className="text-xs text-gray-400 mt-2">Sent to {alert.recipientCount} users</Text>
                    </View>
                ))
            )}
        </ScrollView>
    );
}
