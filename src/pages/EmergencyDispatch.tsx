import { useState, useEffect } from 'react';
import { PageContainer, PageHeader } from '../components/ui-redesign/PageLayouts';
import { InfoCard, LoadingState } from '../components/ui-redesign/Cards';
import { AlertTriangle, MapPin, Clock, CheckCircle } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface EmergencyReport {
    id: string;
    title: string;
    type: string;
    severity: string;
    location: string;
    latitude: number;
    longitude: number;
    submittedAt: Date;
    distance?: number;
    status: string;
}

export function EmergencyDispatch() {
    const { user } = useAuth();
    const [reports, setReports] = useState<EmergencyReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeResponse, setActiveResponse] = useState<string | null>(null);
    const [responseStartTime, setResponseStartTime] = useState<Date | null>(null);

    useEffect(() => {
        fetchUrgentReports();
    }, []);

    const fetchUrgentReports = async () => {
        try {
            const q = query(
                collection(db, 'reports'),
                where('severity', 'in', ['critical', 'high']),
                where('status', '==', 'pending'),
                orderBy('submittedAt', 'desc'),
                limit(20)
            );

            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                submittedAt: doc.data().submittedAt?.toDate()
            })) as EmergencyReport[];

            // TODO: Calculate distance based on responder's location
            setReports(data);
        } catch (error) {
            console.error('Error fetching urgent reports:', error);
            toast.error('Failed to load emergency reports');
        } finally {
            setLoading(false);
        }
    };

    const handleRespond = async (reportId: string) => {
        try {
            await updateDoc(doc(db, 'reports', reportId), {
                responderId: user?.uid,
                responseStartTime: new Date(),
                status: 'in-progress'
            });

            setActiveResponse(reportId);
            setResponseStartTime(new Date());
            toast.success('Response activated! Stay safe.');
            fetchUrgentReports();
        } catch (error) {
            console.error('Error claiming response:', error);
            toast.error('Failed to claim response');
        }
    };

    const handleComplete = async () => {
        if (!activeResponse) return;

        try {
            await updateDoc(doc(db, 'reports', activeResponse), {
                responseEndTime: new Date(),
                status: 'responded'
            });

            setActiveResponse(null);
            setResponseStartTime(null);
            toast.success('Response marked as complete');
            fetchUrgentReports();
        } catch (error) {
            console.error('Error completing response:', error);
            toast.error('Failed to complete response');
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-600';
            case 'high': return 'bg-orange-500';
            case 'medium': return 'bg-yellow-500';
            default: return 'bg-blue-500';
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
                title="Emergency Dispatch"
                subtitle="Real-time urgent reports requiring immediate response"
            />

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <InfoCard
                    title={reports.filter(r => r.severity === 'critical').length.toString()}
                    subtitle="Critical Alerts"
                    icon={AlertTriangle}
                    iconColor="#DC2626"
                />
                <InfoCard
                    title={reports.filter(r => r.severity === 'high').length.toString()}
                    subtitle="High Priority"
                    icon={AlertTriangle}
                    iconColor="#F59E0B"
                />
                <InfoCard
                    title={activeResponse ? '1' : '0'}
                    subtitle="Active Response"
                    icon={CheckCircle}
                    iconColor="#10B981"
                />
            </div>

            {/* Active Response Card */}
            {activeResponse && responseStartTime && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-500 rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">Active Response</h3>
                            <p className="text-sm text-gray-600">
                                Started {new Date().getTime() - responseStartTime.getTime() < 60000
                                    ? 'less than a minute ago'
                                    : `${Math.floor((new Date().getTime() - responseStartTime.getTime()) / 60000)} minutes ago`}
                            </p>
                        </div>
                        <button
                            onClick={handleComplete}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                            Mark Complete
                        </button>
                    </div>
                </div>
            )}

            {/* Emergency Reports List */}
            <div className="space-y-4">
                {reports.map((report) => (
                    <div
                        key={report.id}
                        className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${report.id === activeResponse ? 'ring-2 ring-green-500' : ''
                            }`}
                        style={{
                            borderColor: report.severity === 'critical' ? '#DC2626' : '#F59E0B'
                        }}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span
                                        className={`px-3 py-1 rounded-full text-white text-xs font-bold uppercase ${getSeverityColor(report.severity)}`}
                                    >
                                        {report.severity}
                                    </span>
                                    <h3 className="text-lg font-bold text-gray-900">{report.title}</h3>
                                </div>

                                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                                    <div className="flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        <span>{report.location}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        <span>{new Date(report.submittedAt).toLocaleString()}</span>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-700 capitalize">
                                    Type: <span className="font-medium">{report.type}</span>
                                </p>
                            </div>

                            {report.id !== activeResponse && !activeResponse && (
                                <button
                                    onClick={() => handleRespond(report.id)}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium ml-4"
                                >
                                    Respond
                                </button>
                            )}

                            {report.id === activeResponse && (
                                <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium ml-4">
                                    Responding...
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {reports.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>No urgent reports at this time</p>
                </div>
            )}
        </PageContainer>
    );
}
