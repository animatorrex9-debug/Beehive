import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, RefreshCw, AlertCircle, CheckCircle2, LogOut } from 'lucide-react';
import { auth, isConfigured } from '../../lib/firebase';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { Logo } from '../../components/Logo';
import { FirebaseSetupGuide } from '../../components/FirebaseSetupGuide';
import { useAuth } from '../../hooks/useAuth';

export const VerifyEmailPage = () => {
  if (!isConfigured) return <FirebaseSetupGuide />;

  const { user, reloadUser, userData } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // If already verified or admin, redirect immediately
  useEffect(() => {
    if (user) {
      if (user.emailVerified || user.email === 'animatorrex9@gmail.com') {
        if (userData?.country) {
          navigate('/dashboard');
        } else {
          navigate('/auth/complete-profile');
        }
      }
    } else if (!loading) {
      navigate('/auth/login');
    }
  }, [user, userData, navigate]);

  // Auto-poll verification status every 4 seconds
  useEffect(() => {
    if (!user || user.emailVerified) return;

    const interval = setInterval(async () => {
      try {
        await reloadUser();
      } catch (err) {
        console.error('Error auto-reloading user:', err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [user, reloadUser]);

  const handleCheckStatus = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await reloadUser();
      if (auth.currentUser?.emailVerified) {
        setSuccess('Email verified! Redirecting...');
      } else {
        setError('Email not verified yet. Please check your inbox and click the verification link.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check verification status.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!auth.currentUser) {
      setError('Session expired. Please log in again to resend verification.');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await sendEmailVerification(auth.currentUser);
      setSuccess('Verification email resent! Please check your inbox.');
    } catch (err: any) {
      console.error('Resend verification error:', err instanceof Error ? err.message : String(err));
      let msg = 'Failed to resend verification email.';
      const errCode = err.code || '';
      const errMsg = err.message || '';
      
      if (errCode === 'auth/too-many-requests' || errMsg.includes('too-many-requests') || errMsg.toLowerCase().includes('rate limit') || errMsg.toLowerCase().includes('45 seconds') || errMsg.toLowerCase().includes('security purposes')) msg = 'Verification email limit exceeded. Please wait 45 seconds before trying again, or check your spam folder for previous links.';
      else if (errCode === 'auth/unauthorized-domain' || errMsg.includes('unauthorized-domain')) msg = 'This domain is not authorized in Firebase. Please add it to Authorized Domains in Firebase Console.';
      else if (errCode === 'auth/network-request-failed' || errMsg.includes('network-request-failed')) msg = 'Network error. Please check your connection.';
      else msg = errMsg || msg;
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/auth/login');
    } catch (err: any) {
      setError('Failed to log out.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-primary p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <Logo className="h-8 mx-auto mb-8" />
          <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-accent" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter dark:text-white mb-4 uppercase">Check your email</h1>
          <p className="text-gray-500 text-lg">
            We've sent a verification code or link to your email address. Please check your inbox and confirm your account.
          </p>
        </div>

        <div className="card space-y-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-6 rounded-3xl shadow-sm">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 p-4 rounded-2xl text-xs md:text-sm text-blue-700 dark:text-blue-300">
            <p className="font-bold mb-1">Didn't receive the email?</p>
            <ul className="list-disc list-inside space-y-1 opacity-80">
              <li>Check your spam or junk folder</li>
              <li>Verify that <span className="font-bold">{user?.email}</span> is correct</li>
              <li>Wait a few minutes and try again</li>
            </ul>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-100 text-green-600 p-4 rounded-2xl flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              {success}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleCheckStatus}
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-base font-bold rounded-2xl"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              I Have Verified My Email
            </button>

            <button
              onClick={handleResend}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-gray-200 dark:border-zinc-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors font-semibold text-gray-700 dark:text-gray-300"
            >
              <RefreshCw className="w-4 h-4" />
              Resend Verification Email
            </button>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between">
            <Link 
              to="/auth/login" 
              className="flex items-center gap-2 text-gray-500 hover:text-accent font-bold transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>

            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-500 hover:text-red-600 font-bold transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </div>
        </div>

        <p className="text-center mt-8 text-gray-400 text-sm">
          &copy; {new Date().getFullYear()} QuickLoan. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
};
