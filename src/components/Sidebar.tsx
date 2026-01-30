import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { ROLES_CONFIG } from '../config/rbac';
import {
  Home,
  FileText,
  Users,
  HandHeart,
  Settings,
  Map,
  BarChart3,
  Package,
  UserCog,
  FileCheck,
  LogOut,
  CheckCircle,
  Phone,
  AlertCircle,
  UserPlus,
  Building2,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './ui/utils';
import { useTranslation } from '../contexts/TranslationContext';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

interface SidebarProps {
  userRole: UserRole;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  isCollapsed: boolean;
  isMobile?: boolean;
}

export function Sidebar({ userRole, currentPage, onNavigate, onLogout, isCollapsed, isMobile = false }: SidebarProps) {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(!isMobile);

  useEffect(() => {
    if (isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Show sidebar when mouse is near left edge (within 50px)
      if (e.clientX < 50) {
        setIsVisible(true);
      }
      // Hide sidebar when mouse moves away (beyond 300px)
      else if (e.clientX > 300 && !isCollapsed) {
        setIsVisible(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isCollapsed, isMobile]);

  // Master list of all possible navigation items
  const allNavItems: Record<string, NavItem> = {
    '/dashboard': { name: t('nav.dashboard'), href: 'dashboard', icon: Home },
    '/report-hazard': { name: t('nav.reportHazard'), href: 'report-hazard', icon: FileText },
    '/donate': { name: 'Donate', href: 'donate', icon: HandHeart },
    '/map-view': { name: t('nav.mapView'), href: 'map-view', icon: Map },
    '/hazard-drills': { name: t('nav.hazardDrills'), href: 'hazard-drills', icon: CheckCircle },
    '/emergency-contacts': { name: t('nav.emergencyContacts'), href: 'emergency-contacts', icon: Phone },
    '/infrastructure': { name: t('nav.infrastructure'), href: 'infrastructure', icon: Building2 },
    '/volunteer-registration': { name: t('nav.volunteerRegistration'), href: 'volunteer-registration', icon: UserPlus },

    // NGO Routes
    '/resource-management': { name: t('nav.resourceManagement'), href: 'resource-management', icon: Package },
    '/field-teams': { name: t('nav.fieldTeams'), href: 'field-teams', icon: Users },
    '/impact-reporting': { name: t('nav.impactReporting'), href: 'impact-reporting', icon: FileText },
    '/impact-reports': { name: t('nav.impactReports'), href: 'impact-reports', icon: BarChart3 },

    // Responder Routes  
    '/emergency-dispatch': { name: t('nav.emergencyDispatch'), href: 'emergency-dispatch', icon: AlertCircle },
    '/field-verification': { name: t('nav.fieldVerification'), href: 'field-verification', icon: FileCheck },

    // Authority Routes
    '/reports': { name: t('nav.reports'), href: 'reports', icon: FileCheck },
    '/field-verifications': { name: t('nav.fieldVerifications'), href: 'field-verifications', icon: FileCheck },

    '/flash-sms': { name: t('nav.flashSmsAlert'), href: 'flash-sms', icon: AlertCircle },
    '/insights': { name: t('nav.insights'), href: 'insights', icon: BarChart3 },
    '/volunteers': { name: t('nav.volunteers'), href: 'volunteers', icon: Users },
    '/user-management': { name: t('nav.userManagement'), href: 'user-management', icon: UserCog },
    '/data-exports': { name: t('nav.dataExports'), href: 'data-exports', icon: Package },
    '/settings': { name: t('header.settings'), href: 'settings', icon: Settings },
    '/social-media': { name: t('nav.socialMedia'), href: 'social-media', icon: Activity },
    '/social-media-verification': { name: t('nav.socialMediaVerification'), href: 'social-media-verification', icon: CheckCircle },
  };

  // Compute navItems based on role
  const config = ROLES_CONFIG[userRole];
  const allowed = config ? config.allowedRoutes : [];

  const navItems = allowed
    .map(route => allNavItems[route])
    .filter((item): item is NavItem => item !== undefined);

  return (
    <>
      {/* Show indicator when sidebar is hidden - Desktop Only */}
      <AnimatePresence>
        {!isVisible && !isMobile && (
          <motion.div
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -10, opacity: 0 }}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-[60] bg-indigo-600 text-white p-2 rounded-r-xl shadow-lg cursor-pointer"
            onClick={() => setIsVisible(true)}
          >
            <ChevronRight className="w-5 h-5" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.aside
        initial={{ x: isMobile ? 0 : -280 }}
        animate={{ x: (isVisible || isMobile) ? 0 : -280 }}
        transition={{ duration: 0.4, ease: [0.4, 0.0, 0.2, 1] }}
        className={cn(
          "h-screen w-[280px] bg-white/70 dark:bg-gray-900/70 backdrop-blur-md text-gray-900 dark:text-white shadow-2xl flex flex-col border-r border-gray-200/50 dark:border-gray-800/50",
          !isMobile && "fixed left-0 top-0 z-50",
          isMobile && "w-full"
        )}
      >
        {/* Logo Section */}
        <div className="h-20 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6">
          <div className="flex items-center gap-3 overflow-hidden">
            <div>
              <h1 className="text-lg font-bold">Tarang</h1>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium tracking-wider uppercase">Disaster Response</p>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 overflow-y-auto py-8 px-4 custom-scrollbar">
          <div className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.href;

              return (
                <motion.button
                  key={item.href}
                  onClick={() => onNavigate(item.href)}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative group",
                    isActive
                      ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100 dark:shadow-none font-bold"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-indigo-600 dark:hover:text-white"
                  )}
                >
                  <Icon className={cn("w-5 h-5 shrink-0 transition-colors", isActive ? "text-white" : "text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-white")} />
                  <span className="text-sm truncate">{item.name}</span>
                </motion.button>
              );
            })}
          </div>
        </nav>

        {/* Logout Button Section */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <motion.button
            onClick={() => {
              if (window.confirm("Are you sure you want to logout?")) {
                onLogout();
              }
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-700 dark:text-gray-400 hover:text-red-600 dark:hover:text-white transition-all duration-200"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="font-semibold text-sm">{t('header.logout')}</span>
          </motion.button>
        </div>
      </motion.aside>
    </>
  );
}
