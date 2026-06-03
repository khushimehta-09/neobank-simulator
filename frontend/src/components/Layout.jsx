import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Send, Clock, FileText, BookOpen, LogOut, 
  Bell, Menu, X, Award, ShieldCheck, WalletCards, TrendingUp, 
  ShieldAlert, Settings, Shield, Trophy, Users, Sparkles, ChevronLeft, ChevronRight, Gamepad2,
  MessageCircle, Eye, Heart, Bot
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import MoneyAnimator from './MoneyAnimator';

const Layout = ({ children }) => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Grouped Navigation Structure
  const navigationGroups = [
    { title: "Core Banking", items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Bank Transfer', path: '/transfer', icon: Send },
      { name: 'Transactions', path: '/history', icon: Clock },
      { name: 'Receipts', path: '/receipts', icon: FileText },
      { name: 'Bills & Pay', path: '/bills', icon: FileText },
    ]},
    { title: "Learning Game", items: [
      { name: 'Levels', path: '/learning', icon: BookOpen },
      { name: 'Challenges', path: '/challenges', icon: ShieldAlert },
      { name: 'Story Mode', path: '/story-mode', icon: Gamepad2 },
      { name: 'Scam Detective', path: '/scam-detective', icon: Eye },
      { name: 'AI Banking Bot', path: '/ai-assistant', icon: Bot },
    ]},
    { title: "Social Hub", items: [
      { name: 'Social Feed', path: '/social-feed', icon: Heart },
      { name: 'Friends', path: '/friends', icon: Users },
      { name: 'Chat', path: '/chat', icon: MessageCircle },
      { name: 'Trust Score', path: '/trust-score', icon: Shield },
    ]},
    { title: "Profile", items: [
      { name: 'Achievements', path: '/achievements', icon: Trophy },
      { name: 'Leaderboard', path: '/leaderboard', icon: Users },
      { name: 'Settings', path: '/settings', icon: Settings },
    ]}
  ];

  const adminItem = { name: 'Admin Panel', path: '/admin', icon: Shield };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Mock Notifications for UI completeness
  const mockNotifications = [
    { id: 1, title: "💡 Daily Tip", message: "Check card reader slot for skimming overlays before entering your PIN.", time: "2m ago", read: false },
    { id: 2, title: "🚀 Level Up!", message: "Congratulations! You reached Level 2 and unlocked Smart Spending challenges.", time: "1h ago", read: false },
    { id: 3, title: "💸 Ledger Alert", message: "Successfully paid internet bill of ₹799.", time: "5h ago", read: true }
  ];


  useEffect(() => {
    if (!localStorage.getItem('token') || !refreshUser) return;
    refreshUser().catch(() => {});
  }, [location.pathname]);

  const formatBalance = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const GlobalBalanceCard = ({ compact = false }) => (
    <div className={`rounded-2xl border border-success/20 bg-gradient-to-br from-success/15 via-white/5 to-primary/10 shadow-[0_0_22px_rgba(6,214,160,0.08)] backdrop-blur-xl ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
      <div className="flex items-center gap-3">
        <div className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-xl bg-success/15 border border-success/20 flex items-center justify-center text-success shrink-0`}>
          <WalletCards size={compact ? 17 : 20} />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-text-muted font-black leading-none">Available Balance</p>
          <p className={`${compact ? 'text-sm' : 'text-lg md:text-2xl'} font-black text-success leading-tight tabular-nums truncate`}>{formatBalance(user?.balance)}</p>
        </div>
        {!compact && (
          <div className="hidden sm:flex ml-2 items-center gap-1 text-[10px] text-success font-black bg-success/10 border border-success/10 px-2 py-1 rounded-full">
            <TrendingUp size={12} /> Live
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans selection:bg-primary/30 text-text-main overflow-x-hidden">
      {/* Desktop Sidebar */}
      <aside 
        className={`hidden md:flex flex-col fixed inset-y-0 left-0 bg-surface/90 backdrop-blur-2xl border-r border-white/5 z-40 shadow-2xl transition-all duration-300 ${collapsed ? 'w-20' : 'w-72'}`}
      >
        {/* Brand Header */}
        <div className="p-6 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(67,97,238,0.5)] shrink-0">
              <ShieldCheck className="text-white" size={24} />
            </div>
            {!collapsed && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/70 tracking-tight"
              >
                NeoSim
              </motion.span>
            )}
          </div>
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/10 text-text-muted hover:text-white transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
        
        {/* Scrollable Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 hide-scrollbar">
          {navigationGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {!collapsed && (
                <p className="text-[10px] uppercase tracking-widest text-text-muted/50 font-bold px-3 mb-2">{group.title}</p>
              )}
              {group.items.map((item) => (
                <NavLink 
                  key={item.name} 
                  to={item.path} 
                  className={({ isActive }) => `flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all duration-300 relative group ${isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-text-muted hover:bg-white/5 hover:text-white'}`}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon size={20} className={`transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(67,97,238,0.8)]' : 'group-hover:scale-110'}`} />
                      {!collapsed && <span className="tracking-wide text-sm">{item.name}</span>}
                      
                      {/* Active Indicator Bar */}
                      {isActive && <motion.div layoutId="sidebar-active" className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-primary rounded-r-full shadow-[0_0_10px_rgba(67,97,238,0.8)]" />}
                      
                      {/* Hover Tooltip (When Collapsed) */}
                      {collapsed && (
                        <div className="absolute left-16 bg-surface-solid border border-white/10 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl z-50">
                          {item.name}
                        </div>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}

          {/* Admin Panel */}
          {user?.role === 'admin' && (
            <div className="pt-2 border-t border-white/5">
              <NavLink 
                to={adminItem.path} 
                className={({ isActive }) => `flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all duration-300 relative group ${isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-text-muted hover:bg-white/5 hover:text-white'}`}
              >
                {({ isActive }) => (
                  <>
                    <adminItem.icon size={20} className={`transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(67,97,238,0.8)]' : 'group-hover:scale-110'}`} />
                    {!collapsed && <span className="tracking-wide text-sm">{adminItem.name}</span>}
                    {isActive && <motion.div layoutId="sidebar-active" className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-primary rounded-r-full shadow-[0_0_10px_rgba(67,97,238,0.8)]" />}
                    {collapsed && (
                      <div className="absolute left-16 bg-surface-solid border border-white/10 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl z-50">
                        {adminItem.name}
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            </div>
          )}
        </div>

        {/* Sidebar Footer (Level & XP Progress Widgets) */}
        <div className="p-4 border-t border-white/5 bg-black/10 shrink-0">
          {!collapsed ? (
            <div className="glass-panel p-3.5 mb-4 rounded-xl border border-primary/20 bg-primary/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-warning to-danger flex items-center justify-center shadow-lg text-sm font-bold text-white shrink-0">
                  {user?.level || 1}
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="text-[10px] text-primary font-bold uppercase tracking-wider mb-0.5">Level {user?.level || 1}</p>
                  <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden">
                    <div className="bg-primary h-1.5 rounded-full" style={{ width: `${Math.min(100, Math.round(((user?.xp || 0) % 500) / 5))}%` }}></div>
                  </div>
                </div>
              </div>
              <p className="text-[9px] text-text-muted mt-2 font-semibold tracking-wider text-right">
                {user?.xp || 0} XP
              </p>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-warning to-danger flex items-center justify-center shadow-lg text-sm font-bold text-white mx-auto mb-4 cursor-help group relative">
              {user?.level || 1}
              <div className="absolute left-16 bg-surface-solid border border-white/10 text-white text-xs p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl z-50">
                <p className="font-bold text-primary">Level {user?.level || 1}</p>
                <p className="text-text-muted">{user?.xp || 0} Total XP</p>
              </div>
            </div>
          )}
          <button 
            onClick={handleLogout} 
            className={`flex items-center gap-3 text-text-muted hover:text-danger w-full py-2.5 rounded-xl hover:bg-danger/10 transition-all font-semibold ${collapsed ? 'justify-center' : 'px-4'}`}
          >
            <LogOut size={20} /> 
            {!collapsed && <span className="text-sm">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between gap-3 p-4 bg-surface/85 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40">
        <div className="flex items-center gap-2 shrink-0">
          <ShieldCheck className="text-primary drop-shadow-[0_0_8px_rgba(67,97,238,0.8)]" size={24} />
          <span className="text-lg font-bold tracking-tight hidden min-[390px]:inline">NeoSim</span>
        </div>
        <div className="flex-1 min-w-0 max-w-[210px]">
          <GlobalBalanceCard compact />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <Bell size={20} className="text-text-muted" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full shadow-[0_0_8px_rgba(239,71,111,0.8)]"></span>
          </button>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`flex-1 pb-24 md:pb-8 pt-6 md:pt-10 px-4 md:px-10 overflow-x-hidden min-h-screen relative transition-all duration-300 ${collapsed ? 'md:ml-20' : 'md:ml-72'}`}>
        {/* Dynamic Glowing Background Orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse"></div>
        
        <div className="hidden md:flex justify-end max-w-7xl mx-auto mb-6 sticky top-4 z-30 pointer-events-none">
          <div className="pointer-events-auto">
            <GlobalBalanceCard />
          </div>
        </div>

        {/* Dynamic Route View Animation */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={location.pathname} 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -15 }} 
            transition={{ duration: 0.3, ease: "easeOut" }} 
            className="max-w-7xl mx-auto h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>

        {/* Mandatory Educational Disclaimer */}
        <div className="mt-12 mb-24 md:mb-8 text-center pb-8 border-t border-white/5 pt-6">
          <p className="text-[10px] text-text-muted/50 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
            <ShieldCheck size={14} className="text-primary/70" /> Educational sandbox environment. No real banking endpoints or financial credits.
          </p>
        </div>
      </main>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: '100%' }} 
            transition={{ type: 'spring', damping: 25 }} 
            className="md:hidden fixed inset-x-0 bottom-0 top-16 bg-background/95 backdrop-blur-2xl z-40 border-t border-white/10 flex flex-col p-6 overflow-y-auto"
          >
            <div className="space-y-6 flex-1 py-4">
              {navigationGroups.map((group, groupIdx) => (
                <div key={groupIdx} className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-text-muted/40 font-black">{group.title}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {group.items.map((item) => (
                      <NavLink 
                        key={item.name} 
                        to={item.path} 
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) => `flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 active:bg-white/10 border transition-all ${isActive ? 'border-primary/30 bg-primary/10 text-primary font-bold shadow-[0_0_10px_rgba(67,97,238,0.2)]' : 'border-white/5 text-text-muted'}`}
                      >
                        <item.icon size={18} />
                        <span className="text-sm font-semibold">{item.name}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}

              {user?.role === 'admin' && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <p className="text-[10px] uppercase tracking-widest text-text-muted/40 font-black">Management</p>
                  <NavLink 
                    to={adminItem.path} 
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) => `flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 active:bg-white/10 border transition-all ${isActive ? 'border-primary/30 bg-primary/10 text-primary font-bold' : 'border-white/5 text-text-muted'}`}
                  >
                    <adminItem.icon size={18} />
                    <span className="text-sm font-semibold">{adminItem.name}</span>
                  </NavLink>
                </div>
              )}
            </div>
            
            <div className="pt-6 border-t border-white/5 space-y-4">
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-warning to-danger flex items-center justify-center text-base font-bold text-white shadow-lg">
                  {user?.level || 1}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase font-bold text-primary">Level {user?.level || 1}</p>
                  <p className="text-xs text-text-muted mt-0.5">{user?.xp || 0} XP</p>
                </div>
              </div>
              <button 
                onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                className="w-full bg-danger/10 hover:bg-danger/20 text-danger font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2"
              >
                <LogOut size={20} />
                <span>Log Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications Drawer */}
      <AnimatePresence>
        {notificationsOpen && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: '100%' }} 
            className="fixed inset-y-0 right-0 w-full max-w-sm bg-surface-solid border-l border-white/10 z-[100] shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col backdrop-blur-2xl"
          >
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
              <h3 className="text-lg font-bold flex items-center gap-2"><Bell size={20} className="text-primary" /> Notifications</h3>
              <button onClick={() => setNotificationsOpen(false)} className="p-1 rounded-lg hover:bg-white/10 text-text-muted hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {mockNotifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-4 rounded-xl border transition-colors flex flex-col gap-1 relative overflow-hidden ${notif.read ? 'bg-white/5 border-white/5' : 'bg-primary/5 border-primary/20 shadow-sm'}`}
                >
                  {!notif.read && <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-primary rounded-bl-lg"></div>}
                  <p className="text-sm font-bold text-white/95">{notif.title}</p>
                  <p className="text-xs text-text-muted leading-relaxed font-medium">{notif.message}</p>
                  <p className="text-[10px] text-text-muted/40 font-bold self-end mt-1">{notif.time}</p>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-white/10 bg-black/10">
              <button 
                onClick={() => setNotificationsOpen(false)} 
                className="w-full btn-secondary font-bold"
              >
                Mark All as Read
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <MoneyAnimator />
    </div>
  );
};

export default Layout;
