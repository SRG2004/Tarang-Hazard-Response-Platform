import React, { useState, useEffect } from 'react';
import { PageContainer, PageHeader } from '../components/ui-redesign/PageLayouts';
import { SearchBar, TabGroup } from '../components/ui-redesign/Interactive';
import { InfoCard, LoadingState, EmptyState } from '../components/ui-redesign/Cards';
import { Building2, MapPin, Phone, Clock } from 'lucide-react';
import apiService from '../services/apiService';
import { toast } from 'sonner';

export function EmergencyInfrastructure() {
    const [facilities, setFacilities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        const fetchFacilities = async () => {
            try {
                const response = await apiService.getEmergencyInfrastructure();
                if (response.success && response.facilities) {
                    setFacilities(response.facilities);
                }
            } catch (error) {
                console.error('Error fetching facilities:', error);
                toast.error('Failed to load infrastructure data');
            } finally {
                setLoading(false);
            }
        };

        fetchFacilities();
    }, []);

    const tabs = [
        { id: 'all', label: 'All Facilities' },
        { id: 'hospital', label: 'Hospitals' },
        { id: 'shelter', label: 'Shelters' },
        { id: 'firestation', label: 'Fire Stations' },
        { id: 'police', label: 'Police Stations' }
    ];

    const filteredFacilities = facilities.filter(facility => {
        const matchesSearch = facility.name?.toLowerCase().includes(search.toLowerCase()) ||
            facility.type?.toLowerCase().includes(search.toLowerCase());
        const matchesTab = activeTab === 'all' || facility.type === activeTab;
        return matchesSearch && matchesTab;
    });

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
                title="Emergency Infrastructure"
                subtitle="Critical facilities and emergency response centers"
            />

            <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search facilities..."
            />

            <div className="mt-6">
                <TabGroup
                    tabs={tabs}
                    activeTab={activeTab}
                    onChange={setActiveTab}
                />
            </div>

            {filteredFacilities.length === 0 ? (
                <EmptyState
                    icon={Building2}
                    title="No facilities found"
                    description="Try adjusting your search or filters"
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredFacilities.map((facility, i) => (
                        <InfoCard
                            key={facility.id || i}
                            title={facility.name || 'Facility'}
                            icon={Building2}
                            iconColor="#3B82F6"
                            index={i}
                        >
                            <div className="space-y-2 mt-4">
                                {facility.address && (
                                    <div className="flex items-start gap-2 text-sm">
                                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                                        <span className="text-gray-600">{facility.address}</span>
                                    </div>
                                )}
                                {facility.phone && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Phone className="w-4 h-4 text-gray-400" />
                                        <a href={`tel:${facility.phone}`} className="text-indigo-600 hover:underline">
                                            {facility.phone}
                                        </a>
                                    </div>
                                )}
                                {facility.hours && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Clock className="w-4 h-4 text-gray-400" />
                                        <span className="text-gray-600">{facility.hours}</span>
                                    </div>
                                )}
                                {facility.capacity && (
                                    <div className="mt-2 text-sm">
                                        <span className="font-medium">Capacity:</span> {facility.capacity}
                                    </div>
                                )}
                                {facility.type && (
                                    <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full mt-2 capitalize">
                                        {facility.type}
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
