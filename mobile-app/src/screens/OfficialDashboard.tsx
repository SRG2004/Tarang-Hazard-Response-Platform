import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { FileText, CheckCircle, AlertTriangle, Users, TrendingUp, HandHeart } from 'lucide-react-native';
import { DashboardCard } from '../components/DashboardCard';
import { getReports, getVolunteers, getDonations, verifyReport } from '../services/apiService';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function OfficialDashboard() {
    const [reports, setReports] = useState<any[]>([]);
    const [volunteers, setVolunteers] = useState<any[]>([]);
    const [donations, setDonations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string>('official');

    useEffect(() => {
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

                const [reportsRes, volunteersRes, donationsRes] = await Promise.all([
                    getReports(),
                    getVolunteers(),
                    getDonations(),
                ]);

                if (reportsRes.reports) setReports(reportsRes.reports);
                if (volunteersRes.volunteers) setVolunteers(volunteersRes.volunteers);
                if (donationsRes.donations) setDonations(donationsRes.donations);

            } catch (error) {
                console.error('Error fetching dashboard data:', error);
                Alert.alert('Error', 'Failed to fetch dashboard data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleApproveReport = async (reportId: string) => {
        try {
            const user = auth.currentUser;
            if (!user) return;
            await verifyReport(reportId, user.uid, userRole);
            Alert.alert('Success', 'Report approved');
            setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'verified', verified: true } : r));
        } catch (error) {
            Alert.alert('Error', 'Failed to approve report');
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#0077B6" />
            </View>
        );
    }

    const activeReports = reports.filter(r => r.status === 'pending' || r.status === 'verified');
    const pendingReports = reports.filter(r => r.status === 'pending');
    const criticalReports = reports.filter(r => r.severity === 'critical');

    return (
        <ScrollView className="flex-1 bg-gray-50 p-4">
            <Text className="text-2xl font-bold mb-6 text-gray-900">Official Dashboard</Text>

            <View className="flex-row flex-wrap justify-between">
                <View className="w-[48%] mb-4">
                    <DashboardCard
                        title="Active Reports"
                        value={activeReports.length}
                        icon={FileText}
                        trend={{ value: 8, isPositive: true }}
                    />
                </View>
                <View className="w-[48%] mb-4">
                    <DashboardCard
                        title="Pending"
                        value={pendingReports.length}
                        icon={CheckCircle}
                        trend={{ value: 5, isPositive: false }}
                    />
                </View>
                <View className="w-[48%] mb-4">
                    <DashboardCard
                        title="Critical"
                        value={criticalReports.length}
                        icon={AlertTriangle}
                    />
                </View>
                <View className="w-[48%] mb-4">
                    <DashboardCard
                        title="Volunteers"
                        value={volunteers.length}
                        icon={Users}
                        trend={{ value: 15, isPositive: true }}
                    />
                </View>
            </View>

            <Text className="text-xl font-bold mb-4 text-gray-900 mt-2">Pending Approvals</Text>
            {pendingReports.length === 0 ? (
                <Text className="text-gray-500 italic">No pending reports.</Text>
            ) : (
                pendingReports.slice(0, 5).map(report => (
                    <View key={report.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-3">
                        <View className="flex-row justify-between items-start mb-2">
                            <View className="flex-1 mr-2">
                                <Text className="font-bold text-gray-900 text-lg">{report.type || 'Hazard'}</Text>
                                <Text className="text-gray-500 text-xs">{new Date(report.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()}</Text>
                            </View>
                            <View className={`px-2 py-1 rounded-full ${report.severity === 'critical' ? 'bg-red-100' : 'bg-orange-100'}`}>
                                <Text className={`text-xs font-bold ${report.severity === 'critical' ? 'text-red-700' : 'text-orange-700'} capitalize`}>
                                    {report.severity || 'Medium'}
                                </Text>
                            </View>
                        </View>
                        <Text className="text-gray-700 mb-3">{report.description}</Text>
                        <TouchableOpacity
                            onPress={() => handleApproveReport(report.id)}
                            className="bg-green-600 py-2 rounded-lg items-center"
                        >
                            <Text className="text-white font-bold">Approve Report</Text>
                        </TouchableOpacity>
                    </View>
                ))
            )}
        </ScrollView>
    );
}
