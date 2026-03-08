import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Logo } from '../../components/Logo';
import { ThemeToggle } from '../../components/ThemeToggle';
import { Mail, Lock, AlertCircle, ShieldCheck } from 'lucide-react';

export const AdminLoginPage = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      navigate('/admin');
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch user role from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        setError('Admin profile not found.');
        await signOut(auth);
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      const role = userData.role;

      if (role === 'admin' || role === 'account_manager') {
        navigate('/admin');
      } else {
        setError('Access denied. You do not have administrative privileges.');
        await signOut(auth);
      }
    } catch (err: any) {
      console.error('Admin login error:', err);
      let msg = 'Failed to log in';
      const errCode = err.code || '';
      const errMsg = err.message || '';
      
      if (errCode === 'auth/user-not-found' || errMsg.includes('user-not-found')) msg = 'No admin account found with this email.';
      else if (errCode === 'auth/wrong-password' || errMsg.includes('wrong-password')) msg = 'Incorrect password.';
      else if (errCode === 'auth/invalid-credential' || errMsg.includes('invalid-credential')) msg = 'Invalid email or password.';
      else if (errCode === 'auth/network-request-failed' || errMsg.includes('network-request-failed')) msg = 'Network error. Please check your internet connection or Firebase configuration.';
      else msg = errMsg || msg;
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-primary">
      <div className="absolute top-6 left-6">
        <Logo className="h-6" />
      </div>
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-800"
      >
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-accent/10 rounded-full">
            <ShieldCheck className="w-8 h-8 text-accent" />
          </div>
        </div>
        
        <h1 className="text-2xl font-black text-center tracking-tight mb-2 dark:text-white uppercase">Admin Portal</h1>
        <p className="text-gray-500 text-center text-sm mb-8">Secure access for administrators and managers.</p>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold dark:text-white">Admin Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="email" 
                required
                className="input-field pl-12 bg-gray-50 dark:bg-zinc-800" 
                placeholder="admin@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold dark:text-white">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="password" 
                required
                className="input-field pl-12 bg-gray-50 dark:bg-zinc-800" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary w-full text-lg py-4 mt-4 shadow-lg shadow-accent/20"
          >
            {loading ? 'Authenticating...' : 'Access Dashboard'}
          </button>
        </form>
      </motion.div>
      
      <p className="mt-8 text-xs text-gray-400 uppercase tracking-widest font-bold">
        Authorized Personnel Only
      </p>
    </div>
  );
};
