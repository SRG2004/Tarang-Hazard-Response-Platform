import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer, PageHeader } from '../components/ui-redesign/PageLayouts';
import { DashboardStats } from '../components/feed/DashboardStats';
import { ActionCard, InfoCard, LoadingState } from '../components/ui-redesign/Cards';
import { Users, FileText, Settings, Database, AlertTriangle, Activity, Package } from 'lucide-react';
import apiService from '../services/apiService';
import { toast } from 'sonner';
import { useTranslation } from '../contexts/TranslationContext';

import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

function RecentCriticalReports() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const q = query(
          collection(db, 'reports'),
          where('severity', 'in', ['critical', 'high']),
          orderBy('submittedAt', 'desc'),
          limit(3)
        );
        const snapshot = await getDocs(q);
        setAlerts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Failed to fetch alerts", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, []);

  if (loading) return <div className="text-xs text-gray-500">Loading alerts...</div>;
  if (alerts.length === 0) return <div className="text-xs text-gray-500">No critical alerts.</div>;

  return (
    <>
      {alerts.map(alert => (
        <div key={alert.id} className={`p-3 rounded-lg border ${alert.severity === 'critical' ? 'bg-red-500/10 dark:bg-red-900/20 backdrop-blur-sm border-red-500/20 dark:border-red-500/30' : 'bg-orange-500/10 dark:bg-orange-900/20 backdrop-blur-sm border-orange-500/20 dark:border-orange-500/30'}`}>
          <p className={`text-sm font-medium ${alert.severity === 'critical' ? 'text-red-800 dark:text-red-300' : 'text-orange-800 dark:text-orange-300'}`}>
            {alert.type?.toUpperCase()} - {alert.location?.split(',')[0]}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">{alert.description || alert.title}</p>
          <span className="text-[10px] text-gray-400 mt-1 block">
            {alert.submittedAt?.toDate ? alert.submittedAt.toDate().toLocaleDateString() : 'Just now'}
          </span>
        </div>
      ))}
    </>
  );
}

export function AuthorityDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalReports: 0,
    activeVolunteers: 0,
    systemHealth: 100
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, reportsRes, volunteersRes] = await Promise.all([
          apiService.getUsers(),
          apiService.getReports(),
          apiService.getVolunteers()
        ]);

        setStats({
          totalUsers: usersRes.users?.length || 0,
          totalReports: reportsRes.reports?.length || 0,
          activeVolunteers: volunteersRes.volunteers?.filter((v: any) => v.status === 'active').length || 0,
          systemHealth: 98
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <PageContainer>
        <LoadingState />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Authority Dashboard"
        subtitle="System administration and management"
      />

      <DashboardStats
        totalDonations={0}
        volunteerHours={stats.activeVolunteers * 8}
        reportsSubmitted={stats.totalReports}
        impactScore={stats.systemHealth}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <ActionCard
          title="Impact Reports"
          description="View NGO impact assessments"
          icon={Activity}
          color="#8B5CF6"
          onClick={() => navigate('/impact-reports')}
          index={0}
        />
        <ActionCard
          title="User Management"
          description={`${stats.totalUsers} registered users`}
          icon={Users}
          color="#4F46E5"
          onClick={() => navigate('/user-management')}
          index={0}
        />
        <ActionCard
          title="Reports Management"
          description={`${stats.totalReports} total reports`}
          icon={FileText}
          color="#10B981"
          onClick={() => navigate('/reports')}
          index={1}
        />
        <ActionCard
          title="Emergency Dispatch"
          description="Manage active incidents"
          icon={AlertTriangle}
          color="#EF4444"
          onClick={() => navigate('/emergency-dispatch')}
          index={2}
        />



        <ActionCard
          title="Resource Management"
          description="Track inventory & requests"
          icon={Package}
          color="#F59E0B"
          onClick={() => navigate('/resource-management')}
          index={3}
        />
        <ActionCard
          title="Live Intelligence"
          description="Social media monitoring"
          icon={Activity}
          color="#8B5CF6"
          onClick={() => navigate('/social-media')}
          index={4}
        />
        <ActionCard
          title="Data Exports"
          description="Export system data"
          icon={Database}
          color="#3B82F6"
          onClick={() => navigate('/data-exports')}
          index={5}
        />
        <ActionCard
          title="System Settings"
          description="Security & Configuration"
          icon={Settings}
          color="#6B7280"
          onClick={() => navigate('/settings')}
          index={6}
        />

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InfoCard
          title="System Status"
          icon={Activity}
          iconColor="#10B981"
        >
          <div className="space-y-3 mt-4">
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="text-sm font-medium dark:text-gray-200">API Status</span>
              <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full">Operational</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="text-sm font-medium dark:text-gray-200">Database</span>
              <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full">Healthy</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="text-sm font-medium dark:text-gray-200">Storage</span>
              <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full">Available</span>
            </div>
          </div>
        </InfoCard>

        <InfoCard
          title="Recent Alerts"
          icon={AlertTriangle}
          iconColor="#F59E0B"
        >
          <div className="space-y-3 mt-4">
            <div className="space-y-3 mt-4">
              {/* Always show alert component which handles its own empty state */}
              <RecentCriticalReports />
            </div>
          </div>
        </InfoCard>
      </div>
    </PageContainer>
  );
}
