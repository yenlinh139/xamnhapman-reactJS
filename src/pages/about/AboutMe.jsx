import React from "react";
import { Helmet } from "react-helmet-async";
import Header from "@pages/themes/headers/Header";
import Footer from "@pages/themes/footer/Footer";
import Banner from "@components/Banner";
import bannerAbout from "@assets/bannerAbout.jpg";

const AboutMe = () => {
    const researchObjectives = [
        {
            icon: "🗺️",
            title: "Xây dựng CSDL không gian",
            description: "Thiết lập cơ sở dữ liệu không gian toàn diện để giám sát và cảnh báo xâm nhập mặn.",
        },
        {
            icon: "🌊",
            title: "Phát triển WebGIS",
            description: "Xây dựng hệ thống WebGIS hiện đại hỗ trợ theo dõi độ mặn theo thời gian thực.",
        },
        {
            icon: "⚡",
            title: "Cảnh báo tự động",
            description: "Thiết lập cơ chế thông báo tự động khi độ mặn vượt ngưỡng an toàn cho phép.",
        },
        {
            icon: "📊",
            title: "Trực quan hóa dữ liệu",
            description: "Hiển thị dữ liệu thủy văn một cách trực quan, hỗ trợ ra quyết định hiệu quả.",
        },
    ];

    return (
        <div className="about-container">
            <Helmet>
                <title>Giới thiệu | Xâm nhập mặn Tp. Hồ Chí Minh</title>
            </Helmet>
            <Header />

            <Banner
                backgroundImage={bannerAbout}
                title="GIỚI THIỆU KHÓA LUẬN"
                description="Khóa luận tốt nghiệp được thực hiện bởi Nguyễn Võ Yến Linh dưới sự hướng dẫn của ThS. Nguyễn Duy Liêm."
            />

            <main className="about-content">
                {/* Introduction Section */}
                <section className="introduction-section">
                    <div className="section-content">
                        <h2>Tổng quan nghiên cứu</h2>
                        <div className="content-wrapper">
                            <div className="text-content">
                                <p className="highlight-text">
                                    Xâm nhập mặn là một trong những thách thức nghiêm trọng đối với hệ thống
                                    sông, kênh, rạch tại Thành phố Hồ Chí Minh, ảnh hưởng đến nguồn nước ngọt
                                    và đời sống người dân.
                                </p>
                                <p>
                                    Trước thực trạng này, khóa luận{" "}
                                    <strong>
                                        "Phát triển WebGIS giám sát và cảnh báo xâm nhập mặn trên hệ thống
                                        sông, kênh, rạch tại Thành phố Hồ Chí Minh"
                                    </strong>{" "}
                                    được thực hiện nhằm xây dựng một hệ thống giám sát thông minh, hỗ trợ quản
                                    lý tài nguyên nước và đưa ra cảnh báo kịp thời.
                                </p>
                            </div>
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <span className="stat-icon">📍</span>
                                    <h3>Phạm vi</h3>
                                    <p>TP. Hồ Chí Minh</p>
                                </div>
                                <div className="stat-card">
                                    <span className="stat-icon">📅</span>
                                    <h3>Thời gian</h3>
                                    <p>2007 - 2024</p>
                                </div>
                                <div className="stat-card">
                                    <span className="stat-icon">🎯</span>
                                    <h3>Đối tượng</h3>
                                    <p>Xâm nhập mặn</p>
                                </div>
                                <div className="stat-card">
                                    <span className="stat-icon">💡</span>
                                    <h3>Giải pháp</h3>
                                    <p>WebGIS</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Objectives Section */}
                <section className="objectives-section">
                    <div className="section-content">
                        <h2>Mục tiêu nghiên cứu</h2>
                        <div className="objectives-grid">
                            {researchObjectives.map((objective, index) => (
                                <div className="objective-card" key={index}>
                                    <span className="objective-icon">{objective.icon}</span>
                                    <h3>{objective.title}</h3>
                                    <p>{objective.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Team Section */}
                <section className="team-section">
                    <div className="section-content">
                        <h2>Đội ngũ thực hiện</h2>
                        <div className="team-grid">
                            <div className="team-card student">
                                <div className="card-content">
                                    <h3>Sinh viên thực hiện</h3>
                                    <div className="member-name">Nguyễn Võ Yến Linh</div>
                                    <div className="member-role">Khoa Môi trường và Tài nguyên</div>
                                </div>
                            </div>
                            <div className="team-card advisor">
                                <div className="card-content">
                                    <h3>Giảng viên hướng dẫn</h3>
                                    <div className="member-name">ThS. Nguyễn Duy Liêm</div>
                                    <div className="member-role">Khoa Môi trường và Tài nguyên</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default AboutMe;
