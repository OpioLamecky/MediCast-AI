import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import ScrollToTop from './components/ScrollToTop';

// App pages
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import UploadVideo from '@/pages/UploadVideo';
import Analyses from '@/pages/Analyses';
import AnalysisDetail from '@/pages/AnalysisDetail';
import Assistant from '@/pages/Assistant';
import Compare from '@/pages/Compare';

const MainApp = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/upload" element={<UploadVideo />} />
        <Route path="/analyses" element={<Analyses />} />
        <Route path="/analysis/:id" element={<AnalysisDetail />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/compare" element={<Compare />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <ScrollToTop />
        <MainApp />
      </Router>
      <Toaster />
    </QueryClientProvider>
  )
}

export default App