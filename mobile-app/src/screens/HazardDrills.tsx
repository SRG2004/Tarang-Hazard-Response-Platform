import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, X, ChevronDown, ChevronUp, Trash, Edit } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getHazardDrills, createHazardDrill, deleteHazardDrill } from '../services/apiService';

const DEFAULT_DRILLS = [
    {
        id: 'tsunami-drill',
        title: 'Tsunami Safety - Earthquake & Tsunami Response',
        description: "In case of earthquake, go to high ground and stay there - waves may arrive for hours.",
        steps: [
            'DROP, COVER, HOLD ON - Follow earthquake safety procedures first',
            'IN CASE OF EARTHQUAKE: Go to high ground immediately',
            'Move at least 100 feet (30 meters) above sea level or 2 miles (3 km) inland',
            "Never go to the beach to watch the tsunami - it may arrive as a series of waves",
            "STAY THERE - Waves may arrive for hours, do not return until authorities say it's safe",
            'If you cannot evacuate, go to the highest floor of a sturdy building',
            'Follow official evacuation routes and warnings',
            "Help others who may need assistance, but don't risk your life",
        ],
        hazardType: 'Tsunami',
        imageURL: 'https://www.incois.gov.in/portal/images/tsunami_safety.jpg', // Placeholder or real URL
    },
    {
        id: 'cyclone-drill',
        title: 'How to Prepare for a Cyclone at Home',
        description: 'Four essential steps to prepare your home and family for a cyclone.',
        steps: [
            'STEP 1: Make A Preparation Plan - Find and make copies of necessary documents. Secure important documents.',
            'STEP 2: Pack An Emergency Kit - Include goods for necessities in a disaster.',
            'STEP 3: Upgrade Your Property - Secure or improve windows, shed, doors, garage door, building easements, and roof areas.',
            'STEP 4: Prepare for Pets or Livestock - Ensure your pet is microchipped and securely identified.',
        ],
        hazardType: 'Cyclone',
        imageURL: 'https://www.incois.gov.in/portal/images/cyclone_safety.jpg',
    },
    {
        id: 'flood-drill',
        title: 'Flood Safety Tips',
        description: 'Comprehensive guide to flood safety - before, during, and after a flood event.',
        steps: [
            'BEFORE: Stay up-to-date on local news and weather forecasts',
            'BEFORE: Prepare an emergency bag with essentials',
            'BEFORE: Know your evacuation routes & safe place',
            'DURING: Disconnect electricity and gas supply',
            "DURING: Don't walk or drive in flood water",
            'DURING: Move to higher ground immediately',
        ],
        hazardType: 'Flood',
        imageURL: 'https://www.incois.gov.in/portal/images/flood_safety.jpg',
    },
];

