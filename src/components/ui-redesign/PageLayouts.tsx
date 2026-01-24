import React from 'react';
import { motion } from 'framer-motion';
import { animations } from '../../lib/animations';

interface PageContainerProps {
    children: React.ReactNode;
    className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({ children, className = '' }) => {
    return (
        <motion.div
            initial={animations.pageTransition.initial}
            animate={animations.pageTransition.animate}
            exit={animations.pageTransition.exit}
            transition={animations.pageTransition.transition}
            className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-950 p-6 transition-colors duration-300 ${className}`}
        >
            <div className="max-w-7xl mx-auto">
                {children}
            </div>
        </motion.div>
    );
};

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
    className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions, className = '' }) => {
    return (
        <motion.div
            className={`mb-8 flex items-start justify-between ${className}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{title}</h1>
                {subtitle && <p className="text-gray-600 dark:text-gray-400">{subtitle}</p>}
            </div>
            {actions && (
                <div className="flex gap-3">
                    {actions}
                </div>
            )}
        </motion.div>
    );
};

interface ContentSectionProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
}

export const ContentSection: React.FC<ContentSectionProps> = ({ children, className = '', delay = 0 }) => {
    return (
        <motion.div
            className={`bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 ${className}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
        >
            {children}
        </motion.div>
    );
};

interface TwoColumnLayoutProps {
    sidebar: React.ReactNode;
    content: React.ReactNode;
    sidebarWidth?: string;
}

export const TwoColumnLayout: React.FC<TwoColumnLayoutProps> = ({
    sidebar,
    content,
    sidebarWidth = 'w-80'
}) => {
    return (
        <div className="flex gap-6">
            <div className={`${sidebarWidth} flex-shrink-0`}>
                {sidebar}
            </div>
            <div className="flex-1">
                {content}
            </div>
        </div>
    );
};
