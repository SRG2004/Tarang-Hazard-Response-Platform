import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Bell, X, ExternalLink, Volume2, VolumeX } from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { useTranslation } from '../contexts/TranslationContext';
import { audioAlertService } from '../services/audioAlertService';
import { HAZARDS } from '../config/hazards';
import { HazardType } from '../types';

export interface AlertData {
    id: string;
    type: HazardType;
    title: string;
    description: string;
    severity: 'low' | 'moderate' | 'high' | 'critical';
    timestamp: Timestamp;
    location: string;
    affectedRadius: number; // in km
}

export const SmartAlertSystem: React.FC = () => {
    const [alerts, setAlerts] = useState<AlertData[]>([]);
    const [minimized, setMinimized] = useState(false);
    const [muted, setMuted] = useState(false);
    const { t, language } = useTranslation();

    useEffect(() => {
        // Listen for critical or high severity alerts from the last 24 hours
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const q = query(
            collection(db, 'alerts'), // Assuming 'alerts' collection exists
            where('severity', 'in', ['critical', 'high']),
            where('timestamp', '>=', yesterday),
            orderBy('timestamp', 'desc'),
            limit(5)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newAlerts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as AlertData[];

            setAlerts(newAlerts);

            // Play sound for new critical alerts if not existing
            if (newAlerts.length > 0 && newAlerts[0].severity === 'critical' && !muted) {
                // Check if this latest alert is "new" logic could be added here
                // For now, just a toast
                toast.error(t('alert.criticalWarning'), {
                    description: newAlerts[0].title
                });
            }
        }, (error) => {
            // Silently handle permission errors (expected on logout)
            if (error.code !== 'permission-denied') {
                console.error("Error fetching alerts:", error);
            }
        });

        return () => unsubscribe();
    }, [muted, t]);

    if (alerts.length === 0) return null;

    return (
        <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${minimized ? 'w-auto' : 'w-96'}`}>
            {minimized ? (
                <Button
                    variant="destructive"
                    className="rounded-full h-12 w-12 shadow-lg animate-pulse"
                    onClick={() => setMinimized(false)}
                >
                    <Bell className="h-6 w-6" />
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] items-center justify-center text-white font-bold">
                            {alerts.length}
                        </span>
                    </span>
                </Button>
            ) : (
                <div className="bg-white rounded-lg shadow-2xl border border-red-200 overflow-hidden flex flex-col max-h-[80vh]">
                    {/* Header */}
                    <div className="bg-red-600 text-white p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Bell className="h-5 w-5 fill-current animate-pulse" />
                            <h3 className="font-bold">{t('alert.activeAlerts')} ({alerts.length})</h3>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-red-700" onClick={() => setMuted(!muted)}>
                                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-red-700" onClick={() => setMinimized(true)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Alert List */}
                    <div className="p-2 overflow-y-auto space-y-2 bg-red-50">
                        {alerts.map(alert => {
                            // Fallback to urban_disaster if type not found
                            const hazardConfig = HAZARDS[alert.type] || HAZARDS['urban_disaster'];
                            return (
                                <Alert key={alert.id} className="bg-white border-l-4 border-l-red-500 shadow-sm">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex-1">
                                            <AlertTitle className="text-red-700 font-bold flex items-center gap-2">
                                                {/* Icon could go here */}
                                                {alert.title}
                                            </AlertTitle>
                                            <AlertDescription className="text-sm mt-1 text-gray-700">
                                                {alert.description}
                                            </AlertDescription>
                                            <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                                <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-medium">
                                                    {alert.severity.toUpperCase()}
                                                </span>
                                                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    📍 {alert.location}
                                                </span>
                                                <span className="text-gray-500 flex items-center">
                                                    🕒 {alert.timestamp?.toDate().toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <div className="mt-2 flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-xs border-red-200 hover:bg-red-50 text-red-700"
                                                    onClick={() => {
                                                        if (audioAlertService.isAvailable()) {
                                                            // Map severity to valid audio alert type if needed, or cast if compatible
                                                            // Assuming speakAlert accepts 'low' | 'moderate' | 'high' | 'critical' mapped to success/error etc or strings
                                                            // Actually standard generic types are 'success' | 'error' | 'warning' | 'info'
                                                            let alertType: 'success' | 'error' | 'warning' | 'info' = 'info';
                                                            if (alert.severity === 'critical') alertType = 'error';
                                                            else if (alert.severity === 'high') alertType = 'warning';

                                                            audioAlertService.speakAlert(alert.description, language, alertType);
                                                        }
                                                    }}
                                                >
                                                    <Volume2 className="h-3 w-3 mr-1" /> {t('common.listen')}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Alert>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
