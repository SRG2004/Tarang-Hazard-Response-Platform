import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ResourceRequest } from '../../types';
import apiService from '../../services/apiService';
import { toast } from 'sonner';
import { Package, Send, AlertCircle } from 'lucide-react';

interface ResourceRequestFormProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function ResourceRequestForm({ onSuccess, onCancel }: ResourceRequestFormProps) {
    const [submitting, setSubmitting] = useState(false);
    const { register, handleSubmit, formState: { errors } } = useForm<Partial<ResourceRequest>>();

    const onSubmit = async (data: any) => {
        setSubmitting(true);
        try {
            // Add default status and timestamp
            const requestData = {
                ...data,
                status: 'pending',
                requestedAt: new Date(),
                quantity: Number(data.quantity)
            };

            const res = await apiService.createResourceRequest(requestData);
            if (res.success || res.queued) {
                toast.success(res.queued ? 'Request queued (offline)' : 'Resource request submitted');
                if (onSuccess) onSuccess();
            } else {
                toast.error('Failed to submit request');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error submitting request');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
                <Package className="text-indigo-600" />
                New Resource Request
            </h3>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Resource Type</label>
                    <select
                        {...register('resourceType', { required: true })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    >
                        <option value="">Select Resource Type</option>
                        <option value="Food Packets">Food Packets</option>
                        <option value="Water Bottles">Water Bottles</option>
                        <option value="Medical Kits">Medical Kits</option>
                        <option value="Blankets">Blankets</option>
                        <option value="Tents">Tents</option>
                        <option value="Flashlights">Flashlights</option>
                        <option value="Human Resources">Human Resources (Volunteers)</option>
                        <option value="Other">Other</option>
                    </select>
                    {errors.resourceType && <span className="text-xs text-red-500">Required</span>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Quantity</label>
                        <input
                            type="number"
                            {...register('quantity', { required: true, min: 1 })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            placeholder="10"
                        />
                        {errors.quantity && <span className="text-xs text-red-500">Required</span>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Priority</label>
                        <select
                            {...register('priority', { required: true })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Location (Where needed)</label>
                    <input
                        type="text"
                        {...register('location', { required: true })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        placeholder="e.g., Downtown Shelter, Sector 4..."
                    />
                    {errors.location && <span className="text-xs text-red-500">Required</span>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Reason / Notes</label>
                    <textarea
                        {...register('reason')}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        placeholder="Why is this needed?"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 bg-white"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        {submitting ? 'Sending...' : 'Send Request'}
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </form>
        </div>
    );
}
