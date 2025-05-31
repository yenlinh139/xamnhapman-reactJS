import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@pages/themes/headers/Header";
import Footer from "@pages/themes/footer/Footer";
import FeatureCard from "@pages/home/FeatureCard";
import Banner from "@components/Banner";
import bannerAbout from "@assets/bannerAbout.jpg";

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

const features = [
    {
        icon: "🌊",
        title: "Giám sát độ mặn",
        description: "Theo dõi và phân tích diễn biến xâm nhập mặn theo thời gian thực.",
        color: "blue",
    },
    {
        icon: "📊",
        title: "Phân tích dữ liệu",
        description: "Biểu đồ và thống kê chi tiết về tình hình xâm nhập mặn.",
        color: "green",
    },
    {
        icon: "🗺️",
        title: "Bản đồ tương tác",
        description: "Bản đồ WebGIS hiển thị trực quan các điểm đo và khu vực ảnh hưởng.",
        color: "purple",
    },
    {
        icon: "⚡",
        title: "Cảnh báo tức thời",
        description: "Thông báo ngay khi độ mặn vượt ngưỡng cho phép.",
        color: "orange",
    },
    {
        icon: "📱",
        title: "Truy cập đa nền tảng",
        description: "Sử dụng trên mọi thiết bị với giao diện tối ưu.",
        color: "red",
    },
    {
        icon: "📄",
        title: "Báo cáo chuyên sâu",
        description: "Tự động tạo báo cáo với số liệu và biểu đồ chi tiết.",
        color: "teal",
    },
];

const stats = [
    {
        value: "24/7",
        label: "Giám sát",
        description: "Theo dõi liên tục",
        icon: "⚡",
    },
    {
        value: "100+",
        label: "Điểm đo",
        description: "Trên toàn thành phố",
        icon: "📍",
    },
    {
        value: "95%",
        label: "Độ chính xác",
        description: "Trong dự báo",
        icon: "📊",
    },
    {
        value: "<2p",
        label: "Cập nhật",
        description: "Thời gian thực",
        icon: "⏱️",
    },
];

const Home = () => {
    return (
        <div className="home-container">
            <Helmet>
                <title>Trang chủ | Xâm nhập mặn Tp. Hồ Chí Minh</title>
            </Helmet>
            <Header />

            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-content">
                    <h1>Hệ thống Giám sát Xâm nhập Mặn</h1>
                    <p>Giải pháp toàn diện cho việc theo dõi và quản lý tình hình xâm nhập mặn tại TP.HCM</p>
                    <div className="hero-buttons">
                        <Link to="/ban-do" className="primary-button">
                            Xem bản đồ <span className="icon">🗺️</span>
                        </Link>
                        <a href="#about-section" className="secondary-button">
                            Tìm hiểu thêm <span className="icon">ℹ️</span>
                        </a>
                    </div>
                </div>
                <div className="hero-stats">
                    {stats.map((stat, index) => (
                        <div key={index} className="stat-card">
                            <div className="stat-icon">{stat.icon}</div>
                            <div className="stat-value">{stat.value}</div>
                            <div className="stat-label">{stat.label}</div>
                            <div className="stat-description">{stat.description}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section">
                <div className="section-header">
                    <h2>Tính năng nổi bật</h2>
                    <p>Khám phá các công cụ mạnh mẽ giúp bạn theo dõi và phân tích tình hình xâm nhập mặn</p>
                </div>
                <div className="features-grid">
                    {features.map((feature, index) => (
                        <FeatureCard
                            key={index}
                            icon={feature.icon}
                            title={feature.title}
                            description={feature.description}
                            color={feature.color}
                        />
                    ))}
                </div>
            </section>

            {/* About Section */}
            <section id="about-section" className="about-section">
                <Banner
                    backgroundImage={bannerAbout}
                    title="GIỚI THIỆU KHÓA LUẬN"
                    description="Khóa luận tốt nghiệp được thực hiện bởi Nguyễn Võ Yến Linh dưới sự hướng dẫn của ThS. Nguyễn Duy Liêm."
                />

                {/* Introduction Section */}
                <div className="container mt-5">
                    <div className="introduction-section">
                        <div className="section-content">
                            <h2>Tổng quan nghiên cứu</h2>
                            <div className="content-wrapper mt-5">
                                <div className="text-content ">
                                    <p className="highlight-text">
                                        Xâm nhập mặn là một trong những thách thức nghiêm trọng đối với hệ
                                        thống sông, kênh, rạch tại Thành phố Hồ Chí Minh, ảnh hưởng đến nguồn
                                        nước ngọt và đời sống người dân.
                                    </p>
                                    <p>
                                        Trước thực trạng này, khóa luận{" "}
                                        <strong>
                                            "Phát triển WebGIS giám sát và cảnh báo xâm nhập mặn trên hệ thống
                                            sông, kênh, rạch tại Thành phố Hồ Chí Minh"
                                        </strong>{" "}
                                        được thực hiện nhằm xây dựng một hệ thống giám sát thông minh, hỗ trợ
                                        quản lý tài nguyên nước và đưa ra cảnh báo kịp thời.
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
                    </div>
                </div>

                {/* Objectives Section */}
                <div className="container">
                    <div className="objectives-section">
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
                    </div>
                </div>

                {/* Team Section */}
                <div className="container">
                    <div className="team-section">
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
                    </div>
                </div>
            </section>

            {/* Call to Action Section */}
            <section className="cta-section">
                <div className="cta-content">
                    <h2>Bắt đầu ngay hôm nay</h2>
                    <p>
                        Truy cập bản đồ để xem thông tin chi tiết về tình hình xâm nhập mặn tại khu vực của
                        bạn
                    </p>
                    <Link to="/ban-do" className="cta-button">
                        Mở bản đồ WebGIS <span className="icon">→</span>
                    </Link>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Home;
