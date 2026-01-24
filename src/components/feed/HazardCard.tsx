import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Calendar, User, CheckCircle, AlertCircle, Clock } from 'lucide-react';
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
        if (report.verified) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    <CheckCircle className="w-3 h-3" />
                    Verified
                </span>
            );
        }
        if (report.status === 'resolved') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    <CheckCircle className="w-3 h-3" />
                    Resolved
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                <Clock className="w-3 h-3" />
                Pending
            </span>
        );
    };

    const getSeverityColor = () => {
        switch (report.severity) {
            case 'critical': return 'bg-red-100 text-red-700 border-red-200';
            case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'low': return 'bg-green-100 text-green-700 border-green-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    // Get status-based card styling
    const getStatusStyling = () => {
        if (report.verified || report.verifiedBy) {
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
            className={`bg-white rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer overflow-hidden border-l-4 ${statusStyle.bgClass}`}
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
                    <h3 className="text-lg font-bold text-gray-900 flex-1 pr-2">
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

                    {report.userId && (
                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span>Reported by citizen</span>
                        </div>
                    )}
                </div>

                {/* Photo Preview */}
                {report.photoURL && (
                    <motion.div
                        className="mt-4 rounded-lg overflow-hidden"
                        whileHover={{ scale: 1.02 }}
                    >
                        <img
                            src={report.photoURL}
                            alt={report.title}
                            className="w-full h-48 object-cover"
                        />
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};
