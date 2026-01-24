import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Search, Filter, X, UserPlus, Trash2, UserCheck, Ban, Copy, Check } from 'lucide-react-native';
import { getUsers, updateUserRole, blockUser, deleteUser, createUser } from '../services/apiService';
import { auth } from '../lib/firebase';

export default function UserManagement() {
    const [users, setUsers] = useState<any[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [createdCredentials, setCreatedCredentials] = useState<any>(null);

    // Create User Form
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newUserRole, setNewUserRole] = useState('official');
    const [newUserPhone, setNewUserPhone] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, [roleFilter]);

    useEffect(() => {
        filterUsers();
    }, [searchQuery, users]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await getUsers(roleFilter !== 'all' ? { role: roleFilter } : undefined);
            if (res.success && res.users) {
                setUsers(res.users);
            } else if (Array.isArray(res)) {
                setUsers(res);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterUsers = () => {
        let result = [...users];
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(u =>
                (u.displayName || u.name || '').toLowerCase().includes(query) ||
                (u.email || '').toLowerCase().includes(query)
            );
        }
        setFilteredUsers(result);
    };

    const handleCreateUser = async () => {
        if (!newUserEmail || !newUserName || !newUserRole) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        setIsCreating(true);
        try {
            const res = await createUser(newUserEmail, newUserName, newUserRole, newUserPhone);
            if (res.success && res.credentials) {
                setCreatedCredentials(res.credentials);
                setShowCreateModal(false);
                setShowCredentialsModal(true);
                fetchUsers();
                // Reset form
                setNewUserEmail('');
                setNewUserName('');
                setNewUserRole('official');
                setNewUserPhone('');
            } else {
                Alert.alert('Error', res.error || 'Failed to create user');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to create user');
        } finally {
            setIsCreating(false);
        }
    };

    const handleRoleUpdate = async (userId: string, newRole: string) => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return;

            await updateUserRole(userId, newRole, currentUser.uid, 'admin');
            Alert.alert('Success', 'User role updated');
            fetchUsers();
        } catch (error) {
            Alert.alert('Error', 'Failed to update user role');
        }
    };

    const handleBlockUser = async (user: any) => {
        const isBlocking = !user.blocked;

        if (isBlocking) {
            Alert.prompt(
                'Block User',
                'Please enter a reason for blocking this user:',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Block',
                        style: 'destructive',
                        onPress: async (reason) => {
                            try {
                                await blockUser(user.id, true, reason);
                                Alert.alert('Success', 'User blocked');
                                fetchUsers();
                            } catch (error) {
                                Alert.alert('Error', 'Failed to block user');
                            }
                        }
                    }
                ],
                'plain-text'
            );
        } else {
            // Unblocking doesn't need a reason
            try {
                await blockUser(user.id, false);
                Alert.alert('Success', 'User unblocked');
                fetchUsers();
            } catch (error) {
                Alert.alert('Error', 'Failed to unblock user');
            }
        }
    };

    const handleDeleteUser = async (userId: string) => {
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this user? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const currentUser = auth.currentUser;
                            if (!currentUser) return;
                            await deleteUser(userId, currentUser.uid, 'admin');
                            Alert.alert('Success', 'User deleted');
                            fetchUsers();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete user');
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: any }) => (
        <View className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-3">
            <View className="flex-row justify-between items-start mb-2">
                <View>
                    <Text className="font-bold text-gray-900 text-lg">{item.displayName || item.name || 'Unknown'}</Text>
                    <Text className="text-xs text-gray-500">{item.email}</Text>
                </View>
                <View className={`px-2 py-1 rounded-full ${item.role === 'admin' ? 'bg-purple-100' :
                    item.role === 'official' ? 'bg-green-100' :
                        item.role === 'analyst' ? 'bg-orange-100' : 'bg-blue-100'
                    }`}>
                    <Text className={`text-xs font-bold capitalize ${item.role === 'admin' ? 'text-purple-700' :
                        item.role === 'official' ? 'text-green-700' :
                            item.role === 'analyst' ? 'text-orange-700' : 'text-blue-700'
                        }`}>
                        {item.role}
                    </Text>
                </View>
            </View>

            <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-gray-100">
                <View className="flex-row">
                    <TouchableOpacity
                        onPress={() => {
                            Alert.alert('Update Role', 'Select new role', [
                                { text: 'Citizen', onPress: () => handleRoleUpdate(item.id, 'citizen') },
                                { text: 'Official', onPress: () => handleRoleUpdate(item.id, 'official') },
                                { text: 'Analyst', onPress: () => handleRoleUpdate(item.id, 'analyst') },
                                { text: 'Admin', onPress: () => handleRoleUpdate(item.id, 'admin') },
                                { text: 'Cancel', style: 'cancel' }
                            ]);
                        }}
                        className="mr-3"
                    >
                        <Text className="text-blue-600 font-bold">Change Role</Text>
                    </TouchableOpacity>
                </View>
                <View className="flex-row">
                    <TouchableOpacity
                        onPress={() => handleBlockUser(item)}
                        className="mr-3"
                    >
                        {item.blocked ? (
                            <UserCheck size={20} color="#15803D" />
                        ) : (
                            <Ban size={20} color="#B91C1C" />
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteUser(item.id)}>
                        <Trash2 size={20} color="#B91C1C" />
                    </TouchableOpacity>
                </View>
            </View>
            {item.blocked && (
                <Text className="text-xs text-red-600 mt-1">User is blocked</Text>
            )}
        </View>
    );

    return (
        <View className="flex-1 bg-gray-50 p-4">
            <View className="flex-row mb-4">
                <View className="flex-1 bg-white border border-gray-300 rounded-lg flex-row items-center px-3 mr-2">
                    <Search size={20} color="#9CA3AF" />
                    <TextInput
                        className="flex-1 ml-2 py-2"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                <TouchableOpacity
                    onPress={() => setShowCreateModal(true)}
                    className="bg-[#0077B6] rounded-lg p-3 justify-center"
                >
                    <UserPlus size={20} color="#FFF" />
                </TouchableOpacity>
            </View>

            <View className="flex-row mb-4">
                {['all', 'citizen', 'official', 'admin', 'analyst'].map(role => (
                    <TouchableOpacity
                        key={role}
                        onPress={() => setRoleFilter(role)}
                        className={`mr-2 px-3 py-1 rounded-full ${roleFilter === role ? 'bg-[#0077B6]' : 'bg-gray-200'}`}
                    >
                        <Text className={`${roleFilter === role ? 'text-white' : 'text-gray-700'} capitalize`}>{role}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#0077B6" />
            ) : (
                <FlatList
                    data={filteredUsers}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    ListEmptyComponent={<Text className="text-center text-gray-500 mt-10">No users found</Text>}
                />
            )}

            {/* Create User Modal */}
            <Modal visible={showCreateModal} animationType="slide" transparent={true}>
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl p-6">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-xl font-bold">Create New User</Text>
                            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                                <X size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <Text className="mb-1 font-bold text-gray-700">Full Name *</Text>
                        <TextInput
                            className="border border-gray-300 rounded-lg p-3 mb-3"
                            placeholder="John Doe"
                            value={newUserName}
                            onChangeText={setNewUserName}
                        />

                        <Text className="mb-1 font-bold text-gray-700">Email *</Text>
                        <TextInput
                            className="border border-gray-300 rounded-lg p-3 mb-3"
                            placeholder="user@example.com"
                            value={newUserEmail}
                            onChangeText={setNewUserEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />

                        <Text className="mb-1 font-bold text-gray-700">Role *</Text>
                        <View className="flex-row flex-wrap mb-3">
                            {['citizen', 'official', 'analyst', 'admin'].map(role => (
                                <TouchableOpacity
                                    key={role}
                                    onPress={() => setNewUserRole(role)}
                                    className={`mr-2 mb-2 px-3 py-2 rounded-lg border ${newUserRole === role ? 'bg-blue-50 border-blue-500' : 'border-gray-300'}`}
                                >
                                    <Text className={`capitalize ${newUserRole === role ? 'text-blue-700 font-bold' : 'text-gray-700'}`}>{role}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text className="mb-1 font-bold text-gray-700">Phone (Optional)</Text>
                        <TextInput
                            className="border border-gray-300 rounded-lg p-3 mb-4"
                            placeholder="Phone Number"
                            value={newUserPhone}
                            onChangeText={setNewUserPhone}
                            keyboardType="phone-pad"
                        />

                        <TouchableOpacity
                            onPress={handleCreateUser}
                            disabled={isCreating}
                            className={`bg-[#0077B6] p-4 rounded-xl items-center ${isCreating ? 'opacity-70' : ''}`}
                        >
                            {isCreating ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text className="text-white font-bold text-lg">Create User</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Credentials Modal */}
            <Modal visible={showCredentialsModal} animationType="fade" transparent={true}>
                <View className="flex-1 justify-center items-center bg-black/50 p-4">
                    <View className="bg-white rounded-xl p-6 w-full max-w-sm">
                        <Text className="text-xl font-bold mb-2 text-center">User Created!</Text>
                        <Text className="text-gray-600 mb-4 text-center">Please copy these credentials. They will not be shown again.</Text>

                        <View className="bg-gray-100 p-4 rounded-lg mb-4">
                            <Text className="text-xs text-gray-500 mb-1">Email</Text>
                            <Text className="font-mono mb-2">{createdCredentials?.email}</Text>
                            <Text className="text-xs text-gray-500 mb-1">Password</Text>
                            <Text className="font-mono">{createdCredentials?.password}</Text>
                        </View>

                        <TouchableOpacity
                            onPress={() => setShowCredentialsModal(false)}
                            className="bg-[#0077B6] p-3 rounded-lg items-center"
                        >
                            <Text className="text-white font-bold">Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
