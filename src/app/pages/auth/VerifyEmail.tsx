import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { supabase } from '../../../lib/supabase';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';

export function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let verified = false;

    // Set up auth state change listener FIRST - this is the most reliable way
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      if (session?.user?.email_confirmed_at) {
        verified = true;
        clearTimeout(timeoutId);
        setStatus('success');
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    });

    const checkAndVerify = async () => {
      // First, check current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user?.email_confirmed_at) {
        verified = true;
        clearTimeout(timeoutId);
        setStatus('success');
        setTimeout(() => {
          navigate('/');
        }, 2000);
        return;
      }

      // Parse URL parameters from both query string and hash
      const queryTokenHash = searchParams.get('token_hash');
      const queryToken = searchParams.get('token');
      const queryType = searchParams.get('type');
      
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hashTokenHash = hashParams.get('token_hash');
      const hashToken = hashParams.get('token');
      const hashType = hashParams.get('type');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      const tokenHash = queryTokenHash || hashTokenHash;
      const token = queryToken || hashToken;
      const type = (queryType || hashType || 'signup') as 'email' | 'signup' | 'recovery' | 'invite' | 'email_change';

      // If we have access_token or refresh_token in hash, Supabase already verified via PKCE
      if (accessToken || refreshToken) {
        // Session should be established automatically, wait a moment
        setTimeout(async () => {
          const { data: { session: newSession } } = await supabase.auth.getSession();
          if (newSession?.user) {
            verified = true;
            clearTimeout(timeoutId);
            setStatus('success');
            setTimeout(() => {
              navigate('/');
            }, 2000);
          }
        }, 1000);
        return;
      }

      // If we have token_hash or token, verify it
      if (tokenHash || token) {
        try {
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash || undefined,
            token: token || undefined,
            type: type,
          });

          if (verifyError) {
            console.error('Verification error:', verifyError);
            verified = true;
            clearTimeout(timeoutId);
            setError(verifyError.message || 'Verification failed. The link may have expired.');
            setStatus('error');
          } else if (data?.session) {
            verified = true;
            clearTimeout(timeoutId);
            setStatus('success');
            setTimeout(() => {
              navigate('/');
            }, 2000);
          } else {
            // Check session after a brief delay
            setTimeout(async () => {
              const { data: { session: verifiedSession } } = await supabase.auth.getSession();
              if (verifiedSession?.user) {
                verified = true;
                clearTimeout(timeoutId);
                setStatus('success');
                setTimeout(() => {
                  navigate('/');
                }, 2000);
              } else if (!verified) {
                verified = true;
                clearTimeout(timeoutId);
                setError('Verification link may have already been used. Please try logging in.');
                setStatus('error');
              }
            }, 2000);
          }
        } catch (err: any) {
          console.error('Verification error:', err);
          verified = true;
          clearTimeout(timeoutId);
          setError(err.message || 'Verification failed');
          setStatus('error');
        }
      } else {
        // No verification parameters - Supabase might have already verified server-side
        // Wait a bit longer and check session multiple times
        let attempts = 0;
        const checkSession = async () => {
          attempts++;
          const { data: { session: delayedSession } } = await supabase.auth.getSession();
          if (delayedSession?.user?.email_confirmed_at) {
            verified = true;
            clearTimeout(timeoutId);
            setStatus('success');
            setTimeout(() => {
              navigate('/');
            }, 2000);
          } else if (attempts < 3 && !verified) {
            // Try again after a delay
            setTimeout(checkSession, 1500);
          } else if (!verified) {
            verified = true;
            clearTimeout(timeoutId);
            setError('No verification token found. If you clicked a verification link, your email may already be verified. Please try logging in.');
            setStatus('error');
          }
        };
        setTimeout(checkSession, 1000);
      }
    };

    // Set timeout
    timeoutId = setTimeout(() => {
      if (!verified && status === 'verifying') {
        verified = true;
        setError('Verification is taking longer than expected. Your email may already be verified. Please try logging in.');
        setStatus('error');
      }
    }, 10000); // 10 second timeout

    // Start verification
    checkAndVerify();

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [searchParams, navigate, status]);

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-[400px] text-center">
          <Loader2 size={48} className="text-cobalt mx-auto mb-4 animate-spin" />
          <h1 className="text-foreground mb-2">Verifying your email</h1>
          <p className="text-[0.9rem] text-muted-foreground">Please wait...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-[400px] text-center">
          <div className="w-16 h-16 rounded-full bg-warning-light flex items-center justify-center mx-auto mb-4">
            <span className="text-warning text-2xl">⚠</span>
          </div>
          <h1 className="text-foreground mb-2">Verification Issue</h1>
          <p className="text-[0.9rem] text-muted-foreground mb-6">{error}</p>
          <div className="space-y-2">
            <Button
              onClick={() => navigate('/auth/login')}
              className="w-full"
            >
              Try logging in
            </Button>
            <p className="text-[0.75rem] text-muted-foreground">
              If your email was verified, you should be able to log in now.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] text-center">
        <div className="w-16 h-16 rounded-full bg-success-light flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-success" />
        </div>
        <h1 className="text-foreground mb-2">Email verified!</h1>
        <p className="text-[0.9rem] text-muted-foreground mb-6">Redirecting you to the app...</p>
      </div>
    </div>
  );
}
