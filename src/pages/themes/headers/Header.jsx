import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import imageLogo from "@assets/logo.png";
import { NavLink, useNavigate } from "react-router-dom";
import { ROUTES } from "@common/constants";
import { logout } from "@stores/actions/authActions";
import SettingUser from "@pages/setting/SettingUser";

function Header() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { userInfo } = useSelector((state) => state.authStore);
    const [isSettingModalOpen, setIsSettingModalOpen] = useState(false);
    const isLoggedIn = Boolean(localStorage.getItem("access_token"));
    const parsedRole = Number(userInfo?.role);
    const roleId = Number.isFinite(parsedRole) ? parsedRole : 0;
    const isGuest = roleId === 0;
    const isTechnician = roleId === 2;
    const isAdmin = roleId === 1;
    const canManageData = isTechnician || isAdmin;
    const canManageUsers = isAdmin;

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
                        <a
                            className="footer-contact"
                            href="https://maps.app.goo.gl/swSbkG8NGr2TL1pT9"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <i className="fa-solid fa-location-dot"></i>
                            <span>Trường Đại học Nông Lâm TPHCM</span>
                        </a>
                        <span> | </span>
                        <a href="tel:+84983613551">
                            <i className="fa-solid fa-phone"></i>
                            <span>+84 983 613 551</span>
                        </a>
                        <span> | </span>
                        <a href="mailto:nguyenduyliem@hcmuaf.edu.vn">
                            <i className="fa-solid fa-envelope"></i>
                            <span>nguyenduyliem@hcmuaf.edu.vn</span>
                        </a>
                        <span> | </span>
                        <a
                            className="footer-contact"
                            href="https://www.facebook.com/nguyenduyliem.gis"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <i className="fa-brands fa-facebook-f"></i>
                            <span>facebook.com/nguyenduyliem.gis</span>
                        </a>
                    </div>
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
                                <NavLink to={ROUTES.map}>BẢN ĐỒ</NavLink>
                            </li>
                            {!isLoggedIn ? (
                                <li className="text-center">
                                    <NavLink to={ROUTES.login}>ĐĂNG NHẬP</NavLink>
                                </li>
                            ) : (
                                <>
                                    <li className="text-center">
                                        <NavLink to={ROUTES.salinityReport}>BẢN TIN XÂM NHẬP MẶN</NavLink>
                                    </li>
                                    <li className="text-center">
                                        <NavLink to={ROUTES.feedback}>LIÊN HỆ</NavLink>
                                    </li>
                                    {canManageData && (
                                        <li className="text-center">
                                            <NavLink to={ROUTES.salinity}>QUẢN TRỊ DỮ LIỆU</NavLink>
                                        </li>
                                    )}
                                    {canManageUsers && (
                                        <li className="text-center">
                                            <NavLink to={ROUTES.users}>QUẢN TRỊ TÀI KHOẢN</NavLink>
                                        </li>
                                    )}
                                    <li className="text-center user-dropdown">
                                        <button
                                            type="button"
                                            className="user-button"
                                            data-bs-toggle="dropdown"
                                            aria-expanded="false"
                                        >
                                            <div className="user-info">
                                                <span className="user-name">
                                                    {userInfo?.name || (isGuest ? "Khách" : "Tài khoản")}
                                                </span>
                                            </div>
                                            <i className="fa-solid fa-chevron-down dropdown-arrow"></i>
                                        </button>

                                        <ul className="dropdown-menu">
                                            <li>
                                                <button
                                                    type="button"
                                                    className="dropdown-item"
                                                    onClick={() => setIsSettingModalOpen(true)}
                                                >
                                                    <span>Cài đặt</span>
                                                </button>
                                            </li>
                                            <li>
                                                <hr className="dropdown-divider" />
                                            </li>
                                            <li>
                                                <button
                                                    type="button"
                                                    className="dropdown-item"
                                                    onClick={handleLogout}
                                                >
                                                    <span>Đăng xuất</span>
                                                </button>
                                            </li>
                                        </ul>
                                    </li>
                                </>
                            )}
                        </ul>
                    </nav>
                </div>
            </header>

            <SettingUser isOpen={isSettingModalOpen} onClose={() => setIsSettingModalOpen(false)} />
        </>
    );
}

export default Header;
