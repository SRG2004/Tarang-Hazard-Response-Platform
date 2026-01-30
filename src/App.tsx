import React, { useState, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { User } from './types';
import { useAuth } from './contexts/AuthContext';
import { useTranslation } from './contexts/TranslationContext';
import { LoginPage } from './pages/LoginPage';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';

import { CitizenDashboardNew } from './pages/CitizenDashboardNew'; // NEW ANIMATED FEED
import { ReportHazard } from './pages/ReportHazardNew'; // NEW WIZARD UI
import { AuthorityDashboard } from './pages/AuthorityDashboard';
import { ManagementDashboard } from './pages/ManagementDashboard';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ROLES_CONFIG } from './config/rbac';

import { MapView } from './pages/MapView';
import { ReportsManagement } from './pages/ReportsManagement';
// SocialMediaFeed import removed as it does not exist
import { LiveIntelligence } from './pages/LiveIntelligence';
import { SocialMediaVerification } from './pages/SocialMediaVerification';
import { Settings } from './pages/Settings';
import { motion, AnimatePresence } from 'framer-motion';
import { VolunteerManagement } from './pages/VolunteerManagement';
import { VolunteerRegistration } from './pages/VolunteerRegistration';
import { UserManagement } from './pages/UserManagement';
import { DataExports } from './pages/DataExports';
import { HazardDrills } from './pages/HazardDrills';
import { EmergencyContacts } from './pages/EmergencyContacts';
import { EmergencyInfrastructure } from './pages/EmergencyInfrastructure';
import { FlashSMSAlert } from './pages/FlashSMSAlert';
// MLModelManagement removed
import { DataInsights } from './pages/DataInsights';
import { Donation } from './pages/Donation';
import { ResourceManagement } from './pages/ResourceManagement';
import { EmergencyDispatch } from './pages/EmergencyDispatch';
import { FieldVerification } from './pages/FieldVerification';
import { FieldTeams } from './pages/FieldTeams';
import { ImpactReporting } from './pages/ImpactReporting';
import { ImpactReportsList } from './pages/ImpactReportsList';
import { FieldVerificationsList } from './pages/FieldVerificationsList';
import { FloatingActionButton } from './components/FloatingActionButton';
import { SyncStatus } from './components/SyncStatus';
import { NotificationPermission } from './components/NotificationPermission';
import { ChatBot } from './components/ChatBot';
import { SmartAlertSystem } from './components/SmartAlertSystem';
import { GoogleMapsLoader } from './components/GoogleMapsLoader';
import { GeoMapBackground } from './components/ui/geo-map-background';
import { Toaster } from './components/ui/sonner';
import { cn } from './components/ui/utils';

// Mock user data for each role removed as it was unused

import { GoogleSignupCompletion } from './components/GoogleSignupCompletion';
import { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { toast } from 'sonner';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './lib/firebase';


// Helper to detect and fix rogue Service Workers intercepting Auth handlers
function useServiceWorkerCleanup() {
  React.useEffect(() => {
    // Check if we are on the auth handler path (e.g. /__/auth/handler)
    // AND if we are logged out (which is why AppContent renders this)
    if (window.location.pathname.startsWith('/__/auth/')) {
      console.warn('Detected App Shell on Auth Handler path. Attempting to unregister Service Worker...');

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (let registration of registrations) {
            registration.unregister();
            console.log('Unregistered SW:', registration);
          }
          // Force reload to bypass SW and hit server
          window.location.reload();
        });
      }
    }
  }, []);
}

