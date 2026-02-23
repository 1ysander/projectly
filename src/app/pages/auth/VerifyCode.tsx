import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { supabase } from '../../../lib/supabase';
import { CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Link } from 'react-router';
import { toast } from 'sonner';

function getReadableAuthErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || '');
  const normalized = message.toLowerCase();

  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('load failed')
  ) {
    return 'Network error connecting to Supabase. Check your internet, VPN, firewall, or system SSL certificates and try again.';
  }

  return message || 'Verification failed. Please try again.';
}

export function VerifyCode() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'input' | 'verifying' | 'success' | 'error'>('input');
  const [error, setError] = useState<string | null>(null);

  const verifyCodeWithFallback = async (targetEmail: string, token: string) => {
    const verificationTypes: Array<'email' | 'signup'> = ['email', 'signup'];
    let lastError: any = null;

    for (const type of verificationTypes) {
      const {
        data: { session },
        error: verifyError,
      } = await supabase.auth.verifyOtp({
        email: targetEmail,
        token,
        type,
      });

      if (verifyError) {
        lastError = verifyError;
        const errorMessage = verifyError.message?.toLowerCase() || '';
        const mightBeTypeMismatch =
          verifyError.status === 400 ||
          errorMessage.includes('invalid') ||
          errorMessage.includes('expired') ||
          errorMessage.includes('otp') ||
          errorMessage.includes('token');

        if (mightBeTypeMismatch && type !== verificationTypes[verificationTypes.length - 1]) {
          continue;
        }

        return { session: null, error: verifyError };
      }

      if (session) {
        return { session, error: null };
      }

      // Some auth configurations may establish the session asynchronously.
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      if (currentSession) {
        return { session: currentSession, error: null };
      }
    }

    return { session: null, error: lastError };
  };

  // Step 2: Verify OTP (following Supabase docs exactly)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError('Email not found. Please go back and request a new code.');
      setStatus('error');
      return;
    }
    
    // Clean the code - remove any spaces or non-numeric characters
    const cleanCode = code.replace(/\D/g, '').trim();
    
    // Accept 6-8 digits (matches Supabase configuration)
    if (cleanCode.length < 6 || cleanCode.length > 8) {
      setError('Please enter a valid verification code (6-8 digits)');
      return;
    }

    setLoading(true);
    setStatus('verifying');
    setError(null);

    try {
      // Avoid staying in an indeterminate loading state on network stalls.
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Verification timed out. Please try again.'));
        }, 12000);
      });

      const { session, error: verifyError } = await Promise.race([
        verifyCodeWithFallback(email, cleanCode),
        timeoutPromise,
      ]).finally(() => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      });

      if (verifyError) {
        let errorMessage = 'Invalid verification code. Please try again.';
        try {
          if (verifyError && typeof verifyError === 'object') {
            errorMessage = verifyError.message || verifyError.toString() || errorMessage;
          } else if (verifyError) {
            errorMessage = String(verifyError);
          }
        } catch (e) {
          console.error('Error parsing error message:', e);
        }
        
        const normalizedErrorMessage = errorMessage.toLowerCase();
        if (normalizedErrorMessage.includes('expired') || normalizedErrorMessage.includes('otp_expired')) {
          setError('This code has expired. Please request a new code.');
        } else if (normalizedErrorMessage.includes('invalid')) {
          setError('Invalid code. Please check the code and try again.');
        } else {
          setError(errorMessage);
        }
        setStatus('error');
        setLoading(false);
      } else if (session) {
        // Success! User is now logged in
        setStatus('success');
        toast.success('Email verified successfully!');
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        setError('Verification succeeded but session not found. Please try again.');
        setStatus('error');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Unexpected verification error:', err);
      const errorMessage = getReadableAuthErrorMessage(err);
      setError(errorMessage);
      setStatus('error');
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error('Email not found. Please try again.');
      navigate('/auth/login');
      return;
    }

    try {
      // Resend OTP using the same method
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      if (otpError) {
        // Handle rate limit errors specifically
        if (otpError.message?.includes('rate limit') || otpError.message?.includes('429') || otpError.status === 429) {
          toast.error('Too many requests. Please wait a minute before requesting another code.');
        } else {
          toast.error(otpError.message || 'Failed to resend code');
        }
      } else {
        toast.success('Verification code sent! Check your email (including spam folder).');
        setCode('');
        setError(null);
        setStatus('input');
      }
    } catch (err: any) {
      toast.error(getReadableAuthErrorMessage(err));
    }
  };

  if (status === 'success') {
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

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-[400px] text-center">
          <Loader2 size={48} className="text-cobalt mx-auto mb-4 animate-spin" />
          <h1 className="text-foreground mb-2">Verifying your code</h1>
          <p className="text-[0.9rem] text-muted-foreground">Please wait...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-cobalt flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl" style={{ fontWeight: 700 }}>U</span>
          </div>
          <h1 className="text-foreground mb-2">Verify your email</h1>
          <p className="text-[0.9rem] text-muted-foreground mb-2">
            We've sent a verification code to <strong>{email || 'your email'}</strong>
          </p>
          <p className="text-[0.75rem] text-muted-foreground mb-4">
            Check your spam folder if you don't see it. Enter the code immediately after receiving it.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="code" className="text-[0.85rem] text-muted-foreground mb-1.5 block">
              Verification Code
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={code}
              onChange={(e) => {
                // Only allow digits, remove any spaces or dashes (accept up to 8 digits)
                const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                setCode(value);
                setError(null);
              }}
              onPaste={(e) => {
                // Handle paste - extract numbers only (accept up to 8 digits)
                e.preventDefault();
                const pasted = e.clipboardData.getData('text');
                const numbers = pasted.replace(/\D/g, '').slice(0, 8);
                setCode(numbers);
                setError(null);
              }}
              required
              maxLength={8}
              className="w-full h-11 px-3.5 rounded-xl bg-[#F8F9FA] border border-border text-[0.88rem] outline-none focus:border-cobalt text-center text-2xl tracking-widest font-mono"
              placeholder="00000000"
              autoComplete="one-time-code"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-danger-light border border-danger/20">
              <p className="text-[0.85rem] text-danger mb-2">{error}</p>
              <p className="text-[0.75rem] text-muted-foreground">
                Make sure you're using the most recent code. Each code can only be used once.
              </p>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || code.length < 6 || code.length > 8}
            className="w-full h-11 rounded-xl bg-cobalt text-white hover:bg-cobalt-dark"
            style={{ fontWeight: 500 }}
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </Button>
        </form>

        <div className="mt-6 text-center space-y-3">
          <button
            onClick={handleResend}
            className="text-cobalt text-[0.85rem] cursor-pointer hover:underline"
            style={{ fontWeight: 500 }}
          >
            Resend code
          </button>
          <div>
            <Link
              to="/auth/login"
              className="text-[0.85rem] text-muted-foreground flex items-center justify-center gap-2 cursor-pointer hover:text-foreground"
            >
              <ArrowLeft size={14} /> Use a different email
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
