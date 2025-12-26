import { createContext, useContext, useEffect, useState } from 'react';
import { UserType } from '@/types/user.type';
import { request } from '@/configs/request';
import { getApiErrorMessage } from '@/utils/api-error';

interface AuthContextType {
	user: UserType | null;
	login: (username: string, password: string) => Promise<UserType | null>;
	telegramLogin: (telegramUserId: string) => Promise<UserType | null>;
	logout: () => void;
	isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [user, setUser] = useState<UserType | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		// Check if user is logged in from localStorage
		const storedUser = localStorage.getItem('EduOne_user');
		if (storedUser) {
			try {
				setUser(JSON.parse(storedUser));
			} catch (error) {
				localStorage.removeItem('EduOne_user');
			}
		}
		// Also refresh "me" from backend (prevents role/token mismatch and keeps permissions in sync)
		(async () => {
			try {
				const token = localStorage.getItem('e_token');
				if (!token) return;
				const { data } = await request.get('/users/me');
				if (data) {
					localStorage.setItem('EduOne_user', JSON.stringify(data));
					setUser(data as UserType);
				}
			} catch (e) {
				// If token invalid, force logout
				localStorage.removeItem('EduOne_user');
				localStorage.removeItem('e_token');
				setUser(null);
			} finally {
				setIsLoading(false);
			}
		})();
		if (!localStorage.getItem('e_token')) setIsLoading(false);
	}, []);

	const login = async (username: string, password: string): Promise<UserType | null> => {
		setIsLoading(true);

		// Authentication with username
		if (username && password.length >= 6) {
			try {
				const { data } = await request.post('/auth/login', {
					username,
					password,
				});
				console.log('Login response:', data);
				if (!data.access_token) {
					setIsLoading(false);
					return null;
				}
				localStorage.setItem('e_token', data.access_token);
				localStorage.setItem('EduOne_user', JSON.stringify(data.user));

				setUser({
					...data.user,
				});

				setIsLoading(false);
				return data.user as UserType;
			} catch (err) {
				const msg = getApiErrorMessage(err) || "Login xatoligi";
				setIsLoading(false);
				throw new Error(msg);
			}
		}

		setIsLoading(false);
		return null;
	};

	const telegramLogin = async (telegramUserId: string): Promise<UserType | null> => {
		setIsLoading(true);

		try {
			const { data } = await request.post('/auth/telegram/login', {
				telegramUserId,
			});
			console.log('Telegram login response:', data);
			if (!data.access_token) {
				setIsLoading(false);
				return null;
			}
			localStorage.setItem('e_token', data.access_token);
			localStorage.setItem('EduOne_user', JSON.stringify(data.user));

			setUser({
				...data.user,
			});

			setIsLoading(false);
			return data.user as UserType;
		} catch (error) {
			console.error('Telegram login error:', error);
			setIsLoading(false);
			return null;
		}
	};

	const logout = () => {
		setUser(null);
		localStorage.removeItem('EduOne_user');
		localStorage.removeItem('e_token');
		localStorage.removeItem('token');
		window.location.href = '/login';
	};

	return (
		<AuthContext.Provider value={{ user, login, telegramLogin, logout, isLoading }}>
			{children}
		</AuthContext.Provider>
	);
};
