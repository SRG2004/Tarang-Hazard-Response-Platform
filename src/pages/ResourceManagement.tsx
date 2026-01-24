import { useState, useEffect } from 'react';
import { PageContainer, PageHeader } from '../components/ui-redesign/PageLayouts';
import { InfoCard, LoadingState } from '../components/ui-redesign/Cards';
import { Package, AlertCircle, CheckCircle, Plus } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { ResourceRequestForm } from '../components/resources/ResourceRequestForm';
import { ResourceRequestList } from '../components/resources/ResourceRequestList';

interface Resource {
    id?: string;
    ngoId: string;
    resourceType: 'supply' | 'equipment' | 'volunteer';
    name: string;
    quantity: number;
    unit: string;
    location: string;
    expirationDate?: string;
    status: 'available' | 'allocated' | 'depleted';
    allocatedTo?: string;
    createdAt: Date;
}

export function ResourceManagement() {
    const { currentUser, userProfile } = useAuth();
    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [activeTab, setActiveTab] = useState<'inventory' | 'requests'>('inventory');
    const [showRequestForm, setShowRequestForm] = useState(false);

    // Form state
    const [formData, setFormData] = useState<Partial<Resource>>({
        resourceType: 'supply',
        name: '',
        quantity: 0,
        unit: '',
        location: '',
        status: 'available'
    });

    useEffect(() => {
        if (currentUser) {
            fetchResources();
        } else {
            // Stop loading if no user (should be handled by ProtectedRoute but extra safety)
            const timer = setTimeout(() => setLoading(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [currentUser]);

    const fetchResources = async () => {
        try {
            const q = query(
                collection(db, 'ngoResources'),
                where('ngoId', '==', currentUser?.uid)
            );
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate()
            })) as Resource[];
            setResources(data);
        } catch (error) {
            console.error('Error fetching resources:', error);
            toast.error('Failed to load resources');
        } finally {
            setLoading(false);
        }
    };

    const handleAddResource = async () => {
        if (!formData.name || !formData.quantity || !formData.unit) {
            toast.error('Please fill all required fields');
            return;
        }

        try {
            await addDoc(collection(db, 'ngoResources'), {
                ...formData,
                ngoId: currentUser?.uid,
                createdAt: new Date()
            });
            toast.success('Resource added successfully');
            setShowAddForm(false);
            setFormData({
                resourceType: 'supply',
                name: '',
                quantity: 0,
                unit: '',
                location: '',
                status: 'available'
            });
            fetchResources();
        } catch (error) {
            console.error('Error adding resource:', error);
            toast.error('Failed to add resource');
        }
    };

    const getStockColor = (quantity: number, maxQuantity: number = 100) => {
        const percentage = (quantity / maxQuantity) * 100;
        if (percentage > 50) return 'text-green-600';
        if (percentage > 20) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getStockIcon = (quantity: number, maxQuantity: number = 100) => {
        const percentage = (quantity / maxQuantity) * 100;
        if (percentage > 50) return CheckCircle;
        return AlertCircle;
    };

    if (loading) {
        return (
            <PageContainer>
                <LoadingState />
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            <PageHeader
                title="Resource Management"
                subtitle="Track and manage disaster relief resources"
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <InfoCard
                    title={resources.filter(r => r.status === 'available').length.toString()}
                    icon={Package}
                    iconColor="#10B981"
                >
                    <p className="text-sm text-gray-500 mt-1">Available Resources</p>
                </InfoCard>
                <InfoCard
                    title={resources.filter(r => r.status === 'allocated').length.toString()}
                    icon={Package}
                    iconColor="#F59E0B"
                >
                    <p className="text-sm text-gray-500 mt-1">Allocated Resources</p>
                </InfoCard>
                <InfoCard
                    title={resources.filter(r => r.status === 'depleted').length.toString()}
                    icon={AlertCircle}
                    iconColor="#EF4444"
                >
                    <p className="text-sm text-gray-500 mt-1">Depleted Resources</p>
                </InfoCard>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('inventory')}
                    className={`pb-2 px-4 font-medium transition-colors relative ${activeTab === 'inventory' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                >
                    Inventory
                    {activeTab === 'inventory' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`pb-2 px-4 font-medium transition-colors relative ${activeTab === 'requests' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                >
                    Resource Requests
                    {activeTab === 'requests' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full" />
                    )}
                </button>
            </div>

            {/* Content Based on Tab */}
            {activeTab === 'requests' ? (
                <>
                    <div className="mb-6 flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Field Resource Requests</h2>
                        <button
                            onClick={() => setShowRequestForm(!showRequestForm)}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            New Request
                        </button>
                    </div>

                    {showRequestForm && (
                        <div className="mb-6">
                            <ResourceRequestForm
                                onSuccess={() => {
                                    setShowRequestForm(false);
                                    // Optionally refresh list if needed
                                }}
                                onCancel={() => setShowRequestForm(false)}
                            />
                        </div>
                    )}

                    <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700 min-h-[300px]">
                        <ResourceRequestList
                            userId={currentUser?.uid || ''}
                            userRole={userProfile?.role || 'ngo'}
                        />
                    </div>
                </>
            ) : (
                <>
                    {/* Add Resource Button */}
                    <div className="mb-6">
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Add Resource
                        </button>
                    </div>

                    {/* Add Resource Form */}
                    {showAddForm && (
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 mb-6">
                            <h3 className="text-lg font-bold mb-4 dark:text-white">Add New Resource</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Resource Type
                                    </label>
                                    <select
                                        value={formData.resourceType}
                                        onChange={(e) => setFormData({ ...formData, resourceType: e.target.value as any })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                                    >
                                        <option value="supply">Supply</option>
                                        <option value="equipment">Equipment</option>
                                        <option value="volunteer">Volunteer</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                                        placeholder="e.g., Water Bottles, Medical Kits"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Quantity *
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Unit *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.unit}
                                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                                        placeholder="e.g., boxes, units, liters"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Location
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                                        placeholder="Storage location"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Expiration Date (if applicable)
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.expirationDate}
                                        onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={handleAddResource}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    Add Resource
                                </button>
                                <button
                                    onClick={() => setShowAddForm(false)}
                                    className="px-6 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Resource List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {resources.map((resource, index) => {
                            const StockIcon = getStockIcon(resource.quantity);
                            return (
                                <div
                                    key={resource.id || index}
                                    className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border-l-4"
                                    style={{
                                        borderColor: resource.status === 'available' ? '#10B981' :
                                            resource.status === 'allocated' ? '#F59E0B' : '#EF4444'
                                    }}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">{resource.name}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{resource.resourceType}</p>
                                        </div>
                                        <StockIcon className={`w-6 h-6 ${getStockColor(resource.quantity)}`} />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Quantity:</span>
                                            <span className={`font-semibold ${getStockColor(resource.quantity)}`}>
                                                {resource.quantity} {resource.unit}
                                            </span>
                                        </div>

                                        {resource.location && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600 dark:text-gray-400">Location:</span>
                                                <span className="text-sm text-gray-900 dark:text-white">{resource.location}</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                                            <span className={`text-xs px-2 py-1 rounded-full capitalize ${resource.status === 'available' ? 'bg-green-100 text-green-700' :
                                                resource.status === 'allocated' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                {resource.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {resources.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            No resources added yet. Click "Add Resource" to get started.
                        </div>
                    )}
                </>
            )}
        </PageContainer>
    );
}
