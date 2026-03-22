import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MessageSquare, 
  User as UserIcon,
  CheckCircle2,
  Clock,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  ShieldEllipsis,
  Wallet
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'motion/react';

export const ManagerPage = () => {
  const { user } = useAuth();
  const [assignedUsers, setAssignedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Fetch users assigned to this manager
    const usersQuery = query(
      collection(db, 'users'),
      where('managerId', '==', user.uid)
    );

    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAssignedUsers(usersList);
      setLoading(false);
    });

    return () => unsubscribeUsers();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = [
    {
      label: 'Assigned Clients',
      value: assignedUsers.length,
      icon: Users,
      color: 'text-accent',
      bg: 'bg-accent/10'
    },
    {
      label: 'Pending KYC',
      value: assignedUsers.filter(u => u.kycStatus === 'pending').length,
      icon: ShieldEllipsis,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10'
    },
    {
      label: 'Verified Clients',
      value: assignedUsers.filter(u => u.kycStatus === 'verified').length,
      icon: ShieldCheck,
      color: 'text-green-500',
      bg: 'bg-green-500/10'
    },
    {
      label: 'Total Managed Assets',
      value: `$${assignedUsers.reduce((acc, u) => acc + (u.walletBalance || 0), 0).toLocaleString()}`,
      icon: Wallet,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    }
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Welcome Section */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
          Command Center
        </p>
        <h2 className="text-4xl font-black tracking-tighter dark:text-white uppercase">
          Manager Overview
        </h2>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="card flex items-center gap-6 group hover:border-accent/30 transition-all cursor-default"
          >
            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
              <stat.icon className="w-8 h-8" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-xl font-black dark:text-white tracking-tight">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Assigned Users List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card p-0 overflow-hidden"
      >
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-xl font-black tracking-tighter dark:text-white uppercase">Assigned Clients</h3>
          <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-widest">
            {assignedUsers.length} Total
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Client</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">KYC Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Wallet Balance</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Savings</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {assignedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center opacity-30">
                      <Users className="w-12 h-12 mb-4" />
                      <p className="font-bold uppercase tracking-widest text-xs">No clients assigned yet</p>
                    </div>
                  </td>
                </tr>
              ) : (
                assignedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                          <UserIcon className="w-5 h-5 text-zinc-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold dark:text-white">{u.fullName || 'Anonymous'}</p>
                          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-tighter">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          u.kycStatus === 'verified' ? 'bg-green-500' :
                          u.kycStatus === 'pending' ? 'bg-yellow-500' :
                          u.kycStatus === 'rejected' ? 'bg-red-500' :
                          'bg-gray-400'
                        }`} />
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${
                          u.kycStatus === 'verified' ? 'text-green-600' :
                          u.kycStatus === 'pending' ? 'text-yellow-600' :
                          u.kycStatus === 'rejected' ? 'text-red-600' :
                          'text-gray-500'
                        }`}>
                          {u.kycStatus || 'unverified'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-black dark:text-white">${(u.walletBalance || 0).toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-zinc-500">${(u.savings || 0).toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => window.location.href = '/manager/chat'}
                        className="p-2 rounded-xl bg-accent/10 text-accent hover:bg-accent hover:text-white transition-all"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};
