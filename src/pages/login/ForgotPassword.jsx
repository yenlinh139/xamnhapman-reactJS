import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { NavLink, useNavigate } from "react-router-dom";
import logo from "@assets/logo.png";
import backgroundImage from "@assets/backgroundLogin.jpg";
import { ROUTES } from "@common/constants";
import { INVALID_EMAIL, REQUIRE_EMAIL } from "@common/messageError";
import { forgotPassword } from "@stores/actions/authActions";

const ForgotPassword = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const email = useRef(null);
    const [errors, setErrors] = useState({});

    const focusField = (fieldRef) => {
        fieldRef.current?.focus();
        fieldRef.current?.select?.();
    };

    const validateForm = () => {
        const emailValue = String(email.current?.value || "").trim();
        if (!emailValue) {
            setErrors({ email: REQUIRE_EMAIL });
            focusField(email);
            return false;
        }

        if (!/^\S+@\S+\.\S+$/.test(emailValue)) {
            setErrors({ email: INVALID_EMAIL });
            focusField(email);
            return false;
        }

        setErrors({});
        return true;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!validateForm()) return;

        try {
            await dispatch(
                forgotPassword({
                    email: String(email.current.value || "").trim(),
                }),
            );
        } catch (error) {
            const statusCode = error?.response?.status;
            const backendMessage = error?.response?.data?.message || "Không thể gửi email.";

            // Handle 404 - Email not found
            if (statusCode === 404) {
                setErrors({
                    email: "Email chưa được đăng kí",
                });
                focusField(email);
                return;
            }

            setErrors({
                email: backendMessage,
            });
            focusField(email);
        }
    };

    return (
        <div
            className="containerLogin"
            style={{ background: `url(${backgroundImage}) no-repeat center center/cover` }}
        >
            <div className="mainLogin">
                <NavLink to={ROUTES.home}>
                    <div className="logoContainer">
                        <img src={logo} alt="Logo" className="logoImage" />
                    </div>
                </NavLink>
                <div className="line"></div>
                <div className="authPanel">
                    <div className="labelLogin">Quên mật khẩu</div>
                    <form onSubmit={handleSubmit}>
                        <input
                            className={`inputLogin ${errors.email ? "inputLoginError" : ""}`}
                            type="email"
                            name="email"
                            placeholder="Email"
                            ref={email}
                            onChange={() => setErrors((prev) => ({ ...prev, email: "" }))}
                            aria-invalid={Boolean(errors.email)}
                        />
                        {errors.email && <div className="field-error">* {errors.email}</div>}
                        <button type="submit" className="btnLogin btnLoginSubmit">
                            Đặt lại mật khẩu
                        </button>
                    </form>
                    <button type="button" className="register-text mt-3" onClick={() => navigate(ROUTES.login)}>
                        Quay lại
                        <span>
                            Đăng nhập <i className="fas fa-arrow-right ms-1"></i>
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;