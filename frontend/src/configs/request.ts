import * as axios from "axios";
import {getToken} from "@/utils/auth";

export const request = axios.default.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
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
    },
);
request.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            // Unauthorized access, handle it here
            console.error("Unauthorized access - redirecting to login");
            // Optionally, you can redirect to login page or show a notification
            window.location.href = '/login'; // Example redirect
        }

        return Promise.reject(error);
    },
);