import { supabase } from '../supabase';

// High-fidelity Supabase User structure
export interface SupabaseUser {
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

export type User = SupabaseUser;

export class SupabaseAuthService {
  private listeners: ((user: SupabaseUser | null) => void)[] = [];
  public currentUser: SupabaseUser | null = null;

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

  private async mapUser(sbUser: any): Promise<SupabaseUser> {
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

  public onAuthStateChanged(callback: (user: SupabaseUser | null) => void) {
    this.listeners.push(callback);
    // Call immediately with current state
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  // Support legacy auth.signOut()
  public async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    this.currentUser = null;
    this.notifyListeners();
  }
}

// Global Auth Instance
export const authInstance = new SupabaseAuthService();

export function getAuth(app?: any) {
  return authInstance;
}

export function initializeAuth(app: any, options?: any) {
  return authInstance;
}

export const browserLocalPersistence = 'local';
export const indexedDBLocalPersistence = 'indexeddb';
export const browserPopupRedirectResolver = {};

export function onAuthStateChanged(auth: SupabaseAuthService, callback: (user: SupabaseUser | null) => void) {
  return auth.onAuthStateChanged(callback);
}

export async function signInWithEmailAndPassword(auth: SupabaseAuthService, email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  if (!data.user) throw new Error('No user returned from Supabase sign in.');
  return { user: auth.currentUser };
}

export async function signInAsGuest(auth: SupabaseAuthService) {
  const guestEmail = 'demo_user@beehive.com';
  const guestPassword = 'DemoPassword123!';
  const fullName = 'Demo User';

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: guestEmail,
      password: guestPassword
    });

    if (error) {
      console.log('[Supabase Auth] Demo user not found, attempting auto-creation...');
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: guestEmail,
        password: guestPassword,
        options: {
          data: {
            full_name: fullName,
            email_verified: true
          }
        }
      });

      if (signUpError) {
        throw signUpError;
      }
      
      const user = auth.currentUser || await (auth as any).mapUser(signUpData.user);
      return { user };
    }

    const user = auth.currentUser || await (auth as any).mapUser(data.user);
    return { user };
  } catch (err) {
    console.error('[Supabase Auth] Demo login bypass failed:', err);
    throw err;
  }
}

export async function createUserWithEmailAndPassword(auth: SupabaseAuthService, email: string, password: string) {
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

export async function signOut(auth: SupabaseAuthService) {
  await auth.signOut();
}

export async function sendEmailVerification(user: SupabaseUser) {
  console.log('[Supabase Auth] Verification email requested for:', user.email);
  return Promise.resolve();
}

export async function updateProfile(user: SupabaseUser, profile: { displayName?: string | null; photoURL?: string | null }) {
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

// Google Authentication
export class GoogleAuthProvider {
  static PROVIDER_ID = 'google.com';
}

export async function signInWithPopup(auth: SupabaseAuthService, provider: any) {
  const redirectUrl = window.location.origin;
  
  console.log('[Supabase Auth] Starting Google OAuth popup flow...', { redirectUrl });
  
  // 1. Get OAuth login URL from Supabase without redirecting the iframe
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true
    }
  });

  if (error) throw error;
  if (!data?.url) throw new Error('Failed to get Google OAuth URL from Supabase.');

  // 2. Open the OAuth provider's login URL in a popup
  const popup = window.open(
    data.url,
    'supabase_google_oauth',
    'width=600,height=700,status=no,resizable=yes,scrollbars=yes'
  );

  if (!popup) {
    throw new Error('Popup blocked! Please allow popups for this website to sign in with Google.');
  }

  // 3. Wait for popup to complete authentication
  return new Promise<{ user: SupabaseUser | null }>((resolve, reject) => {
    let checkTimer: any = null;
    let messageListener: any = null;
 
    const cleanup = () => {
      if (checkTimer) clearInterval(checkTimer);
      if (messageListener) window.removeEventListener('message', messageListener);
    };

    // Fallback: Check if popup was closed by user
    checkTimer = setInterval(() => {
      if (popup.closed) {
        cleanup();
        // Check if session was updated anyway before rejecting
        supabase.auth.getSession().then(async ({ data: { session } }) => {
          if (session?.user) {
            const mappedUser = await (auth as any).mapUser(session.user);
            auth.currentUser = mappedUser;
            (auth as any).notifyListeners();
            resolve({ user: mappedUser });
          } else {
            reject(new Error('Google sign-in was canceled or closed.'));
          }
        });
      }
    }, 1000);

    // Primary: Listen for OAUTH_AUTH_SUCCESS message from popup
    messageListener = async (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        cleanup();
        try {
          popup.close();
        } catch (e) {}

        // Fetch session to load the user in the parent iframe
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const mappedUser = await (auth as any).mapUser(session.user);
          auth.currentUser = mappedUser;
          (auth as any).notifyListeners();
          resolve({ user: mappedUser });
        } else {
          // If session wasn't immediately visible, wait 500ms and try once more
          setTimeout(async () => {
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession?.user) {
              const mappedUser = await (auth as any).mapUser(retrySession.user);
              auth.currentUser = mappedUser;
              (auth as any).notifyListeners();
              resolve({ user: mappedUser });
            } else {
              reject(new Error('Successfully authenticated but failed to fetch user session.'));
            }
          }, 500);
        }
      }
    };

    window.addEventListener('message', messageListener);
  });
}
