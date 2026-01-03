import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase, getCurrentUser, getSession } from "@/lib/supabase";

type SubscriptionStatus = "basic" | "premium" | "expired";
type SubscriptionPlan = "basic" | "standard" | "premium";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: "student" | "tutor" | "admin" | null;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan: SubscriptionPlan;
  canAccessExams: boolean;
  canDownloadOffline: boolean;
  canAccessTutorMode: boolean;
  loading: boolean;
  signIn: (email: string, password?: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signInWithOTP: (phone: string) => Promise<{ error: any }>;
  verifyOTP: (phone: string, token: string) => Promise<{ error: any }>;
  verifyEmailOTP: (email: string, token: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<"student" | "tutor" | "admin" | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>("basic");
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlan>("basic");
  const [canAccessExams, setCanAccessExams] = useState(false);
  const [canDownloadOffline, setCanDownloadOffline] = useState(false);
  const [canAccessTutorMode, setCanAccessTutorMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // Track last synced user to prevent redundant syncs
  const lastSyncedUserId = useRef<string | null>(null);
  const isSyncing = useRef(false);

  const syncUserToBackend = async (user: User) => {
    // Prevent redundant syncs for the same user
    if (lastSyncedUserId.current === user.id || isSyncing.current) {
      return;
    }

    isSyncing.current = true;
    try {
      const response = await fetch("/api/auth/sync-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supabaseId: user.id,
          email: user.email,
          phone: user.phone,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Unknown error" }));
        console.error("Failed to sync user to backend:", error);
        return;
      }

      await response.json();
      lastSyncedUserId.current = user.id;
    } catch (error) {
      console.error("Error syncing user to backend:", error);
    } finally {
      isSyncing.current = false;
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      // Load user role and subscription status
      const [userResponse, subscriptionResponse] = await Promise.all([
        fetch(`/api/auth/me?supabaseId=${userId}`),
        fetch(`/api/auth/subscription?userId=${userId}`)
      ]);
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUserRole(userData.role || "student");
      } else {
        setUserRole("student");
      }
      
      if (subscriptionResponse.ok) {
        const data = await subscriptionResponse.json();
        setSubscriptionStatus(data.status || "basic");
        setSubscriptionPlan(data.plan || "basic");
        setCanAccessExams(data.canAccessExams || false);
        setCanDownloadOffline(data.canDownloadOffline || false);
        setCanAccessTutorMode(data.canAccessTutorMode || false);
      } else {
        setSubscriptionStatus("basic");
        setSubscriptionPlan("basic");
        setCanAccessExams(false);
        setCanDownloadOffline(false);
        setCanAccessTutorMode(false);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      setUserRole("student");
      setSubscriptionStatus("basic");
      setSubscriptionPlan("basic");
      setCanAccessExams(false);
      setCanDownloadOffline(false);
      setCanAccessTutorMode(false);
    }
  };

  // Load session from localStorage on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentSession = await getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          // Sync user to backend
          await syncUserToBackend(currentSession.user);
          await loadUserData(currentSession.user.id);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          // Sync user to backend
          await syncUserToBackend(newSession.user);
          await loadUserData(newSession.user.id);
        } else {
          setUserRole(null);
          setSubscriptionStatus("basic");
          setSubscriptionPlan("basic");
          setCanAccessExams(false);
          setCanDownloadOffline(false);
          setCanAccessTutorMode(false);
          lastSyncedUserId.current = null; // Reset on logout
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password?: string) => {
    try {
      if (password) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        return { error };
      } else {
        // Email OTP
        const { error } = await supabase.auth.signInWithOtp({
          email,
        });
        return { error };
      }
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/email-confirmation`,
        },
      });
      return { data, error };
    } catch (error) {
      return { error };
    }
  };

  const signInWithOTP = async (phone: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const verifyOTP = async (phone: string, token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: "sms",
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const verifyEmailOTP = async (email: string, token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setSubscriptionStatus("basic");
    setSubscriptionPlan("basic");
    setCanAccessExams(false);
    setCanDownloadOffline(false);
    setCanAccessTutorMode(false);
  };

  const refreshSubscription = async () => {
    if (user) {
      await loadUserData(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRole,
        subscriptionStatus,
        subscriptionPlan,
        canAccessExams,
        canDownloadOffline,
        canAccessTutorMode,
        loading,
        signIn,
        signUp,
        signInWithOTP,
        verifyOTP,
        verifyEmailOTP,
        signOut,
        refreshSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

