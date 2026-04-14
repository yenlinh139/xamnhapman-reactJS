import axios from "axios";
import { jwtDecode } from "jwt-decode";

export const BASE_URL = import.meta.env.VITE_BASE_URL;

let refreshRequestPromise = null;

const isTokenExpired = (token, bufferSeconds = 30) => {
    if (!token) return true;

    try {
        const decoded = jwtDecode(token);
        if (!decoded?.exp) return true;
        const nowInSeconds = Math.floor(Date.now() / 1000);
        return decoded.exp <= nowInSeconds + bufferSeconds;
    } catch (_) {
        return true;
    }
};

const refreshAccessToken = async () => {
    const refresh_token = localStorage.getItem("refresh_token");
    if (!refresh_token) {
        return null;
    }

    if (!refreshRequestPromise) {
        refreshRequestPromise = axios
            .get(`${BASE_URL}/refresh-token`, {
                headers: {
                    Authorization: `Bearer ${refresh_token}`,
                },
            })
            .then(({ data }) => {
                if (data?.access_token) {
                    localStorage.setItem("access_token", data.access_token);
                    if (data.refresh_token) {
                        localStorage.setItem("refresh_token", data.refresh_token);
                    }
                    return data.access_token;
                }
                return null;
            })
            .catch(() => {
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                return null;
            })
            .finally(() => {
                refreshRequestPromise = null;
            });
    }

    return refreshRequestPromise;
};

// Create an Axios instance
const axiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 5000,
});

// Request Interceptor
axiosInstance.interceptors.request.use(
    async (config) => {
        let access_token = localStorage.getItem("access_token");

        if (!access_token || isTokenExpired(access_token)) {
            access_token = await refreshAccessToken();
        }

        if (access_token) {
            config.headers.Authorization = `Bearer ${access_token}`;
        } else if (config.headers?.Authorization) {
            delete config.headers.Authorization;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    },
);

// Response Interceptor
axiosInstance.interceptors.response.use(
    (response) => {
        // Any status code in the 2xx range triggers this function
        return response;
    },
    async (error) => {
        const originalRequest = error.config || {};

        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            try {
                originalRequest._retry = true;
                const refreshedToken = await refreshAccessToken();
                if (!refreshedToken) {
                    return Promise.reject(error);
                }

                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers.Authorization = `Bearer ${refreshedToken}`;
                return axiosInstance(originalRequest);
            } catch (_) {
                return Promise.reject(error);
            }
        }
        return Promise.reject(error);
    },
);

export default axiosInstance;
