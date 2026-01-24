import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { FileText, CheckCircle, HandHeart, AlertTriangle } from 'lucide-react-native';
import { DashboardCard } from '../components/DashboardCard';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

export default function CitizenDashboard() {
    const { t } = useTranslation();
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(auth.currentUser);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
            setUser(u);
        });
        return unsubscribeAuth;
    }, []);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const reportsQuery = query(
            collection(db, 'reports'),
            where('userId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(reportsQuery, (snapshot) => {
            const reportsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setReports(reportsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching reports:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const verifiedCount = reports.filter(r => r.verified).length;
    const activeAlerts = reports.filter(r => r.severity === 'critical' || r.severity === 'high').length;

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-gray-50">
                <ActivityIndicator size="large" color="#0077B6" />
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-gray-50 p-4">
            <Animated.Text
                entering={FadeInDown.delay(100).duration(500)}
                className="text-2xl font-bold text-gray-900 mb-6"
            >
                {t('dashboard.welcome')}, {user?.displayName || 'Citizen'}
            </Animated.Text>

            <View className="flex-row flex-wrap justify-between">
                <Animated.View entering={FadeInDown.delay(200).duration(500)} className="w-[48%]">
                    <DashboardCard
                        title={t('nav.reports')}
                        value={reports.length}
                        description="Total Submitted"
                        icon={FileText}
                        trend={{ value: 12, isPositive: true }}
                    />
                </Animated.View>
                <Animated.View entering={FadeInDown.delay(300).duration(500)} className="w-[48%]">
                    <DashboardCard
                        title="Verified"
                        value={verifiedCount}
                        description="Successfully Verified"
                        icon={CheckCircle}
                    />
                </Animated.View>
                <Animated.View entering={FadeInDown.delay(400).duration(500)} className="w-[48%]">
                    <DashboardCard
                        title="Donated"
                        value="₹0"
                        description="Your Contributions"
                        icon={HandHeart}
                        trend={{ value: 25, isPositive: true }}
                    />
                </Animated.View>
                <Animated.View entering={FadeInDown.delay(500).duration(500)} className="w-[48%]">
                    <DashboardCard
                        title={t('dashboard.activeAlerts')}
                        value={activeAlerts}
                        description="Active in Area"
                        icon={AlertTriangle}
                    />
                </Animated.View>
            </View>

            <View className="mt-6">
                <Animated.Text
                    entering={FadeInUp.delay(600).duration(500)}
                    className="text-lg font-semibold text-gray-900 mb-3"
                >
                    {t('dashboard.recentReports')}
                </Animated.Text>
                {reports.length === 0 ? (
                    <Animated.View entering={FadeInUp.delay(700).duration(500)} className="bg-white p-6 rounded-xl border border-gray-100 items-center">
                        <Text className="text-gray-400">No reports yet</Text>
                    </Animated.View>
                ) : (
                    reports.slice(0, 3).map((report, index) => (
                        <Animated.View
                            key={report.id}
                            entering={FadeInUp.delay(700 + (index * 100)).duration(500)}
                            className="bg-white p-4 rounded-xl border border-gray-100 mb-3 shadow-sm"
                        >
                            <View className="flex-row justify-between items-start mb-2">
                                <Text className="font-semibold text-gray-800">{report.type || 'Hazard Report'}</Text>
                                <View className={`px-2 py-1 rounded-full ${report.verified ? 'bg-green-100' : 'bg-yellow-100'}`}>
                                    <Text className={`text-xs font-medium ${report.verified ? 'text-green-700' : 'text-yellow-700'}`}>
                                        {report.verified ? 'Verified' : 'Pending'}
                                    </Text>
                                </View>
                            </View>
                            <Text className="text-gray-500 text-sm mb-2" numberOfLines={2}>{report.description}</Text>
                            <Text className="text-xs text-gray-400">
                                {report.locationName || 'Location not specified'}
                            </Text>
                        </Animated.View>
                    ))
                )}
            </View>
        </ScrollView>
    );
}
