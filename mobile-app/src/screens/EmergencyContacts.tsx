import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking, Alert, ActivityIndicator } from 'react-native';
import { Phone, Shield, HeartPulse, Anchor, AlertTriangle } from 'lucide-react-native';
import { getEmergencyContacts } from '../services/apiService';

export default function EmergencyContacts() {
    const [contacts, setContacts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        try {
            const res = await getEmergencyContacts();
            if (res.success && res.contacts) {
                setContacts(res.contacts);
            } else if (Array.isArray(res)) {
                setContacts(res);
            }
        } catch (error) {
            console.error('Error fetching contacts:', error);
            Alert.alert('Error', 'Failed to load emergency contacts');
        } finally {
            setLoading(false);
        }
    };

    const handleCall = async (number: string) => {
        const url = `tel:${number}`;
        try {
            await Linking.openURL(url);
        } catch (error) {
            Alert.alert('Error', `Could not call ${number}`);
            console.error("Call error:", error);
        }
    };

    const getIcon = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'police': return Shield;
            case 'ambulance': return HeartPulse;
            case 'coast_guard': return Anchor;
            default: return Phone;
        }
    };

    const getColor = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'police': return { bg: 'bg-blue-100', text: '#0077B6' };
            case 'ambulance': return { bg: 'bg-red-100', text: '#DC2626' };
            case 'coast_guard': return { bg: 'bg-orange-100', text: '#EA580C' };
            default: return { bg: 'bg-green-100', text: '#16A34A' };
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#0077B6" />
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-white p-4">
            <Text className="text-2xl font-bold mb-6 text-gray-900">Emergency Contacts</Text>

            <View className="space-y-4">
                {contacts.length === 0 ? (
                    <Text className="text-center text-gray-500">No contacts available.</Text>
                ) : (
                    contacts.map((contact) => {
                        const Icon = getIcon(contact.type || contact.name);
                        const colors = getColor(contact.type || contact.name);
                        return (
                            <TouchableOpacity
                                key={contact.id}
                                onPress={() => handleCall(contact.number)}
                                className="flex-row items-center p-4 bg-white border border-gray-200 rounded-xl shadow-sm mb-3"
                            >
                                <View className={`p-3 rounded-full ${colors.bg} mr-4`}>
                                    <Icon size={24} color={colors.text} />
                                </View>

                                <View className="flex-1">
                                    <Text className="text-lg font-semibold text-gray-900">{contact.name}</Text>
                                    <Text className="text-gray-500">{contact.description || 'Tap to call'}</Text>
                                </View>

                                <View className="bg-gray-50 px-3 py-1 rounded-lg">
                                    <Text className="text-lg font-bold text-gray-700">{contact.number}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </View>

            <View className="mt-8 p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                <View className="flex-row items-center mb-2">
                    <AlertTriangle size={20} color="#CA8A04" />
                    <Text className="text-yellow-800 font-medium ml-2">Important Note</Text>
                </View>
                <Text className="text-yellow-700 text-sm">
                    These numbers are for emergency use only. False reporting or misuse of emergency lines is a punishable offense.
                </Text>
            </View>
        </ScrollView>
    );
}
