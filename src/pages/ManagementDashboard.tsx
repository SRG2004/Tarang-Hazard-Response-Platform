import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer, PageHeader } from '../components/ui-redesign/PageLayouts';
import { DashboardStats } from '../components/feed/DashboardStats';
import { ActionCard, InfoCard, LoadingState } from '../components/ui-redesign/Cards';
import { FileText, Users, AlertTriangle, CheckCircle, HandHeart, TrendingUp, Eye, UserCheck } from 'lucide-react';
import apiService from '../services/apiService';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

export function ManagementDashboard() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!userProfile) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [reportsRes, volunteersRes, donationsRes] = await Promise.all([
          apiService.getReports(),
          apiService.getVolunteers(),
          apiService.getDonations({ limit: 50 }),
        ]);

        if (reportsRes.success !== false && reportsRes.reports) {
          setReports(reportsRes.reports);
        }
        if (volunteersRes.success !== false && volunteersRes.volunteers) {
          setVolunteers(volunteersRes.volunteers);
        }
        if (donationsRes && donationsRes.success && donationsRes.donations) {
          setDonations(donationsRes.donations);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userProfile]);

  const pendingReports = reports.filter(r => r.status === 'pending').length;
  const verifiedReports = reports.filter(r => r.status === 'verified').length;
  const activeVolunteers = volunteers.filter(v => v.status === 'active').length;
  const totalDonations = donations.reduce((sum, d) => sum + (d.amount || 0), 0);

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
        title="Management Dashboard"
        subtitle="Monitor and manage disaster response activities"
      />

      {/* Stats Overview */}
      <DashboardStats
        totalDonations={totalDonations}
        volunteerHours={activeVolunteers * 8}
        reportsSubmitted={reports.length}
        impactScore={verifiedReports * 10}
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <ActionCard
          title="Review Reports"
          description={`${pendingReports} pending verification`}
          icon={FileText}
          color="#4F46E5"
          onClick={() => navigate('/reports-management')}
          index={0}
        />
        <ActionCard
          title="Manage Volunteers"
          description={`${activeVolunteers} active volunteers`}
          icon={Users}
          color="#10B981"
          onClick={() => navigate('/volunteer-management')}
          index={1}
        />
        <ActionCard
          title="View Map"
          description="Real-time hazard locations"
          icon={AlertTriangle}
          color="#F59E0B"
          onClick={() => navigate('/map')}
          index={2}
        />
        <ActionCard
          title="Emergency Contacts"
          description="Quick access to services"
          icon={CheckCircle}
          color="#3B82F6"
          onClick={() => navigate('/emergency-contacts')}
          index={3}
        />
        <ActionCard
          title="Donations"
          description={`₹${totalDonations.toLocaleString()} raised`}
          icon={HandHeart}
          color="#8B5CF6"
          onClick={() => navigate('/donation')}
          index={4}
        />
        <ActionCard
          title="Analytics"
          description="View insights and trends"
          icon={TrendingUp}
          color="#EC4899"
          onClick={() => navigate('/data-insights')}
          index={5}
        />

      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InfoCard
          title="Recent Reports"
          icon={Eye}
          iconColor="#4F46E5"
        >
          <div className="space-y-3 mt-4">
            {reports.slice(0, 5).map((report, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-slate-700/50 backdrop-blur-sm rounded-lg border border-white/10">
                <div>
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{report.title || 'Untitled Report'}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{report.location || 'Unknown location'}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${report.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                  {report.status || 'pending'}
                </span>
              </div>
            ))}
          </div>
        </InfoCard>

        <InfoCard
          title="Active Volunteers"
          icon={UserCheck}
          iconColor="#10B981"
        >
          <div className="space-y-3 mt-4">
            {volunteers.slice(0, 5).map((volunteer, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-slate-700/50 backdrop-blur-sm rounded-lg border border-white/10">
                <div>
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{volunteer.name || 'Volunteer'}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{volunteer.skills?.join(', ') || 'General'}</p>
                </div>
                <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                  Active
                </span>
              </div>
            ))}
          </div>
        </InfoCard>
      </div>
    </PageContainer>
  );
}
