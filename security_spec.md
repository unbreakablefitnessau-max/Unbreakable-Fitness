# Security Specification & Payload-First TDD — Unbeatable Fitness AU

## 1. Data Invariants
1. **Identity Integrity**: Every user-owned document (`users/{userId}`, `workoutLogs/{logId}`, `channels/{channelId}/messages/{messageId}`) must bind `uid`/`userId`/`senderId` strictly to `request.auth.uid` on create and preserve it immutably on update.
2. **PII Isolation**: User email addresses are stored exclusively in `/users/{userId}/private/info` and readable/writable only by the owner (`request.auth.uid == userId`) or a verified admin (`isAdmin()`). Public `/users/{userId}` documents contain zero PII.
3. **Zero Self-Assigned Privileges**: Non-admin users can never write to `/admins/{userId}`, cannot set `status: 'suspended'` on signup, cannot forge `senderRole: 'Admin'` or `pinned: true` in chat messages, and cannot mutate workouts or announcements.
4. **Master Gate & Referential Integrity**: Every `workoutLogs/{logId}` requires an existing `/workouts/{workoutId}`, and every `channels/{channelId}/messages/{messageId}` requires an existing `/channels/{channelId}` parent document.
5. **Temporal Integrity & Path Hardening**: All document IDs match `^[a-zA-Z0-9_\-]+$` (max 128 chars), all strings enforce explicit `size()` bounds, arrays enforce `.size() <= 15`, and `createdAt`/`updatedAt` strictly equal `request.time`.

## 2. The "Dirty Dozen" Attack Payloads
1. **Shadow Field Injection on Signup**: `users/{uid}` create payload with extra `isAdmin: true` ghost key -> MUST FAIL (`hasOnly`).
2. **Suspended Account Self-Activation**: `users/{uid}` update attempting to change `status` from `'suspended'` to `'active'` -> MUST FAIL (`affectedKeys().hasOnly` excludes `status` for non-admin).
3. **Unverified Email Spoofing**: Request claiming `token.email == 'macksvilles@gmail.com'` with `token.email_verified == false` -> MUST FAIL (`email_verified == true` enforced).
4. **PII Cross-User Scrape**: Authenticated user A reading `/users/{userB}/private/info` -> MUST FAIL (`isOwner || isAdmin`).
5. **Self-Promotion to Admin**: Non-admin writing `/admins/{uid}` -> MUST FAIL (`isAdmin()` required).
6. **ID Poisoning Attack**: Writing `/workouts/bad$id..with..chars` or 500-char ID -> MUST FAIL (`isValidId`).
7. **Orphaned Workout Log**: Creating `workoutLogs/{id}` referencing non-existent `workoutId` -> MUST FAIL (`exists(...)`).
8. **Cross-Owner Log Tampering**: User A reading/updating/deleting User B's `workoutLogs/{id}` -> MUST FAIL (`resource.data.userId == request.auth.uid`).
9. **Chat Role Spoofing**: Non-admin creating chat message with `senderRole: 'Admin'` or `pinned: true` -> MUST FAIL.
10. **Orphaned Channel Message**: Creating message in non-existent `/channels/fake-channel/messages/{id}` -> MUST FAIL (`exists` on parent channel).
11. **Timestamp Backdating**: Creating a message or log with client-supplied past timestamp instead of `request.time` -> MUST FAIL.
12. **Denial-of-Wallet Oversized String/Array**: Creating a workout with `exercises.size() == 50` or chat `body.size() == 5000` -> MUST FAIL.
