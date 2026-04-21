import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@pages/themes/headers/Header";
import Footer from "@pages/themes/footer/Footer";
import Banner from "@/pages/home/Banner";
import { ROUTES } from "@/common/constants";

const userRoles = [
    {
        title: "Người dùng chưa đăng nhập",
        color: "gray",
        features: [
            "Đăng kí, đăng nhập tài khoản",
            "Xem bản đồ địa hình, giao thông, thủy hệ, sử dụng đất; số liệu quan trắc khí tượng, thủy văn, xâm nhập mặn, vận hành công trình thủy lợi",
            "Chọn vùng quan tâm cần xem",
            "Định vị thiết bị người dùng",
            "Truy vấn dữ liệu theo điểm, đơn vị hành chính",
            "Tìm kiếm dữ liệu",
        ],
    },
    {
        title: "Khách",
        color: "gray",
        features: [
            "Tất cả tính năng của Người dùng chưa đăng nhập",
            "Cài đặt tài khoản",
            "Đăng kí nhận, xem bản tin dự báo, cảnh báo xâm nhập mặn",
            "Liên hệ hỗ trợ, góp ý",
        ],
    },
    {
        title: "Kĩ thuật viên",
        color: "gray",
        features: ["Tất cả tính năng của Khách", "Xuất dữ liệu", "Quản trị dữ liệu"],
    },
    {
        title: "Quản trị viên",
        color: "gray",
        features: ["Tất cả tính năng của Kĩ thuật viên", "Quản trị tài khoản"],
    },
];

const Home = () => {
    return (
        <div className="home-container">
            <Helmet>
                <title>Xâm nhập mặn Tp. Hồ Chí Minh</title>
            </Helmet>
            <Header />
            <section id="about-section" className="about-section">
                <Banner
                    title={
                        <>
                            WebGIS hỗ trợ quản lý, khai thác và cung cấp thông tin mặn tại
                            <br />
                            Thành phố Hồ Chí Minh
                        </>
                    }
                    description={
                        "WebGIS được phát triển nhằm quản lý, cung cấp thông tin quan trắc, cảnh báo, dự báo về lượng mưa, nhiệt độ không khí, mực nước, độ mặn trên hệ thống sông, kênh, rạch thuộc TPHCM và xả lũ từ hồ chứa thượng lưu."
                    }
                />
            </section>
            {/* System Overview */}
            <section className="system-overview-section">
                <div className="container">
                    <div className="section-header-home">
                        <h2>Giới thiệu tính năng</h2>
                    </div>

                    <div className="overview-grid">
                        {/* 1. Bản đồ tương tác WebGIS */}
                        <div className="overview-card">
                            <div className="card-content">
                                <h3>Hiển thị dữ liệu về xâm nhập mặn</h3>
                                <p>
                                    Bản đồ nền Google, hành chính, địa hình, giao thông, thủy hệ, sử dụng đất;
                                    Chuỗi số liệu quan trắc khí tượng, thủy văn, xâm nhập mặn, vận hành công
                                    trình thủy lợi
                                </p>
                            </div>
                        </div>

                        {/* 2. Truy vấn dữ liệu về xâm nhập mặn */}
                        <div className="overview-card">
                            <div className="card-content">
                                <h3>Truy vấn dữ liệu về xâm nhập mặn</h3>
                                <p>
                                    Trích xuất số liệu khí tượng, thủy văn, xâm nhập mặn theo điểm, đơn vị
                                    hành chính; Tìm kiếm địa điểm theo từ khóa.
                                </p>
                            </div>
                        </div>

                        {/* 3. Xem bản tin dự báo, cảnh báo xâm nhập mặn */}
                        <div className="overview-card">
                            <div className="card-content">
                                <h3>Xem bản tin dự báo, cảnh báo xâm nhập mặn</h3>
                                <p>
                                    Hiện trạng thủy văn, diễn biến thủy triều và xâm nhập mặn; Cảnh báo khu
                                    vực xảy ra xâm nhập mặn, cấp độ rủi ro thiên tai; Dự báo độ mặn, phạm vi,
                                    thời gian, khoảng cách chịu ảnh hưởng của xâm nhập mặn
                                </p>
                            </div>
                        </div>

                        {/* 4. Liên hệ hỗ trợ, góp ý */}
                        <div className="overview-card">
                            <div className="card-content">
                                <h3>Liên hệ hỗ trợ, góp ý</h3>
                                <p>
                                    Kết nối với cán bộ kĩ thuật để nhận hỗ trợ; Đóng góp ý kiến xây dựng hệ
                                    thống.
                                </p>
                            </div>
                        </div>

                        {/* 5. Quản trị tài khoản, dữ liệu */}
                        <div className="overview-card">
                            <div className="card-content">
                                <h3>Quản trị tài khoản, dữ liệu</h3>
                                <p>
                                    Quản lý thông tin, cấp quyền, phản hồi người dùng; Quản lý số liệu quan
                                    trắc khí tượng, thủy văn, xâm nhập mặn, vận hành công trình thủy lợi.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* User Roles Section */}
            <section className="user-roles-section">
                <div className="container">
                    <div className="section-header-home">
                        <h2>Tính năng theo phân quyền</h2>
                    </div>

                    <div className="roles-grid">
                        {userRoles.map((role, index) => (
                            <div key={index} className={`role-card ${role.color}`}>
                                <div className="role-header">
                                    <h3>{role.title}</h3>
                                </div>
                                <ul className="role-features">
                                    {role.features.map((feature, featureIndex) => (
                                        <li key={featureIndex}>
                                            <span className="feature-check">✓</span>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                {index !== 0 && (
                                    <div className="role-cta">
                                        <Link to={ROUTES.login} className="role-button">
                                            Đăng nhập
                                        </Link>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            <Footer />
        </div>
    );
};

export default Home;
