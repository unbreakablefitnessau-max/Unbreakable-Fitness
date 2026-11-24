import {
  ExperienceTier,
  FitnessGoal,
  HubLocation,
  WorkoutCategory,
  WorkoutImageKey,
} from '../types';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'macksvilles@gmail.com';

export const HUB_LOCATIONS: HubLocation[] = [
  'Sydney CBD',
  'Melbourne Southbank',
  'Brisbane Valley',
  'Gold Coast',
  'Online AU',
];

export const FITNESS_GOALS: FitnessGoal[] = [
  'Strength',
  'Hypertrophy',
  'Conditioning',
  'Fat Loss',
  'Mobility',
];

export const EXPERIENCE_TIERS: ExperienceTier[] = [
  'Foundation',
  'Intermediate',
  'Rx Athlete',
];

export const WORKOUT_CATEGORIES: WorkoutCategory[] = [
  'Strength',
  'Conditioning',
  'Hypertrophy',
  'Mobility',
];

export const VALIDATION_BOUNDS = {
  ID_REGEX: /^[a-zA-Z0-9_-]+$/,
  DISPLAY_NAME_MIN: 2,
  DISPLAY_NAME_MAX: 60,
  WORKOUT_TITLE_MIN: 3,
  WORKOUT_TITLE_MAX: 80,
  WORKOUT_DESC_MIN: 10,
  WORKOUT_DESC_MAX: 500,
  COACH_NAME_MIN: 2,
  COACH_NAME_MAX: 60,
  EXERCISES_MAX: 15,
  NOTES_MAX: 300,
  MESSAGE_BODY_MIN: 1,
  MESSAGE_BODY_MAX: 800,
  ATTACHMENT_SUMMARY_MAX: 160,
  ANNOUNCEMENT_TITLE_MIN: 3,
  ANNOUNCEMENT_TITLE_MAX: 90,
  ANNOUNCEMENT_BODY_MIN: 5,
  ANNOUNCEMENT_BODY_MAX: 500,
  PR_MOVEMENT_MIN: 2,
  PR_MOVEMENT_MAX: 60,
  CLASS_TITLE_MIN: 3,
  CLASS_TITLE_MAX: 80,
  CHALLENGE_TITLE_MIN: 3,
  CHALLENGE_TITLE_MAX: 80,
  CHALLENGE_REWARD_MAX: 120,
};

export const APP_IMAGES: Record<'authHero' | WorkoutImageKey, string> = {
  authHero: '/src/assets/images/auth_hero_gym_1795534615114.jpg',
  strength: '/src/assets/images/workout_strength_1795534615171.jpg',
  conditioning: '/src/assets/images/workout_conditioning_1795534615619.jpg',
  mobility: '/src/assets/images/workout_mobility_1795534616305.jpg',
};

export const STARTER_CHANNELS = [
  {
    id: 'general-crew',
    name: 'General Crew',
    description: 'Daily roll call, studio banter, and training check-ins across AU hubs.',
  },
  {
    id: 'wod-checkins',
    name: 'WOD Check-Ins',
    description: 'Post your session volume, splits, and barbell PBs after training.',
  },
  {
    id: 'nutrition-recovery',
    name: 'Nutrition & Recovery',
    description: 'High-protein meal prep, hydration targets, and sleep habits.',
  },
  {
    id: 'coach-announcements',
    name: 'Coach Desk',
    description: 'Programming updates, workshop dates, and community challenges.',
  },
];

