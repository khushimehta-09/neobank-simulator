import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Award, Star, Flame, ShieldAlert, BookOpen, Clock, Heart, 
  Lock, CheckCircle2, ChevronRight, Coins, RefreshCw, Sparkles, Zap
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Achievements = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // all, common, rare, epic, legendary
  const [errorMsg, setErrorMsg] = useState(null);

  // Synth Keypad Click Sound
  const playSound = (freq = 800, duration = 0.05) => {
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

  const fetchStats = async () => {
    try {
      const res = await api.get('/gamification/stats');
      setData(res.data);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load achievements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const badgeCatalog = [
    {
      id: 'first_transfer',
      title: "First Transfer",
      badge: "💸",
      rarity: "common",
      description: "Successfully completed your first virtual IMPS transfer.",
      xpReward: 50,
      iconColor: "var(--primary)"
    },
    {
      id: 'level_star',
      title: "Rising Star",
      badge: "⭐",
      rarity: "common",
      description: "Graduated to Level 2+ and unlocked high-density metrics.",
      xpReward: 50,
      checkUnlocked: (stats) => stats.level >= 2,
      iconColor: "var(--warning)"
    },
    {
      id: 'daily_reward',
      title: "Daily Devotee",
      badge: "🎁",
      rarity: "rare",
      description: "Log in daily and build a savings streak of 3+ days.",
      xpReward: 100,
      checkUnlocked: (stats) => stats.savingsStreak >= 3,
      iconColor: "var(--secondary)"
    },
    {
      id: 'scam_buster',
      title: "Scam Buster",
      badge: "🛡️",
      rarity: "epic",
      description: "Spot hidden phishing drills in the timelocked Scam Lab.",
      xpReward: 150,
      checkUnlocked: (stats) => stats.xp >= 300,
      iconColor: "var(--success)"
    },
    {
      id: 'saving_goal',
      title: "Master Saver",
      badge: "🏆",
      rarity: "rare",
      description: "Complete a custom savings goal target in the folder.",
      xpReward: 150,
      iconColor: "var(--primary)"
    },
    {
      id: 'semester_grad',
      title: "Semester Graduate",
      badge: "🎓",
      rarity: "legendary",
      description: "Graduate college with healthy savings in Ahmedabad Story Mode.",
      xpReward: 250,
      checkUnlocked: (stats) => stats.xp >= 600,
      iconColor: "var(--danger)"
    }
  ];

  const isUnlocked = (badgeItem) => {
    if (!data) return false;
    // Check if recorded in backend achievements list
    const foundInDb = data.achievements?.some(
      a => a.badge === badgeItem.badge || a.title?.toLowerCase() === badgeItem.title?.toLowerCase()
    );
    if (foundInDb) return true;

    // Check custom checks (e.g. level, savingsStreak)
    if (badgeItem.checkUnlocked) {
      return badgeItem.checkUnlocked(data);
    }
    return false;
  };

  const getRarityClass = (rarity) => {
    switch (rarity) {
      case 'common': return 'border-white/10 text-text-muted';
      case 'rare': return 'border-secondary/30 text-secondary shadow-[0_0_12px_rgba(76,201,240,0.15)]';
      case 'epic': return 'border-primary/40 text-primary shadow-[0_0_12px_rgba(67,97,238,0.2)]';
      case 'legendary': return 'border-danger/50 text-danger shadow-[0_0_15px_rgba(239,71,111,0.25)]';
      default: return 'border-white/10';
    }
  };

  const getRarityBadge = (rarity) => {
    switch (rarity) {
      case 'common': return 'bg-white/5 text-white/60';
      case 'rare': return 'bg-secondary/10 text-secondary';
      case 'epic': return 'bg-primary/10 text-primary';
      case 'legendary': return 'bg-danger/10 text-danger animate-pulse';
      default: return '';
    }
  };

  const filteredBadges = badgeCatalog.filter(
    b => activeTab === 'all' || b.rarity === activeTab
  );

  const unlockedCount = badgeCatalog.filter(isUnlocked).length;

  if (loading) return <div className="h-full flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-8 max-w-6xl mx-auto mt-4 px-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <Trophy className="text-warning animate-bounce" size={32} />
            Achievements Showcase
          </h1>
          <p className="text-text-muted mt-2 max-w-xl">
            Check unlocked badges, claim XP increments, and review locked status checks as you build financial operating parameters.
          </p>
        </div>

        {/* Unlocked Progress Dial */}
        <div className="flex items-center gap-4 bg-white/5 border border-white/5 p-4 rounded-2xl shadow-lg shrink-0">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3.5" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--primary)" strokeWidth="3.5" strokeDasharray={`${(unlockedCount/badgeCatalog.length)*100}, 100`} />
            </svg>
            <span className="absolute text-sm font-black text-white">{unlockedCount}/{badgeCatalog.length}</span>
          </div>
          <div>
            <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest">Graduation progress</p>
            <p className="font-extrabold text-sm">{Math.round((unlockedCount/badgeCatalog.length)*100)}% Accomplished</p>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
        {['all', 'common', 'rare', 'epic', 'legendary'].map((tab) => (
          <button
            key={tab}
            onClick={() => { playSound(650, 0.04); setActiveTab(tab); }}
            className={`px-4.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all shrink-0 ${activeTab === tab ? 'bg-primary border-primary text-white shadow-[0_0_15px_rgba(67,97,238,0.4)]' : 'bg-white/5 border-white/5 text-text-muted hover:border-white/10 hover:text-white'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Grid Badges Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredBadges.map((item) => {
            const unlocked = isUnlocked(item);
            const rClass = getRarityClass(item.rarity);
            const rBadge = getRarityBadge(item.rarity);

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`glass-panel p-6 relative overflow-hidden flex flex-col justify-between h-64 border transition-all ${unlocked ? rClass : 'opacity-65 grayscale hover:grayscale-0 hover:opacity-90'}`}
              >
                {/* Glowing orbs on Legendary */}
                {item.rarity === 'legendary' && unlocked && (
                  <div className="absolute top-0 right-0 w-24 h-24 bg-danger/10 rounded-full blur-xl pointer-events-none -z-10 animate-pulse"></div>
                )}

                <div className="space-y-4">
                  {/* Badge Header info */}
                  <div className="flex justify-between items-start">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-3xl shadow-inner relative">
                      {item.badge}
                      {unlocked ? (
                        <div className="absolute -top-1.5 -right-1.5 bg-success rounded-full p-0.5 border border-surface-solid">
                          <CheckCircle2 size={12} className="text-white" />
                        </div>
                      ) : (
                        <div className="absolute -top-1.5 -right-1.5 bg-white/10 rounded-full p-0.5 border border-surface-solid text-text-muted">
                          <Lock size={12} />
                        </div>
                      )}
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${rBadge}`}>
                      {item.rarity}
                    </span>
                  </div>

                  {/* Badge Description */}
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-base text-white/95">{item.title}</h3>
                    <p className="text-xs text-text-muted leading-relaxed font-semibold">{item.description}</p>
                  </div>
                </div>

                {/* Footer reward details */}
                <div className="border-t border-white/5 pt-3.5 mt-auto flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  <span>Reward:</span>
                  <span className={`flex items-center gap-1 font-extrabold ${unlocked ? 'text-primary' : ''}`}>
                    <Zap size={12} /> +{item.xpReward} XP
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Daily Login Reward Panel */}
      <div className="glass-panel p-6 border-secondary/35 bg-gradient-to-tr from-secondary/5 to-transparent relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full blur-2xl pointer-events-none -z-10"></div>
        <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
          <div className="w-16 h-16 rounded-3xl bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary text-2xl shrink-0">
            🎁
          </div>
          <div>
            <h3 className="font-black text-lg text-white">Daily Streak Reward</h3>
            <p className="text-sm text-text-muted mt-1 max-w-md leading-relaxed font-semibold">
              Log in daily to claim surprise XP bonuses and simulated Sandbox Cash! Active streak: <strong>{data?.savingsStreak || 0} days</strong>.
            </p>
          </div>
        </div>

        <button 
          onClick={async () => {
            playSound(1200, 0.1);
            try {
              const res = await api.post('/gamification/daily-reward');
              alert(`🎁 Claimed! +${res.data.xpReward} XP and +₹${res.data.bonusMoney} virtual cash!`);
              fetchStats();
            } catch (err) {
              alert(err.response?.data?.error || 'Already claimed today.');
            }
          }}
          className="btn-primary py-3.5 px-6 shrink-0 bg-secondary hover:bg-secondary/90 text-background border-none shadow-[0_0_15px_rgba(76,201,240,0.4)] hover:shadow-[0_0_25px_rgba(76,201,240,0.6)] flex items-center gap-2"
        >
          <Sparkles size={16} /> Claim Daily Reward
        </button>
      </div>
    </div>
  );
};

export default Achievements;
