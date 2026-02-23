import { createBrowserRouter } from 'react-router';
import { RootLayout } from './components/layout/RootLayout';
import { Home } from './pages/Home';
import { Returns } from './pages/Returns';
import { ReturnDetail } from './pages/ReturnDetail';
import { Shipments } from './pages/Shipments';
import { ShipmentDetail } from './pages/ShipmentDetail';
import { Analytics } from './pages/Analytics';
import { Connections } from './pages/Connections';
import { Settings } from './pages/Settings';
import { Onboarding } from './pages/Onboarding';
import { NotFound } from './pages/NotFound';
import { Login } from './pages/auth/Login';
import { VerifyCode } from './pages/auth/VerifyCode';
import { VerifyEmail } from './pages/auth/VerifyEmail';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Navigate } from 'react-router';

export const router = createBrowserRouter([
  {
    path: '/auth/login',
    Component: Login,
  },
  {
    path: '/auth/signup',
    element: <Navigate to="/auth/login" replace />,
  },
  {
    path: '/auth/verify-code',
    Component: VerifyCode,
  },
  {
    path: '/auth/verify',
    Component: VerifyEmail,
  },
  {
    path: '/auth/verify-email',
    Component: VerifyEmail,
  },
  {
    path: '/onboarding',
    element: (
      <ProtectedRoute requireOnboarding={false}>
        <Onboarding />
      </ProtectedRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <RootLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, Component: Home },
      { path: 'returns', Component: Returns },
      { path: 'returns/:id', Component: ReturnDetail },
      { path: 'shipments', Component: Shipments },
      { path: 'shipments/:id', Component: ShipmentDetail },
      { path: 'analytics', Component: Analytics },
      { path: 'connections', Component: Connections },
      { path: 'settings', Component: Settings },
      { path: '*', Component: NotFound },
    ],
  },
]);
