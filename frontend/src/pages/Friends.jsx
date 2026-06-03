import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, UserCheck, UserX, Search, MessageCircle, Send, Users, Clock, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Friends = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ received: [], sent: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState('friends');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const token = localStorage.getItem('token') || localStorage.getItem('neosim-token');

  const fetchFriends = async () => {
    try {
      const res = await fetch(`${API}/friends/list`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setFriends(data.friends || []);
    } catch (err) { console.error(err); }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${API}/friends/requests`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setRequests(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    Promise.all([fetchFriends(), fetchRequests()]).finally(() => setLoading(false));
  }, []);

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`${API}/friends/search?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setSearchResults(data.users || []);
    } catch (err) { console.error(err); }
    setSearching(false);
  };

  const sendRequest = async (receiverId) => {
    try {
      await fetch(`${API}/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ receiverId })
      });
      handleSearch(searchQuery);
      fetchRequests();
    } catch (err) { console.error(err); }
  };

  const handleRequest = async (id, action) => {
    try {
      await fetch(`${API}/friends/request/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action })
      });
      fetchRequests();
      fetchFriends();
    } catch (err) { console.error(err); }
  };

  const removeFriend = async (friendshipId) => {
    try {
      await fetch(`${API}/friends/${friendshipId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFriends();
    } catch (err) { console.error(err); }
  };

  const getChatRoomId = (friendId) => {
    const ids = [user.id, friendId].sort((a, b) => a - b);
    return `${ids[0]}-${ids[1]}`;
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <Users className="text-primary" /> Friends
        </h1>
        <p className="text-text-muted text-sm mt-1">Connect, chat, and challenge your financial community</p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search users by name, email, or UPI ID..."
          className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-text-muted/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
        />
        {searchQuery && (
          <button onClick={() => { setSearchQuery(''); setSearchResults([]); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-white">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Search Results */}
      <AnimatePresence>
        {searchResults.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="glass-panel rounded-2xl border border-primary/20 overflow-hidden">
            <div className="p-3 bg-primary/5 border-b border-white/5">
              <p className="text-xs font-bold text-primary uppercase tracking-wider">Search Results</p>
            </div>
            <div className="divide-y divide-white/5">
              {searchResults.map(u => {
                const isFriend = friends.some(f => f.id === u.id);
                const isPending = requests.sent?.some(r => r.userId === u.id);
                return (
                  <div key={u.id} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold shadow-lg">
                      {u.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{u.name}</p>
                      <p className="text-xs text-text-muted truncate">{u.email}</p>
                    </div>
                    <span className="text-[10px] bg-white/5 px-2 py-1 rounded-full font-bold text-text-muted">Lv.{u.level}</span>
                    {isFriend ? (
                      <span className="text-xs text-emerald-400 font-bold flex items-center gap-1"><UserCheck size={14} /> Friends</span>
                    ) : isPending ? (
                      <span className="text-xs text-amber-400 font-bold flex items-center gap-1"><Clock size={14} /> Pending</span>
                    ) : (
                      <button onClick={() => sendRequest(u.id)}
                        className="px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-xl text-xs font-bold transition-all hover:scale-105 flex items-center gap-1">
                        <UserPlus size={14} /> Add
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-2 bg-white/5 p-1.5 rounded-xl border border-white/5">
        {[
          { id: 'friends', label: `👥 Friends (${friends.length})` },
          { id: 'requests', label: `📬 Requests (${requests.received?.length || 0})` },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-primary text-white shadow-lg' : 'text-text-muted hover:text-white'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'friends' ? (
        <div className="space-y-3">
          {friends.length === 0 ? (
            <div className="text-center py-16 glass-panel rounded-2xl border border-white/5">
              <p className="text-4xl mb-4">👋</p>
              <p className="text-lg font-bold">No friends yet</p>
              <p className="text-text-muted text-sm mt-1">Search for users above to add friends!</p>
            </div>
          ) : (
            friends.map((friend, i) => (
              <motion.div key={friend.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass-panel p-4 rounded-2xl border border-white/5 hover:border-primary/20 transition-all flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-lg font-bold shadow-lg">
                  {friend.name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{friend.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-text-muted">Lv.{friend.level}</span>
                    <span className="text-xs text-emerald-400">Score: {friend.financialScore}</span>
                    <span className="text-xs text-amber-400">{friend.xp} XP</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigate(`/chat?friend=${friend.id}&name=${encodeURIComponent(friend.name)}`)}
                    className="p-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-all hover:scale-105" title="Chat">
                    <MessageCircle size={18} />
                  </button>
                  <button onClick={() => navigate(`/transfer?upi=${friend.upiId}`)}
                    className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all hover:scale-105" title="Send Money">
                    <Send size={18} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Received Requests */}
          <div>
            <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">Received Requests</h3>
            {requests.received?.length === 0 ? (
              <p className="text-sm text-text-muted/50 glass-panel p-4 rounded-xl border border-white/5">No pending requests</p>
            ) : (
              <div className="space-y-3">
                {requests.received?.map(req => (
                  <motion.div key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="glass-panel p-4 rounded-2xl border border-amber-500/20 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold">
                      {req.name?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{req.name}</p>
                      <p className="text-xs text-text-muted">Level {req.level} • Score: {req.financialScore}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleRequest(req.id, 'accepted')}
                        className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1">
                        <UserCheck size={14} /> Accept
                      </button>
                      <button onClick={() => handleRequest(req.id, 'rejected')}
                        className="px-3 py-2 bg-white/5 hover:bg-danger/20 text-text-muted hover:text-danger rounded-xl text-xs font-bold transition-all">
                        <UserX size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Sent Requests */}
          <div>
            <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">Sent Requests</h3>
            {requests.sent?.length === 0 ? (
              <p className="text-sm text-text-muted/50 glass-panel p-4 rounded-xl border border-white/5">No sent requests</p>
            ) : (
              <div className="space-y-3">
                {requests.sent?.map(req => (
                  <div key={req.id} className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white font-bold">
                      {req.name?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{req.name}</p>
                      <p className="text-xs text-text-muted">{req.email}</p>
                    </div>
                    <span className="text-xs text-amber-400 font-bold flex items-center gap-1"><Clock size={12} /> Pending</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Friends;
