import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { User } from '../../types';
import { hasAccess, ROLES_CONFIG } from '../../config/rbac';

interface ProtectedRouteProps {
    user: User | null;
    loading: boolean;
    children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ user, loading, children }) => {
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0077B6] mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        // Redirect to login while saving the attempted url
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    // Check if user has access to this route
    // We strip the leading slash for consistency with some path definitions if needed, 
    // but rbac.ts expects leading slash
    if (!hasAccess(user.role, location.pathname)) {
        console.warn(`User ${user.email} (${user.role}) denied access to ${location.pathname}`);
        const defaultRoute = ROLES_CONFIG[user.role]?.defaultRoute || '/dashboard';
        return <Navigate to={defaultRoute} replace />;
    }

    return <>{children}</>;
};
