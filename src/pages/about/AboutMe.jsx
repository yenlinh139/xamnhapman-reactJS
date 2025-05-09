import React from "react";
import { Helmet } from "react-helmet-async";
import Header from "../themes/headers/Header";
import Footer from "../themes/footer/Footer";
import Banner from "../../components/Banner";
import bannerAbout from "../../assets/bannerAbout.jpg";

const AboutMe = () => {
  return (
    <>
      <Helmet>
        <title>Giới thiệu | Xâm nhập mặn Tp. Hồ Chí Minh</title>
      </Helmet>
      <Header />
      {/* Banner */}
      <Banner
        backgroundImage={bannerAbout}
        title="GIỚI THIỆU KHÓA LUẬN"
        description="Khóa luận tốt nghiệp được thực hiện bởi Nguyễn Võ Yến Linh dưới sự hướng dẫn của ThS. Nguyễn Duy Liêm."
      />
      <div className="container">
        {/* About Section */}
        <section className="about-section">
          <h2>GIỚI THIỆU KHÓA LUẬN</h2>
          <div className="underline"></div>
          <p>
            Xâm nhập mặn là một trong những thách thức nghiêm trọng đối với hệ
            thống sông, kênh, rạch tại Thành phố Hồ Chí Minh, ảnh hưởng đến
            nguồn nước ngọt và đời sống người dân. Trước thực trạng này, khóa
            luận{" "}
            <strong>
              "Phát triển WebGIS giám sát và cảnh báo xâm nhập mặn trên hệ thống
              sông, kênh, rạch tại Thành phố Hồ Chí Minh"
            </strong>{" "}
            được thực hiện nhằm xây dựng một hệ thống giám sát thông minh, hỗ
            trợ quản lý tài nguyên nước và đưa ra cảnh báo kịp thời.
          </p>
        </section>

        {/* Research Objectives */}
        <section className="objectives-section">
          <h2>MỤC TIÊU NGHIÊN CỨU</h2>
          <div className="underline"></div>
          <ul>
            <li>
              Xây dựng cơ sở dữ liệu không gian phục vụ giám sát và cảnh báo xâm
              nhập mặn.
            </li>
            <li>
              Phát triển hệ thống WebGIS hỗ trợ theo dõi độ mặn theo thời gian
              thực.
            </li>
            <li>
              Thiết lập cơ chế cảnh báo tự động khi độ mặn vượt ngưỡng an toàn.
            </li>
            <li>
              Trực quan hóa dữ liệu thủy văn, hỗ trợ các cơ quan quản lý ra
              quyết định.
            </li>
          </ul>
        </section>

        {/* Research Scope */}
        <section className="scope-section">
          <h2>ĐỐI TƯỢNG VÀ PHẠM VI NGHIÊN CỨU</h2>
          <div className="underline"></div>
          <p>
            <strong>Đối tượng nghiên cứu:</strong> Hiện tượng xâm nhập mặn.
          </p>
          <p>
            <strong>Phạm vi nghiên cứu:</strong> Hệ thống sông, kênh, rạch tại
            TP. Hồ Chí Minh trong giai đoạn từ năm 2007 đến 2024.
          </p>
        </section>

        {/* Researcher Info */}
        <section className="researcher-section">
          <h2>NGƯỜI THỰC HIỆN</h2>
          <div className="underline"></div>
          <div className="researcher-info">
            <h3>Nguyễn Võ Yến Linh</h3>
            <p>Sinh viên thực hiện khóa luận</p>
          </div>
        </section>

        {/* Advisor Info */}
        <section className="advisor-section">
          <h2>GIẢNG VIÊN HƯỚNG DẪN</h2>
          <div className="underline"></div>
          <div className="advisor-info">
            <h3>ThS. Nguyễn Duy Liêm</h3>
            <p>Giảng viên hướng dẫn</p>
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
};

export default AboutMe;
