/**
 * Payload-First Security TDD Test Matrix for Unbeatable Fitness AU
 * Verifies the "Dirty Dozen" attack payloads against firestore.rules
 * (Designed for @firebase/rules-unit-testing when running against Firestore Emulator).
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
  enforcedByRule: string;
}

export const DIRTY_DOZEN_PAYLOADS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on User Signup',
    collectionPath: 'users/member-1',
    operation: 'create',
    payload: {
      uid: 'member-1',
      displayName: 'Alex Mercer',
      hub: 'Sydney CBD',
      goal: 'Strength',
      experience: 'Foundation',
      status: 'active',
      sessionsCompleted: 0,
      totalVolumeKg: 0,
      isAdmin: true
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isValidUserPublic(incoming()) -> data.keys().hasOnly(...)'
  },
  {
    id: 2,
    name: 'Suspended Account Self-Activation',
    collectionPath: 'users/member-1',
    operation: 'update',
    payload: { status: 'active' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'existing().status == "active" && affectedKeys().hasOnly([...])'
  },
  {
    id: 3,
    name: 'Unverified Admin Email Spoofing',
    collectionPath: 'workouts/wod-1',
    operation: 'create',
    payload: { id: 'wod-1', title: 'Spoofed WOD' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isVerifiedUser() requires request.auth.token.email_verified == true'
  },
  {
    id: 4,
    name: 'PII Cross-User Scrape',
    collectionPath: 'users/member-2/private/info',
    operation: 'get',
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isOwner(userId) || isAdmin()'
  },
  {
    id: 5,
    name: 'Self-Promotion to Admin',
    collectionPath: 'admins/member-1',
    operation: 'create',
    payload: { uid: 'member-1', assignedBy: 'member-1' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'allow create: if isAdmin()'
  },
  {
    id: 6,
    name: 'ID Poisoning Attack',
    collectionPath: 'workouts/bad$id..injection',
    operation: 'create',
    payload: { id: 'bad$id..injection' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isValidId(workoutId)'
  },
  {
    id: 7,
    name: 'Orphaned Workout Log Creation',
    collectionPath: 'workoutLogs/log-1',
    operation: 'create',
    payload: { id: 'log-1', userId: 'member-1', workoutId: 'non-existent-wod' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'exists(/databases/$(database)/documents/workouts/$(incoming().workoutId))'
  },
  {
    id: 8,
    name: 'Cross-Owner Workout Log Read',
    collectionPath: 'workoutLogs/log-other',
    operation: 'get',
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'resource.data.userId == request.auth.uid || isAdmin()'
  },
  {
    id: 9,
    name: 'Chat Role Spoofing & Unauthorized Pin',
    collectionPath: 'channels/general-crew/messages/msg-1',
    operation: 'create',
    payload: {
      id: 'msg-1',
      channelId: 'general-crew',
      senderId: 'member-1',
      senderRole: 'Admin',
      pinned: true,
      body: 'Fake coach message'
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isAdmin() || (incoming().senderRole == "Member" && incoming().pinned == false)'
  },
  {
    id: 10,
    name: 'Orphaned Channel Message',
    collectionPath: 'channels/fake-channel/messages/msg-2',
    operation: 'create',
    payload: { id: 'msg-2', channelId: 'fake-channel', senderId: 'member-1' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'exists(/databases/$(database)/documents/channels/$(channelId))'
  },
  {
    id: 11,
    name: 'Timestamp Backdating',
    collectionPath: 'channels/general-crew/messages/msg-3',
    operation: 'create',
    payload: { id: 'msg-3', createdAt: '2020-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'incoming().createdAt == request.time'
  },
  {
    id: 12,
    name: 'Denial-of-Wallet Oversized String',
    collectionPath: 'channels/general-crew/messages/msg-4',
    operation: 'create',
    payload: { id: 'msg-4', body: 'X'.repeat(5000) },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'data.body.size() >= 1 && data.body.size() <= 800'
  }
];
