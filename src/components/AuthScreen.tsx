import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LogOut,
  Mail,
} from 'lucide-react';
import {
  APP_IMAGES,
  EXPERIENCE_TIERS,
  FITNESS_GOALS,
  HUB_LOCATIONS,
  VALIDATION_BOUNDS,
} from '../constants/validation';
import { useAuth } from '../context/AuthContext';
import { ExperienceTier, FitnessGoal, HubLocation } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { SafeImage } from './SafeImage';

export const AuthScreen: React.FC = () => {
  const {
    firebaseUser,
    needsEmailVerification,
    needsProfileSetup,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    createAthleteProfile,
    resendVerificationEmail,
    logout,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [displayName, setDisplayName] = useState(firebaseUser?.displayName || '');
  const [hub, setHub] = useState<HubLocation>('Sydney CBD');
  const [goal, setGoal] = useState<FitnessGoal>('Strength');
  const [experience, setExperience] = useState<ExperienceTier>('Intermediate');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const formatAuthError = (err: unknown): string => {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('auth/operation-not-allowed')) {
      return 'Email/Password sign-in is not yet enabled in Firebase Console (Authentication > Sign-in method). Please use Continue with Google below, or enable Email/Password in your Firebase Console.';
    }
    if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
      return 'Incorrect email or password. Please check your credentials and try again.';
    }
    if (msg.includes('auth/email-already-in-use')) {
      return 'An account with this email already exists. Switch to Log In to continue.';
    }
    if (msg.includes('auth/weak-password')) {
      return 'Password must be at least 6 characters long.';
    }
    if (msg.includes('auth/popup-closed-by-user')) {
      return 'Google sign-in popup was closed before finishing.';
    }
    return msg;
  };

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    setSubmitting(true);
    try {
      if (mode === 'signup' && displayName.trim().length >= VALIDATION_BOUNDS.DISPLAY_NAME_MIN) {
        await signInWithGoogle({ displayName: displayName.trim(), hub, goal, experience });
      } else {
        await signInWithGoogle();
      }
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    if (mode === 'signup') {
      const trimmedName = displayName.trim();
      if (
        trimmedName.length < VALIDATION_BOUNDS.DISPLAY_NAME_MIN ||
        trimmedName.length > VALIDATION_BOUNDS.DISPLAY_NAME_MAX
      ) {
        setErrorMsg(
          `Full name must be between ${VALIDATION_BOUNDS.DISPLAY_NAME_MIN} and ${VALIDATION_BOUNDS.DISPLAY_NAME_MAX} characters.`
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, {
          displayName: displayName.trim(),
          hub,
          goal,
          experience,
        });
      }
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const trimmedName = displayName.trim();
    if (
      trimmedName.length < VALIDATION_BOUNDS.DISPLAY_NAME_MIN ||
      trimmedName.length > VALIDATION_BOUNDS.DISPLAY_NAME_MAX
    ) {
      setErrorMsg(
        `Athlete name must be between ${VALIDATION_BOUNDS.DISPLAY_NAME_MIN} and ${VALIDATION_BOUNDS.DISPLAY_NAME_MAX} characters.`
      );
      return;
    }

    setSubmitting(true);
    try {
      await createAthleteProfile({
        displayName: trimmedName,
        hub,
        goal,
        experience,
      });
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0B0E14] text-[#090D16] dark:text-slate-100 flex flex-col lg:grid lg:grid-cols-12">
      {/* Editorial Hero Column */}
      <div className="relative h-64 sm:h-80 lg:h-auto lg:col-span-6 xl:col-span-7 overflow-hidden bg-[#0B0E14]">
        <SafeImage
          src={APP_IMAGES.authHero}
          alt="Unbeatable Fitness AU performance strength studio"
          fallbackTitle="UNBEATABLE FITNESS AU"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14] via-[#0B0E14]/55 to-black/25" />

        <div className="absolute inset-x-0 top-0 p-5 sm:p-8 flex items-center justify-between">
          <span className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white whitespace-nowrap shrink-0">
            UNBEATABLE FITNESS AU
          </span>
          <div className="lg:hidden">
            <PWAInstallButton compact />
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-10 max-w-2xl">
          <p className="text-xs font-medium tracking-wide text-slate-300">
            Sydney · Melbourne · Brisbane · Gold Coast
          </p>
          <h1
            className="mt-2 font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.02]"
            style={{ textWrap: 'balance' }}
          >
            Train harder together across Australia.
          </h1>
          <p className="mt-3 hidden sm:block text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
            Structured strength and conditioning programming, real-time crew chat, and coach oversight built for iOS, Android, and studio floor screens.
          </p>
        </div>
      </div>

      {/* Interactive Auth Column */}
      <div className="flex-1 lg:col-span-6 xl:col-span-5 flex flex-col justify-between p-5 sm:p-10 lg:p-12 overflow-y-auto">
        <div className="hidden lg:flex items-center justify-end mb-6">
          <PWAInstallButton />
        </div>

        <div className="w-full max-w-md mx-auto my-auto">
          {needsEmailVerification ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] p-6 shadow-sm">
              <div className="flex items-center gap-3 text-[#FF4D1C]">
                <Mail className="h-6 w-6 shrink-0" aria-hidden="true" />
                <h2 className="font-display text-2xl font-bold text-[#090D16] dark:text-white">
                  Verify Your Email
                </h2>
              </div>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                We sent a verification link to{' '}
                <span className="font-semibold text-[#090D16] dark:text-white">
                  {firebaseUser?.email}
                </span>
                . Open the link in your inbox, then tap refresh below to enter the club.
              </p>

              {infoMsg && (
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{infoMsg}</span>
                </div>
              )}

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="w-full min-h-[48px] rounded-xl bg-[#FF4D1C] text-sm font-semibold text-white hover:bg-[#E03A0C] transition-colors cursor-pointer"
                >
                  I Have Verified — Enter Club
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await resendVerificationEmail();
                    setInfoMsg('Verification email resent. Check your inbox and spam folder.');
                  }}
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-[#090D16] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Resend Verification Email
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#090D16] dark:hover:text-white cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Use Another Account</span>
                </button>
              </div>
            </div>
          ) : needsProfileSetup ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] p-6 shadow-sm">
              <h2 className="font-display text-3xl font-bold text-[#090D16] dark:text-white">
                Complete Athlete Profile
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Choose your Australian training hub and primary focus.
              </p>

              <form onSubmit={handleCompleteProfile} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    minLength={VALIDATION_BOUNDS.DISPLAY_NAME_MIN}
                    maxLength={VALIDATION_BOUNDS.DISPLAY_NAME_MAX}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Jordan Taylor"
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-3.5 text-sm text-[#090D16] dark:text-white focus:border-[#FF4D1C] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Training Hub
                    </label>
                    <select
                      value={hub}
                      onChange={(e) => setHub(e.target.value as HubLocation)}
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-3 text-sm text-[#090D16] dark:text-white focus:border-[#FF4D1C] focus:outline-none"
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
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-3 text-sm text-[#090D16] dark:text-white focus:border-[#FF4D1C] focus:outline-none"
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
                    Experience Tier
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {EXPERIENCE_TIERS.map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setExperience(tier)}
                        className={`min-h-[44px] rounded-xl px-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                          experience === tier
                            ? 'bg-[#090D16] dark:bg-white text-white dark:text-[#090D16]'
                            : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                </div>

                {errorMsg && (
                  <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-300">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[48px] rounded-xl bg-[#FF4D1C] text-sm font-semibold text-white hover:bg-[#E03A0C] disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {submitting ? 'Saving Profile...' : 'Enter Unbeatable Fitness AU'}
                </button>
              </form>
            </div>
          ) : (
            <div>
              {/* Segmented Login / Sign Up Switch */}
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-200/80 dark:bg-[#141923] border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                  }}
                  className={`min-h-[44px] rounded-lg text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white dark:bg-[#1E2635] text-[#090D16] dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-[#090D16] dark:hover:text-white'
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg(null);
                  }}
                  className={`min-h-[44px] rounded-lg text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    mode === 'signup'
                      ? 'bg-white dark:bg-[#1E2635] text-[#090D16] dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-[#090D16] dark:hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              <div className="mt-6">
                <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#090D16] dark:text-white">
                  {mode === 'login' ? 'Welcome Back, Athlete' : 'Join Unbeatable Fitness AU'}
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {mode === 'login'
                    ? 'Sign in to access your daily WODs, group channels, and progress logs.'
                    : 'Set your Australian hub and create your club member profile.'}
                </p>
              </div>

              {/* Google Auth Primary CTA */}
              <button
                type="button"
                disabled={submitting}
                onClick={handleGoogleAuth}
                className="mt-6 w-full min-h-[48px] flex items-center justify-center gap-3 rounded-xl bg-[#090D16] dark:bg-white text-sm font-semibold text-white dark:text-[#090D16] hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.86-3c-.98.66-2.23 1.06-3.42 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                </svg>
                <span>
                  {mode === 'login' ? 'Continue with Google' : 'Create Account with Google'}
                </span>
              </button>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                <span className="text-xs font-medium text-slate-500">or with email</span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        minLength={VALIDATION_BOUNDS.DISPLAY_NAME_MIN}
                        maxLength={VALIDATION_BOUNDS.DISPLAY_NAME_MAX}
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Chloe Mitchell"
                        className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#141923] px-3.5 text-sm text-[#090D16] dark:text-white focus:border-[#FF4D1C] focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          AU Gym Hub
                        </label>
                        <select
                          value={hub}
                          onChange={(e) => setHub(e.target.value as HubLocation)}
                          className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#141923] px-3 text-sm text-[#090D16] dark:text-white focus:border-[#FF4D1C] focus:outline-none"
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
                          className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#141923] px-3 text-sm text-[#090D16] dark:text-white focus:border-[#FF4D1C] focus:outline-none"
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
                            className={`min-h-[44px] rounded-xl px-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                              experience === tier
                                ? 'bg-[#090D16] dark:bg-white text-white dark:text-[#090D16]'
                                : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#141923] text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {tier}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="athlete@unbeatable.com.au"
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#141923] px-3.5 text-sm text-[#090D16] dark:text-white focus:border-[#FF4D1C] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#141923] pl-3.5 pr-12 text-sm text-[#090D16] dark:text-white focus:border-[#FF4D1C] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-0 top-0 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:text-[#090D16] dark:hover:text-white cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-3 text-xs text-red-700 dark:text-red-300">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF4D1C] text-sm font-semibold text-white hover:bg-[#E03A0C] disabled:opacity-60 transition-colors cursor-pointer"
                >
                  <span>
                    {submitting
                      ? 'Authenticating...'
                      : mode === 'login'
                      ? 'Log In with Email'
                      : 'Create Account with Email'}
                  </span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-slate-500 dark:text-slate-500">
          Unbeatable Fitness AU · iOS & Android Mobile Experience
        </p>
      </div>
    </div>
  );
};
