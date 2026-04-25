import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DomainProvider, useDomain } from "@/contexts/DomainContext";
import CustomDomainRoutes from "@/components/CustomDomainRoutes";
import Index from "./pages/Index";
import LandingPage from "./pages/LandingPage";
import ProductPage from "./pages/ProductPage";
import StorePage from "./pages/StorePage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminLayout from "./components/admin/AdminLayout";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminProductForm from "./pages/admin/AdminProductForm";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminReviews from "./pages/admin/AdminReviews";
import AdminGateways from "./pages/admin/AdminGateways";
import AdminShipping from "./pages/admin/AdminShipping";
import AdminOrderBumps from "./pages/admin/AdminOrderBumps";
import CheckoutPage from "./pages/CheckoutPage";
import AdminCheckoutBuilder from "./pages/admin/AdminCheckoutBuilder";
import AdminProductBuilder from "./pages/admin/AdminProductBuilder";
import AdminPixels from "./pages/admin/AdminPixels";
import AdminWebhooks from "./pages/admin/AdminWebhooks";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminStores from "./pages/admin/AdminStores";
import AdminLiveView from "./pages/admin/AdminLiveView";
import AdminAbandonedCarts from "./pages/admin/AdminAbandonedCarts";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminPlans from "./pages/admin/AdminPlans";
import SaasAdminLayout from "./components/admin/SaasAdminLayout";
import SaasMetrics from "./pages/admin/SaasMetrics";
import SaasUsers from "./pages/admin/SaasUsers";
import SaasUserDetails from "./pages/admin/SaasUserDetails";
import SaasAnalytics from "./pages/admin/SaasAnalytics";
import SaasOrders from "./pages/admin/SaasOrders";
import AdminPlatformSettings from "./pages/admin/AdminPlatformSettings";
import AdminDomains from "./pages/admin/AdminDomains";
import AdminSecurity from "./pages/admin/AdminSecurity";
import AdminProfile from "./pages/admin/AdminProfile";
import ResetPassword from "./pages/ResetPassword";
import ThankYouRedirect from "./pages/ThankYouRedirect";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { domainInfo, isLoading } = useDomain();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-transparent border-t-primary" />
      </div>
    );
  }

  // Custom domain: only show storefront routes
  if (domainInfo.isCustomDomain) {
    return <CustomDomainRoutes />;
  }

  // Platform domain: full app
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/marketplace" element={<Index />} />
      <Route path="/product/:slug" element={<ProductPage />} />
      <Route path="/products/:slug" element={<ProductPage />} />
      <Route path="/loja/:slug" element={<StorePage />} />
      <Route path="/checkout/:slug" element={<CheckoutPage />} />
      <Route path="/obrigado/:slug" element={<ThankYouRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin" element={<SaasAdminLayout />}>
        <Route index element={<SaasMetrics />} />
        <Route path="analytics" element={<SaasAnalytics />} />
        <Route path="orders" element={<SaasOrders />} />
        <Route path="users" element={<SaasUsers />} />
        <Route path="users/:userId" element={<SaasUserDetails />} />
        <Route path="platform" element={<AdminPlatformSettings />} />
      </Route>
      <Route path="/dashboard" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="live-view" element={<AdminLiveView />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="abandoned-carts" element={<AdminAbandonedCarts />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="products/new" element={<AdminProductForm />} />
        <Route path="products/:id/edit" element={<AdminProductForm />} />
        <Route path="reviews" element={<AdminReviews />} />
        <Route path="gateways" element={<AdminGateways />} />
        <Route path="shipping" element={<AdminShipping />} />
        <Route path="order-bumps" element={<AdminOrderBumps />} />
        <Route path="checkout-builder" element={<AdminCheckoutBuilder />} />
        <Route path="product-builder" element={<AdminProductBuilder />} />
        <Route path="pixels" element={<AdminPixels />} />
        <Route path="webhooks" element={<AdminWebhooks />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="stores" element={<AdminStores />} />
        <Route path="plans" element={<AdminPlans />} />
        <Route path="domains" element={<AdminDomains />} />
        <Route path="security" element={<AdminSecurity />} />
        <Route path="profile" element={<AdminProfile />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <DomainProvider>
          <AppRoutes />
        </DomainProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
