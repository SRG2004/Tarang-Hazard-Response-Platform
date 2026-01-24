import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer, PageHeader } from '../components/ui-redesign/PageLayouts';
import { DashboardStats } from '../components/feed/DashboardStats';
import { ActionCard, InfoCard, LoadingState } from '../components/ui-redesign/Cards';
import { Users, FileText, Settings, Database, TrendingUp, AlertTriangle, Activity, Package } from 'lucide-react';
import apiService from '../services/apiService';
import { toast } from 'sonner';

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
        <div key={alert.id} className={`p-3 rounded-lg border ${alert.severity === 'critical' ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/50' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-900/50'}`}>
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


        {/* TEMP: Seed Data Button */}
        <div
          onClick={async () => {
            const confirm = window.confirm("Add test reports to database?");
            if (!confirm) return;

            try {
              const { collection, addDoc, Timestamp } = await import('firebase/firestore');
              const { db } = await import('../lib/firebase');

              const reports = [
                {
                  "analyzedAt": Timestamp.fromDate(new Date("2026-01-23T21:18:35+05:30")),
                  "autoRejected": false,
                  "confidenceScore": 0.85,
                  "createdAt": Timestamp.fromDate(new Date("2026-01-23T10:45:12+05:30")),
                  "description": "Severe waterlogging reaching 3 feet in residential areas following Cyclone Senyar remnants. Drain overflow reported.",
                  "latitude": 13.0827,
                  "location": "13.0827, 80.2707",
                  "longitude": 80.2707,
                  "photoURL": "https://cdn.example.com/reports/chennai_flood_01.jpg",
                  "rejectedAt": null,
                  "rejectedBy": null,
                  "rejectionReason": null,
                  "severity": "high",
                  "status": "verified",
                  "submittedAt": Timestamp.fromDate(new Date("2026-01-23T10:40:00+05:30")),
                  "title": "Chennai Urban Flooding",
                  "type": "flood",
                  "updatedAt": Timestamp.fromDate(new Date("2026-01-23T21:18:35+05:30")),
                  "userId": "uR7x9KJm2AcTjUmVbF41x9zoPLM1",
                  "verified": true,
                  "videoURL": ""
                },
                {
                  "analyzedAt": Timestamp.fromDate(new Date("2026-01-23T15:20:10+05:30")),
                  "autoRejected": false,
                  "confidenceScore": 0.92,
                  "createdAt": Timestamp.fromDate(new Date("2025-12-29T08:15:34+05:30")),
                  "description": "Tap water is appearing yellowish and has a strong chemical odor. Multiple neighbors reporting stomach distress.",
                  "latitude": 22.7196,
                  "location": "22.7196, 75.8577",
                  "longitude": 75.8577,
                  "photoURL": "https://cdn.example.com/reports/indore_water_quality.jpg",
                  "rejectedAt": null,
                  "rejectedBy": null,
                  "rejectionReason": null,
                  "severity": "high",
                  "status": "active",
                  "submittedAt": Timestamp.fromDate(new Date("2025-12-29T08:10:22+05:30")),
                  "title": "Water Contamination Alert",
                  "type": "health_hazard",
                  "updatedAt": Timestamp.fromDate(new Date("2026-01-23T15:20:10+05:30")),
                  "userId": "bKPz2HTW4RcTjUmVbF91x1zoKLA5",
                  "verified": true,
                  "videoURL": ""
                },
                {
                  "analyzedAt": Timestamp.fromDate(new Date("2026-01-22T19:45:00+05:30")),
                  "autoRejected": false,
                  "confidenceScore": 0.98,
                  "createdAt": Timestamp.fromDate(new Date("2026-01-22T18:30:15+05:30")),
                  "description": "Massive crowd panic and accident at the railway tracks near Jalgaon. Emergency services needed immediately.",
                  "latitude": 21.0077,
                  "location": "21.0077, 75.5626",
                  "longitude": 75.5626,
                  "photoURL": "",
                  "rejectedAt": null,
                  "rejectedBy": null,
                  "rejectionReason": null,
                  "severity": "critical",
                  "status": "verified",
                  "submittedAt": Timestamp.fromDate(new Date("2026-01-22T18:25:45+05:30")),
                  "title": "Railway Track Emergency",
                  "type": "accident",
                  "updatedAt": Timestamp.fromDate(new Date("2026-01-22T19:45:00+05:30")),
                  "userId": "jLQm5NSP1BcTjUmVbF22x8zoXMA9",
                  "verified": true,
                  "videoURL": "https://cdn.example.com/reports/jalgaon_accident_clip.mp4"
                }
              ];

              const colRef = collection(db, 'reports');
              for (const report of reports) {
                await addDoc(colRef, report);
              }
              alert('Reports added successfully!');
            } catch (e) {
              console.error(e);
              alert('Failed to add reports');
            }
          }}
          className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col items-center justify-center text-center gap-4 group border-dashed border-2 border-gray-300 dark:border-slate-600"
        >
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400 group-hover:bg-gray-100 dark:group-hover:bg-slate-600 transition-colors">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Seed Test Data</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Inject test reports</p>
          </div>
        </div>
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
        <ActionCard
          title="Seed Database"
          description="Populate default data"
          icon={Database}
          color="#2563EB"
          onClick={async () => {
            if (!confirm('This will populate empty collections with default data. Continue?')) return;
            try {
              const res: any = await apiService.seedDatabase();
              if (res.success) {
                toast.success(res.message);
                setTimeout(() => window.location.reload(), 1500);
              } else {
                toast.error('Seeding failed');
              }
            } catch (e) {
              toast.error('Failed to seed DB');
            }
          }}
          index={7}
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
