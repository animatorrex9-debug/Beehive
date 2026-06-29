import { supabase } from '../supabase';

// High-fidelity Firebase User structure mapped from Supabase User
export interface FirebaseUserCompat {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  providerData: any[];
  tenantId: string | null;
  reload: () => Promise<void>;
}

export type User = FirebaseUserCompat;

export class AuthCompat {
  private listeners: ((user: FirebaseUserCompat | null) => void)[] = [];
  public currentUser: FirebaseUserCompat | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    // Listen to Supabase auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Supabase Auth Event] ${event}`, session?.user?.email);
      if (session?.user) {
        this.currentUser = await this.mapUser(session.user);
      } else {
        this.currentUser = null;
      }
      this.notifyListeners();
    });

    // Fetch initial user
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      this.currentUser = await this.mapUser(user);
    } else {
      this.currentUser = null;
    }
    this.notifyListeners();
  }

  private async mapUser(sbUser: any): Promise<FirebaseUserCompat> {
    const reload = async () => {
      const { data: { user: latestUser } } = await supabase.auth.getUser();
      if (latestUser) {
        this.currentUser = await this.mapUser(latestUser);
        this.notifyListeners();
      }
    };

    // Get email_verified status
    const emailVerified = !!(
      sbUser.email_confirmed_at || 
      sbUser.user_metadata?.email_verified ||
      sbUser.app_metadata?.provider === 'google'
    );

    return {
      uid: sbUser.id,
      email: sbUser.email || null,
      emailVerified,
      displayName: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || (sbUser.email ? sbUser.email.split('@')[0] : null),
      phoneNumber: sbUser.phone || null,
      photoURL: sbUser.user_metadata?.avatar_url || null,
      isAnonymous: false,
      providerData: [],
      tenantId: null,
      reload
    };
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener(this.currentUser);
      } catch (err) {
        console.error('[Supabase Auth Listener Error]', err);
      }
    }
  }

  public onAuthStateChanged(callback: (user: FirebaseUserCompat | null) => void) {
    this.listeners.push(callback);
    // Call immediately with current state
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  // Support legacy OOP-style auth.signOut()
  public async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    this.currentUser = null;
    this.notifyListeners();
  }
}

// Global Auth Instance
export const authInstance = new AuthCompat();

export function getAuth(app?: any) {
  return authInstance;
}

export function initializeAuth(app: any, options?: any) {
  return authInstance;
}

export const browserLocalPersistence = 'local';
export const indexedDBLocalPersistence = 'indexeddb';
export const browserPopupRedirectResolver = {};

export function onAuthStateChanged(auth: AuthCompat, callback: (user: FirebaseUserCompat | null) => void) {
  return auth.onAuthStateChanged(callback);
}

export async function signInWithEmailAndPassword(auth: AuthCompat, email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  if (!data.user) throw new Error('No user returned from Supabase sign in.');
  return { user: auth.currentUser };
}

export async function createUserWithEmailAndPassword(auth: AuthCompat, email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: email.split('@')[0],
          email_verified: false
        }
      }
    });
    if (error) throw error;
    if (!data.user) throw new Error('No user returned from Supabase sign up.');
    
    const user = auth.currentUser || await (auth as any).mapUser(data.user);
    return { user };
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    const isRateLimit = errMsg.includes('45 seconds') || 
                        errMsg.includes('security purposes') || 
                        errMsg.includes('rate limit');
    if (isRateLimit) {
      console.warn('[Supabase Auth] Rate limit hit during signUp, attempting signIn fallback:', errMsg);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (!error && data.user) {
          const user = auth.currentUser || await (auth as any).mapUser(data.user);
          return { user };
        } else if (error) {
          console.warn('[Supabase Auth] Fallback signIn after rate limit failed:', error.message);
        }
      } catch (signInErr) {
        console.warn('[Supabase Auth] Fallback signIn threw error:', signInErr);
      }
    }
    throw err;
  }
}

export async function signOut(auth: AuthCompat) {
  await auth.signOut();
}

export async function sendEmailVerification(user: FirebaseUserCompat) {
  console.log('[Supabase Auth] Verification email requested for:', user.email);
  return Promise.resolve();
}

export async function updateProfile(user: FirebaseUserCompat, profile: { displayName?: string | null; photoURL?: string | null }) {
  try {
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: profile.displayName,
        avatar_url: profile.photoURL
      }
    });
    if (error) {
      console.warn('[Supabase Auth] Failed to update user profile metadata (expected if no active session yet):', error.message);
    }
  } catch (err: any) {
    console.warn('[Supabase Auth] Ignored error during updateProfile:', err.message || err);
  }
  
  if (user && typeof user.reload === 'function') {
    try {
      await user.reload();
    } catch (e) {
      console.warn('[Supabase Auth] Ignored reload error:', e);
    }
  }
}

// Google Authentication Compatibility
export class GoogleAuthProvider {
  static PROVIDER_ID = 'google.com';
}

export async function signInWithPopup(auth: AuthCompat, provider: any) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  if (error) throw error;
  return { user: auth.currentUser };
}
