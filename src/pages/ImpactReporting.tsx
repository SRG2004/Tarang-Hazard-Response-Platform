import { useNavigate } from 'react-router-dom';
import { PageContainer, PageHeader } from '../components/ui-redesign/PageLayouts';
import { ImpactReportForm } from '../components/impact/ImpactReportForm';

export function ImpactReporting() {
    const navigate = useNavigate();

    return (
        <PageContainer>
            <PageHeader
                title="Impact Reporting"
                subtitle="Submit detailed damage assessments"
            />
            <div className="max-w-3xl mx-auto">
                <ImpactReportForm
                    onSuccess={() => navigate('/impact-reports')}
                />
            </div>
        </PageContainer>
    );
}
