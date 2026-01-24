import React from 'react';
import { View, Text } from 'react-native';
import { LucideIcon } from 'lucide-react-native';

interface DashboardCardProps {
    title: string;
    value: string | number;
    description?: string;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    className?: string;
}

export function DashboardCard({
    title,
    value,
    description,
    icon: Icon,
    trend,
    className = ''
}: DashboardCardProps) {
    return (
        <View className={`bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100 ${className}`}>
            <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-medium text-gray-500">{title}</Text>
                <View className="p-2 rounded-lg bg-blue-50">
                    <Icon size={16} color="#0077B6" />
                </View>
            </View>

            <Text className="text-3xl font-bold text-gray-900 mb-1">{value}</Text>

            {description && (
                <Text className="text-xs text-gray-500 mt-1">{description}</Text>
            )}

            {trend && (
                <View className="flex-row items-center mt-3">
                    <Text className={`text-xs font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                    </Text>
                    <Text className="text-xs text-gray-400 ml-1">from last month</Text>
                </View>
            )}
        </View>
    );
}
