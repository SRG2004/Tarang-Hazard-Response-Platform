import React, { useState, useEffect } from 'react';
import { PageContainer, PageHeader } from '../components/ui-redesign/PageLayouts';
import { SearchBar } from '../components/ui-redesign/Interactive';
import { InfoCard, LoadingState, EmptyState } from '../components/ui-redesign/Cards';
import { Users, Mail, Phone, Award } from 'lucide-react';
import apiService from '../services/apiService';
import { toast } from 'sonner';

export function VolunteerManagement() {
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchVolunteers = async () => {
      try {
        const response = await apiService.getVolunteers();
        if (response.success && response.volunteers) {
          setVolunteers(response.volunteers);
        }
      } catch (error) {
        console.error('Error fetching volunteers:', error);
        toast.error('Failed to load volunteers');
      } finally {
        setLoading(false);
      }
    };

    fetchVolunteers();
  }, []);

  const filteredVolunteers = volunteers.filter(volunteer =>
    volunteer.name?.toLowerCase().includes(search.toLowerCase()) ||
    volunteer.skills?.some((skill: string) => skill.toLowerCase().includes(search.toLowerCase()))
  );

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
        title="Volunteer Management"
        subtitle="Manage and coordinate volunteer activities"
      />

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search volunteers..."
      />

      {filteredVolunteers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No volunteers found"
          description="Try adjusting your search"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {filteredVolunteers.map((volunteer, i) => (
            <InfoCard
              key={volunteer.id || i}
              title={volunteer.name || 'Volunteer'}
              icon={Users}
              iconColor="#10B981"
              index={i}
            >
              <div className="space-y-2 mt-4">
                {volunteer.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <a href={`mailto:${volunteer.email}`} className="text-indigo-600 hover:underline truncate">
                      {volunteer.email}
                    </a>
                  </div>
                )}
                {volunteer.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <a href={`tel:${volunteer.phone}`} className="text-indigo-600 hover:underline">
                      {volunteer.phone}
                    </a>
                  </div>
                )}
                {volunteer.skills && volunteer.skills.length > 0 && (
                  <div className="flex items-start gap-2 text-sm">
                    <Award className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="flex flex-wrap gap-1">
                      {volunteer.skills.map((skill: string, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {volunteer.status && (
                  <span className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${volunteer.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                    }`}>
                    {volunteer.status}
                  </span>
                )}
              </div>
            </InfoCard>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
