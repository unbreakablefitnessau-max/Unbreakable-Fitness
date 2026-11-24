import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Calendar,
  Check,
  Clock,
  Droplets,
  Dumbbell,
  MapPin,
  Megaphone,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Timer,
  Trophy,
  X,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { APP_IMAGES, VALIDATION_BOUNDS, WORKOUT_CATEGORIES } from '../constants/validation';
import { useAuth } from '../context/AuthContext';
import { OperationType, db, handleFirestoreError } from '../firebase';
import {
  Announcement,
  ClassBooking,
  ClubChallenge,
  DailyCheckin,
  StudioClass,
  UserPublicProfile,
  WorkoutCategory,
  WorkoutProgram,
} from '../types';
import { SafeImage } from './SafeImage';

interface FitnessAreaProps {
  onShareWorkoutToChat: (summary: string) => void;
}

const WEEK_DAYS = [
  { label: 'Mon', day: 18 },
  { label: 'Tue', day: 19 },
  { label: 'Wed', day: 20 },
  { label: 'Thu', day: 21 },
  { label: 'Fri', day: 22 },
  { label: 'Sat', day: 23 },
  { label: 'Sun', day: 24 },
];

export const FitnessArea: React.FC<FitnessAreaProps> = ({ onShareWorkoutToChat }) => {
  const { profile, firebaseUser, isAdmin, seedStarterClubData } = useAuth();
  const [workouts, setWorkouts] = useState<WorkoutProgram[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [classes, setClasses] = useState<StudioClass[]>([]);
  const [classBookings, setClassBookings] = useState<Record<string, ClassBooking[]>>({});
  const [challenges, setChallenges] = useState<ClubChallenge[]>([]);
  const [leaderboardUsers, setLeaderboardUsers] = useState<UserPublicProfile[]>([]);
  const [todayCheckin, setTodayCheckin] = useState<DailyCheckin | null>(null);

  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<'All' | WorkoutCategory>('All');
  const [classHubFilter, setClassHubFilter] = useState<'all' | 'mine'>('all');
  const [selectedDay, setSelectedDay] = useState<number>(24);

  // Active Workout Modal/Sheet State
  const [activeWorkout, setActiveWorkout] = useState<WorkoutProgram | null>(null);
  const [checkedSets, setCheckedSets] = useState<Record<string, boolean>>({});
  const [exerciseLoads, setExerciseLoads] = useState<Record<number, number>>({});
  const [sessionNotes, setSessionNotes] = useState('');
  const [savingLog, setSavingLog] = useState(false);
  const [savedSummary, setSavedSummary] = useState<string | null>(null);

  // Rest Timer State
  const [timerSeconds, setTimerSeconds] = useState<number>(60);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  const todayKey = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;

    const unsubWorkouts = onSnapshot(
      query(collection(db, 'workouts'), orderBy('createdAt', 'desc')),
      (snap) => {
        setWorkouts(snap.docs.map((d) => d.data() as WorkoutProgram));
        setLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'workouts')
    );

    const unsubAnnouncements = onSnapshot(
      query(collection(db, 'announcements'), orderBy('createdAt', 'desc')),
      (snap) => setAnnouncements(snap.docs.map((d) => d.data() as Announcement)),
      (error) => handleFirestoreError(error, OperationType.LIST, 'announcements')
    );

    const unsubClasses = onSnapshot(
      query(collection(db, 'classes'), where('capacity', '>=', 1)),
      (snap) => setClasses(snap.docs.map((d) => d.data() as StudioClass)),
      (error) => handleFirestoreError(error, OperationType.LIST, 'classes')
    );

    const unsubChallenges = onSnapshot(
      query(collection(db, 'challenges'), where('targetValue', '>=', 1)),
      (snap) => setChallenges(snap.docs.map((d) => d.data() as ClubChallenge)),
      (error) => handleFirestoreError(error, OperationType.LIST, 'challenges')
    );

    const unsubUsers = onSnapshot(
      query(collection(db, 'users'), where('status', '==', 'active')),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as UserPublicProfile);
        list.sort((a, b) => b.sessionsCompleted - a.sessionsCompleted || b.totalVolumeKg - a.totalVolumeKg);
        setLeaderboardUsers(list.slice(0, 5));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'users')
    );

    const checkinId = `${firebaseUser.uid}_${todayKey}`;
    const unsubCheckin = onSnapshot(
      doc(db, 'dailyCheckins', checkinId),
      (snap) => {
        if (snap.exists()) {
          setTodayCheckin(snap.data() as DailyCheckin);
        } else {
          setTodayCheckin(null);
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, `dailyCheckins/${checkinId}`)
    );

    return () => {
      unsubWorkouts();
      unsubAnnouncements();
      unsubClasses();
      unsubChallenges();
      unsubUsers();
      unsubCheckin();
    };
  }, [firebaseUser, todayKey]);

  // Listen to bookings for visible classes
  useEffect(() => {
    if (!firebaseUser || classes.length === 0) return;

    const unsubs = classes.map((cls) =>
      onSnapshot(
        query(collection(db, 'classes', cls.id, 'bookings'), where('classId', '==', cls.id)),
        (snap) => {
          const bookings = snap.docs.map((d) => d.data() as ClassBooking);
          setClassBookings((prev) => ({ ...prev, [cls.id]: bookings }));
        },
        (error) => handleFirestoreError(error, OperationType.LIST, `classes/${cls.id}/bookings`)
      )
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [firebaseUser, classes]);

  useEffect(() => {
    if (!timerRunning) return;
    if (timerSeconds <= 0) {
      setTimerRunning(false);
      return;
    }
    const id = window.setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning, timerSeconds]);

  const featuredWorkout = useMemo(() => {
    return workouts.find((w) => w.featured) || workouts[0] || null;
  }, [workouts]);

  const filteredWorkouts = useMemo(() => {
    if (selectedCategory === 'All') return workouts;
    return workouts.filter((w) => w.category === selectedCategory);
  }, [workouts, selectedCategory]);

  const visibleClasses = useMemo(() => {
    if (classHubFilter === 'mine' && profile?.hub) {
      return classes.filter((c) => c.hub === profile.hub || c.hub === 'Online AU');
    }
    return classes;
  }, [classes, classHubFilter, profile?.hub]);

  const updateCheckin = async (next: {
    waterLitres: number;
    sleepHours: number;
    readiness: number;
  }) => {
    if (!firebaseUser) return;
    const checkinId = `${firebaseUser.uid}_${todayKey}`;
    const ref = doc(db, 'dailyCheckins', checkinId);
    const payload = {
      waterLitres: Math.max(0, Math.min(12, Number(next.waterLitres.toFixed(2)))),
      sleepHours: Math.max(0, Math.min(24, Number(next.sleepHours.toFixed(1)))),
      readiness: Math.max(1, Math.min(5, Math.round(next.readiness))),
    };

    try {
      if (todayCheckin) {
        await setDoc(
          ref,
          {
            ...todayCheckin,
            ...payload,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        await setDoc(ref, {
          id: checkinId,
          userId: firebaseUser.uid,
          dateKey: todayKey,
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `dailyCheckins/${checkinId}`);
    }
  };

  const handleToggleClassBooking = async (cls: StudioClass) => {
    if (!firebaseUser || !profile || profile.status === 'suspended') return;
    const bookings = classBookings[cls.id] || [];
    const alreadyBooked = bookings.some((b) => b.userId === firebaseUser.uid);
    const bookingRef = doc(db, 'classes', cls.id, 'bookings', firebaseUser.uid);

    try {
      if (alreadyBooked) {
        await deleteDoc(bookingRef);
      } else {
        if (bookings.length >= cls.capacity) return;
        await setDoc(bookingRef, {
          userId: firebaseUser.uid,
          classId: cls.id,
          athleteName: profile.displayName.slice(0, VALIDATION_BOUNDS.DISPLAY_NAME_MAX),
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `classes/${cls.id}/bookings/${firebaseUser.uid}`);
    }
  };

  const openWorkoutSession = (workout: WorkoutProgram) => {
    setActiveWorkout(workout);
    setCheckedSets({});
    const initialLoads: Record<number, number> = {};
    workout.exercises.forEach((_, idx) => {
      initialLoads[idx] = workout.category === 'Mobility' ? 0 : 40;
    });
    setExerciseLoads(initialLoads);
    setSessionNotes('');
    setSavedSummary(null);
    setTimerSeconds(workout.exercises[0]?.restSec || 60);
    setTimerRunning(false);
  };

  const toggleSet = (exIdx: number, setIdx: number) => {
    const key = `${exIdx}-${setIdx}`;
    setCheckedSets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const completedSetsCount = useMemo(() => {
    return Object.values(checkedSets).filter(Boolean).length;
  }, [checkedSets]);

  const estimatedVolumeKg = useMemo(() => {
    if (!activeWorkout) return 0;
    let total = 0;
    activeWorkout.exercises.forEach((ex, exIdx) => {
      const load = exerciseLoads[exIdx] || 0;
      const repsMatch = ex.reps.match(/\d+/);
      const repNum = repsMatch ? parseInt(repsMatch[0], 10) : 8;
      for (let s = 0; s < ex.sets; s++) {
        if (checkedSets[`${exIdx}-${s}`]) {
          total += load * repNum;
        }
      }
    });
    return Math.round(total);
  }, [activeWorkout, exerciseLoads, checkedSets]);

  const handleCompleteWorkout = async () => {
    if (!activeWorkout || !firebaseUser || !profile) return;
    if (profile.status === 'suspended') return;

    const finalSets = Math.max(1, completedSetsCount);
    const logId = `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const cleanNotes = sessionNotes.trim().slice(0, VALIDATION_BOUNDS.NOTES_MAX);

    setSavingLog(true);
    try {
      const batch = writeBatch(db);
      const logRef = doc(db, 'workoutLogs', logId);
      const userRef = doc(db, 'users', firebaseUser.uid);

      batch.set(logRef, {
        id: logId,
        userId: firebaseUser.uid,
        workoutId: activeWorkout.id,
        workoutTitle: activeWorkout.title.slice(0, VALIDATION_BOUNDS.WORKOUT_TITLE_MAX),
        category: activeWorkout.category,
        durationMin: activeWorkout.durationMin,
        totalVolumeKg: estimatedVolumeKg,
        completedSets: finalSets,
        notes: cleanNotes,
        createdAt: serverTimestamp(),
      });

      batch.update(userRef, {
        sessionsCompleted: profile.sessionsCompleted + 1,
        totalVolumeKg: profile.totalVolumeKg + estimatedVolumeKg,
        updatedAt: serverTimestamp(),
      });

      await batch.commit();

      const summaryText = `Completed ${activeWorkout.title} · ${finalSets} sets · ${estimatedVolumeKg.toLocaleString()} kg volume`;
      setSavedSummary(summaryText);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `workoutLogs/${logId}`);
    } finally {
      setSavingLog(false);
    }
  };

  const weeklyTarget = 4;
  const currentSessions = profile?.sessionsCompleted ?? 0;
  const ringProgress = Math.min(
    1,
    (currentSessions % weeklyTarget || (currentSessions > 0 ? weeklyTarget : 0)) / weeklyTarget
  );
  const circumference = 2 * Math.PI * 20;
  const dashOffset = circumference * (1 - ringProgress);

  const latestAnnouncement = announcements[0] || null;
  const currentWater = todayCheckin?.waterLitres ?? 1.5;
  const currentSleep = todayCheckin?.sleepHours ?? 7.5;
  const currentReadiness = todayCheckin?.readiness ?? 4;

  return (
    <div className="space-y-6 pb-24 lg:pb-10">
      {/* Top Club Greeting & Date Scroller */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {profile?.hub || 'Australia'} · {profile?.goal || 'Strength'} Focus
          </p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#090D16] dark:text-white">
            Ready to Train, {profile?.displayName?.split(' ')[0] || 'Athlete'}
          </h1>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {WEEK_DAYS.map((d) => {
            const active = selectedDay === d.day;
            return (
              <button
                key={d.day}
                type="button"
                onClick={() => setSelectedDay(d.day)}
                className={`min-h-[44px] min-w-[46px] flex flex-col items-center justify-center rounded-xl px-2.5 py-1.5 transition-colors shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#090D16] dark:bg-white text-white dark:text-[#090D16]'
                    : 'bg-white dark:bg-[#141923] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <span className="text-[11px] font-medium">{d.label}</span>
                <span className="font-mono-tabular text-xs font-bold">{d.day}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Club Announcement Notice */}
      {latestAnnouncement && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] p-4 flex items-start gap-3.5">
          <div className="h-9 w-9 rounded-xl bg-[#FF4D1C]/10 flex items-center justify-center shrink-0">
            <Megaphone className="h-4 w-4 text-[#FF4D1C]" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-[#FF4D1C]">
                {latestAnnouncement.priority === 'Urgent' ? 'Urgent Notice' : 'Coach Notice'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{latestAnnouncement.authorName}</span>
            </div>
            <h2 className="mt-0.5 text-sm font-semibold text-[#090D16] dark:text-white">
              {latestAnnouncement.title}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {latestAnnouncement.body}
            </p>
          </div>
        </div>
      )}

      {/* Stat Summary + Daily Readiness / Hydration Tracker */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Sessions Logged
            </p>
            <p className="mt-1 font-mono-tabular text-2xl sm:text-3xl font-bold text-[#090D16] dark:text-white">
              {currentSessions}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Target 4 / week</p>
          </div>
          <svg className="h-12 w-12 -rotate-90 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-slate-200 dark:text-slate-800"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="#FF4D1C"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Volume Lifted
          </p>
          <p className="mt-1 font-mono-tabular text-2xl sm:text-3xl font-bold text-[#090D16] dark:text-white">
            {(profile?.totalVolumeKg ?? 0).toLocaleString()}
            <span className="ml-1 text-sm font-medium text-slate-500">kg</span>
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {profile?.experience || 'Intermediate'} Tier
          </p>
        </div>

        {/* Daily Hydration Widget */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Hydration</p>
            <Droplets className="h-4 w-4 text-sky-500" aria-hidden="true" />
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="font-mono-tabular text-xl sm:text-2xl font-bold text-[#090D16] dark:text-white">
              {currentWater.toFixed(2)}L
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  updateCheckin({
                    waterLitres: currentWater - 0.25,
                    sleepHours: currentSleep,
                    readiness: currentReadiness,
                  })
                }
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                aria-label="Decrease water"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  updateCheckin({
                    waterLitres: currentWater + 0.25,
                    sleepHours: currentSleep,
                    readiness: currentReadiness,
                  })
                }
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-[#090D16] dark:bg-white text-white dark:text-[#090D16] cursor-pointer"
                aria-label="Add 250ml water"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Daily Readiness & Sleep Widget */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-500 dark:text-slate-400">Readiness</span>
            <span className="font-mono-tabular text-slate-500 dark:text-slate-400">
              {currentSleep}h sleep
            </span>
          </div>
          <div className="mt-2 grid grid-cols-5 gap-1">
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                type="button"
                onClick={() =>
                  updateCheckin({
                    waterLitres: currentWater,
                    sleepHours: currentSleep,
                    readiness: score,
                  })
                }
                className={`min-h-[36px] rounded-lg font-mono-tabular text-xs font-bold transition-colors cursor-pointer ${
                  currentReadiness === score
                    ? 'bg-[#FF4D1C] text-white'
                    : 'bg-slate-100 dark:bg-[#0B0E14] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {score}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Featured Daily WOD Hero */}
      {featuredWorkout && (
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 bg-[#0B0E14]">
          <div className="aspect-[16/10] sm:aspect-[21/9] w-full">
            <SafeImage
              src={APP_IMAGES[featuredWorkout.imageKey]}
              alt={featuredWorkout.title}
              fallbackTitle={featuredWorkout.title}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14] via-[#0B0E14]/60 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="max-w-xl">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-200">
                <span className="text-[#FF4D1C] font-semibold">Featured Session</span>
                <span aria-hidden="true">·</span>
                <span>{featuredWorkout.category}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">{featuredWorkout.durationMin} min</span>
                <span aria-hidden="true">·</span>
                <span>{featuredWorkout.coachName}</span>
              </div>
              <h2
                className="mt-1.5 font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-white"
                style={{ textWrap: 'balance' }}
              >
                {featuredWorkout.title}
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-300 line-clamp-2">
                {featuredWorkout.description}
              </p>
            </div>

            <button
              type="button"
              onClick={() => openWorkoutSession(featuredWorkout)}
              className="min-h-[48px] px-6 rounded-xl bg-[#FF4D1C] text-sm font-semibold text-white hover:bg-[#E03A0C] active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              Start Session
            </button>
          </div>
        </div>
      )}

      {/* Program Library Filter Bar & Grid */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-bold text-[#090D16] dark:text-white">
            Training Programs
          </h2>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-[#141923] border border-slate-200 dark:border-slate-800 overflow-x-auto">
            {(['All', ...WORKOUT_CATEGORIES] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-[38px] px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-white dark:bg-[#1E2635] text-[#090D16] dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-[#090D16] dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] animate-pulse"
              />
            ))}
          </div>
        ) : filteredWorkouts.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] p-8 text-center">
            <Dumbbell className="h-8 w-8 text-slate-400 mx-auto" aria-hidden="true" />
            <h3 className="mt-3 font-display text-xl font-bold text-[#090D16] dark:text-white">
              No Programs Published Yet
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {isAdmin
                ? 'Load the starter Australian club workouts or build custom sessions in the Admin tab.'
                : 'Your Unbeatable Fitness AU coach will publish upcoming sessions shortly.'}
            </p>
            {isAdmin && (
              <button
                type="button"
                onClick={seedStarterClubData}
                className="mt-4 min-h-[44px] px-5 rounded-xl bg-[#FF4D1C] text-sm font-semibold text-white hover:bg-[#E03A0C] cursor-pointer"
              >
                Seed Starter Club Programs
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWorkouts.map((workout) => (
              <article
                key={workout.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923]"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-slate-900">
                  <SafeImage
                    src={APP_IMAGES[workout.imageKey]}
                    alt={workout.title}
                    fallbackTitle={workout.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-[#FF4D1C]">{workout.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{workout.difficulty}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">{workout.durationMin}m</span>
                    </div>
                    <h3 className="mt-1.5 font-display text-xl font-bold text-[#090D16] dark:text-white">
                      {workout.title}
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {workout.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {workout.exercises.length} exercises · {workout.coachName}
                    </span>
                    <button
                      type="button"
                      onClick={() => openWorkoutSession(workout)}
                      className="min-h-[44px] px-4 rounded-xl bg-[#090D16] dark:bg-white text-xs font-semibold text-white dark:text-[#090D16] hover:opacity-90 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Open WOD
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Studio Timetable & Class Booking */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#FF4D1C]" aria-hidden="true" />
            <h2 className="font-display text-xl font-bold text-[#090D16] dark:text-white">
              AU Studio & Live Classes
            </h2>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#0B0E14]">
            <button
              type="button"
              onClick={() => setClassHubFilter('all')}
              className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold cursor-pointer ${
                classHubFilter === 'all'
                  ? 'bg-white dark:bg-[#1E2635] text-[#090D16] dark:text-white shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              All Hubs
            </button>
            <button
              type="button"
              onClick={() => setClassHubFilter('mine')}
              className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold cursor-pointer ${
                classHubFilter === 'mine'
                  ? 'bg-white dark:bg-[#1E2635] text-[#090D16] dark:text-white shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              My Hub + Online
            </button>
          </div>
        </div>

        {visibleClasses.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No classes scheduled for this filter yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {visibleClasses.map((cls) => {
              const bookings = classBookings[cls.id] || [];
              const isBooked = bookings.some((b) => b.userId === firebaseUser?.uid);
              const isFull = bookings.length >= cls.capacity;

              return (
                <div
                  key={cls.id}
                  className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-[#FF4D1C]">{cls.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {cls.hub}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{cls.dayLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">{cls.timeLabel}</span>
                    </div>
                    <h3 className="mt-1 text-sm font-bold text-[#090D16] dark:text-white">
                      {cls.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {cls.coachName} ·{' '}
                      <span className="font-mono-tabular">
                        {bookings.length}/{cls.capacity} spots booked
                      </span>
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={!isBooked && isFull}
                    onClick={() => handleToggleClassBooking(cls)}
                    className={`min-h-[44px] px-4 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isBooked
                        ? 'bg-teal-600 text-white hover:bg-teal-700'
                        : isFull
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                        : 'bg-[#090D16] dark:bg-white text-white dark:text-[#090D16] hover:opacity-90'
                    }`}
                  >
                    {isBooked ? 'Spot Booked · Cancel' : isFull ? 'Class Full' : 'Book Spot'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Club Challenges & AU Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-[#FF4D1C]" aria-hidden="true" />
            <h2 className="font-display text-xl font-bold text-[#090D16] dark:text-white">
              Active Club Challenges
            </h2>
          </div>

          {challenges.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No active challenges right now.
            </p>
          ) : (
            <div className="space-y-4">
              {challenges.map((ch) => {
                const currentVal =
                  ch.metric === 'sessions'
                    ? profile?.sessionsCompleted ?? 0
                    : profile?.totalVolumeKg ?? 0;
                const pct = Math.min(100, Math.round((currentVal / ch.targetValue) * 100));
                return (
                  <div
                    key={ch.id}
                    className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0E14] p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-[#090D16] dark:text-white">
                        {ch.title}
                      </h3>
                      <span className="font-mono-tabular text-xs font-bold text-[#FF4D1C]">
                        {pct}%
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Reward: {ch.rewardText}
                    </p>
                    <div className="mt-2.5 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#FF4D1C] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1.5 font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
                      {currentVal.toLocaleString()} / {ch.targetValue.toLocaleString()}{' '}
                      {ch.metric === 'sessions' ? 'sessions' : 'kg'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[#FF4D1C]" aria-hidden="true" />
            <h2 className="font-display text-xl font-bold text-[#090D16] dark:text-white">
              AU Club Leaderboard
            </h2>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {leaderboardUsers.map((athlete, idx) => (
              <div key={athlete.uid} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono-tabular text-sm font-bold text-[#FF4D1C] w-6 shrink-0">
                    0{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#090D16] dark:text-white truncate">
                      {athlete.displayName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {athlete.hub} · {athlete.experience}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono-tabular text-sm font-bold text-[#090D16] dark:text-white">
                    {athlete.sessionsCompleted} sessions
                  </p>
                  <p className="font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
                    {athlete.totalVolumeKg.toLocaleString()} kg
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Workout Logger Sheet / Modal */}
      {activeWorkout && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="active-workout-title"
        >
          <div className="w-full sm:max-w-2xl max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#141923] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
              <div>
                <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700 sm:hidden" />
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {activeWorkout.category} · {activeWorkout.difficulty} ·{' '}
                  <span className="font-mono-tabular">{activeWorkout.durationMin} min</span>
                </p>
                <h2
                  id="active-workout-title"
                  className="font-display text-2xl sm:text-3xl font-extrabold text-[#090D16] dark:text-white"
                >
                  {activeWorkout.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveWorkout(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Close workout session"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Rest Timer Bar */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0E14] p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Timer className="h-5 w-5 text-[#FF4D1C]" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Rest Timer
                    </p>
                    <p className="font-mono-tabular text-2xl font-bold text-[#090D16] dark:text-white">
                      {Math.floor(timerSeconds / 60)}:
                      {String(timerSeconds % 60).padStart(2, '0')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {[30, 60, 90, 120].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => {
                        setTimerSeconds(sec);
                        setTimerRunning(false);
                      }}
                      className="min-h-[38px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#141923] font-mono-tabular text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      {sec}s
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTimerRunning((prev) => !prev)}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-[#FF4D1C] text-white hover:bg-[#E03A0C] cursor-pointer"
                    aria-label={timerRunning ? 'Pause timer' : 'Start timer'}
                  >
                    {timerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTimerRunning(false);
                      setTimerSeconds(60);
                    }}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                    aria-label="Reset timer"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Exercise Checklist */}
              <div className="space-y-4">
                {activeWorkout.exercises.map((ex, exIdx) => (
                  <div
                    key={`${ex.name}-${exIdx}`}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-[#090D16] dark:text-white">
                          <span className="font-mono-tabular text-[#FF4D1C] mr-2">
                            0{exIdx + 1}.
                          </span>
                          {ex.name}
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {ex.sets} sets · {ex.reps} ·{' '}
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {ex.restSec}s rest
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-slate-500 dark:text-slate-400">
                          Load (kg)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={500}
                          value={exerciseLoads[exIdx] ?? 0}
                          onChange={(e) =>
                            setExerciseLoads((prev) => ({
                              ...prev,
                              [exIdx]: Math.max(0, Number(e.target.value) || 0),
                            }))
                          }
                          className="w-20 min-h-[38px] rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E14] px-2.5 text-right font-mono-tabular text-xs font-semibold text-[#090D16] dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {Array.from({ length: ex.sets }).map((_, setIdx) => {
                        const checked = !!checkedSets[`${exIdx}-${setIdx}`];
                        return (
                          <button
                            key={setIdx}
                            type="button"
                            onClick={() => toggleSet(exIdx, setIdx)}
                            className={`min-h-[44px] px-3.5 rounded-xl inline-flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                              checked
                                ? 'bg-teal-600 text-white'
                                : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Set {setIdx + 1}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Session Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  maxLength={VALIDATION_BOUNDS.NOTES_MAX}
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="How did the barbell speed or conditioning pace feel today?"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] p-3 text-sm text-[#090D16] dark:text-white focus:border-[#FF4D1C] focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0E14]">
              {savedSummary ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-teal-700 dark:text-teal-400">
                    Logged to your training history ({estimatedVolumeKg.toLocaleString()} kg)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onShareWorkoutToChat(savedSummary);
                        setActiveWorkout(null);
                      }}
                      className="min-h-[44px] px-4 rounded-xl bg-[#FF4D1C] text-xs font-semibold text-white hover:bg-[#E03A0C] cursor-pointer"
                    >
                      Share to Group Chat
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveWorkout(null)}
                      className="min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-[#090D16] dark:text-white cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Session Summary</p>
                    <p className="font-mono-tabular text-sm font-bold text-[#090D16] dark:text-white">
                      {completedSetsCount} sets · {estimatedVolumeKg.toLocaleString()} kg
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={savingLog || profile?.status === 'suspended'}
                    onClick={handleCompleteWorkout}
                    className="min-h-[48px] px-6 rounded-xl bg-[#FF4D1C] text-sm font-semibold text-white hover:bg-[#E03A0C] disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    {savingLog ? 'Logging Session...' : 'Complete & Log Session'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