function AppContent() {
  useServiceWorkerCleanup(); // Run cleanup check
  const {

    currentUser: firebaseUser,
    userProfile,
    logout: authLogout,
    loading: authLoading,
    sendOTP,
    verifyPhoneForGoogleUser,
    setPasswordForGoogleUser,
    updatePhoneForGoogleUser,
    reloadUserProfile
  } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Profile completion state
  const [showGoogleCompletion, setShowGoogleCompletion] = useState(false);

  // Convert Firebase user profile to app User type
  const currentUser: User | null = userProfile && userProfile.uid && userProfile.name && userProfile.email && userProfile.role ? {
    id: userProfile.uid,
    name: userProfile.name || 'User',
    email: userProfile.email || '',
    role: userProfile.role
  } : null;

  // Check for incomplete profile
  React.useEffect(() => {
    if (!authLoading && currentUser && userProfile) {
      // Check if Aadhar ID is missing or Phone is not verified
      // We exclude admin role from this strict check if needed, but keeping it global for now
      const isProfileIncomplete = !userProfile.aadharId || !userProfile.phoneVerified;

      if (isProfileIncomplete) {
        console.log('Profile incomplete, showing completion dialog');
        setShowGoogleCompletion(true);
      } else {
        setShowGoogleCompletion(false);
      }
    }
  }, [authLoading, currentUser, userProfile]);

  const handleLogout = async () => {
    try {
      await authLogout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNavigate = (page: string) => {
    navigate(`/${page}`);
    if (isMobileSidebarOpen) {
      setIsMobileSidebarOpen(false);
    }
  };

  const toggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsMobileSidebarOpen(!isMobileSidebarOpen);
    } else {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  const handleGoogleCompletion = async (aadharId: string, name: string) => {
    // Save Aadhar ID to user profile if not already saved
    if (firebaseUser && aadharId) {
      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        const existingData = userDoc.exists() ? userDoc.data() : null;

        if (!existingData?.aadharId) {
          await setDoc(doc(db, 'users', firebaseUser.uid), {
            aadharId: aadharId.replace(/\s/g, ''),
            name: name || firebaseUser.displayName || existingData?.name || 'User',
          }, { merge: true });
        }

        // Reload the user profile to update the state
        await reloadUserProfile();
      } catch (error) {
        console.error('Error saving Aadhar ID:', error);
      }
    }
    setShowGoogleCompletion(false);
    toast.success(t('login.profileCompleted'));
  };

  // Page title mapping
  const pageTitles: Record<string, string> = useMemo(() => ({
    dashboard: t('page.dashboard'),
    'report-hazard': t('page.reportHazard'),
    'volunteer-registration': t('page.volunteerRegistration'),
    donate: t('page.donate'),
    'map-view': t('page.mapView'),
    reports: t('page.reports'),
    volunteers: t('page.volunteers'),
    'user-management': t('page.userManagement'),
    insights: t('page.insights'),
    'social-media': t('page.socialMedia'),
    'social-media-verification': t('page.socialMediaVerification'),
    'data-exports': t('page.dataExports'),
    'hazard-drills': t('page.hazardDrills'),
    'emergency-contacts': t('page.emergencyContacts'),
    'flash-sms': t('page.flashSms'),
    'ml-models': t('page.mlModels'),
    settings: t('settings.title'),
  }), [t]);

  // Determine current page key from path
  const currentPageKey = location.pathname.substring(1) || 'dashboard';
  const pageTitle = pageTitles[currentPageKey] || 'Dashboard';

  // Redirect to login if not authenticated
  // REMOVED: Global redirect to '/' on reload. 
  // This was causing the "flash" and "wrong page" issue.
  // We now rely on ProtectedRoute to handle unauthenticated access to specific pages.
  /*
  React.useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate('/');
    }
  }, [authLoading, currentUser, navigate]);
  */

  const DashboardComponent = () => {
    const dashboardName = currentUser?.role ? ROLES_CONFIG[currentUser.role]?.dashboardComponent : 'CitizenDashboardNew';

    switch (dashboardName) {
      case 'ManagementDashboard': return <ManagementDashboard />;
      case 'AuthorityDashboard': return <AuthorityDashboard />;
      case 'CitizenDashboardNew':
      default: return <CitizenDashboardNew />;
    }
  };

  // Dashboard content component
  const DashboardLayout = () => {
    return (
      <div className="flex flex-1 overflow-hidden relative z-10 w-full h-full">
        {/* Sidebar for desktop */}
        <div className="hidden lg:block relative z-20">
          <Sidebar
            userRole={currentUser!.role}
            currentPage={currentPageKey}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            isCollapsed={isSidebarCollapsed}
          />
        </div>

        {/* Mobile Sidebar */}
        <div className={cn(
          "fixed inset-y-0 left-0 z-[100] w-64 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border-r border-border/30 dark:border-gray-700/30 transform transition-all duration-300 ease-in-out lg:hidden",
          isMobileSidebarOpen
            ? "translate-x-0 opacity-100 visible"
            : "-translate-x-full opacity-0 invisible pointer-events-none"
        )}>
          <Sidebar
            userRole={currentUser!.role}
            currentPage={currentPageKey}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            isCollapsed={false}
            isMobile={true}
          />
        </div>

        {/* Overlay for mobile sidebar */}
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={toggleSidebar}
            />
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden h-full">
          <Header
            user={currentUser}
            pageTitle={pageTitle}
            onToggleSidebar={toggleSidebar}
            onLogout={handleLogout}
          />

          <main className="flex-1 overflow-y-auto bg-transparent">
            {/*
              This inner Routes definition handles the dashboard views.
              We keep the protected route wrapper logic here as well.
             */}
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<ProtectedRoute user={currentUser} loading={authLoading}><DashboardComponent /></ProtectedRoute>} />
              <Route path="/report-hazard" element={<ProtectedRoute user={currentUser} loading={authLoading}><ReportHazard /></ProtectedRoute>} />
              <Route path="/map-view" element={<ProtectedRoute user={currentUser} loading={authLoading}><MapView /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute user={currentUser} loading={authLoading}><ReportsManagement /></ProtectedRoute>} />

              <Route path="/volunteer-registration" element={<ProtectedRoute user={currentUser} loading={authLoading}><VolunteerRegistration /></ProtectedRoute>} />
              <Route path="/volunteers" element={<ProtectedRoute user={currentUser} loading={authLoading}><VolunteerManagement /></ProtectedRoute>} />
              <Route path="/user-management" element={<ProtectedRoute user={currentUser} loading={authLoading}><UserManagement /></ProtectedRoute>} />

              <Route path="/insights" element={<ProtectedRoute user={currentUser} loading={authLoading}><DataInsights /></ProtectedRoute>} />
              <Route path="/data-exports" element={<ProtectedRoute user={currentUser} loading={authLoading}><DataExports /></ProtectedRoute>} />

              <Route path="/social-media-verification" element={<ProtectedRoute user={currentUser} loading={authLoading}><SocialMediaVerification /></ProtectedRoute>} />
              <Route path="/social-media" element={<ProtectedRoute user={currentUser} loading={authLoading}><LiveIntelligence /></ProtectedRoute>} />

              <Route path="/hazard-drills" element={<ProtectedRoute user={currentUser} loading={authLoading}><HazardDrills /></ProtectedRoute>} />
              <Route path="/emergency-contacts" element={<ProtectedRoute user={currentUser} loading={authLoading}><EmergencyContacts /></ProtectedRoute>} />
              <Route path="/infrastructure" element={<ProtectedRoute user={currentUser} loading={authLoading}><EmergencyInfrastructure /></ProtectedRoute>} />
              <Route path="/flash-sms" element={<ProtectedRoute user={currentUser} loading={authLoading}><FlashSMSAlert /></ProtectedRoute>} />

              <Route path="/settings" element={<ProtectedRoute user={currentUser} loading={authLoading}><Settings /></ProtectedRoute>} />

              <Route path="/donate" element={<ProtectedRoute user={currentUser} loading={authLoading}><Donation /></ProtectedRoute>} />
              <Route path="/resource-management" element={<ProtectedRoute user={currentUser} loading={authLoading}><ResourceManagement /></ProtectedRoute>} />
              <Route path="/emergency-dispatch" element={<ProtectedRoute user={currentUser} loading={authLoading}><EmergencyDispatch /></ProtectedRoute>} />
              <Route path="/field-verification" element={<ProtectedRoute user={currentUser} loading={authLoading}><FieldVerification /></ProtectedRoute>} />
              <Route path="/field-teams" element={<ProtectedRoute user={currentUser} loading={authLoading}><FieldTeams /></ProtectedRoute>} />
              <Route path="/impact-reporting" element={<ProtectedRoute user={currentUser} loading={authLoading}><ImpactReporting /></ProtectedRoute>} />
              <Route path="/impact-reports" element={<ProtectedRoute user={currentUser} loading={authLoading}><ImpactReportsList /></ProtectedRoute>} />
              <Route path="/field-verifications" element={<ProtectedRoute user={currentUser} loading={authLoading}><FieldVerificationsList /></ProtectedRoute>} />

              {/* Fallback */}
              <Route path="*" element={
                <div className="p-6 text-center">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Page Not Found</h2>
                  <p className="text-gray-600 dark:text-gray-400">The requested page is not available.</p>
                </div>
              } />
            </Routes>
          </main>
        </div>
      </div>
    );
  };

  return (
    <GeoMapBackground className="h-screen overflow-hidden">
      {/* 
        Unified App Layout Wrapper 
        The GeoMapBackground is now the SINGLE source of truth for the background.
        Everything else renders inside it.
      */}

      {(authLoading || !currentUser) ? (
        // Loading or Login State
        <div className="flex items-center justify-center min-h-screen w-full relative z-20">
          {authLoading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0077B6] mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <>
              <LoginPage />
              <Toaster />
            </>
          )}
        </div>
      ) : (
        // Authenticated Dashboard Layout
        <DashboardLayout />
      )}

      {/* Global Elements present in all states */}

      {/* Global Overlays */}
      <ChatBot className={currentUser?.role === 'citizen' ? 'bottom-24' : 'bottom-6'} />
      <SyncStatus />
      <SmartAlertSystem />
      <NotificationPermission />
      <Toaster />
      <GoogleMapsLoader />

      {/* Floating Action Button for Citizens on Mobile */}
      {currentUser?.role === 'citizen' && (
        <FloatingActionButton onClick={() => handleNavigate('report-hazard')} />
      )}

      {/* Profile Completion Dialog */}
      {firebaseUser && (
        <GoogleSignupCompletion
          open={showGoogleCompletion}
          onClose={() => {
            if (showGoogleCompletion) {
              toast.warning('Please complete your profile to continue.');
            }
          }}
          onComplete={handleGoogleCompletion}
          userName={firebaseUser.displayName || 'User'}
          userEmail={firebaseUser.email || ''}
          onSendOTP={async (phone: string, verifier: RecaptchaVerifier) => {
            return await sendOTP(phone, verifier);
          }}
          onVerifyOTP={async (confirmationResult: ConfirmationResult, otp: string) => {
            await verifyPhoneForGoogleUser(confirmationResult, otp);
          }}
          onSetPassword={async (password: string, aadharId: string) => {
            await setPasswordForGoogleUser(password, aadharId);
          }}
          onUpdatePhone={async (phone: string) => {
            await updatePhoneForGoogleUser(phone);
          }}
        />
      )}

    </GeoMapBackground>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
