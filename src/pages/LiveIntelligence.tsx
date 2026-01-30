import { useState, useEffect } from 'react';
import { PageContainer, PageHeader } from '../components/ui-redesign/PageLayouts';
import { SearchBar, TabGroup } from '../components/ui-redesign/Interactive';
import { InfoCard, LoadingState, EmptyState } from '../components/ui-redesign/Cards';
import {
  MessageSquare, Share2, Calendar, RefreshCw,
  Youtube, Newspaper, TrendingUp, Activity, BarChart2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import apiService from '../services/apiService';
import { toast } from 'sonner';
import { useTranslation } from '../contexts/TranslationContext';

export function LiveIntelligence() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('feed');
  const [alerts, setAlerts] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [alertsData, analyticsData] = await Promise.all([
        apiService.getOsintAlerts({ limit: 50 }),
        apiService.getOsintAnalytics()
      ]);

      if (alertsData.success) setAlerts(alertsData.alerts);
      if (analyticsData.success) setAnalytics(analyticsData.analytics);
    } catch (error) {
      console.error('Error fetching intelligence:', error);
      toast.error('Failed to load intelligence data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    toast.info(t('intelligence.scanning'));
    try {
      const result = await apiService.triggerOsintScan();
      if (result.success) {
        toast.success(t('intelligence.scanComplete', { count: result.stats?.saved || 0 }));
        fetchData(); // Reload data
      } else {
        toast.error(t('intelligence.scanFailed'));
      }
    } catch (error) {
      toast.error('Error triggering scan');
    } finally {
      setRefreshing(false);
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.description?.toLowerCase().includes(search.toLowerCase()) ||
      alert.title?.toLowerCase().includes(search.toLowerCase());
    const matchesPlatform = filterPlatform === 'all' || alert.platform === filterPlatform;
    return matchesSearch && matchesPlatform;
  });

  // Analytics Data Preparation
  const sourceData = analytics ? Object.keys(analytics.sources).map(key => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: analytics.sources[key]
  })) : [];

  const hazardData = analytics ? Object.keys(analytics.hazards).map(key => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    count: analytics.hazards[key]
  })) : [];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  if (loading && !refreshing && alerts.length === 0) {
    return (
      <PageContainer>
        <LoadingState />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex justify-between items-start mb-6">
        <PageHeader
          title={t('intelligence.title')}
          subtitle={t('intelligence.subtitle')}
        />
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors ${refreshing ? 'opacity-75 cursor-not-allowed' : ''}`}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Scanning...' : 'Refresh Analysis'}
        </button>
      </div>

      <TabGroup
        tabs={[
          { id: 'feed', label: 'Live Feed', icon: Activity },
          { id: 'analytics', label: 'Analytics', icon: BarChart2 }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'feed' ? (
        <div className="space-y-6 mt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search alerts (e.g. 'Mumbai', 'Cyclone')..."
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {['all', 'youtube', 'gnews', 'google_trends'].map(platform => (
                <button
                  key={platform}
                  onClick={() => setFilterPlatform(platform)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filterPlatform === platform
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700 border'
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                >
                  {platform === 'all' ? 'All Sources' :
                    platform === 'gnews' ? 'Google News' :
                      platform === 'google_trends' ? 'Google Trends' : 'YouTube'}
                </button>
              ))}
            </div>
          </div>

          {filteredAlerts.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No alerts found"
              description="Try adjusting your filters or refresh the analysis"
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredAlerts.map((alert, i) => (
                <InfoCard
                  key={alert.id || i}
                  title={alert.title}
                  icon={
                    alert.platform === 'youtube' ? Youtube :
                      alert.platform === 'gnews' ? Newspaper :
                        alert.platform === 'google_trends' ? TrendingUp : MessageSquare
                  }
                  iconColor={
                    alert.platform === 'youtube' ? '#FF0000' :
                      alert.platform === 'gnews' ? '#4285F4' :
                        alert.platform === 'google_trends' ? '#F4B400' : '#1DA1F2'
                  }
                  index={i}
                >
                  <div className="space-y-3 mt-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">{alert.description}</p>

                    {/* AI Analysis Search Badge */}
                    <div className="flex flex-wrap gap-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${alert.aiAnalysis?.isHazard ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {alert.aiAnalysis?.hazardType || 'Potential Hazard'}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">
                        {alert.aiAnalysis?.confidence ? `${(alert.aiAnalysis.confidence * 100).toFixed(0)}% Confidence` : 'Unverified'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(alert.timestamp).toLocaleDateString()}</span>
                        </div>
                        {alert.location?.name && (
                          <div className="flex items-center gap-1">
                            📍 {alert.location.name}
                          </div>
                        )}
                      </div>

                      <a
                        href={alert.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1"
                      >
                        Visit Source <Share2 className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </InfoCard>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Source Distribution */}
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md p-6 rounded-2xl shadow-md border border-white/20 dark:border-slate-700/50">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Intelligence Sources</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {sourceData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 flex-wrap mt-4">
                {sourceData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-sm text-gray-600 dark:text-gray-300">{entry.name} ({entry.value})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hazard Distribution */}
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md p-6 rounded-2xl shadow-md border border-white/20 dark:border-slate-700/50">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Detected Hazards</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hazardData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

