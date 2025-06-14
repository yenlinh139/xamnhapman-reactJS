import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useSelector, useDispatch } from "react-redux";
import Header from "@pages/themes/headers/Header";
import Footer from "@pages/themes/footer/Footer";
import Banner from "@/pages/home/Banner";
import bannerAbout from "@assets/bannerAbout.jpg";
import { getAllFeedbackData, loadMoreFeedback, feedbackActions } from "@/stores/actions/feedbackActions";

const userRoles = [
    {
        title: "Người dùng chưa đăng nhập",
        icon: "👁️",
        color: "gray",
        features: [
            "Xem thông tin tổng quan hệ thống",
            "Xem vị trí các trạm quan trắc",
            "Truy cập thông tin cơ bản",
        ],
    },
    {
        title: "Người dùng đã đăng nhập",
        icon: "👤",
        color: "blue",
        features: [
            "Tương tác đầy đủ với bản đồ WebGIS",
            "Xem chi tiết dữ liệu trạm khí tượng và xâm nhập mặn",
            "Phân tích dữ liệu: lọc theo ngày, xuất biểu đồ",
            "Tìm kiếm trạm theo tên và đơn vị hành chính",
            "Zoom đến khu vực/trạm quan tâm",
            "Xem thông tin nền: ranh giới, thủy văn, giao thông",
            "Gửi đánh giá và chỉnh sửa thông tin cá nhân",
        ],
    },
    {
        title: "Quản trị viên",
        icon: "⚙️",
        color: "red",
        features: [
            "Tất cả chức năng của người dùng",
            "Quản lý thông tin người dùng hệ thống",
            "Quản lý dữ liệu mặn và cập nhật",
            "Các chức năng mở rộng quản trị hệ thống",
        ],
    },
];

