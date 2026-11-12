// Định dạng ngày/giờ thống nhất theo giờ Việt Nam (Asia/Ho_Chi_Minh) cho toàn bộ ứng dụng.
// QUAN TRỌNG: luôn truyền timeZone rõ ràng thay vì dựa vào new Date().toLocaleDateString()/
// .getFullYear() mặc định (đọc theo múi giờ của máy/trình duyệt đang xem) - nếu không, cùng 1 mốc
// thời gian sẽ hiển thị ra NGÀY KHÁC NHAU tuỳ máy đang mở trang (vd lệch 1 ngày giữa máy ở giờ VN
// và máy/môi trường chạy múi giờ khác), dù dữ liệu gốc hoàn toàn không đổi.
const VN_TIME_ZONE = "Asia/Ho_Chi_Minh";

const toDate = (value) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const getParts = (date, options) => {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: VN_TIME_ZONE, ...options }).formatToParts(date);
    return Object.fromEntries(parts.map((p) => [p.type, p.value]));
};

// "YYYY-MM-DD" theo giờ VN - dùng để so sánh/lọc Giai đoạn, làm value cho LocalizedDateInput.
export const toVNDateKey = (value) => {
    const date = toDate(value);
    if (!date) return "";
    const { year, month, day } = getParts(date, { year: "numeric", month: "2-digit", day: "2-digit" });
    return `${year}-${month}-${day}`;
};

// "dd/mm/yyyy" theo giờ VN - dùng để HIỂN THỊ ngày (tiêu đề, tooltip, bảng, trục X).
export const formatVNDate = (value) => {
    const key = toVNDateKey(value);
    if (!key) return "";
    const [year, month, day] = key.split("-");
    return `${day}/${month}/${year}`;
};

// "dd/mm/yyyy HH:mm" theo giờ VN - dùng cho các mốc có kèm giờ (dự báo 2h, IoT, hồ chứa...).
export const formatVNDateTime = (value) => {
    const date = toDate(value);
    if (!date) return "";
    const { year, month, day, hour, minute } = getParts(date, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
    return `${day}/${month}/${year} ${hour}:${minute}`;
};

// "HH:mm" theo giờ VN - dùng cho cột "Giờ" riêng (tách khỏi ngày) trong các bảng chi tiết theo
// từng lần đo (vd quan trắc độ mặn nhiều lần/ngày).
export const formatVNHour = (value) => {
    const date = toDate(value);
    if (!date) return "";
    const { hour, minute } = getParts(date, { hour: "2-digit", minute: "2-digit", hour12: false });
    return `${hour}:${minute}`;
};

// "HH" (chỉ giờ, không phút) theo giờ VN - khớp đúng định dạng cột "Gio" trong file Excel nguồn
// (vd "12" cho mốc 12:00).
export const formatVNHourOnly = (value) => {
    const date = toDate(value);
    if (!date) return "";
    const { hour } = getParts(date, { hour: "2-digit", hour12: false });
    return hour;
};

// Giờ VN dạng số (0-23) - dùng để sort cột "Giờ" theo đúng thứ tự số, không phải chuỗi.
export const getVNHourNumber = (value) => {
    const formatted = formatVNHourOnly(value);
    return formatted === "" ? null : Number(formatted);
};

// "HH:mm, dd/mm/yyyy" theo giờ VN - gọn cho trục X khi tần suất theo giờ, luôn có năm để không bị
// nhầm giữa các năm khi chuỗi số liệu dài (fix lỗi "thiếu yyyy" trên trục X).
export const formatVNTickDateTime = (value) => {
    const date = toDate(value);
    if (!date) return "";
    const { year, month, day, hour, minute } = getParts(date, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
    return `${hour}:${minute}, ${day}/${month}/${year}`;
};
