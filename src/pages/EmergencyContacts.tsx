
import { useState, useEffect } from 'react';
import { PageContainer } from '../components/ui-redesign/PageLayouts';
import { SearchBar } from '../components/ui-redesign/Interactive';
import { InfoCard, LoadingState, EmptyState } from '../components/ui-redesign/Cards';
import { Phone, MapPin, Clock, Mail, Plus, Pencil, Trash2, Siren, Flame, Stethoscope, Shield, Search } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import apiService from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

// --- Types ---
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
  { value: 'police', label: 'Police', icon: Shield, color: 'text-blue-600', bg: 'bg-blue-100' },
  { value: 'fire', label: 'Fire', icon: Flame, color: 'text-orange-600', bg: 'bg-orange-100' },
  { value: 'ambulance', label: 'Ambulance', icon: Stethoscope, color: 'text-red-600', bg: 'bg-red-100' },
  { value: 'disaster', label: 'Disaster Mgmt', icon: Siren, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  { value: 'hospital', label: 'Hospital', icon: Stethoscope, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  { value: 'other', label: 'Other Services', icon: Phone, color: 'text-gray-600', bg: 'bg-gray-100' },
];

const emptyContact: Contact = {
  name: '',
  phone: '',
  email: '',
  address: '',
  availability: '24/7',
  category: 'other'
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

  // --- Handlers ---
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
      // Fallback for role is handled if userProfile is undefined
      const role = userProfile?.role || 'citizen';
      if (isEditing && formData.id) {
        await apiService.updateEmergencyContact(formData.id, formData, role);
        toast.success('Contact updated successfully');
      } else {
        await apiService.createEmergencyContact(formData, role);
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
      await apiService.deleteEmergencyContact(id, userProfile?.role || 'citizen');
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

  // --- Render ---

  if (loading) {
    return (
      <PageContainer>
        <LoadingState />
      </PageContainer>
    );
  }

  return (
    <div className="min-h-screen bg-transparent pb-20">

      {/* Hero / SOS Section */}
      <div className="bg-gradient-to-r from-red-600 to-rose-600 dark:from-red-900 dark:to-rose-900 pb-12 pt-8 px-6 rounded-b-[40px] shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Emergency Contacts</h1>
              <p className="text-red-100">Tap to call instantly in case of emergency.</p>
            </div>
            {isAuthority && (
              <Button onClick={handleOpenAdd} className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md">
                <Plus className="w-4 h-4 mr-2" /> Add New
              </Button>
            )}
          </div>

          {/* Quick SOS Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SOSCard
              title="Police"
              number="100"
              icon={<Shield className="w-8 h-8 text-white" />}
              bg="bg-blue-600/40"
            />
            <SOSCard
              title="Ambulance"
              number="102"
              icon={<Stethoscope className="w-8 h-8 text-white" />}
              bg="bg-red-500/40"
            />
            <SOSCard
              title="Fire"
              number="101"
              icon={<Flame className="w-8 h-8 text-white" />}
              bg="bg-orange-500/40"
            />
            <SOSCard
              title="Disaster Help"
              number="108"
              icon={<Siren className="w-8 h-8 text-white" />}
              bg="bg-indigo-500/40"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 -mt-6">
        {/* Search */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 flex items-center gap-4 mb-8">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search hospitals, helplines..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none flex-1 text-gray-700 dark:text-gray-200 placeholder-gray-400"
          />
        </div>

        {/* Directory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContacts.map((contact) => {
            const cat = CONTACT_CATEGORIES.find(c => c.value === contact.category)
              || CONTACT_CATEGORIES.find(c => c.value === 'other')!; // Fallback
            const Icon = cat.icon;

            return (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -4 }}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all border border-gray-100 dark:border-slate-700 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${cat.bg} dark:bg-opacity-10 flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${cat.color}`} />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${cat.bg} ${cat.color} bg-opacity-50 dark:bg-opacity-20`}>
                    {cat.label}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 transition-colors">
                  {contact.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {contact.address || 'No address provided'}
                </p>

                <div className="space-y-3">
                  <a href={`tel:${contact.phone}`} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 group-hover:border-blue-200 border border-transparent transition-all">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Call Now</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{contact.phone}</p>
                    </div>
                  </a>

                  {contact.email && (
                    <div className="flex items-center gap-3 px-3">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <a href={`mailto:${contact.email}`} className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-500 truncate">
                        {contact.email}
                      </a>
                    </div>
                  )}
                </div>

                {isAuthority && (
                  <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(contact)}>
                      <Pencil className="w-4 h-4 text-gray-500" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(contact.id!)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {filteredContacts.length === 0 && (
          <EmptyState
            icon={Search}
            title="No contacts found"
            description="Try searching for something else."
          />
        )}
      </div>

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
    </div>
  );
}

// Subcomponent for SOS Cards
function SOSCard({ title, number, icon, bg }: { title: string, number: string, icon: React.ReactNode, bg: string }) {
  return (
    <motion.a
      href={`tel:${number}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`relative overflow-hidden rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 border border-white/10 backdrop-blur-sm cursor-pointer hover:shadow-lg transition-all ${bg}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50"></div>
      <div className="relative z-10 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-1">
        {icon}
      </div>
      <div className="relative z-10">
        <p className="text-white/80 text-xs font-medium uppercase tracking-wider">{title}</p>
        <p className="text-white text-2xl font-bold">{number}</p>
      </div>
    </motion.a>
  )
}
