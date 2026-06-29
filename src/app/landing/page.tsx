import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp,
  Briefcase,
  Globe,
  RefreshCw,
  Gift,
  Wallet,
  ArrowRight, 
  CheckCircle, 
  Shield, 
  Zap, 
  DollarSign, 
  Menu, 
  X, 
  ChevronDown, 
  Star, 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin,
  UserCheck,
  FileText,
  CreditCard,
  Headphones,
  LogOut,
  Heart,
  Users
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../../components/Logo';
import { ThemeToggle } from '../../components/ThemeToggle';
import { useCurrency } from '../../hooks/useCurrency';
import { useAuth } from '../../hooks/useAuth';
import { auth } from '../../lib/supabase-service';
import { CharityTab } from './CharityTab';
import { LoansTab } from './LoansTab';

export const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'home' | 'charity' | 'loans'>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loanAmount, setLoanAmount] = useState(500000);
  const [loanDuration, setLoanDuration] = useState(12);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { currency, formatAmount } = useCurrency();

  const handleSignOut = () => {
    auth.signOut();
    navigate('/');
  };

  // Calculator Logic
  const interestRate = 0.15; // 15% annual interest
  const monthlyRate = interestRate / 12;
  const monthlyRepayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, loanDuration)) / (Math.pow(1 + monthlyRate, loanDuration) - 1);
  const totalRepayment = monthlyRepayment * loanDuration;

  const faqs = [
    {
      q: "What are the requirements to apply for a loan?",
      a: "To apply, you need to be at least 18 years old, have a valid government-issued ID, a steady source of income, and an active bank account."
    },
    {
      q: "How long does the approval process take?",
      a: "Our automated system typically provides an initial decision within minutes. Final approval and disbursement usually happen within 24 hours."
    },
    {
      q: "Are there any hidden fees?",
      a: "No. We believe in total transparency. All interest rates and any applicable processing fees are clearly stated before you sign your loan agreement."
    },
    {
      q: "Can I pay back my loan early?",
      a: "Yes! You can make early repayments at any time without any penalty fees. In fact, it might even help you save on interest."
    },
    {
      q: "What happens if I miss a repayment?",
      a: "We understand that life happens. If you think you'll miss a payment, please contact your Personal Account Manager immediately to discuss options."
    },
    {
      q: "Is my data secure with Beehive?",
      a: "Absolutely. We use bank-level 256-bit encryption and follow strict data protection protocols to ensure your information is always safe."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-gray-100 dark:border-zinc-900">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div onClick={() => { setActiveTab('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="cursor-pointer">
            <Logo />
          </div>
          
          {/* Desktop Links */}
          <div className="hidden lg:flex items-center gap-8">
            <button 
              onClick={() => { setActiveTab('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`text-[13px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'home' ? 'text-accent' : 'text-gray-500 hover:text-accent dark:text-gray-400 dark:hover:text-white'}`}
            >
              Home
            </button>
            <button 
              onClick={() => { setActiveTab('charity'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`text-[13px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'charity' ? 'text-accent' : 'text-gray-500 hover:text-accent dark:text-gray-400 dark:hover:text-white'}`}
            >
              Charity Mission
            </button>
            <button 
              onClick={() => { setActiveTab('loans'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`text-[13px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'loans' ? 'text-accent' : 'text-gray-500 hover:text-accent dark:text-gray-400 dark:hover:text-white'}`}
            >
              Loan Mission
            </button>
            {activeTab === 'home' && (
              <>
                <NavLink href="#about">About</NavLink>
                <NavLink href="#how-it-works">How It Works</NavLink>
                <NavLink href="#faq">FAQ</NavLink>
              </>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-6">
            <ThemeToggle />
            {user ? (
              <>
                <Link to="/dashboard" className="text-[13px] font-bold uppercase tracking-wider hover:text-accent transition-colors dark:text-white">Dashboard</Link>
                <button 
                  onClick={handleSignOut}
                  className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all border border-gray-100 dark:border-zinc-900"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <Link to="/auth/login" className="text-[13px] font-bold uppercase tracking-wider hover:text-accent transition-colors dark:text-white">Login</Link>
                <Link to="/auth/signup" className="btn-primary text-[13px] px-6 py-2.5">Get Started</Link>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <div className="lg:hidden flex items-center gap-4">
            <ThemeToggle />
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 dark:text-white">
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white dark:bg-zinc-950 border-b border-gray-100 dark:border-zinc-900 px-6 py-8 flex flex-col gap-6"
            >
              <button 
                onClick={() => { setActiveTab('home'); setIsMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className={`font-bold text-left text-sm uppercase tracking-wider ${activeTab === 'home' ? 'text-accent' : 'text-gray-500 dark:text-white'}`}
              >
                Home
              </button>
              <button 
                onClick={() => { setActiveTab('charity'); setIsMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className={`font-bold text-left text-sm uppercase tracking-wider ${activeTab === 'charity' ? 'text-accent' : 'text-gray-500 dark:text-white'}`}
              >
                Charity Mission
              </button>
              <button 
                onClick={() => { setActiveTab('loans'); setIsMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className={`font-bold text-left text-sm uppercase tracking-wider ${activeTab === 'loans' ? 'text-accent' : 'text-gray-500 dark:text-white'}`}
              >
                Loan Mission
              </button>
              {activeTab === 'home' && (
                <>
                  <NavLink href="#about" onClick={() => setIsMenuOpen(false)}>About</NavLink>
                  <NavLink href="#how-it-works" onClick={() => setIsMenuOpen(false)}>How It Works</NavLink>
                  <NavLink href="#faq" onClick={() => setIsMenuOpen(false)}>FAQ</NavLink>
                </>
              )}
              <hr className="border-gray-100 dark:border-zinc-800" />
              {user ? (
                <>
                  <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="font-bold dark:text-white">Dashboard</Link>
                  <button 
                    onClick={() => {
                      handleSignOut();
                      setIsMenuOpen(false);
                    }} 
                    className="font-bold text-red-500 text-left"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/auth/login" onClick={() => setIsMenuOpen(false)} className="font-bold dark:text-white">Login</Link>
                  <Link to="/auth/signup" onClick={() => setIsMenuOpen(false)} className="btn-primary text-center">Get Started</Link>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {activeTab === 'home' && (
        <>
          {/* HERO SECTION */}
          <section id="home" className="pt-20 pb-32 px-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-4 py-1.5 mb-6 rounded-full bg-accent/10 text-accent font-bold text-sm tracking-wider uppercase"
          >
            Trusted by 50,000+ customers
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-8xl font-black tracking-tighter mb-6 leading-none dark:text-white max-w-4xl"
          >
            YOUR COMPLETE <br />
            <span className="text-accent">DIGITAL BANK</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl text-gray-500 dark:text-gray-400 mb-10 max-w-2xl"
          >
            Save, invest, borrow, and swap. Beehive is the only financial app you'll ever need. This is where money grows.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col md:flex-row gap-4 w-full md:w-auto mb-16"
          >
            <Link to="/auth/signup" className="btn-primary text-lg px-8 py-4 flex items-center justify-center gap-2 min-w-[200px]">
              Join us <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="#about" className="btn-secondary text-lg px-8 py-4 flex items-center justify-center min-w-[200px]">
              Learn More
            </Link>
          </motion.div>

          {/* Trust Badges */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all"
          >
            <TrustBadge icon={<Shield className="w-5 h-5" />} text="Secure" />
            <TrustBadge icon={<Zap className="w-5 h-5" />} text="Fast Approval" />
            <TrustBadge icon={<Headphones className="w-5 h-5" />} text="24/7 Support" />
          </motion.div>
        </div>
      </section>

      {/* SERVICES GRID */}
      <section id="services" className="py-24 px-6 bg-gray-50 dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 dark:text-white">
              BEYOND <span className="text-accent">BANKING</span>
            </h2>
            <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              Everything you need to manage, grow, and protect your money in one powerful ecosystem.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <ServiceCard 
              icon={<TrendingUp className="w-8 h-8" />}
              title="Smart Investing"
              description="Grow your wealth with automated portfolios and access to global markets."
              link="/dashboard/invest"
            />
            <ServiceCard 
              icon={<Briefcase className="w-8 h-8" />}
              title="Instant Loans"
              description="Flexible credit lines with competitive rates and instant approval."
              link="/dashboard/loan-application"
            />
            <ServiceCard 
              icon={<Gift className="w-8 h-8" />}
              title="Community Grants"
              description="Funding for innovative projects and community-driven initiatives."
              link="/dashboard/grants"
            />
            <div className="hidden lg:block">
              <ServiceCard 
                icon={<RefreshCw className="w-8 h-8" />}
                title="Currency Swap"
                description="Exchange between 50+ currencies at real-time interbank rates."
                link="/dashboard/swap"
              />
            </div>
            <div className="hidden lg:block">
              <ServiceCard 
                icon={<Globe className="w-8 h-8" />}
                title="Global Transfers"
                description="Send money across borders instantly with zero hidden fees."
                link="/dashboard/send"
              />
            </div>
            <div className="hidden lg:block">
              <ServiceCard 
                icon={<CreditCard className="w-8 h-8" />}
                title="Virtual Cards"
                description="Generate secure virtual cards for all your online subscriptions."
                link="/dashboard/cards"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CHARITY SPOTLIGHT SECTION */}
      <section className="py-32 px-6 bg-white dark:bg-zinc-950 overflow-hidden border-t border-b border-gray-100 dark:border-zinc-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-green-500/10 text-accent font-bold text-xs uppercase tracking-wider">
                <Heart className="w-3.5 h-3.5 animate-pulse" /> Our Heartbeat
              </div>
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter dark:text-white leading-tight">
                A BANKING MODEL <br />
                <span className="text-accent">BUILT ON EMPATHY</span>
              </h2>
              <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 leading-relaxed">
                Traditional banking stacks capital into silent reserves. At Beehive, we believe money should breathe, move, and heal. Every time you spend, save, or trade, our platform channels a portion of our transactional spread to vetted global causes—at absolutely zero cost to you.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-6 pt-4">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-accent flex-shrink-0">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold dark:text-white text-md">Global Circularity</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Connecting daily capital with critical grassroots operations worldwide.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-accent flex-shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold dark:text-white text-md">Democratic Funding</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Members vote directly on which emergency or structural projects receive matching grants.</p>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button
                  onClick={() => { setActiveTab('charity'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="btn-primary px-8 py-4 text-base font-bold flex items-center gap-2 cursor-pointer"
                >
                  Explore Our Charity Mission <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>

            {/* Emotional Interactive Stock Photo Collage */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="grid grid-cols-2 gap-4 relative"
            >
              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl aspect-[3/4] shadow-md relative group">
                  <img 
                    src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=500" 
                    alt="Children laughing" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                  <span className="absolute bottom-4 left-4 text-xs font-bold text-white uppercase tracking-wider bg-black/40 backdrop-blur-md px-3 py-1 rounded-full">
                    Education & Joy
                  </span>
                </div>
                <div className="overflow-hidden rounded-2xl aspect-square shadow-md relative group">
                  <img 
                    src="https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&q=80&w=500" 
                    alt="Planting trees" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                  <span className="absolute bottom-4 left-4 text-xs font-bold text-white uppercase tracking-wider bg-black/40 backdrop-blur-md px-3 py-1 rounded-full">
                    Sustaining Ecosystems
                  </span>
                </div>
              </div>

              <div className="space-y-4 pt-8">
                <div className="overflow-hidden rounded-2xl aspect-square shadow-md relative group">
                  <img 
                    src="https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&q=80&w=500" 
                    alt="Clean water" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                  <span className="absolute bottom-4 left-4 text-xs font-bold text-white uppercase tracking-wider bg-black/40 backdrop-blur-md px-3 py-1 rounded-full">
                    Fresh Wells
                  </span>
                </div>
                <div className="overflow-hidden rounded-2xl aspect-[3/4] shadow-md relative group">
                  <img 
                    src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=500" 
                    alt="Medical care" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                  <span className="absolute bottom-4 left-4 text-xs font-bold text-white uppercase tracking-wider bg-black/40 backdrop-blur-md px-3 py-1 rounded-full">
                    Healthcare Access
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* INVEST SECTION */}
      <section className="py-32 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-8 dark:text-white leading-tight">
                INVEST IN YOUR <br />
                <span className="text-accent uppercase">Financial Freedom</span>
              </h2>
              <p className="text-xl text-gray-500 dark:text-gray-400 mb-10 leading-relaxed">
                Don't just save—thrive. Beehive's investment platform gives you the tools to build a diversified portfolio. 
                Whether you're a beginner or a pro, our AI-assisted insights help you make smarter decisions.
              </p>
              <ul className="space-y-4 mb-10">
                <li className="flex items-center gap-3 text-lg font-medium dark:text-gray-300">
                  <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-accent" />
                  </div>
                  Zero-commission trading on select assets
                </li>
                <li className="flex items-center gap-3 text-lg font-medium dark:text-gray-300">
                  <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-accent" />
                  </div>
                  Real-time market analytics and news
                </li>
                <li className="flex items-center gap-3 text-lg font-medium dark:text-gray-300">
                  <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-accent" />
                  </div>
                  Automated recurring investments
                </li>
              </ul>
              <Link to="/auth/signup" className="btn-primary px-10 py-4 text-lg">Start Investing</Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute -inset-4 bg-accent/20 rounded-[2rem] blur-3xl -z-10" />
              <img 
                src="https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=1000" 
                alt="Investment Growth" 
                className="rounded-3xl shadow-2xl w-full object-cover aspect-[4/3]"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-8 -left-8 bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-800 hidden md:block">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Portfolio Yield</p>
                    <p className="text-2xl font-black dark:text-white">+12.4% <span className="text-sm font-normal text-gray-400">YTD</span></p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* LOANS & GRANTS SECTION */}
      <section className="py-32 px-6 bg-primary text-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, order: 2 }}
              whileInView={{ opacity: 1, order: 1 }}
              viewport={{ once: true }}
              className="lg:order-2"
            >
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-8 leading-tight">
                CAPITAL FOR <br />
                <span className="text-accent uppercase">Your Ambition</span>
              </h2>
              <p className="text-xl text-gray-400 mb-10 leading-relaxed">
                Whether you're scaling a business or funding a personal dream, Beehive provides the capital you need. 
                Our grants program specifically targets social impact and innovation.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-8 mb-12">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                  <Briefcase className="w-10 h-10 text-accent mb-4" />
                  <h4 className="text-xl font-bold mb-2">Business Loans</h4>
                  <p className="text-gray-400">Scale your operations with competitive rates and flexible terms.</p>
                </div>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                  <Gift className="w-10 h-10 text-accent mb-4" />
                  <h4 className="text-xl font-bold mb-2">Social Grants</h4>
                  <p className="text-gray-400">Non-repayable funding for projects that make a difference.</p>
                </div>
              </div>
              
              <Link to="/auth/signup" className="btn-primary px-10 py-4 text-lg">Apply for Funding</Link>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: -50, order: 1 }}
              whileInView={{ opacity: 1, x: 0, order: 2 }}
              viewport={{ once: true }}
              className="lg:order-1 relative"
            >
              <img 
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1000" 
                alt="Business Growth" 
                className="rounded-3xl shadow-2xl w-full object-cover aspect-[4/3] opacity-80"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent rounded-3xl" />
              <div className="absolute bottom-8 left-8 right-8">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <p className="font-bold">Over $50M disbursed in 2025</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* GLOBAL CONNECTIVITY */}
      <section className="py-32 px-6 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-8 dark:text-white">
            BANKING WITHOUT <span className="text-accent">BORDERS</span>
          </h2>
          <p className="text-xl text-gray-500 dark:text-gray-400 max-w-3xl mx-auto mb-20">
            Send money, swap currencies, and spend globally. Beehive connects you to the world economy with the best rates and zero friction.
          </p>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-accent/10 flex items-center justify-center mx-auto">
                <RefreshCw className="w-10 h-10 text-accent" />
              </div>
              <h3 className="text-2xl font-black dark:text-white">Instant Swap</h3>
              <p className="text-gray-500 dark:text-gray-400">Exchange currencies at the mid-market rate with no hidden markups.</p>
            </div>
            <div className="space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-accent/10 flex items-center justify-center mx-auto">
                <Globe className="w-10 h-10 text-accent" />
              </div>
              <h3 className="text-2xl font-black dark:text-white">Global Reach</h3>
              <p className="text-gray-500 dark:text-gray-400">Send money to 150+ countries in minutes, not days.</p>
            </div>
            <div className="space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-accent/10 flex items-center justify-center mx-auto">
                <CreditCard className="w-10 h-10 text-accent" />
              </div>
              <h3 className="text-2xl font-black dark:text-white">Multi-Currency Card</h3>
              <p className="text-gray-500 dark:text-gray-400">Spend like a local anywhere in the world with your Beehive card.</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-32 px-6 bg-gray-50 dark:bg-zinc-900/50">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-20 dark:text-white">
            GET STARTED IN <span className="text-accent">MINUTES</span>
          </h2>
          
          <div className="grid md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 dark:bg-zinc-800 -z-10" />
            
            <Step 
              number="01"
              icon={<UserCheck className="w-10 h-10" />}
              title="Create Account"
              description="Sign up and complete your KYC in under 3 minutes."
            />
            <Step 
              number="02"
              icon={<Wallet className="w-10 h-10" />}
              title="Fund Your Wallet"
              description="Deposit via bank transfer, card, or crypto instantly."
            />
            <Step 
              number="03"
              icon={<Zap className="w-10 h-10" />}
              title="Start Growing"
              description="Invest, borrow, or spend. You're in control of your wealth."
            />
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-32 px-6 bg-white dark:bg-zinc-950 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-20 text-center dark:text-white">
            TRUSTED BY <span className="text-accent">THOUSANDS</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <TestimonialCard 
              name="Sarah Jenkins"
              quote="The investment tools are incredibly intuitive. I've seen a 15% growth in my portfolio since joining Beehive."
              image="https://picsum.photos/seed/sarah/100/100"
            />
            <TestimonialCard 
              name="David Chen"
              quote="As a frequent traveler, the multi-currency card and instant swaps have saved me hundreds in fees."
              image="https://picsum.photos/seed/david/100/100"
            />
            <TestimonialCard 
              name="Elena Rodriguez"
              quote="I applied for a small business grant and was approved within a week. Beehive actually cares about community."
              image="https://picsum.photos/seed/elena/100/100"
            />
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-32 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-20 text-center dark:text-white">
            FREQUENTLY ASKED <br />
            <span className="text-accent">QUESTIONS</span>
          </h2>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="card p-0 overflow-hidden bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800"
              >
                <button 
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full p-6 flex justify-between items-center text-left hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <span className="text-lg font-bold dark:text-white">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 transition-transform ${openFaq === index ? 'rotate-180' : ''} dark:text-white`} />
                </button>
                <AnimatePresence>
                  {openFaq === index && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-6 pb-6 text-gray-500 dark:text-gray-400 leading-relaxed"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>
      </>
      )}

      {activeTab === 'charity' && <CharityTab />}
      {activeTab === 'loans' && <LoansTab />}

      {/* FOOTER */}
      <footer className="bg-white dark:bg-zinc-950 border-t border-gray-100 dark:border-zinc-900 pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
            <div className="space-y-6">
              <Logo />
              <p className="text-gray-500 leading-relaxed">
                Empowering customers with fast, fair, and flexible financial solutions. 
                Your partner in growth.
              </p>
              <div className="flex gap-4">
                <SocialIcon icon={<Facebook />} />
                <SocialIcon icon={<Twitter />} />
                <SocialIcon icon={<Instagram />} />
                <SocialIcon icon={<Linkedin />} />
              </div>
            </div>

            <div>
              <h4 className="font-black text-lg mb-6 dark:text-white">Quick Links</h4>
              <ul className="space-y-4 text-gray-500 dark:text-gray-400 font-bold flex flex-col items-start">
                <li>
                  <button onClick={() => { setActiveTab('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-accent transition-colors text-left cursor-pointer">
                    Home
                  </button>
                </li>
                <li>
                  <button onClick={() => { setActiveTab('charity'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-accent transition-colors text-left cursor-pointer">
                    Charity Mission
                  </button>
                </li>
                <li>
                  <button onClick={() => { setActiveTab('loans'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-accent transition-colors text-left cursor-pointer">
                    Loan Mission
                  </button>
                </li>
                {activeTab === 'home' && (
                  <>
                    <li><a href="#about" className="hover:text-accent transition-colors">About Us</a></li>
                    <li><a href="#how-it-works" className="hover:text-accent transition-colors">How It Works</a></li>
                    <li><a href="#faq" className="hover:text-accent transition-colors">FAQ</a></li>
                  </>
                )}
              </ul>
            </div>

            <div>
              <h4 className="font-black text-lg mb-6 dark:text-white">Newsletter</h4>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Get the latest financial tips and updates.</p>
              <div className="flex gap-2">
                <input type="email" placeholder="Email" className="input-field py-2 bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800" />
                <button className="btn-primary px-4 py-2">Join</button>
              </div>
            </div>
          </div>

          <div className="pt-12 border-t border-gray-100 dark:border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-gray-400 text-sm">© 2026 Beehive Bank. All rights reserved.</p>
            <div className="flex gap-8 text-sm font-bold text-gray-400">
              <Link to="/legal/privacy" className="hover:text-accent transition-colors">Privacy Policy</Link>
              <Link to="/legal/terms" className="hover:text-accent transition-colors">Terms of Service</Link>
              <Link to="/legal/cookies" className="hover:text-accent transition-colors">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const NavLink = ({ href, children, onClick }: { href: string, children: React.ReactNode, onClick?: () => void }) => (
  <a 
    href={href} 
    onClick={onClick}
    className="text-[13px] font-bold uppercase tracking-wider text-gray-500 hover:text-accent transition-colors dark:text-gray-400 dark:hover:text-white"
  >
    {children}
  </a>
);

const TrustBadge = ({ icon, text }: { icon: React.ReactNode, text: string }) => (
  <div className="flex items-center gap-2 font-bold dark:text-white">
    {icon}
    <span className="uppercase tracking-widest text-sm">{text}</span>
  </div>
);

const Step = ({ number, icon, title, description }: { number: string, icon: React.ReactNode, title: string, description: string }) => (
  <div className="flex flex-col items-center">
    <div className="w-24 h-24 rounded-full bg-white dark:bg-zinc-900 border-4 border-accent flex items-center justify-center mb-6 relative shadow-xl">
      <span className="absolute -top-2 -right-2 bg-accent text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm">
        {number}
      </span>
      <div className="text-accent">{icon}</div>
    </div>
    <h3 className="text-2xl font-black mb-4 dark:text-white">{title}</h3>
    <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto">{description}</p>
  </div>
);

const FeatureCardDark = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="p-8 rounded-3xl bg-zinc-900 border border-zinc-800 hover:border-accent transition-all group">
    <div className="mb-6">{icon}</div>
    <h3 className="text-2xl font-black mb-4">{title}</h3>
    <p className="text-gray-400 leading-relaxed">{description}</p>
  </div>
);

const TestimonialCard = ({ name, quote, image }: { name: string, quote: string, image: string }) => (
  <div className="card p-8 flex flex-col h-full bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800">
    <div className="flex gap-1 mb-6">
      {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-accent text-accent" />)}
    </div>
    <p className="text-xl font-medium italic mb-8 flex-grow dark:text-white">"{quote}"</p>
    <div className="flex items-center gap-4">
      <img src={image} alt={name} className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
      <div>
        <p className="font-black dark:text-white">{name}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">Verified Customer</p>
      </div>
    </div>
  </div>
);

const SocialIcon = ({ icon }: { icon: React.ReactNode }) => (
  <a href="#" className="w-10 h-10 rounded-full border border-gray-100 dark:border-zinc-800 flex items-center justify-center text-gray-400 hover:bg-accent hover:text-white hover:border-accent transition-all">
    {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "w-5 h-5" })}
  </a>
);

const ServiceCard = ({ icon, title, description, link }: { icon: React.ReactNode, title: string, description: string, link: string }) => (
  <Link to={link} className="card p-8 hover:border-accent transition-all group bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800">
    <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-6 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h3 className="text-2xl font-black mb-4 dark:text-white">{title}</h3>
    <p className="text-gray-500 dark:text-gray-400 mb-6">{description}</p>
    <div className="flex items-center gap-2 text-accent font-bold">
      Learn More <ArrowRight className="w-4 h-4" />
    </div>
  </Link>
);
