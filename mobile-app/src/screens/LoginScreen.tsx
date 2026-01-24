import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Linking } from 'react-native';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Button, Toast } from '@ant-design/react-native';
import { getUserProfile } from '../services/apiService';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Toast.fail('Please enter email and password');
            return;
        }

        setLoading(true);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Check user role
            try {
                const profile = await getUserProfile(user.uid);
                if (profile && profile.role === 'analyst') {
                    Alert.alert(
                        'Access Restricted',
                        'Analyst accounts are optimized for desktop use. Please login from the web application.',
                        [{ text: 'OK', onPress: () => signOut(auth) }]
                    );
                    await signOut(auth);
                    return;
                }
            } catch (profileError) {
                console.warn('Could not fetch user profile, proceeding with login...', profileError);
                // Optional: Decide if you want to block login if profile fetch fails. 
                // For now, we allow it to avoid blocking valid users if API is down, 
                // but strictly speaking we might want to block.
            }

            Toast.success('Logged in successfully');
        } catch (error: any) {
            console.error(error);
            Toast.fail(error.message || 'Login failed');
            Alert.alert('Login Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 justify-center p-6 bg-white">
            <Text className="text-3xl font-bold text-center mb-8 text-blue-600">
                Tarang Login
            </Text>

            <View className="mb-4">
                <Text className="text-gray-600 mb-2">Email</Text>
                <TextInput
                    className="border border-gray-300 rounded-lg p-3 bg-gray-50"
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />
            </View>

            <View className="mb-6">
                <Text className="text-gray-600 mb-2">Password</Text>
                <TextInput
                    className="border border-gray-300 rounded-lg p-3 bg-gray-50"
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
            </View>

            <Button
                type="primary"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
            >
                Sign In
            </Button>

            <TouchableOpacity
                onPress={() => Linking.openURL('https://tarang-incois.web.app')}
                className="mt-4"
            >
                <Text className="text-center text-blue-600">
                    Don't have an account? Register on Web
                </Text>
            </TouchableOpacity>
        </View>
    );
}