export const STARTER_WORKOUTS = [
  {
    id: 'wod-southern-cross-strength',
    title: 'Southern Cross Barbell Pull',
    category: 'Strength' as WorkoutCategory,
    difficulty: 'Intermediate' as ExperienceTier,
    durationMin: 50,
    coachName: 'Coach Lachlan Reid',
    description:
      'Heavy posterior-chain progression built around competition deadlifts, pause squats, and strict upper-back volume.',
    imageKey: 'strength' as WorkoutImageKey,
    featured: true,
    exercises: [
      { name: 'Trap-Bar or Barbell Deadlift', sets: 5, reps: '5 reps @ RPE 8', restSec: 120 },
      { name: 'Paused Front Squat', sets: 4, reps: '6 reps (2s pause)', restSec: 90 },
      { name: 'Chest-Supported Dumbbell Row', sets: 4, reps: '10 reps', restSec: 60 },
      { name: 'Weighted Hanging Knee Raise', sets: 3, reps: '12 reps', restSec: 45 },
    ],
  },
  {
    id: 'wod-bondi-engine-40',
    title: 'Harbour Engine Conditioning',
    category: 'Conditioning' as WorkoutCategory,
    difficulty: 'Rx Athlete' as ExperienceTier,
    durationMin: 40,
    coachName: 'Coach Maya Chen',
    description:
      'Threshold intervals combining ergometer sprints, heavy sled pushes, and unbroken kettlebell swings for aerobic power.',
    imageKey: 'conditioning' as WorkoutImageKey,
    featured: false,
    exercises: [
      { name: 'Concept2 Row Erg Sprint', sets: 4, reps: '500m hard pace', restSec: 90 },
      { name: 'Heavy Prowler Sled Drive', sets: 4, reps: '25m turf sprint', restSec: 75 },
      { name: 'Russian Kettlebell Swing', sets: 4, reps: '20 reps @ 24kg', restSec: 60 },
      { name: 'Burpee Box Step-Overs', sets: 3, reps: '12 reps', restSec: 60 },
    ],
  },
  {
    id: 'wod-melbourne-upper-builder',
    title: 'Southbank Upper Hypertrophy',
    category: 'Hypertrophy' as WorkoutCategory,
    difficulty: 'Intermediate' as ExperienceTier,
    durationMin: 45,
    coachName: 'Coach Liam OConnor',
    description:
      'Controlled eccentric pressing and pulling blocks targeting shoulder stability, chest thickness, and arm endurance.',
    imageKey: 'strength' as WorkoutImageKey,
    featured: false,
    exercises: [
      { name: 'Incline Dumbbell Press', sets: 4, reps: '8–10 reps (3s lower)', restSec: 90 },
      { name: 'Strict Weighted Pull-Up', sets: 4, reps: '6–8 reps', restSec: 90 },
      { name: 'Seated Arnold Press', sets: 3, reps: '10–12 reps', restSec: 60 },
      { name: 'Cable Face Pull', sets: 3, reps: '15 reps', restSec: 45 },
    ],
  },
  {
    id: 'wod-coastal-recovery-flow',
    title: 'Coastal Mobility & Reset',
    category: 'Mobility' as WorkoutCategory,
    difficulty: 'Foundation' as ExperienceTier,
    durationMin: 30,
    coachName: 'Coach Tessa Kemp',
    description:
      'Decompress joints after heavy squat and erg blocks with hip capsule openers, thoracic rotation, and nasal breathwork.',
    imageKey: 'mobility' as WorkoutImageKey,
    featured: false,
    exercises: [
      { name: '90/90 Hip Internal Rotation', sets: 3, reps: '8 transitions/side', restSec: 30 },
      { name: 'Thoracic Open-Book Stretch', sets: 3, reps: '10 reps/side', restSec: 30 },
      { name: 'Goblet Squat Pry Hold', sets: 3, reps: '45s bottom hold', restSec: 45 },
      { name: 'Box Breathing Downregulation', sets: 2, reps: '3 min nasal pace', restSec: 30 },
    ],
  },
];

export const STARTER_ANNOUNCEMENT = {
  id: 'welcome-au-2026',
  title: 'Summer Strength Block Live Across All AU Hubs',
  body: 'Log every session inside the Fitness tab to track your weekly volume in kg and drop your post-WOD check-in inside #wod-checkins.',
  priority: 'Normal' as const,
};

export const STARTER_CLASSES = [
  {
    id: 'class-syd-barbell-6am',
    title: '6:00 AM Barbell Club',
    hub: 'Sydney CBD' as HubLocation,
    category: 'Strength' as WorkoutCategory,
    coachName: 'Coach Lachlan Reid',
    dayLabel: 'Tue & Thu',
    timeLabel: '06:00 AM AEST',
    capacity: 18,
  },
  {
    id: 'class-mel-engine-5pm',
    title: 'Southbank Engine 45',
    hub: 'Melbourne Southbank' as HubLocation,
    category: 'Conditioning' as WorkoutCategory,
    coachName: 'Coach Maya Chen',
    dayLabel: 'Wed & Fri',
    timeLabel: '05:30 PM AEST',
    capacity: 24,
  },
  {
    id: 'class-online-mobility-sun',
    title: 'Sunday Recovery Live Stream',
    hub: 'Online AU' as HubLocation,
    category: 'Mobility' as WorkoutCategory,
    coachName: 'Coach Tessa Kemp',
    dayLabel: 'Sunday',
    timeLabel: '08:30 AM AEST',
    capacity: 100,
  },
];

export const STARTER_CHALLENGES = [
  {
    id: 'challenge-nov-12-sessions',
    title: 'Unbeatable 12-Session Block',
    metric: 'sessions' as const,
    targetValue: 12,
    rewardText: 'Club Finisher Badge + Recovery Workshop Pass',
  },
  {
    id: 'challenge-50k-volume',
    title: '50,000 kg Barbell Volume',
    metric: 'volumeKg' as const,
    targetValue: 50000,
    rewardText: 'Heavy Club Honours Roll Recognition',
  },
];
