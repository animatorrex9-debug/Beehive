import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { sendEmailVerification } from 'firebase/auth';
import { Logo } from '../../components/Logo';

export const VerifyEmailPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      setError(err.message || 'Failed to resend verification email.');
    } finally {
      setLoading(false);
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
            We've sent a verification link to your email address. Please click the link to confirm your account.
          </p>
        </div>

        <div className="card space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl text-sm text-blue-700 dark:text-blue-300">
            <p className="font-bold mb-1">Didn't receive the email?</p>
            <ul className="list-disc list-inside space-y-1 opacity-80">
              <li>Check your spam or junk folder</li>
              <li>Verify if your email address is correct</li>
              <li>Wait a few minutes and try again</li>
            </ul>
          </div>

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

          <button
            onClick={handleResend}
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
            Resend Verification Email
          </button>

          <Link 
            to="/auth/login" 
            className="flex items-center justify-center gap-2 text-gray-500 hover:text-accent font-bold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>

        <p className="text-center mt-8 text-gray-400 text-sm">
          &copy; {new Date().getFullYear()} QuickLoan. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
};
