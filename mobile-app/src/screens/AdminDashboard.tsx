import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Users, FileText, HandHeart, Activity, CheckCircle, XCircle } from 'lucide-react-native';
import { DashboardCard } from '../components/DashboardCard';
import { getDashboardAnalytics, getUsers, getReports, verifyReport, rejectReport, solveReport } from '../services/apiService';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string>('admin');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const user = auth.currentUser;
                if (user) {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        setUserRole(userDoc.data().role || 'admin');
                    }
                }

                const [statsRes, usersRes, reportsRes] = await Promise.all([
                    getDashboardAnalytics(),
                    getUsers(),
                    getReports(),
                ]);

                if (statsRes.success) setStats(statsRes.analytics);
                if (usersRes.success) setUsers(usersRes.users);
                if (reportsRes.success) setReports(reportsRes.reports);

            } catch (error) {
                console.error('Error fetching admin data:', error);
                Alert.alert('Error', 'Failed to fetch admin data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleAction = async (action: 'approve' | 'reject' | 'solve', reportId: string) => {
        const user = auth.currentUser;
        if (!user) return;

        try {
            if (action === 'approve') {
                await verifyReport(reportId, user.uid, userRole);
                Alert.alert('Success', 'Report approved');
            } else if (action === 'reject') {
                await rejectReport(reportId, user.uid, userRole, 'Rejected by admin'); // Simplified for mobile
                Alert.alert('Success', 'Report rejected');
            } else if (action === 'solve') {
                await solveReport(reportId, user.uid, userRole, 'Solved by admin');
                Alert.alert('Success', 'Report solved');
            }

            // Update local state
            setReports(prev => prev.map(r => {
                if (r.id !== reportId) return r;
                return {
                    ...r,
                    status: action === 'approve' ? 'verified' : action === 'reject' ? 'rejected' : 'solved',
                    verified: action === 'approve' || action === 'solve'
                };
            }));
        } catch (error) {
            Alert.alert('Error', `Failed to ${action} report`);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#0077B6" />
            </View>
        );
    }

    const pendingReports = reports.filter(r => r.status === 'pending');

    return (
        <ScrollView className="flex-1 bg-gray-50 p-4">
            <Text className="text-2xl font-bold mb-6 text-gray-900">Admin Dashboard</Text>

            <View className="flex-row flex-wrap justify-between">
                <View className="w-[48%] mb-4">
                    <DashboardCard
                        title="Total Users"
                        value={users.length}
                        icon={Users}
                    />
                </View>
                <View className="w-[48%] mb-4">
                    <DashboardCard
                        title="Total Reports"
                        value={stats?.reports?.total || reports.length}
                        icon={FileText}
                    />
                </View>
                <View className="w-[48%] mb-4">
                    <DashboardCard
                        title="Donations"
                        value={`₹${(stats?.donations?.totalAmount || 0).toLocaleString()}`}
                        icon={HandHeart}
                    />
                </View>
                <View className="w-[48%] mb-4">
                    <DashboardCard
                        title="Volunteers"
                        value={stats?.volunteers?.active || 0}
                        icon={Activity}
                    />
                </View>
            </View>

            <Text className="text-xl font-bold mb-4 text-gray-900 mt-2">Report Management</Text>
            {pendingReports.length === 0 ? (
                <Text className="text-gray-500 italic">No pending reports.</Text>
            ) : (
                pendingReports.slice(0, 10).map(report => (
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

                        <View className="flex-row justify-between mt-2">
                            <TouchableOpacity
                                onPress={() => handleAction('approve', report.id)}
                                className="bg-green-100 p-2 rounded-lg flex-1 mr-2 items-center"
                            >
                                <Text className="text-green-700 font-bold text-xs">Approve</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleAction('reject', report.id)}
                                className="bg-red-100 p-2 rounded-lg flex-1 mr-2 items-center"
                            >
                                <Text className="text-red-700 font-bold text-xs">Reject</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleAction('solve', report.id)}
                                className="bg-blue-100 p-2 rounded-lg flex-1 items-center"
                            >
                                <Text className="text-blue-700 font-bold text-xs">Solve</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))
            )}
        </ScrollView>
    );
}
