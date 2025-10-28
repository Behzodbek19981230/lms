import * as axios from 'axios';
import { getToken } from '@/utils/auth';

export const request = axios.default.create({
	baseURL: process.env.NEXT_PUBLIC_API_BASE_URL as string,
	headers: {
		'Content-Type': 'application/json',
	},
});
request.interceptors.request.use(
	(config) => {
		const token = getToken();
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);
request.interceptors.response.use(
	(response) => {
		return response;
	},
	(error) => {
		if (typeof window !== 'undefined' && error?.response?.status === 401) {
			localStorage.removeItem('e_token');
			localStorage.removeItem('EduOne_user');
			window.location.href = '/login';
		}

		return Promise.reject(error);
	}
);
