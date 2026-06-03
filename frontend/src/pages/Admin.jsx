import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, Landmark, AlertTriangle, Play, Award, CheckCircle, Search, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { formatDateTime } from '../utils/time';
import { useAuth } from '../context/AuthContext';

const Admin = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('stats'); // stats, users, txs, alerts
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const statsRes = await api.get('/admin/stats');
      setStats(statsRes.data);

      const usersRes = await api.get('/admin/users');
      setUsers(usersRes.data.users);

      const txsRes = await api.get('/admin/transactions');
      setTransactions(txsRes.data.transactions);

      const alertsRes = await api.get('/admin/fraud-alerts');
      setAlerts(alertsRes.data.alerts);
    } catch (err) {
      console.error('Failed to load admin logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleResolveAlert = async (alertId) => {
    try {
      await api.put(`/admin/fraud-alerts/${alertId}/resolve`);
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, resolved: 1 } : a));
      // Refresh stats to reflect resolved count
      const statsRes = await api.get('/admin/stats');
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
      alert('Failed to resolve alert.');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-6">
        <Shield className="text-danger mx-auto animate-pulse" size={64} />
        <h2 className="text-2xl font-bold">Access Restrained</h2>
        <p className="text-text-muted">You are logged in under a regular user account. Access to the Admin Analytics Console is restricted to security administrators.</p>
        <div className="bg-surface/50 p-4 rounded-xl border border-white/5 text-xs text-text-muted leading-relaxed">
          💡 <span className="font-bold text-white">Admins Only:</span> Log out and sign in using the seed administrator account: <code className="text-primary font-bold">admin@neosim.com</code> (Password: <code className="text-primary font-bold">Admin@123</code>) to access this console.
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.accountNumber?.includes(searchQuery)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 mt-4 md:mt-8 px-2">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Admin Analytics Console</h1>
          <p className="text-text-muted">Simulated operations cockpit. Audit ledger transactions, monitor users, and control fraud response gates.</p>
        </div>
        <button
          onClick={fetchAdminData}
          disabled={loading}
          className="btn-secondary flex items-center gap-2 py-2.5 px-5 text-sm"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh Logs
        </button>
      </header>

      {/* Admin Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="glass-panel p-4 text-center">
            <Users className="text-primary mx-auto mb-2" size={20} />
            <h3 className="text-[10px] uppercase font-bold text-text-muted">Total Users</h3>
            <p className="text-xl font-black mt-1">{stats.totalUsers}</p>
          </div>
          <div className="glass-panel p-4 text-center">
            <Landmark className="text-success mx-auto mb-2" size={20} />
            <h3 className="text-[10px] uppercase font-bold text-text-muted">Transactions</h3>
            <p className="text-xl font-black mt-1">{stats.totalTransactions}</p>
          </div>
          <div className="glass-panel p-4 text-center">
            <Landmark className="text-secondary mx-auto mb-2" size={20} />
            <h3 className="text-[10px] uppercase font-bold text-text-muted">Audit Volume</h3>
            <p className="text-xl font-black mt-1">₹{stats.totalVolume.toLocaleString()}</p>
          </div>
          <div className="glass-panel p-4 text-center border-b-2 border-b-danger bg-danger/5">
            <AlertTriangle className="text-danger mx-auto mb-2" size={20} />
            <h3 className="text-[10px] uppercase font-bold text-text-muted">Open Alerts</h3>
            <p className="text-xl font-black mt-1 text-danger">{stats.fraudAlerts}</p>
          </div>
          <div className="glass-panel p-4 text-center">
            <Play className="text-warning mx-auto mb-2" size={20} />
            <h3 className="text-[10px] uppercase font-bold text-text-muted">Goals Active</h3>
            <p className="text-xl font-black mt-1">{stats.activeGoals}</p>
          </div>
          <div className="glass-panel p-4 text-center">
            <Award className="text-success-light mx-auto mb-2" size={20} />
            <h3 className="text-[10px] uppercase font-bold text-text-muted">Lessons Completed</h3>
            <p className="text-xl font-black mt-1">{stats.completedLessons}</p>
          </div>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex border-b border-white/5 pb-2 gap-4 overflow-x-auto">
        {['stats', 'users', 'txs', 'alerts'].map(t => (
          <button
            key={t}
            onClick={() => setActiveSubTab(t)}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors ${activeSubTab === t ? 'bg-primary text-white' : 'text-text-muted hover:text-white'}`}
          >
            {t === 'stats' ? 'General' : t === 'users' ? 'User Catalog' : t === 'txs' ? 'Transaction Registry' : 'Fraud operations'}
          </button>
        ))}
      </div>

      <div className="glass-panel p-6 md:p-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="animate-spin text-primary" size={32} />
            <p className="text-text-muted">Loading audit registers...</p>
          </div>
        ) : (
          <>
            {activeSubTab === 'stats' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-white mb-2">Simulated Banking Sandbox Parameters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 leading-relaxed text-sm text-text-muted">
                  <div className="space-y-3">
                    <p><span className="font-bold text-white">Database Engine:</span> SQLite (Local File neobank.db)</p>
                    <p><span className="font-bold text-white">Ledger Protection:</span> Isolated Virtual Vault Schema</p>
                    <p><span className="font-bold text-white">API Layer:</span> Express CORS-safe Auth Controllers</p>
                  </div>
                  <div className="space-y-3">
                    <p><span className="font-bold text-white">Simulated Domain Rules:</span> Maximum balance transfer caps apply, transaction logs are persistent, email triggers simulate SMTP bypass.</p>
                  </div>
                </div>
              </div>
            )}

            {activeSubTab === 'users' && (
              <div className="space-y-6">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, email, or account no..."
                    className="input-field pl-10 py-2.5 text-sm"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-text-muted">
                        <th className="pb-3 font-semibold">User</th>
                        <th className="pb-3 font-semibold">Account Details</th>
                        <th className="pb-3 font-semibold text-right">Balance</th>
                        <th className="pb-3 font-semibold text-center">Score</th>
                        <th className="pb-3 font-semibold text-center">Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => (
                        <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-4">
                            <div className="font-bold text-white">{u.name}</div>
                            <div className="text-xs text-text-muted mt-0.5">{u.email}</div>
                          </td>
                          <td className="py-4">
                            <div className="font-mono text-xs">{u.accountNumber}</div>
                            <div className="text-xs text-text-muted mt-0.5">{u.upiId}</div>
                          </td>
                          <td className="py-4 text-right font-black text-white">₹{u.balance.toLocaleString()}.00</td>
                          <td className="py-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${u.financialScore > 750 ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                              {u.financialScore}
                            </span>
                          </td>
                          <td className="py-4 text-center font-bold text-text-muted">{u.level}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeSubTab === 'txs' && (
              <div className="space-y-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-text-muted">
                        <th className="pb-3 font-semibold">Reference ID</th>
                        <th className="pb-3 font-semibold">Sender</th>
                        <th className="pb-3 font-semibold">Receiver</th>
                        <th className="pb-3 font-semibold">Type</th>
                        <th className="pb-3 font-semibold text-right">Amount</th>
                        <th className="pb-3 font-semibold">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(t => (
                        <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-4 font-mono text-xs text-text-muted">{t.referenceId}</td>
                          <td className="py-4 text-white font-bold">{t.senderName || 'Internal Deposit'}</td>
                          <td className="py-4 text-white">{t.receiverName || 'Cash Terminal'}</td>
                          <td className="py-4 uppercase text-xs font-black">
                            <span className={`px-2 py-0.5 rounded ${t.type === 'deposit' ? 'bg-success/20 text-success' : t.type === 'withdrawal' ? 'bg-danger/20 text-danger' : 'bg-primary/20 text-primary'}`}>
                              {t.type}
                            </span>
                          </td>
                          <td className="py-4 text-right font-bold text-white">₹{t.amount.toLocaleString()}</td>
                          <td className="py-4 text-xs text-text-muted">{formatDateTime(t.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeSubTab === 'alerts' && (
              <div className="space-y-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-text-muted">
                        <th className="pb-3 font-semibold">Alert Info</th>
                        <th className="pb-3 font-semibold">User Profile</th>
                        <th className="pb-3 font-semibold">Severity</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alerts.map(a => (
                        <tr key={a.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-4">
                            <div className="font-bold text-white">{a.alertType}</div>
                            <div className="text-xs text-text-muted mt-1 leading-relaxed max-w-sm">{a.description}</div>
                          </td>
                          <td className="py-4">
                            <div className="font-bold text-white">{a.userName}</div>
                            <div className="text-xs text-text-muted">{a.email}</div>
                          </td>
                          <td className="py-4 uppercase font-black text-xs">
                            <span className={`px-2.5 py-0.5 rounded-full ${a.severity === 'high' ? 'bg-danger/25 text-danger border border-danger/10 animate-pulse' : 'bg-warning/20 text-warning'}`}>
                              {a.severity}
                            </span>
                          </td>
                          <td className="py-4">
                            {a.resolved ? (
                              <span className="text-xs text-success font-semibold flex items-center gap-1"><CheckCircle size={14} /> Resolved</span>
                            ) : (
                              <span className="text-xs text-danger font-semibold">Active Alert</span>
                            )}
                          </td>
                          <td className="py-4 text-center">
                            {!a.resolved ? (
                              <button
                                onClick={() => handleResolveAlert(a.id)}
                                className="px-3 py-1 bg-success hover:bg-success-light text-black font-black uppercase text-[10px] tracking-wider rounded-lg transition-colors"
                              >
                                Resolve
                              </button>
                            ) : (
                              <span className="text-xs text-text-muted">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Admin;
