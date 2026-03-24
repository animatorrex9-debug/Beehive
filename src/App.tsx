/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './app/landing/page';
import { LoginPage } from './app/auth/login';
import { SignupPage } from './app/auth/signup';
import { CompleteProfilePage } from './app/auth/complete-profile';
import { VerifyEmailPage } from './app/auth/verify-email';
import { DashboardPage } from './app/dashboard/page';
import { LoanApplicationPage } from './app/dashboard/loan-application/page';
import { LoanStatusPage } from './app/dashboard/loan-status/page';
import { ChatPage } from './app/dashboard/chat/page';
import { RepaymentPage } from './app/dashboard/repayment/page';
import { HistoryPage } from './app/dashboard/history/page';
import { KYCPage } from './app/dashboard/kyc/page';
import SettingsPage from './app/dashboard/settings/page';
import { AccountsPage } from './app/dashboard/accounts/page';
import { DepositPage } from './app/dashboard/deposit/page';
import { SendPage } from './app/dashboard/send/page';
import { CardsPage } from './app/dashboard/cards/page';
import { InvestPage } from './app/dashboard/invest/page';
import { SwapPage } from './app/dashboard/swap/page';
import { TaxPage } from './app/dashboard/tax/page';
import { CharityPage } from './app/dashboard/charity/page';
import { GrantsPage } from './app/dashboard/grants/page';
import { PrivacyPolicyPage } from './app/legal/privacy';
import { TermsOfServicePage } from './app/legal/terms';
import { CookiePolicyPage } from './app/legal/cookies';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { AdminPage } from './app/admin/page';
import { AdminLoginPage } from './app/admin/login';
import { ManagerPage } from './app/manager/page';
import { ManagerChatPage } from './app/manager/chat/page';
import { ManagerLayout } from './components/manager/ManagerLayout';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './context/ThemeContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { FirebaseSetupGuide } from './components/FirebaseSetupGuide';
import { DebugControls } from './components/DebugControls';
import ErrorBoundary from './components/ErrorBoundary';

import { LoadingLogo } from './components/LoadingLogo';

const ProtectedRoute = ({ children, adminOnly = false, managerOnly = false }: { children: React.ReactNode, adminOnly?: boolean, managerOnly?: boolean }) => {
  const { user, loading, isAdmin, userData, emailVerified, isConfigured } = useAuth();

  if (!isConfigured) return <FirebaseSetupGuide />;

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-primary">
      <LoadingLogo size="lg" />
    </div>
  );

  if (!user) {
    return <Navigate to={adminOnly ? "/admin/login" : "/auth/login"} />;
  }

  if (!emailVerified && !adminOnly && !managerOnly) {
    return <Navigate to="/auth/login" />;
  }

  if (!userData?.country && !adminOnly && !managerOnly && window.location.pathname !== '/auth/complete-profile') {
    return <Navigate to="/auth/complete-profile" />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/admin/login" />;
  }

  if (managerOnly && userData?.role !== 'account_manager' && !isAdmin) {
    return <Navigate to="/auth/login" />;
  }

  // Prevent managers from accessing regular dashboard
  if (!adminOnly && !managerOnly && userData?.role === 'account_manager') {
    return <Navigate to="/manager" />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <ThemeProvider>
          <CurrencyProvider>
            <AuthProvider>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth/login" element={<LoginPage />} />
                <Route path="/auth/signup" element={<SignupPage />} />
                <Route path="/auth/complete-profile" element={
                  <ProtectedRoute>
                    <CompleteProfilePage />
                  </ProtectedRoute>
                } />
                <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
                <Route path="/legal/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/legal/terms" element={<TermsOfServicePage />} />
                <Route path="/legal/cookies" element={<CookiePolicyPage />} />
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<DashboardPage />} />
                  <Route path="accounts" element={<AccountsPage />} />
                  <Route path="deposit" element={<DepositPage />} />
                  <Route path="send" element={<SendPage />} />
                  <Route path="cards" element={<CardsPage />} />
                  <Route path="invest" element={<InvestPage />} />
                  <Route path="swap" element={<SwapPage />} />
                  <Route path="tax" element={<TaxPage />} />
                  <Route path="charity" element={<CharityPage />} />
                  <Route path="grants" element={<GrantsPage />} />
                  <Route path="loan-application" element={<LoanApplicationPage />} />
                  <Route path="loan-status" element={<LoanStatusPage />} />
                  <Route path="chat" element={<ChatPage />} />
                  <Route path="repayment" element={<RepaymentPage />} />
                  <Route path="history" element={<HistoryPage />} />
                  <Route path="kyc" element={<KYCPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute adminOnly>
                      <AdminPage />
                    </ProtectedRoute>
                  } 
                />
                <Route path="/manager" element={
                  <ProtectedRoute managerOnly>
                    <ManagerLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<ManagerPage />} />
                  <Route path="chat" element={<ManagerChatPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
              <DebugControls />
            </AuthProvider>
          </CurrencyProvider>
        </ThemeProvider>
      </Router>
    </ErrorBoundary>
  );
}
