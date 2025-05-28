import React, { useState } from "react";
import imageLogo from "@assets/logo.png";
import { NavLink } from "react-router-dom";
import { ROUTES } from "@common/constants";

function Header() {
    const [query, setQuery] = useState("");

    const onSearch = (searchQuery) => {
        if (searchQuery.trim()) {
            console.log("Tìm kiếm:", searchQuery);
        }
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
                            <li>
                                <NavLink to="/" activeClassName="active">
                                    TRANG CHỦ
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to={ROUTES.about}>GIỚI THIỆU</NavLink>
                            </li>
                            <li>
                                <NavLink to={ROUTES.map}>BẢN ĐỒ</NavLink>
                            </li>
                            <li>
                                <NavLink to={ROUTES.feedback}>GÓP Ý</NavLink>
                            </li>
                            <li>
                                <NavLink to={ROUTES.users}>NGƯỜI DÙNG</NavLink>
                            </li>
                        </ul>
                    </nav>

                    {/* Tìm kiếm + Button Ứng Dụng Mobile */}
                    <div className="header-right d-flex align-items-center">
                        <div className="searchHome">
                            <input
                                type="text"
                                placeholder="Tìm kiếm..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                            <button onClick={() => onSearch(query)}>
                                <i className="fa-solid fa-magnifying-glass"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
}

export default Header;
