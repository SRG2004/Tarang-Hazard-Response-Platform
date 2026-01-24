import React from 'react';
import { motion } from 'framer-motion';
import { Waves, Mountain, Wind, Flame, Sun, Building2, AlertTriangle, Ship } from 'lucide-react';
import { HazardType } from '../../types';
import { HAZARDS } from '../../config/hazards';

interface HazardIconSelectorProps {
    selected: HazardType | '';
    onSelect: (type: HazardType) => void;
}

const hazardIcons: Record<HazardType, React.ReactNode> = {
    flood: <Waves className="w-8 h-8" />,
    earthquake: <Mountain className="w-8 h-8" />,
    cyclone: <Wind className="w-8 h-8" />,
    landslide: <Mountain className="w-8 h-8" />,
    heatwave: <Sun className="w-8 h-8" />,
    wildfire: <Flame className="w-8 h-8" />,
    'urban-disaster': <Building2 className="w-8 h-8" />,
    tsunami: <Ship className="w-8 h-8" />
};

export const HazardIconSelector: React.FC<HazardIconSelectorProps> = ({ selected, onSelect }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(HAZARDS).map(([key, config], index) => {
                const hazardType = key as HazardType;
                const isSelected = selected === hazardType;

                return (
                    <motion.button
                        key={hazardType}
                        type="button"
                        onClick={() => onSelect(hazardType)}
                        className={`
              relative p-6 rounded-xl border-2 transition-all
              ${isSelected
                                ? 'border-indigo-600 bg-indigo-50 shadow-lg'
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                            }
            `}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                        whileHover={{ scale: 1.05, y: -4 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {/* Selection Indicator */}
                        {isSelected && (
                            <motion.div
                                className="absolute top-2 right-2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            >
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </motion.div>
                        )}

                        {/* Icon */}
                        <div
                            className={`
                mb-3 flex justify-center
                ${isSelected ? 'text-indigo-600' : 'text-gray-600'}
              `}
                            style={{ color: isSelected ? config.color : undefined }}
                        >
                            {hazardIcons[hazardType]}
                        </div>

                        {/* Label */}
                        <p className={`
              text-sm font-semibold text-center
              ${isSelected ? 'text-indigo-900' : 'text-gray-700'}
            `}>
                            {config.label}
                        </p>
                    </motion.button>
                );
            })}
        </div>
    );
};
