import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Award,
  Calculator,
  Edit3,
  Plus,
  Share2,
  Trash2,
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
  where,
} from 'firebase/firestore';
import { VALIDATION_BOUNDS } from '../constants/validation';
import { useAuth } from '../context/AuthContext';
import { OperationType, db, handleFirestoreError } from '../firebase';
import { PersonalRecord, PrUnit, WorkoutCategory, WorkoutLog } from '../types';

interface ProgressAreaProps {
  onShareWorkoutToChat: (summary: string) => void;
}

export const ProgressArea: React.FC<ProgressAreaProps> = ({ onShareWorkoutToChat }) => {
  const { firebaseUser, profile } = useAuth();
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit log notes state
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  // Personal Record Form State
  const [movement, setMovement] = useState('Back Squat');
  const [prValue, setPrValue] = useState(120);
  const [prReps, setPrReps] = useState(5);
  const [prUnit, setPrUnit] = useState<PrUnit>('kg');
  const [savingPr, setSavingPr] = useState(false);

  // 1RM Calculator State
  const [calcWeight, setCalcWeight] = useState(100);
  const [calcReps, setCalcReps] = useState(5);

  useEffect(() => {
    if (!firebaseUser) return;

    const logsQuery = query(
      collection(db, 'workoutLogs'),
      where('userId', '==', firebaseUser.uid)
    );

    const unsubLogs = onSnapshot(
      logsQuery,
      (snap) => {
        const items = snap.docs.map((d) => d.data() as WorkoutLog);
        items.sort((a, b) => {
          const ta = (a.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
          const tb = (b.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
          return tb - ta;
        });
        setLogs(items);
        setLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'workoutLogs')
    );

    const prsQuery = query(
      collection(db, 'personalRecords'),
      where('userId', '==', firebaseUser.uid)
    );

    const unsubPrs = onSnapshot(
      prsQuery,
      (snap) => {
        const items = snap.docs.map((d) => d.data() as PersonalRecord);
        items.sort((a, b) => {
          const ta = (a.updatedAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
          const tb = (b.updatedAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
          return tb - ta;
        });
        setPrs(items);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'personalRecords')
    );

    return () => {
      unsubLogs();
      unsubPrs();
    };
  }, [firebaseUser]);

  const categoryBreakdown = useMemo(() => {
    const counts: Record<WorkoutCategory, number> = {
      Strength: 0,
      Conditioning: 0,
      Hypertrophy: 0,
      Mobility: 0,
    };
    logs.forEach((l) => {
      counts[l.category] = (counts[l.category] || 0) + 1;
    });
    return counts;
  }, [logs]);

  const totalMinutes = useMemo(() => {
    return logs.reduce((acc, l) => acc + (l.durationMin || 0), 0);
  }, [logs]);

  const calcOneRm = useMemo(() => {
    if (calcReps <= 1) return Math.round(calcWeight);
    return Math.round(calcWeight * (1 + calcReps / 30));
  }, [calcWeight, calcReps]);

  const handleSavePr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || profile?.status === 'suspended') return;
    const cleanMovement = movement.trim().slice(0, VALIDATION_BOUNDS.PR_MOVEMENT_MAX);
    if (cleanMovement.length < VALIDATION_BOUNDS.PR_MOVEMENT_MIN) return;

    const prId = `pr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const safeReps = Math.max(1, Math.min(500, Math.round(prReps)));
    const safeVal = Math.max(0, Math.min(2000, Number(prValue) || 0));
    const est1Rm =
      prUnit === 'kg'
        ? safeReps === 1
          ? safeVal
          : Math.round(safeVal * (1 + safeReps / 30))
        : 0;

    setSavingPr(true);
    try {
      await setDoc(doc(db, 'personalRecords', prId), {
        id: prId,
        userId: firebaseUser.uid,
        movement: cleanMovement,
        value: safeVal,
        unit: prUnit,
        reps: safeReps,
        estimatedOneRmKg: est1Rm,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `personalRecords/${prId}`);
    } finally {
      setSavingPr(false);
    }
  };

  const handleDeletePr = async (prId: string) => {
    try {
      await deleteDoc(doc(db, 'personalRecords', prId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `personalRecords/${prId}`);
    }
  };

  const handleSaveNote = async (logId: string) => {
    try {
      await updateDoc(doc(db, 'workoutLogs', logId), {
        notes: editingNoteText.trim().slice(0, VALIDATION_BOUNDS.NOTES_MAX),
      });
      setEditingLogId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `workoutLogs/${logId}`);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    try {
      await deleteDoc(doc(db, 'workoutLogs', logId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `workoutLogs/${logId}`);
    }
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-10">
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Training Telemetry · {profile?.hub}
        </p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#090D16] dark:text-white">
          Progress, PRs & 1RM Lab
        </h1>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Logged Sessions</p>
          <p className="mt-1 font-mono-tabular text-2xl font-bold text-[#090D16] dark:text-white">
            {logs.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Minutes</p>
          <p className="mt-1 font-mono-tabular text-2xl font-bold text-[#090D16] dark:text-white">
            {totalMinutes}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Cumulative Volume</p>
          <p className="mt-1 font-mono-tabular text-2xl font-bold text-[#090D16] dark:text-white">
            {(profile?.totalVolumeKg ?? 0).toLocaleString()} kg
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Saved PRs</p>
          <p className="mt-1 font-mono-tabular text-2xl font-bold text-[#FF4D1C]">
            {prs.length}
          </p>
        </div>
      </div>

      {/* Personal Records + 1RM Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-[#FF4D1C]" aria-hidden="true" />
            <h2 className="font-display text-xl font-bold text-[#090D16] dark:text-white">
              Personal Records (PRs)
            </h2>
          </div>

          <form onSubmit={handleSavePr} className="grid grid-cols-12 gap-2">
            <input
              type="text"
              required
              minLength={VALIDATION_BOUNDS.PR_MOVEMENT_MIN}
              maxLength={VALIDATION_BOUNDS.PR_MOVEMENT_MAX}
              value={movement}
              onChange={(e) => setMovement(e.target.value)}
              placeholder="Movement (e.g. Deadlift)"
              className="col-span-12 sm:col-span-5 min-h-[42px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-3 text-xs text-[#090D16] dark:text-white"
            />
            <input
              type="number"
              min={0}
              max={2000}
              step="0.5"
              value={prValue}
              onChange={(e) => setPrValue(Number(e.target.value) || 0)}
              aria-label="Record value"
              className="col-span-4 sm:col-span-2 min-h-[42px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-2.5 font-mono-tabular text-xs text-[#090D16] dark:text-white"
            />
            <select
              value={prUnit}
              onChange={(e) => setPrUnit(e.target.value as PrUnit)}
              className="col-span-4 sm:col-span-2 min-h-[42px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-2 text-xs text-[#090D16] dark:text-white"
            >
              <option value="kg">kg</option>
              <option value="reps">reps</option>
              <option value="min">min</option>
              <option value="sec">sec</option>
            </select>
            <input
              type="number"
              min={1}
              max={500}
              value={prReps}
              onChange={(e) => setPrReps(Number(e.target.value) || 1)}
              aria-label="Reps"
              placeholder="Reps"
              className="col-span-4 sm:col-span-1 min-h-[42px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-2 font-mono-tabular text-xs text-[#090D16] dark:text-white"
            />
            <button
              type="submit"
              disabled={savingPr}
              className="col-span-12 sm:col-span-2 min-h-[42px] rounded-xl bg-[#FF4D1C] text-xs font-semibold text-white inline-flex items-center justify-center gap-1 hover:bg-[#E03A0C] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Save PR
            </button>
          </form>

          {prs.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Log your top lifts or conditioning times above to track your PBs.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {prs.map((pr) => (
                <div key={pr.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#090D16] dark:text-white">
                      {pr.movement}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                      {pr.value} {pr.unit} · {pr.reps} rep{pr.reps > 1 ? 's' : ''}
                      {pr.estimatedOneRmKg > 0 ? ` · Est. 1RM ${pr.estimatedOneRmKg} kg` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        onShareWorkoutToChat(
                          `New PR! ${pr.movement}: ${pr.value} ${pr.unit} x ${pr.reps}${
                            pr.estimatedOneRmKg > 0 ? ` (Est. 1RM ${pr.estimatedOneRmKg} kg)` : ''
                          }`
                        )
                      }
                      className="min-h-[38px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#090D16] dark:text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Share2 className="h-3 w-3 text-[#FF4D1C]" />
                      <span>Share</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePr(pr.id)}
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 cursor-pointer"
                      aria-label="Delete PR"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interactive 1RM & Training Percentage Lab */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-[#FF4D1C]" aria-hidden="true" />
            <h2 className="font-display text-xl font-bold text-[#090D16] dark:text-white">
              1RM & Load Calculator
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Weight (kg)
              </label>
              <input
                type="number"
                min={5}
                max={600}
                value={calcWeight}
                onChange={(e) => setCalcWeight(Math.max(0, Number(e.target.value) || 0))}
                className="w-full min-h-[42px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-3 font-mono-tabular text-sm font-bold text-[#090D16] dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Reps Completed
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={calcReps}
                onChange={(e) => setCalcReps(Math.max(1, Number(e.target.value) || 1))}
                className="w-full min-h-[42px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-3 font-mono-tabular text-sm font-bold text-[#090D16] dark:text-white"
              />
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Estimated 1-Rep Max
            </span>
            <span className="font-mono-tabular text-2xl font-bold text-[#FF4D1C]">
              {calcOneRm} kg
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            {[90, 85, 80, 70].map((pct) => (
              <div
                key={pct}
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-2.5"
              >
                <p className="font-mono-tabular text-[11px] text-slate-500">{pct}%</p>
                <p className="mt-0.5 font-mono-tabular text-sm font-bold text-[#090D16] dark:text-white">
                  {Math.round((calcOneRm * pct) / 100)} kg
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Distribution */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] p-5">
        <h2 className="font-display text-xl font-bold text-[#090D16] dark:text-white">
          Training Modality Split
        </h2>
        <div className="mt-4 space-y-3">
          {(Object.keys(categoryBreakdown) as WorkoutCategory[]).map((cat) => {
            const count = categoryBreakdown[cat];
            const pct = logs.length > 0 ? Math.round((count / logs.length) * 100) : 0;
            return (
              <div key={cat}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-[#090D16] dark:text-white">{cat}</span>
                  <span className="font-mono-tabular text-slate-500 dark:text-slate-400">
                    {count} sessions · {pct}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#FF4D1C] transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* History List */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-display text-xl font-bold text-[#090D16] dark:text-white">
            Completed Workouts
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading workout logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <Activity className="h-8 w-8 text-slate-400 mx-auto" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold text-[#090D16] dark:text-white">
              No completed sessions yet
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Open any workout in the Fitness tab and tap Complete & Log Session.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-[#FF4D1C]">{log.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">{log.durationMin} min</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">{log.completedSets} sets</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">
                      {log.totalVolumeKg.toLocaleString()} kg
                    </span>
                  </div>
                  <h3 className="mt-1 text-sm font-bold text-[#090D16] dark:text-white">
                    {log.workoutTitle}
                  </h3>

                  {editingLogId === log.id ? (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={VALIDATION_BOUNDS.NOTES_MAX}
                        value={editingNoteText}
                        onChange={(e) => setEditingNoteText(e.target.value)}
                        className="flex-1 min-h-[38px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-2.5 text-xs text-[#090D16] dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveNote(log.id)}
                        className="min-h-[38px] px-3 rounded-lg bg-[#FF4D1C] text-xs font-semibold text-white cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingLogId(null)}
                        className="min-h-[38px] px-2.5 rounded-lg text-xs text-slate-500 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    log.notes && (
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        {log.notes}
                      </p>
                    )
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLogId(log.id);
                      setEditingNoteText(log.notes || '');
                    }}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-[#090D16] dark:hover:text-white cursor-pointer"
                    aria-label="Edit notes"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onShareWorkoutToChat(
                        `Logged ${log.workoutTitle} · ${log.completedSets} sets · ${log.totalVolumeKg.toLocaleString()} kg`
                      )
                    }
                    className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1.5 text-xs font-semibold text-[#090D16] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Share2 className="h-3.5 w-3.5 text-[#FF4D1C]" />
                    <span>Share</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteLog(log.id)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                    aria-label="Delete workout log"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
