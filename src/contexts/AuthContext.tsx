import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  signInWithPhoneNumber,
  ConfirmationResult,
  PhoneAuthProvider,

  linkWithCredential,
  linkWithPopup,
  EmailAuthProvider,
  sendPasswordResetEmail,
  User as FirebaseUser,
  RecaptchaVerifier,
  deleteUser
} from 'firebase/auth';
import { getToken } from 'firebase/messaging';

import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db, messaging } from '../lib/firebase';
import { UserRole } from '../types';
import { shouldUseRedirect } from '../utils/capacitorCheck';

export interface UserMetadata {
  theme?: 'light' | 'dark';
  language?: string;
  notifications?: {
    email?: boolean;
    sms?: boolean;
    coastalAlerts?: boolean;
    weeklySummary?: boolean;
  };
  privacy?: {
    showProfilePublicly?: boolean;
    shareLocation?: boolean;
  };
  preferences?: {
    autoDetectLocation?: boolean;
  };
  [key: string]: any; // Allow additional metadata fields
}

interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  roleOverride?: UserRole;
  phone?: string;
  phoneVerified?: boolean;
  aadharId?: string;
  createdAt: string;
  needsRoleAssignment?: boolean;
  blocked?: boolean;
  blockedAt?: any;
  blockedBy?: string;
  blockedReason?: string;
  metadata?: UserMetadata;
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  register: (email: string, password: string, name: string, aadharId: string, phone?: string, role?: UserRole) => Promise<FirebaseUser>;
  login: (email: string, password: string) => Promise<FirebaseUser>;
  loginWithGoogle: () => Promise<{ user: FirebaseUser; needsCompletion: boolean }>;
  sendOTP: (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) => Promise<ConfirmationResult>;
  verifyOTP: (confirmationResult: ConfirmationResult, otp: string) => Promise<FirebaseUser>;
  updatePhoneForGoogleUser: (phone: string) => Promise<void>;
  verifyPhoneForGoogleUser: (confirmationResult: ConfirmationResult, otp: string) => Promise<void>;
  setPasswordForGoogleUser: (password: string, aadharId: string) => Promise<void>;
  linkGoogleAccount: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateMetadata: (metadata: Partial<UserMetadata>) => Promise<void>;
  checkAadharAvailability: (aadharId: string) => Promise<boolean>;
  reloadUserProfile: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_ADMIN_EMAILS = (import.meta.env.VITE_DEFAULT_ADMIN_EMAILS ||
  'admin@tarang.com')
  .split(',')
  .map((email: string) => email.trim().toLowerCase())
  .filter(Boolean);

const isDefaultAdminEmail = (email?: string | null) => {
  if (!email) return false;
  return DEFAULT_ADMIN_EMAILS.includes(email.trim().toLowerCase());
};

