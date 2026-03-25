import React, { useState } from 'react';
import { 
  TrendingUp, 
  PieChart, 
  BarChart3, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ShieldCheck, 
  Layers, 
  Zap, 
  Lock, 
  UserCheck, 
  Quote, 
  ArrowRight,
  Globe,
  Building2,
  Landmark,
  Coins,
  Activity
} from 'lucide-react';
import { BankingFeaturePage } from '../../../components/dashboard/BankingFeaturePage';
import { useAuth } from '../../../hooks/useAuth';
import { useCurrency } from '../../../hooks/useCurrency';
import { db } from '../../../lib/firebase';
import { doc, updateDoc, collection, addDoc, increment } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../../../lib/firebase';

const investmentOptions = [
  {
    id: 'stocks',
    title: "Stocks & ETFs",
    description: "Invest in the world's leading companies with fractional shares. Our diversified portfolios are actively managed by seasoned experts who monitor global markets around the clock — so you don't have to.",
    returns: "12.4%",
    icon: <BarChart3 className="w-6 h-6" />,
    image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 'crypto',
    title: "Crypto Assets",
    description: "Capture high-growth potential in major cryptocurrencies. With enterprise-grade secure storage and real-time trading infrastructure, Beehive makes digital asset investing accessible, safe, and straightforward.",
    returns: "45.2%",
    icon: <TrendingUp className="w-6 h-6" />,
    image: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 'real_estate',
    title: "Real Estate",
    description: "Own a piece of premium commercial and residential properties worldwide — without the mortgage, the maintenance, or the headaches. Fractional ownership means you earn like a landlord on any budget.",
    returns: "14.8%",
    icon: <PieChart className="w-6 h-6" />,
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 'private_equity',
    title: "Private Equity",
    description: "Gain exclusive access to high-potential private companies before they go public. Our private equity fund targets late-stage startups and established private firms with proven business models.",
    returns: "22.5%",
    icon: <Building2 className="w-6 h-6" />,
    image: "https://images.unsplash.com/photo-1554469384-e58fac16e23a?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 'venture_capital',
    title: "Venture Capital",
    description: "Invest in early-stage startups with high growth potential. Our VC fund provides seed and Series A funding to the next generation of tech disruptors.",
    returns: "31.2%",
    icon: <Zap className="w-6 h-6" />,
    image: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 'green_energy',
    title: "Green Energy",
    description: "Support the global transition to sustainable energy. This portfolio invests in solar, wind, and battery storage infrastructure projects worldwide.",
    returns: "9.4%",
    icon: <Globe className="w-6 h-6" />,
    image: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&q=80&w=800"
  }
];

