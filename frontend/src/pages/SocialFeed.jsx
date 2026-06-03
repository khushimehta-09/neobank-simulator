import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, TrendingUp, Award, Zap, Users, RefreshCw, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const SocialFeed = () => {
  const { user } = useAuth();
  const [feed, setFeed] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('feed');
  const token = localStorage.getItem('token') || localStorage.getItem('neosim-token');

  const fetchFeed = async () => {
    try {
      const res = await fetch(`${API}/social/feed`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setFeed(data.feed || []);
    } catch (err) { console.error(err); }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API}/social/stats`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setStats(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    Promise.all([fetchFeed(), fetchStats()]).finally(() => setLoading(false));
  }, []);

  const handleReact = async (postId, emoji) => {
    try {
      await fetch(`${API}/social/react/${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ emoji })
      });
      fetchFeed();
    } catch (err) { console.error(err); }
  };

  const getTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getActivityColor = (type) => {
    const colors = {
      payment: 'from-emerald-500 to-green-600',
      challenge_created: 'from-purple-500 to-indigo-600',
      challenge_completed: 'from-amber-500 to-orange-600',
      scam_streak: 'from-red-500 to-pink-600',
      economy_event: 'from-blue-500 to-cyan-600',
      level_up: 'from-yellow-500 to-amber-600',
    };
    return colors[type] || 'from-primary to-secondary';
  };

  const reactionEmojis = ['🔥', '👏', '💰', '🎉', '💪'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Social Feed</h1>
          <p className="text-text-muted text-sm mt-1">See what your financial community is up to</p>
        </div>
        <button onClick={() => { setLoading(true); Promise.all([fetchFeed(), fetchStats()]).finally(() => setLoading(false)); }}
          className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all hover:scale-105">
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Community Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Community Members', value: stats.totalUsers, icon: Users, color: 'text-primary' },
            { label: 'Total Transactions', value: stats.totalTransactions?.toLocaleString(), icon: TrendingUp, color: 'text-emerald-400' },
            { label: 'Top Level', value: `Lv.${stats.topUsers?.[0]?.level || 1}`, icon: Award, color: 'text-amber-400' },
            { label: 'Feed Posts', value: feed.length, icon: Zap, color: 'text-purple-400' },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="glass-panel p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
              <stat.icon size={20} className={`${stat.color} mb-2`} />
              <p className="text-2xl font-black">{stat.value}</p>
              <p className="text-[11px] text-text-muted font-semibold uppercase tracking-wider">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 bg-white/5 p-1.5 rounded-xl border border-white/5">
        {['feed', 'top-users'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all capitalize ${activeTab === tab ? 'bg-primary text-white shadow-lg' : 'text-text-muted hover:text-white'}`}>
            {tab === 'feed' ? '📰 Activity Feed' : '🏆 Top Users'}
          </button>
        ))}
      </div>

      {/* Feed Content */}
      {activeTab === 'feed' ? (
        <div className="space-y-4">
          <AnimatePresence>
            {feed.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center py-16 glass-panel rounded-2xl border border-white/5">
                <p className="text-4xl mb-4">📭</p>
                <p className="text-lg font-bold">No activity yet</p>
                <p className="text-text-muted text-sm mt-1">Add friends and start transacting to see activity!</p>
              </motion.div>
            ) : (
              feed.map((post, i) => (
                <motion.div key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="glass-panel p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getActivityColor(post.activityType)} flex items-center justify-center text-xl shadow-lg shrink-0`}>
                      {post.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white">{post.name}</span>
                        <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">Lv.{post.level}</span>
                        <span className="text-[11px] text-text-muted/50 ml-auto">{getTimeAgo(post.createdAt)}</span>
                      </div>
                      <p className="font-semibold text-white/90">{post.title}</p>
                      {post.description && <p className="text-sm text-text-muted mt-1">{post.description}</p>}
                      {post.xpEarned > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 mt-2 bg-amber-400/10 px-2 py-0.5 rounded-full">
                          <Zap size={12} /> +{post.xpEarned} XP
                        </span>
                      )}
                      
                      {/* Reactions */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                        <div className="flex gap-1">
                          {reactionEmojis.map(emoji => {
                            let reactions = {};
                            try { reactions = JSON.parse(post.reactions || '{}'); } catch(e) {}
                            const count = reactions[emoji]?.length || 0;
                            const hasReacted = reactions[emoji]?.includes(user?.id);
                            return (
                              <button key={emoji} onClick={() => handleReact(post.id, emoji)}
                                className={`px-2 py-1 rounded-lg text-xs transition-all hover:scale-110 ${hasReacted ? 'bg-primary/20 border border-primary/30' : 'bg-white/5 border border-white/5 hover:bg-white/10'}`}>
                                {emoji} {count > 0 && <span className="ml-0.5 font-bold">{count}</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* Top Users */
        <div className="space-y-3">
          {stats?.topUsers?.map((u, i) => (
            <motion.div key={u.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center gap-4 hover:border-primary/20 transition-all">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${i === 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-600 text-white' : i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white' : i === 2 ? 'bg-gradient-to-br from-amber-600 to-orange-800 text-white' : 'bg-white/10 text-text-muted'}`}>
                {i + 1}
              </div>
              <div className="flex-1">
                <p className="font-bold">{u.name}</p>
                <p className="text-xs text-text-muted">Level {u.level} • Score: {u.financialScore}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-primary">{u.xp?.toLocaleString()}</p>
                <p className="text-[10px] text-text-muted uppercase font-bold">XP</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SocialFeed;
