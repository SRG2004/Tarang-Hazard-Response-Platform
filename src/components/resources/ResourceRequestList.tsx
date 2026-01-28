
import { useState, useEffect } from 'react';
import { ResourceRequest, UserRole } from '../../types';
import apiService from '../../services/apiService';
import { toast } from 'sonner';
import { Package, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface ResourceRequestListProps {
    userRole: UserRole; // To determine if they can approve/reject
    userId: string;
}

export function ResourceRequestList({ userRole, userId }: ResourceRequestListProps) {
    const [requests, setRequests] = useState<ResourceRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRequests = async () => {
        try {
            // If authority, fetch all. If NGO/Responder, fetch only theirs (or all if we want transparency)
            // For now, let's fetch all and filter client side or via API
            const filters = userRole === 'authority' ? {} : { requesterId: userId };

            const res = await apiService.getResourceRequests(filters);
            if (res.success && res.requests) {
                setRequests(res.requests);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [userRole, userId]);

    const handleStatusUpdate = async (id: string, status: 'approved' | 'rejected') => {
        try {
            const res = await apiService.updateResourceRequestStatus(id, status);
            if (res.success) {
                toast.success(`Request ${status}`);
                fetchRequests(); // Refresh
            } else {
                toast.error('Failed to update status');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error updating status');
        }
    };

    if (loading) {
        return <div className="p-4 text-center text-gray-500">Loading requests...</div>;
    }

    if (requests.length === 0) {
        return (
            <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-100">
                <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No resource requests found</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {requests.map((req) => (
                <div key={req.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${req.priority === 'critical' ? 'bg-red-100 text-red-800' :
                                    req.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                        'bg-blue-100 text-blue-800'
                                }`}>
                                {req.priority.toUpperCase()}
                            </span>
                            <h4 className="font-semibold text-gray-800">{req.resourceType} ({req.quantity})</h4>
                        </div>

                        <p className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">Location:</span> {req.location}
                        </p>

                        {req.reason && (
                            <p className="text-sm text-gray-500 italic mb-2">"{req.reason}"</p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(req.requestedAt).toLocaleDateString()}
                            </span>
                            <span>by {req.requesterName}</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 min-w-[120px]">
                        <div className={`flex items-center gap-1 text-sm font-medium ${req.status === 'approved' ? 'text-green-600' :
                                req.status === 'rejected' ? 'text-red-500' :
                                    req.status === 'fulfilled' ? 'text-blue-600' :
                                        'text-yellow-600'
                            }`}>
                            {req.status === 'approved' && <CheckCircle className="w-4 h-4" />}
                            {req.status === 'rejected' && <XCircle className="w-4 h-4" />}
                            {req.status === 'pending' && <AlertTriangle className="w-4 h-4" />}
                            <span className="capitalize">{req.status}</span>
                        </div>

                        {userRole === 'authority' && req.status === 'pending' && (
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={() => handleStatusUpdate(req.id, 'rejected')}
                                    className="px-3 py-1 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50"
                                >
                                    Reject
                                </button>
                                <button
                                    onClick={() => handleStatusUpdate(req.id, 'approved')}
                                    className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 shadow-sm"
                                >
                                    Approve
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
