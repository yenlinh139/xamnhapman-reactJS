import * as XLSX from "xlsx";
import { dmsToDecimal } from "@components/convertDMSToDecimal";

// Xuất dữ liệu dùng chung cho các tab "Quản trị dữ liệu":
//   - Excel  : chỉ THUỘC TÍNH (mỗi bản ghi 1 dòng).
//   - GeoJSON: THUỘC TÍNH + KHÔNG GIAN (mỗi bản ghi là 1 Feature, geometry = Point của điểm/trạm đo,
//              hệ toạ độ WGS84 kinh độ/vĩ độ thập phân đúng chuẩn GeoJSON).

// Giới hạn số bản ghi cho 1 lần xuất - vượt quá thì yêu cầu thu hẹp bộ lọc (tránh treo trình duyệt
// khi lỡ xuất cả trăm nghìn/triệu dòng, vd toàn bộ dữ liệu IoT).
export const MAX_EXPORT_ROWS = 200000;
export const EXPORT_PAGE_SIZE = 5000;

export class ExportTooLargeError extends Error {
    constructor(total) {
        super(
            `Bộ lọc hiện tại có ${total.toLocaleString("vi-VN")} bản ghi, vượt giới hạn ${MAX_EXPORT_ROWS.toLocaleString("vi-VN")} bản ghi cho một lần xuất. Vui lòng chọn một điểm/trạm hoặc thu hẹp giai đoạn.`,
        );
        this.name = "ExportTooLargeError";
    }
}

// Tải TOÀN BỘ bản ghi theo bộ lọc hiện tại (không chỉ trang đang xem) bằng cách gọi lần lượt từng
// trang. `fetchPage(page, pageSize)` phải trả về { rows, total }.
export const fetchAllRows = async (fetchPage, pageSize = EXPORT_PAGE_SIZE) => {
    const first = await fetchPage(1, pageSize);
    const total = Number(first.total) || first.rows.length;
    if (total > MAX_EXPORT_ROWS) throw new ExportTooLargeError(total);

    const rows = [...first.rows];
    const totalPages = Math.ceil(total / pageSize);
    for (let page = 2; page <= totalPages; page += 1) {
        const next = await fetchPage(page, pageSize);
        if (!next.rows.length) break;
        rows.push(...next.rows);
    }
    return rows;
};

// Toạ độ lưu trong DB ở dạng độ-phút-giây (vd 106°29'56"E) hoặc số thập phân -> số thập phân.
export const toDecimalCoordinate = (value) => {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    const raw = String(value).trim();
    if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
    const decimal = dmsToDecimal(raw);
    if (decimal === null || Number.isNaN(decimal)) return null;
    return /[SW]\s*$/i.test(raw) ? -decimal : decimal;
};

const roundCoordinate = (value) => Math.round(value * 1e6) / 1e6;

// Point [kinh độ, vĩ độ] cho 1 điểm/trạm; null nếu thiếu/không đọc được toạ độ.
export const toPointGeometry = (longitude, latitude) => {
    const lng = toDecimalCoordinate(longitude);
    const lat = toDecimalCoordinate(latitude);
    if (lng === null || lat === null) return null;
    return { type: "Point", coordinates: [roundCoordinate(lng), roundCoordinate(lat)] };
};

const downloadBlob = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// `records`: mảng object { "Tên cột": giá trị } - giá trị số giữ nguyên kiểu số để Excel tính toán được.
export const exportToExcel = (records, { sheetName = "DuLieu", fileName }) => {
    const worksheet = XLSX.utils.json_to_sheet(records);
    const headers = Object.keys(records[0] || {});
    worksheet["!cols"] = headers.map((header) => ({ wch: Math.max(12, header.length + 4) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
    XLSX.writeFile(workbook, fileName, { bookType: "xlsx" });
};

// `items`: mảng { properties, geometry } (geometry có thể null nếu trạm chưa có toạ độ).
export const exportToGeoJSON = (items, { name, fileName }) => {
    const collection = {
        type: "FeatureCollection",
        name,
        features: items.map((item) => ({
            type: "Feature",
            geometry: item.geometry || null,
            properties: item.properties,
        })),
    };
    downloadBlob(new Blob([JSON.stringify(collection)], { type: "application/geo+json" }), fileName);
};

export const buildExportFileName = (prefix, { station, startDate, endDate }, extension) => {
    const parts = [prefix, station || "tat_ca", startDate || "dau", endDate || "cuoi"];
    return `${parts.join("_")}.${extension}`;
};
