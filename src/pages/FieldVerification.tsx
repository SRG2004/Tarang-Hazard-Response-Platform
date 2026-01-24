import { useState, useEffect } from 'react';
import { PageContainer, PageHeader } from '../components/ui-redesign/PageLayouts';
import { InfoCard, LoadingState } from '../components/ui-redesign/Cards';
import { Camera, MapPin, AlertTriangle, CheckCircle, Upload } from 'lucide-react';
import { db, storage } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface Report {
    id: string;
    title: string;
    type: string;
    location: string;
    latitude: number;
    longitude: number;
    severity: string;
}

export function FieldVerification() {
    const { currentUser, userProfile } = useAuth();
    const [reports, setReports] = useState<Report[]>([]);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [photos, setPhotos] = useState<File[]>([]);
    const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
    const [damageLevel, setDamageLevel] = useState('');
    const [casualties, setCasualties] = useState(0);
    const [recommendations, setRecommendations] = useState('');
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [infrastructureDamage, setInfrastructureDamage] = useState({
        roads: false,
        bridges: false,
        buildings: false,
        powerLines: false,
        waterSupply: false
    });

    useEffect(() => {
        fetchPendingReports();
        getCurrentLocation();
    }, []);

    const fetchPendingReports = async () => {
        try {
            const q = query(
                collection(db, 'reports'),
                where('status', 'in', ['pending', 'in-progress'])
            );
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Report[];
            setReports(data);
        } catch (error) {
            console.error('Error fetching reports:', error);
            toast.error('Failed to load reports');
        } finally {
            setLoading(false);
        }
    };

    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setCurrentLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                    toast.success('Location captured');
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    toast.error('Could not get your location');
                }
            );
        }
    };

    const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setPhotos(prev => [...prev, ...files]);

        // Create previews
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreviews(prev => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
        setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371000; // Earth radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const handleSubmit = async () => {
        if (!selectedReport) {
            toast.error('Please select a report');
            return;
        }

        if (photos.length === 0) {
            toast.error('Please capture at least one photo');
            return;
        }

        if (!damageLevel) {
            toast.error('Please select damage level');
            return;
        }

        if (!currentLocation) {
            toast.error('Location not available');
            return;
        }

        setSubmitting(true);

        try {
            // Upload photos to Firebase Storage
            const photoUrls: string[] = [];
            for (const photo of photos) {
                const storageRef = ref(storage, `field-verifications/${selectedReport.id}/${Date.now()}_${photo.name}`);
                await uploadBytes(storageRef, photo);
                const url = await getDownloadURL(storageRef);
                photoUrls.push(url);
            }

            // Calculate distance from original report
            const distance = calculateDistance(
                currentLocation.lat,
                currentLocation.lng,
                selectedReport.latitude,
                selectedReport.longitude
            );

            // Create verification document
            const verificationData = {
                reportId: selectedReport.id,
                responderId: currentUser?.uid,
                responderName: userProfile?.name || 'Unknown',
                verificationPhotos: photoUrls,
                damageLevel,
                infrastructureDamage,
                casualties,
                recommendations,
                gpsLocation: {
                    latitude: currentLocation.lat,
                    longitude: currentLocation.lng
                },
                distanceFromReport: Math.round(distance),
                verifiedAt: serverTimestamp(),
                authorityApproved: false
            };

            const verificationRef = await addDoc(collection(db, 'fieldVerifications'), verificationData);

            // Update report status
            await updateDoc(doc(db, 'reports', selectedReport.id), {
                status: 'field-verified',
                fieldVerification: verificationRef.id,
                lastUpdated: serverTimestamp()
            });

            toast.success('Verification submitted successfully!');

            // Reset form
            setSelectedReport(null);
            setPhotos([]);
            setPhotoPreviews([]);
            setDamageLevel('');
            setCasualties(0);
            setRecommendations('');
            setInfrastructureDamage({
                roads: false,
                bridges: false,
                buildings: false,
                powerLines: false,
                waterSupply: false
            });

            fetchPendingReports();
        } catch (error) {
            console.error('Error submitting verification:', error);
            toast.error('Failed to submit verification');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <PageContainer>
                <LoadingState />
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            <PageHeader
                title="Field Verification"
                subtitle="Verify hazards on-ground with photo evidence and GPS"
            />

            {/* Report Selection */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 className="text-lg font-bold mb-4">Select Report to Verify</h3>
                <select
                    value={selectedReport?.id || ''}
                    onChange={(e) => {
                        const report = reports.find(r => r.id === e.target.value);
                        setSelectedReport(report || null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="">Choose a report...</option>
                    {reports.map(report => (
                        <option key={report.id} value={report.id}>
                            {report.title} - {report.location} ({report.severity})
                        </option>
                    ))}
                </select>

                {selectedReport && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-semibold">{selectedReport.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                            <MapPin className="inline w-4 h-4" /> {selectedReport.location}
                        </p>
                        <p className="text-sm text-gray-600">
                            Type: {selectedReport.type} | Severity: {selectedReport.severity}
                        </p>
                    </div>
                )}
            </div>

            {selectedReport && (
                <>
                    {/* Photo Capture */}
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Camera className="w-5 h-5" />
                            Capture Evidence
                        </h3>

                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            multiple
                            onChange={handlePhotoCapture}
                            className="hidden"
                            id="photo-input"
                        />

                        <label
                            htmlFor="photo-input"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer"
                        >
                            <Camera className="w-5 h-5" />
                            Take Photo
                        </label>

                        {photoPreviews.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                                {photoPreviews.map((preview, index) => (
                                    <div key={index} className="relative">
                                        <img
                                            src={preview}
                                            alt={`Verification ${index + 1}`}
                                            className="w-full h-40 object-cover rounded-lg"
                                        />
                                        <button
                                            onClick={() => removePhoto(index)}
                                            className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Damage Assessment */}
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <h3 className="text-lg font-bold mb-4">Damage Assessment</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Damage Level *
                                </label>
                                <select
                                    value={damageLevel}
                                    onChange={(e) => setDamageLevel(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">Select damage level...</option>
                                    <option value="minimal">Minimal</option>
                                    <option value="moderate">Moderate</option>
                                    <option value="severe">Severe</option>
                                    <option value="catastrophic">Catastrophic</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Infrastructure Damage
                                </label>
                                <div className="space-y-2">
                                    {Object.entries(infrastructureDamage).map(([key, value]) => (
                                        <label key={key} className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={value}
                                                onChange={(e) => setInfrastructureDamage(prev => ({
                                                    ...prev,
                                                    [key]: e.target.checked
                                                }))}
                                                className="rounded"
                                            />
                                            <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Estimated Casualties
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={casualties}
                                    onChange={(e) => setCasualties(parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Recommendations
                                </label>
                                <textarea
                                    value={recommendations}
                                    onChange={(e) => setRecommendations(e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Describe recommended actions..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Location Info */}
                    {currentLocation && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-green-600" />
                                <span className="font-semibold text-green-900">GPS Location Captured</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                                Distance from reported location: {
                                    calculateDistance(
                                        currentLocation.lat,
                                        currentLocation.lng,
                                        selectedReport.latitude,
                                        selectedReport.longitude
                                    ).toFixed(0)
                                }m
                            </p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <>Submitting...</>
                        ) : (
                            <>
                                <CheckCircle className="w-5 h-5" />
                                Submit Verification
                            </>
                        )}
                    </button>
                </>
            )}

            {reports.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>No pending reports to verify</p>
                </div>
            )}
        </PageContainer>
    );
}
