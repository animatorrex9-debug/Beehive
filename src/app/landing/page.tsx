import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
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
  LogOut
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../../components/Logo';
import { ThemeToggle } from '../../components/ThemeToggle';
import { useCurrency } from '../../hooks/useCurrency';
import { useAuth } from '../../hooks/useAuth';
import { auth } from '../../lib/firebase';

export const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
    <div className="min-h-screen flex flex-col bg-white dark:bg-primary transition-colors duration-300">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-primary/80 backdrop-blur-md border-b border-gray-100 dark:border-zinc-900">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <Logo />
          
          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            <NavLink href="#home">Home</NavLink>
            <NavLink href="#about">About</NavLink>
            <NavLink href="#how-it-works">How It Works</NavLink>
            <NavLink href="#faq">FAQ</NavLink>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />
            {user ? (
              <>
                <Link to="/dashboard" className="font-bold hover:text-accent transition-colors dark:text-white">Dashboard</Link>
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
                <Link to="/auth/login" className="font-bold hover:text-accent transition-colors dark:text-white">Login</Link>
                <Link to="/auth/signup" className="btn-primary">Get Started</Link>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <div className="md:hidden flex items-center gap-4">
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
              className="md:hidden bg-white dark:bg-primary border-b border-gray-100 dark:border-zinc-900 px-6 py-8 flex flex-col gap-6"
            >
              <NavLink href="#home" onClick={() => setIsMenuOpen(false)}>Home</NavLink>
              <NavLink href="#about" onClick={() => setIsMenuOpen(false)}>About</NavLink>
              <NavLink href="#how-it-works" onClick={() => setIsMenuOpen(false)}>How It Works</NavLink>
              <NavLink href="#faq" onClick={() => setIsMenuOpen(false)}>FAQ</NavLink>
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
            FAST, SIMPLE <br />
            <span className="text-accent">PERSONAL LOANS</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl text-gray-500 mb-10 max-w-2xl"
          >
            Get approved in 24 hours. Funds delivered straight to your account. 
            No paperwork, no stress.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col md:flex-row gap-4 w-full md:w-auto mb-16"
          >
            <Link to="/auth/signup" className="btn-primary text-lg px-8 py-4 flex items-center justify-center gap-2 min-w-[200px]">
              Apply Now <ArrowRight className="w-5 h-5" />
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

      {/* LOAN CALCULATOR */}
      <section className="py-24 bg-gray-50 dark:bg-zinc-950 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 dark:text-white">
              CALCULATE YOUR <br />
              <span className="text-accent">REPAYMENTS</span>
            </h2>
            <p className="text-xl text-gray-500 mb-8">
              Use our simple tool to see exactly how much you'll pay. 
              No surprises, just clear numbers.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <CheckCircle className="text-accent w-5 h-5" />
                <span>Fixed interest rates</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <CheckCircle className="text-accent w-5 h-5" />
                <span>Flexible duration options</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <CheckCircle className="text-accent w-5 h-5" />
                <span>Instant quote generation</span>
              </div>
            </div>
          </div>

          <div className="card p-8 md:p-12 shadow-2xl">
            <div className="space-y-8">
              {/* Amount Slider */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-bold uppercase tracking-wider text-gray-500">Loan Amount</label>
                  <span className="text-3xl font-black text-accent">{formatAmount(loanAmount)}</span>
                </div>
                <input 
                  type="range" 
                  min="50000" 
                  max="5000000" 
                  step="10000"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-accent"
                />
                <div className="flex justify-between text-xs font-bold text-gray-400">
                  <span>{formatAmount(50000)}</span>
                  <span>{formatAmount(5000000)}</span>
                </div>
              </div>

              {/* Duration Selector */}
              <div className="space-y-4">
                <label className="text-sm font-bold uppercase tracking-wider text-gray-500">Loan Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 6, 12, 24].map((m) => (
                    <button 
                      key={m}
                      onClick={() => setLoanDuration(m)}
                      className={`py-3 rounded-xl font-bold transition-all border-2 ${
                        loanDuration === m 
                          ? 'bg-accent border-accent text-white' 
                          : 'bg-transparent border-gray-100 dark:border-zinc-800 text-gray-500 hover:border-accent'
                      }`}
                    >
                      {m} Mo
                    </button>
                  ))}
                </div>
              </div>

              {/* Results */}
              <div className="pt-8 border-t border-gray-100 dark:border-zinc-800 grid grid-cols-2 gap-8">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Monthly Repayment</p>
                  <p className="text-2xl font-black dark:text-white">{formatAmount(Math.round(monthlyRepayment))}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Repayment</p>
                  <p className="text-2xl font-black dark:text-white">{formatAmount(Math.round(totalRepayment))}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Interest Rate</p>
                  <p className="text-2xl font-black text-accent">15% <span className="text-xs text-gray-400 font-normal">p.a</span></p>
                </div>
              </div>

              <Link to="/auth/signup" className="btn-primary w-full py-5 text-xl flex items-center justify-center gap-2">
                Apply Now <ArrowRight className="w-6 h-6" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-32 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-20 dark:text-white">
            HOW IT <span className="text-accent">WORKS</span>
          </h2>
          
          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connector Line (Desktop) */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 dark:bg-zinc-900 -z-10" />
            
            <Step 
              number="01"
              icon={<UserCheck className="w-10 h-10" />}
              title="Create Account"
              description="Sign up in seconds with just your basic details and identification."
            />
            <Step 
              number="02"
              icon={<FileText className="w-10 h-10" />}
              title="Apply for Loan"
              description="Choose your amount and duration. No paperwork required."
            />
            <Step 
              number="03"
              icon={<CreditCard className="w-10 h-10" />}
              title="Receive Funds"
              description="Once approved, money is sent instantly to your bank account."
            />
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="about" className="py-32 bg-primary text-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6">
                WHY CHOOSE <br />
                <span className="text-accent">BEEHIVE LOANS?</span>
              </h2>
              <p className="text-xl text-gray-400">
                We've redesigned the lending experience from the ground up to be 
                fair, fast, and focused on your needs.
              </p>
            </div>
            <Link to="/auth/signup" className="btn-primary px-8 py-4">Join Beehive Today</Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCardDark 
              icon={<Zap className="w-8 h-8 text-accent" />}
              title="Fast Approval"
              description="Our automated system processes applications 24/7 for instant results."
            />
            <FeatureCardDark 
              icon={<Shield className="w-8 h-8 text-accent" />}
              title="Secure Platform"
              description="Your data is protected by bank-grade security and encryption."
            />
            <FeatureCardDark 
              icon={<Headphones className="w-8 h-8 text-accent" />}
              title="Personal Manager"
              description="Every customer gets a dedicated manager to help with any questions."
            />
            <FeatureCardDark 
              icon={<DollarSign className="w-8 h-8 text-accent" />}
              title="Flexible Repayment"
              description="Choose a schedule that fits your income cycle and budget."
            />
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-32 px-6 bg-gray-50 dark:bg-zinc-950 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-20 text-center dark:text-white">
            WHAT OUR <span className="text-accent">CUSTOMERS SAY</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <TestimonialCard 
              name="Ahmed Mansour"
              quote="Beehive saved my business when I needed urgent stock. The process was so smooth, I couldn't believe it."
              image="https://picsum.photos/seed/ahmed/100/100"
            />
            <TestimonialCard 
              name="Fatima Al-Sayed"
              quote="Finally, a loan app that doesn't harass you. The interest rates are fair and the support team is amazing."
              image="https://picsum.photos/seed/fatima/100/100"
            />
            <TestimonialCard 
              name="Omar Hassan"
              quote="I've tried many apps, but Beehive is the fastest. Funds were in my account in less than 30 minutes."
              image="https://picsum.photos/seed/omar/100/100"
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
                className="card p-0 overflow-hidden"
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
                      className="px-6 pb-6 text-gray-500 leading-relaxed"
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

      {/* FOOTER */}
      <footer className="bg-white dark:bg-primary border-t border-gray-100 dark:border-zinc-900 pt-24 pb-12 px-6">
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
              <ul className="space-y-4 text-gray-500 font-bold">
                <li><a href="#home" className="hover:text-accent transition-colors">Home</a></li>
                <li><a href="#about" className="hover:text-accent transition-colors">About Us</a></li>
                <li><a href="#how-it-works" className="hover:text-accent transition-colors">How It Works</a></li>
                <li><a href="#faq" className="hover:text-accent transition-colors">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-black text-lg mb-6 dark:text-white">Newsletter</h4>
              <p className="text-gray-500 mb-4">Get the latest financial tips and updates.</p>
              <div className="flex gap-2">
                <input type="email" placeholder="Email" className="input-field py-2" />
                <button className="btn-primary px-4 py-2">Join</button>
              </div>
            </div>
          </div>

          <div className="pt-12 border-t border-gray-100 dark:border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-gray-400 text-sm">© 2026 Beehive Loans. All rights reserved.</p>
            <div className="flex gap-8 text-sm font-bold text-gray-400">
              <a href="#" className="hover:text-accent transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-accent transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-accent transition-colors">Cookie Policy</a>
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
    className="font-bold text-gray-500 hover:text-accent transition-colors dark:text-gray-400 dark:hover:text-white"
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
    <p className="text-gray-500 max-w-xs mx-auto">{description}</p>
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
  <div className="card p-8 flex flex-col h-full">
    <div className="flex gap-1 mb-6">
      {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-accent text-accent" />)}
    </div>
    <p className="text-xl font-medium italic mb-8 flex-grow dark:text-white">"{quote}"</p>
    <div className="flex items-center gap-4">
      <img src={image} alt={name} className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
      <div>
        <p className="font-black dark:text-white">{name}</p>
        <p className="text-sm text-gray-500">Verified Customer</p>
      </div>
    </div>
  </div>
);

const SocialIcon = ({ icon }: { icon: React.ReactNode }) => (
  <a href="#" className="w-10 h-10 rounded-full border border-gray-100 dark:border-zinc-800 flex items-center justify-center text-gray-400 hover:bg-accent hover:text-white hover:border-accent transition-all">
    {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
  </a>
);