export const InvestPage = () => {
  const { user, userData } = useAuth();
  const { currency, formatAmount } = useCurrency();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<any | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleInvest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || parseFloat(amount) <= 0 || !selectedOption) return;

    const investAmount = parseFloat(amount);
    
    if (userData?.walletBalance < investAmount) {
      setError('Insufficient funds in your wallet.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Update user balance and investment balance
      await updateDoc(doc(db, 'users', user.uid), {
        walletBalance: increment(-investAmount),
        investmentBalance: increment(investAmount),
        lastReturnCalculationDate: new Date().toISOString()
      });

      // Record investment in user's investments subcollection for daily return calculation
      await addDoc(collection(db, 'users', user.uid, 'investments'), {
        title: selectedOption.title,
        amount: investAmount,
        biweeklyReturn: parseFloat(selectedOption.returns),
        timestamp: new Date().toISOString(),
        status: 'active'
      });

      // Record transaction
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'investment',
        amount: investAmount,
        currency: userData?.currency?.code || currency.code || 'USD',
        status: 'completed',
        description: `Invested in ${selectedOption.title}`,
        timestamp: new Date().toISOString(),
        metadata: {
          category: selectedOption.title,
          returns: selectedOption.returns
        }
      });

      setSuccess(true);
      setAmount('');
      setSelectedOption(null);
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Investment error:', err instanceof Error ? err.message : String(err));
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/investments`);
      setError('Failed to process investment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openInvestModal = (option?: any) => {
    setSelectedOption(option || investmentOptions[0]);
    setIsModalOpen(true);
  };

  if (success) {
    return (
      <BankingFeaturePage 
        title="Investment Success" 
        description="Your wealth is working"
        icon={CheckCircle2}
      >
        <div className="max-w-md mx-auto text-center py-12">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black mb-4 dark:text-white">Investment Confirmed!</h2>
          <p className="text-gray-500 mb-8">Your investment has been processed. You can track its performance in your portfolio dashboard.</p>
          <button 
            onClick={() => setSuccess(false)}
            className="btn-primary w-full py-4"
          >
            Invest More
          </button>
        </div>
      </BankingFeaturePage>
    );
  }

  return (
    <BankingFeaturePage 
      title="Invest" 
      description="Grow your wealth with Beehive's curated investment portfolios"
      icon={TrendingUp}
    >
      <div className="space-y-24">
        {/* Hero Section */}
        <div className="relative rounded-[2.5rem] overflow-hidden bg-zinc-900 text-white p-12 lg:p-20">
          <div className="absolute inset-0 opacity-20">
            <img 
              src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1920" 
              alt="Investment Background" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="space-y-4">
              <h3 className="text-4xl lg:text-6xl font-black text-accent uppercase tracking-tighter">Money Grows</h3>
              <p className="text-lg text-gray-400 leading-relaxed max-w-2xl">
                Not on trees, but on <span className="text-accent">Beehive</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Investment Options Grid */}
        <div className="space-y-8">
          <div className="flex justify-between items-end">
            <h3 className="text-3xl font-black tracking-tighter dark:text-white uppercase">Investment Portfolios</h3>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{investmentOptions.length} Active Strategies</p>
          </div>
          <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-8 w-full">
            {investmentOptions.map((option) => (
              <InvestmentOption 
                key={option.id}
                title={option.title}
                description={option.description}
                returns={option.returns}
                icon={option.icon}
                image={option.image}
                onClick={() => openInvestModal(option)}
              />
            ))}
          </div>
        </div>

        {/* Our Mission Section */}
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-xs font-black uppercase tracking-widest">
              <Globe className="w-4 h-4" /> Our Mission
            </div>
            <h3 className="text-4xl lg:text-5xl font-black tracking-tighter dark:text-white uppercase leading-none">
              Democratizing institutional-grade investing.
            </h3>
            <p className="text-xl font-bold dark:text-white tracking-tight">
              We believe everyone deserves access to the same wealth-building tools as the top 1%.
            </p>
            <div className="space-y-6 text-gray-500 leading-relaxed">
              <p>
                For too long, the most powerful investment strategies have been locked behind minimum deposits, private banking relationships, and walls of financial jargon. Beehive was built to change that.
              </p>
              <p>
                We believe every person deserves access to the same institutional-grade tools that grow the wealth of the world's largest funds. Our mission is simple: democratize smart investing. No minimums. No gatekeeping. No nonsense — just transparent, intelligent growth for everyone.
              </p>
              <p className="font-bold dark:text-white">
                We're not a bank. We're not a brokerage. Beehive is a new kind of financial platform built for a generation that expects more from their money.
              </p>
            </div>
          </div>
          <div className="relative">
            <img 
              src="https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&q=80&w=800" 
              alt="Mission" 
              className="rounded-[3rem] shadow-2xl"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-8 -left-8 card p-8 max-w-xs hidden lg:block">
              <Quote className="w-10 h-10 text-accent mb-4 opacity-20" />
              <p className="text-sm italic text-gray-500">"Beehive changed how I think about my future. Smart investing isn't just for the 1% anymore."</p>
            </div>
          </div>
        </div>

        {/* Why Beehive Section */}
        <div className="space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h3 className="text-4xl font-black tracking-tighter dark:text-white uppercase">Why Beehive</h3>
            <p className="text-gray-500">The platform built for transparent, intelligent growth.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard 
              icon={<Activity className="w-6 h-6" />}
              title="Transparency"
              description="You always know exactly where your money is, how it's being used, and what it's earning. No hidden fees. No fine print surprises."
            />
            <FeatureCard 
              icon={<Layers className="w-6 h-6" />}
              title="Diversification"
              description="Every portfolio is engineered to spread risk intelligently across asset classes, geographies, and sectors."
            />
            <FeatureCard 
              icon={<ShieldCheck className="w-6 h-6" />}
              title="Security"
              description="Your funds are protected by 256-bit encryption, multi-factor authentication, and cold storage for digital assets."
            />
            <FeatureCard 
              icon={<Zap className="w-6 h-6" />}
              title="Automation"
              description="Set your goals and let Beehive handle the rest. Our smart rebalancing engine continuously adjusts your portfolio."
            />
          </div>
        </div>

        {/* How We Invest Section */}
        <div className="card p-12 lg:p-20 space-y-16 bg-zinc-900 border-none text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
            <TrendingUp className="w-full h-full text-accent" />
          </div>
          <div className="max-w-3xl space-y-6 relative z-10">
            <h3 className="text-4xl lg:text-5xl font-black tracking-tighter uppercase leading-none">How Beehive Grows Your Wealth</h3>
            <p className="text-gray-400 text-lg leading-relaxed">
              We don't just sit on your deposits. Beehive employs sophisticated, institutional-grade strategies to ensure your capital is always working. Here's exactly how we generate returns for our investors:
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12 relative z-10">
            <StrategyItem 
              number="1"
              title="Consumer Lending"
              description="The most direct use — we lend your deposits to qualified borrowers and earn interest on the Spread. This includes mortgages, auto loans, and personal credit. Every loan is underwritten against strict risk criteria."
            />
            <StrategyItem 
              number="2"
              title="Business & Commercial Lending"
              description="We provide capital to growing businesses for expansion, equipment, and operations. These commercial loans typically offer higher yields and are secured by business assets."
            />
            <StrategyItem 
              number="3"
              title="Government Bonds"
              description="We invest a portion of your capital in highly secure Treasury Securities. These are essentially loans to the government that pay a guaranteed interest rate, providing a bedrock of stability."
            />
            <StrategyItem 
              number="4"
              title="Mortgage-Backed Securities"
              description="We purchase carefully vetted bundles of home loans. As homeowners pay their mortgages each month, that interest flows back to Beehive and directly into your investment account."
            />
            <StrategyItem 
              number="5"
              title="Interbank Lending"
              description="In the Overnight Market, we lend excess reserves to other financial institutions to meet their daily liquidity requirements, earning short-term interest at institutional rates."
            />
            <StrategyItem 
              number="6"
              title="Central Bank Reserves"
              description="A portion of funds is always held at the Central Bank, earning a safe, baseline interest rate while ensuring maximum liquidity and security for your principal."
            />
          </div>
        </div>

        {/* Security Section */}
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1">
            <img 
              src="https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=800" 
              alt="Security" 
              className="rounded-[3rem] shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="space-y-8 order-1 lg:order-2">
            <h3 className="text-4xl font-black tracking-tighter dark:text-white uppercase leading-none">Your Money, Fully Protected</h3>
            <p className="text-gray-500">Beehive takes the security of your capital seriously. Here's what's in place to protect you:</p>
            <div className="space-y-4">
              <SecurityItem icon={<ShieldCheck className="w-5 h-5" />} title="Regulatory Compliance" description="Fully licensed and operating within all applicable financial regulations." />
              <SecurityItem icon={<Lock className="w-5 h-5" />} title="Asset Insurance" description="All held assets are covered against institutional failure." />
              <SecurityItem icon={<Activity className="w-5 h-5" />} title="Cold Storage" description="Digital assets are held in offline, air-gapped vaults inaccessible to remote threats." />
              <SecurityItem icon={<Zap className="w-5 h-5" />} title="Real-Time Monitoring" description="Our security systems flag and respond to anomalous activity 24/7." />
              <SecurityItem icon={<UserCheck className="w-5 h-5" />} title="Two-Factor Authentication" description="Every login and withdrawal requires layered identity verification." />
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="space-y-12">
          <div className="text-center max-w-3xl mx-auto">
            <h3 className="text-4xl font-black tracking-tighter dark:text-white uppercase">What Our Investors Say</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <TestimonialCard 
              quote="I started with $500 and didn't really know what I was doing. Beehive made it so simple — now I check my returns the same way I check the weather."
              author="Priya M."
              memberSince="2023"
            />
            <TestimonialCard 
              quote="The transparency is what sold me. I can see exactly where every dollar is deployed. No other platform does that."
              author="James T."
              memberSince="2022"
            />
            <TestimonialCard 
              quote="Real estate investing used to feel completely out of reach. Beehive changed that. I own fractions of four properties and I've never spoken to a real estate agent."
              author="Sofia R."
              memberSince="2024"
            />
          </div>
        </div>

        {/* CTA Section */}
        <div className="card p-12 lg:p-20 bg-accent text-white border-none text-center space-y-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <img 
              src="https://images.unsplash.com/photo-1551288049-bbbda546697a?auto=format&fit=crop&q=80&w=1920" 
              alt="CTA Background" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="relative z-10 space-y-6">
            <h3 className="text-4xl lg:text-6xl font-black tracking-tighter uppercase leading-none">Start Growing Today</h3>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">
              Whether your goal is an emergency fund that actually earns, a long-term retirement strategy, or building generational wealth — Beehive has a portfolio for it.
            </p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 pt-4">
              <button 
                onClick={() => openInvestModal()}
                className="bg-white text-accent px-10 py-5 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2"
              >
                Invest Now <ArrowRight className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-70">No minimums. No lock-in periods. No guesswork.</p>
          </div>
        </div>

        {/* Key Terminology Section */}
        <div className="space-y-8">
          <h3 className="text-3xl font-black tracking-tighter dark:text-white uppercase">Key Terminology</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <TermCard title="APY (Annual Percentage Yield)" description="The real rate of return earned on an investment, taking into account the effect of compounding interest over a full year." />
            <TermCard title="Liquidity" description="How quickly and easily you can convert your investment back into cash without significantly affecting its market price." />
            <TermCard title="Spread" description="The difference between the interest rate Beehive earns on loans and the rate we pay to investors." />
            <TermCard title="Diversification" description="The practice of spreading investments across different asset classes, sectors, and geographies to reduce risk." />
            <TermCard title="Fractional Shares" description="The ability to buy a portion of a single share or asset rather than a whole unit." />
            <TermCard title="Rebalancing" description="The process of realigning the weightings of a portfolio to maintain a desired level of asset allocation." />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && selectedOption && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-primary w-full max-w-md p-8 rounded-3xl shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-6 h-6 dark:text-white" />
              </button>

              <h3 className="text-2xl font-black mb-2 dark:text-white uppercase tracking-tighter">Investment Form</h3>
              <p className="text-gray-500 mb-8 text-sm">Grow your wealth with Beehive's curated portfolios.</p>

              <form onSubmit={handleInvest} className="space-y-6">
                {error && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Select Strategy</label>
                  <div className="grid grid-cols-2 gap-2">
                    {investmentOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedOption(option)}
                        className={`p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                          selectedOption.id === option.id
                            ? 'bg-accent text-white border-accent'
                            : 'bg-gray-50 dark:bg-zinc-800 border-gray-100 dark:border-zinc-700 text-gray-500'
                        }`}
                      >
                        {option.title}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Amount ({currency.code})</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-400">{currency.symbol}</span>
                    <input 
                      type="number" 
                      required
                      min="1"
                      step="0.01"
                      className="w-full p-6 pl-10 rounded-2xl bg-gray-50 dark:bg-zinc-800 border-none text-3xl font-black focus:ring-2 focus:ring-accent dark:text-white" 
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Available Balance: {formatAmount(userData?.walletBalance || 0)}</p>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-gray-500 font-bold uppercase tracking-widest">Biweekly Returns</span>
                    <span className="font-black text-green-500">+{selectedOption.returns}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500 font-bold uppercase tracking-widest">Service Fee</span>
                    <span className="font-black dark:text-white">0.5%</span>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn-primary w-full py-5 text-lg font-black uppercase tracking-widest"
                >
                  {loading ? 'Processing...' : `Invest ${formatAmount(parseFloat(amount || '0'))}`}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </BankingFeaturePage>
  );
};

const InvestmentOption = ({ title, description, returns, icon, image, onClick }: { title: string, description: string, returns: string, icon: React.ReactNode, image: string, onClick: () => void, key?: React.Key }) => (
  <div className="card overflow-hidden p-0 group flex flex-col hover:border-accent transition-all duration-500">
    <div className="h-48 overflow-hidden relative">
      <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
      <div className="absolute top-4 left-4 w-10 h-10 rounded-xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm flex items-center justify-center text-accent shadow-lg">
        {icon}
      </div>
    </div>
    <div className="p-8 flex-grow flex flex-col justify-between space-y-6">
      <div className="space-y-3">
        <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">{title}</h3>
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{description}</p>
      </div>
      <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-zinc-800">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Biweekly Returns</p>
          <p className="text-xl font-black text-green-500">+{returns}%</p>
        </div>
        <button 
          onClick={onClick}
          className="w-12 h-12 rounded-2xl bg-accent text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-accent/20"
        >
          <ArrowUpRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  </div>
);

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="card p-8 space-y-4 hover:border-accent transition-colors">
    <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
      {icon}
    </div>
    <h4 className="font-black dark:text-white uppercase tracking-tighter">{title}</h4>
    <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
  </div>
);

const StrategyItem = ({ number, title, description }: { number: string, title: string, description: string }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-4">
      <span className="text-4xl font-black text-accent/20">{number}</span>
      <h4 className="font-black text-accent uppercase tracking-widest text-sm">{title}</h4>
    </div>
    <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
  </div>
);

const SecurityItem = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="flex gap-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
      {icon}
    </div>
    <div>
      <h4 className="font-bold text-sm dark:text-white uppercase tracking-widest">{title}</h4>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  </div>
);

const TestimonialCard = ({ quote, author, memberSince }: { quote: string, author: string, memberSince: string }) => (
  <div className="card p-8 space-y-6 relative">
    <Quote className="absolute top-8 right-8 w-12 h-12 text-accent/5" />
    <p className="text-sm italic text-gray-500 leading-relaxed relative z-10">"{quote}"</p>
    <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center font-black text-accent">
        {author[0]}
      </div>
      <div>
        <h4 className="font-bold text-sm dark:text-white">{author}</h4>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest">Member since {memberSince}</p>
      </div>
    </div>
  </div>
);

const TermCard = ({ title, description }: { title: string, description: string }) => (
  <div className="p-6 rounded-3xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 hover:border-accent transition-colors">
    <h4 className="text-xs font-black dark:text-white mb-2 uppercase tracking-widest">{title}</h4>
    <p className="text-[10px] text-gray-500 leading-relaxed">{description}</p>
  </div>
);
