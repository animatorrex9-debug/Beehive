import React, { useState, useEffect } from 'react';
import { 
  Heart, Send, CheckCircle2, AlertCircle, Globe, Leaf, GraduationCap, 
  Activity, Users, MapPin, Quote, TrendingUp, Clock, Filter, Search, 
  Sparkles, Award, Receipt, RefreshCw, XCircle, ArrowRight, Share2, User,
  ShieldCheck, AlertTriangle, Utensils, Droplets, BookOpen
} from 'lucide-react';
import { BankingFeaturePage } from '../../../components/dashboard/BankingFeaturePage';
import { useAuth } from '../../../hooks/useAuth';
import { useCurrency } from '../../../hooks/useCurrency';
import { useTheme } from '../../../context/ThemeContext';
import { db } from '../../../lib/supabase-service';
import { collection, addDoc, doc, updateDoc, increment, query, where, onSnapshot } from 'supabase/db';

export interface Campaign {
  id: string;
  title: string;
  type: 'personal' | 'general';
  beneficiary: string;
  category: string;
  description: string;
  longDesc?: string;
  image: string;
  goalAmount: number;
  raisedAmount: number;
  donorCount: number;
  createdAt: string; // ISO string
  cycleDays?: number; // 30 for personal, 14 for general
  location?: string;
  organizer?: string;
  isActive?: boolean;
}

const DEFAULT_CAMPAIGNS: Campaign[] = [
  {
    id: 'personal_maya',
    title: 'Emergency Open-Heart Surgery for 5-Year-Old Maya',
    type: 'personal',
    beneficiary: 'Maya Lin (Age 5)',
    category: 'Healthcare',
    goalAmount: 18000,
    raisedAmount: 11450,
    donorCount: 142,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    cycleDays: 30,
    location: 'Chicago, IL, USA',
    organizer: 'Lin Family Emergency Trust',
    image: 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&q=80&w=800',
    description: 'Maya was born with a severe congenital heart defect and urgently needs open-heart corrective surgery at Children\'s Hospital.',
    longDesc: 'Little Maya is a vibrant 5-year-old girl who loves painting and singing. Three months ago, doctors discovered a critical ventricular septal defect requiring immediate surgical repair. Her family has exhausted their savings on ICU stays. Your donation directly funds her life-saving operation, anesthesia, and 4 weeks of post-op cardiac therapy.',
    isActive: true
  },
  {
    id: 'personal_samuel',
    title: 'STEM College Scholarship Fund for Prodigy Samuel',
    type: 'personal',
    beneficiary: 'Samuel Osei',
    category: 'Education',
    goalAmount: 8500,
    raisedAmount: 5200,
    donorCount: 68,
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    cycleDays: 30,
    location: 'Accra, Ghana',
    organizer: 'Future Leaders Education Network',
    image: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&q=80&w=800',
    description: 'Samuel earned a full academic offer at MIT for Robotics, but needs tuition gap funding for books, housing, and lab gear.',
    longDesc: 'Samuel overcame immense adversity in an underserved community to graduate top of his class with 5 award-winning robotics projects. He secured a tuition waiver at MIT, but needs support to cover dorm fees, laptop hardware, and research materials. Helping Samuel build his future empowers an entire community.',
    isActive: true
  },
  {
    id: 'personal_tariq',
    title: 'Rebuilding Flood-Destroyed Home for Tariq\'s Family',
    type: 'personal',
    beneficiary: 'Tariq Al-Hassan & Family',
    category: 'Disaster Relief',
    goalAmount: 12000,
    raisedAmount: 8900,
    donorCount: 115,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    cycleDays: 30,
    location: 'Border Relief Zone',
    organizer: 'Global Family Rebuild Emergency Fund',
    image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=800',
    description: 'A sudden flash flood demolished Tariq\'s home and family bakery. Help them rebuild a safe home and restore their livelihood.',
    longDesc: 'When devastating floodwaters swept through Tariq\'s neighborhood, his family lost everything they had built over 25 years. With 4 young children relying on him, Tariq needs help procuring building materials, timber, roofing, and essential furniture. Every contribution helps put a roof over their heads.',
    isActive: true
  },
  {
    id: 'general_hunger',
    title: 'Global Hunger Initiative & Daily Meal Drives',
    type: 'general',
    beneficiary: 'Underprivileged Children & Families',
    category: 'Hunger Relief',
    goalAmount: 25000,
    raisedAmount: 16800,
    donorCount: 310,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    cycleDays: 14,
    location: 'Sub-Saharan Africa & South Asia',
    organizer: 'Beehive Humanitarian Relief Corp',
    image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=1920',
    description: 'Fighting starvation across vulnerable communities through daily therapeutic food distribution and hot meal centers.',
    longDesc: 'Every day, thousands of young children face severe malnutrition. The Global Hunger Initiative operates emergency meal distribution centers across 12 countries. Donations replenish high-calorie nutrition packets, fresh grains, and clean drinking water kits on a continuous 2-week supply cycle.',
    isActive: true
  },
  {
    id: 'general_healthcare',
    title: 'Pediatric Emergency Healthcare & Trauma Care Fund',
    type: 'general',
    beneficiary: 'Crisis-Zone Hospitals & Urgent Care Clinics',
    category: 'Healthcare',
    goalAmount: 35000,
    raisedAmount: 24200,
    donorCount: 425,
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    cycleDays: 14,
    location: 'Global Emergency Response Units',
    organizer: 'International Health Assistance',
    image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=800',
    description: 'Deploying critical medical supplies, trauma kits, antibiotics, and surgical equipment to frontline health centers.',
    longDesc: 'Hospitals in crisis areas are running dangerously low on basic medical supplies. This fund delivers emergency surgical tools, oxygen tanks, infant incubators, and essential medicine directly to verified medical teams. Operating on a fortnightly renewal model to ensure continuous stock.',
    isActive: true
  },
  {
    id: 'general_cleanwater',
    title: 'Clean Water Wells & Sanitation Infrastructure',
    type: 'general',
    beneficiary: 'Rural Village Communities',
    category: 'Environment',
    goalAmount: 20000,
    raisedAmount: 13500,
    donorCount: 210,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    cycleDays: 14,
    location: 'East Africa & Southeast Asia',
    organizer: 'Pure Water World Project',
    image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=800',
    description: 'Installing solar-powered water filtration pumps and bio-sand filters to eliminate waterborne diseases.',
    longDesc: 'Over 700 million people lack access to clean drinking water. Waterborne illnesses are the leading cause of preventable illness in young children. Our solar-powered filtration pumps provide whole villages with safe, clean water for drinking, cooking, and sanitation.',
    isActive: true
  }
];

