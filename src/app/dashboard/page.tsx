import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Logo } from '../../components/Logo';
import { ThemeToggle } from '../../components/ThemeToggle';
import { 
  Plus, 
  LayoutDashboard, 
  History, 
  Settings, 
  LogOut, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Wallet,
  Upload,
  FileText,
  Loader2
} from 'lucide-react';

export const DashboardPage = () => {
  const { user } = useAuth();
  const [loans, setLoans] = useState<any[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'loans'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loanData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLoans(loanData);
    });

    return () => unsubscribe();
  }, [user]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'loans'), {
        userId: user.uid,
        userEmail: user.email,
        amount: parseFloat(amount),
        purpose,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setIsApplying(false);
      setAmount('');
      setPurpose('');
    } catch (err) {
      console.error('Error applying for loan:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `documents/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      // Log the upload in Firestore
      await addDoc(collection(db, 'documents'), {
        userId: user.uid,
        fileName: file.name,
        fileUrl: url,
        uploadedAt: serverTimestamp(),
      });
      
      alert('Document uploaded successfully!');
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const handleSignOut = () => {
    auth.signOut();
    navigate('/');
  };

  const totalBorrowed = loans.reduce((acc, loan) => acc + (loan.status === 'approved' ? loan.amount : 0), 0);
  const pendingAmount = loans.reduce((acc, loan) => acc + (loan.status === 'pending' ? loan.amount : 0), 0);

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-primary">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 dark:border-zinc-800 bg-white dark:bg-primary p-6 hidden md:flex flex-col">
        <Logo className="h-6 mb-12" />
        
        <nav className="space-y-2 flex-grow">
          <SidebarItem icon={<LayoutDashboard />} label="Overview" active />
          <SidebarItem icon={<History />} label="Transactions" />
          <SidebarItem icon={<FileText />} label="Documents" />
          <SidebarItem icon={<Settings />} label="Settings" />
        </nav>

        <button 
          onClick={handleSignOut}
          className="flex items-center gap-3 text-gray-500 hover:text-red-500 transition-colors font-bold mt-auto"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-6 md:p-10 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black tracking-tighter dark:text-white">DASHBOARD</h1>
            <p className="text-gray-500">Welcome back, {user?.email?.split('@')[0]}</p>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept=".pdf,.jpg,.png"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-secondary flex items-center gap-2"
            >
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
              {uploading ? 'Uploading...' : 'Upload ID'}
            </button>
            <button 
              onClick={() => setIsApplying(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Loan
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard 
            icon={<Wallet className="text-accent" />}
            label="Total Approved"
            value={`$${totalBorrowed.toLocaleString()}`}
          />
          <StatCard 
            icon={<Clock className="text-yellow-500" />}
            label="Pending Approval"
            value={`$${pendingAmount.toLocaleString()}`}
          />
          <StatCard 
            icon={<TrendingUp className="text-blue-500" />}
            label="Credit Score"
            value="742"
          />
        </div>

        {/* Loans Table */}
        <div className="card">
          <h2 className="text-xl font-bold mb-6 dark:text-white">Recent Applications</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-zinc-800 text-gray-400 text-sm uppercase tracking-wider">
                  <th className="pb-4 font-bold">Amount</th>
                  <th className="pb-4 font-bold">Purpose</th>
                  <th className="pb-4 font-bold">Status</th>
                  <th className="pb-4 font-bold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {loans.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-gray-500">
                      No loan applications found.
                    </td>
                  </tr>
                ) : (
                  loans.map((loan) => (
                    <tr key={loan.id} className="group">
                      <td className="py-4 font-bold dark:text-white">${loan.amount.toLocaleString()}</td>
                      <td className="py-4 text-gray-500">{loan.purpose}</td>
                      <td className="py-4">
                        <StatusBadge status={loan.status} />
                      </td>
                      <td className="py-4 text-gray-500">
                        {loan.createdAt?.toDate ? loan.createdAt.toDate().toLocaleDateString() : 'Just now'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Apply Modal */}
      {isApplying && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-md"
          >
            <h2 className="text-2xl font-black tracking-tighter mb-2 dark:text-white">APPLY FOR LOAN</h2>
            <p className="text-gray-500 mb-6">Tell us how much you need and why.</p>

            <form onSubmit={handleApply} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold dark:text-white">Amount ($)</label>
                <input 
                  type="number" 
                  required
                  className="input-field" 
                  placeholder="5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold dark:text-white">Purpose</label>
                <select 
                  required
                  className="input-field"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                >
                  <option value="">Select a purpose</option>
                  <option value="Business">Business Expansion</option>
                  <option value="Education">Education</option>
                  <option value="Home">Home Improvement</option>
                  <option value="Personal">Personal Use</option>
                  <option value="Emergency">Emergency</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsApplying(false)}
                  className="btn-secondary flex-grow"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn-primary flex-grow"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const SidebarItem = ({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) => (
  <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
    active 
      ? 'bg-accent text-white' 
      : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800'
  }`}>
    {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
    {label}
  </button>
);

const StatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
  <div className="card flex items-center gap-6">
    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800">
      {React.cloneElement(icon as React.ReactElement, { className: "w-8 h-8" })}
    </div>
    <div>
      <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-black dark:text-white">{value}</p>
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    approved: 'bg-green-100 text-green-700 border-green-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
  };

  const icons = {
    pending: <Clock className="w-3 h-3" />,
    approved: <CheckCircle2 className="w-3 h-3" />,
    rejected: <XCircle className="w-3 h-3" />,
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 w-fit ${styles[status as keyof typeof styles]}`}>
      {icons[status as keyof typeof icons]}
      {status.toUpperCase()}
    </span>
  );
};
