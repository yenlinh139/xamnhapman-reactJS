import { Navigate, Outlet } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";
import axios from "axios";
import { SET_USER_INFO } from "@stores/constants";
import { ROUTES } from "@common/constants";
import { BASE_URL } from "@config/axios-config";

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

const requestAccessTokenRefresh = async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) return null;

    try {
        const { data } = await axios.get(`${BASE_URL}/refresh-token`, {
            headers: {
                Authorization: `Bearer ${refreshToken}`,
            },
        });

        if (!data?.access_token) return null;

        localStorage.setItem("access_token", data.access_token);
        if (data.refresh_token) {
            localStorage.setItem("refresh_token", data.refresh_token);
        }

        return data.access_token;
    } catch (_) {
        return null;
    }
};

function ProtectedRoute() {
    const { userInfo } = useSelector((state) => state.authStore);
    const dispatch = useDispatch();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const resolveAuth = async () => {
            let accessToken = localStorage.getItem("access_token");

            if (!accessToken || isTokenExpired(accessToken)) {
                accessToken = await requestAccessTokenRefresh();
            }

            if (!isMounted) return;

            if (!accessToken) {
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                dispatch({ type: SET_USER_INFO, payload: null });
                setIsAuthorized(false);
                setIsCheckingAuth(false);
                return;
            }

            try {
                const decodedUser = jwtDecode(accessToken);
                if (!userInfo || userInfo?.email !== decodedUser?.email) {
                    dispatch({
                        type: SET_USER_INFO,
                        payload: decodedUser,
                    });
                }
                setIsAuthorized(true);
            } catch (_) {
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                dispatch({ type: SET_USER_INFO, payload: null });
                setIsAuthorized(false);
            } finally {
                setIsCheckingAuth(false);
            }
        };

        resolveAuth();

        return () => {
            isMounted = false;
        };
    }, [dispatch, userInfo]);

    if (isCheckingAuth) {
        return null;
    }

    if (isAuthorized) {
        return <Outlet />;
    }

    return <Navigate to={ROUTES.login} replace />;
}

export default ProtectedRoute;
