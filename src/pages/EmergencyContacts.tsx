import { useState, useEffect } from 'react';
import { PageContainer, PageHeader } from '../components/ui-redesign/PageLayouts';
import { SearchBar } from '../components/ui-redesign/Interactive';
import { InfoCard, LoadingState, EmptyState } from '../components/ui-redesign/Cards';
import { Phone, MapPin, Clock, Mail, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import apiService from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface Contact {
  id?: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  availability: string;
  category: string;
}

const CONTACT_CATEGORIES = [
  { value: 'police', label: 'Police' },
  { value: 'fire', label: 'Fire Department' },
  { value: 'ambulance', label: 'Ambulance' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'disaster-management', label: 'Disaster Management' },
  { value: 'coast-guard', label: 'Coast Guard' },
  { value: 'rescue', label: 'Rescue Services' },
  { value: 'helpline', label: 'Helpline' },
  { value: 'ngo', label: 'NGO' },
  { value: 'government', label: 'Government' },
  { value: 'other', label: 'Other' }
];

const emptyContact: Contact = {
  name: '',
  phone: '',
  email: '',
  address: '',
  availability: '24/7',
  category: 'helpline'
};

export function EmergencyContacts() {
  const { userProfile } = useAuth();
  const isAuthority = userProfile?.role === 'authority' || userProfile?.role === 'admin';

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Contact>(emptyContact);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await apiService.getEmergencyContacts();
      if (response.success && response.contacts) {
        setContacts(response.contacts);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load emergency contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setFormData(emptyContact);
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (contact: Contact) => {
    setFormData({ ...contact });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast.error('Please fill in required fields');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && formData.id) {
        await apiService.updateEmergencyContact(formData.id, formData, userProfile?.role || '');
        toast.success('Contact updated successfully');
      } else {
        await apiService.createEmergencyContact(formData, userProfile?.role || '');
        toast.success('Contact created successfully');
      }

      setIsDialogOpen(false);
      fetchContacts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save contact');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiService.deleteEmergencyContact(id, userProfile?.role || '');
      toast.success('Contact deleted successfully');
      setDeleteConfirmId(null);
      fetchContacts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete contact');
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name?.toLowerCase().includes(search.toLowerCase()) ||
    contact.category?.toLowerCase().includes(search.toLowerCase())
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
      <div className="flex items-center justify-between mb-6">
        <PageHeader
          title="Emergency Contacts"
          subtitle="Quick access to emergency services and helplines"
        />
        {isAuthority && (
          <Button onClick={handleOpenAdd} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Contact
          </Button>
        )}
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search contacts..."
      />

      {filteredContacts.length === 0 ? (
        <EmptyState
          icon={Phone}
          title="No contacts found"
          description={isAuthority ? "Add your first contact to get started" : "Try adjusting your search"}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {filteredContacts.map((contact, i) => (
            <InfoCard
              key={contact.id || i}
              title={contact.name || 'Emergency Service'}
              icon={Phone}
              iconColor="#EF4444"
              index={i}
            >
              <div className="space-y-2 mt-4">
                {contact.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <a href={`tel:${contact.phone}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                      {contact.phone}
                    </a>
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <a href={`mailto:${contact.email}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <span className="text-gray-600 dark:text-gray-300">{contact.address}</span>
                  </div>
                )}
                {contact.availability && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-300">{contact.availability}</span>
                  </div>
                )}
                <div className="flex items-center justify-between mt-3">
                  {contact.category && (
                    <span className="inline-block px-2 py-1 text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-full capitalize">
                      {contact.category.replace('-', ' ')}
                    </span>
                  )}
                  {isAuthority && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(contact)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmId(contact.id || '')}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </InfoCard>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Contact' : 'Add New Contact'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update the contact information below.' : 'Fill in the details for the new contact.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Police Control Room"
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="100"
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@example.org"
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Emergency Road, City"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="availability">Availability</Label>
                <Input
                  id="availability"
                  value={formData.availability}
                  onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                  placeholder="24/7"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this contact? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
