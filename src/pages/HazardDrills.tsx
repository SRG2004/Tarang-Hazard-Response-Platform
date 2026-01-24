import { useState, useEffect } from 'react';
import { PageContainer, PageHeader } from '../components/ui-redesign/PageLayouts';
import { SearchBar } from '../components/ui-redesign/Interactive';
import { InfoCard, LoadingState, EmptyState } from '../components/ui-redesign/Cards';
import { Calendar, MapPin, Users, Clock, Plus, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import apiService from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface Drill {
  id?: string;
  title: string;
  type: string;
  date: string;
  location: string;
  participants: number;
  duration: string;
  description: string;
  status: string;
}

const DRILL_TYPES = [
  { value: 'tsunami', label: 'Tsunami' },
  { value: 'earthquake', label: 'Earthquake' },
  { value: 'cyclone', label: 'Cyclone' },
  { value: 'flood', label: 'Flood' },
  { value: 'fire', label: 'Fire' },
  { value: 'landslide', label: 'Landslide' },
  { value: 'chemical', label: 'Chemical' },
  { value: 'multi-hazard', label: 'Multi-Hazard' }
];

const emptyDrill: Drill = {
  title: '',
  type: 'earthquake',
  date: new Date().toISOString().split('T')[0],
  location: '',
  participants: 0,
  duration: '',
  description: '',
  status: 'scheduled'
};

export function HazardDrills() {
  const { userProfile } = useAuth();
  const isAuthority = userProfile?.role === 'authority' || userProfile?.role === 'admin';

  const [drills, setDrills] = useState<Drill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Drill>(emptyDrill);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchDrills();
  }, []);

  const fetchDrills = async () => {
    try {
      const response = await apiService.getHazardDrills();
      if (response.success && response.drills) {
        setDrills(response.drills);
      }
    } catch (error) {
      console.error('Error fetching drills:', error);
      toast.error('Failed to load drills');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setFormData(emptyDrill);
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (drill: Drill) => {
    setFormData({
      ...drill,
      date: drill.date ? new Date(drill.date).toISOString().split('T')[0] : ''
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.location) {
      toast.error('Please fill in required fields');
      return;
    }

    setSubmitting(true);
    try {
      const drillData = {
        ...formData,
        date: new Date(formData.date).toISOString(),
        participants: Number(formData.participants)
      };

      if (isEditing && formData.id) {
        await apiService.updateHazardDrill(formData.id, drillData, userProfile?.role || '');
        toast.success('Drill updated successfully');
      } else {
        await apiService.createHazardDrill(drillData, userProfile?.role || '');
        toast.success('Drill created successfully');
      }

      setIsDialogOpen(false);
      fetchDrills();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save drill');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiService.deleteHazardDrill(id, userProfile?.role || '');
      toast.success('Drill deleted successfully');
      setDeleteConfirmId(null);
      fetchDrills();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete drill');
    }
  };

  const filteredDrills = drills.filter(drill =>
    drill.title?.toLowerCase().includes(search.toLowerCase()) ||
    drill.type?.toLowerCase().includes(search.toLowerCase())
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
          title="Hazard Drills"
          subtitle="Emergency preparedness training and exercises"
        />
        {isAuthority && (
          <Button onClick={handleOpenAdd} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Drill
          </Button>
        )}
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search drills..."
      />

      {filteredDrills.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No drills found"
          description={isAuthority ? "Add your first drill to get started" : "Try adjusting your search"}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {filteredDrills.map((drill, i) => (
            <InfoCard
              key={drill.id || i}
              title={drill.title || 'Emergency Drill'}
              icon={Calendar}
              iconColor="#F59E0B"
              index={i}
            >
              <div className="space-y-2 mt-4">
                {drill.date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-300">
                      {new Date(drill.date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {drill.location && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <span className="text-gray-600 dark:text-gray-300">{drill.location}</span>
                  </div>
                )}
                {drill.participants && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-300">{drill.participants} participants</span>
                  </div>
                )}
                {drill.duration && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-300">{drill.duration}</span>
                  </div>
                )}
                <div className="flex items-center justify-between mt-3">
                  {drill.type && (
                    <span className="inline-block px-2 py-1 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-full capitalize">
                      {drill.type}
                    </span>
                  )}
                  {isAuthority && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(drill)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmId(drill.id || '')}
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
            <DialogTitle>{isEditing ? 'Edit Drill' : 'Add New Drill'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update the drill information below.' : 'Fill in the details for the new drill.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Tsunami Evacuation Drill"
                required
              />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DRILL_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="duration">Duration</Label>
                <Input
                  id="duration"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="2 hours"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Community Hall, Ward 12"
                required
              />
            </div>
            <div>
              <Label htmlFor="participants">Expected Participants</Label>
              <Input
                id="participants"
                type="number"
                value={formData.participants}
                onChange={(e) => setFormData({ ...formData, participants: Number(e.target.value) })}
                placeholder="100"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Details about the drill..."
                rows={3}
              />
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
            <DialogTitle>Delete Drill</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this drill? This action cannot be undone.
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
