import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../../services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { LoadingScreen } from '../components/LoadingScreen';

export type UserRole = 'student' | 'teacher' | 'admin';

interface AuthState {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  error: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, role: null, loading: true, error: false });

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [state, setState] = useState<AuthState>({ user: null, role: null, loading: true, error: false });

  useEffect(() => {
    let isMounted = true;
    
    // Timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isMounted && state.loading) {
        setState(prev => ({ ...prev, loading: false, error: true }));
      }
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;
      
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          // Always trust Firestore for role, never frontend state
          const role = userDoc.exists() ? (userDoc.data().role as UserRole) : 'student';
          setState({ user: firebaseUser, role, loading: false, error: false });
        } catch (error) {
          console.error("Error fetching user role:", error);
          setState({ user: firebaseUser, role: 'student', loading: false, error: false });
        }
      } else {
        setState({ user: null, role: null, loading: false, error: false });
      }
      clearTimeout(timeoutId);
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  if (state.loading) {
    return <LoadingScreen message="Đang xác thực tài khoản..." />;
  }

  if (state.error) {
    return <LoadingScreen isError={true} />;
  }

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
