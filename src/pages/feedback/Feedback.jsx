import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import Header from "@pages/themes/headers/Header";
import { ToastCommon } from "@components/ToastCommon";
import { TOAST } from "@common/constants";
import axiosInstance from "@config/axios-config";
import { hideLoading, showLoading } from "@stores/actions/appAction";
import Footer from "@pages/themes/footer/Footer";
import "@/styles/components/_feedback.scss";

const Feedback = () => {
    const [errors, setErrors] = useState({});
    const [isUpdate, setIsUpdate] = useState(false);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [emailChecked, setEmailChecked] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        rating: 0,
        message: "",
    });

    // Debounce email check
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (formData.email && formData.email.includes("@")) {
                checkEmailExists(formData.email);
            } else {
                setIsUpdate(false);
                setEmailChecked(false);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
    }, [formData.email]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRating = (value) => {
        setFormData((prev) => ({ ...prev, rating: value }));
    };

    const validate = () => {
        let newErrors = {};
        const { name, email, message, rating } = formData;

        if (!name.trim()) newErrors.name = "Vui lòng nhập tên của bạn.";

        if (!email.trim()) {
            newErrors.email = "Vui lòng nhập email.";
        } else if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email)) {
            newErrors.email = "Email không hợp lệ.";
        }

        if (!message.trim()) {
            newErrors.message = "Vui lòng nhập nội dung tin nhắn.";
        }

        if (!rating || rating < 1) {
            newErrors.rating = "Vui lòng chọn mức đánh giá.";
        }

        return newErrors;
    };

    const checkEmailExists = async (email) => {
        if (!email || !email.includes("@")) {
            setIsUpdate(false);
            setEmailChecked(false);
            return;
        }

        setIsCheckingEmail(true);
        try {
            // Sử dụng URL params thay vì query params vì backend dùng req.params
            const response = await axiosInstance.get(`/feedback/${encodeURIComponent(email.trim())}`);

            // Backend trả về single object, không phải array
            if (response.data && response.data.id) {
                // Email đã tồn tại, load dữ liệu cũ
                setFormData((prev) => ({
                    ...prev,
                    name: response.data.name || prev.name,
                    rating: response.data.rating || prev.rating,
                    message: response.data.message || prev.message,
                }));
                setIsUpdate(true);
                setEmailChecked(true);
                ToastCommon(TOAST.SUCCESS, "Đã tìm thấy góp ý trước đó! Bạn có thể cập nhật thông tin.");
            } else {
                // Không có data hoặc data không hợp lệ
                setIsUpdate(false);
                setEmailChecked(true);
            }
        } catch (error) {
            console.error("Error checking email:", error);

            // Xử lý các loại lỗi khác nhau
            if (error.response?.status === 404) {
                // Email không tồn tại - đây là case bình thường cho email mới
                setIsUpdate(false);
                setEmailChecked(true);
            } else if (error.response?.status === 400) {
                // Bad request - email format sai hoặc thiếu
                console.log("Email validation error:", error.response.data);
                setIsUpdate(false);
                setEmailChecked(true);
            } else {
                // Lỗi server khác (500, etc.)
                ToastCommon(TOAST.ERROR, "Lỗi khi kiểm tra email. Vui lòng thử lại.");
                setIsUpdate(false);
                setEmailChecked(false);
            }
        } finally {
            setIsCheckingEmail(false);
        }
    };

    // Gửi dữ liệu lên server bằng Axios
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});

        const newErrors = validate();
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        // Kiểm tra xem có đang check email không
        if (isCheckingEmail) {
            ToastCommon(TOAST.WARNING, "Đang kiểm tra email, vui lòng chờ một chút...");
            return;
        }

        try {
            showLoading();

            if (isUpdate) {
                // Cập nhật feedback đã tồn tại - sử dụng query params
                await axiosInstance.put(`/feedback/${formData.email}`, formData);
                ToastCommon(TOAST.SUCCESS, "Cập nhật góp ý thành công!");
            } else {
                // Tạo feedback mới
                await axiosInstance.post("/feedback", formData);
                ToastCommon(TOAST.SUCCESS, "Gửi góp ý thành công!");
            }

            // Reset form sau khi thành công
            setFormData({ name: "", email: "", rating: 0, message: "" });
            setIsUpdate(false);
            setEmailChecked(false);
        } catch (error) {
            console.error("Submit error:", error);
            const errorMessage =
                error.response?.data?.message ||
                (isUpdate ? "Lỗi khi cập nhật góp ý!" : "Lỗi khi gửi góp ý!");
            ToastCommon(TOAST.ERROR, errorMessage);
        } finally {
            hideLoading();
        }
    };

    return (
        <div className="feedback-page">
            <Helmet>
                <title>Góp ý & Đánh giá | Xâm nhập mặn Tp. Hồ Chí Minh</title>
            </Helmet>
            <Header />

            <main className="feedback-main">
                <div className="container">
                    <div className="feedback-content">
                        <div className="feedback-header">
                            <h1>{isUpdate ? "Cập nhật góp ý" : "Góp ý & Đánh giá"}</h1>
                            <p>
                                {isUpdate
                                    ? "Cập nhật thông tin góp ý của bạn"
                                    : "Chia sẻ ý kiến của bạn để giúp chúng tôi cải thiện hệ thống tốt hơn"}
                            </p>
                            {isUpdate && (
                                <div className="update-badge">
                                    <i className="fas fa-edit"></i>
                                    <span>Chế độ cập nhật</span>
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="feedback-form">
                            <div className="form-group">
                                <div className="input-wrapper">
                                    <label htmlFor="name">
                                        <i className="fas fa-user"></i>
                                        <span>Họ và tên</span>
                                    </label>
                                    <input
                                        id="name"
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className={errors.name ? "error" : ""}
                                        placeholder="Nhập họ và tên của bạn"
                                    />
                                    {errors.name && <div className="error-message">{errors.name}</div>}
                                </div>

                                <div className="input-wrapper">
                                    <label htmlFor="email">
                                        <i className="fas fa-envelope"></i>
                                        <span>Email</span>
                                        {isCheckingEmail && (
                                            <span className="checking-indicator">
                                                <i className="fas fa-spinner fa-spin"></i>
                                                Đang kiểm tra...
                                            </span>
                                        )}
                                    </label>
                                    <div className="input-with-status">
                                        <input
                                            id="email"
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className={`${errors.email ? "error" : ""} ${isUpdate ? "update-mode" : ""}`}
                                            placeholder="Nhập địa chỉ email của bạn"
                                        />
                                        {emailChecked && !isCheckingEmail && (
                                            <div className={`email-status ${isUpdate ? "exists" : "new"}`}>
                                                <i
                                                    className={`fas ${isUpdate ? "fa-check-circle" : "fa-plus-circle"}`}
                                                ></i>
                                                <span>{isUpdate ? "Email đã tồn tại" : "Email mới"}</span>
                                            </div>
                                        )}
                                    </div>
                                    {errors.email && <div className="error-message">{errors.email}</div>}
                                </div>
                            </div>

                            <div className="rating-wrapper">
                                <label>
                                    <i className="fas fa-star"></i>
                                    <span>Đánh giá của bạn</span>
                                </label>
                                <div className="rating-stars">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            className={`star-button ${
                                                formData.rating >= star ? "selected" : ""
                                            }`}
                                            onClick={() => handleRating(star)}
                                        >
                                            <i className="fas fa-star"></i>
                                        </button>
                                    ))}
                                </div>
                                {errors.rating && <div className="error-message">{errors.rating}</div>}
                            </div>

                            <div className="input-wrapper">
                                <label htmlFor="message">
                                    <i className="fas fa-comment-alt"></i>
                                    <span>Nội dung góp ý</span>
                                </label>
                                <textarea
                                    id="message"
                                    name="message"
                                    rows="4"
                                    value={formData.message}
                                    onChange={handleChange}
                                    className={errors.message ? "error" : ""}
                                    placeholder="Chia sẻ ý kiến của bạn về hệ thống..."
                                />
                                {errors.message && <div className="error-message">{errors.message}</div>}
                            </div>

                            <button
                                type="submit"
                                className={`submit-button ${isUpdate ? "update-mode" : ""}`}
                                disabled={isCheckingEmail}
                            >
                                <i className={`fas ${isUpdate ? "fa-sync-alt" : "fa-paper-plane"}`}></i>
                                <span>
                                    {isCheckingEmail
                                        ? "Đang kiểm tra email..."
                                        : isUpdate
                                          ? "Cập nhật góp ý"
                                          : "Gửi góp ý"}
                                </span>
                            </button>
                        </form>

                        <div className="feedback-info">
                            <div className="info-card">
                                <i className="fas fa-shield-alt"></i>
                                <h3>Bảo mật thông tin</h3>
                                <p>
                                    Thông tin của bạn được bảo mật và chỉ được sử dụng để cải thiện hệ thống
                                </p>
                            </div>
                            <div className="info-card ">
                                <i className="fas fa-heart"></i>
                                <h3>Cảm ơn bạn</h3>
                                <p>Mọi đóng góp của bạn đều rất quan trọng với sự phát triển của hệ thống</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Feedback;
