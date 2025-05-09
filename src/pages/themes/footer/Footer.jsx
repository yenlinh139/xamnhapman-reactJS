import React from "react";
import imageLogo from "../../../assets/logo.png";
import { ROUTES } from "../../../common/constants";

function Footer(props) {
  return (
    <div>
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            {/* Logo & Giới thiệu */}
            <div className="footer-section about">
              <img
                src={imageLogo}
                alt="Xâm nhập mặn Tp. Hồ Chí Minh"
                className="footer-logo"
              />
              <p>
                Với mục tiêu hỗ trợ giám sát môi trường nước, hệ thống WebGIS
                của chúng tôi cung cấp giải pháp theo dõi và cảnh báo xâm nhập
                mặn trên hệ thống sông, kênh, rạch tại TP. Hồ Chí Minh, giúp
                quản lý hiệu quả và kịp thời.
              </p>
              <div className="social-icons">
                <a href="https://www.facebook.com/YenLinh.lhlb/">
                  <i className="fa-brands fa-facebook-f"></i>
                </a>
                <a href="https://www.youtube.com">
                  <i className="fa-brands fa-youtube"></i>
                </a>
                <a href="https://twitter.com">
                  <i className="fa-brands fa-twitter"></i>
                </a>
                <a href="https://www.instagram.com">
                  <i className="fa-brands fa-instagram"></i>
                </a>
                <a href="https://www.google.com">
                  <i className="fa-brands fa-google"></i>
                </a>
              </div>
            </div>

            {/* Về chúng tôi */}
            <div className="footer-section ">
              <h4>Về chúng tôi</h4>
              <ul>
                <li>
                  <a href={ROUTES.home}>Trang chủ</a>
                </li>
                <li>
                  <a href={ROUTES.news}>Tin tức</a>
                </li>
                <li>
                  <a href={ROUTES.map}>Bản đồ</a>
                </li>
                <li>
                  <a href={ROUTES.feedback}>Liên hệ</a>
                </li>
              </ul>
            </div>

            {/* Dự án tiêu biểu */}
            <div className="footer-section">
              <h4>CHỨC NĂNG TRANG BẢN ĐỒ</h4>
              <ul>
                <li>Xem bản đồ địa hình</li>
                <li>Hiển thị dữ liệu quan trắc</li>
                <li>Chọn vùng quan tâm</li>
                <li>Định vị GPS thiết bị</li>
                <li>Truy vấn dữ liệu đo mặn</li>
                <li>Nhận cảnh báo xâm nhập mặn</li>
              </ul>
            </div>

            {/* Tư vấn khách hàng */}
            <div className="footer-section">
              <h4>THÔNG TIN LIÊN HỆ</h4>
              <p>
                <a
                  className="footer-contact"
                  href="https://maps.app.goo.gl/swSbkG8NGr2TL1pT9"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className="fa-solid fa-location-dot"></i>
                  <span>Đại học Nông Lâm</span>
                </a>
              </p>
              <p>
                <a
                  className="footer-contact"
                  href="mailto:21166139@st.hcmuaf.edu.vn"
                >
                  <i className="fa-solid fa-envelope"></i>
                  <span>21166139@st.hcmuaf.edu.vn</span>
                </a>
              </p>
              <p>
                <a className="footer-contact" href="tel:+84395245029">
                  <i className="fa-solid fa-phone"></i>
                  <span>+84 395 245 029</span>
                </a>
              </p>
              <p>
                <a
                  className="footer-contact"
                  href="https://www.facebook.com/YenLinh.lhlb/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className="fa-brands fa-facebook-f"></i>
                  <span>Facebook</span>
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>
      <div className="bottom-home">
        <div className="container">
          Copyright © 2025 - Xâm nhập mặn Tp. Hồ Chí Minh - Nguyễn Võ Yến Linh
        </div>
      </div>
    </div>
  );
}

export default Footer;
