import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/TranslationContext';
import { toast } from 'sonner';
import apiService from '../services/apiService';

export function VolunteerRegistrationForm() {
  const { t } = useTranslation();
  const { userProfile } = useAuth();
  const [formData, setFormData] = useState({
    phone: '',
    location: '',
    skills: [] as string[],
    availability: 'flexible',
    experience: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSkillsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setFormData(prev => ({ ...prev, skills: value.split(',').map(skill => skill.trim()) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) {
      toast.error(t('volunteer.loginRequired'));
      return;
    }
    setIsLoading(true);
    try {
      const volunteerData = {
        userId: userProfile.uid,
        userName: userProfile.name,
        userEmail: userProfile.email,
        phone: formData.phone,
        location: formData.location,
        skills: formData.skills,
        availability: formData.availability,
        experience: formData.experience,
      };
      await apiService.registerVolunteer(volunteerData);
      toast.success(t('volunteer.registrationSuccess'));
      // Reset form after successful registration
      setFormData({
        phone: '',
        location: '',
        skills: [],
        availability: 'flexible',
        experience: '',
      });
    } catch (error: any) {
      console.error('Volunteer registration failed:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to register. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto bg-background border border-border p-8 rounded-lg shadow-md animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
        <h2 className="text-2xl mb-4 font-bold text-foreground">{t('volunteer.title')}</h2>
        <p className="text-muted-foreground mb-6">
          {t('volunteer.description')}
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="name" className="text-base">{t('volunteer.fullName')}</Label>
              <Input id="name" value={userProfile?.name || ''} disabled />
            </div>
            <div className="space-y-3">
              <Label htmlFor="email" className="text-base">{t('volunteer.email')}</Label>
              <Input id="email" value={userProfile?.email || ''} disabled />
            </div>
          </div>
          <div className="space-y-3">
            <Label htmlFor="phone" className="text-base">{t('volunteer.phone')}</Label>
            <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} required />
          </div>
          <div className="space-y-3">
            <Label htmlFor="location" className="text-base">{t('volunteer.location')}</Label>
            <Input id="location" name="location" value={formData.location} onChange={handleInputChange} required />
          </div>
          <div className="space-y-3">
            <Label htmlFor="skills" className="text-base">{t('volunteer.skills')}</Label>
            <Input id="skills" name="skills" onChange={handleSkillsChange} />
          </div>
          <div className="space-y-3">
            <Label htmlFor="availability" className="text-base">{t('volunteer.availability')}</Label>
            <Select name="availability" value={formData.availability} onValueChange={(value) => handleSelectChange('availability', value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('volunteer.selectAvailability')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flexible">{t('volunteer.flexible')}</SelectItem>
                <SelectItem value="weekends">{t('volunteer.weekends')}</SelectItem>
                <SelectItem value="weekdays">{t('volunteer.weekdays')}</SelectItem>
                <SelectItem value="evenings">{t('volunteer.evenings')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label htmlFor="experience" className="text-base">{t('volunteer.experience')}</Label>
            <Textarea id="experience" name="experience" value={formData.experience} onChange={handleInputChange} />
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? t('volunteer.submitting') : t('volunteer.register')}
          </Button>
        </form>
      </div>
    </div>
  );
}