export const CharityPage = () => {
  const { user, userData, refreshUserData } = useAuth();
  const { currency, formatAmount, convertAmount } = useCurrency();
  const { setTheme } = useTheme();

  // Set default mode of charity page to light mode
  useEffect(() => {
    setTheme('light');
  }, [setTheme]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // Tab and Filter State
  const [tab, setTab] = useState<'all' | 'personal' | 'general'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Active Selected Campaign for Modal
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [donationAmount, setDonationAmount] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [donorNote, setDonorNote] = useState<string>('');

  // Campaigns and User Donations from DB
  const [dbCampaigns, setDbCampaigns] = useState<Campaign[]>([]);
  const [donations, setDonations] = useState<any[]>([]);

  // Ticker for steady live growth simulation
  const [tickerOffset, setTickerOffset] = useState<number>(0);

  // Live timer tick every 4 seconds to increment ambient numbers at steady rate
  useEffect(() => {
    const timer = setInterval(() => {
      setTickerOffset(prev => prev + 1);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Fetch campaigns from Firestore with default fallback
  useEffect(() => {
    const q = query(collection(db, 'charity_campaigns'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Campaign[];
        setDbCampaigns(list);
      } else {
        setDbCampaigns(DEFAULT_CAMPAIGNS);
      }
    }, (err) => {
      console.warn('Error fetching charity_campaigns, using default campaigns:', err);
      setDbCampaigns(DEFAULT_CAMPAIGNS);
    });

    return () => unsubscribe();
  }, []);

  // Fetch User's Personal Donations
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'donations'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setDonations(data);
    }, (err) => {
      console.error('Error fetching user donations:', err);
    });

    return () => unsubscribe();
  }, [user]);

  // Combined campaigns list merging custom admin campaigns with default campaigns
  const allCampaigns = dbCampaigns.length > 0 
    ? [...dbCampaigns, ...DEFAULT_CAMPAIGNS.filter(def => !dbCampaigns.some(dbc => dbc.id === def.id))]
    : DEFAULT_CAMPAIGNS;

  // Compute calculated live stats for a campaign
  const calculateLiveCampaignStats = (c: Campaign) => {
    const now = Date.now();
    const createdTime = new Date(c.createdAt).getTime() || now;
    const isPersonal = c.type === 'personal';

    if (isPersonal) {
      // Personal cases run for 30 days
      const totalDays = 30;
      const elapsedMs = now - createdTime;
      const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
      const daysLeft = Math.max(0, Math.ceil(totalDays - elapsedDays));
      const isExpired = elapsedDays >= totalDays;

      // Steady rate growth over time
      const steadyGrowth = Math.floor((elapsedDays * 140) + (tickerOffset * 1.5));
      const steadyDonors = Math.floor((elapsedDays * 3) + Math.floor(tickerOffset / 3));

      const totalRaised = (c.raisedAmount || 0) + steadyGrowth;
      const totalDonors = (c.donorCount || 0) + steadyDonors;

      return {
        raised: Math.min(c.goalAmount * 0.98, totalRaised),
        donors: totalDonors,
        daysLeft,
        isExpired,
        cycleText: `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`,
        percent: Math.min(100, Math.round((Math.min(c.goalAmount * 0.98, totalRaised) / c.goalAmount) * 100))
      };
    } else {
      // General cases reset every 2 weeks (14 days)
      const cycleMs = 14 * 24 * 60 * 60 * 1000;
      const elapsedTotalMs = Math.max(0, now - createdTime);
      const cycleIndex = Math.floor(elapsedTotalMs / cycleMs);
      const currentCycleStartMs = createdTime + (cycleIndex * cycleMs);
      const elapsedInCurrentCycleMs = now - currentCycleStartMs;
      const daysInCurrentCycle = elapsedInCurrentCycleMs / (1000 * 60 * 60 * 24);
      const daysLeftInCycle = Math.max(1, Math.ceil(14 - daysInCurrentCycle));

      // Steady rate growth within current 14-day cycle
      // Resets back to zero at the start of every 14-day cycle!
      const steadyGrowthInCycle = Math.floor((daysInCurrentCycle * 850) + (tickerOffset * 2.5));
      const steadyDonorsInCycle = Math.floor((daysInCurrentCycle * 18) + Math.floor(tickerOffset / 2));

      const totalRaised = (c.raisedAmount || 0) + steadyGrowthInCycle;
      const totalDonors = (c.donorCount || 0) + steadyDonorsInCycle;

      return {
        raised: totalRaised % (c.goalAmount + 1), // Resets within bounds
        donors: totalDonors,
        daysLeft: daysLeftInCycle,
        isExpired: false,
        cycleText: `2-Wk Cycle (${daysLeftInCycle}d reset)`,
        percent: Math.min(100, Math.round(((totalRaised % c.goalAmount) / c.goalAmount) * 100))
      };
    }
  };

  // Filter campaigns
  const filteredCampaigns = allCampaigns.filter(c => {
    // Check type tab
    if (tab === 'personal' && c.type !== 'personal') return false;
    if (tab === 'general' && c.type !== 'general') return false;

    // Check expiry for personal cases
    const stats = calculateLiveCampaignStats(c);
    if (c.type === 'personal' && stats.isExpired) return false;

    // Check category
    if (selectedCategory !== 'All' && c.category.toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }

    // Check search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchBen = (c.beneficiary || '').toLowerCase().includes(q);
      const matchCat = (c.category || '').toLowerCase().includes(q);
      return matchTitle || matchBen || matchCat;
    }

    return true;
  });

  // Calculate total user donated amount
  const totalUserDonated = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
  const uniqueCausesSupported = new Set(donations.map(d => d.charityId || d.campaignId)).size;

  // Calculate dynamic presets scaled to the user's active currency
  const presetAmounts = React.useMemo(() => {
    const baseUsdPresets = [10, 25, 50, 100, 250, 500];
    return baseUsdPresets.map(usd => {
      const converted = convertAmount(usd, 'USD', currency.code);
      if (converted >= 10000) return Math.round(converted / 1000) * 1000;
      if (converted >= 1000) return Math.round(converted / 500) * 500;
      if (converted >= 100) return Math.round(converted / 50) * 50;
      if (converted >= 10) return Math.round(converted / 5) * 5;
      return Math.round(converted);
    });
  }, [currency.code, convertAmount]);

  // Handle Donation Submission
  const handleDonateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userData || !selectedCampaign) return;

    const localAmount = Number(donationAmount);
    if (isNaN(localAmount) || localAmount <= 0) {
      setError('Please enter a valid donation amount.');
      return;
    }

    const rawBalanceUSD = userData.walletBalance || 0;
    const localBalance = convertAmount(rawBalanceUSD, 'USD', currency.code);

    if (localAmount > localBalance + 0.001) {
      setError(`Insufficient balance. Your wallet balance is ${formatAmount(rawBalanceUSD)}.`);
      return;
    }

    const amountInUSD = convertAmount(localAmount, currency.code, 'USD');

    setLoading(true);
    setError('');

    try {
      // 1. Deduct raw USD balance from user
      await updateDoc(doc(db, 'users', user.uid), {
        walletBalance: increment(-amountInUSD)
      });
      await refreshUserData();

      // 2. Record transaction in USD for standard history formatting
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'donation',
        amount: amountInUSD,
        localAmount: localAmount,
        currency: currency.code,
        status: 'completed',
        description: `Charity Donation: ${selectedCampaign.title} (${currency.symbol}${localAmount.toLocaleString()})`,
        timestamp: new Date().toISOString()
      });

      // 3. Record donation record
      await addDoc(collection(db, 'donations'), {
        userId: user.uid,
        campaignId: selectedCampaign.id,
        charityId: selectedCampaign.id,
        charityName: selectedCampaign.title,
        beneficiary: selectedCampaign.beneficiary,
        type: selectedCampaign.type,
        amount: amountInUSD,
        localAmount: localAmount,
        currency: currency.code,
        anonymous: isAnonymous,
        donorNote: donorNote,
        timestamp: new Date().toISOString()
      });

      // 4. Increment campaign raised amount (in USD) and donor count in DB
      try {
        await updateDoc(doc(db, 'charity_campaigns', selectedCampaign.id), {
          raisedAmount: increment(amountInUSD),
          donorCount: increment(1)
        });
      } catch (e) {
        // Fallback if doc doesn't exist yet
      }

      setSuccess(true);
      setSelectedCampaign(null);
      setDonationAmount('');
      setDonorNote('');
    } catch (err: any) {
      console.error('Donation error:', err);
      setError('Failed to process donation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const categoryConfigs = [
    { name: 'All', label: 'All Causes', icon: Sparkles, color: 'text-amber-500' },
    { name: 'Healthcare', label: 'Healthcare', icon: Activity, color: 'text-rose-500' },
    { name: 'Hunger Relief', label: 'Food & Hunger', icon: Utensils, color: 'text-orange-500' },
    { name: 'Education', label: 'Education', icon: GraduationCap, color: 'text-blue-500' },
    { name: 'Disaster Relief', label: 'Disaster Relief', icon: AlertTriangle, color: 'text-red-500' },
    { name: 'Environment', label: 'Environment & Water', icon: Leaf, color: 'text-emerald-500' },
  ];

  const getCategoryCount = (catName: string) => {
    if (catName === 'All') return allCampaigns.length;
    return allCampaigns.filter(c => c.category?.toLowerCase() === catName.toLowerCase()).length;
  };

  return (
    <BankingFeaturePage 
      title="Beehive Giving & Charity" 
      description="Direct transparent crowdfunding for personal medical emergencies, urgent human cases, and verified global relief initiatives"
      icon={Heart}
    >
      <div className="space-y-12">

        {/* Success Alert Banner */}
        {success && (
          <div className="p-6 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-3xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black dark:text-white uppercase tracking-tight text-lg">Thank You For Your Generosity!</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Your donation has been successfully processed and delivered to the campaign fund. A tax-deductible receipt is saved in your history.</p>
              </div>
            </div>
            <button 
              onClick={() => setSuccess(false)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Donatekart-Inspired Impact Header */}
        <div className="card bg-gradient-to-r from-red-500/5 via-rose-500/10 to-amber-500/5 bg-white dark:bg-zinc-950 border border-red-100 dark:border-zinc-800 text-zinc-900 dark:text-white p-6 sm:p-8 md:p-10 relative overflow-hidden shadow-xl rounded-[2.5rem]">
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 grid lg:grid-cols-12 gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-5 space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 text-[11px] font-black uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" /> 100% Verified Impact • 0% Platform Fee
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase leading-tight text-zinc-900 dark:text-white">
                Empower Lives Through <span className="text-red-600 dark:text-red-500">Direct Crowdfunding</span>
              </h2>
              <p className="text-zinc-600 dark:text-gray-300 text-sm leading-relaxed">
                Support individual personal emergency cases with a 30-day target timeline, or contribute to general organizational funds operating on transparent 2-week repeating cycles.
              </p>
            </div>

            {/* Hero Image */}
            <div className="lg:col-span-4 relative rounded-3xl overflow-hidden shadow-lg border border-red-100 dark:border-zinc-800 group h-56 sm:h-64 lg:h-full min-h-[220px]">
              <img 
                src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=1000" 
                alt="Hope & Relief Community Charity" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 p-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-2xl border border-white/20 dark:border-zinc-700/50 flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500 fill-current flex-shrink-0 animate-pulse" />
                <div>
                  <p className="text-[11px] font-black uppercase tracking-tight text-zinc-900 dark:text-white">Direct Relief Drive</p>
                  <p className="text-[10px] text-zinc-500 dark:text-gray-400 font-bold">100% of proceeds reach beneficiaries</p>
                </div>
              </div>
            </div>

            {/* Quick Impact Stats Widget */}
            <div className="lg:col-span-3 bg-white/80 dark:bg-zinc-900/80 border border-red-100 dark:border-zinc-800 rounded-3xl p-6 backdrop-blur-md space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
                <span className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-gray-400">Your Lifetime Impact</span>
                <Award className="w-5 h-5 text-accent" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-black text-red-600 dark:text-red-400">{formatAmount(totalUserDonated)}</p>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-gray-400 uppercase tracking-widest">Total Donated</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-zinc-900 dark:text-white">{uniqueCausesSupported}</p>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-gray-400 uppercase tracking-widest">Causes Supported</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar & Cause Section Navigation Tabs */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 pointer-events-none" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search campaigns by title, beneficiary, or location..."
                className="w-full pl-11 pr-10 py-3 bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700/80 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 text-xs sm:text-sm font-medium text-zinc-900 dark:text-white transition-all placeholder:text-gray-400"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Campaign Type Pills (All vs Personal vs General) */}
            <div className="flex bg-gray-100 dark:bg-zinc-800 p-1.5 rounded-2xl">
              <button
                onClick={() => setTab('all')}
                className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  tab === 'all' 
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                All Types
              </button>
              <button
                onClick={() => setTab('personal')}
                className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  tab === 'personal' 
                    ? 'bg-red-500 text-white shadow-md' 
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Personal Cases
              </button>
              <button
                onClick={() => setTab('general')}
                className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  tab === 'general' 
                    ? 'bg-rose-600 text-white shadow-md' 
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                General Causes
              </button>
            </div>
          </div>

          {/* Cause Categories Tabs */}
          <div className="space-y-2.5 pt-3 border-t border-gray-100 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Explore By Cause Category</span>
              <span className="text-[11px] font-bold text-gray-500">
                Showing {filteredCampaigns.length} {filteredCampaigns.length === 1 ? 'campaign' : 'campaigns'}
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {categoryConfigs.map((cat) => {
                const IconComponent = cat.icon;
                const count = getCategoryCount(cat.name);
                const isSelected = selectedCategory === cat.name;

                return (
                  <button
                    key={cat.name}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border ${
                      isSelected
                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-md'
                        : 'bg-gray-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-gray-300 border-gray-200 dark:border-zinc-700/60 hover:bg-gray-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <IconComponent className={`w-3.5 h-3.5 ${isSelected ? 'text-white dark:text-zinc-900' : cat.color}`} />
                    <span>{cat.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isSelected 
                        ? 'bg-white/20 dark:bg-zinc-900/20 text-white dark:text-zinc-900' 
                        : 'bg-gray-200 dark:bg-zinc-700 text-zinc-600 dark:text-gray-300'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Campaigns Grid */}
        <div>
          {filteredCampaigns.length === 0 ? (
            <div className="card p-12 text-center space-y-3 text-gray-400">
              <AlertCircle className="w-12 h-12 mx-auto text-gray-300" />
              <p className="font-bold uppercase tracking-widest text-sm">No Campaigns Found</p>
              <p className="text-xs">Try selecting a different category or clear your search query.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCampaigns.map((c) => {
                const stats = calculateLiveCampaignStats(c);
                const isPersonal = c.type === 'personal';

                return (
                  <div 
                    key={c.id}
                    className="card p-0 overflow-hidden flex flex-col justify-between group hover:border-accent/40 transition-all duration-300 shadow-lg hover:shadow-2xl dark:bg-zinc-900/90"
                  >
                    <div>
                      {/* Image & Badges Header */}
                      <div className="relative h-52 overflow-hidden">
                        <img 
                          src={c.image} 
                          alt={c.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        
                        {/* Type Tag */}
                        <div className="absolute top-3 left-3 flex gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-white shadow-md flex items-center gap-1 ${
                            isPersonal ? 'bg-accent' : 'bg-red-600'
                          }`}>
                            {isPersonal ? <User className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                            {isPersonal ? 'Personal Case' : 'General Cause'}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/20">
                            {c.category}
                          </span>
                        </div>

                        {/* Location */}
                        {c.location && (
                          <div className="absolute bottom-3 left-3 text-[11px] font-bold text-gray-200 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-accent" /> {c.location}
                          </div>
                        )}
                      </div>

                      {/* Card Content */}
                      <div className="p-6 space-y-4">
                        {/* Beneficiary Badge */}
                        <div className="text-[11px] font-bold text-accent uppercase tracking-widest flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Beneficiary: <span className="text-gray-900 dark:text-white font-black">{c.beneficiary}</span>
                        </div>

                        <h3 className="text-lg font-black tracking-tight dark:text-white leading-snug line-clamp-2">
                          {c.title}
                        </h3>

                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                          {c.description}
                        </p>

                        {/* Progress Bar & Stats */}
                        <div className="space-y-2 pt-2">
                          <div className="flex justify-between items-end text-xs">
                            <div>
                              <span className="font-black text-gray-900 dark:text-white text-base">{formatAmount(stats.raised)}</span>
                              <span className="text-gray-400 font-medium"> raised of {formatAmount(c.goalAmount)}</span>
                            </div>
                            <span className="font-black text-accent text-xs">{stats.percent}%</span>
                          </div>

                          <div className="w-full h-2.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                isPersonal ? 'bg-accent' : 'bg-red-600'
                              }`}
                              style={{ width: `${stats.percent}%` }}
                            />
                          </div>

                          <div className="flex justify-between items-center text-[11px] text-gray-500 dark:text-gray-400 pt-1 font-medium">
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-gray-400" /> {stats.donors} Donors
                            </span>
                            <span className={`font-bold flex items-center gap-1 ${
                              isPersonal ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'
                            }`}>
                              <Clock className="w-3.5 h-3.5" /> {stats.cycleText}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="p-6 pt-0">
                      <button 
                        onClick={() => {
                          setSelectedCampaign(c);
                          setDonationAmount('');
                          setError('');
                        }}
                        className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                          isPersonal 
                            ? 'bg-accent hover:bg-accent/90 shadow-accent/20' 
                            : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                        }`}
                      >
                        <Heart className="w-4 h-4 fill-current" />
                        Donate To This Case
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detailed Donation Modal */}
        {selectedCampaign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div 
              onClick={() => setSelectedCampaign(null)} 
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            <div className="relative bg-white dark:bg-zinc-950 rounded-[2.5rem] p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar">
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-white mb-2 ${
                    selectedCampaign.type === 'personal' ? 'bg-accent' : 'bg-red-600'
                  }`}>
                    {selectedCampaign.type === 'personal' ? 'Personal Emergency Case' : 'General Cause Fund'}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black dark:text-white leading-tight">
                    {selectedCampaign.title}
                  </h3>
                  <p className="text-xs font-bold text-accent uppercase tracking-widest mt-1">
                    Beneficiary: {selectedCampaign.beneficiary}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedCampaign(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-zinc-900"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Story Details */}
              <div className="space-y-4 mb-6">
                <div className="h-44 rounded-2xl overflow-hidden relative">
                  <img src={selectedCampaign.image} alt={selectedCampaign.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-3 text-xs text-white font-bold flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-accent" /> {selectedCampaign.location || 'Global'}
                  </div>
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed italic bg-gray-50 dark:bg-zinc-900 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800">
                  "{selectedCampaign.longDesc || selectedCampaign.description}"
                </p>
              </div>

              {/* Donation Form */}
              <form onSubmit={handleDonateSubmit} className="space-y-6">
                
                {/* Preset Amount Buttons */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">
                    Select Donation Amount ({currency.code})
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {presetAmounts.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setDonationAmount(amt.toString())}
                        className={`py-2.5 px-2 rounded-xl font-black text-xs transition-all border ${
                          donationAmount === amt.toString()
                            ? 'bg-accent text-white border-accent shadow-md'
                            : 'bg-gray-50 dark:bg-zinc-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-zinc-800 hover:border-accent'
                        }`}
                      >
                        {currency.symbol}{amt.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Amount Input */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">
                    Custom Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400">{currency.symbol}</span>
                    <input 
                      type="number"
                      value={donationAmount}
                      onChange={(e) => setDonationAmount(e.target.value)}
                      placeholder="e.g. 75"
                      className="w-full p-4 pl-12 rounded-2xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 focus:ring-2 focus:ring-accent dark:text-white font-bold"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-gray-400">Available Wallet Balance: <span className="font-bold text-accent">{formatAmount(userData?.walletBalance || 0)}</span></p>
                </div>

                {/* Anonymous Toggle & Note */}
                <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox"
                      id="anonCheck"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-accent focus:ring-accent"
                    />
                    <label htmlFor="anonCheck" className="text-xs font-bold dark:text-white">
                      Donate Anonymously (Hide your name on public donor wall)
                    </label>
                  </div>

                  <input 
                    type="text"
                    value={donorNote}
                    onChange={(e) => setDonorNote(e.target.value)}
                    placeholder="Words of encouragement (optional)..."
                    className="w-full p-3 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs dark:text-white outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-center gap-3 text-xs font-bold">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setSelectedCampaign(null)}
                    className="flex-1 py-4 bg-gray-100 dark:bg-zinc-900 text-gray-600 dark:text-gray-300 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-zinc-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-[2] py-4 bg-accent hover:bg-accent/90 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Confirm {currency.symbol}{donationAmount || '0'} Donation
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* User Recent Contributions Table */}
        <div className="space-y-6 pt-8 border-t border-gray-200 dark:border-zinc-800">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black tracking-tight dark:text-white uppercase flex items-center gap-2">
              <Receipt className="w-5 h-5 text-accent" />
              Your Charitable Contributions History
            </h3>
          </div>

          <div className="card p-0 overflow-hidden">
            {donations.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs italic">
                You haven't made any charitable donations yet. Choose a campaign above to make your first contribution!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 text-[10px] font-black uppercase tracking-widest text-gray-500">
                      <th className="p-4">Campaign / Beneficiary</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Date</th>
                      <th className="p-4 text-right">Tax Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 text-xs">
                    {donations.map((d) => (
                      <tr key={d.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                        <td className="p-4 font-bold dark:text-white">
                          {d.charityName || 'Charity Cause'}
                          {d.beneficiary && <span className="block text-[10px] text-gray-400 font-normal">For: {d.beneficiary}</span>}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            d.type === 'personal' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                          }`}>
                            {d.type || 'General'}
                          </span>
                        </td>
                        <td className="p-4 font-black text-accent">
                          {formatAmount(d.amount)}
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3" /> Completed
                          </span>
                        </td>
                        <td className="p-4 text-gray-400 font-mono text-[11px]">
                          {d.timestamp ? new Date(d.timestamp).toLocaleDateString() : 'Recent'}
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => alert(`Official 501(c)(3) Tax Receipt #${d.id.slice(0, 8)} for ${formatAmount(d.amount)} generated.`)}
                            className="px-3 py-1 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                          >
                            Download Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </BankingFeaturePage>
  );
};
