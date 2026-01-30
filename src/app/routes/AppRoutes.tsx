import { Navigate, Route, Routes } from 'react-router-dom';
import RequireAuth from '../auth/RequireAuth';
import ProductShell from '../layouts/ProductShell';
import LoginPage from '../pages/LoginPage';
import BlankProductPage from '../pages/BlankProductPage';
import LinkedInCampaignPage from '../pages/LinkedInCampaignPage';
import LinkedInSettingsPage from '../pages/LinkedInSettingsPage';
import LinkedInInboxPage from '../pages/LinkedInInboxPage';
import NotFound from '../../pages/NotFound.jsx';
import AuditRoute from './AuditRoute';
import OfferingsRoute from './OfferingsRoute';
import { useAuth } from '../auth/AuthContext';
import FullScreenLoader from '../../components/ui/FullScreenLoader';

function IndexRedirect() {
  const { authed, loading } = useAuth();
  if (loading) return <FullScreenLoader label="Checking session…" />;
  return <Navigate to={authed ? '/linkedin/upload' : '/login'} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<IndexRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Public legacy routes */}
      <Route path="/audit" element={<AuditRoute />} />
      <Route path="/offerings" element={<OfferingsRoute />} />

      {/* Protected Product Routes */}
      <Route element={<RequireAuth />}>
        <Route element={<ProductShell />}>
          {/* LinkedIn Product Routes - All point to BlankProductPage */}
          <Route path="/linkedin/upload" element={<BlankProductPage productName="Upload & Enrich" />} />
          <Route path="/linkedin/generate" element={<BlankProductPage productName="Generate Messages" />} />
          <Route path="/linkedin/campaign" element={<LinkedInCampaignPage />} />
          <Route path="/linkedin/queue" element={<LinkedInInboxPage />} />
          <Route path="/linkedin/booked" element={<BlankProductPage productName="Booked Calls" />} />
          <Route path="/linkedin/settings" element={<LinkedInSettingsPage />} />

          {/* Carousel Product Route */}
          <Route path="/carousel" element={<BlankProductPage productName="Carousel Generator" />} />

          {/* Email Product Route */}
          <Route path="/email" element={<BlankProductPage productName="Email Responder" />} />

          {/* Redirect old /app routes to LinkedIn */}
          <Route path="/app/*" element={<Navigate to="/linkedin/upload" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
