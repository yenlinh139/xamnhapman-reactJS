import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import imageLogo from "@assets/logo.png";
import { NavLink, useNavigate } from "react-router-dom";
import { ROUTES } from "@common/constants";
import { logout } from "@stores/actions/authActions";

function Header() {
    const [query, setQuery] = useState("");
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { userInfo } = useSelector((state) => state.authStore);

    const onSearch = (searchQuery) => {
        if (searchQuery.trim()) {
            console.log("Tìm kiếm:", searchQuery);
        }
    };

    // Kiểm tra xem user có quyền truy cập các tab không (role !== 0)
    const hasAccess = userInfo && userInfo.role !== 0;

    // Kiểm tra xem user đã đăng nhập chưa
    const isLoggedIn = localStorage.getItem("access_token");

    // Xử lý đăng xuất
    const handleLogout = () => {
        dispatch(logout());
        navigate(ROUTES.home);
    };

    return (
        <>
            <div className="top-home">
                <div className="container d-flex justify-content-between align-items-center">
                    {/* Thông tin liên hệ */}
                    <div className="contact-info">
                        <a href="tel:+84395245029">
                            <i className="fa-solid fa-phone"></i>
                            <span>+84 395 245 029</span>
                        </a>
                        <span> | </span>
                        <a href="mailto:21166139@st.hcmuaf.edu.vn">
                            <i className="fa-solid fa-envelope"></i>
                            <span>21166139@st.hcmuaf.edu.vn</span>
                        </a>
                    </div>
                    {/* Mạng xã hội */}
                    <ul className="icon-group list-unstyled m-0">
                        <li>
                            <a href="https://www.facebook.com/YenLinh.lhlb/">
                                <i className="fa-brands fa-facebook-f"></i>
                            </a>
                        </li>
                        <li>
                            <a href="https://www.youtube.com">
                                <i className="fa-brands fa-youtube"></i>
                            </a>
                        </li>
                        <li>
                            <a href="https://twitter.com">
                                <i className="fa-brands fa-twitter"></i>
                            </a>
                        </li>
                        <li>
                            <a href="https://www.instagram.com">
                                <i className="fa-brands fa-instagram"></i>
                            </a>
                        </li>
                        <li>
                            <a href="https://www.google.com">
                                <i className="fa-brands fa-google"></i>
                            </a>
                        </li>
                        <li className="login-menu">
                            <NavLink
                                to={localStorage.getItem("access_token") ? ROUTES.setting : ROUTES.login}
                                className="login-link"
                            >
                                <i className="fa-solid fa-user"></i>
                                <span>Tài khoản</span>
                            </NavLink>
                        </li>
                    </ul>
                </div>
            </div>
            <header className="headerMenu">
                <div className="container d-flex align-items-center justify-content-between">
                    {/* Logo */}
                    <div className="logo">
                        <NavLink to="/">
                            <img src={imageLogo} alt="Xâm nhập mặn TP. Hồ Chí Minh" />
                        </NavLink>
                    </div>

                    {/* Menu */}
                    <nav className="nav-menu">
                        <ul className="d-flex list-unstyled m-0">
                            <li className="text-center">
                                <NavLink to="/" activeClassName="active">
                                    TRANG CHỦ
                                </NavLink>
                            </li>
                            {hasAccess && (
                                <>
                                    <li className="text-center">
                                        <NavLink to={ROUTES.map}>BẢN ĐỒ</NavLink>
                                    </li>
                                    <li className="text-center">
                                        <NavLink to={ROUTES.salinity}>ĐỘ MẶN</NavLink>
                                    </li>
                                    <li className="text-center">
                                        <NavLink to={ROUTES.feedback}>GÓP Ý</NavLink>
                                    </li>
                                    <li className="text-center">
                                        <NavLink to={ROUTES.users}>NGƯỜI DÙNG</NavLink>
                                    </li>
                                </>
                            )}
                            {isLoggedIn && (
                                <li className="text-center">
                                    <button onClick={handleLogout} className="nav-logout-btn">
                                        ĐĂNG XUẤT
                                    </button>
                                </li>
                            )}
                        </ul>
                    </nav>
                </div>
            </header>
        </>
    );
}

export default Header;
