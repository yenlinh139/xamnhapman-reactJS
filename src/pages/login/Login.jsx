import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { login } from "@stores/actions/authActions";
import { ROUTES } from "@common/constants";

const Login = () => {
    const email = useRef(null);
    const password = useRef(null);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    // State để lưu thông báo lỗi
    const [errorMessage, setErrorMessage] = useState("");

    const handleToggleAuth = () => {
        document.getElementById("chk").checked = true;
    };

    const handleKeyPress = (event) => {
        if (event.key === "Enter") {
            if (event.target.name === "email") {
                password.current.focus(); // Chuyển focus sang ô password khi nhấn Enter ở ô email
            } else {
                handleLogin(); // Gọi hàm login khi nhấn Enter ở ô password
            }
        }
    };

    const handleLogin = async () => {
        setErrorMessage("");
        try {
            await dispatch(
                login(
                    {
                        email: email.current.value,
                        password: password.current.value,
                    },
                    () => navigate(ROUTES.map), // Điều hướng sau khi login thành công
                ),
            );
        } catch (error) {
            // Nếu có lỗi, hiển thị thông báo lỗi
            if (error?.response?.data?.message) {
                setErrorMessage(error.response.data.message); // Hiển thị thông báo lỗi
            }
        }
    };

    return (
        <>
            <div className="login">
                <form onSubmit={(e) => e.preventDefault()}>
                    <label className="labelLogin" htmlFor="chk" aria-hidden="true">
                        Đăng nhập
                    </label>
                    <input
                        className="inputLogin"
                        type="email"
                        name="email"
                        placeholder="Email"
                        ref={email}
                        onKeyDown={handleKeyPress}
                    />
                    <input
                        className="inputLogin"
                        type="password"
                        name="pswd"
                        placeholder="Password"
                        ref={password}
                        onKeyDown={handleKeyPress}
                    />
                    {errorMessage && <div className="error-message">{errorMessage}</div>}
                    <button type="button" className="btnLogin btnLoginSubmit" onClick={() => handleLogin()}>
                        Login
                    </button>
                </form>
                <div className="line mt-5"></div>

                <p className="register-text" onClick={handleToggleAuth}>
                    Chưa có tài khoản?
                    <span>
                        Đăng ký ngay <i className="fas fa-arrow-down ms-1"></i>
                    </span>
                </p>
            </div>
        </>
    );
};

export default Login;
