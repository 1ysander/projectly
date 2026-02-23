import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useAppState } from '../../context/AppContext';
import { Loader2 } from 'lucide-react';
import * as settingsDb from '../../../lib/db/settings';

interface ProtectedRouteProps {
  children: ReactNode;
  requireOnboarding?: boolean;
}

export function ProtectedRoute({ children, requireOnboarding = true }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { onboardingCompleted, loading: appLoading } = useAppState();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    // Immediately redirect to login if not authenticated
    if (!user) {
      navigate('/auth/login', { replace: true });
      return;
    }

    // Wait for app data to finish loading (only if user is authenticated)
    if (appLoading) return;

    // Check onboarding if required
    if (requireOnboarding && !onboardingCompleted) {
      navigate('/onboarding', { replace: true });
    }
  }, [user, authLoading, appLoading, onboardingCompleted, navigate, requireOnboarding]);

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={32} className="text-cobalt animate-spin" />
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  // Show loading while app data is loading (only if user is authenticated)
  if (appLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={32} className="text-cobalt animate-spin" />
      </div>
    );
  }

  // Don't render if onboarding required but not completed (will redirect)
  if (requireOnboarding && !onboardingCompleted) {
    return null;
  }

  return <>{children}</>;
}
