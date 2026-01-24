import React, { useState } from 'react';
import { PageContainer, PageHeader, ContentSection } from '../components/ui-redesign/PageLayouts';
import { AnimatedInput, AnimatedTextarea, AnimatedSelect, FormSection, ActionButtons } from '../components/ui-redesign/Forms';
import { Send } from 'lucide-react';
import { toast } from 'sonner';

export function FlashSMSAlert() {
  const [message, setMessage] = useState('');
  const [recipients, setRecipients] = useState('all');
  const [priority, setPriority] = useState('high');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSending(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Alert sent successfully');
      setMessage('');
    } catch (error) {
      toast.error('Failed to send alert');
    } finally {
      setSending(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Flash SMS Alert"
        subtitle="Send emergency alerts to citizens"
      />

      <ContentSection>
        <FormSection
          title="Alert Configuration"
          description="Compose and send emergency SMS alerts"
        >
          <AnimatedTextarea
            label="Message"
            value={message}
            onChange={setMessage}
            placeholder="Enter emergency alert message..."
            rows={6}
            required
          />

          <AnimatedSelect
            label="Recipients"
            value={recipients}
            onChange={setRecipients}
            options={[
              { value: 'all', label: 'All Citizens' },
              { value: 'area', label: 'Specific Area' },
              { value: 'volunteers', label: 'Volunteers Only' },
              { value: 'officials', label: 'Officials Only' }
            ]}
            required
          />

          <AnimatedSelect
            label="Priority"
            value={priority}
            onChange={setPriority}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'critical', label: 'Critical' }
            ]}
            required
          />

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> This will send an SMS to {recipients === 'all' ? 'all registered users' : 'selected recipients'}.
              Please ensure the message is accurate and necessary.
            </p>
          </div>
        </FormSection>

        <ActionButtons
          onSubmit={handleSend}
          submitLabel={
            <span className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Send Alert
            </span>
          }
          isSubmitting={sending}
          disabled={!message.trim()}
        />
      </ContentSection>
    </PageContainer>
  );
}
