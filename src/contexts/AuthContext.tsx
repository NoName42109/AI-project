import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../../services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export type UserRole = 'student' | 'teacher' | 'admin';

interface AuthState {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, role: null, loading: true });

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [state, setState] = useState<AuthState>({ user: null, role: null, loading: true });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const role = userDoc.exists() ? (userDoc.data().role as UserRole) : 'student';
          setState({ user: firebaseUser, role, loading: false });
        } catch (error) {
          console.error("Error fetching user role:", error);
          setState({ user: firebaseUser, role: 'student', loading: false });
        }
      } else {
        setState({ user: null, role: null, loading: false });
      }
    });
    return unsubscribe;
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
