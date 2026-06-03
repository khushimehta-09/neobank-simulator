import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, Lightbulb, TrendingUp, TrendingDown, Shield, Target, CreditCard, PiggyBank, AlertTriangle, CheckCircle, ChevronRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const MentorHub = () => {
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState(null);
  const [tips, setTips] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token') || localStorage.getItem('neosim-token');

  const fetchAnalysis = async () => {
    try {
      const res = await fetch(`${API}/mentor/analysis`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setAnalysis(data);
    } catch (err) { console.error(err); }
  };

  const fetchTips = async (category = 'all') => {
    try {
      const res = await fetch(`${API}/mentor/tips?category=${category}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setTips(data.tips || []);
      setCategories(data.categories || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    Promise.all([fetchAnalysis(), fetchTips()]).finally(() => setLoading(false));
  }, []);

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    fetchTips(cat);
  };

  const getCategoryIcon = (cat) => {
    const icons = {
      spending: '💳', saving: '🐷', investing: '📈', security: '🔒', credit: '💳', daily: '💡'
    };
    return icons[cat] || '💡';
  };

  const getCategoryColor = (cat) => {
    const colors = {
      spending: 'from-red-500 to-pink-500',
      saving: 'from-emerald-500 to-green-500',
      investing: 'from-blue-500 to-cyan-500',
      security: 'from-purple-500 to-indigo-500',
      credit: 'from-amber-500 to-orange-500'
    };
    return colors[cat] || 'from-primary to-secondary';
  };

  const getInsightStyle = (type) => {
    switch (type) {
      case 'warning': return 'border-amber-500/20 bg-amber-500/5';
      case 'alert': return 'border-red-500/20 bg-red-500/5';
      case 'tip': return 'border-blue-500/20 bg-blue-500/5';
      case 'suggestion': return 'border-purple-500/20 bg-purple-500/5';
      case 'success': return 'border-emerald-500/20 bg-emerald-500/5';
      default: return 'border-white/10 bg-white/5';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <Brain className="text-primary" /> Financial Mentor
        </h1>
        <p className="text-text-muted text-sm mt-1">Personalized insights and tips based on your financial behavior</p>
      </div>

      {/* Quick Stats */}
      {analysis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Financial Score', value: analysis.financialScore, icon: Target, color: analysis.financialScore >= 700 ? 'text-emerald-400' : 'text-amber-400' },
            { label: 'Trust Score', value: analysis.trustScore, icon: Shield, color: analysis.trustScore >= 70 ? 'text-blue-400' : 'text-amber-400' },
            { label: 'Level', value: analysis.level, icon: Sparkles, color: 'text-purple-400' },
            { label: 'Total XP', value: analysis.xp?.toLocaleString(), icon: TrendingUp, color: 'text-amber-400' },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="glass-panel p-4 rounded-2xl border border-white/5">
              <stat.icon size={20} className={`${stat.color} mb-2`} />
              <p className="text-2xl font-black">{stat.value}</p>
              <p className="text-[11px] text-text-muted font-semibold uppercase tracking-wider">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* AI Insights */}
      {analysis?.insights?.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl border border-primary/20">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Lightbulb size={18} className="text-amber-400" /> Personalized Insights
          </h3>
          <div className="space-y-3">
            {analysis.insights.map((insight, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                className={`p-4 rounded-xl border flex items-start gap-3 ${getInsightStyle(insight.type)}`}>
                <span className="text-xl shrink-0">{insight.icon}</span>
                <div className="flex-1">
                  <p className="text-sm leading-relaxed">{insight.message}</p>
                  <span className="inline-block mt-2 text-[10px] uppercase font-bold text-text-muted/50 bg-white/5 px-2 py-0.5 rounded-full">{insight.category}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Spending Breakdown */}
      {analysis?.spendingBreakdown?.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl border border-white/5">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <CreditCard size={18} className="text-primary" /> Spending Breakdown
          </h3>
          <div className="space-y-3">
            {analysis.spendingBreakdown.map((cat, i) => {
              const maxTotal = Math.max(...analysis.spendingBreakdown.map(c => c.total));
              return (
                <div key={i} className="flex items-center gap-4">
                  <span className="text-sm font-bold w-28 truncate capitalize">{cat.category}</span>
                  <div className="flex-1 bg-white/5 rounded-full h-3 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(cat.total / maxTotal) * 100}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className="bg-gradient-to-r from-primary to-secondary h-full rounded-full" />
                  </div>
                  <span className="text-sm font-bold w-24 text-right">₹{cat.total?.toLocaleString()}</span>
                  <span className="text-xs text-text-muted w-12 text-right">{cat.count}x</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tips Section */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <PiggyBank size={18} className="text-emerald-400" /> Financial Tips
        </h3>
        
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => handleCategoryChange('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedCategory === 'all' ? 'bg-primary text-white' : 'bg-white/5 text-text-muted hover:bg-white/10'}`}>
            🌟 All
          </button>
          {categories.map(cat => (
            <button key={cat} onClick={() => handleCategoryChange(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${selectedCategory === cat ? 'bg-primary text-white' : 'bg-white/5 text-text-muted hover:bg-white/10'}`}>
              {getCategoryIcon(cat)} {cat}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {tips.map((tip, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getCategoryColor(tip.category)} flex items-center justify-center text-sm shrink-0`}>
                {getCategoryIcon(tip.category)}
              </div>
              <div className="flex-1">
                <p className="text-sm leading-relaxed">{tip.tip}</p>
                <span className="inline-block mt-2 text-[10px] uppercase font-bold text-text-muted/50 capitalize">{tip.category}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MentorHub;
