export type HubLocation =
  | 'Sydney CBD'
  | 'Melbourne Southbank'
  | 'Brisbane Valley'
  | 'Gold Coast'
  | 'Online AU';

export type FitnessGoal =
  | 'Strength'
  | 'Hypertrophy'
  | 'Conditioning'
  | 'Fat Loss'
  | 'Mobility';

export type ExperienceTier = 'Foundation' | 'Intermediate' | 'Rx Athlete';

export type WorkoutCategory =
  | 'Strength'
  | 'Conditioning'
  | 'Hypertrophy'
  | 'Mobility';

export type WorkoutImageKey = 'strength' | 'conditioning' | 'mobility';

export type MemberStatus = 'active' | 'suspended';

export interface UserPublicProfile {
  uid: string;
  displayName: string;
  hub: HubLocation;
  goal: FitnessGoal;
  experience: ExperienceTier;
  status: MemberStatus;
  sessionsCompleted: number;
  totalVolumeKg: number;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface UserPrivateInfo {
  uid: string;
  email: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface AdminRecord {
  uid: string;
  assignedBy: string;
  createdAt: unknown;
}

export interface WorkoutExercise {
  name: string;
  sets: number;
  reps: string;
  restSec: number;
}

export interface WorkoutProgram {
  id: string;
  title: string;
  category: WorkoutCategory;
  difficulty: ExperienceTier;
  durationMin: number;
  coachName: string;
  description: string;
  imageKey: WorkoutImageKey;
  featured: boolean;
  exercises: WorkoutExercise[];
  createdBy: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface WorkoutLog {
  id: string;
  userId: string;
  workoutId: string;
  workoutTitle: string;
  category: WorkoutCategory;
  durationMin: number;
  totalVolumeKg: number;
  completedSets: number;
  notes: string;
  createdAt: unknown;
}

export interface ChatChannel {
  id: string;
  name: string;
  description: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderRole: 'Member' | 'Admin';
  body: string;
  attachmentType: 'none' | 'workout';
  attachmentSummary: string;
  pinned: boolean;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  priority: 'Normal' | 'Urgent';
  createdAt: unknown;
  updatedAt: unknown;
}

export type PrUnit = 'kg' | 'reps' | 'min' | 'sec';

export interface PersonalRecord {
  id: string;
  userId: string;
  movement: string;
  value: number;
  unit: PrUnit;
  reps: number;
  estimatedOneRmKg: number;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface DailyCheckin {
  id: string;
  userId: string;
  dateKey: string;
  waterLitres: number;
  sleepHours: number;
  readiness: number;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface StudioClass {
  id: string;
  title: string;
  hub: HubLocation;
  category: WorkoutCategory;
  coachName: string;
  dayLabel: string;
  timeLabel: string;
  capacity: number;
  createdBy: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface ClassBooking {
  userId: string;
  classId: string;
  athleteName: string;
  createdAt: unknown;
}

export interface ClubChallenge {
  id: string;
  title: string;
  metric: 'sessions' | 'volumeKg';
  targetValue: number;
  rewardText: string;
  createdBy: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export type AppTab = 'fitness' | 'chat' | 'progress' | 'admin' | 'profile';