export default function HazardDrills() {
    const { t } = useTranslation();
    const [drills, setDrills] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [expandedDrill, setExpandedDrill] = useState<string | null>(null);

    // Form State
    const [newDrill, setNewDrill] = useState({
        title: '',
        description: '',
        hazardType: '',
        steps: '', // Text input, split by newline
        imageURL: ''
    });

    useEffect(() => {
        checkUserRole();
        fetchDrills();
    }, []);

    const checkUserRole = async () => {
        const role = await AsyncStorage.getItem('userRole');
        setUserRole(role);
    };

    const fetchDrills = async () => {
        setLoading(true);
        try {
            const response = await getHazardDrills();
            if (response.success && Array.isArray(response.drills) && response.drills.length > 0) {
                setDrills(response.drills);
            } else {
                setDrills(DEFAULT_DRILLS);
            }
        } catch (error) {
            console.error('Error fetching drills:', error);
            setDrills(DEFAULT_DRILLS);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateDrill = async () => {
        if (!newDrill.title || !newDrill.description || !newDrill.hazardType) {
            Alert.alert('Error', 'Please fill in Title, Description and Hazard Type');
            return;
        }

        const stepsArray = newDrill.steps.split('\n').filter(s => s.trim());

        try {
            await createHazardDrill({
                ...newDrill,
                steps: stepsArray
            });
            setShowModal(false);
            setNewDrill({ title: '', description: '', hazardType: '', steps: '', imageURL: '' });
            Alert.alert('Success', 'Hazard Drill created successfully');
            fetchDrills();
        } catch (error) {
            Alert.alert('Error', 'Failed to create drill');
        }
    };

    const handleDeleteDrill = async (id: string) => {
        Alert.alert(
            'Delete Drill',
            'Are you sure you want to delete this drill?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteHazardDrill(id);
                            fetchDrills();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete drill');
                        }
                    }
                }
            ]
        );
    };

    const toggleExpand = (id: string) => {
        setExpandedDrill(expandedDrill === id ? null : id);
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#0077B6" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.title}>{t('drills.title')}</Text>
                    <Text style={styles.subtitle}>{t('drills.subtitle')}</Text>
                </View>
                {(userRole === 'official' || userRole === 'admin') && (
                    <TouchableOpacity onPress={() => setShowModal(true)} style={styles.addButton}>
                        <Plus color="white" size={24} />
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {drills.length === 0 ? (
                    <Text style={styles.noData}>{t('drills.noDrills')}</Text>
                ) : (
                    drills.map(drill => (
                        <View key={drill.id} style={styles.card}>
                            {/* Image Placeholder or Real Image */}
                            <View style={styles.imageContainer}>
                                {drill.imageURL ? (
                                    <Image source={{ uri: drill.imageURL }} style={styles.drillImage} resizeMode="cover" />
                                ) : (
                                    <View style={styles.placeholderImage}>
                                        <Text style={styles.placeholderText}>{drill.hazardType?.[0] || 'D'}</Text>
                                    </View>
                                )}
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{drill.hazardType || 'General'}</Text>
                                </View>
                            </View>

                            <View style={styles.cardContent}>
                                <Text style={styles.drillTitle}>{drill.title}</Text>
                                <Text style={styles.description}>{drill.description}</Text>

                                <TouchableOpacity
                                    style={styles.expandButton}
                                    onPress={() => toggleExpand(drill.id)}
                                >
                                    <Text style={styles.expandText}>
                                        {expandedDrill === drill.id ? 'Hide Steps' : 'View Steps'}
                                    </Text>
                                    {expandedDrill === drill.id ? <ChevronUp size={16} color="#0077B6" /> : <ChevronDown size={16} color="#0077B6" />}
                                </TouchableOpacity>

                                {expandedDrill === drill.id && (
                                    <View style={styles.stepsContainer}>
                                        <Text style={styles.stepsHeader}>Safety Steps:</Text>
                                        {Array.isArray(drill.steps) && drill.steps.map((step: string, index: number) => (
                                            <View key={index} style={styles.stepRow}>
                                                <Text style={styles.stepNumber}>{index + 1}.</Text>
                                                <Text style={styles.stepText}>{step}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {(userRole === 'official' || userRole === 'admin') && (
                                    <View style={styles.adminActions}>
                                        <TouchableOpacity onPress={() => handleDeleteDrill(drill.id)} style={styles.deleteButton}>
                                            <Trash size={16} color="#DC2626" />
                                            <Text style={styles.deleteText}>Delete</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            <Modal visible={showModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Hazard Drill</Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <X size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            <Text style={styles.label}>Title</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Tsunami Evacuation"
                                value={newDrill.title}
                                onChangeText={t => setNewDrill({ ...newDrill, title: t })}
                            />

                            <Text style={styles.label}>Hazard Type</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Tsunami, Cyclone"
                                value={newDrill.hazardType}
                                onChangeText={t => setNewDrill({ ...newDrill, hazardType: t })}
                            />

                            <Text style={styles.label}>Description</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Brief description..."
                                value={newDrill.description}
                                onChangeText={t => setNewDrill({ ...newDrill, description: t })}
                                multiline
                            />

                            <Text style={styles.label}>Steps (One per line)</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Step 1&#10;Step 2&#10;Step 3"
                                value={newDrill.steps}
                                onChangeText={t => setNewDrill({ ...newDrill, steps: t })}
                                multiline
                            />

                            <Text style={styles.label}>Image URL (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="https://..."
                                value={newDrill.imageURL}
                                onChangeText={t => setNewDrill({ ...newDrill, imageURL: t })}
                            />

                            <TouchableOpacity onPress={handleCreateDrill} style={styles.createButton}>
                                <Text style={styles.createButtonText}>Save Drill</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    scrollContent: {
        padding: 20,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0077B6',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
    },
    addButton: {
        backgroundColor: '#0077B6',
        padding: 10,
        borderRadius: 50,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        overflow: 'hidden',
    },
    imageContainer: {
        height: 150,
        backgroundColor: '#e0f2fe',
        position: 'relative',
    },
    drillImage: {
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#e0f2fe',
    },
    placeholderText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#0077B6',
        opacity: 0.3,
    },
    badge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    cardContent: {
        padding: 15,
    },
    drillTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    description: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 10,
    },
    expandButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        backgroundColor: '#f0f9ff',
        borderRadius: 8,
        marginTop: 5,
    },
    expandText: {
        color: '#0077B6',
        fontWeight: 'bold',
        marginRight: 5,
    },
    stepsContainer: {
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    stepsHeader: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    stepRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    stepNumber: {
        fontWeight: 'bold',
        color: '#0077B6',
        marginRight: 8,
        width: 20,
    },
    stepText: {
        flex: 1,
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
    },
    adminActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 15,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    deleteText: {
        color: '#DC2626',
        marginLeft: 5,
        fontSize: 14,
        fontWeight: 'bold',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noData: {
        textAlign: 'center',
        fontSize: 16,
        color: '#999',
        marginTop: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        height: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
        marginTop: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    createButton: {
        backgroundColor: '#0077B6',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
