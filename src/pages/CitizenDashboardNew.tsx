
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { HazardReport, HazardType } from '../types';
import { HazardCard } from '../components/feed/HazardCard';
import { DashboardStats } from '../components/feed/DashboardStats';
import { Loader2, Filter, ChevronDown, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/TranslationContext';
import { HAZARDS } from '../config/hazards';
import { PageContainer } from '../components/ui-redesign/PageLayouts';
import { LiveThreatsBulletin } from '../components/feed/LiveThreatsBulletin';

export function CitizenDashboardNew() {
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    const [reports, setReports] = useState<HazardReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTypes, setSelectedTypes] = useState<HazardType[]>([]);
    const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<'date' | 'severity'>('date');

    // Dropdown states
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);
    const [showSeverityDropdown, setShowSeverityDropdown] = useState(false);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);

    // Fetch reports - citizens only see their own reports
    useEffect(() => {
        const fetchReports = async () => {
            if (!currentUser?.uid) {
                setLoading(false);
                return;
            }

            try {
                const { where } = await import('firebase/firestore');
                const q = query(
                    collection(db, 'reports'),
                    where('userId', '==', currentUser.uid),
                    orderBy('submittedAt', 'desc')
                );
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as unknown as HazardReport));
                setReports(data);
            } catch (error) {
                console.error('Error fetching reports:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, [currentUser?.uid]);

    // Filter reports
    const filteredReports = reports.filter(report => {
        if (selectedTypes.length > 0 && !selectedTypes.includes(report.type as HazardType)) {
            return false;
        }
        if (selectedSeverities.length > 0 && !selectedSeverities.includes(report.severity)) {
            return false;
        }
        if (selectedStatuses.length > 0) {
            // Fix: Check status field instead of non-existent verified boolean
            if (selectedStatuses.includes('verified') && report.status !== 'verified') return false;
            if (selectedStatuses.includes('pending') && report.status !== 'pending') return false;
            if (selectedStatuses.includes('solved') && report.status !== 'solved') return false;
        }
        return true;
    });

    // Sort reports
    const sortedReports = [...filteredReports].sort((a, b) => {
        if (sortBy === 'severity') {
            const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            return (severityOrder[b.severity as keyof typeof severityOrder] || 0) -
                (severityOrder[a.severity as keyof typeof severityOrder] || 0);
        }
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });

    const toggleType = (type: HazardType) => {
        setSelectedTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const toggleSeverity = (severity: string) => {
        setSelectedSeverities(prev =>
            prev.includes(severity) ? prev.filter(s => s !== severity) : [...prev, severity]
        );
    };

    const toggleStatus = (status: string) => {
        setSelectedStatuses(prev =>
            prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
        );
    };

    const clearFilters = () => {
        setSelectedTypes([]);
        setSelectedSeverities([]);
        setSelectedStatuses([]);
    };

    const severityColors = {
        critical: '#DC2626',
        high: '#EA580C',
        medium: '#F59E0B',
        low: '#10B981'
    };

    return (
        <PageContainer>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    className="mb-8"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{t('citizenDashboard.title')}</h1>
                    <p className="text-gray-600 dark:text-gray-400">{t('citizenDashboard.subtitle')}</p>
                </motion.div>

                {/* Live Threats Bulletin */}
                <LiveThreatsBulletin />

                {/* Stats */}
                <DashboardStats
                    totalDonations={0}
                    volunteerHours={0}
                    reportsSubmitted={reports.length}
                    impactScore={85}
                />

                {/* Filters Toolbar */}
                <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl shadow-md border border-white/20 dark:border-slate-700/50 p-4 mb-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            {/* Hazard Type Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => {
                                        setShowTypeDropdown(!showTypeDropdown);
                                        setShowSeverityDropdown(false);
                                        setShowStatusDropdown(false);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors text-sm font-medium text-gray-700 dark:text-gray-200"
                                >
                                    <Filter className="w-4 h-4" />
                                    <span>{t('citizenDashboard.type')} {selectedTypes.length > 0 && `(${selectedTypes.length})`}</span>
                                    <ChevronDown className={`w-4 h-4 transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`} />
                                </button>

                                <AnimatePresence>
                                    {showTypeDropdown && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 py-2 z-50 max-h-96 overflow-y-auto"
                                        >
                                            {Object.entries(HAZARDS).map(([type, config]) => {
                                                const Icon = config.icon;
                                                return (
                                                    <button
                                                        key={type}
                                                        onClick={() => toggleType(type as HazardType)}
                                                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedTypes.includes(type as HazardType)}
                                                            onChange={() => { }}
                                                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                        <div
                                                            className="w-6 h-6 rounded-lg flex items-center justify-center"
                                                            style={{ backgroundColor: `${config.color}20` }}
                                                        >
                                                            <Icon className="w-4 h-4" style={{ color: config.color }} />
                                                        </div>
                                                        <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{config.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Severity Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => {
                                        setShowSeverityDropdown(!showSeverityDropdown);
                                        setShowTypeDropdown(false);
                                        setShowStatusDropdown(false);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors text-sm font-medium text-gray-700 dark:text-gray-200"
                                >
                                    <Filter className="w-4 h-4" />
                                    <span>Severity {selectedSeverities.length > 0 && `(${selectedSeverities.length})`}</span>
                                    <ChevronDown className={`w-4 h-4 transition-transform ${showSeverityDropdown ? 'rotate-180' : ''}`} />
                                </button>

                                <AnimatePresence>
                                    {showSeverityDropdown && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 py-2 z-50"
                                        >
                                            {['critical', 'high', 'medium', 'low'].map((severity) => (
                                                <button
                                                    key={severity}
                                                    onClick={() => toggleSeverity(severity)}
                                                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSeverities.includes(severity)}
                                                        onChange={() => { }}
                                                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: severityColors[severity as keyof typeof severityColors] }}
                                                    />
                                                    <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{severity}</span>
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Status Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => {
                                        setShowStatusDropdown(!showStatusDropdown);
                                        setShowTypeDropdown(false);
                                        setShowSeverityDropdown(false);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors text-sm font-medium text-gray-700 dark:text-gray-200"
                                >
                                    <Filter className="w-4 h-4" />
                                    <span>Status {selectedStatuses.length > 0 && `(${selectedStatuses.length})`}</span>
                                    <ChevronDown className={`w-4 h-4 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                                </button>

                                <AnimatePresence>
                                    {showStatusDropdown && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 py-2 z-50"
                                        >
                                            {['verified', 'pending', 'solved'].map((status) => (
                                                <button
                                                    key={status}
                                                    onClick={() => toggleStatus(status)}
                                                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedStatuses.includes(status)}
                                                        onChange={() => { }}
                                                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span className="text-sm text-gray-700 dark:text-gray-200 capitalize">{status}</span>
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Sort and Clear */}
                        <div className="flex items-center gap-3">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as 'date' | 'severity')}
                                className="px-4 py-2 bg-gray-100 dark:bg-slate-700 border-none rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="date">{t('citizenDashboard.sortByDate')}</option>
                                <option value="severity">{t('citizenDashboard.sortBySeverity')}</option>
                            </select>

                            {(selectedTypes.length > 0 || selectedSeverities.length > 0 || selectedStatuses.length > 0) && (
                                <button
                                    onClick={clearFilters}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <X className="w-4 h-4" />
                                    {t('citizenDashboard.clear')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Feed Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                ) : sortedReports.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-gray-500 text-lg">{t('citizenDashboard.noReports')}</p>
                        <p className="text-gray-400 text-sm mt-2">{t('citizenDashboard.adjustFilters')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sortedReports.map((report, index) => (
                            <HazardCard key={report.id} report={report} index={index} />
                        ))}
                    </div>
                )}
            </div>
        </PageContainer>
    );
}
