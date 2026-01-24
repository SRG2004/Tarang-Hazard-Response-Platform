import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { registerVolunteer } from '../services/apiService';
import { auth } from '../lib/firebase';
import { useNavigation } from '@react-navigation/native';

export default function VolunteerRegistration() {
    const navigation = useNavigation();
    const [name, setName] = useState(auth.currentUser?.displayName || '');
    const [email, setEmail] = useState(auth.currentUser?.email || '');
    const [phone, setPhone] = useState('');
    const [skills, setSkills] = useState('');
    const [availability, setAvailability] = useState('');
    const [experience, setExperience] = useState('');
    const [location, setLocation] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!name || !email || !phone || !location) {
            Alert.alert('Error', 'Please fill in all required fields (Name, Email, Phone, Location)');
            return;
        }

        setLoading(true);
        try {
            const volunteerData = {
                userId: auth.currentUser?.uid,
                userName: name,
                userEmail: email,
                phone,
                location,
                skills: skills.split(',').map(s => s.trim()).filter(s => s),
                availability,
                experience,
                status: 'active',
                joinedAt: new Date().toISOString()
            };

            await registerVolunteer(volunteerData);
            Alert.alert('Success', 'Registration submitted successfully!');
            navigation.goBack();
        } catch (error: any) {
            console.error('Error registering volunteer:', error);
            Alert.alert('Error', 'Failed to register: ' + (error.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Volunteer Registration</Text>
            <Text style={styles.subtitle}>Join us in helping the community.</Text>

            <View style={styles.form}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter your name" />

                <Text style={styles.label}>Email *</Text>
                <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Enter your email" keyboardType="email-address" />

                <Text style={styles.label}>Phone *</Text>
                <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Enter your phone number" keyboardType="phone-pad" />

                <Text style={styles.label}>Location *</Text>
                <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="City, Area" />

                <Text style={styles.label}>Skills (comma separated)</Text>
                <TextInput style={styles.input} value={skills} onChangeText={setSkills} placeholder="First Aid, Swimming, Driving..." multiline />

                <Text style={styles.label}>Availability</Text>
                <TextInput style={styles.input} value={availability} onChangeText={setAvailability} placeholder="Weekends, Evenings, On-call..." />

                <Text style={styles.label}>Experience</Text>
                <TextInput style={styles.input} value={experience} onChangeText={setExperience} placeholder="Previous volunteering experience..." multiline />

                <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Register</Text>
                    )}
                </TouchableOpacity>
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
        marginBottom: 10,
        color: '#0077B6',
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 30,
        color: '#666',
    },
    form: {
        gap: 15,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 5,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    button: {
        backgroundColor: '#0077B6',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
