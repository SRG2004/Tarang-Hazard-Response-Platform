import React, { useState } from 'react';
import { User } from '../types';
import { Menu, Bell, LogOut, Search, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback } from './ui/avatar';
import { useTranslation } from '../contexts/TranslationContext';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  user: User | null;
  pageTitle: string;
  onToggleSidebar: () => void;
  onLogout: () => void;
}

export function Header({ user, pageTitle, onToggleSidebar, onLogout }: HeaderProps) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);

  if (!user) {
    return null;
  }

  const initials = (user.name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const roleLabels: Record<string, string> = {
    citizen: t('role.citizen'),
    authority: 'Authority',
    ngo: 'NGO',
    responder: 'Responder',
  };


  // Notifications logic
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  React.useEffect(() => {
    if (!user) return;

    // Import Firestore dynamically to avoid initialization errors if not needed immediately
    const setupNotifications = async () => {
      const { collection, query, where, onSnapshot, orderBy, limit } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');

      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.id),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notifs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        })) as any[];
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.read).length);
      });

      return unsubscribe;
    };

    setupNotifications();
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      const notifRef = doc(db, 'notifications', notificationId);
      await updateDoc(notifRef, { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { doc, writeBatch } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');

      const batch = writeBatch(db);
      notifications.filter(n => !n.read).forEach(n => {
        const ref = doc(db, 'notifications', n.id);
        batch.update(ref, { read: true });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };



  // Format relative time (simple version to avoid large date-fns import if preferred, otherwise import date-fns)
  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
  };

  return (
    <motion.header
      initial={{ y: -64 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-40 shadow-sm transition-colors duration-300"
      style={{
        borderBottom: '2px solid transparent',
        borderImage: 'linear-gradient(to right, rgb(99, 102, 241), rgb(168, 85, 247)) 1',
      }}
    >
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Menu Button - Pill Shaped */}
        <motion.button
          onClick={onToggleSidebar}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-3 bg-gradient-to-br from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 dark:from-slate-800 dark:to-slate-700 rounded-full transition-all shadow-sm lg:hidden"
        >
          <Menu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </motion.button>

        {/* Page Title - Pill Container */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-700 px-6 py-3 rounded-full"
        >
          <h2 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {pageTitle}
          </h2>
        </motion.div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Search Button - Pill */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-all"
        >
          <Search className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Search...</span>
        </motion.button>

        {/* Theme Toggle - Pill */}
        <motion.button
          onClick={toggleTheme}
          whileHover={{ scale: 1.05, rotate: 180 }}
          whileTap={{ scale: 0.95 }}
          className="p-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-all"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-yellow-500" />
          ) : (
            <Moon className="w-5 h-5 text-gray-700" />
          )}
        </motion.button>

        {/* Notifications - Pill */}
        <div className="relative">
          <motion.button
            onClick={() => setShowNotifications(!showNotifications)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-all relative"
          >
            <Bell className="w-5 h-5 text-gray-700 dark:text-gray-400" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white animate-pulse"></span>
            )}
          </motion.button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-14 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden"
              >
                <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-700 dark:to-slate-600 border-b border-gray-200 dark:border-slate-600 flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
                  <div className="flex gap-2">

                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-2 max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => markAsRead(notif.id)}
                        className={`p-3 rounded-xl mb-2 transition-colors cursor-pointer ${notif.read
                          ? 'bg-transparent hover:bg-gray-50 dark:hover:bg-slate-700/50 opacity-70'
                          : 'bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
                          }`}
                      >
                        <p className={`text-sm ${notif.read ? 'text-gray-600 dark:text-gray-400' : 'font-medium text-gray-900 dark:text-gray-100'}`}>
                          {notif.message || notif.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {notif.createdAt ? formatTimeAgo(notif.createdAt) : 'Just now'}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Profile - Pill Container */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-slate-700"
        >
          <div className="hidden md:flex items-center gap-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-700 px-4 py-2 rounded-full">
            <Avatar className="ring-2 ring-white dark:ring-slate-600 shadow-sm">
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user.name}</p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium capitalize">
                {roleLabels[user.role]}
              </p>
            </div>
          </div>

          {/* Logout Button - Pill */}
          <motion.button
            onClick={() => {
              if (window.confirm("Are you sure you want to logout?")) {
                onLogout();
              }
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-full transition-all group"
            title="Logout"
          >
            <LogOut className="w-5 h-5 text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors" />
          </motion.button>
        </motion.div>
      </div>
    </motion.header>
  );
}
