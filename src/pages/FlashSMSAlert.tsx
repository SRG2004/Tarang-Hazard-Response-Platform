import { useState, useEffect } from 'react';
import { PageContainer, PageHeader, ContentSection } from '../components/ui-redesign/PageLayouts';
import { AnimatedTextarea, AnimatedSelect, FormSection, ActionButtons } from '../components/ui-redesign/Forms';
import { Send, History, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://apiv2-6gwkpyjexa-uc.a.run.app';

interface AlertHistoryItem {
  id: string;
  message: string;
  sentBy: string;
  recipientCount: number;
  pushCount?: number;
  status: string;
  createdAt: Date | string;
}

export function FlashSMSAlert() {
  const { currentUser, userProfile } = useAuth();
  const [message, setMessage] = useState('');
  const [recipients, setRecipients] = useState('all');
  const [priority, setPriority] = useState('high');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<AlertHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch alert history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const token = await currentUser?.getIdToken();
      const response = await fetch(`${API_BASE_URL}/alerts/flash-sms/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      const data = await response.json();
      if (data.success) {
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (!currentUser) {
      toast.error('You must be logged in');
      return;
    }

    setSending(true);
    try {
      const token = await currentUser.getIdToken();

      const response = await fetch(`${API_BASE_URL}/alerts/flash-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: message.trim(),
          recipients,
          priority,
          userRole: userProfile?.role || 'authority',
          userId: currentUser.uid,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send alert');
      }

      if (data.success) {
        const successMsg = data.demoMode
          ? `Demo mode: Simulated ${data.sentCount} SMS. Sent ${data.pushCount || 0} push notifications.`
          : `Alert sent to ${data.sentCount} recipients. Push notifications: ${data.pushCount || 0}`;

        toast.success(successMsg, {
          duration: 5000,
          icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
        });
        setMessage('');
        fetchHistory(); // Refresh history
      } else {
        throw new Error(data.error || 'Failed to send alert');
      }
    } catch (error: any) {
      console.error('Error sending alert:', error);
      toast.error(error.message || 'Failed to send alert');
    } finally {
      setSending(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Flash Alert"
        subtitle="Send emergency push notifications to users"
      />

      <ContentSection>
        <FormSection
          title="Alert Configuration"
          description="Compose and send emergency alerts via push notification"
        >
          <AnimatedTextarea
            label="Message"
            value={message}
            onChange={setMessage}
            placeholder="Enter emergency alert message..."
            rows={4}
            required
          />

          <AnimatedSelect
            label="Recipients"
            value={recipients}
            onChange={setRecipients}
            options={[
              { value: 'all', label: 'All Users' },
              { value: 'citizens', label: 'Citizens Only' },
              { value: 'volunteers', label: 'Volunteers/Responders' },
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

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Important
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  This will send push notifications to {recipients === 'all' ? 'all registered users' : `${recipients} users`} who have notifications enabled.
                  Please ensure the message is accurate and necessary.
                </p>
              </div>
            </div>
          </div>
        </FormSection>

        <ActionButtons
          onSubmit={handleSend}
          submitLabel={
            <span className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              {sending ? 'Sending...' : 'Send Alert'}
            </span>
          }
          isSubmitting={sending}
          disabled={!message.trim()}
        />
      </ContentSection>

      {/* Alert History */}
      <ContentSection>
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Alerts</h3>
        </div>

        {loadingHistory ? (
          <div className="text-center py-8 text-gray-500">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No alerts sent yet</div>
        ) : (
          <div className="space-y-3">
            {history.map((alert) => (
              <div
                key={alert.id}
                className="p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700"
              >
                <p className="text-gray-900 dark:text-white font-medium line-clamp-2">
                  {alert.message}
                </p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>Recipients: {alert.recipientCount}</span>
                  {alert.pushCount !== undefined && (
                    <span>Push: {alert.pushCount}</span>
                  )}
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${alert.status === 'sent' ? 'bg-green-100 text-green-700' :
                    alert.status === 'simulated' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                    {alert.status}
                  </span>
                  <span>
                    {new Date(alert.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ContentSection>
    </PageContainer>
  );
}