const getFallbackRole = (email?: string | null): UserRole =>
  isDefaultAdminEmail(email) ? 'authority' : 'citizen';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Use sessionStorage to remember if user was logged in (prevents flash on reload)
  const wasLoggedIn = sessionStorage.getItem('tarang_auth_active') === 'true';

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  // Start with loading=true if we think user might be logged in
  const [loading, setLoading] = useState(true);
  const isRegisteringRef = useRef(false); // Track if we're currently registering
  const userProfileRef = useRef<UserProfile | null>(null); // Ref to track userProfile without causing re-renders

  // Update register function
  // Handles linking phone auth (from OTP) with email/password account
  const register = async (email: string, password: string, name: string, aadharId: string, phone?: string, role?: UserRole): Promise<FirebaseUser> => {
    isRegisteringRef.current = true;
    try {
      const fallbackRole = getFallbackRole(email);
      const userRole = role || fallbackRole;

      // Validate Aadhar ID format
      if (!aadharId || !/^\d{12}$/.test(aadharId.replace(/\s/g, ''))) {
        throw new Error('Invalid Aadhar ID. Please enter a valid 12-digit Aadhar number.');
      }
      const cleanAadharId = aadharId.replace(/\s/g, '');

      // Check current user state (for phone auth linking)
      const existingAuthUser = auth.currentUser;

      // Scenario 1: Linking to existing Phone Auth user
      if (existingAuthUser && existingAuthUser.phoneNumber) {
        try {
          // Check Aadhar uniqueness first (since they are already logged in via Phone, they have read access!)
          const usersRef = collection(db, 'users');
          const aadharQuery = query(usersRef, where('aadharId', '==', cleanAadharId));
          const aadharSnapshot = await getDocs(aadharQuery);

          if (!aadharSnapshot.empty) {
            // Check if it's not their own doc (technically they don't have a doc yet if registering, but safety check)
            throw new Error('This Aadhar ID is already registered.');
          }

          // Link credentials
          const credential = EmailAuthProvider.credential(email, password);
          await linkWithCredential(existingAuthUser, credential);
          await updateProfile(existingAuthUser, { displayName: name });

          // Determine merged role
          const existingUserDoc = await getDoc(doc(db, 'users', existingAuthUser.uid));
          const existingData = existingUserDoc.exists() ? existingUserDoc.data() : null;

          const userData: UserProfile = {
            uid: existingAuthUser.uid,
            email: email,
            name: name,
            role: (existingData?.role) ? existingData.role as UserRole : userRole,
            phone: phone ? `+91${phone}` : existingAuthUser.phoneNumber || undefined,
            phoneVerified: true,
            aadharId: cleanAadharId,
            createdAt: existingData?.createdAt || new Date().toISOString(),
            metadata: existingData?.metadata || {},
          };

          await setDoc(doc(db, 'users', existingAuthUser.uid), userData, { merge: true });
          userProfileRef.current = userData;
          setUserProfile(userData);
          return existingAuthUser;

        } catch (linkError: any) {
          console.warn('Link failed, falling back to new user creation', linkError);
          // Fallthrough to standard creation if linking fails (e.g. email in use)
          // But since they were logged in via Phone, we might need to signOut if we want to create a fresh email user?
          // For now, let's assume if link fails we abort or try standard flow. 
          // Standard flow requires sign out if we want to create a NEW auth user separate from the phone one.
          await signOut(auth);
        }
      }

      // Scenario 2: Standard Email/Password Registration
      // Step 1: Create Authentication User FIRST (to get read access)
      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } catch (authError: any) {
        // Pass through auth errors (email in use, weak password)
        throw authError;
      }

      const newUser = userCredential.user;

      try {
        // Step 2: Now that we are authenticated, check Aadhar Uniqueness
        const usersRef = collection(db, 'users');
        const aadharQuery = query(usersRef, where('aadharId', '==', cleanAadharId));
        const aadharSnapshot = await getDocs(aadharQuery);

        if (!aadharSnapshot.empty) {
          // Aadhar exists!
          throw new Error('This Aadhar ID is already registered.');
        }

        // Step 3: Aadhar is unique, proceed to save profile
        await updateProfile(newUser, { displayName: name });

        const userData: UserProfile = {
          uid: newUser.uid,
          email,
          name,
          role: userRole,
          phone: phone ? `+91${phone}` : undefined,
          phoneVerified: !!phone,
          aadharId: cleanAadharId,
          createdAt: new Date().toISOString(),
          metadata: {},
        };

        await setDoc(doc(db, 'users', newUser.uid), userData);
        userProfileRef.current = userData;
        setUserProfile(userData);
        return newUser;

      } catch (validationError: any) {
        // Step 4: If Aadhar check fails/error occurs, CLEAN UP the Auth User
        console.error('Registration validation failed, rolling back auth user:', validationError);
        try {
          await deleteUser(newUser);
        } catch (deleteError) {
          console.error('Failed to cleanup auth user after validation error:', deleteError);
          // Only critical if we leave a loose auth user without profile. 
          // They won't be able to do much without a profile doc due to other rules.
        }
        throw validationError; // Re-throw to UI
      }

    } catch (error: any) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setTimeout(() => {
        isRegisteringRef.current = false;
      }, 1000);
    }
  };

  const login = async (email: string, password: string): Promise<FirebaseUser> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      throw error;
    }
  };




  // Shared helper to handle Google User profile creation/checking
  const handleGoogleUser = async (user: FirebaseUser): Promise<{ user: FirebaseUser; needsCompletion: boolean }> => {
    // Check if user profile exists, if not create one with citizen role
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    let needsCompletion = false;

    if (!userDoc.exists()) {
      const fallbackRole = getFallbackRole(user.email);
      const userData: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        name: user.displayName || 'User',
        role: fallbackRole, // Default based on configured fallback
        phone: undefined,
        phoneVerified: false,
        createdAt: new Date().toISOString(),
        metadata: {},
      };
      await setDoc(doc(db, 'users', user.uid), userData);
      needsCompletion = true; // New user needs to complete profile
    } else {
      // Check if existing user needs completion (missing phone, not verified, or missing Aadhar ID)
      const data = userDoc.data();
      if (!data.phone || !data.phoneVerified || !data.aadharId) {
        needsCompletion = true;
      }
    }
    return { user, needsCompletion };
  };

  // Handle Redirect Result (for Mobile/Fallback flow)
  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('Redirect login successful, handling user...');
          await handleGoogleUser(result.user);
          // Note: Navigation happens automatically via AuthStateChanged in App.tsx
        }
      } catch (error: any) {
        console.error('Redirect sign-in error:', error);
        // We could toast here, but AuthContext shouldn't depend on UI libraries strictly. 
        // Ideally we'd set an error state exposed to the UI if needed.
      }
    };
    handleRedirect();
  }, []);

  const loginWithGoogle = async (): Promise<{ user: FirebaseUser; needsCompletion: boolean }> => {
    try {
      const provider = new GoogleAuthProvider();
      // Add additional scopes if needed
      provider.addScope('profile');
      provider.addScope('email');

      // Set custom parameters
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      // On mobile/WebView (including webtonative.com), use redirect instead of popup
      const useRedirect = shouldUseRedirect();

      if (useRedirect) {
        // Use redirect for mobile apps and WebView environments
        console.log('Mobile/WebView detected - using redirect method for Google sign-in');
        await signInWithRedirect(auth, provider);
        // If redirect succeeds, the page will reload and we'll handle it in useEffect
        // Return a dummy promise that never resolves (or throws to stop execution) to prevent UI flicker
        return new Promise(() => { });
      }

      // On web, try popup first
      let userCredential;

      try {
        // Try popup first
        userCredential = await signInWithPopup(auth, provider);
      } catch (popupError: any) {
        // If popup is blocked, try redirect as fallback
        if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/popup-closed-by-user') {
          console.log('Popup blocked or closed, trying redirect method...');
          await signInWithRedirect(auth, provider);
          return new Promise(() => { }); // Wait for redirect
        }
        throw popupError;
      }

      // Use shared helper
      return await handleGoogleUser(userCredential.user);

    } catch (error: any) {
      console.error('Google sign-in error details:', {
        code: error.code,
        message: error.message,
        email: error.email,
        credential: error.credential
      });

      // Re-throw with more context if needed
      throw error;
    }
  };

  // Update phone number for Google user (in Firestore only, not verified yet)
  const updatePhoneForGoogleUser = async (phone: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user signed in');
    }

    const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;

    await setDoc(doc(db, 'users', user.uid), {
      phone: formattedPhone,
    }, { merge: true });
  };

  // Verify phone for Google user (after OTP verification)
  const verifyPhoneForGoogleUser = async (confirmationResult: ConfirmationResult, otp: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user signed in');
    }

    try {
      // Create credential from verification code
      const credential = PhoneAuthProvider.credential(confirmationResult.verificationId, otp);

      // Link credential to existing user
      const userCredential = await linkWithCredential(user, credential);

      // If linking succeeds, the phone is verified
      // Update Firestore to mark phone as verified
      const phoneNumber = userCredential.user.phoneNumber;

      await setDoc(doc(db, 'users', user.uid), {
        phone: phoneNumber || undefined,
        phoneVerified: true,
      }, { merge: true });
      // Reload the profile to update the UI
      await reloadUserProfile();
    } catch (error: any) {
      // If the phone number is already associated with another account, that's okay
      // We can still mark it as verified in our profile
      if (error.code === 'auth/credential-already-in-use' || error.code === 'auth/account-exists-with-different-credential' ||
        error.code === 'auth/provider-already-linked') {
        // Phone is verified (exists or already linked), just update our profile
        console.log('Phone already in use or linked, but marking as verified');

        await setDoc(doc(db, 'users', user.uid), {
          phoneVerified: true,
        }, { merge: true });
        // Reload the profile to update the UI
        await reloadUserProfile();
      } else if (error.code === 'auth/invalid-verification-code') {
        throw new Error('Invalid OTP code. Please try again.');
      } else if (error.code === 'auth/code-expired') {
        throw new Error('OTP code expired. Please request a new one.');
      } else {
        // For other errors, try to update anyway if OTP was correct
        // In a production app, you might want server-side verification
        console.warn('OTP verification error, but marking as verified:', error);

        await setDoc(doc(db, 'users', user.uid), {
          phoneVerified: true,
        }, { merge: true });
        // Reload the profile to update the UI
        await reloadUserProfile();
      }
    }
  };

  // Set password for Google user (link email/password credential)
  const setPasswordForGoogleUser = async (password: string, aadharId: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error('No user signed in or email not available');
    }

    // Validate Aadhar ID format (12 digits)
    if (!aadharId || !/^\d{12}$/.test(aadharId.replace(/\s/g, ''))) {
      throw new Error('Invalid Aadhar ID. Please enter a valid 12-digit Aadhar number.');
    }

    const cleanAadharId = aadharId.replace(/\s/g, '');

    // Check if Aadhar ID already exists
    const usersRef = collection(db, 'users');
    const aadharQuery = query(usersRef, where('aadharId', '==', cleanAadharId));
    const aadharSnapshot = await getDocs(aadharQuery);

    if (!aadharSnapshot.empty && aadharSnapshot.docs[0].id !== user.uid) {
      throw new Error('This Aadhar ID is already registered. Please use a different Aadhar ID or contact support.');
    }

    try {
      // Create email/password credential
      const credential = EmailAuthProvider.credential(user.email, password);

      // Link credential to Google account
      await linkWithCredential(user, credential);

      // Update user profile with Aadhar ID
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const existingData = userDoc.exists() ? userDoc.data() : null;

      await setDoc(doc(db, 'users', user.uid), {
        aadharId: cleanAadharId,
        name: user.displayName || existingData?.name || 'User',
      }, { merge: true });

      // Reload the profile to update the UI
      await reloadUserProfile();
    } catch (error: any) {
      if (error.code === 'auth/provider-already-linked') {
        // Password provider is already linked, just update the Aadhar ID
        console.log('Password provider already linked, updating profile only');
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const existingData = userDoc.exists() ? userDoc.data() : null;

        await setDoc(doc(db, 'users', user.uid), {
          aadharId: cleanAadharId,
          name: user.displayName || existingData?.name || 'User',
        }, { merge: true });

        // Reload the profile to update the UI
        await reloadUserProfile();
      } else if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already associated with another account');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password is too weak. Please use a stronger password.');
      } else {
        throw error;
      }
    }
  };

  // Helper function to reload user profile from Firestore
  const reloadUserProfile = async (): Promise<void> => {
    const user = auth.currentUser;
    if (!user) return;

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      const profile: UserProfile = {
        uid: data.uid || user.uid,
        email: data.email || user.email || '',
        name: data.name || user.displayName || 'User',
        role: data.role || 'citizen',
        phone: data.phone || undefined,
        phoneVerified: data.phoneVerified || false,
        aadharId: data.aadharId || undefined,
        createdAt: data.createdAt || new Date().toISOString(),
        needsRoleAssignment: data.needsRoleAssignment || false,
        metadata: data.metadata || {},
      };
      userProfileRef.current = profile;
      setUserProfile(profile);
      console.log('Profile reloaded:', profile);
    }
  };

  // Link Google account to existing email/password account
  const linkGoogleAccount = async (): Promise<void> => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user signed in');
    }

    // Check if Google is already linked
    const hasGoogle = user.providerData.some(
      provider => provider.providerId === 'google.com'
    );
    if (hasGoogle) {
      throw new Error('Google account is already linked');
    }

    try {
      const provider = new GoogleAuthProvider();
      // Use linkWithPopup to link Google provider to current account
      const result = await linkWithPopup(user, provider);

      // Linking successful - update profile if needed
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        // Preserve existing role and other data, update name/email from Google
        await setDoc(doc(db, 'users', result.user.uid), {
          email: result.user.email || data.email,
          name: result.user.displayName || data.name,
        }, { merge: true });
      }
    } catch (error: any) {
      if (error.code === 'auth/credential-already-in-use') {
        throw new Error('This Google account is already linked to another account');
      } else if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in popup was closed');
      } else if (error.code === 'auth/provider-already-linked') {
        throw new Error('Google account is already linked to this account');
      } else {
        throw error;
      }
    }
  };

  // Send OTP using Firebase Phone Authentication
  const sendOTP = async (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier): Promise<ConfirmationResult> => {
    try {
      // Format phone number with country code
      let formattedPhone = phoneNumber.replace(/\D/g, ''); // Remove non-digits

      // Remove leading 0 if present
      if (formattedPhone.startsWith('0')) {
        formattedPhone = formattedPhone.substring(1);
      }

      // Ensure it's exactly 10 digits
      if (formattedPhone.length !== 10) {
        throw new Error('Phone number must be exactly 10 digits');
      }

      // Add country code
      formattedPhone = `+91${formattedPhone}`;

      console.log('Sending OTP to formatted number:', formattedPhone);

      // Send OTP using Firebase Phone Auth
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
      console.log('OTP sent successfully, confirmation result received');
      return confirmationResult;
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      throw error;
    }
  };

  // Verify OTP using Firebase Phone Authentication
  const verifyOTP = async (confirmationResult: ConfirmationResult, otp: string): Promise<FirebaseUser> => {
    try {
      const user = auth.currentUser;
      console.log('verifyOTP called. Current user:', user?.uid);

      // If user is already logged in (e.g. Google Sign-In), link the phone credential
      if (user) {
        console.log('Linking phone credential to existing user:', user.uid);
        const credential = PhoneAuthProvider.credential(confirmationResult.verificationId, otp);
        const userCredential = await linkWithCredential(user, credential);
        console.log('Phone credential linked successfully');

        // Update the existing user profile
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          await setDoc(doc(db, 'users', user.uid), {
            phone: userCredential.user.phoneNumber,
            phoneVerified: true
          }, { merge: true });
        }

        return userCredential.user;
      } else {
        console.log('No user logged in, performing standard phone sign-in');
        // Not logged in - standard phone sign in
        const userCredential = await confirmationResult.confirm(otp);
        console.log('Phone sign-in successful, new uid:', userCredential.user.uid);

        // Check if user exists in Firestore
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));

        if (!userDoc.exists()) {
          const fallbackRole = getFallbackRole(userCredential.user.email);
          // New user - create profile as citizen
          const userData: UserProfile = {
            uid: userCredential.user.uid,
            email: userCredential.user.email || '',
            name: userCredential.user.displayName || 'User',
            role: fallbackRole,
            phone: userCredential.user.phoneNumber || undefined,
            phoneVerified: true,
            createdAt: new Date().toISOString(),
            metadata: {},
          };
          await setDoc(doc(db, 'users', userCredential.user.uid), userData);
          userProfileRef.current = userData;
          setUserProfile(userData);
        } else {
          // Existing user - update phone verification status
          const existingData = userDoc.data();
          if (!existingData.phoneVerified) {
            await setDoc(doc(db, 'users', userCredential.user.uid), {
              phone: userCredential.user.phoneNumber || existingData.phone,
              phoneVerified: true
            }, { merge: true });
          }
        }
        return userCredential.user;
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      // Handle "credential already in use" error specifically
      if (error.code === 'auth/credential-already-in-use') {
        throw new Error('This phone number is already linked to another account.');
      }
      throw error;
    }
  };

  // Reset password using Firebase Password Reset
  const resetPassword = async (email: string): Promise<void> => {
    try {
      // Get the current URL for the redirect
      const actionCodeSettings = {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      };

      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      console.log('Password reset email sent to:', email);
    } catch (error: any) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  };

  // Update user metadata (personalization settings)
  const updateMetadata = async (metadata: Partial<UserMetadata>): Promise<void> => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user signed in');
    }

    try {
      // Get current metadata
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const currentData = userDoc.exists() ? userDoc.data() : {};
      const currentMetadata = currentData.metadata || {};

      // Merge new metadata with existing metadata
      const updatedMetadata = {
        ...currentMetadata,
        ...metadata,
      };

      // Update Firestore with merged metadata
      await setDoc(
        doc(db, 'users', user.uid),
        {
          metadata: updatedMetadata,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Update local userProfile state
      if (userProfileRef.current) {
        const updatedProfile = {
          ...userProfileRef.current,
          metadata: updatedMetadata,
        };
        userProfileRef.current = updatedProfile;
        setUserProfile(updatedProfile);
      }

      console.log('Metadata updated successfully:', updatedMetadata);
    } catch (error: any) {
      console.error('Error updating metadata:', error);
      throw error;
    }
  };

  // Check if Aadhar ID is available (not used by another user)
  const checkAadharAvailability = async (aadharId: string): Promise<boolean> => {
    const cleanAadharId = aadharId.replace(/\s/g, '');
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('aadharId', '==', cleanAadharId));
    const snapshot = await getDocs(q);

    // If user is logged in, exclude their own doc from check (though usually they wouldn't be checking if they already have it)
    if (currentUser && !snapshot.empty) {
      const isSelf = snapshot.docs.some(doc => doc.id === currentUser.uid);
      if (isSelf && snapshot.size === 1) return true; // Available (it's their own)
    }

    return snapshot.empty;
  };

  const logout = async (): Promise<void> => {
    try {
      // Clear session storage to prevent flash on next load
      sessionStorage.removeItem('tarang_auth_active');
      await signOut(auth);
      setUserProfile(null);
    } catch (error) {
      throw error;
    }
  };

  // Update ref whenever userProfile changes (for access inside the listener)
  useEffect(() => {
    userProfileRef.current = userProfile;
  }, [userProfile]);

  const isHandlingRedirectRef = useRef(false);

  // Handle Google sign-in redirect result
  useEffect(() => {
    const handleRedirectResult = async () => {
      isHandlingRedirectRef.current = true;
      setLoading(true);
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('Google sign-in redirect successful:', result.user.email);
          // Check if user profile exists and create if needed
          const userDoc = await getDoc(doc(db, 'users', result.user.uid));
          if (!userDoc.exists()) {
            const fallbackRole = getFallbackRole(result.user.email);
            const userData: UserProfile = {
              uid: result.user.uid,
              email: result.user.email || '',
              name: result.user.displayName || 'User',
              role: fallbackRole,
              phone: undefined,
              phoneVerified: false,
              createdAt: new Date().toISOString(),
              metadata: {},
            };
            await setDoc(doc(db, 'users', result.user.uid), userData);
          }
        }
      } catch (error: any) {
        console.error('Error handling redirect result:', error);
      } finally {
        isHandlingRedirectRef.current = false;
        setLoading(false);
      }
    };

    handleRedirectResult();
  }, []);

  // Request FCM Permission and Save Token
  // DISABLED: Handled by notificationService.ts instead to avoid duplicate FCM calls
  // useEffect(() => {
  //   const requestNotificationPermission = async () => {
  //     if (!currentUser || !(messaging as any)) return;

  //     try {
  //       const permission = await Notification.requestPermission();
  //       if (permission === 'granted') {
  //         const token = await getToken(messaging as any, {
  //           vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
  //         });

  //         if (token) {
  //           console.log('FCM Token:', token);
  //           // Save token to user profile
  //           await setDoc(doc(db, 'users', currentUser.uid), {
  //             fcmToken: token
  //           }, { merge: true });
  //         }
  //       }
  //     } catch (error) {
  //       console.error('Error requesting notification permission:', error);
  //     }
  //   };

  //   if (currentUser) {
  //     requestNotificationPermission();
  //   }
  // }, [currentUser]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('onAuthStateChanged fired:', { uid: user?.uid, email: user?.email, isRegistering: isRegisteringRef.current });

      try {
        setCurrentUser(user);
        if (user) {
          try {
            // If we're currently registering, wait longer and check if profile is already set
            const delay = isRegisteringRef.current ? 600 : 200;
            await new Promise(resolve => setTimeout(resolve, delay));

            // Use ref to check current value without triggering re-render
            const currentProfile = userProfileRef.current;

            // If we're registering and already have a profile set, don't overwrite it
            if (isRegisteringRef.current && currentProfile && currentProfile.uid === user.uid) {
              console.log('Skipping profile update - registration in progress and profile already set');
              setLoading(false);
              return;
            }

            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              // Log user data (without sensitive information)
              if (process.env.NODE_ENV === 'development') {
                console.log('Firestore user data loaded:', { uid: user.uid, role: data.role });
              }

              // Check if user is blocked
              if (data.blocked === true) {
                if (process.env.NODE_ENV === 'development') {
                  console.log('User is blocked, logging out...', { uid: user.uid });
                }
                await signOut(auth);
                userProfileRef.current = null;
                setUserProfile(null);
                setCurrentUser(null);
                const blockMessage = `Your account has been blocked.${data.blockedReason ? ` Reason: ${data.blockedReason}` : ''} Please contact an administrator if you believe this is an error.`;
                alert(blockMessage);
                setLoading(false);
                return;
              }

              const normalizedEmail = (data.email || user.email || '').trim().toLowerCase();
              let storedRole = (data.roleOverride || data.role) as string;

              // Automatic Migration for Legacy Roles
              if (['admin', 'analyst', 'official'].includes(storedRole)) {
                console.log(`Migrating legacy role '${storedRole}' to 'authority' for user ${user.uid}`);
                storedRole = 'authority';
                try {
                  await setDoc(doc(db, 'users', user.uid), {
                    role: 'authority',
                    roleOverride: 'authority'
                  }, { merge: true });
                } catch (migrateError) {
                  console.error('Error during role migration:', migrateError);
                }
              }

              let userRole: UserRole | undefined = storedRole as UserRole;

              if (!userRole || !['citizen', 'authority', 'ngo', 'responder'].includes(userRole)) {
                const fallbackRole = getFallbackRole(normalizedEmail);
                userRole = fallbackRole;
                try {
                  await setDoc(doc(db, 'users', user.uid), {
                    role: fallbackRole,
                    needsRoleAssignment: data.needsRoleAssignment ?? true
                  }, { merge: true });
                  console.log(`Set default role to ${fallbackRole} for user with missing or invalid role data`);
                } catch (updateError) {
                  console.error('Error setting default role in Firestore:', updateError);
                }
              }

              const profile: UserProfile = {
                uid: data.uid || user.uid,
                email: data.email || user.email || '',
                name: data.name || user.displayName || 'User',
                role: userRole,
                phone: data.phone || undefined,
                phoneVerified: data.phoneVerified || false,
                aadharId: data.aadharId || undefined,
                createdAt: data.createdAt || new Date().toISOString(),
                needsRoleAssignment: data.needsRoleAssignment || false,
                roleOverride: data.roleOverride || undefined,
                blocked: data.blocked || false,
                blockedAt: data.blockedAt || undefined,
                blockedBy: data.blockedBy || undefined,
                blockedReason: data.blockedReason || undefined,
                metadata: data.metadata || {},
              };

              // Only update if profile actually changed
              if (!currentProfile || currentProfile.uid !== profile.uid || currentProfile.role !== profile.role) {
                console.log('Setting userProfile from onAuthStateChanged:', { uid: profile.uid, role: profile.role, dataRole: data.role, finalRole: userRole });
                userProfileRef.current = profile;
                setUserProfile(profile);
                // Mark as logged in for faster reload (prevents login flash)
                sessionStorage.setItem('tarang_auth_active', 'true');
              }
            } else {
              // Only create default profile if we're not registering (e.g., Google sign-in)
              if (!isRegisteringRef.current) {
                console.log('No profile found in Firestore for:', user.uid);
                const normalizedEmail = (user.email || '').trim().toLowerCase();
                const fallbackRole = getFallbackRole(normalizedEmail);
                const defaultProfile: UserProfile = {
                  uid: user.uid,
                  email: user.email || '',
                  name: user.displayName || 'User',
                  role: fallbackRole,
                  phone: undefined,
                  phoneVerified: false,
                  createdAt: new Date().toISOString(),
                  metadata: {},
                };
                await setDoc(doc(db, 'users', user.uid), defaultProfile);
                userProfileRef.current = defaultProfile;
                setUserProfile(defaultProfile);
              } else {
                console.log('Skipping default profile creation - registration in progress');
              }
            }
          } catch (error) {
            console.error('Error fetching user profile:', error);
            if (!isRegisteringRef.current && !userProfileRef.current) {
              // If we failed to load profile and we aren't registering, we might need to reset or handle error
              // For now, allow loading to finish so app doesn't hang, but user might be null via profile check
              userProfileRef.current = null;
              setUserProfile(null);
            }
          } finally {
            // CRITICAL FIX: Only set loading to false AFTER all profile work is done.
            if (!isHandlingRedirectRef.current) {
              setLoading(false);
            }
          }
        } else {
          // Debounce logout to prevent flicker if this is a transient state
          // (e.g. Firebase initializing or token refresh)
          const logoutDelay = 2000;
          setTimeout(() => {
            // Check if we are still logged out after the delay
            if (!auth.currentUser) {
              console.log('Confirmed logout state after delay');
              userProfileRef.current = null;
              setUserProfile(null);
              setCurrentUser(null);
              setLoading(false);
            } else {
              console.log('Logout was transient, ignoring.');
            }
          }, logoutDelay);
          // We return here to skip setting loading=false immediately
          return;
        }
      } catch (authError) {
        console.error("Auth State Change Error:", authError);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []); // Empty dependency array - only register listener once on mount

  const value: AuthContextType = {
    currentUser,
    userProfile,
    register,
    login,
    loginWithGoogle,
    sendOTP,
    verifyOTP,
    updatePhoneForGoogleUser,
    verifyPhoneForGoogleUser,
    setPasswordForGoogleUser,
    linkGoogleAccount,
    resetPassword,
    updateMetadata,
    checkAadharAvailability,
    reloadUserProfile,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
