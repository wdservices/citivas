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
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

// Android-type OAuth client from Firebase project citivas-5489a (project
// number 802907376648). Android clients accept the citivas:// custom-scheme
// redirect used below; Web-type clients do not (they caused Google's
// "Access blocked / Error 400: invalid_request" screen).
const GOOGLE_ANDROID_CLIENT_ID =
  '802907376648-nqonfgq5oq8mf25qpui5rt12ucf77v5i.apps.googleusercontent.com';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

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

async function nativeGoogleSignIn(): Promise<string | null> {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'citivas' });

  const request = new AuthSession.AuthRequest({
    clientId: GOOGLE_ANDROID_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    extraParams: {
      prompt: 'select_account',
    },
  });

      const result = await request.promptAsync(discovery);

  if (result.type === 'success' && result.params.code) {
    const tokenResult = await AuthSession.exchangeCodeAsync(
      {
        clientId: GOOGLE_ANDROID_CLIENT_ID,
        code: result.params.code,
        redirectUri,
        extraParams: {
          code_verifier: request.codeVerifier || '',
        },
      },
      discovery
    );
    return tokenResult.idToken;
  }

  return null;
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
