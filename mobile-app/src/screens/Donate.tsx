import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { createDonation } from '../services/apiService';
import { auth } from '../lib/firebase';
import { useNavigation } from '@react-navigation/native';

export default function Donate() {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const [amount, setAmount] = useState('');
    const [donorName, setDonorName] = useState(auth.currentUser?.displayName || '');
    const [email, setEmail] = useState(auth.currentUser?.email || '');
    const [phone, setPhone] = useState('');
    const [pan, setPan] = useState('');
    const [loading, setLoading] = useState(false);

    const handleDonate = async () => {
        if (!amount || !donorName || !email || !phone) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            const donationData = {
                userId: auth.currentUser?.uid,
                donorName,
                email,
                phone,
                pan,
                amount: parseFloat(amount),
                currency: 'INR',
                status: 'initiated',
                paymentMethod: 'upi', // Default for now
                createdAt: new Date().toISOString()
            };

            await createDonation(donationData);

            // Open external payment link or show instructions
            Linking.openURL('https://www.incois.gov.in/portal/donation');

            Alert.alert('Success', 'Donation initiated! Please complete payment on the portal.');
            navigation.goBack();
        } catch (error: any) {
            console.error('Error creating donation:', error);
            Alert.alert('Error', 'Failed to initiate donation: ' + (error.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>{t('donate.title')}</Text>
            <Text style={styles.text}>
                {t('donate.subtitle')}
            </Text>

            <View style={styles.form}>
                <Text style={styles.label}>Amount (INR) *</Text>
                <TextInput
                    style={styles.input}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="Enter amount"
                    keyboardType="numeric"
                />

                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                    style={styles.input}
                    value={donorName}
                    onChangeText={setDonorName}
                    placeholder="Enter your name"
                />

                <Text style={styles.label}>Email *</Text>
                <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    keyboardType="email-address"
                />

                <Text style={styles.label}>Phone *</Text>
                <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Enter your phone number"
                    keyboardType="phone-pad"
                />

                <Text style={styles.label}>PAN (Optional)</Text>
                <TextInput
                    style={styles.input}
                    value={pan}
                    onChangeText={setPan}
                    placeholder="For tax exemption"
                    autoCapitalize="characters"
                />

                <TouchableOpacity style={styles.button} onPress={handleDonate} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>{t('donate.button')}</Text>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('donate.bankTransfer')}</Text>
                <View style={styles.row}>
                    <Text style={styles.label}>{t('donate.bankName')}:</Text>
                    <Text style={styles.value}>State Bank of India</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>{t('donate.accountName')}:</Text>
                    <Text style={styles.value}>Tarang Relief Fund</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>{t('donate.accountNo')}:</Text>
                    <Text style={styles.value}>1234567890</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>{t('donate.ifsc')}:</Text>
                    <Text style={styles.value}>SBIN0001234</Text>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('donate.upi')}</Text>
                <View style={styles.qrPlaceholder}>
                    <Text style={{ color: '#666' }}>{t('donate.qrPlaceholder')}</Text>
                </View>
                <Text style={styles.upiId}>UPI ID: tarang@sbi</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#0077B6',
    },
    text: {
        fontSize: 16,
        marginBottom: 20,
        color: '#333',
        lineHeight: 24,
    },
    form: {
        marginBottom: 30,
        gap: 15,
    },
    card: {
        backgroundColor: '#f9f9f9',
        padding: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#eee',
        marginBottom: 20,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    button: {
        backgroundColor: '#0077B6',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    label: {
        color: '#666',
        fontWeight: '500',
        fontSize: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    value: {
        color: '#333',
        fontWeight: 'bold',
    },
    qrPlaceholder: {
        height: 200,
        backgroundColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        borderRadius: 8,
    },
    upiId: {
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 16,
        color: '#333',
    },
});
