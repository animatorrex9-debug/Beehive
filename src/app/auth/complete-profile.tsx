import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Logo } from '../../components/Logo';
import { ThemeToggle } from '../../components/ThemeToggle';
import { Globe, ArrowRight, AlertCircle } from 'lucide-react';

import { useCurrency } from '../../context/CurrencyContext';

export const CompleteProfilePage = () => {
  const { user, userData, loading: authLoading } = useAuth();
  const { setCurrencyByCountry } = useCurrency();
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && userData?.country) {
      navigate('/dashboard');
    }
  }, [userData, authLoading, navigate]);

  useEffect(() => {
    // Detect country based on IP
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data.country_name) {
          setCountry(data.country_name);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!country) {
      setError('Please enter your country');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        country,
        updatedAt: new Date().toISOString()
      });
      await setCurrencyByCountry(country);
      
      // Wait a tiny bit for the snapshot listener to catch up
      // This helps prevent the ProtectedRoute from redirecting back
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white dark:bg-primary">
      <div className="absolute top-6 left-6">
        <Logo className="h-6" />
      </div>
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mx-auto mb-4">
            <Globe className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter dark:text-white">ONE LAST STEP</h1>
          <p className="text-gray-500 mt-2">Please tell us which country you are from to set up your account currency.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold dark:text-white">Your Country</label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                required
                className="input-field pl-12" 
                placeholder="e.g. United States"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary w-full text-lg py-4 flex items-center justify-center gap-2"
          >
            {loading ? 'Saving...' : 'Complete Setup'}
            {!loading && <ArrowRight className="w-5 h-5" />}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
