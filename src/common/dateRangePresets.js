// Giai đoạn chọn sẵn dùng chung cho các modal biểu đồ/số liệu (IoT, điểm đo mưa, khí tượng,
// thủy văn, hồ chứa). Mặc định là preset đầu tiên (7 ngày), "neo" theo mốc dữ liệu MỚI NHẤT của
// chuỗi số liệu (không phải ngày hôm nay, vì trạm có thể đã ngừng gửi dữ liệu trước đó).
export const DATE_RANGE_PRESETS = [
    { key: "7d", label: "7 ngày", days: 7 },
    { key: "30d", label: "30 ngày", days: 30 },
    { key: "90d", label: "90 ngày", days: 90 },
    { key: "all", label: "Toàn bộ", days: null },
];

export const DEFAULT_DATE_RANGE_PRESET = DATE_RANGE_PRESETS[0];

export const addDaysToIsoDate = (isoDate, days) => {
    const [y, m, d] = isoDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

// bounds = { startDate, endDate } (ISO yyyy-mm-dd) - phạm vi thực tế của chuỗi số liệu.
export const getPresetRange = (preset, bounds) => {
    if (!preset || !bounds?.endDate) return null;
    if (preset.days === null) {
        return { startDate: bounds.startDate || "", endDate: bounds.endDate };
    }

    const computedStart = addDaysToIsoDate(bounds.endDate, -(preset.days - 1));
    const startDate = bounds.startDate && computedStart < bounds.startDate ? bounds.startDate : computedStart;
    return { startDate, endDate: bounds.endDate };
};

export const getPresetRangeByKey = (presetKey, bounds) =>
    getPresetRange(
        DATE_RANGE_PRESETS.find((preset) => preset.key === presetKey),
        bounds,
    );

// Trả về key của preset khớp đúng khoảng đang chọn (để dropdown hiển thị), hoặc "" nếu tùy chỉnh.
export const findActivePresetKey = (startDate, endDate, bounds) =>
    DATE_RANGE_PRESETS.find((preset) => {
        const range = getPresetRange(preset, bounds);
        return range && range.startDate === startDate && range.endDate === endDate;
    })?.key || "";
