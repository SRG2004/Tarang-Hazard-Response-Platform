import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, Switch } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Camera, MapPin, Upload, X, Navigation } from 'lucide-react-native';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../lib/firebase';
import { useNavigation } from '@react-navigation/native';
import { createReport } from '../services/apiService';
import { offlineSyncService } from '../services/offlineSyncService';
import { serverTimestamp } from 'firebase/firestore';

export default function ReportHazard() {
    const navigation = useNavigation();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [hazardType, setHazardType] = useState('');
    const [severity, setSeverity] = useState('medium');
    const [image, setImage] = useState<string | null>(null);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [manualLocation, setManualLocation] = useState('');
    const [useManualLocation, setUseManualLocation] = useState(false);
    const [loading, setLoading] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);

    const hazardTypes = ['tsunami', 'stormSurge', 'highWaves', 'swellSurge', 'coastalFlooding', 'abnormalTide', 'coastalDamage', 'other'];
    const severities = ['low', 'medium', 'high', 'critical'];

    useEffect(() => {
        if (!useManualLocation) {
            (async () => {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission to access location was denied');
                    return;
                }
                setLocationLoading(true);
                try {
                    const location = await Location.getCurrentPositionAsync({});
                    setLocation(location);
                } catch (error) {
                    console.error("Error getting location:", error);
                    Alert.alert('Error', 'Failed to get current location');
                } finally {
                    setLocationLoading(false);
                }
            })();
        }
    }, [useManualLocation]);

    const pickImage = async () => {
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const submitReport = async () => {
        if (!hazardType || !description) {
            Alert.alert('Error', 'Please fill in required fields (Type, Description)');
            return;
        }

        if (!useManualLocation && !location) {
            Alert.alert('Error', 'Location is required. Please enable GPS or use manual location.');
            return;
        }

        if (useManualLocation && !manualLocation) {
            Alert.alert('Error', 'Please enter a manual location address.');
            return;
        }

        setLoading(true);
        try {
            let photoURL = null;
            if (image) {
                const response = await fetch(image);
                const blob = await response.blob();
                const filename = `reports/${auth.currentUser?.uid}/${Date.now()}_photo.jpg`;
                const storageRef = ref(storage, filename);
                await uploadBytes(storageRef, blob);
                photoURL = await getDownloadURL(storageRef);
            }

            // Prepare flat data structure to match Web App
            const reportData = {
                userId: auth.currentUser?.uid,
                userName: auth.currentUser?.displayName || 'Anonymous',
                userEmail: auth.currentUser?.email,
                type: hazardType,
                title: title || hazardType,
                description,
                latitude: useManualLocation ? null : location?.coords.latitude,
                longitude: useManualLocation ? null : location?.coords.longitude,
                location: useManualLocation ? manualLocation : (location ? `${location.coords.latitude}, ${location.coords.longitude}` : null),
                severity,
                // Files handling for offline queue
                photoFile: image,
                photoFileName: image ? 'photo.jpg' : null,
                photoURL: null, // Will be set during sync
                videoURL: null,
                status: 'pending',
                verified: false,
                source: 'crowdsourced',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            const isOnline = await offlineSyncService.isOnline();

            if (!isOnline) {
                // Queue for offline sync
                await offlineSyncService.queueRequest('report', 'POST', 'reports', reportData);
                Alert.alert('Offline Mode', 'Report saved offline. It will be sent when you are back online.');
            } else {
                // Online submission
                let photoURL = null;
                if (image) {
                    const response = await fetch(image);
                    const blob = await response.blob();
                    const filename = `reports/${auth.currentUser?.uid}/${Date.now()}_photo.jpg`;
                    const storageRef = ref(storage, filename);
                    await uploadBytes(storageRef, blob);
                    photoURL = await getDownloadURL(storageRef);
                }
                reportData.photoURL = photoURL;
                // Clean up offline-only fields before sending to Firestore
                delete (reportData as any).photoFile;
                delete (reportData as any).photoFileName;

                await createReport(reportData);
                Alert.alert('Success', 'Report submitted successfully');
            }

            navigation.goBack();
        } catch (error: any) {
            console.error("Error submitting report:", error);
            Alert.alert('Error', 'Failed to submit report: ' + (error.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView className="flex-1 bg-white p-4">
            <Text className="text-2xl font-bold mb-6 text-gray-900">Report Hazard</Text>

            <Text className="text-sm font-medium text-gray-700 mb-2">Hazard Type *</Text>
            <View className="flex-row flex-wrap mb-4">
                {hazardTypes.map((type) => (
                    <TouchableOpacity
                        key={type}
                        onPress={() => setHazardType(type)}
                        className={`mr-2 mb-2 px-4 py-2 rounded-full border ${hazardType === type ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
                            }`}
                    >
                        <Text className={hazardType === type ? 'text-white' : 'text-gray-700 capitalize'}>
                            {type.replace(/([A-Z])/g, ' $1').trim()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text className="text-sm font-medium text-gray-700 mb-2">Severity</Text>
            <View className="flex-row flex-wrap mb-4">
                {severities.map((sev) => (
                    <TouchableOpacity
                        key={sev}
                        onPress={() => setSeverity(sev)}
                        className={`mr-2 mb-2 px-4 py-2 rounded-full border ${severity === sev
                            ? (sev === 'critical' ? 'bg-red-600 border-red-600' : sev === 'high' ? 'bg-orange-500 border-orange-500' : 'bg-blue-600 border-blue-600')
                            : 'bg-white border-gray-300'
                            }`}
                    >
                        <Text className={severity === sev ? 'text-white' : 'text-gray-700 capitalize'}>
                            {sev}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text className="text-sm font-medium text-gray-700 mb-2">Title (Optional)</Text>
            <TextInput
                className="border border-gray-300 rounded-lg p-3 mb-4 text-gray-900"
                placeholder="Brief title..."
                value={title}
                onChangeText={setTitle}
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">Description *</Text>
            <TextInput
                className="border border-gray-300 rounded-lg p-3 mb-4 h-32 text-gray-900"
                multiline
                placeholder="Describe the hazard..."
                value={description}
                onChangeText={setDescription}
                textAlignVertical="top"
            />

            <View className="flex-row justify-between items-center mb-2">
                <Text className="text-sm font-medium text-gray-700">Location *</Text>
                <View className="flex-row items-center">
                    <Text className="text-xs text-gray-500 mr-2">Manual Entry</Text>
                    <Switch value={useManualLocation} onValueChange={setUseManualLocation} />
                </View>
            </View>

            {useManualLocation ? (
                <TextInput
                    className="border border-gray-300 rounded-lg p-3 mb-4 text-gray-900"
                    placeholder="Enter address or location description..."
                    value={manualLocation}
                    onChangeText={setManualLocation}
                />
            ) : (
                <View className="flex-row items-center mb-4 bg-gray-50 p-3 rounded-lg">
                    <MapPin size={20} color="#666" />
                    <Text className="ml-2 text-gray-600 flex-1">
                        {locationLoading ? 'Fetching location...' : location
                            ? `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`
                            : 'Location not available'}
                    </Text>
                    <TouchableOpacity onPress={() => setUseManualLocation(false)}>
                        <Navigation size={20} color="#0077B6" />
                    </TouchableOpacity>
                </View>
            )}

            <Text className="text-sm font-medium text-gray-700 mb-2">Photo Evidence</Text>
            {image ? (
                <View className="mb-6 relative">
                    <Image source={{ uri: image }} className="w-full h-48 rounded-lg" />
                    <TouchableOpacity
                        onPress={() => setImage(null)}
                        className="absolute top-2 right-2 bg-black/50 p-1 rounded-full"
                    >
                        <X size={20} color="white" />
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity
                    onPress={pickImage}
                    className="border-2 border-dashed border-gray-300 rounded-lg h-48 items-center justify-center mb-6 bg-gray-50"
                >
                    <Camera size={32} color="#999" />
                    <Text className="text-gray-500 mt-2">Take a Photo</Text>
                </TouchableOpacity>
            )}

            <TouchableOpacity
                onPress={submitReport}
                disabled={loading}
                className={`p-4 rounded-lg items-center ${loading ? 'bg-blue-400' : 'bg-blue-600'}`}
            >
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text className="text-white font-bold text-lg">Submit Report</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}
