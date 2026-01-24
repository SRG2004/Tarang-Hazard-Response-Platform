import React, { useState, useEffect } from 'react';
import { PageContainer, PageHeader } from '../components/ui-redesign/PageLayouts';
import { SearchBar } from '../components/ui-redesign/Interactive';
import { InfoCard, LoadingState, EmptyState } from '../components/ui-redesign/Cards';
import { User, Mail, Shield, Calendar, MoreVertical, Ban, Trash2, CheckCircle, Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import apiService from '../services/apiService';
import { toast } from 'sonner';

export function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add User State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'citizen', phone: '', aadharId: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      const response = await apiService.getUsers();
      if (response.success && response.users) {
        setUsers(response.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.role) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiService.createUser(newUser.email, newUser.name, newUser.role, newUser.phone, newUser.aadharId);
      if (response.success) {
        // Show success with password
        toast.success(
          <div className="flex flex-col gap-1">
            <span className="font-bold">User created!</span>
            <span className="text-sm">Password: <code className="bg-slate-100 px-1 rounded">{response.credentials.password}</code></span>
            <span className="text-xs text-gray-500">Please copy this password.</span>
          </div>,
          { duration: 10000 } // Show for 10 seconds
        );
        setIsAddUserOpen(false);
        setNewUser({ name: '', email: '', role: 'citizen', phone: '', aadharId: '' });
        fetchUsers();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlockUser = async (userId: string, currentBlockedStatus: boolean) => {
    const action = currentBlockedStatus ? 'unblock' : 'block';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      await apiService.blockUser(userId, !currentBlockedStatus, `Manual ${action} by admin`);
      toast.success(`User ${action}ed successfully`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${action} user`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to PERMANENTLY delete this user? This cannot be undone.')) return;

    try {
      await apiService.deleteUser(userId, 'admin', 'admin'); // Assuming current user is admin
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user');
    }
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(search.toLowerCase()) ||
    user.email?.toLowerCase().includes(search.toLowerCase()) ||
    user.role?.toLowerCase().includes(search.toLowerCase())
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
      <div className="flex justify-between items-center mb-6">
        <PageHeader
          title="User Management"
          subtitle="Manage system users, blockade, and permissions"
          className="mb-0"
        />
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
              <Plus className="w-4 h-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account manually. A random password will be generated.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name *</Label>
                <Input
                  id="name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">Phone</Label>
                <Input
                  id="phone"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  className="col-span-3"
                  placeholder="+91..."
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="aadhar" className="text-right">Aadhar ID</Label>
                <Input
                  id="aadhar"
                  value={newUser.aadharId}
                  onChange={(e) => setNewUser({ ...newUser, aadharId: e.target.value })}
                  className="col-span-3"
                  placeholder="12 digit ID"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">Role</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="citizen">Citizen</SelectItem>
                    <SelectItem value="authority">Authority</SelectItem>
                    <SelectItem value="ngo">NGO</SelectItem>
                    <SelectItem value="responder">Responder</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddUser} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search users..."
      />

      {filteredUsers.length === 0 ? (
        <EmptyState
          icon={User}
          title="No users found"
          description="Try adjusting your search"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {filteredUsers.map((user, i) => (
            <div className="relative group" key={user.id || i}>
              <InfoCard
                title={user.name || 'User'}
                icon={User}
                iconColor={user.blocked ? "#EF4444" : "#4F46E5"}
                index={i}
                className={`relative ${user.blocked ? "opacity-75 border-red-200 bg-red-50 dark:bg-red-900/10" : ""}`}
              >
                <div className="absolute top-4 right-4 flex gap-2 z-20">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBlockUser(user.id, user.blocked);
                    }}
                    className={`h-8 w-8 p-0 rounded-full ${user.blocked ? 'text-green-600 hover:text-green-700 hover:bg-green-50' : 'text-orange-500 hover:text-orange-600 hover:bg-orange-50'}`}
                    title={user.blocked ? "Unblock User" : "Block User"}
                  >
                    {user.blocked ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteUser(user.id);
                    }}
                    className="h-8 w-8 p-0 rounded-full text-red-500 hover:text-red-700 hover:bg-red-50"
                    title="Delete User"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2 mt-4">
                  {user.blocked && (
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mb-2">
                      Blocked
                    </div>
                  )}
                  {user.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600 truncate">{user.email}</span>
                    </div>
                  )}
                  {user.role && (
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="w-4 h-4 text-gray-400" />
                      <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full capitalize">
                        {user.role}
                      </span>
                    </div>
                  )}
                  {user.createdAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">
                        Joined {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </InfoCard>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
