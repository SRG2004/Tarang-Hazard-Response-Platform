import { UserRole } from '../types';

export interface RoleConfig {
    allowedRoutes: string[];
    defaultRoute: string; // Where to redirect after login or if unauthorized
    dashboardComponent: string; // Logic to determine which dashboard to show
}

// Routes that are public (e.g. login) are handled separately in App.tsx
// This config is for authenticated routes.

export const ROLES_CONFIG: Record<UserRole, RoleConfig> = {
    citizen: {
        allowedRoutes: [
            '/dashboard',
            '/report-hazard',
            '/donate',
            '/map-view',
            '/hazard-drills',
            '/emergency-contacts',
            '/infrastructure',
            '/volunteer-registration',
            '/social-media',
            '/settings'
        ],
        defaultRoute: '/dashboard',
        dashboardComponent: 'CitizenDashboardNew'
    },
    authority: {
        allowedRoutes: [
            '/dashboard',
            '/map-view',
            '/reports',
            '/user-management',
            '/insights',
            '/social-media-verification',
            '/flash-sms',
            '/data-exports',
            '/hazard-drills',
            '/emergency-contacts',
            '/volunteers',
            '/social-media',
            '/settings',
            '/resource-management',
            '/emergency-dispatch',
            '/impact-reports'
        ],
        defaultRoute: '/dashboard',
        dashboardComponent: 'AuthorityDashboard'
    },
    ngo: {
        allowedRoutes: [
            '/dashboard',
            '/resource-management',
            '/field-teams',
            '/impact-reporting',
            '/impact-reports',
            '/resource-requests',
            '/donate',
            '/map-view',
            '/volunteers',
            '/social-media',
            '/settings'
        ],
        defaultRoute: '/dashboard',
        dashboardComponent: 'ManagementDashboard'
    },
    responder: {
        allowedRoutes: [
            '/dashboard',
            '/emergency-dispatch',
            '/field-verification',
            '/resource-requests',
            '/map-view',
            '/report-hazard',
            '/hazard-drills',
            '/emergency-contacts',
            '/infrastructure',
            '/social-media',
            '/impact-reporting',
            '/impact-reports',
            '/settings'
        ],
        defaultRoute: '/dashboard',
        dashboardComponent: 'ManagementDashboard'
    }
};

/**
 * Helper to check if a user has access to a specific route
 */
export const hasAccess = (role: UserRole, path: string): boolean => {
    const config = ROLES_CONFIG[role];
    if (!config) return false;

    // Clean path to remove query params or trailing slashes for comparison
    const cleanPath = path.split('?')[0].replace(/\/+$/, '');

    // Check exact match or if it's a sub-route (unlikely in this flat structure but good practice)
    return config.allowedRoutes.some(allowed =>
        cleanPath === allowed || cleanPath.startsWith(`${allowed}/`)
    );
};
