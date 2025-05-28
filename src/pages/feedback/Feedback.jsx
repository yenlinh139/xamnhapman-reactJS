import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '../themes/headers/Header';
import { ToastCommon } from '../../components/ToastCommon';
import { TOAST } from '../../common/constants';
import axiosInstance from '../../config/axios-config';
import { hideLoading, showLoading } from '../../stores/actions/appAction';
import Footer from '../themes/footer/Footer';

const Feedback = () => {
  const [errors, setErrors] = useState({});
  const [isUpdate, setIsUpdate] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    rating: 0,
    message: '',
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

    if (!name.trim()) newErrors.name = 'Vui lòng nhập tên của bạn.';

    if (!email.trim()) {
      newErrors.email = 'Vui lòng nhập email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email)) {
      newErrors.email = 'Email không hợp lệ.';
    }

    if (!message.trim()) {
      newErrors.message = 'Vui lòng nhập nội dung tin nhắn.';
    }

    if (!rating || rating < 1) {
      newErrors.rating = 'Vui lòng chọn mức đánh giá.';
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
        ToastCommon(TOAST.SUCCESS, 'Cập nhật thành công!');
      } else {
        await axiosInstance.post(
          import.meta.env.VITE_BASE_URL + '/api/feedback',
          formData
        );
        ToastCommon(TOAST.SUCCESS, 'Tin nhắn đã được gửi thành công!');
      }

      setFormData({ name: '', email: '', rating: 0, message: '' });
      setIsUpdate(false);
    } catch (error) {
      ToastCommon(
        TOAST.ERROR,
        error.response?.data?.message || 'Lỗi hệ thống!'
      );
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
        <div className="feedback-container">
          <div className="feedback-content">
            <div className="feedback-header">
              <h1>Góp ý & Đánh giá</h1>
              <p>
                Chia sẻ ý kiến của bạn để giúp chúng tôi cải thiện hệ thống tốt
                hơn
              </p>
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
                    className={errors.name ? 'error' : ''}
                    placeholder="Nhập họ và tên của bạn"
                  />
                  {errors.name && (
                    <div className="error-message">{errors.name}</div>
                  )}
                </div>

                <div className="input-wrapper">
                  <label htmlFor="email">
                    <i className="fas fa-envelope"></i>
                    <span>Email</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={errors.email ? 'error' : ''}
                    placeholder="Nhập địa chỉ email của bạn"
                  />
                  {errors.email && (
                    <div className="error-message">{errors.email}</div>
                  )}
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
                        formData.rating >= star ? 'selected' : ''
                      }`}
                      onClick={() => handleRating(star)}
                    >
                      <i className="fas fa-star"></i>
                    </button>
                  ))}
                </div>
                {errors.rating && (
                  <div className="error-message">{errors.rating}</div>
                )}
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
                  className={errors.message ? 'error' : ''}
                  placeholder="Chia sẻ ý kiến của bạn về hệ thống..."
                />
                {errors.message && (
                  <div className="error-message">{errors.message}</div>
                )}
              </div>

              <button type="submit" className="submit-button">
                <i className="fas fa-paper-plane"></i>
                <span>{isUpdate ? 'Cập nhật góp ý' : 'Gửi góp ý'}</span>
              </button>
            </form>

            <div className="feedback-info">
              <div className="info-card">
                <i className="fas fa-clock"></i>
                <h3>Phản hồi nhanh</h3>
                <p>
                  Chúng tôi sẽ xem xét và phản hồi góp ý của bạn trong thời gian
                  sớm nhất
                </p>
              </div>
              <div className="info-card">
                <i className="fas fa-shield-alt"></i>
                <h3>Bảo mật thông tin</h3>
                <p>
                  Thông tin của bạn được bảo mật và chỉ được sử dụng để cải
                  thiện hệ thống
                </p>
              </div>
              <div className="info-card">
                <i className="fas fa-heart"></i>
                <h3>Cảm ơn bạn</h3>
                <p>
                  Mọi đóng góp của bạn đều rất quan trọng với sự phát triển của
                  hệ thống
                </p>
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
