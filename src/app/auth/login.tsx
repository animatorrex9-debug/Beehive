import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signInWithPopup, 
  GoogleAuthProvider,
  signOut,
  sendEmailVerification
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, isConfigured } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Logo } from '../../components/Logo';
import { ThemeToggle } from '../../components/ThemeToggle';
import { FirebaseSetupGuide } from '../../components/FirebaseSetupGuide';
import { ArrowLeft, Mail, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

export const LoginPage = () => {
  const { user, isAdmin, loading: authLoading, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user && user.emailVerified) {
      if (isAdmin) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        navigate('/auth/verify-email');
        setLoading(false);
        return;
      }

      // Fetch user role from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        setError('User profile not found.');
        await signOut(auth);
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      const role = userData.role;

      if (role === 'admin' || role === 'account_manager') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      let msg = 'Failed to log in';
      const errCode = err.code || '';
      const errMsg = err.message || '';
      
      if (errCode === 'auth/user-not-found' || errMsg.includes('user-not-found')) msg = 'No account found with this email.';
      else if (errCode === 'auth/wrong-password' || errMsg.includes('wrong-password')) msg = 'Incorrect password.';
      else if (errCode === 'auth/invalid-credential' || errMsg.includes('invalid-credential')) msg = 'Invalid email or password.';
      else if (errCode === 'auth/too-many-requests' || errMsg.includes('too-many-requests')) msg = 'Too many failed attempts. Please try again later.';
      else if (errCode === 'auth/unauthorized-domain' || errMsg.includes('unauthorized-domain')) msg = 'This domain is not authorized in Firebase. Please add it to Authorized Domains in Firebase Console.';
      else if (errCode === 'auth/network-request-failed' || errMsg.includes('network-request-failed')) msg = 'Network error. This is often caused by ad-blockers, VPNs, or incorrect Firebase Auth Domain settings. Please try disabling extensions or use Incognito mode.';
      else if (errCode === 'auth/internal-error' || errMsg.includes('internal-error')) msg = 'Internal Firebase error. This often happens if the API key is invalid.';
      else msg = errMsg || msg;
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user exists in Firestore, if not create (for Google login)
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      let role = 'user';

      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          fullName: user.displayName || '',
          email: user.email || '',
          phone: user.phoneNumber || '',
          role: 'user',
          kycStatus: 'unverified',
          createdAt: new Date().toISOString(),
          emailVerified: user.emailVerified,
        });
      } else {
        role = userDoc.data().role;
      }

      if (role === 'admin' || role === 'account_manager') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isConfigured) return <FirebaseSetupGuide />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white dark:bg-primary">
      <div className="absolute top-6 left-6 flex items-center gap-4">
        <Link to="/" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
          <ArrowLeft className="w-6 h-6 dark:text-white" />
        </Link>
        <Logo className="h-6" />
      </div>
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <h1 className="text-4xl font-black tracking-tighter mb-2 dark:text-white">WELCOME BACK</h1>
        <p className="text-gray-500 mb-8">Log in to manage your loans and applications.</p>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-100 text-green-600 p-4 rounded-xl flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              {success}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold dark:text-white">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="email" 
                required
                className="input-field pl-12" 
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold dark:text-white">Password</label>
              <button 
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-accent font-bold hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="password" 
                required
                className="input-field pl-12" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary w-full text-lg py-4 mt-4"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-primary px-2 text-gray-500">Or continue with</span>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 dark:border-zinc-800 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors dark:text-white font-bold"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Google
          </button>
        </form>

        <p className="text-center mt-8 text-gray-500">
          Don't have an account? <Link to="/auth/signup" className="text-accent font-bold hover:underline">Sign Up</Link>
        </p>
      </motion.div>
    </div>
  );
};
