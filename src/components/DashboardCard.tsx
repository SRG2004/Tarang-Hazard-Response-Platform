import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { LucideIcon } from 'lucide-react';

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
  className = '',
  style
}: DashboardCardProps & { style?: React.CSSProperties }) {
  return (
    <Card className={`${className} hover:shadow-lg transition-all duration-700 ease-in-out`} style={style}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground mb-1">{value}</div>
        {description && (
          <CardDescription className="text-xs mt-1.5">{description}</CardDescription>
        )}
        {trend && (
          <p className={`text-xs mt-3 flex items-center gap-1 font-medium ${trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            <span className={trend.isPositive ? 'text-green-600' : 'text-red-600'}>{trend.isPositive ? '↑' : '↓'}</span>
            {Math.abs(trend.value)}% from last month
          </p>
        )}
      </CardContent>
    </Card>
  );
}
