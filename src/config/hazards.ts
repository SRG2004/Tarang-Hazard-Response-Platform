import { LucideIcon, Waves, Zap, Flame, CloudRain, Activity, Building2, ThermometerSun, Tornado } from 'lucide-react';
import { HazardType } from '../types';

export interface HazardConfig {
    id: HazardType;
    label: string;
    icon: any;
    color: string;
    severityLevels: ['low', 'moderate', 'high', 'critical'];
    description: string;
}

export const HAZARDS: Record<HazardType, HazardConfig> = {
    flood: {
        id: 'flood',
        label: 'Floods',
        icon: CloudRain,
        color: '#3b82f6', // blue-500
        severityLevels: ['low', 'moderate', 'high', 'critical'],
        description: 'River rise, urban flooding, or dam overflow',
    },
    earthquake: {
        id: 'earthquake',
        label: 'Earthquake',
        icon: Activity,
        color: '#854d0e', // yellow-800 - distinct from warning yellow
        severityLevels: ['low', 'moderate', 'high', 'critical'],
        description: 'Seismic activity and ground shaking',
    },
    cyclone: {
        id: 'cyclone',
        label: 'Cyclone',
        icon: Tornado,
        color: '#0e7490', // cyan-700
        severityLevels: ['low', 'moderate', 'high', 'critical'],
        description: 'High velocity winds and storm surges',
    },
    landslide: {
        id: 'landslide',
        label: 'Landslide',
        icon: Waves, // Placeholder, usually a mountain icon
        color: '#57534e', // stone-600
        severityLevels: ['low', 'moderate', 'high', 'critical'],
        description: 'Rock, debris, or earth movement down a slope',
    },
    heatwave: {
        id: 'heatwave',
        label: 'Heatwave',
        icon: ThermometerSun,
        color: '#ef4444', // red-500
        severityLevels: ['low', 'moderate', 'high', 'critical'],
        description: 'Extreme heat conditions affecting health',
    },
    wildfire: {
        id: 'wildfire',
        label: 'Wildfires',
        icon: Flame,
        color: '#f97316', // orange-500
        severityLevels: ['low', 'moderate', 'high', 'critical'],
        description: 'Uncontrolled fire in vegetation or forests',
    },
    urban_disaster: {
        id: 'urban_disaster',
        label: 'Urban Disaster',
        icon: Building2,
        color: '#71717a', // zinc-500
        severityLevels: ['low', 'moderate', 'high', 'critical'],
        description: 'Building collapse, gas leakage, or structural failure',
    },
    tsunami: {
        id: 'tsunami',
        label: 'Tsunami',
        icon: Waves,
        color: '#1e3a8a', // blue-900
        severityLevels: ['low', 'moderate', 'high', 'critical'],
        description: 'Large ocean waves caused by undersea disturbance',
    },
};
