import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaUser, FaEnvelope, FaLock, FaKey, FaSave, FaTimes } from "react-icons/fa";
import { updateUserByUser } from "@stores/actions/userActions";

function SettingUser({ isOpen, onClose }) {
    const dispatch = useDispatch();
    const { userInfo } = useSelector((state) => state.authStore);

    const getInitialState = () => ({
        name: userInfo?.name || "",
        email: userInfo?.email || "",
        password: "",
        confirmPassword: "",
    });

    const [formState, setFormState] = useState(getInitialState);

    const [toggleUpdatePassword, setToggleUpdatePassword] = useState(false);
    const [errorMessages, setErrorMessages] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const resetForm = () => {
        setFormState(getInitialState());
        setToggleUpdatePassword(false);
        setErrorMessages({});
    };

    const handleClose = () => {
        resetForm();
        onClose?.();
    };

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        resetForm();
        document.body.classList.add("setting-modal-open");

        return () => {
            document.body.classList.remove("setting-modal-open");
        };
    }, [isOpen, userInfo]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormState((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async () => {
        const errors = {};

        if (!formState.name.trim()) {
            errors.name = "Vui lòng nhập thông tin";
        }

        if (toggleUpdatePassword) {
            if (!formState.password.trim()) {
                errors.password = "Vui lòng nhập thông tin";
            }

            if (!formState.confirmPassword.trim()) {
                errors.confirmPassword = "Vui lòng nhập thông tin";
            } else if (formState.password !== formState.confirmPassword) {
                errors.confirmPassword = "Mật khẩu xác nhận chưa trùng khớp với mật khẩu đã nhập";
            }
        }

        if (Object.keys(errors).length > 0) {
            setErrorMessages(errors);
            return;
        }

        setErrorMessages({});
        setIsSubmitting(true);

        const updatedData = {
            email: userInfo?.email || formState.email,
            name: formState.name.trim(),
            phone: userInfo?.phone || "",
            birthday: userInfo?.birthday || null,
            password: toggleUpdatePassword ? formState.password : "",
        };

        try {
            const success = await dispatch(updateUserByUser(updatedData));

            if (success) {
                handleClose();
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="setting-modal-overlay" onClick={handleClose}>
            <div className="infoUser setting-modal" onClick={(e) => e.stopPropagation()}>
                <div className="settings-container settings-modal-container">
                    <button
                        type="button"
                        className="setting-modal-close"
                        onClick={handleClose}
                        aria-label="Đóng form cài đặt"
                    >
                        <FaTimes />
                    </button>

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
                                        className={errorMessages.name ? "input-error" : ""}
                                        placeholder="Nhập họ và tên của bạn"
                                    />
                                    <FaUser className="input-icon" />
                                    {errorMessages.name && <span className="error">{errorMessages.name}</span>}
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
                                            className={errorMessages.password ? "input-error" : ""}
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
                                            className={errorMessages.confirmPassword ? "input-error" : ""}
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
                                    onClick={handleClose}
                                >
                                    <FaTimes />
                                    Hủy
                                </button>
                                <button type="submit" className="save-button" disabled={isSubmitting}>
                                    <FaSave />
                                    Lưu thay đổi
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SettingUser;
