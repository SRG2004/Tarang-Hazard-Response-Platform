import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface SeveritySliderProps {
    value: 'low' | 'medium' | 'high' | 'critical' | '';
    onChange: (value: 'low' | 'medium' | 'high' | 'critical') => void;
}

const severityLevels = [
    { value: 'low' as const, label: 'Low', color: '#10B981', position: 0 },
    { value: 'medium' as const, label: 'Medium', color: '#F59E0B', position: 33.33 },
    { value: 'high' as const, label: 'High', color: '#EF4444', position: 66.66 },
    { value: 'critical' as const, label: 'Critical', color: '#DC2626', position: 100 }
];

export const SeveritySlider: React.FC<SeveritySliderProps> = ({ value, onChange }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [sliderValue, setSliderValue] = useState(33.33); // Start at medium

    // Initialize slider value based on severity
    useEffect(() => {
        const level = severityLevels.find(l => l.value === value);
        if (level) {
            setSliderValue(level.position);
        }
    }, [value]);

    const currentLevel = severityLevels.find(level => level.value === value) || severityLevels[1];

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = parseFloat(e.target.value);
        setSliderValue(newValue);

        // Map slider value (0-100) to severity levels with better thresholds
        if (newValue < 16.66) {
            onChange('low');
        } else if (newValue < 50) {
            onChange('medium');
        } else if (newValue < 83.33) {
            onChange('high');
        } else {
            onChange('critical');
        }
    };

    return (
        <div className="space-y-6">
            {/* Current Severity Display */}
            <motion.div
                className="text-center"
                key={value}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
                <motion.h3
                    className="text-4xl font-bold mb-2"
                    style={{ color: currentLevel.color }}
                    animate={{ color: currentLevel.color }}
                    transition={{ duration: 0.3 }}
                >
                    {currentLevel.label}
                </motion.h3>
                <p className="text-gray-600 text-sm">
                    Drag the slider to indicate the severity of the situation
                </p>
            </motion.div>

            {/* Slider Container - FIXED POSITIONING */}
            <div className="relative px-4 h-12 flex items-center">
                {/* Background Track with Gradient */}
                <div className="absolute left-4 right-4 h-2 bg-gradient-to-r from-green-500 via-yellow-500 via-orange-500 to-red-600 rounded-full" />

                {/* Slider Input - Invisible but clickable */}
                <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    value={sliderValue}
                    onChange={handleSliderChange}
                    onMouseDown={() => setIsDragging(true)}
                    onMouseUp={() => setIsDragging(false)}
                    onTouchStart={() => setIsDragging(true)}
                    onTouchEnd={() => setIsDragging(false)}
                    className="absolute left-0 right-0 w-full h-12 opacity-0 cursor-pointer z-10"
                />

                {/* Animated Thumb - Positioned on the bar */}
                <motion.div
                    className="absolute -ml-6 pointer-events-none"
                    style={{
                        left: `calc(${sliderValue}% - 16px + ${sliderValue * 0.32}px)`
                    }}
                    animate={{
                        scale: isDragging ? 1.2 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                    <motion.div
                        className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center"
                        style={{ backgroundColor: currentLevel.color }}
                        animate={{ backgroundColor: currentLevel.color }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="w-3 h-3 bg-white rounded-full" />
                    </motion.div>
                </motion.div>
            </div>

            {/* Severity Labels */}
            <div className="flex justify-between px-2 text-xs font-medium">
                {severityLevels.map((level, index) => (
                    <motion.button
                        key={level.value}
                        type="button"
                        onClick={() => {
                            onChange(level.value);
                            setSliderValue(level.position);
                        }}
                        className={`
              px-3 py-1 rounded-full transition-all
              ${value === level.value
                                ? 'text-white shadow-md'
                                : 'text-gray-600 hover:text-gray-900'
                            }
            `}
                        style={{
                            backgroundColor: value === level.value ? level.color : 'transparent'
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        {level.label}
                    </motion.button>
                ))}
            </div>

            {/* Tip */}
            <motion.div
                className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                <p className="text-sm text-blue-900">
                    <span className="font-semibold">Tip:</span> Drag the slider or click the labels below to set severity
                </p>
            </motion.div>
        </div>
    );
};
