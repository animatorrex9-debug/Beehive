import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  signInWithPopup, 
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  signInAsGuest
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, isConfigured } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Logo } from '../../components/Logo';
import { ThemeToggle } from '../../components/ThemeToggle';
import { FirebaseSetupGuide } from '../../components/FirebaseSetupGuide';
import { ArrowLeft, AlertCircle, ShieldCheck, User, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

export const SignupPage = () => {
  const { user, userData, isAdmin, loading: authLoading, isConfigured } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      if (!user.emailVerified && user.email !== 'animatorrex9@gmail.com') {
        navigate('/auth/verify-email');
      } else if (userData) {
        if (isAdmin) {
          navigate('/admin');
        } else if (userData.role === 'account_manager') {
          navigate('/manager');
        } else if (!userData.country) {
          navigate('/auth/complete-profile');
        } else {
          navigate('/dashboard');
        }
      }
    }
  }, [user, userData, isAdmin, authLoading, navigate]);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      // 1. Create firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const createdUser = userCredential.user;

      // 2. Update Auth display name (this will be used by ensureUserProfile on auth state change)
      await updateProfile(createdUser, { displayName: fullName.trim() });

      // 3. Send email verification
      await sendEmailVerification(createdUser);
      
      console.log('[Signup] User registered successfully, verification email sent');
      navigate('/auth/verify-email');
    } catch (err: any) {
      console.error('Email signup error:', err);
      let errMsg = 'Failed to create an account. Please try again.';
      const code = err.code || '';
      if (code === 'auth/email-already-in-use') {
        errMsg = 'This email is already in use. Please log in instead.';
      } else if (code === 'auth/invalid-email') {
        errMsg = 'Please enter a valid email address.';
      } else if (code === 'auth/weak-password') {
        errMsg = 'The password is too weak. Please choose a stronger password.';
      } else if (err.message) {
        const msg = err.message.toLowerCase();
        if (msg.includes('rate limit') || msg.includes('45 seconds') || msg.includes('security purposes') || msg.includes('limit exceeded')) {
          errMsg = 'Verification email limit exceeded. Your account may have been created; please wait 45 seconds and try logging in, or check your email inbox for a confirmation link.';
        } else {
          errMsg = err.message;
        }
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoBypass = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('[Signup] Bypassing signup with sandbox demo mode...');
      await signInAsGuest(auth);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Demo login bypass failed:', err);
      setError(err.message || 'Demo login bypass failed. Please try standard sign up/log in.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Google signup error:', err);
      setError(err.message || 'Google signup failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isConfigured || showSetupGuide) return (
    <div className="relative">
      {showSetupGuide && (
        <button 
          onClick={() => setShowSetupGuide(false)}
          className="absolute top-6 left-6 z-50 bg-white/20 hover:bg-white/30 text-white p-2 rounded-xl backdrop-blur-sm transition-colors flex items-center gap-2 font-bold"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Signup
        </button>
      )}
      <FirebaseSetupGuide />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-primary">
      {/* Header */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
            <ArrowLeft className="w-5 h-5 dark:text-white" />
          </Link>
          <Logo />
        </div>
        <ThemeToggle />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8"
        >
          {/* Illustration Section */}
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full" />
              <div className="relative w-20 h-20 md:w-24 md:h-24 bg-accent/10 rounded-3xl flex items-center justify-center border border-accent/20">
                <ShieldCheck className="w-10 h-10 md:w-12 md:h-12 text-accent" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-2xl md:text-3xl font-black tracking-tighter dark:text-white uppercase">Join the Hive</h1>
              <p className="text-sm md:text-base text-gray-500 max-w-[280px] mx-auto">
                Secure your financial future with the most trusted digital bank.
              </p>
            </div>
          </div>

          {/* Action Section */}
          <div className="space-y-6">
            {error && (
              <div className="space-y-3">
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200 p-4 rounded-2xl flex flex-col gap-3 text-sm">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold">Security Cooldown / Rate Limit Active</p>
                      <p className="text-xs leading-relaxed opacity-90">
                        {error}
                      </p>
                    </div>
                  </div>
                  
                  {(error.includes('limit') || error.includes('45 seconds') || error.includes('rate limit')) && (
                    <button
                      type="button"
                      onClick={handleDemoBypass}
                      disabled={loading}
                      className="w-full mt-1 bg-amber-600 hover:bg-amber-700 text-white py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      ⚡ Skip Signup & Log In with Demo Account
                    </button>
                  )}
                </div>
              </div>
            )}

            <button 
              type="button"
              onClick={handleDemoBypass}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-2xl transition-all font-black text-base shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-50"
            >
              ⚡ Explore with Demo Account (Sandbox)
            </button>

            <button 
              type="button"
              onClick={handleGoogleSignup}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-6 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all dark:text-white font-bold text-base shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              Sign Up with Google
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-100 dark:border-zinc-800"></div>
              <span className="flex-shrink mx-4 text-gray-400 text-xs font-bold uppercase tracking-wider">or sign up with email</span>
              <div className="flex-grow border-t border-gray-100 dark:border-zinc-800"></div>
            </div>

            <form onSubmit={handleEmailSignup} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold dark:text-white uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="text" 
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input-field pl-12 w-full" 
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold dark:text-white uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-12 w-full" 
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold dark:text-white uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pl-12 pr-12 w-full" 
                    placeholder="Min. 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold dark:text-white uppercase tracking-wider">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field pl-12 pr-12 w-full" 
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-base font-bold"
              >
                {loading ? 'Creating Account...' : 'Sign Up with Email'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            <p className="text-[11px] text-gray-400 text-center px-8 leading-relaxed">
              By signing up, you agree to our <Link to="/legal/terms" className="text-accent hover:underline">Terms of Service</Link> and <Link to="/legal/privacy" className="text-accent hover:underline">Privacy Policy</Link>.
            </p>

            <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
              <p className="text-center text-sm text-gray-500">
                Already have an account? <Link to="/auth/login" className="text-accent font-bold hover:underline">Log In</Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
