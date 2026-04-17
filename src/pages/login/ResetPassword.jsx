import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import logo from "@assets/logo.png";
import backgroundImage from "@assets/backgroundLogin.jpg";
import { ROUTES } from "@common/constants";
import { PASSWORD_NOT_MATCH, REQUIRE_PASSWORD } from "@common/messageError";
import { resetPassword } from "@stores/actions/authActions";

const ResetPassword = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { token } = useParams();
    const password = useRef(null);
    const confirmPassword = useRef(null);
    const [errors, setErrors] = useState({});

    const focusField = (fieldRef) => {
        fieldRef.current?.focus();
        fieldRef.current?.select?.();
    };

    const validateForm = () => {
        const passwordValue = String(password.current?.value || "");
        const confirmPasswordValue = String(confirmPassword.current?.value || "");

        if (!token) {
            setErrors({ form: "Token đặt lại mật khẩu không hợp lệ." });
            return false;
        }

        if (!passwordValue) {
            setErrors({ password: REQUIRE_PASSWORD });
            focusField(password);
            return false;
        }

        if (passwordValue.length < 6) {
            setErrors({ password: "Mật khẩu phải có ít nhất 6 ký tự." });
            focusField(password);
            return false;
        }

        if (!confirmPasswordValue) {
            setErrors({ confirmPassword: "Vui lòng xác nhận mật khẩu." });
            focusField(confirmPassword);
            return false;
        }

        if (passwordValue !== confirmPasswordValue) {
            setErrors({ confirmPassword: PASSWORD_NOT_MATCH });
            focusField(confirmPassword);
            return false;
        }

        setErrors({});
        return true;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!validateForm()) return;

        await dispatch(
            resetPassword({
                token,
                password: String(password.current.value || ""),
                onSuccess: () => navigate(ROUTES.login),
            }),
        );
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
                    <div className="labelLogin">Đặt lại mật khẩu</div>
                    <form onSubmit={handleSubmit}>
                        <input
                            className={`inputLogin ${errors.password ? "inputLoginError" : ""}`}
                            type="password"
                            name="password"
                            placeholder="Mật khẩu mới"
                            ref={password}
                            onChange={() =>
                                setErrors((prev) => ({
                                    ...prev,
                                    password: "",
                                    form: "",
                                }))
                            }
                            aria-invalid={Boolean(errors.password)}
                        />
                        {errors.password && <div className="field-error">* {errors.password}</div>}
                        <input
                            className={`inputLogin ${errors.confirmPassword ? "inputLoginError" : ""}`}
                            type="password"
                            name="confirmPassword"
                            placeholder="Xác nhận mật khẩu"
                            ref={confirmPassword}
                            onChange={() =>
                                setErrors((prev) => ({
                                    ...prev,
                                    confirmPassword: "",
                                    form: "",
                                }))
                            }
                            aria-invalid={Boolean(errors.confirmPassword)}
                        />
                        {errors.confirmPassword && (
                            <div className="field-error">* {errors.confirmPassword}</div>
                        )}
                        {errors.form && <div className="field-error form-error">* {errors.form}</div>}
                        <button type="submit" className="btnLogin btnLoginSubmit">
                            Đặt lại mật khẩu
                        </button>
                    </form>
                    <button
                        type="button"
                        className="register-text"
                        onClick={() => navigate(ROUTES.login)}
                    >
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

export default ResetPassword;