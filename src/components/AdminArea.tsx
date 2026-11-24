import React, { useEffect, useState } from 'react';
import {
  Award,
  Calendar,
  Hash,
  Megaphone,
  Plus,
  Shield,
  ShieldOff,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  EXPERIENCE_TIERS,
  HUB_LOCATIONS,
  VALIDATION_BOUNDS,
  WORKOUT_CATEGORIES,
} from '../constants/validation';
import { useAuth } from '../context/AuthContext';
import { OperationType, db, handleFirestoreError } from '../firebase';
import {
  AdminRecord,
  Announcement,
  ChatChannel,
  ClubChallenge,
  ExperienceTier,
  HubLocation,
  StudioClass,
  UserPublicProfile,
  WorkoutCategory,
  WorkoutExercise,
  WorkoutImageKey,
  WorkoutProgram,
} from '../types';

export const AdminArea: React.FC = () => {
  const { firebaseUser, profile, isAdmin, seedStarterClubData } = useAuth();
  const [section, setSection] = useState<
    'programs' | 'classes' | 'challenges' | 'announcements' | 'channels' | 'members'
  >('programs');

  const [workouts, setWorkouts] = useState<WorkoutProgram[]>([]);
  const [classes, setClasses] = useState<StudioClass[]>([]);
  const [challenges, setChallenges] = useState<ClubChallenge[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [members, setMembers] = useState<UserPublicProfile[]>([]);
  const [admins, setAdmins] = useState<Record<string, AdminRecord>>({});

  // Create Workout Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<WorkoutCategory>('Strength');
  const [difficulty, setDifficulty] = useState<ExperienceTier>('Intermediate');
  const [durationMin, setDurationMin] = useState(45);
  const [coachName, setCoachName] = useState(profile?.displayName || 'Coach Reid');
  const [description, setDescription] = useState('');
  const [imageKey, setImageKey] = useState<WorkoutImageKey>('strength');
  const [featured, setFeatured] = useState(false);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([
    { name: 'Back Squat', sets: 4, reps: '6 reps', restSec: 90 },
  ]);
  const [savingWorkout, setSavingWorkout] = useState(false);

  // Studio Class Form State
  const [clsTitle, setClsTitle] = useState('');
  const [clsHub, setClsHub] = useState<HubLocation>('Sydney CBD');
  const [clsCategory, setClsCategory] = useState<WorkoutCategory>('Strength');
  const [clsCoach, setClsCoach] = useState(profile?.displayName || 'Coach Reid');
  const [clsDay, setClsDay] = useState('Mon & Wed');
  const [clsTime, setClsTime] = useState('06:00 AM AEST');
  const [clsCap, setClsCap] = useState(20);

  // Challenge Form State
  const [chTitle, setChTitle] = useState('');
  const [chMetric, setChMetric] = useState<'sessions' | 'volumeKg'>('sessions');
  const [chTarget, setChTarget] = useState(12);
  const [chReward, setChReward] = useState('');

  // Announcement Form State
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annPriority, setAnnPriority] = useState<'Normal' | 'Urgent'>('Normal');
  const [savingAnn, setSavingAnn] = useState(false);

  // Channel Form State
  const [chanName, setChanName] = useState('');
  const [chanDesc, setChanDesc] = useState('');

  useEffect(() => {
    if (!firebaseUser || !isAdmin) return;

    const unsubWorkouts = onSnapshot(
      query(collection(db, 'workouts')),
      (snap) => setWorkouts(snap.docs.map((d) => d.data() as WorkoutProgram)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'workouts')
    );

    const unsubClasses = onSnapshot(
      query(collection(db, 'classes')),
      (snap) => setClasses(snap.docs.map((d) => d.data() as StudioClass)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'classes')
    );

    const unsubChallenges = onSnapshot(
      query(collection(db, 'challenges')),
      (snap) => setChallenges(snap.docs.map((d) => d.data() as ClubChallenge)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'challenges')
    );

    const unsubAnn = onSnapshot(
      query(collection(db, 'announcements')),
      (snap) => setAnnouncements(snap.docs.map((d) => d.data() as Announcement)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'announcements')
    );

    const unsubChannels = onSnapshot(
      query(collection(db, 'channels')),
      (snap) => setChannels(snap.docs.map((d) => d.data() as ChatChannel)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'channels')
    );

    const unsubMembers = onSnapshot(
      query(collection(db, 'users')),
      (snap) => setMembers(snap.docs.map((d) => d.data() as UserPublicProfile)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'users')
    );

    const unsubAdmins = onSnapshot(
      query(collection(db, 'admins')),
      (snap) => {
        const map: Record<string, AdminRecord> = {};
        snap.docs.forEach((d) => {
          map[d.id] = d.data() as AdminRecord;
        });
        setAdmins(map);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'admins')
    );

    return () => {
      unsubWorkouts();
      unsubClasses();
      unsubChallenges();
      unsubAnn();
      unsubChannels();
      unsubMembers();
      unsubAdmins();
    };
  }, [firebaseUser, isAdmin]);

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] p-8 text-center">
        <ShieldOff className="h-8 w-8 text-slate-400 mx-auto" />
        <h2 className="mt-3 font-display text-2xl font-bold text-[#090D16] dark:text-white">
          Coach & Admin Access Required
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          This area is restricted to authorized Unbeatable Fitness AU coaches and administrators.
        </p>
      </div>
    );
  }

  const handleAddExerciseRow = () => {
    if (exercises.length >= VALIDATION_BOUNDS.EXERCISES_MAX) return;
    setExercises((prev) => [...prev, { name: '', sets: 3, reps: '10 reps', restSec: 60 }]);
  };

  const handleCreateWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;

    const cleanExercises = exercises
      .filter((ex) => ex.name.trim().length >= 2)
      .slice(0, VALIDATION_BOUNDS.EXERCISES_MAX)
      .map((ex) => ({
        name: ex.name.trim().slice(0, 60),
        sets: Math.max(1, Math.min(20, Number(ex.sets) || 3)),
        reps: ex.reps.trim().slice(0, 40) || '10 reps',
        restSec: Math.max(10, Math.min(600, Number(ex.restSec) || 60)),
      }));

    if (cleanExercises.length === 0) return;

    const workoutId = `wod-${Date.now()}`;
    setSavingWorkout(true);
    try {
      await setDoc(doc(db, 'workouts', workoutId), {
        id: workoutId,
        title: title.trim().slice(0, VALIDATION_BOUNDS.WORKOUT_TITLE_MAX),
        category,
        difficulty,
        durationMin: Math.max(5, Math.min(240, Number(durationMin) || 45)),
        coachName: coachName.trim().slice(0, VALIDATION_BOUNDS.COACH_NAME_MAX) || 'Club Coach',
        description: description.trim().slice(0, VALIDATION_BOUNDS.WORKOUT_DESC_MAX),
        imageKey,
        featured,
        exercises: cleanExercises,
        createdBy: firebaseUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setTitle('');
      setDescription('');
      setFeatured(false);
      setExercises([{ name: 'Back Squat', sets: 4, reps: '6 reps', restSec: 90 }]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `workouts/${workoutId}`);
    } finally {
      setSavingWorkout(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    const classId = `class-${Date.now()}`;
    try {
      await setDoc(doc(db, 'classes', classId), {
        id: classId,
        title: clsTitle.trim().slice(0, VALIDATION_BOUNDS.CLASS_TITLE_MAX),
        hub: clsHub,
        category: clsCategory,
        coachName: clsCoach.trim().slice(0, VALIDATION_BOUNDS.COACH_NAME_MAX) || 'Club Coach',
        dayLabel: clsDay.trim().slice(0, 30),
        timeLabel: clsTime.trim().slice(0, 30),
        capacity: Math.max(1, Math.min(500, Number(clsCap) || 20)),
        createdBy: firebaseUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setClsTitle('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `classes/${classId}`);
    }
  };

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    const chId = `challenge-${Date.now()}`;
    try {
      await setDoc(doc(db, 'challenges', chId), {
        id: chId,
        title: chTitle.trim().slice(0, VALIDATION_BOUNDS.CHALLENGE_TITLE_MAX),
        metric: chMetric,
        targetValue: Math.max(1, Math.min(1000000, Number(chTarget) || 10)),
        rewardText: chReward.trim().slice(0, VALIDATION_BOUNDS.CHALLENGE_REWARD_MAX),
        createdBy: firebaseUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setChTitle('');
      setChReward('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `challenges/${chId}`);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !profile) return;

    const annId = `ann-${Date.now()}`;
    setSavingAnn(true);
    try {
      await setDoc(doc(db, 'announcements', annId), {
        id: annId,
        title: annTitle.trim().slice(0, VALIDATION_BOUNDS.ANNOUNCEMENT_TITLE_MAX),
        body: annBody.trim().slice(0, VALIDATION_BOUNDS.ANNOUNCEMENT_BODY_MAX),
        authorId: firebaseUser.uid,
        authorName: profile.displayName.slice(0, VALIDATION_BOUNDS.DISPLAY_NAME_MAX),
        priority: annPriority,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setAnnTitle('');
      setAnnBody('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `announcements/${annId}`);
    } finally {
      setSavingAnn(false);
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    const slug = chanName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 50);
    if (slug.length < 2) return;

    try {
      await setDoc(doc(db, 'channels', slug), {
        id: slug,
        name: chanName.trim().slice(0, 50),
        description: chanDesc.trim().slice(0, 160),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setChanName('');
      setChanDesc('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `channels/${slug}`);
    }
  };

  const handleDeleteDoc = async (col: string, id: string) => {
    try {
      await deleteDoc(doc(db, col, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${col}/${id}`);
    }
  };

  const handleToggleMemberStatus = async (member: UserPublicProfile) => {
    const nextStatus = member.status === 'active' ? 'suspended' : 'active';
    try {
      await updateDoc(doc(db, 'users', member.uid), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${member.uid}`);
    }
  };

  const handleToggleAdminRole = async (member: UserPublicProfile) => {
    if (!firebaseUser || member.uid === firebaseUser.uid) return;
    const isCurrentlyAdmin = Boolean(admins[member.uid]);
    try {
      if (isCurrentlyAdmin) {
        await deleteDoc(doc(db, 'admins', member.uid));
      } else {
        await setDoc(doc(db, 'admins', member.uid), {
          uid: member.uid,
          assignedBy: firebaseUser.uid,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `admins/${member.uid}`);
    }
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#FF4D1C]">Club Operations & Coaching</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#090D16] dark:text-white">
            Admin Command Console
          </h1>
        </div>

        <button
          type="button"
          onClick={seedStarterClubData}
          className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#141923] text-xs font-semibold text-[#090D16] dark:text-white inline-flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
        >
          <Sparkles className="h-4 w-4 text-[#FF4D1C]" />
          <span>Sync Starter Pack</span>
        </button>
      </div>

      {/* Live Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Athletes</p>
          <p className="mt-1 font-mono-tabular text-2xl font-bold text-[#090D16] dark:text-white">
            {members.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Programs</p>
          <p className="mt-1 font-mono-tabular text-2xl font-bold text-[#090D16] dark:text-white">
            {workouts.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Classes</p>
          <p className="mt-1 font-mono-tabular text-2xl font-bold text-[#090D16] dark:text-white">
            {classes.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Challenges</p>
          <p className="mt-1 font-mono-tabular text-2xl font-bold text-[#090D16] dark:text-white">
            {challenges.length}
          </p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-[#141923] border border-slate-200 dark:border-slate-800 overflow-x-auto">
        {(
          [
            { id: 'programs', label: 'Programs' },
            { id: 'classes', label: 'Classes' },
            { id: 'challenges', label: 'Challenges' },
            { id: 'announcements', label: 'Notices' },
            { id: 'channels', label: 'Channels' },
            { id: 'members', label: 'Members' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSection(tab.id)}
            className={`min-h-[42px] px-3.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              section === tab.id
                ? 'bg-white dark:bg-[#1E2635] text-[#090D16] dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-[#090D16] dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* PROGRAMS MANAGER */}
      {section === 'programs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleCreateWorkout}
            className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] p-5 space-y-4 h-fit"
          >
            <h2 className="font-display text-xl font-bold text-[#090D16] dark:text-white">
              Publish New Workout
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Program Title
              </label>
              <input
                type="text"
                required
                minLength={VALIDATION_BOUNDS.WORKOUT_TITLE_MIN}
                maxLength={VALIDATION_BOUNDS.WORKOUT_TITLE_MAX}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Saturday Warehouse Grind"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-3 text-sm text-[#090D16] dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as WorkoutCategory)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-3 text-sm text-[#090D16] dark:text-white"
                >
                  {WORKOUT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tier
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as ExperienceTier)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-3 text-sm text-[#090D16] dark:text-white"
                >
                  {EXPERIENCE_TIERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Minutes
                </label>
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={durationMin}
                  onChange={(e) => setDurationMin(Number(e.target.value) || 45)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-3 font-mono-tabular text-sm text-[#090D16] dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Visual Theme
                </label>
                <select
                  value={imageKey}
                  onChange={(e) => setImageKey(e.target.value as WorkoutImageKey)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-2 text-sm text-[#090D16] dark:text-white"
                >
                  <option value="strength">Barbell</option>
                  <option value="conditioning">Turf Sled</option>
                  <option value="mobility">Recovery</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Coach
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={60}
                  value={coachName}
                  onChange={(e) => setCoachName(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-3 text-sm text-[#090D16] dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Briefing
              </label>
              <textarea
                rows={2}
                required
                minLength={VALIDATION_BOUNDS.WORKOUT_DESC_MIN}
                maxLength={VALIDATION_BOUNDS.WORKOUT_DESC_MAX}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe pacing, target RPE, and coaching focus..."
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] p-3 text-sm text-[#090D16] dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Exercises ({exercises.length}/15)
                </span>
                <button
                  type="button"
                  onClick={handleAddExerciseRow}
                  className="text-xs font-semibold text-[#FF4D1C] inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Movement
                </button>
              </div>
              {exercises.map((ex, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <input
                    type="text"
                    placeholder="Movement"
                    value={ex.name}
                    onChange={(e) => {
                      const next = [...exercises];
                      next[i].name = e.target.value;
                      setExercises(next);
                    }}
                    className="col-span-6 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-2.5 text-xs text-[#090D16] dark:text-white"
                  />
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={ex.sets}
                    onChange={(e) => {
                      const next = [...exercises];
                      next[i].sets = Number(e.target.value) || 3;
                      setExercises(next);
                    }}
                    className="col-span-2 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-2 text-xs font-mono-tabular text-[#090D16] dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Reps"
                    value={ex.reps}
                    onChange={(e) => {
                      const next = [...exercises];
                      next[i].reps = e.target.value;
                      setExercises(next);
                    }}
                    className="col-span-4 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-2.5 text-xs text-[#090D16] dark:text-white"
                  />
                </div>
              ))}
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="h-4 w-4 accent-[#FF4D1C]"
              />
              <span>Pin as Featured Daily WOD</span>
            </label>

            <button
              type="submit"
              disabled={savingWorkout}
              className="w-full min-h-[48px] rounded-xl bg-[#FF4D1C] text-sm font-semibold text-white hover:bg-[#E03A0C] disabled:opacity-60 cursor-pointer"
            >
              {savingWorkout ? 'Publishing...' : 'Publish Program'}
            </button>
          </form>

          <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] overflow-hidden h-fit">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-display text-xl font-bold text-[#090D16] dark:text-white">
                Active Club Programs
              </h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {workouts.map((w) => (
                <div key={w.id} className="p-4 sm:px-5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-[#FF4D1C]">{w.category}</span> ·{' '}
                      {w.difficulty} ·{' '}
                      <span className="font-mono-tabular">{w.durationMin}m</span>
                      {w.featured ? ' · Featured' : ''}
                    </p>
                    <h3 className="mt-0.5 text-sm font-bold text-[#090D16] dark:text-white truncate">
                      {w.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteDoc('workouts', w.id)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 shrink-0 cursor-pointer"
                    aria-label={`Delete ${w.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CLASSES MANAGER */}
      {section === 'classes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleCreateClass}
            className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] p-5 space-y-4 h-fit"
          >
            <h2 className="font-display text-xl font-bold text-[#090D16] dark:text-white">
              Schedule Studio Class
            </h2>
            <input
              type="text"
              required
              minLength={VALIDATION_BOUNDS.CLASS_TITLE_MIN}
              maxLength={VALIDATION_BOUNDS.CLASS_TITLE_MAX}
              value={clsTitle}
              onChange={(e) => setClsTitle(e.target.value)}
              placeholder="Class Title (e.g. 6AM Conditioning)"
              className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-3 text-sm text-[#090D16] dark:text-white"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={clsHub}
                onChange={(e) => setClsHub(e.target.value as HubLocation)}
                className="min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-3 text-sm text-[#090D16] dark:text-white"
              >
                {HUB_LOCATIONS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <select
                value={clsCategory}
                onChange={(e) => setClsCategory(e.target.value as WorkoutCategory)}
                className="min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-3 text-sm text-[#090D16] dark:text-white"
              >
                {WORKOUT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={clsDay}
                onChange={(e) => setClsDay(e.target.value)}
                placeholder="Days (e.g. Mon & Wed)"
                className="min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-3 text-sm text-[#090D16] dark:text-white"
              />
              <input
                type="text"
                required
                value={clsTime}
                onChange={(e) => setClsTime(e.target.value)}
                placeholder="Time (e.g. 06:00 AM)"
                className="min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-3 text-sm text-[#090D16] dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={clsCoach}
                onChange={(e) => setClsCoach(e.target.value)}
                placeholder="Coach Name"
                className="min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-3 text-sm text-[#090D16] dark:text-white"
              />
              <input
                type="number"
                min={1}
                max={500}
                value={clsCap}
                onChange={(e) => setClsCap(Number(e.target.value) || 20)}
                placeholder="Capacity"
                className="min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-3 font-mono-tabular text-sm text-[#090D16] dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full min-h-[48px] rounded-xl bg-[#FF4D1C] text-sm font-semibold text-white hover:bg-[#E03A0C] cursor-pointer"
            >
              Publish Class Slot
            </button>
          </form>

          <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] overflow-hidden h-fit">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#FF4D1C]" />
              <h2 className="font-display text-xl font-bold text-[#090D16] dark:text-white">
                Scheduled Timetable
              </h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {classes.map((cls) => (
                <div key={cls.id} className="p-4 sm:px-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-[#FF4D1C]">{cls.hub}</span> ·{' '}
                      {cls.dayLabel} · <span className="font-mono-tabular">{cls.timeLabel}</span>
                    </p>
                    <h3 className="mt-0.5 text-sm font-bold text-[#090D16] dark:text-white">
                      {cls.title} ({cls.capacity} cap)
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteDoc('classes', cls.id)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-red-600 cursor-pointer"
                    aria-label="Delete class"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CHALLENGES MANAGER */}
      {section === 'challenges' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleCreateChallenge}
            className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] p-5 space-y-4 h-fit"
          >
            <h2 className="font-display text-xl font-bold text-[#090D16] dark:text-white">
              Launch Club Challenge
            </h2>
            <input
              type="text"
              required
              minLength={VALIDATION_BOUNDS.CHALLENGE_TITLE_MIN}
              maxLength={VALIDATION_BOUNDS.CHALLENGE_TITLE_MAX}
              value={chTitle}
              onChange={(e) => setChTitle(e.target.value)}
              placeholder="Challenge Title (e.g. 20-Session Summer Sprint)"
              className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-3 text-sm text-[#090D16] dark:text-white"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={chMetric}
                onChange={(e) => setChMetric(e.target.value as 'sessions' | 'volumeKg')}
                className="min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-3 text-sm text-[#090D16] dark:text-white"
              >
                <option value="sessions">Sessions Count</option>
                <option value="volumeKg">Total Volume (kg)</option>
              </select>
              <input
                type="number"
                min={1}
                max={1000000}
                value={chTarget}
                onChange={(e) => setChTarget(Number(e.target.value) || 10)}
                placeholder="Target"
                className="min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-3 font-mono-tabular text-sm text-[#090D16] dark:text-white"
              />
            </div>
            <input
              type="text"
              required
              minLength={3}
              maxLength={VALIDATION_BOUNDS.CHALLENGE_REWARD_MAX}
              value={chReward}
              onChange={(e) => setChReward(e.target.value)}
              placeholder="Reward (e.g. Club Tee + Coach Review)"
              className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-3 text-sm text-[#090D16] dark:text-white"
            />
            <button
              type="submit"
              className="w-full min-h-[48px] rounded-xl bg-[#FF4D1C] text-sm font-semibold text-white hover:bg-[#E03A0C] cursor-pointer"
            >
              Launch Challenge
            </button>
          </form>

          <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] overflow-hidden h-fit">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <Award className="h-4 w-4 text-[#FF4D1C]" />
              <h2 className="font-display text-xl font-bold text-[#090D16] dark:text-white">
                Active Challenges
              </h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {challenges.map((ch) => (
                <div key={ch.id} className="p-4 sm:px-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                      Target: {ch.targetValue.toLocaleString()}{' '}
                      {ch.metric === 'sessions' ? 'sessions' : 'kg'}
                    </p>
                    <h3 className="mt-0.5 text-sm font-bold text-[#090D16] dark:text-white">
                      {ch.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{ch.rewardText}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteDoc('challenges', ch.id)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-red-600 cursor-pointer"
                    aria-label="Delete challenge"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ANNOUNCEMENTS MANAGER */}
      {section === 'announcements' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleCreateAnnouncement}
            className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] p-5 space-y-4 h-fit"
          >
            <h2 className="font-display text-xl font-bold text-[#090D16] dark:text-white">
              Post Club Announcement
            </h2>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Headline
              </label>
              <input
                type="text"
                required
                minLength={VALIDATION_BOUNDS.ANNOUNCEMENT_TITLE_MIN}
                maxLength={VALIDATION_BOUNDS.ANNOUNCEMENT_TITLE_MAX}
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder="e.g. Saturday Run Club Starts 6:30 AM"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-3 text-sm text-[#090D16] dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['Normal', 'Urgent'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAnnPriority(p)}
                    className={`min-h-[42px] rounded-xl text-xs font-semibold cursor-pointer ${
                      annPriority === p
                        ? 'bg-[#090D16] dark:bg-white text-white dark:text-[#090D16]'
                        : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Message
              </label>
              <textarea
                rows={3}
                required
                minLength={VALIDATION_BOUNDS.ANNOUNCEMENT_BODY_MIN}
                maxLength={VALIDATION_BOUNDS.ANNOUNCEMENT_BODY_MAX}
                value={annBody}
                onChange={(e) => setAnnBody(e.target.value)}
                placeholder="Share schedule changes, community events, or coach notes..."
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] p-3 text-sm text-[#090D16] dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={savingAnn}
              className="w-full min-h-[48px] rounded-xl bg-[#FF4D1C] text-sm font-semibold text-white hover:bg-[#E03A0C] disabled:opacity-60 cursor-pointer"
            >
              {savingAnn ? 'Posting...' : 'Broadcast Notice'}
            </button>
          </form>

          <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] overflow-hidden h-fit">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-[#FF4D1C]" />
              <h2 className="font-display text-xl font-bold text-[#090D16] dark:text-white">
                Published Notices
              </h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {announcements.map((a) => (
                <div key={a.id} className="p-4 sm:px-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-[#FF4D1C]">{a.priority}</span> ·{' '}
                      {a.authorName}
                    </p>
                    <h3 className="mt-0.5 text-sm font-bold text-[#090D16] dark:text-white">
                      {a.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{a.body}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteDoc('announcements', a.id)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-red-600 shrink-0 cursor-pointer"
                    aria-label="Delete announcement"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CHAT CHANNELS MANAGER */}
      {section === 'channels' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleCreateChannel}
            className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] p-5 space-y-4 h-fit"
          >
            <h2 className="font-display text-xl font-bold text-[#090D16] dark:text-white">
              Create Chat Channel
            </h2>
            <input
              type="text"
              required
              minLength={2}
              maxLength={50}
              value={chanName}
              onChange={(e) => setChanName(e.target.value)}
              placeholder="Channel Name (e.g. Sydney Run Crew)"
              className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-3 text-sm text-[#090D16] dark:text-white"
            />
            <input
              type="text"
              required
              minLength={4}
              maxLength={160}
              value={chanDesc}
              onChange={(e) => setChanDesc(e.target.value)}
              placeholder="Channel Topic Description"
              className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-3 text-sm text-[#090D16] dark:text-white"
            />
            <button
              type="submit"
              className="w-full min-h-[48px] rounded-xl bg-[#FF4D1C] text-sm font-semibold text-white hover:bg-[#E03A0C] cursor-pointer"
            >
              Create Channel
            </button>
          </form>

          <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] overflow-hidden h-fit">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <Hash className="h-4 w-4 text-[#FF4D1C]" />
              <h2 className="font-display text-xl font-bold text-[#090D16] dark:text-white">
                Active Group Channels
              </h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {channels.map((c) => (
                <div key={c.id} className="p-4 sm:px-5 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#090D16] dark:text-white">
                      #{c.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{c.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteDoc('channels', c.id)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-red-600 cursor-pointer"
                    aria-label="Delete channel"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MEMBERS & RBAC MANAGER */}
      {section === 'members' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <Users className="h-4 w-4 text-[#FF4D1C]" />
            <h2 className="font-display text-xl font-bold text-[#090D16] dark:text-white">
              Registered Athletes ({members.length})
            </h2>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {members.map((member) => {
              const memberIsAdmin = Boolean(admins[member.uid]);
              const isSelf = member.uid === firebaseUser?.uid;
              return (
                <div
                  key={member.uid}
                  className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>{member.hub}</span>
                      <span aria-hidden="true">·</span>
                      <span>{member.goal}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">
                        {member.sessionsCompleted} sessions
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          member.status === 'active'
                            ? 'text-teal-600 dark:text-teal-400 font-semibold'
                            : 'text-red-600 font-semibold'
                        }
                      >
                        {member.status === 'active' ? 'Active' : 'Suspended'}
                      </span>
                    </div>
                    <h3 className="mt-1 text-sm font-bold text-[#090D16] dark:text-white">
                      {member.displayName}{' '}
                      {memberIsAdmin && (
                        <span className="ml-1.5 text-xs font-semibold text-[#FF4D1C]">
                          · Coach/Admin
                        </span>
                      )}
                    </h3>
                  </div>

                  {!isSelf && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleAdminRole(member)}
                        className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#090D16] dark:text-slate-200 inline-flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Shield className="h-3.5 w-3.5 text-[#FF4D1C]" />
                        <span>{memberIsAdmin ? 'Revoke Admin' : 'Make Admin'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleMemberStatus(member)}
                        className={`min-h-[40px] px-3 rounded-xl text-xs font-semibold cursor-pointer ${
                          member.status === 'active'
                            ? 'border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
                            : 'bg-teal-600 text-white hover:bg-teal-700'
                        }`}
                      >
                        {member.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
