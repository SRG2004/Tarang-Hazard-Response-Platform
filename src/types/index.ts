export type UserRole = 'citizen' | 'authority' | 'ngo' | 'responder';

export type HazardType =
  | 'flood'
  | 'earthquake'
  | 'cyclone'
  | 'landslide'
  | 'heatwave'
  | 'wildfire'
  | 'urban_disaster'
  | 'tsunami';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  phoneVerified?: boolean;
  aadharId?: string;
  createdAt?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

export interface NavItem {
  name: string;
  href: string;
  icon: string;
}

export interface HazardReport {
  id: string;
  type: HazardType;
  title: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  status: 'pending' | 'verified' | 'rejected' | 'solved';
  submittedBy: string;
  submittedAt: Date;
  imageUrl?: string;
  verifiedBy?: string;
  verifiedAt?: Date;
}

export interface Volunteer {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  skills: string[];
  status: 'active' | 'inactive' | 'pending';
  joinedAt: Date;
  organization?: string;
}

export interface ImpactReport {
  id: string;
  hazardReportId?: string; // Optional link to a specific hazard report
  submittedBy: string; // User ID
  organization?: string; // NGO/Agency name
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  submittedAt: Date;

  // Impact Data
  casualties: number;
  injured: number;
  displaced: number;
  housesDamaged: number;

  // Infrastructure Status
  infrastructure: {
    roads: 'functional' | 'damaged' | 'inaccessible';
    power: 'functional' | 'partial_outage' | 'no_power';
    water: 'functional' | 'contaminated' | 'no_water';
    communications: 'functional' | 'intermittent' | 'down';
  };

  immediateNeeds: string[]; // e.g., ["Food", "Water", "Medical", "Shelter"]
  notes?: string;
  images?: string[];
}

export interface ResourceRequest {
  id: string;
  requesterId: string;
  requesterName: string; // Denormalized for display
  requesterRole: 'ngo' | 'responder' | 'authority';
  resourceType: string; // e.g., "Medical Kits", "Food Packets"
  quantity: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  reason?: string; // For request or for rejection
  requestedAt: Date;
  updatedAt?: Date;
  updatedBy?: string; // Authority ID
}
