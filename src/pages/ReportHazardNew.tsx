import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HAZARDS } from '../config/hazards';
import { toast } from 'sonner';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/TranslationContext';
import { offlineSyncService } from '../services/offlineSyncService';
import { Wizard, WizardStep, WizardNavigation } from '../components/wizard/Wizard';
import { HazardIconSelector } from '../components/wizard/HazardIconSelector';
import { SeveritySlider } from '../components/wizard/SeveritySlider';
import { PlacesAutocomplete } from '../components/PlacesAutocomplete';
import { LocationPickerMap } from '../components/LocationPickerMap';
import { VoiceInput } from '../components/VoiceInput';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Upload, MapPin, Navigation, Image as ImageIcon, Video as VideoIcon, CheckCircle } from 'lucide-react';
import { HazardType } from '../types';
import { AnimatedPage } from '../components/AnimatedComponents';

const wizardSteps = [
    { id: 1, title: 'Type', description: 'Select hazard type' },
    { id: 2, title: 'Severity', description: 'Set severity level' },
    { id: 3, title: 'Location', description: 'Provide location' },
    { id: 4, title: 'Details', description: 'Add description & media' },
    { id: 5, title: 'Review', description: 'Review & submit' }
];

export function ReportHazard() {
    const { t } = useTranslation();
    const { currentUser } = useAuth();
    const [currentStep, setCurrentStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);

    // Form data
    const [hazardType, setHazardType] = useState<HazardType | ''>('');
    const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical' | ''>('');
    const [location, setLocation] = useState('');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [description, setDescription] = useState('');
    const [photo, setPhoto] = useState<File | null>(null);
    const [video, setVideo] = useState<File | null>(null);
    const [locationMethod, setLocationMethod] = useState<'search' | 'gps'>('search');

    // GPS detection
    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported by your browser');
            return;
        }

        toast.loading('Detecting your location...');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                setLatitude(lat.toFixed(6));
                setLongitude(lng.toFixed(6));
                toast.dismiss();
                toast.success('Location detected successfully!');
            },
            (error) => {
                toast.dismiss();
                toast.error('Failed to detect location. Please try manual entry.');
                console.error('Geolocation error:', error);
            }
        );
    };

    // Handle form submission
    const handleSubmit = async () => {
        if (!currentUser) {
            toast.error('You must be logged in to report a hazard');
            return;
        }

        setSubmitting(true);

        try {
            let photoURL = '';
            let videoURL = '';

            // Upload photo if exists
            if (photo) {
                const photoRef = ref(storage, `hazard-photos/${Date.now()}_${photo.name}`);
                await uploadBytes(photoRef, photo);
                photoURL = await getDownloadURL(photoRef);
            }

            // Upload video if exists
            if (video) {
                const videoRef = ref(storage, `hazard-videos/${Date.now()}_${video.name}`);
                await uploadBytes(videoRef, video);
                videoURL = await getDownloadURL(videoRef);
            }

            // Create report
            const reportData = {
                type: hazardType,
                title: `${HAZARDS[hazardType as HazardType]?.label || 'Hazard'} Report`,
                description: description || 'No description provided',
                location: location || `${latitude}, ${longitude}`,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                severity,
                photoURL,
                videoURL,
                userId: currentUser.uid,
                submittedAt: serverTimestamp(),
                createdAt: serverTimestamp(), // Added to match backend query
                updatedAt: serverTimestamp(),
                status: 'pending',
                verified: false
            };

            // Try online submission first
            try {
                await addDoc(collection(db, 'reports'), reportData);
                toast.success('Hazard reported successfully!');
            } catch (error) {
                // If offline, queue for later
                await offlineSyncService.queueRequest('report', 'POST', '/reports', reportData);
                toast.success('Report saved offline. Will sync when online.');
            }

            // Reset form
            resetForm();
            setCurrentStep(1);

        } catch (error: any) {
            console.error('Submit error:', error);
            toast.error(error.message || 'Failed to submit report');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setHazardType('');
        setSeverity('');
        setLocation('');
        setLatitude('');
        setLongitude('');
        setDescription('');
        setPhoto(null);
        setVideo(null);
    };

    // Validation for each step
    const canProceedFromStep = (step: number): boolean => {
        switch (step) {
            case 1: return hazardType !== '';
            case 2: return severity !== '';
            case 3: return (latitude !== '' && longitude !== '') || location !== '';
            case 4: return true; // Description is optional
            case 5: return true;
            default: return false;
        }
    };

    return (
        <AnimatedPage className="min-h-screen bg-transparent p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">Report a Hazard</h1>
                    <p className="text-gray-600 dark:text-gray-400">Provide details to help authorities respond quickly</p>
                </motion.div>

                {/* Wizard */}
                <Wizard
                    steps={wizardSteps}
                    currentStep={currentStep}
                    onStepChange={setCurrentStep}
                >
                    <AnimatePresence mode="wait">
                        {/* Step 1: Hazard Type */}
                        {currentStep === 1 && (
                            <WizardStep
                                key="step1"
                                title="Select Disaster Type"
                                description="Choose the type of hazard you want to report"
                            >
                                <HazardIconSelector
                                    selected={hazardType}
                                    onSelect={setHazardType}
                                />

                                <WizardNavigation
                                    isFirstStep
                                    onNext={() => setCurrentStep(2)}
                                    canProceed={canProceedFromStep(1)}
                                />
                            </WizardStep>
                        )}

                        {/* Step 2: Severity */}
                        {currentStep === 2 && (
                            <WizardStep
                                key="step2"
                                title="Set Severity Level"
                                description="How severe is this situation?"
                            >
                                <SeveritySlider
                                    value={severity}
                                    onChange={setSeverity}
                                />

                                <WizardNavigation
                                    onBack={() => setCurrentStep(1)}
                                    onNext={() => setCurrentStep(3)}
                                    canProceed={canProceedFromStep(2)}
                                />
                            </WizardStep>
                        )}

                        {/* Step 3: Location */}
                        {currentStep === 3 && (
                            <WizardStep
                                key="step3"
                                title="Provide Location"
                                description="Where is this hazard located?"
                            >
                                <div className="space-y-6">
                                    {/* Location Method Tabs */}
                                    <div className="flex gap-3">
                                        <motion.button
                                            type="button"
                                            onClick={() => setLocationMethod('search')}
                                            className={`flex-1 p-4 rounded-xl border-2 transition-all ${locationMethod === 'search'
                                                ? 'border-indigo-600 bg-indigo-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <MapPin className="w-6 h-6 mx-auto mb-2 text-indigo-600" />
                                            <p className="font-medium">Search Location</p>
                                        </motion.button>

                                        <motion.button
                                            type="button"
                                            onClick={() => setLocationMethod('gps')}
                                            className={`flex-1 p-4 rounded-xl border-2 transition-all ${locationMethod === 'gps'
                                                ? 'border-indigo-600 bg-indigo-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <Navigation className="w-6 h-6 mx-auto mb-2 text-indigo-600" />
                                            <p className="font-medium">GPS Autodetect</p>
                                        </motion.button>
                                    </div>

                                    {/* Search Location */}
                                    {locationMethod === 'search' && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="space-y-4"
                                        >
                                            <Label>Search or type location</Label>
                                            <PlacesAutocomplete
                                                value={location}
                                                onChange={(value, lat, lng) => {
                                                    setLocation(value);
                                                    if (lat && lng) {
                                                        setLatitude(lat.toFixed(6));
                                                        setLongitude(lng.toFixed(6));
                                                    }
                                                }}
                                                placeholder="Search for a location..."
                                            />

                                            {latitude && longitude && (
                                                <div className="border rounded-lg overflow-hidden">
                                                    <LocationPickerMap
                                                        onLocationSelect={(lat, lng, addr) => {
                                                            setLatitude(lat.toFixed(6));
                                                            setLongitude(lng.toFixed(6));
                                                            if (addr) setLocation(addr);
                                                        }}
                                                        initialLat={parseFloat(latitude)}
                                                        initialLng={parseFloat(longitude)}
                                                        height="300px"
                                                    />
                                                </div>
                                            )}
                                        </motion.div>
                                    )}

                                    {/* GPS Autodetect */}
                                    {locationMethod === 'gps' && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="space-y-4"
                                        >
                                            <motion.button
                                                type="button"
                                                onClick={getCurrentLocation}
                                                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <Navigation className="w-5 h-5 inline mr-2" />
                                                Detect My Location
                                            </motion.button>

                                            {latitude && longitude && (
                                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                                    <p className="text-sm text-green-900">
                                                        ✓ Location detected: {latitude}, {longitude}
                                                    </p>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </div>

                                <WizardNavigation
                                    onBack={() => setCurrentStep(2)}
                                    onNext={() => setCurrentStep(4)}
                                    canProceed={canProceedFromStep(3)}
                                />
                            </WizardStep>
                        )}

                        {/* Step 4: Details */}
                        {currentStep === 4 && (
                            <WizardStep
                                key="step4"
                                title="Add Details"
                                description="Provide additional information and media"
                            >
                                <div className="space-y-6">
                                    {/* Description */}
                                    <div className="space-y-2">
                                        <Label>Description (Optional)</Label>
                                        <div className="relative">
                                            <Textarea
                                                placeholder="Describe what you observed..."
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                rows={4}
                                                className="resize-none pr-12"
                                            />
                                            <div className="absolute right-2 top-2">
                                                <VoiceInput
                                                    onTranscript={(text) => setDescription(description + ' ' + text)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Media Upload */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Photo Upload */}
                                        <motion.label
                                            className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-400 transition-colors"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                                                className="hidden"
                                            />
                                            {photo ? (
                                                <div className="text-green-600">
                                                    <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                                                    <p className="text-sm font-medium">{photo.name}</p>
                                                </div>
                                            ) : (
                                                <div className="text-gray-500">
                                                    <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                                                    <p className="text-sm font-medium">Upload Photo</p>
                                                </div>
                                            )}
                                        </motion.label>

                                        {/* Video Upload */}
                                        <motion.label
                                            className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-400 transition-colors"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <input
                                                type="file"
                                                accept="video/*"
                                                onChange={(e) => setVideo(e.target.files?.[0] || null)}
                                                className="hidden"
                                            />
                                            {video ? (
                                                <div className="text-green-600">
                                                    <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                                                    <p className="text-sm font-medium">{video.name}</p>
                                                </div>
                                            ) : (
                                                <div className="text-gray-500">
                                                    <VideoIcon className="w-8 h-8 mx-auto mb-2" />
                                                    <p className="text-sm font-medium">Upload Video</p>
                                                </div>
                                            )}
                                        </motion.label>
                                    </div>
                                </div>

                                <WizardNavigation
                                    onBack={() => setCurrentStep(3)}
                                    onNext={() => setCurrentStep(5)}
                                    canProceed={canProceedFromStep(4)}
                                />
                            </WizardStep>
                        )}

                        {/* Step 5: Review */}
                        {currentStep === 5 && (
                            <WizardStep
                                key="step5"
                                title="Review & Submit"
                                description="Please review your report before submitting"
                            >
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm rounded-lg">
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Hazard Type</p>
                                            <p className="font-semibold dark:text-white">{HAZARDS[hazardType as HazardType]?.label}</p>
                                        </div>
                                        <div className="p-4 bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm rounded-lg">
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Severity</p>
                                            <p className="font-semibold capitalize dark:text-white">{severity}</p>
                                        </div>
                                        <div className="p-4 bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm rounded-lg col-span-2">
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Location</p>
                                            <p className="font-semibold dark:text-white">{location || `${latitude}, ${longitude}`}</p>
                                        </div>
                                        {description && (
                                            <div className="p-4 bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm rounded-lg col-span-2">
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Description</p>
                                                <p className="text-sm dark:text-gray-200">{description}</p>
                                            </div>
                                        )}
                                        {(photo || video) && (
                                            <div className="p-4 bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm rounded-lg col-span-2">
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Media</p>
                                                <div className="flex gap-2 dark:text-white">
                                                    {photo && <span className="text-sm">📷 Photo</span>}
                                                    {video && <span className="text-sm">🎥 Video</span>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <WizardNavigation
                                    onBack={() => setCurrentStep(4)}
                                    onSubmit={handleSubmit}
                                    isLastStep
                                    canProceed={canProceedFromStep(5)}
                                    isSubmitting={submitting}
                                />
                            </WizardStep>
                        )}
                    </AnimatePresence>
                </Wizard>
            </div>
        </AnimatedPage>
    );
}
