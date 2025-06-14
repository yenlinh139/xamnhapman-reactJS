import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaUser, FaEnvelope, FaCalendar, FaPhone, FaLock, FaKey, FaSave, FaTimes } from "react-icons/fa";
import { REQUIRE_PASSWORD } from "@common/messageError";
import { UPDATE } from "@common/messageConfirm";
import { updateUserByUser } from "@stores/actions/userActions";
import ModalConfirm from "@components/ModalConfirm";
import { Helmet } from "react-helmet-async";
import Header from "@pages/themes/headers/Header";

function SettingUser() {
    const dispatch = useDispatch();
    const { userInfo } = useSelector((state) => state.authStore);

    const formatDateForDB = (dateString) => {
        if (!dateString) return null; // Tránh gửi undefined
        const parts = dateString.split("/");
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`; // Chuyển từ DD/MM/YYYY → YYYY-MM-DD
        }
        return dateString; // Nếu đã đúng format thì giữ nguyên
    };

    const [formState, setFormState] = useState({
        name: userInfo?.name || "",
        email: userInfo?.email || "",
        password: "",
        confirmPassword: "",
        phone: userInfo?.phone || "",
    });

    const [toggleUpdatePassword, setToggleUpdatePassword] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [errorMessages, setErrorMessages] = useState({});
    const [updatedFormState, setUpdatedFormState] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormState((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = () => {
        const errors = {};

        if (toggleUpdatePassword) {
            if (!formState.password) {
                errors.password = REQUIRE_PASSWORD;
            } else if (formState.password !== formState.confirmPassword) {
                errors.confirmPassword = "Mật khẩu không khớp";
            }
        }

        // Kiểm tra số điện thoại hợp lệ
        if (formState.phone && !/^\d{10,11}$/.test(formState.phone)) {
            errors.phone = "Số điện thoại không hợp lệ";
        }

        if (Object.keys(errors).length > 0) {
            setErrorMessages(errors);
            return;
        }

        setUpdatedFormState(updatedData);
        setShowConfirmModal(true);
    };

    const confirmAction = () => {
        dispatch(updateUserByUser(updatedFormState));
        setShowConfirmModal(false);
    };

    return (
        <>
            <Helmet>
                <title>Cài đặt | Xâm nhập mặn Tp. Hồ Chí Minh</title>
            </Helmet>
            <Header />
            <div className="infoUser">
                <div className="settings-container">
                    <div className="settings-header">
                        <h1>Cài đặt tài khoản</h1>
                        <p>Cập nhật thông tin cá nhân của bạn</p>
                    </div>

                    <div className="profile-section">
                        <form
                            className="settings-form"
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSubmit();
                            }}
                        >
                            <div className="form-sections">
                                <div className="inputGroup">
                                    <label htmlFor="name">Họ và tên</label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={formState.name}
                                        onChange={handleChange}
                                        placeholder="Nhập họ và tên của bạn"
                                    />
                                    <FaUser className="input-icon" />
                                </div>

                                <div className="inputGroup">
                                    <label htmlFor="email">Email</label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formState.email}
                                        onChange={handleChange}
                                        disabled
                                        placeholder="Nhập email của bạn"
                                    />
                                    <FaEnvelope className="input-icon" />
                                </div>

                                <div className="inputGroup">
                                    <label htmlFor="phone">Số điện thoại</label>
                                    <input
                                        type="tel"
                                        id="phone"
                                        name="phone"
                                        value={formState.phone}
                                        onChange={handleChange}
                                        placeholder="Nhập số điện thoại của bạn"
                                    />
                                    <FaPhone className="input-icon" />
                                    {errorMessages.phone && (
                                        <span className="error">{errorMessages.phone}</span>
                                    )}
                                </div>
                            </div>

                            <div className="password-toggle">
                                <input
                                    type="checkbox"
                                    id="togglePassword"
                                    checked={toggleUpdatePassword}
                                    onChange={(e) => setToggleUpdatePassword(e.target.checked)}
                                />
                                <label htmlFor="togglePassword">Đổi mật khẩu</label>
                            </div>

                            {toggleUpdatePassword && (
                                <div className="form-sections">
                                    <div className="inputGroup">
                                        <label htmlFor="password">Mật khẩu mới</label>
                                        <input
                                            type="password"
                                            id="password"
                                            name="password"
                                            value={formState.password}
                                            onChange={handleChange}
                                            placeholder="Nhập mật khẩu mới"
                                        />
                                        <FaKey className="input-icon" />
                                        {errorMessages.password && (
                                            <span className="error">{errorMessages.password}</span>
                                        )}
                                    </div>

                                    <div className="inputGroup">
                                        <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
                                        <input
                                            type="password"
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            value={formState.confirmPassword}
                                            onChange={handleChange}
                                            placeholder="Xác nhận mật khẩu mới"
                                        />
                                        <FaLock className="input-icon" />
                                        {errorMessages.confirmPassword && (
                                            <span className="error">{errorMessages.confirmPassword}</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="cancel-button"
                                    onClick={() =>
                                        setFormState({
                                            ...userInfo,
                                            password: "",
                                            confirmPassword: "",
                                        })
                                    }
                                >
                                    <FaTimes />
                                    Hủy
                                </button>
                                <button type="submit" className="save-button">
                                    <FaSave />
                                    Lưu thay đổi
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {showConfirmModal && (
                    <ModalConfirm
                        message={UPDATE.user}
                        onConfirm={confirmAction}
                        onCancel={() => setShowConfirmModal(false)}
                    />
                )}
            </div>
        </>
    );
}

export default SettingUser;
