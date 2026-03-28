import { useDispatch, useSelector } from "react-redux";
import Login from "@pages/login/Login";
import SignUp from "@pages/login/SignUp";
import { SET_SHOW_SIGNUP } from "@stores/constants";
import logo from "@assets/logo.png";
import backgroundImage from "@assets/backgroundLogin.jpg";
import { NavLink } from "react-router-dom";
import { ROUTES } from "@common/constants";

function WrapperLogin() {
    const { isShowSignUp } = useSelector((state) => state.appStore);
    const dispatch = useDispatch();

    const handleShowSignUp = (showSignUp) => {
        dispatch({
            type: SET_SHOW_SIGNUP,
            payload: showSignUp,
        });
    };

    return (
        <div
            className="containerLogin"
            style={{
                background: `url(${backgroundImage}) no-repeat center center/cover`,
            }}
        >
            <div className="mainLogin">
                <NavLink to={ROUTES.home}>
                    <div className="logoContainer">
                        <img src={logo} alt="Logo" className="logoImage" />
                    </div>
                </NavLink>
                <div className="line"></div>
                <div className="authTabs" role="tablist" aria-label="Xác thực tài khoản">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={!isShowSignUp}
                        className={`authTab ${!isShowSignUp ? "active" : ""}`}
                        onClick={() => handleShowSignUp(false)}
                    >
                        Đăng nhập
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={isShowSignUp}
                        className={`authTab ${isShowSignUp ? "active" : ""}`}
                        onClick={() => handleShowSignUp(true)}
                    >
                        Đăng ký
                    </button>
                </div>

                <div className="authPanel">
                    {!isShowSignUp ? (
                        <Login onSwitchTab={handleShowSignUp} />
                    ) : (
                        <SignUp onSwitchTab={handleShowSignUp} />
                    )}
                </div>
            </div>
        </div>
    );
}

export default WrapperLogin;
