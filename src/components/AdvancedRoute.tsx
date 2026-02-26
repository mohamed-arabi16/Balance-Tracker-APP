import { Navigate } from 'react-router-dom';
import { useMode } from '@/contexts/ModeContext';

interface AdvancedRouteProps {
  children: React.ReactNode;
}

export function AdvancedRoute({ children }: AdvancedRouteProps) {
  const { isAdvanced } = useMode();
  if (!isAdvanced) return <Navigate to="/" replace />;
  return <>{children}</>;
}
