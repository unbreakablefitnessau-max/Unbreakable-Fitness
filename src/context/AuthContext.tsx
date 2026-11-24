import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  STARTER_ANNOUNCEMENT,
  STARTER_CHALLENGES,
  STARTER_CHANNELS,
  STARTER_CLASSES,
  STARTER_WORKOUTS,
  VALIDATION_BOUNDS,
} from '../constants/validation';
import { OperationType, auth, db, googleProvider, handleFirestoreError } from '../firebase';
import { ExperienceTier, FitnessGoal, HubLocation, UserPublicProfile } from '../types';

export interface SignupProfileInput {
  displayName: string;
  hub: HubLocation;
  goal: FitnessGoal;
  experience: ExperienceTier;
}

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserPublicProfile | null;
  isAdmin: boolean;
  authReady: boolean;
  profileLoading: boolean;
  needsProfileSetup: boolean;
  needsEmailVerification: boolean;
  signInWithGoogle: (pendingProfile?: SignupProfileInput) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    profileData: SignupProfileInput
  ) => Promise<void>;
  createAthleteProfile: (profileData: SignupProfileInput) => Promise<void>;
  updateAthleteProfile: (
    updates: Partial<Pick<UserPublicProfile, 'displayName' | 'hub' | 'goal' | 'experience'>>
  ) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  seedStarterClubData: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserPublicProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [pendingSignupProfile, setPendingSignupProfile] = useState<SignupProfileInput | null>(
    null
  );

  const seedStarterClubDataInternal = async (adminUid: string, adminName: string) => {
    try {
      const [workoutsSnap, channelsSnap, announcementsSnap, classesSnap, challengesSnap] =
        await Promise.all([
          getDocs(query(collection(db, 'workouts'), limit(1))),
          getDocs(query(collection(db, 'channels'), limit(1))),
          getDocs(query(collection(db, 'announcements'), limit(1))),
          getDocs(query(collection(db, 'classes'), limit(1))),
          getDocs(query(collection(db, 'challenges'), limit(1))),
        ]);

      if (
        !workoutsSnap.empty &&
        !channelsSnap.empty &&
        !announcementsSnap.empty &&
        !classesSnap.empty &&
        !challengesSnap.empty
      ) {
        return;
      }

      const batch = writeBatch(db);

      if (workoutsSnap.empty) {
        for (const w of STARTER_WORKOUTS) {
          batch.set(doc(db, 'workouts', w.id), {
            ...w,
            createdBy: adminUid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }

      if (channelsSnap.empty) {
        for (const c of STARTER_CHANNELS) {
          batch.set(doc(db, 'channels', c.id), {
            ...c,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }

      if (announcementsSnap.empty) {
        batch.set(doc(db, 'announcements', STARTER_ANNOUNCEMENT.id), {
          ...STARTER_ANNOUNCEMENT,
          authorId: adminUid,
          authorName: adminName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      if (classesSnap.empty) {
        for (const cls of STARTER_CLASSES) {
          batch.set(doc(db, 'classes', cls.id), {
            ...cls,
            createdBy: adminUid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }

      if (challengesSnap.empty) {
        for (const ch of STARTER_CHALLENGES) {
          batch.set(doc(db, 'challenges', ch.id), {
            ...ch,
            createdBy: adminUid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'workouts/channels/announcements/classes/challenges');
    }
  };

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let unsubAdmin: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }
      if (unsubAdmin) {
        unsubAdmin();
        unsubAdmin = null;
      }

      setFirebaseUser(user);

      if (!user) {
        setProfile(null);
        setIsAdmin(false);
        setProfileLoading(false);
        setAuthReady(true);
        return;
      }

      if (!user.emailVerified) {
        setProfile(null);
        setIsAdmin(false);
        setProfileLoading(false);
        setAuthReady(true);
        return;
      }

      setProfileLoading(true);
      const isBootstrappedAdmin = user.email === BOOTSTRAPPED_ADMIN_EMAIL;

      const adminDocRef = doc(db, 'admins', user.uid);
      unsubAdmin = onSnapshot(
        adminDocRef,
        (snap) => {
          const adminFlag = isBootstrappedAdmin || snap.exists();
          setIsAdmin(adminFlag);
          if (adminFlag) {
            seedStarterClubDataInternal(
              user.uid,
              user.displayName?.slice(0, VALIDATION_BOUNDS.DISPLAY_NAME_MAX) || 'Head Coach'
            ).catch(() => {
              // handled in helper
            });
          }
        },
        (error) => {
          if (isBootstrappedAdmin) {
            setIsAdmin(true);
          } else {
            handleFirestoreError(error, OperationType.GET, `admins/${user.uid}`);
          }
        }
      );

      const userDocRef = doc(db, 'users', user.uid);
      unsubProfile = onSnapshot(
        userDocRef,
        async (snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as UserPublicProfile);
            setProfileLoading(false);
            setAuthReady(true);
          } else if (pendingSignupProfile) {
            try {
              await writeAthleteDocs(user, pendingSignupProfile);
              setPendingSignupProfile(null);
            } catch {
              setProfileLoading(false);
              setAuthReady(true);
            }
          } else {
            setProfile(null);
            setProfileLoading(false);
            setAuthReady(true);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
      if (unsubAdmin) unsubAdmin();
    };
  }, [pendingSignupProfile]);

  const writeAthleteDocs = async (user: User, input: SignupProfileInput) => {
    const cleanName = input.displayName
      .trim()
      .slice(0, VALIDATION_BOUNDS.DISPLAY_NAME_MAX);
    const safeName =
      cleanName.length >= VALIDATION_BOUNDS.DISPLAY_NAME_MIN ? cleanName : 'AU Athlete';
    const safeEmail = (user.email || 'athlete@unbeatablefitness.au').slice(0, 160);

    const batch = writeBatch(db);
    const publicRef = doc(db, 'users', user.uid);
    const privateRef = doc(db, 'users', user.uid, 'private', 'info');

    batch.set(publicRef, {
      uid: user.uid,
      displayName: safeName,
      hub: input.hub,
      goal: input.goal,
      experience: input.experience,
      status: 'active',
      sessionsCompleted: 0,
      totalVolumeKg: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(privateRef, {
      uid: user.uid,
      email: safeEmail,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const signInWithGoogle = async (pendingProfile?: SignupProfileInput) => {
    if (pendingProfile) {
      setPendingSignupProfile(pendingProfile);
    }
    const result = await signInWithPopup(auth, googleProvider);
    if (pendingProfile && result.user) {
      const existingSnap = await getDoc(doc(db, 'users', result.user.uid));
      if (!existingSnap.exists()) {
        await writeAthleteDocs(result.user, pendingProfile);
        setPendingSignupProfile(null);
      }
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    profileData: SignupProfileInput
  ) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (cred.user) {
      await updateProfile(cred.user, {
        displayName: profileData.displayName.trim().slice(0, VALIDATION_BOUNDS.DISPLAY_NAME_MAX),
      });
      setPendingSignupProfile(profileData);
      await sendEmailVerification(cred.user);
    }
  };

  const createAthleteProfile = async (profileData: SignupProfileInput) => {
    if (!auth.currentUser) {
      throw new Error('Must be signed in to create profile.');
    }
    await writeAthleteDocs(auth.currentUser, profileData);
  };

  const updateAthleteProfile = async (
    updates: Partial<Pick<UserPublicProfile, 'displayName' | 'hub' | 'goal' | 'experience'>>
  ) => {
    if (!auth.currentUser || !profile) return;
    const cleanName = (updates.displayName ?? profile.displayName)
      .trim()
      .slice(0, VALIDATION_BOUNDS.DISPLAY_NAME_MAX);

    const userRef = doc(db, 'users', auth.currentUser.uid);
    try {
      await updateDoc(userRef, {
        displayName:
          cleanName.length >= VALIDATION_BOUNDS.DISPLAY_NAME_MIN ? cleanName : profile.displayName,
        hub: updates.hub ?? profile.hub,
        goal: updates.goal ?? profile.goal,
        experience: updates.experience ?? profile.experience,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    }
  };

  const resendVerificationEmail = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const seedStarterClubData = async () => {
    if (!auth.currentUser || !isAdmin) return;
    await seedStarterClubDataInternal(
      auth.currentUser.uid,
      profile?.displayName || auth.currentUser.displayName || 'Head Coach'
    );
  };

  const logout = async () => {
    await signOut(auth);
  };

  const needsEmailVerification = Boolean(firebaseUser && !firebaseUser.emailVerified);
  const needsProfileSetup = Boolean(
    firebaseUser && firebaseUser.emailVerified && !profileLoading && !profile
  );

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        isAdmin,
        authReady,
        profileLoading,
        needsProfileSetup,
        needsEmailVerification,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        createAthleteProfile,
        updateAthleteProfile,
        resendVerificationEmail,
        seedStarterClubData,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
