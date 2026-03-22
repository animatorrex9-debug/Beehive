import React, { useState } from 'react';
import { 
  Award, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Briefcase, 
  GraduationCap, 
  Users, 
  Lightbulb, 
  Rocket, 
  Heart, 
  Sprout, 
  Globe, 
  ShieldCheck, 
  HelpCircle,
  ArrowRight,
  Target,
  Zap,
  MessageSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BankingFeaturePage } from '../../../components/dashboard/BankingFeaturePage';
import { useAuth } from '../../../hooks/useAuth';
import { db } from '../../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export const GrantsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    type: 'business',
    amount: '',
    purpose: '',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError('');

    try {
      await addDoc(collection(db, 'grants'), {
        userId: user.uid,
        ...formData,
        status: 'pending',
        timestamp: new Date().toISOString()
      });

      setSuccess(true);
    } catch (err: any) {
      console.error('Grant application error:', err);
      setError('Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <BankingFeaturePage title="Grants" description="Application Submitted" icon={Award}>
        <div className="max-w-md mx-auto text-center space-y-6 py-12">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black tracking-tighter dark:text-white">APPLICATION RECEIVED</h2>
          <p className="text-gray-500">Your grant application has been submitted successfully. Our team will review it and get back to you within 5-7 business days.</p>
          <div className="space-y-3">
            <button onClick={() => navigate('/dashboard/chat')} className="btn-primary w-full py-4 flex items-center justify-center gap-2">
              <MessageSquare className="w-5 h-5" /> Message Support
            </button>
            <button onClick={() => setSuccess(false)} className="btn-secondary w-full py-4">Apply for Another Grant</button>
          </div>
        </div>
      </BankingFeaturePage>
    );
  }

  return (
    <BankingFeaturePage 
      title="Grants" 
      description="Empowering visionaries with non-repayable capital for growth and impact"
      icon={Award}
    >
      <div className="space-y-24">
        {/* Hero Section */}
        <div className="relative rounded-[2.5rem] overflow-hidden bg-zinc-900 text-white p-12 lg:p-20">
          <div className="absolute inset-0 opacity-30">
            <img 
              src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=1920" 
              alt="Grants Background" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-accent text-xs font-black uppercase tracking-widest backdrop-blur-md">
              <Zap className="w-4 h-4" /> Beehive Impact Fund
            </div>
            <h2 className="text-4xl lg:text-6xl font-black tracking-tighter leading-none uppercase">
              Fueling Your <span className="text-accent">Ambition</span>
            </h2>
            <p className="text-xl lg:text-2xl font-medium text-gray-400">
              Capital that doesn't cost you equity or interest.
            </p>
            <p className="text-lg text-gray-400 leading-relaxed max-w-2xl">
              Beehive Grants are more than just funding; they are a partnership in progress. We provide the resources you need to turn bold ideas into reality, whether you're scaling a startup, pursuing research, or building community.
            </p>
          </div>
        </div>

        {/* Grant Categories Grid */}
        <div className="space-y-12">
          <div className="flex justify-between items-end">
            <div className="space-y-2">
              <h3 className="text-3xl font-black tracking-tighter dark:text-white uppercase">Funding Categories</h3>
              <p className="text-gray-500">Tailored support for every stage of your journey.</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <CategoryCard 
              icon={<Rocket className="w-6 h-6" />}
              title="Tech Innovation"
              description="For the disruptors building the future of software, hardware, and AI."
              image="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=800"
            />
            <CategoryCard 
              icon={<Sprout className="w-6 h-6" />}
              title="SME Scale-up"
              description="Supporting local businesses in expanding operations and hiring talent."
              image="https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&q=80&w=800"
            />
            <CategoryCard 
              icon={<GraduationCap className="w-6 h-6" />}
              title="Academic Research"
              description="Funding for groundbreaking studies and educational pursuits."
              image="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=800"
            />
            <CategoryCard 
              icon={<Heart className="w-6 h-6" />}
              title="Social Impact"
              description="For non-profits and projects creating positive community change."
              image="https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&q=80&w=800"
            />
          </div>
        </div>

        {/* Main Application Area */}
        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              <h3 className="text-3xl font-black tracking-tighter dark:text-white uppercase">Application Portal</h3>
              <p className="text-gray-500">Tell us about your project and how we can help you succeed.</p>
            </div>
            <form onSubmit={handleSubmit} className="card p-8 space-y-8 border-none shadow-xl dark:bg-zinc-900/50 backdrop-blur-sm">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Grant Type</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full p-5 rounded-2xl bg-gray-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-accent dark:text-white font-bold"
                    required
                  >
                    <option value="business">Business Expansion</option>
                    <option value="education">Education & Research</option>
                    <option value="community">Community Development</option>
                    <option value="innovation">Tech Innovation</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Requested Amount (USD)</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-gray-400">$</span>
                    <input 
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="5,000"
                      className="w-full p-5 pl-10 rounded-2xl bg-gray-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-accent dark:text-white font-black text-xl"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Purpose of Grant</label>
                <input 
                  type="text"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="e.g., Scaling renewable energy infrastructure in rural areas"
                  className="w-full p-5 rounded-2xl bg-gray-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-accent dark:text-white font-medium"
                  required
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Detailed Description & Impact</label>
                <textarea 
                  rows={6}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your project, the problem it solves, and the specific impact this grant will have..."
                  className="w-full p-5 rounded-2xl bg-gray-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-accent dark:text-white leading-relaxed"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-6 flex items-center justify-center gap-3 text-lg font-black uppercase tracking-widest"
              >
                {loading ? (
                  <>Processing...</>
                ) : (
                  <>
                    Submit Application <Send className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="space-y-12">
            <div className="space-y-6">
              <h3 className="text-2xl font-black tracking-tighter dark:text-white uppercase">Active Programs</h3>
              <div className="space-y-4">
                <GrantProgram 
                  icon={<Briefcase className="w-6 h-6 text-blue-500" />}
                  title="SME Growth Fund"
                  description="Scaling operations and talent acquisition."
                  amount="Up to $25,000"
                />
                <GrantProgram 
                  icon={<GraduationCap className="w-6 h-6 text-purple-500" />}
                  title="Academic Excellence"
                  description="Higher education and research support."
                  amount="Up to $10,000"
                />
                <GrantProgram 
                  icon={<Users className="w-6 h-6 text-green-500" />}
                  title="Social Impact"
                  description="Non-profit and community change projects."
                  amount="Up to $15,000"
                />
              </div>
            </div>

            <div className="p-8 rounded-[2rem] bg-accent/10 border border-accent/20 space-y-4">
              <h4 className="font-black text-accent uppercase tracking-widest flex items-center gap-2 text-sm">
                <ShieldCheck className="w-5 h-5" /> Eligibility Check
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                To maintain the integrity of our grants, all applicants must have a fully verified profile (**KYC Level 2**). This ensures that funds reach legitimate visionaries and impactful projects.
              </p>
              <div className="pt-2">
                <button className="text-accent font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
                  Check Status <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Success Stories Section */}
        <div className="space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h3 className="text-4xl font-black tracking-tighter dark:text-white uppercase">Success Stories</h3>
            <p className="text-gray-500">See how Beehive Grants are changing lives and industries.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <StoryCard 
              image="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800"
              title="Solar Grid Initiative"
              author="Elena K."
              quote="The $15k grant allowed us to install solar panels in three remote villages, providing electricity to over 200 families for the first time."
            />
            <StoryCard 
              image="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=800"
              title="AI for Education"
              author="Marcus T."
              quote="With the Tech Innovation grant, we built a prototype that helps students with dyslexia read 40% faster. We're now scaling globally."
            />
            <StoryCard 
              image="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=800"
              title="Urban Farming"
              author="Sarah L."
              quote="Beehive's support turned an abandoned lot into a thriving community garden that now feeds 50 families every week."
            />
          </div>
        </div>

        {/* The Process Section */}
        <div className="card p-12 lg:p-20 space-y-16 bg-zinc-900 border-none text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
            <Target className="w-full h-full text-accent" />
          </div>
          <div className="max-w-3xl space-y-6 relative z-10">
            <h3 className="text-4xl lg:text-5xl font-black tracking-tighter uppercase leading-none">The Path to Funding</h3>
            <p className="text-gray-400 text-lg leading-relaxed">
              Our selection process is rigorous but transparent. We look for projects that demonstrate clear goals, measurable impact, and sustainable models.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 relative z-10">
            <ProcessStep 
              number="01"
              title="Proposal"
              description="Submit your detailed project plan, budget, and impact projections through our secure portal."
            />
            <ProcessStep 
              number="02"
              title="Review"
              description="Our committee evaluates applications based on feasibility, innovation, and community alignment."
            />
            <ProcessStep 
              number="03"
              title="Interview"
              description="Shortlisted candidates are invited for a brief virtual discussion to dive deeper into their vision."
            />
            <ProcessStep 
              number="04"
              title="Award"
              description="Approved funds are disbursed directly to your Beehive account, ready for immediate use."
            />
          </div>
        </div>

        {/* FAQ Section */}
        <div className="space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h3 className="text-4xl font-black tracking-tighter dark:text-white uppercase">Common Questions</h3>
            <p className="text-gray-500">Everything you need to know about Beehive Grants.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <FAQItem 
              question="Are these really non-repayable?"
              answer="Yes. Beehive Grants are not loans. We do not take equity, and you do not have to pay the money back. Our return on investment is the positive impact you create."
            />
            <FAQItem 
              question="Can I apply for multiple grants?"
              answer="You can apply for different categories, but we typically only award one grant per user per calendar year to ensure fair distribution of funds."
            />
            <FAQItem 
              question="How long does the review take?"
              answer="Initial review takes 5-7 business days. If shortlisted, the entire process from application to award usually takes 3-4 weeks."
            />
            <FAQItem 
              question="What happens if my project fails?"
              answer="We understand that innovation involves risk. While we require regular progress reports, you are not penalized if the project doesn't meet all its goals, provided the funds were used as intended."
            />
          </div>
        </div>
      </div>
    </BankingFeaturePage>
  );
};

