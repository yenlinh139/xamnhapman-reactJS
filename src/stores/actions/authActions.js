import axios from "axios";
import { TOAST } from "@common/constants";
import { validateFormLogin, validateFormSignUp } from "@common/validate";
import { ToastCommon } from "@components/ToastCommon.jsx";
import { SET_SHOW_SIGNUP, SET_USER_INFO } from "@stores/constants";
import { persistor } from "@stores/store";
import { jwtDecode } from "jwt-decode";

export const signUp = (params) => {
    return async (dispatch, getState) => {
        try {
            // validation
            validateFormSignUp(params);

            const resp = await axios.post(import.meta.env.VITE_BASE_URL + "/signup", {
                name: params.name,
                email: params.email,
                password: params.password,
            });

            if (resp) {
                ToastCommon(
                    TOAST.SUCCESS,
                    "Đăng ký thành công! Vui lòng kiểm tra email để xác minh tài khoản của bạn.",
                );
                dispatch({
                    type: SET_SHOW_SIGNUP,
                    payload: false,
                });
            }
        } catch (error) {
            ToastCommon(TOAST.ERROR, error.response?.data?.message || error.message);
        }
    };
};

export const login = (params, onRequestNavigate) => {
    return async (dispatch, getState) => {
        try {
            validateFormLogin(params);

            const resp = await axios.post(import.meta.env.VITE_BASE_URL + "/login", params);

            if (resp) {
                // Lưu token vào localStorage
                localStorage.setItem("access_token", resp.data.access_token);
                localStorage.setItem("refresh_token", resp.data.refresh_token);

                dispatch({
                    type: SET_USER_INFO,
                    payload: jwtDecode(resp.data.access_token),
                });

                onRequestNavigate();
            }
        } catch (error) {
            // Kiểm tra nếu là lỗi xác thực email chưa
            if (error?.response?.data?.message) {
                if (error.response.data.message === "Please verify your email before logging in.") {
                    ToastCommon(
                        TOAST.ERROR,
                        "Bạn chưa xác thực email. Vui lòng kiểm tra hộp thư của bạn để xác thực email.",
                    );
                } else {
                    ToastCommon(TOAST.ERROR, error.response.data.message);
                }
            } else {
                ToastCommon(TOAST.ERROR, error.message);
            }
        }
    };
};

export const logout = () => {
    return async (dispatch, getState) => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        persistor.purge();
    };
};
