import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Dashboard from './pages/Dashboard';
import Transfer from './pages/Transfer';
import History from './pages/History';
import Bills from './pages/Bills';
import Analytics from './pages/Analytics'; // Insights
import Learning from './pages/Learning'; // Levels
import Goals from './pages/Goals';
import Analyzer from './pages/Analyzer'; // Scam Lab
import FraudChallenges from './pages/FraudChallenges';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import Layout from './components/Layout';

// New Upgraded Pages
import StoryMode from './pages/StoryMode';
import Budgets from './pages/Budgets';
import Achievements from './pages/Achievements';
import Leaderboard from './pages/Leaderboard';

// Social & Gamified Pages
import SocialFeed from './pages/SocialFeed';
import Friends from './pages/Friends';
import Chat from './pages/Chat';
import ScamGame from './pages/ScamGame';
import TrustScore from './pages/TrustScore';
import Receipts from './pages/Receipts';
import AIAssistant from './pages/AIAssistant';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <Layout>{children}</Layout>;
};

function App() {
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('neosim-theme');
    if (savedTheme) {
      const doc = document.documentElement;
      const themes = [
        { id: 'midnight-gold', className: 'theme-midnight-gold' },
        { id: 'ocean-contrast', className: 'theme-ocean-contrast' },
        { id: 'sunset-graphite', className: 'theme-sunset-graphite' },
        { id: 'royal-slate', className: 'theme-royal-slate' }
      ];
      
      // Clean up existing classes
      themes.forEach(t => doc.classList.remove(t.className));
      
      // Apply saved theme class
      const active = themes.find(t => t.id === savedTheme);
      if (active && active.className) {
        doc.classList.add(active.className);
      }
    }
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          
          {/* Protected Core Banking Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/transfer" element={<ProtectedRoute><Transfer /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
          <Route path="/receipts" element={<ProtectedRoute><Receipts /></ProtectedRoute>} />
          
          {/* Protected Learning Game Routes */}
          <Route path="/learning" element={<ProtectedRoute><Learning /></ProtectedRoute>} />
          <Route path="/challenges" element={<ProtectedRoute><FraudChallenges /></ProtectedRoute>} />
          <Route path="/story-mode" element={<ProtectedRoute><StoryMode /></ProtectedRoute>} />
          
          {/* Protected Finance Tools Routes */}
          <Route path="/bills" element={<ProtectedRoute><Bills /></ProtectedRoute>} />
          
          {/* Protected Profile Routes */}
          <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          
          {/* Social & Community Routes */}
          <Route path="/social-feed" element={<ProtectedRoute><SocialFeed /></ProtectedRoute>} />
          <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/scam-detective" element={<ProtectedRoute><ScamGame /></ProtectedRoute>} />
          <Route path="/trust-score" element={<ProtectedRoute><TrustScore /></ProtectedRoute>} />
          
          {/* Protected Admin panel Route */}
          <Route path="/ai-assistant" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
