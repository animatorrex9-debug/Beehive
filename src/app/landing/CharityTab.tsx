import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Sparkles, 
  Users, 
  CheckCircle, 
  TrendingUp, 
  ArrowRight, 
  Coins, 
  ChevronDown, 
  Vote,
  Globe,
  PieChart
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Cause {
  id: string;
  title: string;
  category: string;
  description: string;
  votes: number;
  goal: string;
  image: string;
}

export const CharityTab = () => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'environment' | 'education' | 'humanitarian'>('all');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [votedId, setVotedId] = useState<string | null>(null);
  const [causes, setCauses] = useState<Cause[]>([
    {
      id: 'sahel',
      title: 'Green Sahel Re-forestation',
      category: 'environment',
      description: 'Planting drought-resistant native trees across the Sahel to combat desertification and support local agroforestry.',
      votes: 1420,
      goal: '2,500 tree saplings',
      image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=600'
    },
    {
      id: 'code',
      title: 'Digital Classrooms for Rural Youth',
      category: 'education',
      description: 'Providing refurbished solar-powered laptops and offline programming curriculums to schools in remote mountain regions.',
      votes: 1850,
      goal: '15 community centers',
      image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=600'
    },
    {
      id: 'water',
      title: 'Clean Water Safe Aquifers',
      category: 'humanitarian',
      description: 'Constructing community-managed solar water pumping wells and sand filters to eradicate waterborne diseases.',
      votes: 1640,
      goal: '12 new clean wells',
      image: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&q=80&w=600'
    }
  ]);

  const handleVote = (id: string) => {
    if (votedId) return;
    setVotedId(id);
    setCauses(prev => prev.map(c => c.id === id ? { ...c, votes: c.votes + 1 } : c));
  };

  const totalVotes = causes.reduce((sum, c) => sum + c.votes, 0);

  const partners = [
    {
      name: 'Earth Alliance Foundation',
      category: 'environment',
      description: 'Global organization focusing on wild ecosystem restoration and carbon offset verification.',
      matching: 'Beehive matches up to $100 per donation'
    },
    {
      name: 'Girls Who Code Global',
      category: 'education',
      description: 'Equipping young girls in underrepresented communities with computer science and engineering skills.',
      matching: '1:1 direct contribution match'
    },
    {
      name: 'Water for Everyone',
      category: 'humanitarian',
      description: 'Installing state-of-the-art biological water filters in schools and medical clinics worldwide.',
      matching: 'Double-match campaign active'
    },
    {
      name: 'Rainforest Sanctuary Initiative',
      category: 'environment',
      description: 'Directly purchasing vulnerable rainforest land parcels to prevent logging and logging roads.',
      matching: 'Beehive matches up to $250'
    },
    {
      name: 'Books & Bricks',
      category: 'education',
      description: 'Building libraries and stocking educational books for schools in underserved communities.',
      matching: 'Beehive matches up to $50'
    },
    {
      name: 'Red Crescent Medical Relief',
      category: 'humanitarian',
      description: 'Deploying quick-response emergency clinics and standard healthcare resources during natural crises.',
      matching: '100% Direct Matching Pool'
    }
  ];

  const filteredPartners = activeFilter === 'all' 
    ? partners 
    : partners.filter(p => p.category === activeFilter);

  const charityFaqs = [
    {
      q: "Does Beehive charge any fees on charitable contributions?",
      a: "Absolutely not. Beehive absorbs all processing, merchant, and network transaction fees. 100% of your round-ups and direct donations reach your chosen non-profit partner."
    },
    {
      q: "How does the Transaction Roundup feature work?",
      a: "When you activate Roundups, every purchase you make with your Beehive card is rounded to the nearest dollar. For example, a coffee purchase of $4.20 is rounded to $5.00, and the $0.80 difference is automatically transferred into your Charity Pool."
    },
    {
      q: "Where does Beehive’s own corporate contribution come from?",
      a: "Beehive donates 10% of our transactional spread earnings (the micro-difference earned during international currency swaps and corporate trades) back into the community grant pool."
    },
    {
      q: "Are these donations tax-deductible?",
      a: "Yes. All charity partners are verified 501(c)(3) organizations or international equivalents. Beehive generates a consolidated annual tax certificate containing your detailed charitable contribution ledger for easy deduction claiming."
    },
    {
      q: "Can I nominate a local charity to receive funding?",
      a: "Yes! Beehive accounts in good standing can submit local charity profiles. Once vetted by our impact team, they are placed in the monthly Community Voting pool."
    }
  ];

  return (
    <div className="space-y-24 py-12">
      {/* HERO SECTION */}
      <section className="text-center max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-green-500/10 text-accent font-bold text-sm tracking-wider uppercase"
        >
          <Heart className="w-4 h-4" /> Banking with a Mission
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-7xl font-black tracking-tighter mb-6 leading-tight dark:text-white"
        >
          FINANCE THAT <br />
          <span className="text-accent">BUILDS THE FUTURE</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg md:text-xl text-gray-500 dark:text-gray-400 mb-10 max-w-2xl mx-auto"
        >
          We believe a bank should do more than safeguard capital—it should create equity. Through Beehive Charity, our profits and community micro-donations directly fuel social and ecological repair.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center"
        >
          <Link to="/auth/signup" className="btn-primary px-10 py-4 text-lg flex items-center gap-2">
            Open a Purpose-Driven Account <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </section>

      {/* STATS RHYTHM */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="card p-8 bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/10 text-accent flex items-center justify-center mx-auto mb-4">
              <Coins className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Total Funds Disbursed</p>
            <p className="text-4xl font-black dark:text-white mt-1">$1,428,500</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">100% direct-to-cause with zero cuts</p>
          </div>

          <div className="card p-8 bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/10 text-accent flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Verified Projects Funded</p>
            <p className="text-4xl font-black dark:text-white mt-1">180+</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Globally vetted community initiatives</p>
          </div>

          <div className="card p-8 bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/10 text-accent flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Matching Contribution Ratio</p>
            <p className="text-4xl font-black dark:text-white mt-1">1 : 1 Match</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Beehive doubles member contributions</p>
          </div>
        </div>
      </section>

      {/* THE COMMUNITY MISSION STATEMENT */}
      <section className="bg-zinc-900 dark:bg-zinc-900 text-white py-20 px-6 rounded-[2rem] max-w-7xl mx-auto overflow-hidden relative">
        <div className="absolute -inset-10 bg-gradient-to-r from-green-500/10 to-emerald-500/10 blur-3xl opacity-30" />
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <Heart className="w-12 h-12 text-accent mx-auto mb-6" />
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-6">Our Mission Philosophy</h2>
          <p className="text-lg md:text-xl text-zinc-300 leading-relaxed font-light">
            "Traditional banking concentrates capital into stagnant reserves. Beehive’s core philosophy is that capital must flow dynamically to heal social structures and revitalize communities. Through micro-donations and direct-profit pledges, we ensure every transaction generates a circular return of social goodwill."
          </p>
          <div className="mt-8 flex justify-center gap-8 text-sm font-bold tracking-widest text-zinc-400 uppercase">
            <span>● Radically Transparent</span>
            <span>● 100% Fee-Free</span>
            <span>● Democratic Control</span>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS / PILLARS */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter dark:text-white">
            THE TRIPLE <span className="text-accent">IMPACT ENGINE</span>
          </h2>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mt-4">
            How we mobilize resources without placing financial strain on our users.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-accent font-bold text-lg">1</div>
            <h3 className="text-xl font-bold dark:text-white">Beehive 10% Profit Pledge</h3>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">
              We donate 10% of our daily platform transactional fees and international conversion spread directly into the community grant fund. This builds a robust, self-sustaining financial foundation for major quarterly initiatives.
            </p>
          </div>

          <div className="space-y-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-accent font-bold text-lg">2</div>
            <h3 className="text-xl font-bold dark:text-white">Daily Transaction Roundups</h3>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">
              Members can seamlessly opt-in to round up card transactions to the nearest dollar. These micro-cents collect in your secure charity wallet and are matched 1:1 by Beehive before being dispatched to our verified non-profits.
            </p>
          </div>

          <div className="space-y-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-accent font-bold text-lg">3</div>
            <h3 className="text-xl font-bold dark:text-white">Zero-Overhead Transparency</h3>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">
              Unlike traditional charity funds where administrative tasks swallow up to 40% of giving, Beehive covers all platform costs, personnel, and compliance internally. Every single penny of your roundups reaches the cause.
            </p>
          </div>
        </div>
      </section>

      {/* DYNAMIC COMMUNITY VOTING INTERACTIVE DEMO */}
      <section className="max-w-7xl mx-auto px-6 bg-gray-50 dark:bg-zinc-900/50 rounded-3xl p-8 md:p-12 border border-gray-100 dark:border-zinc-900">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-bold text-accent uppercase tracking-widest bg-green-500/10 px-3 py-1 rounded-full">Community Power</span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-3 dark:text-white">
              DEMOCRATIC <br />
              <span className="text-accent">DECISION MAKING</span>
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-4 leading-relaxed">
              Beehive does not decide who gets funded; our members do. Every month, we distribute our corporate matching fund according to democratic votes submitted by our account holders. 
            </p>
            <div className="mt-6 p-4 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm flex gap-3 items-center">
              <Vote className="w-8 h-8 text-accent flex-shrink-0" />
              <p className="text-gray-600 dark:text-gray-300">
                <strong>Try it yourself:</strong> Cast a demo vote on the active initiatives below to see how community power shifts allocation dynamically!
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-bold uppercase tracking-wider text-gray-400">Current Grant Nominees</h3>
            {causes.map(cause => {
              const percentage = totalVotes > 0 ? Math.round((cause.votes / totalVotes) * 100) : 0;
              const hasVotedThis = votedId === cause.id;
              
              return (
                <div key={cause.id} className="card p-5 bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800">
                  <div className="flex gap-4">
                    <img 
                      src={cause.image} 
                      alt={cause.title} 
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[10px] font-bold text-accent bg-green-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {cause.category}
                        </span>
                        <span className="text-xs font-bold text-gray-400">{cause.votes} votes</span>
                      </div>
                      <h4 className="font-bold text-sm dark:text-white mt-1 truncate">{cause.title}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{cause.description}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between items-center text-xs font-bold text-gray-400 mb-1">
                      <span>Fund Target: {cause.goal}</span>
                      <span className="text-accent">{percentage}% of grant pool</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="h-full bg-accent rounded-full"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => handleVote(cause.id)}
                      disabled={votedId !== null}
                      className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${
                        hasVotedThis 
                          ? 'bg-accent text-white' 
                          : votedId !== null 
                            ? 'bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed'
                            : 'bg-green-500/10 text-accent hover:bg-accent hover:text-white'
                      }`}
                    >
                      {hasVotedThis ? 'Voted ✓' : 'Cast Vote'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FILTERABLE PARTNERS LIST */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter dark:text-white">
            OUR TRUSTED <span className="text-accent">IMPACT PARTNERS</span>
          </h2>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mt-4">
            We partner only with registered, transparent NGOs subject to direct third-party audit.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {(['all', 'environment', 'education', 'humanitarian'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                activeFilter === filter 
                  ? 'bg-accent text-white shadow-md' 
                  : 'bg-gray-100 dark:bg-zinc-900 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-800'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Partners Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredPartners.map((partner, index) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                key={partner.name}
                className="card p-6 bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-bold text-accent bg-green-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider inline-block">
                    {partner.category}
                  </span>
                  <h4 className="font-bold text-lg dark:text-white mt-3">{partner.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                    {partner.description}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-zinc-800 text-xs font-bold text-accent flex items-center gap-1.5 uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" /> {partner.matching}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* CHARITY SPECIFIC FAQ */}
      <section className="max-w-3xl mx-auto px-6">
        <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-center mb-12 dark:text-white">
          CHARITY <span className="text-accent">FAQ</span>
        </h2>

        <div className="space-y-4">
          {charityFaqs.map((faq, index) => (
            <div 
              key={index}
              className="card p-0 overflow-hidden bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800"
            >
              <button 
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="w-full p-6 flex justify-between items-center text-left hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <span className="text-md font-bold dark:text-white">{faq.q}</span>
                <ChevronDown className={`w-5 h-5 transition-transform ${openFaq === index ? 'rotate-180' : ''} dark:text-white`} />
              </button>
              <AnimatePresence>
                {openFaq === index && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-6 pb-6 text-gray-500 dark:text-gray-400 text-sm leading-relaxed"
                  >
                    {faq.a}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="text-center bg-green-500/10 py-16 px-6 rounded-3xl max-w-5xl mx-auto border border-accent/20">
        <Heart className="w-12 h-12 text-accent mx-auto mb-4 animate-pulse" />
        <h2 className="text-3xl md:text-5xl font-black dark:text-white tracking-tight">Make Your Wealth Work For Good</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto mt-3">
          Join thousands of other mindful spenders who choose to make an impact on every cup of coffee, trip, or invoice.
        </p>
        <div className="mt-8">
          <Link to="/auth/signup" className="btn-primary px-8 py-3 text-base">Open Your Free Account</Link>
        </div>
      </section>
    </div>
  );
};

const CheckCircle2 = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
);
