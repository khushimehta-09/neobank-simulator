import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Target, TrendingDown, ArrowUpRight, BrainCircuit, Lightbulb, TrendingUp as TrendingUpIcon, Activity } from 'lucide-react';
import api from '../services/api';

const COLORS = ['#4361EE', '#4CC9F0', '#06D6A0', '#FFD166', '#EF476F', '#3A0CA3'];

const Analytics = () => {
  const [categories, setCategories] = useState([]);
  const [trend, setTrend] = useState([]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, trendRes, insightsRes] = await Promise.all([
          api.get('/analytics/categories'),
          api.get('/analytics/monthly-trend'),
          api.get('/learning/ai-insights')
        ]);
        setCategories(catRes.data.categories);
        setTrend(trendRes.data.trend.reverse()); // Chronological
        setInsights(insightsRes.data.insights);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <div className="h-[60vh] flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-8 max-w-7xl mx-auto mt-4 md:mt-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight">Financial Intelligence</h1>
          <p className="text-text-muted">AI-powered analytics and spending forecasts.</p>
        </div>
        <div className="bg-primary/10 border border-primary/20 px-4 py-2 rounded-xl flex items-center gap-2">
          <BrainCircuit className="text-primary animate-pulse" size={18} />
          <span className="text-sm font-bold text-primary">NeoSim AI Active</span>
        </div>
      </header>

      {/* Main Charts Area */}
      <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* Advanced Trend Area Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 lg:col-span-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] rounded-full pointer-events-none transition-opacity duration-500 group-hover:opacity-100 opacity-50"></div>
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Activity className="text-primary" size={20} /> 6-Month Cash Flow Trend</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06D6A0" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06D6A0" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF476F" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#EF476F" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="month" stroke="#AAB0C6" tick={{ fill: '#AAB0C6', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#AAB0C6" tick={{ fill: '#AAB0C6', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(18, 22, 33, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)' }} itemStyle={{ fontWeight: 'bold' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Area type="monotone" dataKey="income" name="Income" stroke="#06D6A0" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="spending" name="Spending" stroke="#EF476F" strokeWidth={3} fillOpacity={1} fill="url(#colorSpending)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Dynamic Category Ring Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6 flex flex-col items-center justify-center">
          <h3 className="text-xl font-bold mb-4 w-full text-left">Spending Heatmap</h3>
          {categories.length === 0 ? (
            <p className="text-text-muted text-center py-10">No spending data yet.</p>
          ) : (
            <>
              <div className="h-48 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categories} cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={5} dataKey="total" stroke="none">
                      {categories.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity outline-none" />)}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: '#1A1F2E', borderColor: 'transparent', borderRadius: '8px' }} formatter={(val) => `₹${val}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs text-text-muted uppercase tracking-wider">Total Spend</span>
                  <span className="text-xl font-bold">₹{categories.reduce((a,b)=>a+b.total,0).toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-6 w-full space-y-3">
                {categories.slice(0,3).map((cat, i) => (
                  <div key={cat.category} className="flex items-center justify-between text-sm group">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: COLORS[i % COLORS.length], color: COLORS[i % COLORS.length] }}></div>
                      <span className="capitalize font-medium text-white/80 group-hover:text-white transition-colors">{cat.category}</span>
                    </div>
                    <span className="font-bold">₹{cat.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* AI Intelligence Feed */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Lightbulb className="text-warning" size={24} /> AI Generated Insights</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {insights.map((insight, idx) => {
            const isWarning = insight.type === 'warning';
            const isSuccess = insight.type === 'success';
            return (
              <motion.div key={idx} whileHover={{ y: -5 }} className={`relative overflow-hidden p-6 rounded-2xl border flex flex-col gap-3 ${isWarning ? 'bg-danger/5 border-danger/20' : isSuccess ? 'bg-success/5 border-success/20' : 'bg-primary/5 border-primary/20'} backdrop-blur-xl transition-all duration-300 hover:shadow-2xl`}>
                <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-10 ${isWarning ? 'bg-danger' : isSuccess ? 'bg-success' : 'bg-primary'}`}></div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner ${isWarning ? 'bg-danger/20 text-danger' : isSuccess ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'}`}>
                  {insight.icon}
                </div>
                <div>
                  <p className="font-bold text-lg mb-1 capitalize text-white drop-shadow-md">{insight.category} Analysis</p>
                  <p className="text-sm text-white/70 leading-relaxed">{insight.message}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default Analytics;
