import React, { useState } from 'react';
import { Check, LogOut, Moon, Sun } from 'lucide-react';
import {
  EXPERIENCE_TIERS,
  FITNESS_GOALS,
  HUB_LOCATIONS,
  VALIDATION_BOUNDS,
} from '../constants/validation';
import { useAuth } from '../context/AuthContext';
import { ExperienceTier, FitnessGoal, HubLocation } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface ProfileAreaProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const ProfileArea: React.FC<ProfileAreaProps> = ({
  darkMode,
  onToggleDarkMode,
}) => {
  const { firebaseUser, profile, isAdmin, updateAthleteProfile, logout } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [hub, setHub] = useState<HubLocation>(profile?.hub || 'Sydney CBD');
  const [goal, setGoal] = useState<FitnessGoal>(profile?.goal || 'Strength');
  const [experience, setExperience] = useState<ExperienceTier>(
    profile?.experience || 'Intermediate'
  );
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedBanner(false);
    try {
      await updateAthleteProfile({ displayName, hub, goal, experience });
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-10 max-w-2xl">
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {isAdmin ? 'Coach & Admin Account' : 'Club Member Account'} · {firebaseUser?.email}
        </p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#090D16] dark:text-white">
          Athlete Profile & App
        </h1>
      </div>

      {/* Mobile App & Appearance Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[#090D16] dark:text-white">
              Display Appearance
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Switch between high-contrast daylight and evening studio mode.
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 inline-flex items-center gap-2 text-xs font-semibold text-[#090D16] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            {darkMode ? <Sun className="h-4 w-4 text-[#FF4D1C]" /> : <Moon className="h-4 w-4" />}
            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[#090D16] dark:text-white">
              iOS & Android Home Screen App
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Install Unbeatable Fitness AU for standalone full-screen launch and offline caching.
            </p>
          </div>
          <PWAInstallButton />
        </div>
      </div>

      {/* Athlete Settings Form */}
      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] p-5 space-y-4"
      >
        <h2 className="font-display text-xl font-bold text-[#090D16] dark:text-white">
          Training Preferences
        </h2>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Athlete Display Name
          </label>
          <input
            type="text"
            required
            minLength={VALIDATION_BOUNDS.DISPLAY_NAME_MIN}
            maxLength={VALIDATION_BOUNDS.DISPLAY_NAME_MAX}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-3.5 text-sm text-[#090D16] dark:text-white"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Home Hub
            </label>
            <select
              value={hub}
              onChange={(e) => setHub(e.target.value as HubLocation)}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-3 text-sm text-[#090D16] dark:text-white"
            >
              {HUB_LOCATIONS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Primary Goal
            </label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value as FitnessGoal)}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-3 text-sm text-[#090D16] dark:text-white"
            >
              {FITNESS_GOALS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Training Tier
          </label>
          <div className="grid grid-cols-3 gap-2">
            {EXPERIENCE_TIERS.map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setExperience(tier)}
                className={`min-h-[44px] rounded-xl px-2 text-xs font-semibold cursor-pointer ${
                  experience === tier
                    ? 'bg-[#090D16] dark:bg-white text-white dark:text-[#090D16]'
                    : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 pt-2">
          {savedBanner ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400">
              <Check className="h-4 w-4" /> Profile updated
            </span>
          ) : (
            <span />
          )}

          <button
            type="submit"
            disabled={saving}
            className="min-h-[44px] px-6 rounded-xl bg-[#FF4D1C] text-sm font-semibold text-white hover:bg-[#E03A0C] disabled:opacity-60 cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Sign Out */}
      <button
        type="button"
        onClick={logout}
        className="w-full min-h-[48px] rounded-xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-[#141923] text-sm font-semibold text-red-600 dark:text-red-400 inline-flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
      >
        <LogOut className="h-4 w-4" />
        <span>Sign Out</span>
      </button>
    </div>
  );
};
