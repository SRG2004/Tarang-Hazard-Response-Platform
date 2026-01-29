import { useState, useEffect } from 'react';
import { PageContainer, PageHeader } from '../components/ui-redesign/PageLayouts';
import { LoadingState } from '../components/ui-redesign/Cards';
import { CheckCircle, XCircle, MapPin, Clock, User, Camera, AlertTriangle } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, doc, updateDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

interface FieldVerification {
    id: string;
    reportId: string;
    responderName: string;
    verificationPhotos: string[];
    damageLevel: string;
    infrastructureDamage: {
        roads: boolean;
        bridges: boolean;
        buildings: boolean;
        powerLines: boolean;
        waterSupply: boolean;
    };
    casualties: number;
    recommendations: string;
    gpsLocation: {
        latitude: number;
        longitude: number;
    };
    distanceFromReport: number;
    verifiedAt: any;
    authorityApproved: boolean;
    approvedAt?: any;
    approvedBy?: string;
    rejectionReason?: string;
}

interface Report {
    id: string;
    title: string;
    type: string;
    location: string;
    severity: string;
}

export function FieldVerificationsList() {
    const [verifications, setVerifications] = useState<FieldVerification[]>([]);
    const [reports, setReports] = useState<Record<string, Report>>({});
    const [loading, setLoading] = useState(true);
    const [selectedVerification, setSelectedVerification] = useState<FieldVerification | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchVerifications();
    }, []);

    const fetchVerifications = async () => {
        try {
            // Fetch all verifications
            const verQuery = query(
                collection(db, 'fieldVerifications'),
                orderBy('verifiedAt', 'desc')
            );
            const verSnapshot = await getDocs(verQuery);
            const verData = verSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as FieldVerification[];
            setVerifications(verData);

            // Fetch related reports
            const reportIds = [...new Set(verData.map(v => v.reportId))];
            const reportsMap: Record<string, Report> = {};

            for (const reportId of reportIds) {
                try {
                    const reportQuery = query(collection(db, 'reports'));
                    const reportSnapshot = await getDocs(reportQuery);
                    reportSnapshot.docs.forEach(doc => {
                        if (doc.id === reportId) {
                            reportsMap[reportId] = {
                                id: doc.id,
                                ...doc.data()
                            } as Report;
                        }
                    });
                } catch (err) {
                    console.error('Error fetching report:', reportId, err);
                }
            }
            setReports(reportsMap);
        } catch (error) {
            console.error('Error fetching verifications:', error);
            toast.error('Failed to load verifications');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (verification: FieldVerification) => {
        setProcessing(true);
        try {
            await updateDoc(doc(db, 'fieldVerifications', verification.id), {
                authorityApproved: true,
                approvedAt: serverTimestamp(),
                status: 'approved'
            });

            // Update the original report to verified status
            await updateDoc(doc(db, 'reports', verification.reportId), {
                status: 'verified',
                verifiedAt: serverTimestamp()
            });

            toast.success('Verification approved!');
            fetchVerifications();
            setSelectedVerification(null);
        } catch (error) {
            console.error('Error approving:', error);
            toast.error('Failed to approve verification');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async (verification: FieldVerification) => {
        if (!rejectionReason.trim()) {
            toast.error('Please provide a rejection reason');
            return;
        }

        setProcessing(true);
        try {
            await updateDoc(doc(db, 'fieldVerifications', verification.id), {
                authorityApproved: false,
                rejectedAt: serverTimestamp(),
                rejectionReason: rejectionReason,
                status: 'rejected'
            });

            toast.success('Verification rejected');
            fetchVerifications();
            setSelectedVerification(null);
            setRejectionReason('');
        } catch (error) {
            console.error('Error rejecting:', error);
            toast.error('Failed to reject verification');
        } finally {
            setProcessing(false);
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'Unknown';
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleString();
        } catch {
            return 'Unknown';
        }
    };

    const getDamageLevelColor = (level: string) => {
        switch (level) {
            case 'minimal': return 'bg-green-100 text-green-800';
            case 'moderate': return 'bg-yellow-100 text-yellow-800';
            case 'severe': return 'bg-orange-100 text-orange-800';
            case 'catastrophic': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
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
                title="Field Verifications"
                subtitle="Review and approve on-ground verification reports"
            />

            {verifications.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>No field verifications submitted yet</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {verifications.map(verification => {
                        const report = reports[verification.reportId];
                        return (
                            <div
                                key={verification.id}
                                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
                            >
                                {/* Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold dark:text-white">
                                            {report?.title || 'Unknown Report'}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                            <MapPin className="w-4 h-4" />
                                            {report?.location || 'Unknown location'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDamageLevelColor(verification.damageLevel)}`}>
                                            {verification.damageLevel}
                                        </span>
                                        {verification.authorityApproved === true && (
                                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                                Approved
                                            </span>
                                        )}
                                        {verification.authorityApproved === false && verification.rejectionReason && (
                                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                                                Rejected
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="grid md:grid-cols-2 gap-4 mb-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <User className="w-4 h-4" />
                                        Verified by: {verification.responderName}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Clock className="w-4 h-4" />
                                        {formatDate(verification.verifiedAt)}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Distance from report: {verification.distanceFromReport}m
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Casualties: {verification.casualties}
                                    </div>
                                </div>

                                {/* Infrastructure Damage */}
                                <div className="mb-4">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Infrastructure Damage:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(verification.infrastructureDamage || {}).map(([key, value]) => (
                                            value && (
                                                <span key={key} className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded">
                                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                                </span>
                                            )
                                        ))}
                                        {Object.values(verification.infrastructureDamage || {}).every(v => !v) && (
                                            <span className="text-sm text-gray-500">None reported</span>
                                        )}
                                    </div>
                                </div>

                                {/* Recommendations */}
                                {verification.recommendations && (
                                    <div className="mb-4">
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recommendations:</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{verification.recommendations}</p>
                                    </div>
                                )}

                                {/* Photos */}
                                {verification.verificationPhotos?.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                                            <Camera className="w-4 h-4" />
                                            Evidence Photos ({verification.verificationPhotos.length})
                                        </p>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {verification.verificationPhotos.map((url, idx) => (
                                                <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                                                    <img
                                                        src={url}
                                                        alt={`Evidence ${idx + 1}`}
                                                        className="w-full h-24 object-cover rounded-lg hover:opacity-80 transition-opacity"
                                                    />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Actions - only show if not already processed */}
                                {!verification.authorityApproved && !verification.rejectionReason && (
                                    <div className="flex gap-3 pt-4 border-t">
                                        <button
                                            onClick={() => handleApprove(verification)}
                                            disabled={processing}
                                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => setSelectedVerification(verification)}
                                            disabled={processing}
                                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            Reject
                                        </button>
                                    </div>
                                )}

                                {/* Rejection reason display */}
                                {verification.rejectionReason && (
                                    <div className="mt-4 p-3 bg-red-50 rounded-lg">
                                        <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                                        <p className="text-sm text-red-600">{verification.rejectionReason}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Rejection Modal */}
            {selectedVerification && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold mb-4 dark:text-white">Reject Verification</h3>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="Enter reason for rejection..."
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => handleReject(selectedVerification)}
                                disabled={processing}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
                            >
                                {processing ? 'Processing...' : 'Confirm Reject'}
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedVerification(null);
                                    setRejectionReason('');
                                }}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </PageContainer>
    );
}
