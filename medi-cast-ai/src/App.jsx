import "@/lib/offlineQueue";
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import ScrollToTop from './components/ScrollToTop';

// Auth context & pages
import { AuthProvider } from '@/lib/AuthContext';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

// App pages
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import LiveSurgery from '@/pages/LiveSurgery';
import UploadVideo from '@/pages/UploadVideo';
import Analyses from '@/pages/Analyses';
import AnalysisDetail from '@/pages/AnalysisDetail';
import Assistant from '@/pages/Assistant';
import Compare from '@/pages/Compare';
import Subscription from '@/pages/Subscription';
import AnatomyScan from "@/pages/AnatomyScan";
import AdminDashboard from "@/pages/AdminDashboard";
import Architecture from '@/pages/Architecture';
import { SubscriptionProvider } from '@/lib/SubscriptionContext';

const MainApp = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/live" element={<LiveSurgery />} />
        <Route path="/upload" element={<UploadVideo />} />
        <Route path="/analyses" element={<Analyses />} />
        <Route path="/analysis/:id" element={<AnalysisDetail />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/architecture" element={<Architecture />} />
        <Route path="/anatomy-scan" element={<AnatomyScan />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/subscription" element={<Subscription />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <SubscriptionProvider>
          <Router>
            <ScrollToTop />
            <MainApp />
          </Router>
          <Toaster />
        </SubscriptionProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
