import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const VerifyEmail = () => {
  const { userId } = useParams(); // Nhận email từ URL
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Gửi yêu cầu xác thực email đến backend
    const verifyEmail = async () => {
      try {
        const response = await fetch(
          `http://localhost:4000/api/verify-email/${userId}`
        );
        const data = await response.json();

        if (response.ok) {
          setMessage("Email đã được xác thực thành công!");
          setTimeout(() => {
            navigate("/login"); // Chuyển hướng tới trang đăng nhập sau 3 giây
          }, 3000);
        } else {
          setMessage("Xác thực email thất bại. Vui lòng thử lại.");
        }
      } catch (error) {
        setMessage("Có lỗi xảy ra. Vui lòng thử lại sau.");
      }
      setLoading(false);
    };

    verifyEmail();
  }, [userId, navigate]);

  if (loading) {
    return <div>Đang xác thực...</div>;
  }

  return (
    <div className="verify-email-container">
      <h2>{message}</h2>
      <p>
        Hệ thống đang xử lý xác thực của bạn. Bạn sẽ được chuyển hướng đến trang
        đăng nhập trong vài giây.
      </p>
    </div>
  );
};

export default VerifyEmail;
