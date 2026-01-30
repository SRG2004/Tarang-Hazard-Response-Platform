import React from 'react';
import { PageContainer, PageHeader } from '../components/ui-redesign/PageLayouts';
import { InfoCard } from '../components/ui-redesign/Cards';
import { TrendingUp, BarChart3, PieChart, Activity } from 'lucide-react';

export function DataInsights() {
  return (
    <PageContainer>
      <PageHeader
        title="Data Insights"
        subtitle="Analytics and trends from disaster data"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <InfoCard title="Total Reports" icon={BarChart3} iconColor="#4F46E5" index={0}>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-4">1,247</p>
          <p className="text-sm text-green-600 mt-1">+12% from last month</p>
        </InfoCard>
        <InfoCard title="Active Alerts" icon={Activity} iconColor="#EF4444" index={1}>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-4">23</p>
          <p className="text-sm text-yellow-600 mt-1">Requires attention</p>
        </InfoCard>
        <InfoCard title="Response Time" icon={TrendingUp} iconColor="#10B981" index={2}>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-4">4.2h</p>
          <p className="text-sm text-green-600 mt-1">-15% improvement</p>
        </InfoCard>
        <InfoCard title="Volunteers" icon={PieChart} iconColor="#F59E0B" index={3}>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-4">342</p>
          <p className="text-sm text-green-600 mt-1">+28 this week</p>
        </InfoCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InfoCard title="Reports by Type" icon={PieChart} iconColor="#8B5CF6">
          <div className="mt-4 space-y-3">
            {['Flood', 'Fire', 'Earthquake', 'Cyclone'].map((type, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">{type}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full"
                      style={{ width: `${(4 - i) * 25}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium dark:text-gray-300">{(4 - i) * 25}%</span>
                </div>
              </div>
            ))}
          </div>
        </InfoCard>

        <InfoCard title="Monthly Trends" icon={TrendingUp} iconColor="#3B82F6">
          <div className="mt-4 space-y-3">
            {['Jan', 'Feb', 'Mar', 'Apr'].map((month, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">{month}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${60 + i * 10}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium dark:text-gray-300">{60 + i * 10}</span>
                </div>
              </div>
            ))}
          </div>
        </InfoCard>
      </div>
    </PageContainer>
  );
}
