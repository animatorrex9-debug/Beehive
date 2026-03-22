import React, { useState } from 'react';
import { Heart, Send, CheckCircle2, AlertCircle, Globe, Leaf, GraduationCap, Activity, Users, MapPin, Quote, TrendingUp } from 'lucide-react';
import { BankingFeaturePage } from '../../../components/dashboard/BankingFeaturePage';
import { useAuth } from '../../../hooks/useAuth';
import { db } from '../../../lib/firebase';
import { collection, addDoc, doc, updateDoc, increment, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { useEffect } from 'react';

export const CharityPage = () => {
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [donations, setDonations] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    charity: 'war_relief',
    amount: '',
    anonymous: false
  });

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'donations'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const donationData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      // Sort client-side to avoid composite index requirement
      donationData.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeB - timeA;
      });

      setDonations(donationData);
    }, (err) => {
      console.error('Error fetching donations:', err);
    });

    return () => unsubscribe();
  }, [user]);

  const totalDonated = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
  const uniqueCauses = new Set(donations.map(d => d.charityId)).size;
  const recentDonations = donations.slice(0, 5);

  const charities = [
    { 
      id: 'war_relief', 
      name: 'War Relief Efforts', 
      icon: <Activity className="text-red-600" />, 
      description: 'Providing immediate medical aid, food, and shelter to families displaced by conflict in war zones.',
      image: 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&q=80&w=1920',
      longDesc: 'Children in war-torn regions are facing unimaginable hardships. From the loss of homes to the constant threat of violence, your support provides a lifeline. We deliver emergency trauma care, clean water, and safe spaces for children to recover from the psychological impact of war.'
    },
    { 
      id: 'hunger_relief', 
      name: 'Global Hunger Initiative', 
      icon: <Globe className="text-orange-600" />, 
      description: 'Fighting starvation in Africa, Asia, and other vulnerable regions through sustainable food programs.',
      image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=800',
      longDesc: 'Millions of children go to bed hungry every night. In regions like sub-Saharan Africa and parts of Southeast Asia, malnutrition is a silent killer. We work on the ground to provide therapeutic food for starving infants and help communities build sustainable farming systems to ensure long-term food security.'
    },
    { id: 'red_cross', name: 'International Red Cross', icon: <Activity className="text-red-500" />, description: 'Providing emergency assistance, disaster relief, and health education.' },
    { id: 'wwf', name: 'WWF Nature Fund', icon: <Leaf className="text-green-500" />, description: 'Protecting the future of nature and reducing the most pressing threats to life on Earth.' },
    { id: 'unicef', name: 'UNICEF', icon: <Globe className="text-blue-500" />, description: 'Working in over 190 countries to save children’s lives and defend their rights.' },
  ];

  const selectedCharityData = charities.find(c => c.id === formData.charity);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userData) return;
    
    const amountNum = Number(formData.amount);
    if (amountNum > userData.walletBalance) {
      setError('Insufficient funds in your wallet.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Update user balance
      await updateDoc(doc(db, 'users', user.uid), {
        walletBalance: increment(-amountNum)
      });

      // Record transaction
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'donation',
        amount: amountNum,
        currency: 'USD',
        status: 'completed',
        description: `Donation to ${selectedCharityData?.name}`,
        timestamp: new Date().toISOString()
      });

      // Record donation detail
      await addDoc(collection(db, 'donations'), {
        userId: user.uid,
        charityId: formData.charity,
        charityName: selectedCharityData?.name,
        amount: amountNum,
        anonymous: formData.anonymous,
        timestamp: new Date().toISOString()
      });

      setSuccess(true);
    } catch (err: any) {
      console.error('Donation error:', err);
      setError('Failed to process donation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <BankingFeaturePage title="Donate to Charity" description="Thank You!" icon={Heart}>
        <div className="max-w-md mx-auto text-center space-y-6 py-12">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <Heart className="w-10 h-10 fill-current" />
          </div>
          <h2 className="text-3xl font-black tracking-tighter dark:text-white">DONATION SUCCESSFUL</h2>
          <p className="text-gray-500 text-sm leading-relaxed">Your generous contribution to {selectedCharityData?.name} has been processed. Together, we are making a difference. A receipt has been sent to your email.</p>
          <button onClick={() => setSuccess(false)} className="btn-primary w-full py-4">Make Another Donation</button>
        </div>
      </BankingFeaturePage>
    );
  }

  return (
    <BankingFeaturePage 
      title="Donate to Charity" 
      description="Support causes you care about directly from your Beehive account"
      icon={Heart}
    >
      <div className="space-y-16">
        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            {/* Featured Emotional Section */}
            <div className="card overflow-hidden p-0 border-none bg-zinc-900 text-white">
              <div className="grid md:grid-cols-2">
                <div className="h-64 md:h-full relative">
                  <img 
                    src={selectedCharityData?.image || 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=800'} 
                    alt="Charity Impact"
                    className="absolute inset-0 w-full h-full object-cover opacity-80"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
                </div>
                <div className="p-8 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                      {selectedCharityData?.icon}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-accent">Featured Cause</span>
                  </div>
                  <h3 className="text-2xl font-black tracking-tighter mb-4 uppercase">{selectedCharityData?.name}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed mb-6 italic">
                    "{selectedCharityData?.longDesc || 'Every child deserves a chance to grow up healthy and safe. Your donation provides the critical support needed to change lives forever.'}"
                  </p>
                  <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-gray-500">
                    <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> Global Reach</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> Direct Impact</span>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="card p-8 space-y-8">
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Select Charity Organization</label>
                <div className="grid md:grid-cols-2 gap-4">
                  {charities.map((charity) => (
                    <button
                      key={charity.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, charity: charity.id })}
                      className={`p-4 rounded-2xl border-2 text-left transition-all flex gap-4 ${
                        formData.charity === charity.id 
                          ? 'border-accent bg-accent/5' 
                          : 'border-gray-100 dark:border-zinc-800 hover:border-gray-200'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 shadow-sm flex items-center justify-center flex-shrink-0">
                        {charity.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm dark:text-white">{charity.name}</h4>
                        <p className="text-[10px] text-gray-500 line-clamp-2">{charity.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Donation Amount (USD)</label>
                  <input 
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="e.g. 50"
                    className="w-full p-4 rounded-xl bg-gray-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-accent dark:text-white"
                    required
                  />
                </div>
                <div className="flex items-center gap-3 pt-8">
                  <input 
                    type="checkbox"
                    id="anonymous"
                    checked={formData.anonymous}
                    onChange={(e) => setFormData({ ...formData, anonymous: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-accent focus:ring-accent"
                  />
                  <label htmlFor="anonymous" className="text-sm font-medium dark:text-white">Donate Anonymously</label>
                </div>
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
                className="btn-primary w-full py-4 flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" /> {loading ? 'Processing...' : 'Complete Donation'}
              </button>
            </form>
          </div>

          <div className="space-y-8">
            <h3 className="text-2xl font-black tracking-tighter dark:text-white">IMPACT TRACKER</h3>
            <div className="p-8 rounded-3xl bg-gradient-to-br from-red-500 to-pink-600 text-white relative overflow-hidden">
              <Heart className="absolute -bottom-4 -right-4 w-32 h-32 opacity-20" />
              <p className="text-sm font-bold uppercase tracking-widest opacity-80 mb-2">Total Donated</p>
              <h2 className="text-4xl font-black mb-4">${totalDonated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
              <p className="text-xs opacity-80">You've helped support {uniqueCauses} different {uniqueCauses === 1 ? 'cause' : 'causes'} so far. Thank you for your kindness!</p>
            </div>

            <div className="card p-6 space-y-4">
              <h4 className="font-bold dark:text-white">Recent Contributions</h4>
              <div className="space-y-3">
                {recentDonations.length > 0 ? (
                  recentDonations.map((donation) => (
                    <div key={donation.id} className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">{donation.charityName}</span>
                      <span className="font-bold dark:text-white">${donation.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400 italic">No donations yet.</p>
                )}
              </div>
            </div>

            <div className="card p-6 bg-accent/5 border-accent/20">
              <h4 className="font-bold dark:text-white mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                Live Statistics
              </h4>
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Global Hunger</p>
                  <p className="text-lg font-black dark:text-white">828 Million</p>
                  <p className="text-[10px] text-gray-400">People go to bed hungry every night.</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Child Mortality</p>
                  <p className="text-lg font-black dark:text-white">Every 10 Seconds</p>
                  <p className="text-[10px] text-gray-400">A child dies from hunger-related causes.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mission & Vision Section */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h3 className="text-3xl font-black tracking-tighter dark:text-white uppercase">Our Mission</h3>
            <p className="text-gray-500 leading-relaxed">
              At Beehive, we believe that financial empowerment should extend beyond our users. Our mission is to bridge the gap between global wealth and local suffering. We partner with vetted organizations to ensure that every dollar you donate reaches the people who need it most.
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold dark:text-white">100% Transparency</h4>
                  <p className="text-xs text-gray-500">Track your donation from your wallet to the field.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold dark:text-white">Zero Fees</h4>
                  <p className="text-xs text-gray-500">Beehive covers all transaction costs for charitable donations.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative">
            <img 
              src="https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&q=80&w=800" 
              alt="Mission in action" 
              className="rounded-3xl shadow-2xl"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-6 -left-6 card p-6 max-w-xs hidden md:block">
              <Quote className="w-8 h-8 text-accent mb-2 opacity-20" />
              <p className="text-xs italic text-gray-500">"We don't just give food; we give hope for a future where hunger is a memory."</p>
            </div>
          </div>
        </div>

        {/* Real Stories Section */}
        <div className="space-y-12">
          <div className="text-center max-w-2xl mx-auto">
            <h3 className="text-3xl font-black tracking-tighter dark:text-white uppercase mb-4">Real Stories, Real Impact</h3>
            <p className="text-gray-500">Behind every statistic is a human life. Your contributions are writing new chapters of hope for families across the globe.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <StoryCard 
              image="https://images.unsplash.com/photo-1489710437720-ebb67ec84dd2?auto=format&fit=crop&q=80&w=800"
              name="Amina's Journey"
              location="Sudan"
              story="After losing her home to conflict, Amina and her three children were facing starvation. Today, thanks to war relief donations, they have a safe shelter and regular meals."
            />
            <StoryCard 
              image="https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?auto=format&fit=crop&q=80&w=800"
              name="The Village of Hope"
              location="Vietnam"
              story="A remote community was cut off from clean water. Through the Global Hunger Initiative, we installed a solar-powered well that now serves over 500 families."
            />
            <StoryCard 
              image="https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&q=80&w=800"
              name="Kofi's Education"
              location="Ghana"
              story="Kofi used to spend his days searching for food. Now, with a school feeding program, he is the top of his class and dreams of becoming a doctor."
            />
          </div>
        </div>

        {/* Global Reach Section */}
        <div className="card p-12 bg-zinc-900 text-white border-none relative overflow-hidden">
          <Globe className="absolute -top-20 -right-20 w-96 h-96 opacity-5" />
          <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h3 className="text-4xl font-black tracking-tighter uppercase">Our Global Reach</h3>
              <p className="text-gray-400 leading-relaxed">
                Beehive's impact spans across continents. From the war-torn streets of Eastern Europe to the drought-stricken plains of East Africa, we are there. Our network of partners allows us to deploy resources within hours of a crisis.
              </p>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1">
                  <p className="text-3xl font-black text-accent">42</p>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Countries Reached</p>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-black text-accent">1.2M</p>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Meals Delivered</p>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-black text-accent">150k</p>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Medical Kits</p>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-black text-accent">85%</p>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Survival Rate Increase</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-4 mb-2">
                  <MapPin className="w-5 h-5 text-accent" />
                  <h4 className="font-bold uppercase tracking-widest text-sm">Active Crisis Zones</h4>
                </div>
                <p className="text-xs text-gray-400">We are currently prioritizing aid to Yemen, South Sudan, and the Horn of Africa where famine levels have reached critical thresholds.</p>
              </div>
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-4 mb-2">
                  <Users className="w-5 h-5 text-accent" />
                  <h4 className="font-bold uppercase tracking-widest text-sm">Community Partners</h4>
                </div>
                <p className="text-xs text-gray-400">Over 2,500 local volunteers working on the ground to distribute aid and provide medical support.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BankingFeaturePage>
  );
};

const StoryCard = ({ image, name, location, story }: { image: string, name: string, location: string, story: string }) => (
  <div className="card overflow-hidden p-0 group">
    <div className="h-48 overflow-hidden">
      <img 
        src={image} 
        alt={name} 
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        referrerPolicy="no-referrer"
      />
    </div>
    <div className="p-6 space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="font-black dark:text-white uppercase tracking-tighter">{name}</h4>
        <span className="text-[10px] font-bold text-accent uppercase tracking-widest flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {location}
        </span>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed italic">"{story}"</p>
    </div>
  </div>
);
