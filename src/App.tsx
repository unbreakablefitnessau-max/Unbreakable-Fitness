/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Activity,
  Dumbbell,
  MessageSquare,
  Shield,
  User as UserIcon,
} from 'lucide-react';
import { AdminArea } from './components/AdminArea';
import { AuthScreen } from './components/AuthScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FitnessArea } from './components/FitnessArea';
import { GroupChatArea } from './components/GroupChatArea';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { ProfileArea } from './components/ProfileArea';
import { ProgressArea } from './components/ProgressArea';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppTab } from './types';

const AppShell: React.FC = () => {
  const {
    firebaseUser,
    profile,
    isAdmin,
    authReady,
    profileLoading,
    needsEmailVerification,
    needsProfileSetup,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<AppTab>('fitness');
  const [pendingChatAttachment, setPendingChatAttachment] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('unbeatable-theme') === 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('unbeatable-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('unbeatable-theme', 'light');
    }
  }, [darkMode]);

  const handleShareWorkoutToChat = (summary: string) => {
    setPendingChatAttachment(summary);
    setActiveTab('chat');
  };

  if (!authReady || profileLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F6F7F9] dark:bg-[#0B0E14] p-6">
        <div className="font-display text-3xl font-extrabold tracking-tight text-[#090D16] dark:text-white">
          UNBEATABLE FITNESS AU
        </div>
        <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          Syncing athlete profile...
        </p>
      </div>
    );
  }

  if (!firebaseUser || needsEmailVerification || needsProfileSetup || !profile) {
    return <AuthScreen />;
  }

  const navItems: { id: AppTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'fitness', label: 'Fitness', icon: Dumbbell },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'progress', label: 'Progress', icon: Activity },
    ...(isAdmin ? [{ id: 'admin' as AppTab, label: 'Admin', icon: Shield }] : []),
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  const pageTitleMap: Record<AppTab, string> = {
    fitness: 'Fitness',
    chat: 'Group Chat',
    progress: 'Progress',
    admin: 'Admin Area',
    profile: 'Profile',
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0B0E14] text-[#090D16] dark:text-slate-100">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] z-30">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800">
          <span className="font-display text-2xl font-extrabold tracking-tight text-[#090D16] dark:text-white whitespace-nowrap">
            UNBEATABLE AU
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-1.5" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full min-h-[44px] px-3.5 rounded-xl flex items-center gap-3 text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#090D16] dark:bg-white text-white dark:text-[#090D16]'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#090D16] dark:hover:text-white'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${active ? 'text-[#FF4D1C]' : ''}`}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <PWAInstallButton />
          <div className="px-1">
            <p className="text-xs font-semibold text-[#090D16] dark:text-white truncate">
              {profile.displayName}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {profile.hub} · {isAdmin ? 'Admin' : profile.experience}
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Sticky Top App Bar (52px) */}
      <header className="lg:hidden sticky top-0 z-30 h-[52px] px-4 bg-white/90 dark:bg-[#141923]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 pt-safe">
        <span className="font-display text-xl font-extrabold tracking-tight text-[#090D16] dark:text-white whitespace-nowrap shrink-0">
          UNBEATABLE AU
        </span>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
          {pageTitleMap[activeTab]}
        </span>
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className="min-h-[44px] min-w-[44px] flex items-center justify-end text-xs font-semibold text-[#FF4D1C] whitespace-nowrap shrink-0 cursor-pointer"
          aria-label="Open profile"
        >
          {profile.displayName.split(' ')[0]}
        </button>
      </header>

      {/* Main Content Canvas */}
      <main className="lg:pl-64">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7">
          {activeTab === 'fitness' && (
            <FitnessArea onShareWorkoutToChat={handleShareWorkoutToChat} />
          )}
          {activeTab === 'chat' && (
            <GroupChatArea
              pendingAttachment={pendingChatAttachment}
              onClearPendingAttachment={() => setPendingChatAttachment(null)}
            />
          )}
          {activeTab === 'progress' && (
            <ProgressArea onShareWorkoutToChat={handleShareWorkoutToChat} />
          )}
          {activeTab === 'admin' && <AdminArea />}
          {activeTab === 'profile' && (
            <ProfileArea
              darkMode={darkMode}
              onToggleDarkMode={() => setDarkMode((prev) => !prev)}
            />
          )}
        </div>
      </main>

      {/* Mobile Fixed Bottom Thumb-Zone Navigation Bar (60px) */}
      <nav
        aria-label="Mobile bottom navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#141923]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe"
      >
        <div
          className={`grid h-[60px] items-center ${
            navItems.length === 5 ? 'grid-cols-5' : 'grid-cols-4'
          }`}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                  active
                    ? 'text-[#FF4D1C]'
                    : 'text-slate-500 dark:text-slate-400 hover:text-[#090D16] dark:hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-[10px] font-semibold tracking-tight whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppShell />
        <OfflineIndicator />
      </AuthProvider>
    </ErrorBoundary>
  );
}
