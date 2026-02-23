import { useNavigate } from 'react-router';
import { Home } from 'lucide-react';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <p className="text-[4rem] text-muted-foreground/20 mb-2" style={{ fontWeight: 700 }}>404</p>
      <h2 className="text-foreground mb-2">Page not found</h2>
      <p className="text-[0.9rem] text-muted-foreground mb-6">The page you're looking for doesn't exist or has been moved.</p>
      <button
        onClick={() => navigate('/')}
        className="h-10 px-5 rounded-xl bg-cobalt text-white text-[0.85rem] flex items-center gap-2 hover:bg-cobalt-dark cursor-pointer"
        style={{ fontWeight: 500 }}
      >
        <Home size={15} /> Go to Home
      </button>
    </div>
  );
}
