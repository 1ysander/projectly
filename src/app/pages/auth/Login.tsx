import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { Mail } from 'lucide-react';
import { Button } from '../../components/ui/button';

export function Login() {
  const navigate = useNavigate();
  const { sendOTP } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await sendOTP(email);
      if (!error) {
        navigate(`/auth/verify-code?email=${encodeURIComponent(email)}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-cobalt flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl" style={{ fontWeight: 700 }}>U</span>
          </div>
          <h1 className="text-foreground mb-2">Welcome</h1>
          <p className="text-[0.9rem] text-muted-foreground">Enter your email to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="text-[0.85rem] text-muted-foreground mb-1.5 block">
              Email
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-[#F8F9FA] border border-border text-[0.88rem] outline-none focus:border-cobalt"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-cobalt text-white hover:bg-cobalt-dark"
            style={{ fontWeight: 500 }}
          >
            {loading ? 'Sending code...' : 'Continue'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[0.75rem] text-muted-foreground">
            We'll send you a verification code to verify your email. No password needed.
          </p>
        </div>
      </div>
    </div>
  );
}
