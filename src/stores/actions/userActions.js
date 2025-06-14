import { TOAST } from "@common/constants";
import { ToastCommon } from "@components/ToastCommon";
import axiosInstance from "@config/axios-config";
import { SET_LIST_USER, SET_USER_INFO } from "@stores/constants";
import { hideLoading, showLoading } from "@stores/actions/appAction";
import { logout } from "@stores/actions/authActions";

export const getListUser = () => {
    return async (dispatch, getState) => {
        try {
            dispatch(showLoading());
            const resp = await axiosInstance.get(import.meta.env.VITE_BASE_URL + "/user");

            if (resp) {
                dispatch({
                    type: SET_LIST_USER,
                    payload: resp.data,
                });

                const userByEmail = resp.data.find(
                    (user) => user.email === getState().authStore.userInfo.email,
                );

                dispatch({
                    type: SET_USER_INFO,
                    payload: userByEmail,
                });

                dispatch(hideLoading());
            }
        } catch (error) {
            console.log(error.response?.data?.message);
            dispatch(hideLoading());
        }
    };
};

export const createUser = (params) => {
    return async (dispatch, getState) => {
        try {
            const resp = await axiosInstance.post(import.meta.env.VITE_BASE_URL + "/user", params);
            if (resp) {
                document.getElementById("close-create-user-btn").click();
                ToastCommon(TOAST.SUCCESS, "Tạo người dùng thành công");
                dispatch(getListUser());
            }
        } catch (error) {
            ToastCommon(TOAST.ERROR, error.response?.data?.message || error.message);
        }
    };
};

export const deleteUser = (params) => {
    return async (dispatch, getState) => {
        try {
            const resp = await axiosInstance.delete(import.meta.env.VITE_BASE_URL + "/user", {
                data: params,
            });
            if (resp) {
                dispatch(getListUser());
                ToastCommon(TOAST.SUCCESS, "Xóa người dùng thành công");
            }
        } catch (error) {
            ToastCommon(TOAST.ERROR, error.response?.data?.message || error.message);
        }
    };
};

export const updateUser = (params) => {
    return async (dispatch, getState) => {
        try {
            const res = await axiosInstance.put(import.meta.env.VITE_BASE_URL + "/user", params);

            if (res) {
                document.getElementById("close-edit-user-btn").click();
                ToastCommon(TOAST.SUCCESS, "Cập nhật người dùng thành công");
                dispatch(getListUser());
            }
        } catch (error) {
            ToastCommon(TOAST.ERROR, error.response?.data?.message || error.message);
        }
    };
};

export const updateUserByUser = (params) => {
    return async (dispatch, getState) => {
        try {
            let request = {
                email: params.email,
                name: params.name,
                phone: params.phone,
                birthday: params.birthday,
            };

            if (params.password && params.password.length > 0) {
                request = {
                    ...request,
                    password: params.password,
                };
            }

            let success = false;

            const resUser = await axiosInstance.put(import.meta.env.VITE_BASE_URL + "/user", request);
            if (resUser.status === 200) {
                success = true;
            }

            if (success) {
                ToastCommon(TOAST.SUCCESS, "Cập nhật thông tin thành công");
                dispatch(getListUser());
            }
        } catch (error) {
            ToastCommon(TOAST.ERROR, error.response?.data?.message || error.message);
        }
    };
};

export const changeRole = (params, navigate) => {
    return async (dispatch, getState) => {
        try {
            const resp = await axiosInstance.put(import.meta.env.VITE_BASE_URL + "/user/changerole", {
                email: params.email,
                role: params.role,
            });

            if (resp) {
                ToastCommon(TOAST.SUCCESS, "Đã thay đổi quyền thành công.");
                dispatch(getListUser());
                if (getState().authStore.userInfo.email === params.email) {
                    dispatch(logout());
                    navigate();
                }
            }
        } catch (error) {
            ToastCommon(TOAST.ERROR, error.response?.data?.message || error.message);
        }
    };
};
