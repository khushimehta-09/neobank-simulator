import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, TrendingUp, Plus, AlertTriangle, CheckCircle, Zap, ShieldAlert, Trash2, X } from 'lucide-react';
import api from '../services/api';

const Goals = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', targetAmount: '', deadline: '', icon: '🎯' });

  const fetchGoals = async () => {
    try {
      const res = await api.get('/goals');
      setGoals(res.data.goals);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!newGoal.title || !newGoal.targetAmount) return;
    try {
      await api.post('/goals', newGoal);
      fetchGoals();
      setIsModalOpen(false);
      setNewGoal({ title: '', targetAmount: '', deadline: '', icon: '🎯' });
    } catch (err) { alert('Failed to create goal'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this goal?")) return;
    try {
      await api.delete(`/goals/${id}`);
      fetchGoals();
    } catch (err) { alert('Failed to delete goal'); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 mt-4 md:mt-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight">Savings & Budgets</h1>
          <p className="text-text-muted">Set targets, track progress, and build financial discipline.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2"><Plus size={18} /> New Goal</button>
      </header>

      {/* Budget Intelligence Alert */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-warning/10 border border-warning/20 p-6 rounded-2xl flex flex-col md:flex-row items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5"><ShieldAlert size={80} /></div>
        <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center text-warning shrink-0">
          <AlertTriangle size={24} />
        </div>
        <div>
          <h3 className="text-warning font-bold text-lg mb-1">Budget Intelligence Warning</h3>
          <p className="text-white/80 text-sm leading-relaxed">Based on your simulated spending patterns this week, you are projected to exceed your <strong>Food & Dining</strong> budget by ₹2,500. Consider reducing discretionary spending this weekend to stay on track.</p>
        </div>
      </motion.div>

      {/* Savings Goals Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-10 flex justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
        ) : goals.length === 0 ? (
          <div className="col-span-full py-16 text-center glass-panel border-dashed border-2 border-white/20">
            <Target className="mx-auto text-text-muted mb-4 opacity-50" size={48} />
            <h3 className="text-xl font-bold text-white/80 mb-2">No active savings goals</h3>
            <p className="text-text-muted mb-6">Create a goal to start building wealth safely in the simulation.</p>
            <button onClick={() => setIsModalOpen(true)} className="btn-secondary">Create Your First Goal</button>
          </div>
        ) : (
          goals.map((goal, i) => {
            const progress = (goal.currentAmount / goal.targetAmount) * 100;
            return (
              <motion.div key={goal.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-panel p-6 relative group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-surface border border-white/10 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
                    {goal.icon}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button onClick={() => handleDelete(goal.id)} className="text-danger/50 hover:text-danger hover:bg-danger/10 p-1.5 rounded-lg transition-colors absolute -top-2 -right-2 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                    <div className="text-right mt-2">
                      <p className="text-xs text-text-muted uppercase tracking-wider font-bold mb-1">Target</p>
                      <p className="font-bold text-white/90">₹{goal.targetAmount.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold mb-1 relative z-10">{goal.title}</h3>
                <p className="text-sm text-text-muted mb-6 relative z-10">{goal.deadline ? `Deadline: ${new Date(goal.deadline).toLocaleDateString()}` : 'No deadline set'}</p>

                <div className="relative z-10">
                  <div className="flex justify-between text-sm mb-2 font-medium">
                    <span className="text-primary">₹{goal.currentAmount.toLocaleString()} saved</span>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-surface rounded-full h-2.5 overflow-hidden border border-white/5">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1.5, ease: "easeOut" }} className="h-full bg-gradient-to-r from-secondary to-primary shadow-[0_0_10px_rgba(67,97,238,0.8)]"></motion.div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Monthly Budget Tracker */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel p-6 md:p-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><TrendingUp className="text-primary" size={24} /> Monthly Budget Breakdown</h2>
        <div className="space-y-6">
          {[
            { cat: 'Housing & Utilities', limit: 30000, spent: 28500, status: 'warning' },
            { cat: 'Food & Dining', limit: 15000, spent: 16500, status: 'danger' },
            { cat: 'Transportation', limit: 8000, spent: 4200, status: 'success' },
            { cat: 'Entertainment', limit: 5000, spent: 1200, status: 'success' }
          ].map((b, i) => {
            const perc = Math.min((b.spent / b.limit) * 100, 100);
            return (
              <div key={i}>
                <div className="flex justify-between text-sm font-medium mb-2">
                  <span className="text-white/90">{b.cat}</span>
                  <span className="text-text-muted">₹{b.spent.toLocaleString()} / ₹{b.limit.toLocaleString()}</span>
                </div>
                <div className="w-full bg-surface rounded-full h-3 overflow-hidden border border-white/5">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${perc}%` }} className={`h-full rounded-full shadow-[0_0_10px_currentColor] ${b.status === 'danger' ? 'bg-danger text-danger' : b.status === 'warning' ? 'bg-warning text-warning' : 'bg-success text-success'}`}></motion.div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Add Goal Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="glass-panel p-8 w-full max-w-md relative">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors"><X size={24} /></button>
              <h2 className="text-2xl font-bold mb-6">Create New Goal</h2>
              
              <form onSubmit={handleAddGoal} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Goal Name</label>
                  <input type="text" required value={newGoal.title} onChange={e => setNewGoal({...newGoal, title: e.target.value})} className="input-field" placeholder="e.g. Dream Car" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Target Amount (₹)</label>
                  <input type="number" required min="1" value={newGoal.targetAmount} onChange={e => setNewGoal({...newGoal, targetAmount: e.target.value})} className="input-field" placeholder="100000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Deadline (Optional)</label>
                  <input type="date" value={newGoal.deadline} onChange={e => setNewGoal({...newGoal, deadline: e.target.value})} className="input-field" style={{ colorScheme: 'dark' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Emoji Icon</label>
                  <input type="text" value={newGoal.icon} onChange={e => setNewGoal({...newGoal, icon: e.target.value})} className="input-field text-2xl" placeholder="🎯" />
                </div>
                
                <button type="submit" className="btn-primary w-full mt-4 py-3">Create Goal</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Goals;
