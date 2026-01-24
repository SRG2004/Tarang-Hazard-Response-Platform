import React, { useState } from 'react';
import { PageContainer, PageHeader, ContentSection } from '../components/ui-redesign/PageLayouts';
import { AnimatedSelect, FormSection, ActionButtons } from '../components/ui-redesign/Forms';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

export function DataExports() {
  const [dataType, setDataType] = useState('');
  const [format, setFormat] = useState('csv');
  const [dateRange, setDateRange] = useState('all');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!dataType) {
      toast.error('Please select a data type');
      return;
    }

    setExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Export completed successfully');
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Data Exports"
        subtitle="Export system data for analysis"
      />

      <ContentSection>
        <FormSection
          title="Export Configuration"
          description="Select the data you want to export"
        >
          <AnimatedSelect
            label="Data Type"
            value={dataType}
            onChange={setDataType}
            options={[
              { value: '', label: 'Select data type' },
              { value: 'reports', label: 'Hazard Reports' },
              { value: 'users', label: 'Users' },
              { value: 'volunteers', label: 'Volunteers' },
              { value: 'donations', label: 'Donations' }
            ]}
            required
          />

          <AnimatedSelect
            label="Format"
            value={format}
            onChange={setFormat}
            options={[
              { value: 'csv', label: 'CSV' },
              { value: 'json', label: 'JSON' },
              { value: 'excel', label: 'Excel' }
            ]}
            required
          />

          <AnimatedSelect
            label="Date Range"
            value={dateRange}
            onChange={setDateRange}
            options={[
              { value: 'all', label: 'All Time' },
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'Last 7 Days' },
              { value: 'month', label: 'Last 30 Days' },
              { value: 'year', label: 'Last Year' }
            ]}
            required
          />
        </FormSection>

        <ActionButtons
          onSubmit={handleExport}
          submitLabel={
            <span className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export Data
            </span>
          }
          isSubmitting={exporting}
          disabled={!dataType}
        />
      </ContentSection>
    </PageContainer>
  );
}
