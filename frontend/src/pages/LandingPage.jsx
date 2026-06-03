import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, BookOpen, Smartphone, Activity, Send, Target } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LandingPage = () => {
  const { user, loading } = useAuth();

  if (loading) return <div className="min-h-screen bg-background" />;
  if (user) return <Navigate to="/dashboard" replace />;

  const features = [
    { icon: Smartphone, title: 'Realistic Simulation', desc: 'Experience a true-to-life digital banking interface without the real-world financial risk.' },
    { icon: BookOpen, title: 'Interactive Learning', desc: 'Understand how NEFT, RTGS, IMPS, and UPI transactions actually work behind the scenes.' },
    { icon: ShieldCheck, title: 'Fraud Awareness', desc: 'Learn to identify phishing scams, fake UPI requests, and safe online banking practices.' },
    { icon: Activity, title: 'Financial Analytics', desc: 'Track virtual expenses, set savings goals, and understand budget management.' },
  ];

  return (
    <div className="min-h-screen bg-background text-text overflow-hidden relative">
      {/* Background elements */}
      <div className="glow-orb bg-primary w-[600px] h-[600px] -top-64 -left-64"></div>
      <div className="glow-orb bg-secondary w-[500px] h-[500px] bottom-0 right-0"></div>
      
      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
            <span className="font-bold text-white text-xl">N</span>
          </div>
          <span className="text-2xl font-bold tracking-wide">Neo<span className="text-primary">Sim</span></span>
        </div>
        <div className="flex gap-4">
          <Link to="/login" className="btn-secondary hidden sm:block">Login</Link>
          <Link to="/signup" className="btn-primary">Start Learning</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-sm font-medium text-muted">Educational Platform Only</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
              Master Digital <br/>
              <span className="gradient-text">Banking</span> Safely.
            </h1>
            
            <p className="text-lg text-muted mb-8 max-w-lg leading-relaxed">
              Experience a premium gamified banking simulator. Learn how real transactions work, spot financial fraud, and build financial literacy without using real money.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/signup" className="btn-primary flex justify-center items-center gap-2 text-lg">
                Create Virtual Account
              </Link>
              <Link to="/login" className="btn-secondary flex justify-center items-center text-lg sm:hidden">
                Login
              </Link>
            </div>
            
            <p className="mt-6 text-sm text-muted/70 flex items-center gap-2 font-bold uppercase tracking-widest text-warning">
              <ShieldCheck size={16} /> Educational & Financial Intelligence Purpose Only
            </p>
          </motion.div>

          {/* Abstract Hero Image/Card */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="glass-panel p-8 relative z-10 transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
              <div className="flex justify-between items-center mb-12">
                <div>
                  <p className="text-sm text-muted">Virtual Balance</p>
                  <h3 className="text-4xl font-bold">₹50,000<span className="text-xl text-muted">.00</span></h3>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="font-bold text-primary">NS</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center text-success">
                      <Send size={18} />
                    </div>
                    <div>
                      <p className="font-medium">Transfer Simulation</p>
                      <p className="text-xs text-muted">Sent to John Doe</p>
                    </div>
                  </div>
                  <p className="font-bold text-danger">-₹1,250</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                      <Target size={18} />
                    </div>
                    <div>
                      <p className="font-medium">XP Earned</p>
                      <p className="text-xs text-muted">First Transfer Badge</p>
                    </div>
                  </div>
                  <p className="font-bold text-success">+50 XP</p>
                </div>
              </div>
            </div>
            
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-2xl blur-xl opacity-30 -z-10 animate-blob"></div>
          </motion.div>
        </div>
      </main>

      {/* Features Section */}
      <section className="relative z-10 border-t border-white/5 bg-surface/30">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Why use a Banking Simulator?</h2>
            <p className="text-muted max-w-2xl mx-auto">Build confidence in digital finance through hands-on experience before handling real-world accounts.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-6"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                    <Icon size={24} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feat.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{feat.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
