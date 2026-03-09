/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './app/landing/page';
import { LoginPage } from './app/auth/login';
import { SignupPage } from './app/auth/signup';
import { VerifyEmailPage } from './app/auth/verify-email';
import { DashboardPage } from './app/dashboard/page';
import { LoanApplicationPage } from './app/dashboard/loan-application/page';
import { LoanStatusPage } from './app/dashboard/loan-status/page';
import { ChatPage } from './app/dashboard/chat/page';
import { RepaymentPage } from './app/dashboard/repayment/page';
import { HistoryPage } from './app/dashboard/history/page';
import { KYCPage } from './app/dashboard/kyc/page';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { AdminPage } from './app/admin/page';
import { AdminLoginPage } from './app/admin/login';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './context/ThemeContext';
import { FirebaseSetupGuide } from './components/FirebaseSetupGuide';
import { DebugControls } from './components/DebugControls';

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { user, loading, isAdmin, emailVerified, isConfigured } = useAuth();

  if (!isConfigured) return <FirebaseSetupGuide />;

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-primary">
      <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user) {
    return <Navigate to={adminOnly ? "/admin/login" : "/auth/login"} />;
  }

  if (!emailVerified && !adminOnly) {
    return <Navigate to="/auth/login" />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/admin/login" />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/signup" element={<SignupPage />} />
            <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
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
              <Route path="loan-application" element={<LoanApplicationPage />} />
              <Route path="loan-status" element={<LoanStatusPage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="repayment" element={<RepaymentPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="kyc" element={<KYCPage />} />
            </Route>
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute adminOnly>
                  <AdminPage />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          <DebugControls />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}
