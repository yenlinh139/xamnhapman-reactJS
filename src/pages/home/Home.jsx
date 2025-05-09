import React from 'react';
import Header from '../themes/headers/Header';
import Footer from '../themes/footer/Footer';
import StatsCard from './StatsCard';
import FeatureCard from './FeatureCard';
import Banner from '../../components/Banner';
import bannerHome from '../../assets/bannerHome.png';

// const stats = [
//   {
//     icon: "📡",
//     label: "Trạm quan trắc",
//     value: 120,
//     color: "rgba(255, 87, 51, 0.2)",
//   },
//   {
//     icon: "📈",
//     label: "Lượt truy cập",
//     value: 35000,
//     color: "rgba(51, 181, 229, 0.2)",
//   },
//   {
//     icon: "🌊",
//     label: "Công trình thuỷ lợi",
//     value: 85,
//     color: "rgba(46, 204, 113, 0.2)",
//   },
//   {
//     icon: "📄",
//     label: "Báo cáo xuất ra",
//     value: 740,
//     color: "rgba(255, 195, 0, 0.2)",
//   },
// ];

const features = [
  {
    icon: '📊',
    title: 'Biểu đồ phân tích',
    description: 'Theo dõi diễn biến xâm nhập mặn theo thời gian thực.',
  },
  {
    icon: '📱',
    title: 'Ứng dụng di động',
    description: 'Cập nhật số liệu trực tuyến mọi lúc mọi nơi.',
  },
  {
    icon: '💾',
    title: 'Quản lý dữ liệu',
    description: 'Hệ thống cơ sở dữ liệu chuyên sâu về thủy lợi.',
  },
  {
    icon: '📡',
    title: 'Thông báo tự động',
    description: 'Cảnh báo khi độ mặn vượt ngưỡng an toàn.',
  },
  {
    icon: '🔍',
    title: 'Tra cứu thông tin',
    description: 'Dễ dàng tìm kiếm thông tin công trình thủy lợi.',
  },
  {
    icon: '📄',
    title: 'Xuất báo cáo',
    description: 'Tự động tổng hợp dữ liệu và tạo báo cáo.',
  },
];

const Home = () => {
  return (
    <>
      <Header />
      {/* Banner */}
      <Banner
        backgroundImage={bannerHome}
        title="XÂM NHẬP MẶN TP. HỒ CHÍ MINH"
        description="Hệ thống WebGIS cung cấp thông tin giám sát và cảnh báo xâm nhập mặn trên hệ thống sông, kênh, rạch tại TP. Hồ Chí Minh."
        buttonText="XEM BẢN ĐỒ"
        buttonLink="/ban-do"
      />
      {/* Features Section */}
      <section className="features-section">
        <h2>CÁC TÍNH NĂNG CHÍNH</h2>
        <div className="underline"></div>
        <div className="features-grid">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </section>

      {/* Stats Section */}
      {/* <section className="stats-section">
        <h2>THỐNG KÊ HỆ THỐNG</h2>
        <div className="underline"></div>
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <StatsCard
              key={index}
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
              color={stat.color}
            />
          ))}
        </div>
      </section> */}

      <Banner
        backgroundImage={bannerHome}
        title="XÂM NHẬP MẶN TP. HỒ CHÍ MINH"
        description="Hệ thống WebGIS cung cấp thông tin giám sát và cảnh báo xâm nhập mặn trên hệ thống sông, kênh, rạch tại TP. Hồ Chí Minh."
        buttonText="XEM BẢN ĐỒ"
        buttonLink="/ban-do"
      />
      <Footer />
    </>
  );
};

export default Home;
