import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Percent, 
  Clock, 
  Coins, 
  ArrowRight, 
  Calculator, 
  CheckCircle, 
  TrendingUp, 
  Info,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const LoansTab = () => {
  const [loanAmount, setLoanAmount] = useState<number>(10000);
  const [loanDuration, setLoanDuration] = useState<number>(12);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Realistic transparent lending calculator logic (starting at 6% annual rate)
  const annualRate = 0.06; 
  const monthlyRate = annualRate / 12;
  const monthlyRepayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, loanDuration)) / (Math.pow(1 + monthlyRate, loanDuration) - 1);
  const totalRepayment = monthlyRepayment * loanDuration;
  const totalInterest = totalRepayment - loanAmount;

  const formats = (num: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
  };

  const formattedRepayment = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(monthlyRepayment);

  const tiers = [
    {
      name: 'Starter Springboard',
      amount: '$1,000 - $5,000',
      apr: 'As low as 5.0% APR',
      term: '3 - 12 Months',
      bestFor: 'Personal expenses, medical bridging, or emergency funds.',
      features: ['No credit pull required', 'Disbursed in 2 minutes', 'Flexible weekly repay']
    },
    {
      name: 'Community Growth',
      amount: '$5,001 - $25,000',
      apr: 'As low as 6.2% APR',
      term: '12 - 36 Months',
      bestFor: 'Debt consolidation, vehicle purchase, or home improvement.',
      features: ['Cashflow-based assessment', 'Interest rebate on early pay', 'Dedicated account adviser']
    },
    {
      name: 'Business Catalyst',
      amount: '$25,001 - $100,000',
      apr: 'As low as 7.5% APR',
      term: '12 - 60 Months',
      bestFor: 'Scaling operations, buying inventory, or hiring talent.',
      features: ['Revenue-linked schedules', 'Interest-only grace options', 'Zero personal assets collateral']
    }
  ];

  const loanFaqs = [
    {
      q: "How does Beehive’s cashflow-based underwriting work?",
      a: "Unlike traditional banks that rely solely on credit bureau scores, Beehive analyzes your active income stream, recurring cash flow patterns, and savings consistency in your secure bank account. This lets us qualify credit-worthy individuals who may have thin or imperfect traditional files."
    },
    {
      q: "Are there penalties for early repayment?",
      a: "Never. We actively encourage early repayments. If you pay off your loan ahead of schedule, you only pay interest for the days the loan was actually open. No pre-payment penalties or hidden closure fees."
    },
    {
      q: "What is an 'On-Time Repayment Rebate'?",
      a: "As part of our mission to build financial wellness, every loan comes with a loyalty tracker. For every month you make on-time repayments, Beehive refunds 10% of that month’s interest portion back to your savings wallet instantly."
    },
    {
      q: "How fast are funds deposited after approval?",
      a: "Once approved, funds are disbursed instantly into your secure Beehive account wallet. You can spend it immediately using virtual cards, swap it, or withdraw to external accounts."
    },
    {
      q: "What happens if my financial situation shifts and I miss a payment?",
      a: "At Beehive, we practice empathetic lending. If you experience an income disruption (such as job loss or medical emergency), you can access the 'Repayment Pause' or restructure tool in your dashboard to adjust your dates. No hidden compound penalties."
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
          <ShieldCheck className="w-4 h-4" /> CREDIT AS A SPRINGBOARD
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-7xl font-black tracking-tighter mb-6 leading-tight dark:text-white"
        >
          FAIR CAPITAL FOR <br />
          <span className="text-accent">HUMAN POTENTIAL</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg md:text-xl text-gray-500 dark:text-gray-400 mb-10 max-w-2xl mx-auto"
        >
          Traditional banks extract interest to compound their profits. Beehive lends to activate growth. Explore transparent, fair-rate loans engineered to help you thrive, not keep you trapped.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center"
        >
          <Link to="/auth/signup" className="btn-primary px-10 py-4 text-lg flex items-center gap-2">
            Calculate & Apply Now <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </section>

      {/* CORE STATS RHYTHM */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-6">
          <div className="card p-6 bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 text-center">
            <div className="w-10 h-10 rounded-full bg-green-500/10 text-accent flex items-center justify-center mx-auto mb-3">
              <Percent className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Starting Rate</p>
            <p className="text-3xl font-black dark:text-white mt-1">5.0% APR</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Highly competitive transparent pricing</p>
          </div>

          <div className="card p-6 bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 text-center">
            <div className="w-10 h-10 rounded-full bg-green-500/10 text-accent flex items-center justify-center mx-auto mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Average Approval</p>
            <p className="text-3xl font-black dark:text-white mt-1">3 Minutes</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Automated non-extractive scoring</p>
          </div>

          <div className="card p-6 bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 text-center">
            <div className="w-10 h-10 rounded-full bg-green-500/10 text-accent flex items-center justify-center mx-auto mb-3">
              <Coins className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Repayment Rebate</p>
            <p className="text-3xl font-black dark:text-white mt-1">10% Back</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">On-time interest cashbacks</p>
          </div>

          <div className="card p-6 bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 text-center">
            <div className="w-10 h-10 rounded-full bg-green-500/10 text-accent flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Hidden Charges</p>
            <p className="text-3xl font-black dark:text-white mt-1">Zero</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No setup, exit, or late penalties</p>
          </div>
        </div>
      </section>

      {/* LOAN PHILOSOPHY BANNER */}
      <section className="bg-zinc-900 dark:bg-zinc-900 text-white py-20 px-6 rounded-[2rem] max-w-7xl mx-auto overflow-hidden relative">
        <div className="absolute -inset-10 bg-gradient-to-r from-green-500/10 to-emerald-500/10 blur-3xl opacity-30" />
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <ShieldCheck className="w-12 h-12 text-accent mx-auto mb-6" />
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-6">Our Lending Ethics</h2>
          <p className="text-lg md:text-xl text-zinc-300 leading-relaxed font-light">
            "Debt can either build or destroy. When structured predatory, it chains families to their past. When built ethically, it empowers communities to shape their future. At Beehive, we cap interest margins, offer payment pauses, and never sell your credit details. We grow only when you succeed."
          </p>
          <div className="mt-8 flex justify-center gap-8 text-sm font-bold tracking-widest text-zinc-400 uppercase">
            <span>● No predatory compounding</span>
            <span>● Cashflow-focused evaluation</span>
            <span>● Direct Wallet Deposit</span>
          </div>
        </div>
      </section>

      {/* DETAILED LOAN CALCULATOR */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="bg-gray-50 dark:bg-zinc-900/50 rounded-3xl p-8 md:p-12 border border-gray-100 dark:border-zinc-900">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-accent uppercase tracking-widest bg-green-500/10 px-3 py-1 rounded-full">Interactive Estimator</span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-3 dark:text-white">Estimate Your Springboard</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto mt-2 text-sm">
              Adjust the settings below to see your guaranteed repayment structure. No hidden variables.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Controls */}
            <div className="space-y-8">
              <div className="space-y-3">
                <div className="flex justify-between font-bold dark:text-white">
                  <span>How much do you need?</span>
                  <span className="text-accent text-xl">{formats(loanAmount)}</span>
                </div>
                <input 
                  type="range" 
                  min="1000" 
                  max="50000" 
                  step="500"
                  value={loanAmount} 
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="w-full accent-accent h-2 bg-gray-200 dark:bg-zinc-800 rounded-lg cursor-pointer appearance-none"
                />
                <div className="flex justify-between text-xs text-gray-400 font-semibold">
                  <span>$1,000</span>
                  <span>$25,000</span>
                  <span>$50,000</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between font-bold dark:text-white">
                  <span>For how long?</span>
                  <span className="text-accent text-xl">{loanDuration} Months</span>
                </div>
                <input 
                  type="range" 
                  min="3" 
                  max="36" 
                  step="1"
                  value={loanDuration} 
                  onChange={(e) => setLoanDuration(Number(e.target.value))}
                  className="w-full accent-accent h-2 bg-gray-200 dark:bg-zinc-800 rounded-lg cursor-pointer appearance-none"
                />
                <div className="flex justify-between text-xs text-gray-400 font-semibold">
                  <span>3 Months</span>
                  <span>18 Months</span>
                  <span>36 Months</span>
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 flex items-start gap-3">
                <Info className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  <strong>Transparent Rate Guarantee:</strong> Estimates are based on an active annual interest rate of <strong>6.0% APR</strong>. Your final rate is locked upon approval and never compounds.
                </div>
              </div>
            </div>

            {/* Display Board */}
            <div className="card p-8 bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 flex flex-col justify-between shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-xl" />
              
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Estimated Monthly Repayment</p>
                  <p className="text-5xl md:text-6xl font-black text-accent mt-1 tracking-tight">{formattedRepayment}</p>
                </div>

                <div className="border-t border-gray-100 dark:border-zinc-800/60 pt-6 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Principal Loan</p>
                    <p className="text-xl font-bold dark:text-white mt-1">{formats(loanAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Total Interest Cost</p>
                    <p className="text-xl font-bold dark:text-white mt-1">{formats(totalInterest)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-gray-400">
                    <span>Principal vs Interest ratio</span>
                    <span>100% Transparent</span>
                  </div>
                  <div className="w-full h-3 bg-red-500 rounded-full overflow-hidden flex">
                    <div 
                      className="h-full bg-accent" 
                      style={{ width: `${(loanAmount / totalRepayment) * 100}%` }}
                      title="Principal portion"
                    />
                    <div 
                      className="h-full bg-orange-400" 
                      style={{ width: `${(totalInterest / totalRepayment) * 100}%` }}
                      title="Interest portion"
                    />
                  </div>
                  <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-1">
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 bg-accent rounded-sm" /> Principal (90-98%)
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 bg-orange-400 rounded-sm" /> Interest Cost (2-10%)
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link to="/auth/signup" className="btn-primary w-full text-center block py-4 text-base font-bold shadow-md hover:shadow-lg">
                  Submit Loan Interest Setup
                </Link>
                <p className="text-center text-[10px] text-gray-400 font-semibold mt-3 uppercase tracking-wider">
                  Applying takes 3 minutes • No impact to your FICO score
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LOAN TIERS & PRODUCTS */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter dark:text-white">
            CHOOSE YOUR <span className="text-accent">CREDIT TIER</span>
          </h2>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mt-4">
            Highly structured tiers built to adapt to personal, professional, or social-impact funding.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {tiers.map((tier, idx) => (
            <div key={idx} className="card p-8 bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 flex flex-col justify-between hover:border-accent transition-all group">
              <div>
                <span className="text-[10px] font-bold text-accent bg-green-500/10 px-3 py-1 rounded-full uppercase tracking-widest">{tier.name}</span>
                <p className="text-3xl font-black dark:text-white mt-6">{tier.amount}</p>
                <div className="flex items-center gap-2 text-sm font-bold text-accent mt-2">
                  <Percent className="w-4 h-4" /> {tier.apr} • {tier.term}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 leading-relaxed">{tier.bestFor}</p>
                
                <hr className="border-gray-100 dark:border-zinc-800 my-6" />
                
                <ul className="space-y-3">
                  {tier.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                      <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <Link to="/auth/signup" className="w-full text-center block py-3 text-sm font-bold border-2 border-accent text-accent rounded-full hover:bg-accent hover:text-white transition-all">
                  Inquire This Tier
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* LOAN SPECIFIC FAQ */}
      <section className="max-w-3xl mx-auto px-6">
        <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-center mb-12 dark:text-white">
          LENDING <span className="text-accent">FAQ</span>
        </h2>

        <div className="space-y-4">
          {loanFaqs.map((faq, index) => (
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

      {/* LOANS CTA */}
      <section className="text-center bg-green-500/10 py-16 px-6 rounded-3xl max-w-5xl mx-auto border border-accent/20">
        <Calculator className="w-12 h-12 text-accent mx-auto mb-4" />
        <h2 className="text-3xl md:text-5xl font-black dark:text-white tracking-tight">Your Partner In Fair Financial Growth</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto mt-3">
          Apply in less than 3 minutes with zero commitment or negative impact on your current credit scoring profiles.
        </p>
        <div className="mt-8">
          <Link to="/auth/signup" className="btn-primary px-8 py-3 text-base">Get Approved Capital</Link>
        </div>
      </section>
    </div>
  );
};
