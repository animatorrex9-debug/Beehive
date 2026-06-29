import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'supabase/db';
import { db, handleSupabaseError, OperationType } from '../../lib/supabase-service';
import { useAuth } from '../../hooks/useAuth';
import { Logo } from '../../components/Logo';
import { ThemeToggle } from '../../components/ThemeToggle';
import { Globe, ArrowRight, AlertCircle, ChevronDown, Check } from 'lucide-react';

import { useCurrency } from '../../context/CurrencyContext';

const ALL_COUNTRIES = [
  "United States", "United Kingdom", "Nigeria", "Canada", "Australia", 
  "Germany", "France", "Italy", "Spain", "Japan", "China", "India", 
  "South Africa", "United Arab Emirates", "Saudi Arabia", "Egypt", 
  "Kenya", "Ghana", "Afghanistan", "Albania", "Algeria", "Andorra", 
  "Angola", "Argentina", "Armenia", "Austria", "Azerbaijan", "Bahamas", 
  "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", 
  "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", 
  "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", 
  "Cambodia", "Cameroon", "Central African Republic", "Chad", "Chile", 
  "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", 
  "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", 
  "Ecuador", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", 
  "Eswatini", "Ethiopia", "Fiji", "Finland", "Gabon", "Gambia", "Georgia", 
  "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", 
  "Haiti", "Honduras", "Hungary", "Iceland", "Indonesia", "Iran", "Iraq", 
  "Ireland", "Israel", "Jamaica", "Jordan", "Kazakhstan", "Kuwait", 
  "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", 
  "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", 
  "Maldives", "Mali", "Malta", "Mauritania", "Mauritius", "Mexico", "Moldova", 
  "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", 
  "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "North Korea", 
  "North Macedonia", "Norway", "Oman", "Pakistan", "Palestine", "Panama", 
  "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", 
  "Qatar", "Romania", "Russia", "Rwanda", "Samoa", "San Marino", "Senegal", 
  "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", 
  "Somalia", "South Korea", "South Sudan", "Sri Lanka", "Sudan", "Suriname", 
  "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", 
  "Togo", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Uganda", 
  "Ukraine", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", 
  "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

export const CompleteProfilePage = () => {
  const { user, userData, loading: authLoading, refreshUserData } = useAuth();
  const { setCurrencyByCountry } = useCurrency();
  const [country, setCountry] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && userData?.country) {
      if (userData.role === 'admin') {
        navigate('/admin');
      } else if (userData.role === 'account_manager') {
        navigate('/manager');
      } else {
        navigate('/dashboard');
      }
    }
  }, [userData, authLoading, navigate]);

  useEffect(() => {
    // Detect country based on IP
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data.country_name) {
          // Verify if it is in our list
          const matched = ALL_COUNTRIES.find(c => c.toLowerCase() === data.country_name.toLowerCase());
          if (matched) {
            setCountry(matched);
          } else if (data.country_name) {
            setCountry(data.country_name);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!country.trim()) {
      setError('Please select or enter your country');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('[CompleteProfile] Submitting country:', country);
      const userRef = doc(db, 'users', user.uid);
      
      // Use updateDoc which throws proper errors on failure
      console.log('[CompleteProfile] Updating Firestore document via updateDoc...');
      await updateDoc(userRef, {
        country: country.trim(),
        updatedAt: new Date().toISOString()
      });
      console.log('[CompleteProfile] Firestore document updated successfully');

      // Await the currency update
      console.log('[CompleteProfile] Updating currency settings...');
      await setCurrencyByCountry(country.trim());
      console.log('[CompleteProfile] Currency settings updated');
      
      console.log('[CompleteProfile] Profile updated successfully, refreshing user data...');
      const freshData = await refreshUserData();
      
      if (!freshData || !freshData.country) {
        throw new Error('Verification failed: The country field was not successfully saved to your database. Please check your Supabase schema and RLS policies.');
      }

      console.log('[CompleteProfile] Navigating to target dashboard...');
      const targetRole = freshData?.role || userData?.role || 'user';
      if (targetRole === 'admin') {
        navigate('/admin');
      } else if (targetRole === 'account_manager') {
        navigate('/manager');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Error updating profile:', err instanceof Error ? err.message : String(err));
      setError(err.message || 'Failed to update profile');
      handleSupabaseError(err, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredCountries = ALL_COUNTRIES.filter(c =>
    c.toLowerCase().includes(country.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-primary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  // If country is already set, don't show the form (useEffect will handle navigation)
  if (userData?.country) {
    return null;
  }

  if (!user) {
    return null;
  }

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

          <div className="space-y-2" ref={dropdownRef}>
            <label className="text-sm font-bold dark:text-white">Your Country</label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                required
                className="input-field pl-12 pr-10 w-full" 
                placeholder="Search or enter country..."
                value={country}
                onFocus={() => setIsOpen(true)}
                onChange={(e) => {
                  setCountry(e.target.value);
                  setIsOpen(true);
                }}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                onClick={() => setIsOpen(!isOpen)}
              >
                <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute left-0 right-0 mt-2 max-h-60 overflow-y-auto rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-xl z-50 py-2"
                  >
                    {filteredCountries.length > 0 ? (
                      filteredCountries.map((c) => {
                        const isSelected = country.toLowerCase() === c.toLowerCase();
                        return (
                          <button
                            key={c}
                            type="button"
                            className={`w-full text-left px-5 py-3 text-sm flex items-center justify-between transition-colors
                              ${isSelected 
                                ? 'bg-accent/10 text-accent font-bold' 
                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800'
                              }
                            `}
                            onClick={() => {
                              setCountry(c);
                              setIsOpen(false);
                            }}
                          >
                            <span>{c}</span>
                            {isSelected && <Check className="w-4 h-4 text-accent" />}
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-5 py-4 text-sm text-gray-500 text-center">
                        No matches found. Press enter to save as entered.
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
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