const Home = () => {
    const dispatch = useDispatch();
    const {
        loading: feedbackLoading,
        overview,
        timeStats,
        recentFeedback,
        ratingStats,
        showAllFeedback,
        error: feedbackError,
    } = useSelector((state) => state.feedback || {});

    // State for feedback display
    const [displayedFeedbackCount, setDisplayedFeedbackCount] = useState(3);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Fetch feedback data on component mount
    useEffect(() => {
        dispatch(getAllFeedbackData());
    }, [dispatch]);

    // Handle load more feedback
    const handleLoadMore = async () => {
        setIsLoadingMore(true);
        try {
            // Load thêm 10 feedback nữa
            await dispatch(loadMoreFeedback(recentFeedback.length, 10));
            setDisplayedFeedbackCount((prev) => prev + 10);
        } catch (error) {
            console.error("Error loading more feedback:", error);
        } finally {
            setIsLoadingMore(false);
        }
    };

    // Handle show all feedback
    const handleShowAll = async () => {
        if (!showAllFeedback) {
            setIsLoadingMore(true);
            try {
                // Load all feedback (limit 50)
                await dispatch(loadMoreFeedback(0, 50));
                dispatch(feedbackActions.setShowAll(true));
                setDisplayedFeedbackCount(50);
            } catch (error) {
                console.error("Error loading all feedback:", error);
            } finally {
                setIsLoadingMore(false);
            }
        } else {
            // Reset về 3 feedback
            dispatch(feedbackActions.setShowAll(false));
            setDisplayedFeedbackCount(3);
        }
    };

    // Get displayed feedback
    const getDisplayedFeedback = () => {
        if (!recentFeedback || recentFeedback.length === 0) {
            return [];
        }
        return showAllFeedback ? recentFeedback : recentFeedback.slice(0, displayedFeedbackCount);
    };

    return (
        <div className="home-container">
            <Helmet>
                <title>Trang chủ | Xâm nhập mặn Tp. Hồ Chí Minh</title>
            </Helmet>
            <Header />
            <section id="about-section" className="about-section">
                <Banner
                    backgroundImage={bannerAbout}
                    title="WEBGIS GIÁM SÁT VÀ CẢNH BÁO XÂM NHẬP MẶN TRÊN HỆ THỐNG SÔNG, KÊNH, RẠCH TẠI THÀNH PHỐ HỒ CHÍ MINH"
                    description="Khóa luận tốt nghiệp được thực hiện bởi Nguyễn Võ Yến Linh dưới sự hướng dẫn của ThS. Nguyễn Duy Liêm."
                />

                {/* Introduction Section */}
                <div className="container mt-5">
                    <div className="introduction-section">
                        <div className="section-header-home">
                            <h2>Tổng quan nghiên cứu</h2>
                        </div>
                        <div className="section-content">
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
            </section>
            {/* System Overview */}
            <section className="system-overview-section">
                <div className="container">
                    <div className="section-header-home">
                        <h2>Tổng quan hệ thống</h2>
                    </div>

                    <div className="overview-grid">
                        {/* 1. Bản đồ tương tác WebGIS */}
                        <div className="overview-card">
                            <div className="card-image">
                                <i
                                    className="fa-solid fa-map"
                                    style={{ color: "blue", fontSize: "1.5rem" }}
                                ></i>
                            </div>
                            <div className="card-content">
                                <h3>Bản đồ tương tác WebGIS</h3>
                                <p>
                                    Hệ thống bản đồ trực quan với khả năng zoom, pan và tương tác thời gian
                                    thực, hỗ trợ giám sát hiệu quả.
                                </p>
                            </div>
                        </div>

                        {/* 2. Giám sát khí tượng thủy văn */}
                        <div className="overview-card">
                            <div className="card-image">
                                <i
                                    className="fa-solid fa-tower-observation"
                                    style={{ color: "red", fontSize: "1.5rem" }}
                                ></i>
                            </div>
                            <div className="card-content">
                                <h3>Giám sát khí tượng thủy văn</h3>
                                <p>
                                    Theo dõi dữ liệu từ các trạm đo khí tượng trên địa bàn TP.HCM, phục vụ
                                    phân tích tình hình thời tiết và thủy văn.
                                </p>
                            </div>
                        </div>

                        {/* 3. Trạm xâm nhập mặn */}
                        <div className="overview-card">
                            <div className="card-image">
                                <i
                                    className="fa-solid fa-droplet"
                                    style={{ color: "#003366", fontSize: "1.5rem" }}
                                ></i>
                            </div>
                            <div className="card-content">
                                <h3>Trạm xâm nhập mặn</h3>
                                <p>
                                    Giám sát độ mặn tại các điểm quan trắc trọng yếu, phát hiện và cảnh báo
                                    sớm tình trạng xâm nhập mặn.
                                </p>
                            </div>
                        </div>

                        {/* 4. Phân tích dữ liệu chuyên sâu */}
                        <div className="overview-card">
                            <div className="card-image">
                                <i
                                    className="fa-solid fa-chart-column"
                                    style={{ color: "purple", fontSize: "1.5rem" }}
                                ></i>
                            </div>
                            <div className="card-content">
                                <h3>Phân tích dữ liệu chuyên sâu</h3>
                                <p>
                                    Cung cấp công cụ lọc dữ liệu, xuất biểu đồ, thống kê và báo cáo hỗ trợ ra
                                    quyết định chính xác.
                                </p>
                            </div>
                        </div>

                        {/* 5. Tìm kiếm thông minh */}
                        <div className="overview-card">
                            <div className="card-image">
                                <i
                                    className="fa-solid fa-magnifying-glass-location"
                                    style={{ color: "orange", fontSize: "1.5rem" }}
                                ></i>
                            </div>
                            <div className="card-content">
                                <h3>Tìm kiếm thông minh</h3>
                                <p>
                                    Tìm kiếm trạm quan trắc theo tên, vị trí hoặc địa giới hành chính kèm tính
                                    năng tự động zoom tới vị trí.
                                </p>
                            </div>
                        </div>

                        {/* 6. Thông tin nền */}
                        <div className="overview-card">
                            <div className="card-image">
                                <i
                                    className="fa-solid fa-layer-group"
                                    style={{ color: "blue", fontSize: "1.5rem" }}
                                ></i>
                            </div>
                            <div className="card-content">
                                <h3>Thông tin nền</h3>
                                <p>
                                    Bao gồm ranh giới hành chính, sông ngòi, hệ thống giao thông và quy hoạch
                                    sử dụng đất hỗ trợ phân tích không gian.
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
                                    <span className="role-icon">{role.icon}</span>
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
                                {index === 1 && (
                                    <div className="role-cta">
                                        <Link to="/dang-nhap" className="role-button">
                                            Đăng nhập để trải nghiệm
                                        </Link>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Feedback Section - Simplified and Clean */}
            <section className="feedback-section">
                <div className="container">
                    <div className="section-header">
                        <h2>Đánh giá hệ thống</h2>
                    </div>

                    {feedbackLoading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>Đang tải dữ liệu...</p>
                        </div>
                    ) : feedbackError ? (
                        <div className="error-state">
                            <i className="fa-solid fa-exclamation-triangle"></i>
                            <p>Không thể tải dữ liệu đánh giá</p>
                        </div>
                    ) : (
                        <div className="home-feedback-content">
                            {/* Quick Stats */}
                            <div className="quick-stats">
                                <div className="stat-item">
                                    <i className="fa-solid fa-comments"></i>
                                    <div className="stat-info">
                                        <span className="stat-number">{overview?.total || 0}</span>
                                        <span className="stat-label">Phản hồi</span>
                                    </div>
                                </div>
                                <div className="stat-item">
                                    <i className="fa-solid fa-star"></i>
                                    <div className="stat-info">
                                        <span className="stat-number">
                                            {overview?.averageRating?.toFixed(1) || "0.0"}
                                        </span>
                                        <span className="stat-label">Điểm TB</span>
                                    </div>
                                </div>
                                <div className="stat-item">
                                    <i className="fa-solid fa-thumbs-up"></i>
                                    <div className="stat-info">
                                        <span className="stat-number">
                                            {overview?.satisfactionRate || 0}%
                                        </span>
                                        <span className="stat-label">Hài lòng</span>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Feedback - Simple Cards */}
                            <div className="recent-feedback-home">
                                <h3>Phản hồi gần đây</h3>
                                <div className="feedback-grid">
                                    {getDisplayedFeedback() && getDisplayedFeedback().length > 0 ? (
                                        getDisplayedFeedback().map((feedback, index) => (
                                            <div key={index} className="feedback-card">
                                                <div className="feedback-header">
                                                    <div className="user-info">
                                                        <div className="user-avatar">
                                                            <i className="fa-solid fa-user"></i>
                                                        </div>
                                                        <div className="user-details">
                                                            <span className="user-name">
                                                                {feedback.user?.name || "Người dùng"}
                                                            </span>
                                                            <div className="rating">
                                                                {Array.from({ length: 5 }, (_, i) => (
                                                                    <i
                                                                        key={i}
                                                                        className={`fa-${i < feedback.rating ? "solid" : "regular"} fa-star`}
                                                                    ></i>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className="feedback-date">
                                                        {new Date(feedback.createdAt).toLocaleDateString(
                                                            "vi-VN",
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="feedback-content">
                                                    <p>
                                                        "{feedback.comment || "Đánh giá tích cực về hệ thống"}
                                                        "
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="no-feedback">
                                            <i className="fa-regular fa-comment"></i>
                                            <p>Chưa có phản hồi nào</p>
                                        </div>
                                    )}
                                </div>

                                {/* Load More / Show All Button */}
                                {recentFeedback && recentFeedback.length > 3 && (
                                    <div className="load-more-section">
                                        <button
                                            onClick={handleShowAll}
                                            className="load-more-btn"
                                            disabled={isLoadingMore}
                                        >
                                            {isLoadingMore ? (
                                                <>
                                                    <i className="fa-solid fa-spinner fa-spin"></i>
                                                    Đang tải...
                                                </>
                                            ) : showAllFeedback ? (
                                                <>
                                                    <i className="fa-solid fa-chevron-up"></i>
                                                    Thu gọn
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fa-solid fa-chevron-down"></i>
                                                    Xem tất cả ({recentFeedback.length} phản hồi)
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Home;
