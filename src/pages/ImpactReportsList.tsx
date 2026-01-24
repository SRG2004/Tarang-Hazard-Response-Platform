import { useState, useEffect } from 'react';
import { PageContainer, PageHeader } from '../components/ui-redesign/PageLayouts';
import { InfoCard, LoadingState, EmptyState } from '../components/ui-redesign/Cards';
import { ImpactReport } from '../types';
import apiService from '../services/apiService';
import { toast } from 'sonner';
import { Activity, MapPin, Calendar, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ImpactReportsList() {
    const [reports, setReports] = useState<ImpactReport[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const res = await apiService.getImpactReports();
                if (res.success && res.reports) {
                    setReports(res.reports);
                }
            } catch (error) {
                console.error(error);
                toast.error('Failed to load impact reports');
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, []);

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
                title="Impact Reports"
                subtitle="Damage assessments and situational analysis"
                actions={
                    <button
                        onClick={() => navigate('/impact-reporting')}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
                    >
                        Submit New Report
                    </button>
                }
            />

            {reports.length === 0 ? (
                <EmptyState
                    icon={ClipboardList}
                    title="No impact reports"
                    description="No damage assessments have been submitted yet."
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reports.map((report, index) => (
                        <InfoCard
                            key={report.id || index}
                            title={`Assessment #${String(index + 1).padStart(3, '0')}`}
                            icon={Activity}
                            iconColor={report.casualties > 0 ? '#EF4444' : '#F59E0B'}
                            index={index}
                        >
                            <div className="space-y-3 mt-4 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <span>{new Date(report.submittedAt).toLocaleDateString()}</span>
                                </div>
                                {report.location?.address && (
                                    <div className="flex items-start gap-2">
                                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                                        <span>{report.location.address}</span>
                                    </div>
                                )}

                                <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-red-50 p-2 rounded text-red-700 font-medium">
                                        Casualties: {report.casualties}
                                    </div>
                                    <div className="bg-orange-50 p-2 rounded text-orange-700 font-medium">
                                        Houses: {report.housesDamaged}
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-gray-100">
                                    <p className="font-medium text-gray-700 mb-1">Infrastructure:</p>
                                    <div className="grid grid-cols-2 gap-1 text-xs">
                                        <span className={report.infrastructure.roads === 'functional' ? 'text-green-600' : 'text-red-600'}>
                                            Roads: {report.infrastructure.roads}
                                        </span>
                                        <span className={report.infrastructure.power === 'functional' ? 'text-green-600' : 'text-red-600'}>
                                            Power: {report.infrastructure.power}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </InfoCard>
                    ))}
                </div>
            )}
        </PageContainer>
    );
}
