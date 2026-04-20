import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { signUp } from "@stores/actions/authActions";

// eslint-disable-next-line react/prop-types
function SignUp({ onSwitchTab }) {
    const dispatch = useDispatch();
    const [errors, setErrors] = useState({});
    const email = useRef(null);
    const password = useRef(null);
    const confirmPassword = useRef(null);
    const name = useRef(null);

    const focusField = (fieldRef) => {
        fieldRef.current?.focus();
        fieldRef.current?.select?.();
    };

    const validateForm = () => {
        const fullName = String(name.current?.value || "").trim();
        const emailValue = String(email.current?.value || "").trim();
        const passwordValue = String(password.current?.value || "");
        const confirmPasswordValue = String(confirmPassword.current?.value || "");
        const nextErrors = {};

        if (!fullName) {
            nextErrors.name = "Vui lòng nhập họ và tên.";
            setErrors(nextErrors);
            focusField(name);
            return false;
        }

        if (!emailValue) {
            nextErrors.email = "Vui lòng nhập email.";
            setErrors(nextErrors);
            focusField(email);
            return false;
        }

        if (!/^\S+@\S+\.\S+$/.test(emailValue)) {
            nextErrors.email = "Email chưa đúng định dạng.";
            setErrors(nextErrors);
            focusField(email);
            return false;
        }

        if (!passwordValue) {
            nextErrors.password = "Vui lòng nhập mật khẩu.";
            setErrors(nextErrors);
            focusField(password);
            return false;
        }

        if (passwordValue.length < 6) {
            nextErrors.password = "Mật khẩu phải có ít nhất 6 ký tự.";
            setErrors(nextErrors);
            focusField(password);
            return false;
        }

        if (!confirmPasswordValue) {
            nextErrors.confirmPassword = "Vui lòng xác nhận mật khẩu.";
            setErrors(nextErrors);
            focusField(confirmPassword);
            return false;
        }

        if (passwordValue !== confirmPasswordValue) {
            nextErrors.confirmPassword = "Mật khẩu xác nhận chưa trùng khớp với mật khẩu đã nhập";
            setErrors(nextErrors);
            focusField(confirmPassword);
            return false;
        }

        setErrors({});
        return true;
    };

    const handleKeyPress = (event, nextFieldRef) => {
        if (event.key === "Enter") {
            event.preventDefault(); // Ngăn chặn hành vi submit mặc định
            if (nextFieldRef) {
                nextFieldRef.current.focus(); // Di chuyển tiêu điểm đến trường tiếp theo
            } else {
                handleSignUp(); // Gọi hàm đăng ký nếu đã đến ô cuối
            }
        }
    };

    const handleSignUp = async (event) => {
        event?.preventDefault?.();

        if (!validateForm()) {
            return;
        }

        try {
            await dispatch(
                signUp({
                    name: String(name.current.value || "").trim(),
                    email: String(email.current.value || "").trim(),
                    password: String(password.current.value || ""),
                    confirmPassword: String(confirmPassword.current.value || ""),
                }),
            );
            onSwitchTab?.(false);
        } catch (error) {
            const backendMessage = error?.response?.data?.message || "Đã xảy ra lỗi trong quá trình đăng ký.";
            setErrors((prev) => ({
                ...prev,
                form: backendMessage,
            }));
            if (error?.response?.data?.message?.toLowerCase?.().includes("email")) {
                focusField(email);
            }
        }
    };

    return (
        <div className="signUp">
            <form onSubmit={handleSignUp}>
                <input
                    type="text"
                    name="name"
                    placeholder="Họ và tên"
                    ref={name}
                    onChange={() =>
                        setErrors((prev) => ({
                            ...prev,
                            name: "",
                            form: "",
                        }))
                    }
                    onKeyDown={(e) => handleKeyPress(e, email)}
                    aria-invalid={Boolean(errors.name)}
                    className={`inputLogin ${errors.name ? "inputLoginError" : ""}`}
                />
                {errors.name && <div className="field-error">* {errors.name}</div>}
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
                    onKeyDown={(e) => handleKeyPress(e, password)}
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
                    onKeyDown={(e) => handleKeyPress(e, confirmPassword)}
                    aria-invalid={Boolean(errors.password)}
                />
                {errors.password && <div className="field-error">* {errors.password}</div>}
                <input
                    className={`inputLogin ${errors.confirmPassword ? "inputLoginError" : ""}`}
                    type="password"
                    name="pswd"
                    placeholder="Xác nhận mật khẩu"
                    ref={confirmPassword}
                    onChange={() =>
                        setErrors((prev) => ({
                            ...prev,
                            confirmPassword: "",
                            form: "",
                        }))
                    }
                    onKeyDown={(e) => handleKeyPress(e, null)}
                    aria-invalid={Boolean(errors.confirmPassword)}
                />
                {errors.confirmPassword && <div className="field-error">* {errors.confirmPassword}</div>}
                {errors.form && <div className="field-error form-error">* {errors.form}</div>}
                <button type="submit" className="btnLogin btnLoginSubmit">
                    Đăng ký
                </button>
                <button type="button" className="register-text mt-3" onClick={() => onSwitchTab?.(false)}>
                    Đã có tài khoản?
                    <span>
                        Đăng nhập <i className="fas fa-arrow-right ms-1"></i>
                    </span>
                </button>
                <button type="button" className="register-text" onClick={() => navigate(ROUTES.map)}>
                    Truy cập không cần tài khoản
                </button>
            </form>
        </div>
    );
}

export default SignUp;
