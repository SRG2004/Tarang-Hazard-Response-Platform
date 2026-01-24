import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface InfoCardProps {
    title: string;
    description?: string;
    icon?: LucideIcon;
    iconColor?: string;
    children?: React.ReactNode;
    onClick?: () => void;
    index?: number;
    className?: string;
}

export const InfoCard: React.FC<InfoCardProps> = ({
    title,
    description,
    icon: Icon,
    iconColor = '#4F46E5',
    children,
    onClick,
    index = 0,
    className = ''
}) => {
    return (
        <motion.div
            className={`bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 ${onClick ? 'cursor-pointer hover:shadow-xl' : ''} transition-shadow ${className}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
            whileHover={onClick ? { y: -4, scale: 1.02 } : undefined}
            onClick={onClick}
        >
            {Icon && (
                <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${iconColor}20` }}
                >
                    <Icon className="w-6 h-6" style={{ color: iconColor }} />
                </div>
            )}
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
            {description && <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{description}</p>}
            {children}
        </motion.div>
    );
};

interface ActionCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    color: string;
    onClick: () => void;
    index?: number;
}

export const ActionCard: React.FC<ActionCardProps> = ({
    title,
    description,
    icon: Icon,
    color,
    onClick,
    index = 0
}) => {
    return (
        <motion.button
            onClick={onClick}
            className="w-full bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 text-left hover:shadow-xl transition-all"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            <div className="flex items-start gap-4">
                <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${color}20` }}
                >
                    <Icon className="w-7 h-7" style={{ color }} />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
                </div>
            </div>
        </motion.button>
    );
};

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action }) => {
    return (
        <motion.div
            className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-12 text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
        >
            <div className="text-gray-400 mb-4">
                <Icon className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{description}</p>
            {action && (
                <motion.button
                    onClick={action.onClick}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    {action.label}
                </motion.button>
            )}
        </motion.div>
    );
};

export const LoadingState: React.FC = () => {
    return (
        <div className="flex items-center justify-center py-20">
            <motion.div
                className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
        </div>
    );
};
