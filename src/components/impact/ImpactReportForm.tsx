import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ImpactReport } from '../../types';
import apiService from '../../services/apiService';
import { toast } from 'sonner';
import { PageContainer } from '../ui-redesign/PageLayouts'; // Use generic container if specific one not needed for component
import { MapPin, Upload, AlertTriangle, Save } from 'lucide-react';

interface ImpactReportFormProps {
    onSuccess?: () => void;
    initialLocation?: { lat: number; lng: number; address?: string };
}

interface ImpactReportFormData extends Omit<ImpactReport, 'immediateNeeds'> {
    immediateNeedsString: string;
    immediateNeeds?: string[]; // Optional for compatibility
}

export function ImpactReportForm({ onSuccess, initialLocation }: ImpactReportFormProps) {
    const [submitting, setSubmitting] = useState(false);
    const { register, handleSubmit, formState: { errors } } = useForm<ImpactReportFormData>();

    // Mock location for now if not provided
    const currentLocation = initialLocation || { latitude: 0, longitude: 0, address: '' };

    const onSubmit = async (data: any) => {
        setSubmitting(true);
        try {
            // Structure the data to match ImpactReport interface
            const reportData: Partial<ImpactReport> = {
                ...data,
                location: currentLocation,
                submittedAt: new Date(),
                // Parse numbers
                casualties: Number(data.casualties),
                injured: Number(data.injured),
                displaced: Number(data.displaced),
                housesDamaged: Number(data.housesDamaged),
                immediateNeeds: data.immediateNeedsString.split(',').map((s: string) => s.trim()),
            };

            const res = await apiService.submitImpactReport(reportData);
            if (res.success) {
                toast.success('Impact report submitted successfully');
                if (onSuccess) onSuccess();
            } else {
                toast.error('Failed to submit report');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error submitting report');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                <AlertTriangle className="text-orange-500" />
                Submit Impact Assessment
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Human Impact Section */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-gray-700 border-b pb-2">Human Impact</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600">Casualties</label>
                            <input
                                type="number"
                                {...register('casualties', { min: 0 })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600">Injured</label>
                            <input
                                type="number"
                                {...register('injured', { min: 0 })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600">Displaced</label>
                            <input
                                type="number"
                                {...register('displaced', { min: 0 })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600">Houses Damaged</label>
                            <input
                                type="number"
                                {...register('housesDamaged', { min: 0 })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                placeholder="0"
                            />
                        </div>
                    </div>
                </div>

                {/* Infrastructure Section */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-gray-700 border-b pb-2">Infrastructure Status</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600">Roads</label>
                            <select {...register('infrastructure.roads')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
                                <option value="functional">Functional</option>
                                <option value="damaged">Damaged</option>
                                <option value="inaccessible">Inaccessible</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600">Power</label>
                            <select {...register('infrastructure.power')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
                                <option value="functional">Functional</option>
                                <option value="partial_outage">Partial Outage</option>
                                <option value="no_power">No Power</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600">Water</label>
                            <select {...register('infrastructure.water')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
                                <option value="functional">Functional</option>
                                <option value="contaminated">Contaminated</option>
                                <option value="no_water">No Water</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600">Communications</label>
                            <select {...register('infrastructure.communications')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
                                <option value="functional">Functional</option>
                                <option value="intermittent">Intermittent</option>
                                <option value="down">Down</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Needs & Notes */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-gray-700 border-b pb-2">Needs & Notes</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-600">Immediate Needs (comma separated)</label>
                        <input
                            type="text"
                            {...register('immediateNeedsString')}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            placeholder="Food, Water, Tents..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600">Additional Notes</label>
                        <textarea
                            {...register('notes')}
                            rows={3}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            placeholder="Describe the situation..."
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                    {submitting ? 'Submitting...' : 'Submit Assessment'}
                </button>
            </form>
        </div>
    );
}
