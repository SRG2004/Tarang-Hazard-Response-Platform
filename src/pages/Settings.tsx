import React, { useState } from 'react';
import { PageContainer, PageHeader, ContentSection } from '../components/ui-redesign/PageLayouts';
import { AnimatedInput, AnimatedSelect, FormSection, ActionButtons } from '../components/ui-redesign/Forms';
import { TabGroup } from '../components/ui-redesign/Interactive';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

export function Settings() {
  const { currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [name, setName] = useState(userProfile?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [language, setLanguage] = useState('en');
  const [notifications, setNotifications] = useState(true);
  const [saving, setSaving] = useState(false);

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'preferences', label: 'Preferences' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'security', label: 'Security' }
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save settings logic here
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        subtitle="Manage your account and preferences"
      />

      <TabGroup
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <ContentSection>
        {activeTab === 'profile' && (
          <FormSection title="Profile Information" description="Update your personal details">
            <AnimatedInput
              label="Full Name"
              value={name}
              onChange={setName}
              placeholder="Enter your name"
              required
            />
            <AnimatedInput
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="your@email.com"
              required
            />
            <AnimatedInput
              label="Phone"
              type="tel"
              value={phone}
              onChange={setPhone}
              placeholder="+91 1234567890"
            />
          </FormSection>
        )}

        {activeTab === 'preferences' && (
          <FormSection title="Preferences" description="Customize your experience">
            <AnimatedSelect
              label="Language"
              value={language}
              onChange={setLanguage}
              options={[
                { value: 'en', label: 'English' },
                { value: 'hi', label: 'Hindi' },
                { value: 'ta', label: 'Tamil' }
              ]}
              required
            />
            <AnimatedSelect
              label="Theme"
              value="light"
              onChange={() => { }}
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'auto', label: 'Auto' }
              ]}
            />
          </FormSection>
        )}

        {activeTab === 'notifications' && (
          <FormSection title="Notification Settings" description="Control how you receive updates">
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <p className="font-medium text-gray-900">Email Notifications</p>
                  <p className="text-sm text-gray-600">Receive updates via email</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <p className="font-medium text-gray-900">Push Notifications</p>
                  <p className="text-sm text-gray-600">Receive browser notifications</p>
                </div>
              </label>
            </div>
          </FormSection>
        )}

        {activeTab === 'security' && (
          <FormSection title="Security" description="Manage your account security">
            <AnimatedInput
              label="Current Password"
              type="password"
              value=""
              onChange={() => { }}
              placeholder="Enter current password"
            />
            <AnimatedInput
              label="New Password"
              type="password"
              value=""
              onChange={() => { }}
              placeholder="Enter new password"
            />
            <AnimatedInput
              label="Confirm Password"
              type="password"
              value=""
              onChange={() => { }}
              placeholder="Confirm new password"
            />
          </FormSection>
        )}

        <ActionButtons
          onSubmit={handleSave}
          submitLabel="Save Changes"
          isSubmitting={saving}
        />
      </ContentSection>
    </PageContainer>
  );
}
