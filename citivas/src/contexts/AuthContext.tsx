import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  browserPopupRedirectResolver,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

// Native Google sign-in goes through the Google Sign-In SDK instead of a
// browser OAuth flow. Google now rejects custom-URI-scheme redirects for
// Android OAuth clients ("Custom URI scheme is not enabled for your Android
// client"), so expo-auth-session cannot complete on Android. The SDK signs in
// against the Android OAuth client registered for package com.bwtng.citivas
// (SHA-1 02:AD:A4:22:04:A2:A6:D1:D2:F4:50:FD:2E:9F:71:0C:88:55:F0:64)
// automatically — no client ID needed here.
//
// The ID token handed to Firebase must be minted for a WEB OAuth client
// (Firebase's signInWithIdp validates the token audience). This is the web
// client auto-created by Firebase for project citivas-5489a.
const GOOGLE_WEB_CLIENT_ID =
  '802907376648-ndpcsicj3fp7b5fp25jgq3b01g53s0bt.apps.googleusercontent.com';

interface User {
  id: string;
  name: string;
  email: string;
  photoURL?: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmailPassword: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapFirebaseUser(firebaseUser: FirebaseUser): User {
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
    email: firebaseUser.email || '',
    photoURL: firebaseUser.photoURL,
  };
}

async function mirrorUserToFirestore(firebaseUser: FirebaseUser) {
  try {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const existing = await getDoc(userRef);
    await setDoc(
      userRef,
      {
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        email: firebaseUser.email || '',
        lastSeenAt: serverTimestamp(),
        ...(!existing.exists() && { createdAt: serverTimestamp() }),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Failed to mirror user to Firestore:', error);
  }
}

let googleSigninReady = false;

async function nativeGoogleSignIn(): Promise<string | null> {
  if (!googleSigninReady) {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      scopes: ['profile', 'email'],
    });
    googleSigninReady = true;
  }

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result = await GoogleSignin.signIn();

  if (result.type !== 'success') {
    return null;
  }
  return result.data.idToken;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ? mapFirebaseUser(firebaseUser) : null);
      setIsLoading(false);
      if (firebaseUser) mirrorUserToFirestore(firebaseUser);
    });
    return unsubscribe;
  }, []);

  const loginWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmailPassword = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const loginWithGoogle = async () => {
    if (Platform.OS === 'web') {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    } else {
      const idToken = await nativeGoogleSignIn();
      if (!idToken) throw new Error('Google sign-in was cancelled');
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        loginWithEmail,
        signUpWithEmailPassword,
        resetPassword,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
