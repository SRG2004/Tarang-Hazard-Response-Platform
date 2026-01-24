import React, { useEffect, useState } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, Text, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CitizenDashboard from '../screens/CitizenDashboard';
import OfficialDashboard from '../screens/OfficialDashboard';
import AdminDashboard from '../screens/AdminDashboard';
import ReportHazard from '../screens/ReportHazard';
import MapViewScreen from '../screens/MapView';
import EmergencyContacts from '../screens/EmergencyContacts';
import Settings from '../screens/Settings';
import ReportsManagement from '../screens/ReportsManagement';
import FlashSMSAlert from '../screens/FlashSMSAlert';
import ChatBotScreen from '../screens/ChatBotScreen';

import SocialMediaVerification from '../screens/SocialMediaVerification';
import Fisherman from '../screens/Fisherman';
import FishermanManagement from '../screens/FishermanManagement';
import VolunteerManagement from '../screens/VolunteerManagement';
import DonationManagement from '../screens/DonationManagement';
import UserManagement from '../screens/UserManagement';
import HazardDrills from '../screens/HazardDrills';
import VolunteerRegistration from '../screens/VolunteerRegistration';
import Donate from '../screens/Donate';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

const Drawer = createDrawerNavigator();

export default function SidebarNavigator() {
    const { t } = useTranslation();
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            setLoading(false);
            return;
        }

        const loadRole = async () => {
            try {
                // Try to get from cache first
                const cachedRole = await AsyncStorage.getItem(`user_role_${user.uid}`);
                if (cachedRole) {
                    console.log("Loaded role from cache:", cachedRole);
                    setRole(cachedRole);
                }
            } catch (e) {
                console.warn("Error loading role from cache:", e);
            }
        };

        loadRole();

        console.log("Fetching role for user:", user.uid);
        const docRef = doc(db, 'users', user.uid);

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const userData = docSnap.data();
                console.log("User role updated:", userData.role);
                setRole(userData.role);
                // Cache the role
                AsyncStorage.setItem(`user_role_${user.uid}`, userData.role).catch(e => console.warn("Error caching role:", e));
            } else {
                console.log("No user document found");
                setRole(null);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching role:", error);
            // If error (e.g. offline), we rely on the cached value loaded earlier
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0077B6" />
            </View>
        );
    }

    const getDashboardComponent = () => {
        switch (role) {
            case 'admin': return AdminDashboard;
            case 'official': return OfficialDashboard;
            default: return CitizenDashboard;
        }
    };



    const isCitizen = role === 'citizen';
    const isOfficial = role === 'official';
    const isAdmin = role === 'admin';

    return (
        <Drawer.Navigator
            screenOptions={{
                headerShown: true,
                drawerStyle: { backgroundColor: '#fff' },
                headerStyle: { backgroundColor: '#0077B6' },
                headerTintColor: '#fff',
            }}
        >
            {/* Common to all (or handled by Dashboard component) */}
            <Drawer.Screen name="Dashboard" component={getDashboardComponent()} options={{ title: t('nav.dashboard') }} />

            {/* CITIZEN */}
            {isCitizen && (
                <>
                    <Drawer.Screen name="ReportHazard" component={ReportHazard} options={{ title: t('nav.reportHazard') }} />
                    <Drawer.Screen name="MapView" component={MapViewScreen} options={{ title: t('nav.mapView') }} />
                    <Drawer.Screen name="Fisherman" component={Fisherman} options={{ title: t('nav.fisherman') }} />
                    <Drawer.Screen name="HazardDrills" component={HazardDrills} options={{ title: t('nav.hazardDrills') }} />
                    <Drawer.Screen name="EmergencyContacts" component={EmergencyContacts} options={{ title: t('nav.emergencyContacts') }} />
                    <Drawer.Screen name="VolunteerRegistration" component={VolunteerRegistration} options={{ title: t('nav.volunteerRegistration') }} />
                    <Drawer.Screen name="Donate" component={Donate} options={{ title: t('nav.donate') }} />
                </>
            )}

            {/* OFFICIAL */}
            {isOfficial && (
                <>
                    <Drawer.Screen name="MapView" component={MapViewScreen} options={{ title: t('nav.mapView') }} />
                    <Drawer.Screen name="ReportsManagement" component={ReportsManagement} options={{ title: t('nav.reports') }} />
                    <Drawer.Screen name="SocialMediaVerification" component={SocialMediaVerification} options={{ title: t('nav.verifyPosts') }} />
                    <Drawer.Screen name="FlashSMSAlert" component={FlashSMSAlert} options={{ title: t('nav.flashSms') }} />
                    <Drawer.Screen name="FishermanManagement" component={FishermanManagement} options={{ title: t('nav.manageFisherman') }} />
                    <Drawer.Screen name="HazardDrills" component={HazardDrills} options={{ title: t('nav.hazardDrills') }} />
                    <Drawer.Screen name="EmergencyContacts" component={EmergencyContacts} options={{ title: t('nav.emergencyContacts') }} />
                    <Drawer.Screen name="VolunteerManagement" component={VolunteerManagement} options={{ title: t('nav.manageVolunteers') }} />
                    <Drawer.Screen name="DonationManagement" component={DonationManagement} options={{ title: t('nav.manageDonations') }} />
                </>
            )}

            {/* ADMIN */}
            {isAdmin && (
                <>
                    <Drawer.Screen name="ReportsManagement" component={ReportsManagement} options={{ title: t('nav.reports') }} />
                    <Drawer.Screen name="SocialMediaVerification" component={SocialMediaVerification} options={{ title: t('nav.verifyPosts') }} />
                    <Drawer.Screen name="FlashSMSAlert" component={FlashSMSAlert} options={{ title: t('nav.flashSms') }} />
                    <Drawer.Screen name="FishermanManagement" component={FishermanManagement} options={{ title: t('nav.manageFisherman') }} />
                    <Drawer.Screen name="UserManagement" component={UserManagement} options={{ title: t('nav.manageUsers') }} />
                    <Drawer.Screen name="HazardDrills" component={HazardDrills} options={{ title: t('nav.hazardDrills') }} />
                    <Drawer.Screen name="EmergencyContacts" component={EmergencyContacts} options={{ title: t('nav.emergencyContacts') }} />
                    <Drawer.Screen name="DonationManagement" component={DonationManagement} options={{ title: t('nav.manageDonations') }} />
                </>
            )}

            {/* Common Footer Items */}
            <Drawer.Screen name="ChatBot" component={ChatBotScreen} options={{ title: t('nav.chatBot') }} />
            <Drawer.Screen name="Settings" component={Settings} options={{ title: t('nav.settings') }} />
        </Drawer.Navigator>
    );
}
