# 🌊 Hệ thống Giám sát Xâm nhập Mặn TP.HCM

Ứng dụng web theo dõi và phân tích tình trạng xâm nhập mặn tại TP. Hồ Chí Minh với bản đồ tương tác và hệ thống cảnh báo tự động.

## ✨ Tính năng

- 🗺️ **Bản đồ tương tác** - Hiển thị trực quan các điểm đo và khu vực ảnh hưởng
- 📊 **Biểu đồ thống kê** - Phân tích dữ liệu độ mặn theo thời gian
- ⚡ **Cảnh báo tự động** - Thông báo khi độ mặn vượt ngưỡng
- 👥 **Quản lý người dùng** - Phân quyền và xác thực bảo mật
- 📱 **Responsive** - Tương thích mọi thiết bị

## 🛠️ Công nghệ

- **React 18** + **Vite** + **Redux Toolkit**
- **Leaflet** + **Mapbox GL** - Bản đồ tương tác
- **SCSS** + **Bootstrap** - Giao diện responsive
- **Chart.js** - Biểu đồ thống kê
- **JWT** - Xác thực bảo mật

## 🚀 Cài đặt

### Yêu cầu

- Node.js >= 16.0.0
- npm >= 8.0.0

### Bước 1: Clone repository

```bash
git clone https://github.com/yenlinh139/xamnhapman-reactJS.git
cd xamnhapman-reactJS
```

### Bước 2: Cài đặt dependencies

```bash
npm install
```

### Bước 3: Cấu hình environment

Tạo file `.env`:

```env
VITE_BASE_URL=http://localhost:4000/api
VITE_MAPBOX_TOKEN=your_mapbox_token_here
```

> **⚠️ Lưu ý**: Để chạy đầy đủ ứng dụng, bạn cần cài đặt và chạy Backend API từ repository [xamnhapman-nodeJS](https://github.com/yenlinh139/xamnhapman-nodeJS)

### Bước 4: Chạy ứng dụng

```bash
npm run dev
```

Truy cập: `http://localhost:5173`

## 📝 Scripts

- `npm run dev` - Chạy development server
- `npm run build` - Build cho production
- `npm run preview` - Preview production build
- `npm run lint` - Kiểm tra code quality

## 📁 Cấu trúc chính

```
src/
├── components/     # Component tái sử dụng
├── pages/         # Các trang chính
├── stores/        # Redux store
├── styles/        # SCSS styles
└── config/        # Cấu hình
```

## 👨‍💻 Tác giả

**Nguyen Vo Yen Linh** - 21166139@st.hcmuaf.edu.vn

---

_Khóa luận tốt nghiệp - Hệ thống giám sát xâm nhập mặn TP.HCM_
