import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { UserRole, UserProfile } from '../types/auth';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isSupervisor: boolean;
  isExecutive: boolean;
  isHrIntern: boolean;
  isHrStaff: boolean;
  isTeamMemberOnly: boolean;
  canSendEmail: boolean;
  canViewCNIC: boolean;
  canMakeHiringDecisions: boolean;
  login: (e: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch idTokenResult for custom claims
        const tokenResult = await firebaseUser.getIdTokenResult(true);
        const claimedRole = (tokenResult.claims.role as UserRole) || null;

        // Fetch User profile from Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          setProfile(data);
          setRole(claimedRole || data.role || 'TEAM_MEMBER');
        } else {
          // Fallback if user document hasn't been created yet
          const fallbackRole = claimedRole || 'TEAM_MEMBER';
          setRole(fallbackRole);
          setProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'User',
            role: fallbackRole,
          });
        }
      } else {
        setUser(null);
        setProfile(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const isSuperAdmin = role === 'SUPER_ADMIN' || role === 'OWNER';
  const isSupervisor = isSuperAdmin || role === 'HR_SUPERVISOR';
  const isExecutive = isSupervisor || role === 'HR_EXECUTIVE';
  const isHrIntern = isExecutive || role === 'HR_INTERN';
  const isHrStaff = ['SUPER_ADMIN', 'OWNER', 'HR_SUPERVISOR', 'HR_EXECUTIVE', 'HR_INTERN'].includes(role || '');
  const isTeamMemberOnly = role === 'TEAM_MEMBER';
  const canSendEmail = isSupervisor || isExecutive;
  const canViewCNIC = isSupervisor || isSuperAdmin;
  const canMakeHiringDecisions = isSupervisor || isSuperAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        loading,
        isSuperAdmin,
        isSupervisor,
        isExecutive,
        isHrIntern,
        isHrStaff,
        isTeamMemberOnly,
        canSendEmail,
        canViewCNIC,
        canMakeHiringDecisions,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};