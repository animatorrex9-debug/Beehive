import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  signInWithPopup, 
  GoogleAuthProvider
} from 'firebase/auth';
import { auth, isConfigured } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Logo } from '../../components/Logo';
import { ThemeToggle } from '../../components/ThemeToggle';
import { FirebaseSetupGuide } from '../../components/FirebaseSetupGuide';
import { ArrowLeft, AlertCircle, ShieldCheck } from 'lucide-react';

export const SignupPage = () => {
  const { user, userData, isAdmin, loading: authLoading, isConfigured } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user && user.emailVerified && userData) {
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
  }, [user, userData, isAdmin, authLoading, navigate]);

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // useAuth will handle profile creation/linking and the useEffect will handle navigation
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
          <Logo className="h-5" />
        </div>
        <ThemeToggle />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-10"
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
          <div className="space-y-8">
            <div className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl flex items-center gap-3 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button 
                type="button"
                onClick={handleGoogleSignup}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-6 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all dark:text-white font-bold text-base shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-50"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                Continue with Google
              </button>

              <p className="text-[11px] text-gray-400 text-center px-8 leading-relaxed">
                By signing up, you agree to our <Link to="/legal/terms" className="text-accent hover:underline">Terms of Service</Link> and <Link to="/legal/privacy" className="text-accent hover:underline">Privacy Policy</Link>.
              </p>
            </div>

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
