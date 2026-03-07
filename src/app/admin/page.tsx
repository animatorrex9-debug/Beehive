import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Logo } from '../../components/Logo';
import { ThemeToggle } from '../../components/ThemeToggle';
import { 
  CheckCircle, 
  XCircle, 
  Users, 
  FileText, 
  TrendingUp, 
  Search,
  Filter,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';

export const AdminPage = () => {
  const { user } = useAuth();
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'loans'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loanData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLoans(loanData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleStatusUpdate = async (loanId: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'loans', loanId), {
        status,
        updatedAt: serverTimestamp(),
        reviewedBy: user?.email,
      });
    } catch (err) {
      console.error('Error updating loan status:', err);
    }
  };

  const pendingLoans = loans.filter(l => l.status === 'pending');
  const totalVolume = loans.reduce((acc, l) => acc + (l.status === 'approved' ? l.amount : 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-primary">
      {/* Top Bar */}
      <header className="bg-white dark:bg-primary border-b border-gray-200 dark:border-zinc-800 p-6 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Logo className="h-6" />
            <span className="bg-accent/10 text-accent px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin Panel
            </span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-zinc-800">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold dark:text-white">{user?.email}</p>
                <p className="text-xs text-gray-500">System Administrator</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-black">
                {user?.email?.[0].toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <AdminStatCard 
            icon={<FileText className="text-blue-500" />}
            label="Total Applications"
            value={loans.length.toString()}
          />
          <AdminStatCard 
            icon={<TrendingUp className="text-accent" />}
            label="Total Volume"
            value={`$${totalVolume.toLocaleString()}`}
          />
          <AdminStatCard 
            icon={<Users className="text-purple-500" />}
            label="Active Users"
            value="1,248"
          />
          <AdminStatCard 
            icon={<ArrowUpRight className="text-orange-500" />}
            label="Approval Rate"
            value="68%"
          />
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              className="input-field pl-12" 
              placeholder="Search by email or loan ID..." 
            />
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm">
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <button className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
              Export CSV
            </button>
          </div>
        </div>

        {/* Applications List */}
        <div className="card">
          <h2 className="text-xl font-bold mb-6 dark:text-white flex items-center gap-2">
            Pending Applications
            <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-black">
              {pendingLoans.length}
            </span>
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-zinc-800 text-gray-400 text-sm uppercase tracking-wider">
                  <th className="pb-4 font-bold">Applicant</th>
                  <th className="pb-4 font-bold">Amount</th>
                  <th className="pb-4 font-bold">Purpose</th>
                  <th className="pb-4 font-bold">Date</th>
                  <th className="pb-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-500">
                      Loading applications...
                    </td>
                  </tr>
                ) : pendingLoans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-500">
                      No pending applications to review.
                    </td>
                  </tr>
                ) : (
                  pendingLoans.map((loan) => (
                    <tr key={loan.id} className="group hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="py-4">
                        <div className="font-bold dark:text-white">{loan.userEmail}</div>
                        <div className="text-xs text-gray-400 font-mono">{loan.id}</div>
                      </td>
                      <td className="py-4 font-bold text-accent">${loan.amount.toLocaleString()}</td>
                      <td className="py-4 text-gray-500">{loan.purpose}</td>
                      <td className="py-4 text-gray-500">
                        {loan.createdAt?.toDate ? loan.createdAt.toDate().toLocaleDateString() : 'Just now'}
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleStatusUpdate(loan.id, 'rejected')}
                            className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                            title="Reject"
                          >
                            <XCircle className="w-6 h-6" />
                          </button>
                          <button 
                            onClick={() => handleStatusUpdate(loan.id, 'approved')}
                            className="p-2 rounded-lg hover:bg-green-50 text-gray-400 hover:text-accent transition-all"
                            title="Approve"
                          >
                            <CheckCircle className="w-6 h-6" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

const AdminStatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
  <div className="card">
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800">
        {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
      </div>
      <span className="text-accent text-xs font-bold flex items-center gap-1">
        +12.5% <ArrowUpRight className="w-3 h-3" />
      </span>
    </div>
    <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">{label}</p>
    <p className="text-3xl font-black dark:text-white">{value}</p>
  </div>
);
