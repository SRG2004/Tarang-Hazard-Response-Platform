import React from 'react';
import { motion } from 'framer-motion';
import { Filter } from 'lucide-react';
import { HazardType } from '../../types';
import { HAZARDS } from '../../config/hazards';

interface FeedFiltersProps {
    selectedTypes: HazardType[];
    onTypeToggle: (type: HazardType) => void;
    selectedSeverities: string[];
    onSeverityToggle: (severity: string) => void;
    selectedStatuses: string[];
    onStatusToggle: (status: string) => void;
}

const severities = [
    { value: 'low', label: 'Low', color: '#10B981' },
    { value: 'medium', label: 'Medium', color: '#F59E0B' },
    { value: 'high', label: 'High', color: '#EF4444' },
    { value: 'critical', label: 'Critical', color: '#DC2626' }
];

const statuses = [
    { value: 'pending', label: 'Pending', color: '#6B7280' },
    { value: 'verified', label: 'Verified', color: '#10B981' },
    { value: 'resolved', label: 'Resolved', color: '#3B82F6' }
];

export const FeedFilters: React.FC<FeedFiltersProps> = ({
    selectedTypes,
    onTypeToggle,
    selectedSeverities,
    onSeverityToggle,
    selectedStatuses,
    onStatusToggle
}) => {
    return (
        <motion.div
            className="bg-white rounded-2xl shadow-lg p-6 sticky top-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-6">
                <Filter className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-gray-900">Filters</h3>
            </div>

            {/* Disaster Types */}
            <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Disaster Types</h4>
                <div className="space-y-2">
                    {Object.entries(HAZARDS).map(([key, config], index) => {
                        const hazardType = key as HazardType;
                        const isSelected = selectedTypes.includes(hazardType);

                        return (
                            <motion.label
                                key={hazardType}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                whileHover={{ x: 4 }}
                            >
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => onTypeToggle(hazardType)}
                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: config.color }}
                                />
                                <span className="text-sm text-gray-700">{config.label}</span>
                            </motion.label>
                        );
                    })}
                </div>
            </div>

            {/* Severity Levels */}
            <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Severity Levels</h4>
                <div className="space-y-2">
                    {severities.map((severity, index) => {
                        const isSelected = selectedSeverities.includes(severity.value);

                        return (
                            <motion.label
                                key={severity.value}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                whileHover={{ x: 4 }}
                            >
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => onSeverityToggle(severity.value)}
                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: severity.color }}
                                />
                                <span className="text-sm text-gray-700 capitalize">{severity.label}</span>
                            </motion.label>
                        );
                    })}
                </div>
            </div>

            {/* Verification Status */}
            <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Status</h4>
                <div className="space-y-2">
                    {statuses.map((status, index) => {
                        const isSelected = selectedStatuses.includes(status.value);

                        return (
                            <motion.label
                                key={status.value}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                whileHover={{ x: 4 }}
                            >
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => onStatusToggle(status.value)}
                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: status.color }}
                                />
                                <span className="text-sm text-gray-700 capitalize">{status.label}</span>
                            </motion.label>
                        );
                    })}
                </div>
            </div>

            {/* Clear All */}
            <motion.button
                type="button"
                onClick={() => {
                    selectedTypes.forEach(type => onTypeToggle(type));
                    selectedSeverities.forEach(sev => onSeverityToggle(sev));
                    selectedStatuses.forEach(stat => onStatusToggle(stat));
                }}
                className="w-full mt-6 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                Clear All Filters
            </motion.button>
        </motion.div>
    );
};
