import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import PageLoader from '@/components/PageLoader';

interface ProtectedRouteProps {
	children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
	const { user, isLoading } = useAuth();

	const location = useLocation();

	if (isLoading) {
		return <PageLoader title='Sessiya tekshirilmoqda...' />;
	}

	if (!user) {
		return <Navigate to='/login' state={{ from: location }} replace />;
	}

	return <>{children}</>;
};
