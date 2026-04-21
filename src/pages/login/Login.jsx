import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { login } from "@stores/actions/authActions";
import { ROUTES } from "@common/constants";
import { INVALID_EMAIL, REQUIRE_EMAIL, REQUIRE_PASSWORD } from "@common/messageError";

// eslint-disable-next-line react/prop-types
const Login = ({ onSwitchTab }) => {
    const email = useRef(null);
    const password = useRef(null);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [errors, setErrors] = useState({});

    const focusField = (fieldRef) => {
        fieldRef.current?.focus();
        fieldRef.current?.select?.();
    };

    const validateForm = () => {
        const emailValue = String(email.current?.value || "").trim();
        const passwordValue = String(password.current?.value || "");
        const nextErrors = {};

        if (!emailValue) {
            nextErrors.email = REQUIRE_EMAIL;
            setErrors(nextErrors);
            focusField(email);
            return false;
        }

        if (!/^\S+@\S+\.\S+$/.test(emailValue)) {
            nextErrors.email = INVALID_EMAIL;
            setErrors(nextErrors);
            focusField(email);
            return false;
        }

        if (!passwordValue) {
            nextErrors.password = REQUIRE_PASSWORD;
            setErrors(nextErrors);
            focusField(password);
            return false;
        }

        setErrors({});
        return true;
    };

    const handleKeyPress = (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            if (event.target.name === "email") {
                password.current.focus(); // Chuyển focus sang ô password khi nhấn Enter ở ô email
            } else {
                handleLogin(); // Gọi hàm login khi nhấn Enter ở ô password
            }
        }
    };

    const handleLogin = async (event) => {
        event?.preventDefault?.();

        if (!validateForm()) {
            return;
        }

        try {
            await dispatch(
                login(
                    {
                        email: String(email.current.value || "").trim(),
                        password: String(password.current.value || ""),
                    },
                    () => navigate(ROUTES.map), // Điều hướng sau khi login thành công
                ),
            );
        } catch (error) {
            const statusCode = error?.response?.status;
            const backendMessage = error?.response?.data?.message || "Đăng nhập không thành công.";

            // Handle 404 - Email not found
            if (statusCode === 404) {
                setErrors({
                    email: "Email chưa được đăng kí",
                });
                focusField(email);
                return;
            }

            setErrors((prev) => ({
                ...prev,
                form: backendMessage,
            }));

            if (backendMessage.toLowerCase().includes("email")) {
                focusField(email);
            } else if (backendMessage.toLowerCase().includes("mật khẩu") || backendMessage.toLowerCase().includes("password")) {
                focusField(password);
            }
        }
    };

    return (
        <>
            <div className="login">
                <form onSubmit={handleLogin}>
                    <input
                        className={`inputLogin ${errors.email ? "inputLoginError" : ""}`}
                        type="email"
                        name="email"
                        placeholder="Email"
                        ref={email}
                        onChange={() =>
                            setErrors((prev) => ({
                                ...prev,
                                email: "",
                                form: "",
                            }))
                        }
                        onKeyDown={handleKeyPress}
                        aria-invalid={Boolean(errors.email)}
                    />
                    {errors.email && <div className="field-error">* {errors.email}</div>}
                    <input
                        className={`inputLogin ${errors.password ? "inputLoginError" : ""}`}
                        type="password"
                        name="pswd"
                        placeholder="Mật khẩu"
                        ref={password}
                        onChange={() =>
                            setErrors((prev) => ({
                                ...prev,
                                password: "",
                                form: "",
                            }))
                        }
                        onKeyDown={handleKeyPress}
                        aria-invalid={Boolean(errors.password)}
                    />
                    {errors.password && <div className="field-error">* {errors.password}</div>}
                    {errors.form && <div className="field-error form-error">* {errors.form}</div>}
                    <button type="submit" className="btnLogin btnLoginSubmit">
                        Đăng nhập
                    </button>
                    <button
                        type="button"
                        className="register-text mt-3"
                        onClick={() => navigate(ROUTES.forgotPassword)}
                    >
                        Quên mật khẩu?{" "}
                        <span>
                            Đặt lại mật khẩu
                        </span>
                    </button>
                </form>
                <button type="button" className="register-text" onClick={() => onSwitchTab?.(true)}>
                    Chưa có tài khoản?
                    <span>
                        Đăng ký ngay <i className="fas fa-arrow-right ms-1"></i>
                    </span>
                </button>
                <button type="button" className="register-text" onClick={() => navigate(ROUTES.home)}>
                    Truy cập không cần tài khoản
                </button>
            </div>
        </>
    );
};

export default Login;
