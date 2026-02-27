import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../../services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
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
    let unsubscribeDoc: () => void;
    
    // Timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isMounted && state.loading) {
        setState(prev => ({ ...prev, loading: false, error: true }));
      }
    }, 5000);

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (!isMounted) return;
      
      if (unsubscribeDoc) {
        unsubscribeDoc();
      }

      if (firebaseUser) {
        // Use onSnapshot to listen for role changes (fixes race condition during registration)
        unsubscribeDoc = onSnapshot(doc(db, 'users', firebaseUser.uid), 
          (userDoc) => {
            if (!isMounted) return;
            // Always trust Firestore for role, never frontend state
            const role = userDoc.exists() ? (userDoc.data().role as UserRole) : 'student';
            setState({ user: firebaseUser, role, loading: false, error: false });
            clearTimeout(timeoutId);
          },
          (error) => {
            console.error("Error fetching user role:", error);
            if (isMounted) {
              setState({ user: firebaseUser, role: 'student', loading: false, error: false });
              clearTimeout(timeoutId);
            }
          }
        );
      } else {
        setState({ user: null, role: null, loading: false, error: false });
        clearTimeout(timeoutId);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
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
