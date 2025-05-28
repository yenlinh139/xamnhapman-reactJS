import { useDispatch, useSelector } from "react-redux";
import Login from "@pages/login/Login";
import SignUp from "@pages/login/SignUp";
import { SET_SHOW_SIGNUP } from "@stores/constants";
import logo from "@assets/logo.png";
import backgroundImage from "@assets/backgroundLogin.jpg";
import { NavLink } from "react-router-dom";
import { ROUTES } from "@common/constants";

function WrapperLogin() {
    // const []
    const { isShowSignUp } = useSelector((state) => state.appStore);
    const dispatch = useDispatch();

    const handleShowSignUp = () => {
        dispatch({
            type: SET_SHOW_SIGNUP,
            payload: !isShowSignUp,
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
                <input
                    className="inputLogin"
                    type="checkbox"
                    id="chk"
                    aria-hidden="true"
                    checked={isShowSignUp}
                    onChange={handleShowSignUp}
                />
                <Login />

                <SignUp />
            </div>
        </div>
    );
}

export default WrapperLogin;
