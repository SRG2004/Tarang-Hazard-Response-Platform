import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Switch, TextInput } from 'react-native';
import { User, LogOut, Shield, Mail, Phone, Globe, Bell, Eye, Mic, Volume2, Moon } from 'lucide-react-native';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Settings() {
    const { t, i18n } = useTranslation();
    const [userData, setUserData] = useState<any>(null);
    const user = auth.currentUser;

    // Settings State
    const [notifications, setNotifications] = useState({
        email: true,
        sms: true,
        coastalAlerts: true,
        weeklySummary: false
    });
    const [privacy, setPrivacy] = useState({
        showProfilePublicly: true,
        shareLocation: true
    });
    const [accessibility, setAccessibility] = useState({
        audioAlerts: true,
        voiceInput: true,
        highContrast: false
    });
    const [darkMode, setDarkMode] = useState(false);

    const [phone, setPhone] = useState('');
    const [location, setLocation] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);

    useEffect(() => {
        loadSettings();
        if (user) {
            fetchUserData();
        }
    }, [user]);

    const fetchUserData = async () => {
        try {
            const docRef = doc(db, 'users', user!.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserData(data);
                setPhone(data.phone || '');
                setLocation(data.location || '');
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        setSavingProfile(true);
        try {
            const { updateDoc } = require('firebase/firestore'); // Import dynamically or add to top imports
            const docRef = doc(db, 'users', user.uid);
            await updateDoc(docRef, {
                phone,
                location,
                updatedAt: new Date().toISOString()
            });
            Alert.alert('Success', 'Profile updated successfully');
        } catch (error: any) {
            console.error('Error updating profile:', error);
            Alert.alert('Error', 'Failed to update profile');
        } finally {
            setSavingProfile(false);
        }
    };

    const loadSettings = async () => {
        try {
            const savedNotifs = await AsyncStorage.getItem('settings_notifications');
            if (savedNotifs) setNotifications(JSON.parse(savedNotifs));

            const savedPrivacy = await AsyncStorage.getItem('settings_privacy');
            if (savedPrivacy) setPrivacy(JSON.parse(savedPrivacy));

            const savedAccess = await AsyncStorage.getItem('settings_accessibility');
            if (savedAccess) setAccessibility(JSON.parse(savedAccess));

            const savedTheme = await AsyncStorage.getItem('settings_theme');
            if (savedTheme) setDarkMode(savedTheme === 'dark');
        } catch (e) {
            console.error('Failed to load settings', e);
        }
    };

    const saveSettings = async (key: string, value: any) => {
        try {
            await AsyncStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Failed to save settings', e);
        }
    };

    const toggleNotification = (key: keyof typeof notifications) => {
        const newSettings = { ...notifications, [key]: !notifications[key] };
        setNotifications(newSettings);
        saveSettings('settings_notifications', newSettings);
    };

    const togglePrivacy = (key: keyof typeof privacy) => {
        const newSettings = { ...privacy, [key]: !privacy[key] };
        setPrivacy(newSettings);
        saveSettings('settings_privacy', newSettings);
    };

    const toggleAccessibility = (key: keyof typeof accessibility) => {
        const newSettings = { ...accessibility, [key]: !accessibility[key] };
        setAccessibility(newSettings);
        saveSettings('settings_accessibility', newSettings);
    };

    const handleSignOut = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            Alert.alert(t('common.error'), 'Failed to sign out');
        }
    };

    const changeLanguage = async (lang: string) => {
        try {
            await i18n.changeLanguage(lang);
            await AsyncStorage.setItem('user-language', lang);
        } catch (error) {
            console.error('Error changing language:', error);
        }
    };

    const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
        <View className="flex-row items-center mb-4 mt-2">
            <Icon size={20} color="#0077B6" />
            <Text className="text-lg font-bold text-gray-900 ml-2">{title}</Text>
        </View>
    );

    const SettingItem = ({ label, value, onValueChange, description }: { label: string, value: boolean, onValueChange: (val: boolean) => void, description?: string }) => (
        <View className="flex-row justify-between items-center py-3 border-b border-gray-100 last:border-0">
            <View className="flex-1 mr-4">
                <Text className="text-base text-gray-800">{label}</Text>
                {description && <Text className="text-xs text-gray-500 mt-1">{description}</Text>}
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={value ? '#0077B6' : '#F3F4F6'}
            />
        </View>
    );

    return (
        <ScrollView className="flex-1 bg-gray-50 p-4">
            <Text className="text-2xl font-bold mb-6 text-gray-900">{t('nav.settings')}</Text>

            {/* Profile Card */}
            <View className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6 items-center">
                <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-4">
                    <User size={40} color="#0077B6" />
                </View>
                <Text className="text-xl font-bold text-gray-900">{userData?.name || user?.displayName || 'User'}</Text>
                <Text className="text-gray-500">{user?.email}</Text>
                <View className="mt-2 px-3 py-1 bg-blue-50 rounded-full">
                    <Text className="text-blue-700 font-medium capitalize">{userData?.role || 'Citizen'}</Text>
                </View>
            </View>

            {/* Profile Settings */}
            <View className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
                <SectionHeader icon={User} title="Profile Details" />

                <View className="mb-4">
                    <Text className="text-gray-600 mb-1">Phone Number</Text>
                    <TextInput
                        className="border border-gray-300 rounded-lg p-3 bg-gray-50"
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="+91 98765 43210"
                        keyboardType="phone-pad"
                    />
                </View>

                <View className="mb-4">
                    <Text className="text-gray-600 mb-1">Location</Text>
                    <TextInput
                        className="border border-gray-300 rounded-lg p-3 bg-gray-50"
                        value={location}
                        onChangeText={setLocation}
                        placeholder="City, State"
                    />
                </View>

                <TouchableOpacity
                    onPress={handleSaveProfile}
                    disabled={savingProfile}
                    className={`p-3 rounded-lg items-center ${savingProfile ? 'bg-blue-300' : 'bg-[#0077B6]'}`}
                >
                    <Text className="text-white font-bold">
                        {savingProfile ? 'Saving...' : 'Save Profile Details'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Language */}
            <View className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
                <SectionHeader icon={Globe} title="Language" />
                <View className="flex-row justify-around mt-2">
                    {['en', 'hi', 'te'].map((lang) => (
                        <TouchableOpacity
                            key={lang}
                            onPress={() => changeLanguage(lang)}
                            className={`px-4 py-2 rounded-lg border ${i18n.language === lang ? 'bg-blue-100 border-blue-500' : 'bg-gray-50 border-gray-200'}`}
                        >
                            <Text className={`font-medium ${i18n.language === lang ? 'text-blue-700' : 'text-gray-700'}`}>
                                {lang === 'en' ? 'English' : lang === 'hi' ? 'हिंदी' : 'తెలుగు'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Notifications */}
            <View className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
                <SectionHeader icon={Bell} title={t('settings.notifications')} />
                <SettingItem
                    label={t('settings.emailNotifications')}
                    value={notifications.email}
                    onValueChange={() => toggleNotification('email')}
                />
                <SettingItem
                    label={t('settings.smsAlerts')}
                    value={notifications.sms}
                    onValueChange={() => toggleNotification('sms')}
                />
                <SettingItem
                    label={t('settings.coastalAlerts')}
                    value={notifications.coastalAlerts}
                    onValueChange={() => toggleNotification('coastalAlerts')}
                />
            </View>

            {/* Privacy */}
            <View className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
                <SectionHeader icon={Eye} title={t('settings.privacy')} />
                <SettingItem
                    label={t('settings.shareLocation')}
                    value={privacy.shareLocation}
                    onValueChange={() => togglePrivacy('shareLocation')}
                />
            </View>

            {/* Accessibility */}
            <View className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
                <SectionHeader icon={Volume2} title={t('settings.accessibility')} />
                <SettingItem
                    label={t('settings.audioAlerts')}
                    value={accessibility.audioAlerts}
                    onValueChange={() => toggleAccessibility('audioAlerts')}
                />
                <SettingItem
                    label={t('settings.voiceInput')}
                    value={accessibility.voiceInput}
                    onValueChange={() => toggleAccessibility('voiceInput')}
                />
                <SettingItem
                    label={t('settings.highContrast')}
                    value={accessibility.highContrast}
                    onValueChange={() => toggleAccessibility('highContrast')}
                />
            </View>

            <TouchableOpacity
                onPress={handleSignOut}
                className="flex-row items-center justify-center p-4 bg-red-50 rounded-xl border border-red-100 mb-8"
            >
                <LogOut size={20} color="#DC2626" className="mr-2" />
                <Text className="text-red-700 font-bold ml-2">{t('auth.logout')}</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}
