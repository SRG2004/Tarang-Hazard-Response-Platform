import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Calendar, User, CheckCircle, Clock } from 'lucide-react';
import { HazardReport } from '../../types';
import { HAZARDS } from '../../config/hazards';

interface HazardCardProps {
    report: HazardReport;
    index: number;
    onClick?: () => void;
}

export const HazardCard: React.FC<HazardCardProps> = ({ report, index, onClick }) => {
    const hazardConfig = HAZARDS[report.type];

    const getStatusBadge = () => {
        if (report.status === 'verified' || report.verifiedBy) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                    <CheckCircle className="w-3 h-3" />
                    Verified
                </span>
            );
        }
        if (report.status === 'solved') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-full">
                    <CheckCircle className="w-3 h-3" />
                    Resolved
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-full">
                <Clock className="w-3 h-3" />
                Pending
            </span>
        );
    };

    const getSeverityColor = () => {
        switch (report.severity) {
            case 'critical': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50';
            case 'high': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/50';
            case 'moderate': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/50';
            case 'low': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50';
            default: return 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700/50';
        }
    };

    // Get status-based card styling
    const getStatusStyling = () => {
        if (report.status === 'verified' || report.verifiedBy) {
            return {
                borderColor: '#10B981', // Green for verified
                bgClass: 'bg-green-50/30'
            };
        }
        if (report.status === 'solved' || report.status === 'rejected') {
            return {
                borderColor: '#3B82F6', // Blue for resolved
                bgClass: 'bg-blue-50/30'
            };
        }
        // Pending/active reports
        return {
            borderColor: '#F59E0B', // Orange for pending/active
            bgClass: 'bg-orange-50/30'
        };
    };

    const statusStyle = getStatusStyling();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
            whileHover={{ y: -4, scale: 1.02 }}
            onClick={onClick}
            className={`bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer overflow-hidden border border-white/20 dark:border-slate-700/50 border-l-4 ${statusStyle.bgClass}`}
            style={{ borderLeftColor: statusStyle.borderColor }}
        >
            {/* Header with colored bar */}
            <div
                className="h-2"
                style={{ backgroundColor: hazardConfig?.color || '#6B7280' }}
            />

            <div className="p-6">
                {/* Title and Status */}
                <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex-1 pr-2">
                        {report.title}
                    </h3>
                    {getStatusBadge()}
                </div>

                {/* Description */}
                {report.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {report.description}
                    </p>
                )}

                {/* Severity Badge */}
                <div className="mb-4">
                    <span className={`inline-block px-3 py-1 text-xs font-bold uppercase rounded-full border ${getSeverityColor()}`}>
                        {report.severity}
                    </span>
                </div>

                {/* Meta Information */}
                <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{report.location || `${report.latitude}, ${report.longitude}`}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>
                            {new Date(report.submittedAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                            })}
                        </span>
                    </div>

                    {report.submittedBy && (
                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span>Reported by citizen</span>
                        </div>
                    )}
                </div>

                {/* Photo Preview */}
                {report.imageUrl && (
                    <motion.div
                        className="mt-4 rounded-lg overflow-hidden"
                        whileHover={{ scale: 1.02 }}
                    >
                        <img
                            src={report.imageUrl}
                            alt={report.title}
                            className="w-full h-48 object-cover"
                        />
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};
