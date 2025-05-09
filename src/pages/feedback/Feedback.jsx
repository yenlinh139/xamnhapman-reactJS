import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import Header from "../themes/headers/Header";
import { ToastCommon } from "../../components/ToastCommon";
import { TOAST } from "../../common/constants";
import axiosInstance from "../../config/axios-config";
import { hideLoading, showLoading } from "../../stores/actions/appAction";
import Footer from "../themes/footer/Footer";

const Feedback = () => {
  const [errors, setErrors] = useState({});
  const [isUpdate, setIsUpdate] = useState(false); // ✅ Fix lỗi thiếu khai báo
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    rating: 0,
    message: "", // ✅ Fix lỗi key bị nhầm là "feedback"
  });

  useEffect(() => {
    if (formData.email) {
      checkEmailExists(formData.email);
    }
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
    try {
      const response = await axiosInstance.get(
        import.meta.env.VITE_BASE_URL + `/api/feedback/${email}`
      );
      if (response.data) {
        setFormData(response.data);
        setIsUpdate(true);
      } else {
        setIsUpdate(false);
      }
    } catch (error) {
      setIsUpdate(false);
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

    try {
      showLoading();
      if (isUpdate) {
        await axiosInstance.put(
          import.meta.env.VITE_BASE_URL + `/api/feedback/${formData.email}`,
          formData
        );
        ToastCommon(TOAST.SUCCESS, "Cập nhật thành công!");
      } else {
        await axiosInstance.post(
          import.meta.env.VITE_BASE_URL + "/api/feedback",
          formData
        );
        ToastCommon(TOAST.SUCCESS, "Tin nhắn đã được gửi thành công!");
      }

      setFormData({ name: "", email: "", rating: 0, message: "" });
      setIsUpdate(false);
    } catch (error) {
      ToastCommon(
        TOAST.ERROR,
        error.response?.data?.message || "Lỗi hệ thống!"
      );
    } finally {
      hideLoading();
    }
  };

  return (
    <>
      <Helmet>
        <title>Góp ý & Đánh giá | Xâm nhập mặn Tp. Hồ Chí Minh</title>
      </Helmet>
      <Header />
      <div className="feedback-container">
        <h2>Góp ý & Đánh giá</h2>
        <p>
          Hãy chia sẻ cảm nhận của bạn về hệ thống để giúp chúng tôi cải thiện
          tốt hơn.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label>Tên của bạn</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? "error" : ""}
              placeholder="Nhập tên của bạn"
            />
            {errors.name && <div className="text-error">{errors.name}</div>}
          </div>

          <div className="mb-3">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? "error" : ""}
              placeholder="Nhập email của bạn"
            />
            {errors.email && <div className="text-error">{errors.email}</div>}
          </div>

          <div className="mb-3">
            <label>Đánh giá</label>
            <div className="rating-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`star ${
                    formData.rating >= star ? "selected" : ""
                  }`}
                  onClick={() => handleRating(star)}
                >
                  ★
                </span>
              ))}
            </div>
            {errors.rating && <div className="text-error">{errors.rating}</div>}
          </div>

          <div className="mb-3">
            <label>Góp ý của bạn</label>
            <textarea
              name="message"
              rows="4"
              value={formData.message} // ✅ Fix lỗi: đổi feedback → message
              onChange={handleChange}
              className={errors.message ? "error" : ""}
              placeholder="Nhập góp ý của bạn về hệ thống"
            />
            {errors.message && (
              <div className="text-error">{errors.message}</div>
            )}
          </div>

          <button type="submit">Gửi góp ý</button>
        </form>
      </div>
      <Footer />
    </>
  );
};

export default Feedback;
