import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, BrainCircuit, Sparkles, Plus, ToggleLeft, ToggleRight, Play, Check, 
  Trash2, AlertTriangle, AlertCircle, Coins, CreditCard, Utensils, Film, ShoppingBag, Car
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Budgets = () => {
  const { user, updateBalance } = useAuth();
  const [loading, setLoading] = useState(true);
  const [categoriesData, setCategoriesData] = useState([]);
  const [envelopes, setEnvelopes] = useState({
    food: 12000,
    entertainment: 6000,
    shopping: 8000,
    travel: 4000
  });
  const [newBudgetVal, setNewBudgetVal] = useState('');
  const [editingCat, setEditingCat] = useState(null);

  // Subscriptions Sandbox
  const [subscriptions, setSubscriptions] = useState([
    { id: 1, name: 'Netflix Premium', cost: 649, category: 'entertainment', active: true, icon: '🍿' },
    { id: 2, name: 'Spotify Student', cost: 59, category: 'entertainment', active: true, icon: '🎵' },
    { id: 3, name: 'Amazon Prime', cost: 179, category: 'shopping', active: false, icon: '📦' },
    { id: 4, name: 'Fitness Club', cost: 1200, category: 'healthcare', active: false, icon: '🏋️' }
  ]);
  const [subProcessing, setSubProcessing] = useState(false);
  const [subMessage, setSubMessage] = useState(null);

  // Sound Effects Synth
  const playSound = (freq = 700, duration = 0.08) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  };

  const fetchSpending = async () => {
    try {
      const res = await api.get('/analytics/categories?period=30');
      // Set initial values
      const defaultCats = [
        { category: 'food', total: 0, icon: Utensils, color: 'var(--primary)' },
        { category: 'entertainment', total: 0, icon: Film, color: 'var(--secondary)' },
        { category: 'shopping', total: 0, icon: ShoppingBag, color: 'var(--warning)' },
        { category: 'travel', total: 0, icon: Car, color: 'var(--success)' }
      ];

      const backendCats = res.data.categories || [];
      const merged = defaultCats.map(dc => {
        const found = backendCats.find(bc => bc.category.toLowerCase() === dc.category);
        return {
          ...dc,
          total: found ? found.total : 0
        };
      });
      setCategoriesData(merged);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpending();
  }, []);

  const handleUpdateEnvelope = (cat) => {
    playSound(900, 0.05);
    const limit = Number(newBudgetVal);
    if (!limit || limit <= 0) return;
    setEnvelopes(prev => ({
      ...prev,
      [cat]: limit
    }));
    setEditingCat(null);
    setNewBudgetVal('');
  };

  const toggleSubscription = (id) => {
    playSound(800, 0.06);
    setSubscriptions(prev => prev.map(sub => {
      if (sub.id === id) {
        return { ...sub, active: !sub.active };
      }
      return sub;
    }));
  };

  // Simulate monthly cycle for active subscriptions
  const runSubscriptionBilling = async () => {
    playSound(1100, 0.15);
    setSubProcessing(true);
    setSubMessage(null);

    const activeSubs = subscriptions.filter(s => s.active);
    if (activeSubs.length === 0) {
      setSubMessage({ type: 'warning', text: 'No active subscriptions to bill.' });
      setSubProcessing(false);
      return;
    }

    try {
      let totalBilled = 0;
      for (const sub of activeSubs) {
        // Post a debit for each active sub to ledger
        const res = await api.post('/transactions/manual-add', {
          amount: sub.cost,
          type: 'debit',
          category: sub.category,
          description: `Virtual Billing: ${sub.name}`
        });
        totalBilled += sub.cost;
        updateBalance(res.data.balance);
      }

      setSubMessage({
        type: 'success',
        text: `Billed ${activeSubs.length} active subscription(s) for a total of ₹${totalBilled.toLocaleString()}! Ledger successfully debited.`
      });
      fetchSpending(); // Reload categories spending
    } catch (err) {
      setSubMessage({
        type: 'error',
        text: err.response?.data?.error || 'Billing simulation failed due to insufficient funds.'
      });
    } finally {
      setSubProcessing(false);
    }
  };

  // Generative Advisor Advice based on spending ratios
  const getAdvisorOpinion = () => {
    const alerts = [];
    categoriesData.forEach(c => {
      const budget = envelopes[c.category] || 10000;
      const ratio = c.total / budget;
      if (ratio > 1.0) {
        alerts.push(`🚨 Overspent on **${c.category.toUpperCase()}** (₹${c.total.toLocaleString()} Spent / ₹${budget.toLocaleString()} Budget). Freeze virtual shopping cards!`);
      } else if (ratio > 0.8) {
        alerts.push(`⚠️ Critically close to limit on **${c.category.toUpperCase()}** (${Math.round(ratio * 100)}% reached). Switch to public transit or cook at home.`);
      }
    });

    const activeSubCost = subscriptions.filter(s => s.active).reduce((sum, s) => sum + s.cost, 0);
    if (activeSubCost > 1500) {
      alerts.push(`💡 High subscription leakage: You spend ₹${activeSubCost.toLocaleString()}/mo on virtual memberships. Cancel idle ones to double your savings streak!`);
    }

    if (alerts.length === 0) {
      return "🌟 All Envelopes healthy! Your expenses are securely balanced below limits. Consider moving excess funds to a virtual target Goal!";
    }
    return alerts;
  };

  if (loading) return <div className="h-full flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-8 max-w-6xl mx-auto mt-4 px-2">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight flex items-center justify-center gap-3">
          <Target className="text-primary" size={32} />
          Envelope Budgets & Sandbox Subscriptions
        </h1>
        <p className="text-text-muted mt-2 max-w-xl mx-auto">
          Allocate strict spending limits for categories, review real-time progress bars, and simulate card billing for recurring subscription streams.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Envelope Grid & Limits */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-panel p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h2 className="text-lg font-bold">Envelope Categories</h2>
              <span className="text-xs text-text-muted font-bold uppercase tracking-wider">30 Days Cycle</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {categoriesData.map((c) => {
                const limit = envelopes[c.category] || 10000;
                const ratio = c.total / limit;
                const pct = Math.min(100, Math.round(ratio * 100));
                const cIcon = React.createElement(c.icon, { size: 18 });

                return (
                  <div key={c.category} className="bg-white/5 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/5" style={{ color: c.color }}>
                          {cIcon}
                        </div>
                        <div>
                          <p className="text-xs text-text-muted uppercase font-bold tracking-wider">{c.category}</p>
                          <p className="text-lg font-bold">₹{c.total.toLocaleString()} <span className="text-xs text-text-muted font-normal">spent</span></p>
                        </div>
                      </div>
                      
                      {editingCat === c.category ? (
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="number" 
                            placeholder="Limit"
                            value={newBudgetVal}
                            onChange={(e) => setNewBudgetVal(e.target.value)}
                            className="w-20 bg-background border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                          />
                          <button 
                            onClick={() => handleUpdateEnvelope(c.category)}
                            className="p-1 rounded bg-success/20 text-success border border-success/30 hover:bg-success/30"
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => { playSound(600, 0.05); setEditingCat(c.category); setNewBudgetVal(limit.toString()); }}
                          className="text-xs text-primary hover:text-primary-glow font-bold border border-primary/20 bg-primary/5 hover:bg-primary/10 px-2.5 py-1 rounded-lg transition-all"
                        >
                          Edit Limit
                        </button>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ 
                            width: `${pct}%`, 
                            backgroundColor: pct >= 100 ? 'var(--danger)' : pct >= 80 ? 'var(--warning)' : c.color 
                          }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-text-muted">
                        <span>{pct}% Used</span>
                        <span>Limit: ₹{limit.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Advisor Coach Widget */}
          <div className="glass-panel p-6 border-primary/20 relative overflow-hidden bg-gradient-to-r from-primary/5 to-transparent">
            <div className="absolute top-0 right-0 p-4 opacity-5"><BrainCircuit size={100} /></div>
            <h3 className="text-base font-bold flex items-center gap-2 mb-4"><BrainCircuit className="text-primary" size={20} /> AI Budget Advisor</h3>
            
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
              <div className="flex items-center gap-2 text-warning">
                <Sparkles size={16} />
                <span className="text-xs uppercase tracking-wider font-extrabold">Active Portfolio Recommendations</span>
              </div>
              
              <div className="text-sm leading-relaxed text-text-muted font-medium space-y-2 whitespace-pre-line">
                {getAdvisorOpinion()}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Subscription Tracker */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel p-6 space-y-6">
            <div className="border-b border-white/5 pb-4">
              <h2 className="text-lg font-bold flex items-center gap-2"><CreditCard className="text-secondary" size={20} /> Subscription Manager</h2>
              <p className="text-xs text-text-muted mt-1">Simulate card auto-debits for your memberships.</p>
            </div>

            <div className="space-y-3">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="flex justify-between items-center p-3.5 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{sub.icon}</span>
                    <div>
                      <p className="text-sm font-bold text-white/90">{sub.name}</p>
                      <p className="text-xs text-text-muted">₹{sub.cost}/month</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => toggleSubscription(sub.id)}
                    className="p-1 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    {sub.active ? (
                      <ToggleRight className="text-success" size={28} />
                    ) : (
                      <ToggleLeft className="text-text-muted" size={28} />
                    )}
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-white/5 space-y-4">
              <button
                disabled={subProcessing}
                onClick={runSubscriptionBilling}
                className="w-full btn-secondary py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 bg-gradient-to-tr from-secondary/15 to-transparent border-secondary/30 hover:border-secondary/50 text-secondary"
              >
                <Play size={14} /> Simulate Monthly Cycle
              </button>

              <AnimatePresence>
                {subMessage && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className={`p-3 rounded-xl border text-xs leading-relaxed font-semibold ${subMessage.type === 'success' ? 'bg-success/15 border-success/30 text-success' : subMessage.type === 'warning' ? 'bg-warning/15 border-warning/30 text-warning' : 'bg-danger/15 border-danger/30 text-danger'}`}
                  >
                    {subMessage.text}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="glass-panel p-5 bg-gradient-to-tr from-secondary/5 to-transparent border-secondary/20 text-center">
            <Coins className="text-secondary mx-auto mb-2" size={28} />
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-white/90 mb-1">Sandbox Protection</h4>
            <p className="text-[11px] text-text-muted leading-relaxed font-medium">
              If a subscription cycle fails due to low funds, it acts as a soft decline warning, preventing financial score drops.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Budgets;
