import React, { useState, useEffect } from 'react';
import { 
  Heart, PlusCircle, Trash2, User, Globe, DollarSign, CheckCircle2, 
  AlertCircle, MapPin, Image as ImageIcon, Tag, RefreshCw, XCircle, Clock, Users 
} from 'lucide-react';
import { db } from '../../lib/supabase-service';
import { collection, addDoc, deleteDoc, doc, updateDoc, getDocs, onSnapshot, query } from 'supabase/db';

export interface AdminCampaign {
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
  createdAt: string;
  cycleDays: number; // 30 for personal, 14 for general
  location?: string;
  organizer?: string;
  isActive?: boolean;
}

const PRESET_IMAGES = [
  { label: 'Child Healthcare', url: 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&q=80&w=800' },
  { label: 'General Hospital', url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=800' },
  { label: 'Hunger & Food', url: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=800' },
  { label: 'Education & School', url: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&q=80&w=800' },
  { label: 'Disaster Rebuild', url: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&q=80&w=800' },
  { label: 'Clean Water', url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=800' }
];

export const AdminCharityTab = () => {
  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form State
  const [form, setForm] = useState({
    title: '',
    type: 'personal' as 'personal' | 'general',
    beneficiary: '',
    category: 'Healthcare',
    goalAmount: '',
    location: '',
    organizer: 'Beehive Hope Foundation',
    image: PRESET_IMAGES[0].url,
    description: '',
    longDesc: ''
  });

  // Real-time subscription to campaigns with fallback fetch
  const fetchCampaigns = async () => {
    try {
      const q = query(collection(db, 'charity_campaigns'));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as AdminCampaign[];
      setCampaigns(list);
    } catch (e) {
      console.error('Error fetching campaigns:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    const q = query(collection(db, 'charity_campaigns'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.docs && snapshot.docs.length > 0) {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AdminCampaign[];
        setCampaigns(list);
      }
      setLoading(false);
    }, (err) => {
      console.error('Error fetching admin campaigns:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.beneficiary.trim() || !form.goalAmount) {
      setMsg({ type: 'error', text: 'Please fill in all required fields (title, beneficiary, goal amount).' });
      return;
    }

    setSubmitting(true);
    setMsg(null);

    const goalNum = Number(form.goalAmount);
    const cycleDays = form.type === 'personal' ? 30 : 14;

    try {
      await addDoc(collection(db, 'charity_campaigns'), {
        title: form.title.trim(),
        type: form.type,
        beneficiary: form.beneficiary.trim(),
        category: form.category,
        goalAmount: goalNum,
        raisedAmount: 0,
        donorCount: 0,
        createdAt: new Date().toISOString(),
        cycleDays,
        location: form.location.trim() || 'Global',
        organizer: form.organizer.trim() || 'Beehive Relief Fund',
        image: form.image.trim() || PRESET_IMAGES[0].url,
        description: form.description.trim() || form.title,
        longDesc: form.longDesc.trim() || form.description.trim() || form.title,
        isActive: true
      });

      setMsg({ type: 'success', text: `Successfully created ${form.type === 'personal' ? 'Personal Case' : 'General Cause'} campaign!` });
      setIsModalOpen(false);
      setForm({
        title: '',
        type: 'personal',
        beneficiary: '',
        category: 'Healthcare',
        goalAmount: '',
        location: '',
        organizer: 'Beehive Hope Foundation',
        image: PRESET_IMAGES[0].url,
        description: '',
        longDesc: ''
      });
      await fetchCampaigns();
    } catch (err: any) {
      console.error('Error creating campaign:', err);
      setMsg({ type: 'error', text: err?.message || 'Failed to create campaign. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCampaign = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      await deleteDoc(doc(db, 'charity_campaigns', id));
      setMsg({ type: 'success', text: 'Campaign removed successfully.' });
      await fetchCampaigns();
    } catch (err: any) {
      console.error('Error deleting campaign:', err);
      setMsg({ type: 'error', text: err?.message || 'Failed to delete campaign.' });
    }
  };

  const personalCases = campaigns.filter(c => c.type === 'personal');
  const generalCauses = campaigns.filter(c => c.type === 'general');
  const totalRaisedSum = campaigns.reduce((sum, c) => sum + (c.raisedAmount || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header Banner & Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900 text-white p-6 rounded-3xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-500 fill-current" />
            <h2 className="text-2xl font-black uppercase tracking-tight">Charity & Crowdfunding Management</h2>
          </div>
          <p className="text-xs text-gray-400">
            Create new personal cases for specific individuals (30-day lifespan) or upload general causes (14-day repeating cycles).
          </p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3.5 bg-accent hover:bg-accent/90 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-accent/20 flex items-center gap-2 transition-all whitespace-nowrap"
        >
          <PlusCircle className="w-4 h-4" />
          Create New Campaign
        </button>
      </div>

      {/* Alert Banner */}
      {msg && (
        <div className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold ${
          msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
        }`}>
          <div className="flex items-center gap-2">
            {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {msg.text}
          </div>
          <button onClick={() => setMsg(null)} className="text-xs uppercase hover:underline">Dismiss</button>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 border-l-4 border-l-accent">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Personal Cases</span>
          <p className="text-3xl font-black dark:text-white mt-1">{personalCases.length}</p>
          <p className="text-[11px] text-gray-500 mt-1">Active 30-day individual cases</p>
        </div>
        <div className="card p-6 border-l-4 border-l-red-500">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total General Causes</span>
          <p className="text-3xl font-black dark:text-white mt-1">{generalCauses.length}</p>
          <p className="text-[11px] text-gray-500 mt-1">14-day repeating cycles</p>
        </div>
        <div className="card p-6 border-l-4 border-l-emerald-500">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Recorded Raised Funds</span>
          <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">${totalRaisedSum.toLocaleString()}</p>
          <p className="text-[11px] text-gray-500 mt-1">Total user & community contributions</p>
        </div>
      </div>

      {/* Campaigns List Table */}
      <div className="card p-0 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
          <h3 className="font-black text-lg dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Heart className="w-5 h-5 text-accent" />
            Active Charity Campaigns ({campaigns.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400 text-xs italic">Loading charity campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm font-bold text-gray-500">No Custom Campaigns Uploaded Yet</p>
            <p className="text-xs text-gray-400">Default campaigns are currently showing on the frontend. Click "Create New Campaign" to add your first custom campaign.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  <th className="p-4">Campaign Title & Beneficiary</th>
                  <th className="p-4">Type & Lifespan</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Goal / Raised</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 text-xs">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img src={c.image} alt={c.title} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                        <div>
                          <p className="font-black dark:text-white line-clamp-1">{c.title}</p>
                          <p className="text-[10px] text-accent font-bold">Beneficiary: {c.beneficiary}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-white ${
                        c.type === 'personal' ? 'bg-accent' : 'bg-red-600'
                      }`}>
                        {c.type === 'personal' ? 'Personal (30d)' : 'General (14d)'}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-gray-600 dark:text-gray-300">
                      {c.category}
                    </td>
                    <td className="p-4">
                      <div className="font-black dark:text-white">${(c.raisedAmount || 0).toLocaleString()} / ${(c.goalAmount || 0).toLocaleString()}</div>
                      <div className="text-[10px] text-gray-400">{(c.donorCount || 0)} Donors</div>
                    </td>
                    <td className="p-4 text-gray-400 font-mono text-[11px]">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleDeleteCampaign(c.id, c.title)}
                        className="p-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 rounded-xl transition-all"
                        title="Delete Campaign"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create New Campaign */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <div className="relative bg-white dark:bg-zinc-950 rounded-[2.5rem] p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-gray-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase tracking-tight dark:text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-accent" />
                Upload New Charity Campaign
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-white">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-6">
              
              {/* Campaign Type Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Campaign Type</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'personal' })}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      form.type === 'personal'
                        ? 'border-accent bg-accent/10 dark:bg-accent/20'
                        : 'border-gray-200 dark:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-black text-sm dark:text-white">
                      <User className="w-4 h-4 text-accent" />
                      Personal Case
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">For specific individuals (e.g., Surgery, Tuition). Runs for 30 days then automatically ends.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'general' })}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      form.type === 'general'
                        ? 'border-red-600 bg-red-600/10 dark:bg-red-600/20'
                        : 'border-gray-200 dark:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-black text-sm dark:text-white">
                      <Globe className="w-4 h-4 text-red-500" />
                      General Cause
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">For organizational funds (Healthcare, Hunger). Operates on a 14-day repeating cycle.</p>
                  </button>
                </div>
              </div>

              {/* Title & Beneficiary */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Campaign Title *</label>
                  <input 
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Surgery Fund for Little David"
                    className="w-full p-3.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs dark:text-white font-bold outline-none focus:ring-2 focus:ring-accent"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Beneficiary / Individual Name *</label>
                  <input 
                    type="text"
                    value={form.beneficiary}
                    onChange={(e) => setForm({ ...form, beneficiary: e.target.value })}
                    placeholder="e.g. David Miller (Age 4)"
                    className="w-full p-3.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs dark:text-white font-bold outline-none focus:ring-2 focus:ring-accent"
                    required
                  />
                </div>
              </div>

              {/* Category & Goal Amount */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Category</label>
                  <select 
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full p-3.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs dark:text-white font-bold outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="Healthcare">Healthcare & Emergency</option>
                    <option value="Hunger Relief">Hunger & Food Drives</option>
                    <option value="Education">Education & Scholarships</option>
                    <option value="Disaster Relief">Disaster & Rebuild Relief</option>
                    <option value="Environment">Environment & Water</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Target Goal Amount ($) *</label>
                  <input 
                    type="number"
                    value={form.goalAmount}
                    onChange={(e) => setForm({ ...form, goalAmount: e.target.value })}
                    placeholder="e.g. 15000"
                    className="w-full p-3.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs dark:text-white font-bold outline-none focus:ring-2 focus:ring-accent"
                    required
                  />
                </div>
              </div>

              {/* Location & Organizer */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Location</label>
                  <input 
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. Chicago, IL or Global"
                    className="w-full p-3.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs dark:text-white font-bold outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Organizer Name</label>
                  <input 
                    type="text"
                    value={form.organizer}
                    onChange={(e) => setForm({ ...form, organizer: e.target.value })}
                    placeholder="e.g. Beehive Relief Trust"
                    className="w-full p-3.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs dark:text-white font-bold outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              {/* Image Preset Picker */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Image Presets or Custom URL</label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {PRESET_IMAGES.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setForm({ ...form, image: preset.url })}
                      className={`p-2 rounded-xl text-[10px] font-bold border transition-all truncate ${
                        form.image === preset.url
                          ? 'bg-accent text-white border-accent'
                          : 'bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <input 
                  type="url"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  placeholder="Paste custom image URL..."
                  className="w-full p-3 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs dark:text-white outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              {/* Descriptions */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Short Summary</label>
                <textarea 
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="A concise 1-2 sentence summary of why this campaign is needed..."
                  rows={2}
                  className="w-full p-3.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs dark:text-white outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Full Campaign Story</label>
                <textarea 
                  value={form.longDesc}
                  onChange={(e) => setForm({ ...form, longDesc: e.target.value })}
                  placeholder="Detailed narrative about the beneficiary, medical needs, or project impact..."
                  rows={4}
                  className="w-full p-3.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs dark:text-white outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3.5 bg-gray-100 dark:bg-zinc-900 text-gray-600 dark:text-gray-300 rounded-xl font-bold text-xs uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] py-3.5 bg-accent hover:bg-accent/90 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
                >
                  {submitting ? 'Uploading...' : 'Publish Campaign'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};
