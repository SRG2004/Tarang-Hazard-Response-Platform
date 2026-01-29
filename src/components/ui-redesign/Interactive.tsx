import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface TabItem {
    id: string;
    label: string;
    icon?: any;
}

interface TabGroupProps {
    tabs: TabItem[];
    activeTab: string;
    onChange: (tabId: string) => void;
}

export const TabGroup: React.FC<TabGroupProps> = ({ tabs, activeTab, onChange }) => {
    return (
        <div className="border-b border-gray-200 dark:border-slate-800 mb-6">
            <div className="flex gap-1 overflow-x-auto pb-px no-scrollbar">
                {tabs.map((tab, index) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon as React.ElementType;
                    return (
                        <motion.button
                            key={tab.id}
                            onClick={() => onChange(tab.id)}
                            className={`
                relative px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap
                ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}
              `}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ y: -2 }}
                        >
                            <div className="flex items-center gap-2">
                                {Icon && <Icon className="w-4 h-4" />}
                                {tab.label}
                            </div>
                            {isActive && (
                                <motion.div
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-500"
                                    layoutId="activeTab"
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            )}
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
};

interface FilterPanelProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ title, children, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <motion.div
            className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-xl shadow-md overflow-hidden border border-white/20 dark:border-slate-700/50"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
        >
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/50 dark:hover:bg-slate-700/50 transition-colors"
            >
                <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
                <motion.svg
                    className="w-5 h-5 text-gray-600 dark:text-gray-400"
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
            </button>
            <motion.div
                initial={false}
                animate={{ height: isOpen ? 'auto' : 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
            >
                <div className="px-6 pb-6">
                    {children}
                </div>
            </motion.div>
        </motion.div>
    );
};

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, placeholder = 'Search...' }) => {
    return (
        <motion.div
            className="relative"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-12 pr-4 py-3 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all dark:text-white"
            />
        </motion.div>
    );
};

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
    return (
        <motion.div
            className="flex items-center justify-center gap-2 mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
        >
            <motion.button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
                    }`}
                whileHover={currentPage !== 1 ? { scale: 1.05 } : undefined}
                whileTap={currentPage !== 1 ? { scale: 0.95 } : undefined}
            >
                Previous
            </motion.button>

            <div className="flex gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <motion.button
                        key={page}
                        onClick={() => onPageChange(page)}
                        className={`w-10 h-10 rounded-lg font-medium transition-colors ${currentPage === page
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
                            }`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        {page}
                    </motion.button>
                ))}
            </div>

            <motion.button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
                    }`}
                whileHover={currentPage !== totalPages ? { scale: 1.05 } : undefined}
                whileTap={currentPage !== totalPages ? { scale: 0.95 } : undefined}
            >
                Next
            </motion.button>
        </motion.div>
    );
};
