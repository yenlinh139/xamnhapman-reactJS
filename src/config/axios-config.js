import axios from "axios";

export const BASE_URL = import.meta.env.VITE_BASE_URL;

// Create an Axios instance
const axiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 5000,
});

// Request Interceptor
axiosInstance.interceptors.request.use(
    (config) => {
        // Check if access_token is available and update Authorization header
        const access_token = localStorage.getItem("access_token");
        if (access_token) {
            config.headers.Authorization = `Bearer ${access_token}`;
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
        if (error.response && error.response.status === 401) {
            try {
                const refresh_token = localStorage.getItem("refresh_token");
                if (!refresh_token) {
                    // If no refresh token is available, log out the user or handle the error
                    return Promise.reject(error);
                }

                // Call the refresh token API
                const { data } = await axios.get(`${BASE_URL}/api/refresh-token`, {
                    headers: {
                        Authorization: `Bearer ${refresh_token}`,
                    },
                });

                // Save new access_token to localStorage
                localStorage.setItem("access_token", data.access_token);

                // Update the Authorization header and retry the original request
                error.config.headers.Authorization = `Bearer ${data.access_token}`;
                return axiosInstance(error.config);
            } catch (err) {
                // Optional: clear tokens if refresh fails
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                return Promise.reject(err);
            }
        }
        return Promise.reject(error);
    },
);

export default axiosInstance;
