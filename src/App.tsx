import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { DateProvider } from "@/contexts/DateContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ModeProvider } from "@/contexts/ModeContext";
import { AdvancedRoute } from "@/components/AdvancedRoute";
import { UserSettingsSync } from "@/components/UserSettingsSync";
import { PageViewTracker } from "@/components/PageViewTracker";
import { Skeleton } from "@/components/ui/skeleton";
import "./i18n";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Income = lazy(() => import("./pages/Income"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Debts = lazy(() => import("./pages/Debts"));
const Assets = lazy(() => import("./pages/Assets"));
const EditAssetPage = lazy(() => import("./pages/EditAssetPage"));
const Settings = lazy(() => import("./pages/Settings"));
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdvancedDashboard = lazy(() => import("./pages/advanced/AdvancedDashboard"));
const ClientsPage = lazy(() => import('./pages/advanced/ClientsPage'));
const ClientNewPage = lazy(() => import('./pages/advanced/ClientNewPage'));
const ClientEditPage = lazy(() => import('./pages/advanced/ClientEditPage'));
const ClientDetailPage = lazy(() => import('./pages/advanced/ClientDetailPage'));
const InvoicesPage = lazy(() => import('./pages/advanced/InvoicesPage'));
const InvoiceNewPage = lazy(() => import('./pages/advanced/InvoiceNewPage'));
const InvoiceEditPage = lazy(() => import('./pages/advanced/InvoiceEditPage'));
const InvoiceDetailPage = lazy(() => import('./pages/advanced/InvoiceDetailPage'));

const queryClient = new QueryClient();

function AppRouteFallback() {
  return (
    <div className="p-4 sm:p-6 space-y-6 bg-gradient-dashboard min-h-screen">
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-56 w-full" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <ModeProvider>
          <CurrencyProvider>
            <DateProvider>
              <TooltipProvider>
                <UserSettingsSync />
                <Suspense fallback={<AppRouteFallback />}>
                  <BrowserRouter>
                    <PageViewTracker />
                    <Routes>
                      <Route path="/signin" element={<SignIn />} />
                      <Route path="/signup" element={<SignUp />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route
                        path="/*"
                        element={
                          <ProtectedRoute>
                            <AppLayout>
                              <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/income" element={<Income />} />
                                <Route path="/expenses" element={<Expenses />} />
                                <Route path="/debts" element={<Debts />} />
                                <Route path="/assets" element={<Assets />} />
                                <Route path="/assets/:assetId/edit" element={<EditAssetPage />} />
                                <Route path="/settings" element={<Settings />} />
                                <Route path="/advanced" element={<AdvancedRoute><AdvancedDashboard /></AdvancedRoute>} />
                                <Route path="/clients" element={<AdvancedRoute><ClientsPage /></AdvancedRoute>} />
                                <Route path="/clients/new" element={<AdvancedRoute><ClientNewPage /></AdvancedRoute>} />
                                <Route path="/clients/:id/edit" element={<AdvancedRoute><ClientEditPage /></AdvancedRoute>} />
                                <Route path="/clients/:id" element={<AdvancedRoute><ClientDetailPage /></AdvancedRoute>} />
                                <Route path="/invoices" element={<AdvancedRoute><InvoicesPage /></AdvancedRoute>} />
                                <Route path="/invoices/new" element={<AdvancedRoute><InvoiceNewPage /></AdvancedRoute>} />
                                <Route path="/invoices/:id/edit" element={<AdvancedRoute><InvoiceEditPage /></AdvancedRoute>} />
                                <Route path="/invoices/:id" element={<AdvancedRoute><InvoiceDetailPage /></AdvancedRoute>} />
                                <Route path="*" element={<NotFound />} />
                              </Routes>
                            </AppLayout>
                          </ProtectedRoute>
                        }
                      />
                    </Routes>
                  </BrowserRouter>
                </Suspense>
                <Sonner />
              </TooltipProvider>
            </DateProvider>
          </CurrencyProvider>
        </ModeProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
