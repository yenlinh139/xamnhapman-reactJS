import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { signUp } from "@stores/actions/authActions";
import { ToastCommon } from "@components/ToastCommon";
import { TOAST } from "@common/constants";

// eslint-disable-next-line react/prop-types
function SignUp() {
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
            // Gọi action đăng ký
            await dispatch(
                signUp({
                    name: name.current.value,
                    email: email.current.value,
                    password: password.current.value,
                    confirmPassword: confirmPassword.current.value,
                }),
            );

            // Sau khi đăng ký thành công, gửi email xác minh
            await dispatch(sendVerificationEmail(email.current.value));

            ToastCommon(
                TOAST.SUCCESS,
                "Đăng ký thành công! Vui lòng kiểm tra email để xác minh tài khoản của bạn.",
            );
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || "Đã xảy ra lỗi trong quá trình đăng ký.");
        }
    };

    return (
        <div className="signUp">
            <form onSubmit={(e) => e.preventDefault()}>
                <label className="labelLogin" htmlFor="chk" aria-hidden="true">
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
                <button type="button" className="btnLogin btnLoginSubmit" onClick={() => handleSignUp()}>
                    Đăng ký
                </button>
            </form>
        </div>
    );
}

export default SignUp;
