import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { signUp } from "@stores/actions/authActions";

// eslint-disable-next-line react/prop-types
function SignUp({ onSwitchTab }) {
    const dispatch = useDispatch();
    const [errorMessage, setErrorMessage] = useState("");
    const email = useRef(null);
    const password = useRef(null);
    const confirmPassword = useRef(null);
    const name = useRef(null);

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

    const handleSignUp = async () => {
        try {
            await dispatch(
                signUp({
                    name: name.current.value,
                    email: email.current.value,
                    password: password.current.value,
                    confirmPassword: confirmPassword.current.value,
                }),
            );
            onSwitchTab?.(false);
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || "Đã xảy ra lỗi trong quá trình đăng ký.");
        }
    };

    return (
        <div className="signUp">
            <form onSubmit={(e) => e.preventDefault()}>
                <label className="labelLogin" aria-hidden="true">
                    Đăng ký
                </label>
                <input
                    className="inputLogin"
                    type="text"
                    name="name"
                    placeholder="Họ và tên"
                    ref={name}
                    onKeyDown={(e) => handleKeyPress(e, email)}
                />
                <input
                    className="inputLogin"
                    type="email"
                    name="email"
                    placeholder="Email"
                    ref={email}
                    onKeyDown={(e) => handleKeyPress(e, password)}
                />
                <input
                    className="inputLogin"
                    type="password"
                    name="pswd"
                    placeholder="Mật khẩu"
                    ref={password}
                    onKeyDown={(e) => handleKeyPress(e, confirmPassword)}
                />
                <input
                    className="inputLogin"
                    type="password"
                    name="pswd"
                    placeholder="Xác nhận mật khẩu"
                    ref={confirmPassword}
                    onKeyDown={(e) => handleKeyPress(e, null)}
                />
                {errorMessage && <div className="error-message">{errorMessage}</div>}
                <button type="button" className="btnLogin btnLoginSubmit" onClick={() => handleSignUp()}>
                    Đăng ký
                </button>
                <button type="button" className="register-text" onClick={() => onSwitchTab?.(false)}>
                    Đã có tài khoản?
                    <span>
                        Đăng nhập <i className="fas fa-arrow-right ms-1"></i>
                    </span>
                </button>
            </form>
        </div>
    );
}

export default SignUp;
