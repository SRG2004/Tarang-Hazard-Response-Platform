import React from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Award, IndianRupee } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    trend?: string;
    index: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, trend, index }) => {
    return (
        <motion.div
            className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow border border-white/20 dark:border-slate-700/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
            whileHover={{ y: -4, scale: 1.02 }}
        >
            <div className="flex items-center justify-between mb-4">
                <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${color}20` }}
                >
                    <div style={{ color }}>{icon}</div>
                </div>
                {trend && (
                    <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {trend}
                    </span>
                )}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
        </motion.div>
    );
};

interface DashboardStatsProps {
    totalDonations?: number;
    volunteerHours?: number;
    reportsSubmitted?: number;
    impactScore?: number;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
    totalDonations = 0,
    volunteerHours = 0,
    reportsSubmitted = 0,
    impactScore = 0
}) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const stats = [
        {
            title: 'Total Donations',
            value: formatCurrency(totalDonations),
            icon: <IndianRupee className="w-6 h-6" />,
            color: '#10B981',
            trend: totalDonations > 0 ? '+12% this month' : undefined
        },
        {
            title: 'Volunteer Hours',
            value: volunteerHours,
            icon: <Users className="w-6 h-6" />,
            color: '#3B82F6',
            trend: volunteerHours > 0 ? '+8 hrs this week' : undefined
        },
        {
            title: 'Reports Submitted',
            value: reportsSubmitted,
            icon: <TrendingUp className="w-6 h-6" />,
            color: '#F59E0B',
            trend: reportsSubmitted > 0 ? `${reportsSubmitted} total` : undefined
        },
        {
            title: 'Impact Score',
            value: impactScore,
            icon: <Award className="w-6 h-6" />,
            color: '#8B5CF6',
            trend: impactScore > 50 ? 'Top contributor!' : undefined
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
                <StatCard key={stat.title} {...stat} index={index} />
            ))}
        </div>
    );
};
