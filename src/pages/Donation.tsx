import React, { useState, useEffect } from 'react';
import { PageContainer, PageHeader } from '../components/ui-redesign/PageLayouts';
import { InfoCard, LoadingState } from '../components/ui-redesign/Cards';
import { HandHeart, TrendingUp, Users, Target } from 'lucide-react';
import apiService from '../services/apiService';
import { toast } from 'sonner';
import { PaymentModal } from '../components/payment/PaymentModal';
import { useTranslation } from '../contexts/TranslationContext';

export function Donation() {
    const { t } = useTranslation();
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const fetchCampaigns = async () => {
            try {
                const response = await apiService.getDonations({});
                if (response.success && response.donations) {
                    setCampaigns(response.donations);
                }
            } catch (error) {
                console.error('Error fetching campaigns:', error);
                toast.error('Failed to load donation campaigns');
            } finally {
                setLoading(false);
            }
        };

        fetchCampaigns();
    }, []);

    const handleDonateClick = (campaign: any) => {
        setSelectedCampaign(campaign);
        setIsModalOpen(true);
    };

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
                title="Support Disaster Relief"
                subtitle="Contribute to ongoing relief efforts"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {campaigns.length > 0 ? campaigns.map((campaign, i) => (
                    <InfoCard
                        key={campaign.id || i}
                        title={campaign.title || 'Relief Campaign'}
                        icon={HandHeart}
                        iconColor="#EC4899"
                        index={i}
                    >
                        <div className="space-y-4 mt-4">
                            <p className="text-sm text-gray-600">{campaign.description}</p>
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-600">Progress</span>
                                    <span className="font-semibold">
                                        ₹{campaign.raised?.toLocaleString() || '0'} / ₹{campaign.goal?.toLocaleString() || '100,000'}
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-pink-600 rounded-full transition-all"
                                        style={{ width: `${((campaign.raised || 0) / (campaign.goal || 1)) * 100}%` }}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={() => handleDonateClick(campaign)}
                                className="w-full px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors">
                                Donate Now
                            </button>
                        </div>
                    </InfoCard>
                )) : (
                    <>
                        <InfoCard title="Flood Relief Fund" icon={HandHeart} iconColor="#EC4899" index={0}>
                            <div className="space-y-4 mt-4">
                                <p className="text-sm text-gray-600">Support families affected by recent floods</p>
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-600">Progress</span>
                                        <span className="font-semibold">₹75,000 / ₹100,000</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-pink-600 rounded-full" style={{ width: '75%' }} />
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDonateClick({ title: 'Flood Relief Fund' })}
                                    className="w-full px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors">
                                    Donate Now
                                </button>
                            </div>
                        </InfoCard>
                        <InfoCard title="Emergency Medical Aid" icon={Target} iconColor="#EF4444" index={1}>
                            <div className="space-y-4 mt-4">
                                <p className="text-sm text-gray-600">Medical supplies for disaster zones</p>
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-600">Progress</span>
                                        <span className="font-semibold">₹45,000 / ₹80,000</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-red-600 rounded-full" style={{ width: '56%' }} />
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDonateClick({ title: 'Emergency Medical Aid' })}
                                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                                    Donate Now
                                </button>
                            </div>
                        </InfoCard>
                    </>
                )}
            </div>

            <PaymentModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                campaignTitle={selectedCampaign?.title || 'Relief Fund'}
            />
        </PageContainer>
    );
}
