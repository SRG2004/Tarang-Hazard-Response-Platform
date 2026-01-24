import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface TabItem {
    id: string;
    label: string;
    icon?: React.ReactNode;
}

interface TabGroupProps {
    tabs: TabItem[];
    activeTab: string;
    onChange: (tabId: string) => void;
}

export const TabGroup: React.FC<TabGroupProps> = ({ tabs, activeTab, onChange }) => {
    return (
        <div className="border-b border-gray-200 mb-6">
            <div className="flex gap-1">
                {tabs.map((tab, index) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <motion.button
                            key={tab.id}
                            onClick={() => onChange(tab.id)}
                            className={`
                relative px-6 py-3 font-medium text-sm transition-colors
                ${isActive ? 'text-indigo-600' : 'text-gray-600 hover:text-gray-900'}
              `}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ y: -2 }}
                        >
                            <div className="flex items-center gap-2">
                                {tab.icon}
                                {tab.label}
                            </div>
                            {isActive && (
                                <motion.div
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
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
            className="bg-white rounded-xl shadow-md overflow-hidden"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
        >
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <motion.svg
                    className="w-5 h-5 text-gray-600"
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
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
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
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
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
