
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { HazardReport, HazardType } from '../../types';
import { HAZARDS } from '../../config/hazards';
import { AlertTriangle, MapPin, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Safe date parsing helper for Firestore Timestamps and various date formats
const safeParseDate = (dateValue: any): Date | null => {
    if (!dateValue) return null;
    try {
        // Handle Firestore Timestamp objects
        if (dateValue?.toDate && typeof dateValue.toDate === 'function') {
            return dateValue.toDate();
        }
        // Handle seconds-based Firestore Timestamp
        if (dateValue?.seconds) {
            return new Date(dateValue.seconds * 1000);
        }
        // Handle regular date strings or numbers
        const parsed = new Date(dateValue);
        return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
        return null;
    }
};

export function LiveThreatsBulletin() {
    const [threats, setThreats] = useState<HazardReport[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        // Listen for verified reports with high or critical severity
        const q = query(
            collection(db, 'reports'),
            where('status', '==', 'verified'),
            where('severity', 'in', ['high', 'critical']),
            orderBy('submittedAt', 'desc'),
            limit(5)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as unknown as HazardReport));
            setThreats(data);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (threats.length <= 1) return;

        const timer = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % threats.length);
        }, 5000);

        return () => clearInterval(timer);
    }, [threats]);

    if (threats.length === 0) return null;

    const currentThreat = threats[currentIndex];
    const hazardConfig = HAZARDS[currentThreat.type as HazardType];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 p-1 shadow-lg shadow-red-500/20"
        >
            <div className="relative flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-4 dark:bg-slate-900/40">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-white">
                    <AlertTriangle className="h-6 w-6 animate-pulse" />
                </div>

                <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-white/80">Live Threat Bulletin</span>
                        <span className="h-1 w-1 rounded-full bg-white/40" />
                        <div className="flex items-center gap-1 text-xs text-white/60">
                            <Clock className="h-3 w-3" />
                            {(() => {
                                const parsedDate = safeParseDate(currentThreat.submittedAt);
                                return parsedDate ? formatDistanceToNow(parsedDate, { addSuffix: true }) : 'Just now';
                            })()}
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentThreat.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex items-center justify-between"
                        >
                            <div>
                                <h3 className="text-lg font-bold text-white truncate max-w-md">
                                    {hazardConfig?.label || 'Unknown hazard'} in {currentThreat.location || 'Coastal Area'}
                                </h3>
                                <p className="text-sm text-white/80 line-clamp-1">
                                    {currentThreat.description}
                                </p>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div className="hidden sm:flex items-center gap-4">
                    <div className="flex items-center gap-1 text-xs font-semibold text-white bg-white/10 px-3 py-1.5 rounded-full">
                        <MapPin className="h-3 w-3" />
                        Live Update
                    </div>
                </div>
            </div>

            {/* Progress Dots */}
            {threats.length > 1 && (
                <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
                    {threats.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-1 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-4 bg-white' : 'w-1 bg-white/40'}`}
                        />
                    ))}
                </div>
            )}
        </motion.div>
    );
}
