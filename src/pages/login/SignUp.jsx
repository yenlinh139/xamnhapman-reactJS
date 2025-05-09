import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { signUp } from "../../stores/actions/authActions";
import { ToastCommon } from "../../components/ToastCommon";
import { TOAST } from "../../common/constants";

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
        })
      );

      // Sau khi đăng ký thành công, gửi email xác minh
      await dispatch(sendVerificationEmail(email.current.value));

      ToastCommon(
        TOAST.SUCCESS,
        "Successfully registered! Please check your email to verify your account."
      );
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message ||
          "An error occurred during registration."
      );
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
          placeholder="Name"
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
          placeholder="Password"
          ref={password}
          onKeyDown={(e) => handleKeyPress(e, confirmPassword)}
        />
        <input
          className="inputLogin"
          type="password"
          name="pswd"
          placeholder="Confirm Password"
          ref={confirmPassword}
          onKeyDown={(e) => handleKeyPress(e, null)}
        />
        <button
          type="button"
          className="btnLogin btnLoginSubmit"
          onClick={() => handleSignUp()}
        >
          Sign up
        </button>
      </form>
    </div>
  );
}

export default SignUp;
