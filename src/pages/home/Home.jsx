import React from "react";
import { Link } from "react-router-dom";
import Header from "@pages/themes/headers/Header";
import Footer from "@pages/themes/footer/Footer";
import FeatureCard from "@pages/home/FeatureCard";

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
                        <Link to="/gioi-thieu" className="secondary-button">
                            Tìm hiểu thêm <span className="icon">ℹ️</span>
                        </Link>
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