const CategoryCard = ({ icon, title, description, image }: { icon: React.ReactNode, title: string, description: string, image: string }) => (
  <div className="card overflow-hidden p-0 group flex flex-col hover:border-accent transition-all duration-500">
    <div className="h-40 overflow-hidden relative">
      <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
      <div className="absolute top-4 left-4 w-10 h-10 rounded-xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm flex items-center justify-center text-accent shadow-lg">
        {icon}
      </div>
    </div>
    <div className="p-6 space-y-3">
      <h4 className="font-black dark:text-white uppercase tracking-tighter">{title}</h4>
      <p className="text-[10px] text-gray-500 leading-relaxed">{description}</p>
    </div>
  </div>
);

const StoryCard = ({ image, title, author, quote }: { image: string, title: string, author: string, quote: string }) => (
  <div className="card p-0 overflow-hidden group">
    <div className="h-48 overflow-hidden">
      <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
    </div>
    <div className="p-8 space-y-4">
      <div className="space-y-1">
        <h4 className="font-black dark:text-white uppercase tracking-tighter text-lg">{title}</h4>
        <p className="text-xs text-accent font-bold uppercase tracking-widest">By {author}</p>
      </div>
      <p className="text-sm italic text-gray-500 leading-relaxed">"{quote}"</p>
    </div>
  </div>
);

const ProcessStep = ({ number, title, description }: { number: string, title: string, description: string }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-4">
      <span className="text-4xl font-black text-accent/20">{number}</span>
      <h4 className="font-black text-accent uppercase tracking-widest text-sm">{title}</h4>
    </div>
    <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
  </div>
);

const FAQItem = ({ question, answer }: { question: string, answer: string }) => (
  <div className="p-8 rounded-3xl bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800 space-y-3">
    <h4 className="font-black dark:text-white uppercase tracking-tighter flex items-center gap-3">
      <HelpCircle className="w-5 h-5 text-accent" /> {question}
    </h4>
    <p className="text-sm text-gray-500 leading-relaxed">{answer}</p>
  </div>
);

const GrantProgram = ({ icon, title, amount, description }: { icon: React.ReactNode, title: string, amount: string, description: string }) => (
  <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 flex items-center gap-5 hover:border-accent transition-colors group">
    <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/10 transition-colors">
      {icon}
    </div>
    <div>
      <h4 className="font-black dark:text-white text-sm uppercase tracking-tight">{title}</h4>
      <p className="text-[10px] text-gray-500 mb-1">{description}</p>
      <p className="text-sm font-black text-accent">{amount}</p>
    </div>
  </div>
);
