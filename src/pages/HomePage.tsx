import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer, PageHeader } from '../components/ui-redesign/PageLayouts';
import { ActionCard } from '../components/ui-redesign/Cards';
import { AlertTriangle, Map, Phone, Users, Settings, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function HomePage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  return (
    <PageContainer>
      <PageHeader
        title="Welcome to Tarang"
        subtitle="Hazard Response Platform"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ActionCard
          title="Report Hazard"
          description="Report a disaster or emergency situation"
          icon={AlertTriangle}
          color="#EF4444"
          onClick={() => navigate('/report-hazard')}
          index={0}
        />
        <ActionCard
          title="View Map"
          description="See real-time hazard locations"
          icon={Map}
          color="#3B82F6"
          onClick={() => navigate('/map')}
          index={1}
        />
        <ActionCard
          title="Emergency Contacts"
          description="Quick access to emergency services"
          icon={Phone}
          color="#10B981"
          onClick={() => navigate('/emergency-contacts')}
          index={2}
        />
        <ActionCard
          title="Volunteer"
          description="Join disaster response efforts"
          icon={Users}
          color="#F59E0B"
          onClick={() => navigate('/volunteer-management')}
          index={3}
        />
        <ActionCard
          title="Dashboard"
          description="View your activity and reports"
          icon={FileText}
          color="#8B5CF6"
          onClick={() => navigate('/dashboard')}
          index={4}
        />
        <ActionCard
          title="Settings"
          description="Manage your account preferences"
          icon={Settings}
          color="#6B7280"
          onClick={() => navigate('/settings')}
          index={5}
        />
      </div>
    </PageContainer>
  );
}
