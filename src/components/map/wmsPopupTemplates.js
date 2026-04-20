const POPUP_FALLBACK = "";

export const WMS_POPUP_TITLES = {
    salinityPoints: "Điểm đo mặn",
    hydrometStations: "Trạm khí tượng thủy văn",
    DiaPhanHuyen: "Địa phận huyện",
    DiaPhanXa: "Địa phận xã",
    ThuyHe_line: "Thủy hệ 1 nét",
    ThuyHe_polygon: "Thủy hệ 2 nét",
    HienTrangSDD_2020: "Hiện trạng sử dụng đất 2020",
    QuyHoachSDD_2030: "Quy hoạch sử dụng đất 2030",
    DiemDoCao: "Điểm độ cao",
    DEM: "Mô hình độ cao số (DEM)",
    GiaoThong_line: "Giao thông 1 nét",
    GiaoThong_polygon: "Giao thông 2 nét",
    CTTL_2023_Cong: "Cống",
    CTTL_2023_DeBao_BoBao: "Đê bao, bờ bao",
    CTTL_2023_KenhMuong: "Kênh mương",
    CTTL_2023_TramBom: "Trạm bơm",
    HoChuaThuongLuu: "Hồ chứa thượng lưu",
    CTTL_2030_Vung_HeThong: "Công trình thủy lợi vùng, hệ thống",
    CTTL_2030_NongThonMoi: "Công trình nông thôn mới",
    CTTL_2030_NoiDong: "Công trình thủy lợi nhỏ, nội đồng",
    CTTL_2030_VungThuyLoi: "Vùng thủy lợi",
};

const escapeHtml = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");

const formatValue = (value, unit = "") => {
    if (value === null || value === undefined || value === "") {
        return POPUP_FALLBACK;
    }

    const safeValue = escapeHtml(value);
    const safeUnit = unit ? ` ${escapeHtml(unit)}` : "";
    return `${safeValue}${safeUnit}`;
};

const formatNumericValue = (value, digits = 2, unit = "") => {
    if (value === null || value === undefined || value === "") {
        return POPUP_FALLBACK;
    }

    const normalized = String(value).trim().replace(",", ".");
    const numeric = Number.parseFloat(normalized);

    if (!Number.isFinite(numeric)) {
        return formatValue(value, unit);
    }

    const safeValue = escapeHtml(numeric.toFixed(digits).replace(".", ","));
    const safeUnit = unit ? ` ${escapeHtml(unit)}` : "";
    return `${safeValue}${safeUnit}`;
};

const createPopupShell = (title, body, options = {}) => {
    const minWidth = options.minWidth || 320;
    const maxWidth = options.maxWidth || 420;

    return `
        <div style="font-family: 'Segoe UI', sans-serif; min-width: ${minWidth}px; max-width: ${maxWidth}px; box-sizing: border-box; padding: 14px 14px 12px; color: #2f3542; background: #ffffff; border-radius: 16px;">
            <div style="padding: 0 34px 12px 0; border-bottom: 3px solid #3b9cff; margin-bottom: 14px; box-sizing: border-box;">
                <div style="font-size: 17px; line-height: 1.25; font-weight: 700; color: #2f8cff;">${escapeHtml(title)}</div>
            </div>
            ${body}
        </div>
    `;
};

const createTableRows = (rows) =>
    rows
        .filter((row) => row && row.label)
        .map((row, index, filteredRows) => {
            const isLastRow = index === filteredRows.length - 1;
            const borderStyle = isLastRow ? "border-bottom: none;" : "border-bottom: 1px solid #e5e7eb;";

            return `
                <tr>
                    <td style="width: 44%; padding: 12px 14px; background: #f5f6f8; ${borderStyle} font-size: 14px; color: #5b6572; vertical-align: top;">${escapeHtml(row.label)}</td>
                    <td style="padding: 12px 14px; ${borderStyle} font-size: 14px; color: #2f3542; vertical-align: top; word-break: break-word;">${row.value}</td>
                </tr>
            `;
        })
        .join("");

const createFourColumnRows = (rows) => {
    const safeRows = rows.filter((row) => row && row.label);
    const pairedRows = [];

    for (let index = 0; index < safeRows.length; index += 2) {
        pairedRows.push([safeRows[index], safeRows[index + 1] || null]);
    }

    return pairedRows
        .map(([leftRow, rightRow], index) => {
            const isLastRow = index === pairedRows.length - 1;
            const borderStyle = isLastRow ? "border-bottom: none;" : "border-bottom: 1px solid #e5e7eb;";

            const rightLabel = rightRow ? escapeHtml(rightRow.label) : "";
            const rightValue = rightRow ? rightRow.value : "";

            return `
                <tr>
                    <td style="width: 23%; padding: 10px 10px; background: #f5f6f8; ${borderStyle} font-size: 13px; color: #5b6572; vertical-align: top;">${escapeHtml(leftRow.label)}</td>
                    <td style="width: 27%; padding: 10px 10px; ${borderStyle} font-size: 13px; color: #2f3542; vertical-align: top; word-break: break-word;">${leftRow.value}</td>
                    <td style="width: 23%; padding: 10px 10px; background: #f5f6f8; ${borderStyle} font-size: 13px; color: #5b6572; vertical-align: top;">${rightLabel}</td>
                    <td style="width: 27%; padding: 10px 10px; ${borderStyle} font-size: 13px; color: #2f3542; vertical-align: top; word-break: break-word;">${rightValue}</td>
                </tr>
            `;
        })
        .join("");
};

export const createTablePopup = (title, rows) => {
    const body = `
        <div style="border: 1px solid #dfe5ec; border-radius: 10px; overflow: hidden; background: #fff; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);">
            <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                <tbody>
                    ${createTableRows(rows)}
                </tbody>
            </table>
        </div>
    `;

    return createPopupShell(title, body);
};

export const createFourColumnTablePopup = (title, rows) => {
    const body = `
        <div style="border: 1px solid #dfe5ec; border-radius: 10px; overflow: hidden; background: #fff; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);">
            <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                <tbody>
                    ${createFourColumnRows(rows)}
                </tbody>
            </table>
        </div>
    `;

    return createPopupShell(title, body, { minWidth: 560, maxWidth: 680 });
};

export const createMetricPopup = (title, label, value) => {
    const body = `
        <div style="border: 1px solid #dfe5ec; border-radius: 10px; overflow: hidden; background: #fff;">
            <div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(84px, 112px); align-items: stretch;">
                <div style="background: #f5f6f8; padding: 14px; font-size: 15px; color: #5b6572;">${escapeHtml(label)}</div>
                <div style="padding: 14px; font-size: 15px; line-height: 1.1; font-weight: 400; color: #2f3542; text-align: left; word-break: break-word;">${formatNumericValue(value, 2)}</div>
            </div>
        </div>
    `;

    return createPopupShell(title, body, { minWidth: 320, maxWidth: 380 });
};

const rowsForLayer = (layerName, props) => {
    switch (layerName) {
        case "DiaPhanHuyen":
            return [
                { label: "Huyện", value: formatValue(props.tenHuyen) },
                { label: "Mã huyện", value: formatValue(props.maHuyen) },
                { label: "Diện tích (km²)", value: formatNumericValue(props.dienTichTuNhien, 2) },
            ];
        case "DiaPhanXa":
            return [
                { label: "Xã", value: formatValue(props.tenXa) },
                { label: "Mã xã", value: formatValue(props.maXa) },
                { label: "Huyện", value: formatValue(props.tenHuyen) },
                { label: "Diện tích (km²)", value: formatNumericValue(props.dienTichTuNhien, 2) },
            ];
        case "GiaoThong_line":
            return [
                { label: "Tên đường", value: formatValue(props.tenDuong) },
                { label: "Chiều dài (m)", value: formatNumericValue(props.chieuDai, 2) },
            ];
        case "GiaoThong_polygon":
            return [
                { label: "Tên đường", value: formatValue(props.TenDuong) },
                { label: "Rộng (m)", value: formatNumericValue(props.DoRong, 2) },
                { label: "Dài (m)", value: formatNumericValue(props.ChieuDai, 2) },
                { label: "Kết cấu", value: formatValue(props.KetCau) },
                { label: "Tình trạng", value: formatValue(props.TinhTrang) },
                { label: "Cấp quản lý", value: formatValue(props.CapQuanLy) },
            ];
        case "ThuyHe_line":
            return [
                { label: "Tên sông/kênh", value: formatValue(props.Ten) },
                { label: "Điểm đầu", value: formatValue(props.DiemDau) },
                { label: "Điểm cuối", value: formatValue(props.DiemCuoi) },
                { label: "Chiều dài (m)", value: formatNumericValue(props.ChieuDai, 2) },
            ];
        case "ThuyHe_polygon":
            return [
                { label: "Tên", value: formatValue(props.Ten) },
                { label: "Phân loại", value: formatValue(props.phanLoai) },
                { label: "Trạng thái", value: formatValue(props.TrangThai) },
                { label: "Rộng (m)", value: formatNumericValue(props.DoRong, 2) },
                { label: "Sâu (m)", value: formatNumericValue(props.DoSau, 2) },
            ];
        case "HienTrangSDD_2020":
            return [
                { label: "Loại đất", value: formatValue(props.loaidat) },
                { label: "Ký hiệu", value: formatValue(props.kihieu1) },
            ];
        case "QuyHoachSDD_2030":
            return [
                { label: "Loại đất", value: formatValue(props.loaidat) },
                { label: "Phân loại", value: formatValue(props.phanloai) },
                { label: "Ký hiệu", value: formatValue(props.kihieu1) },
            ];
        case "CTTL_2023_Cong":
            return [
                { label: "Tên cống đập", value: formatValue(props.TenCongDap) },
                { label: "Lý trình", value: formatValue(props.LyTrinh) },
                { label: "Cụm công trình", value: formatValue(props.CumCongTrinh) },
                { label: "Loại công trình", value: formatValue(props.LoaiCongTrinh) },
                { label: "Hình thức", value: formatValue(props.HinhThuc) },
                { label: "Chiều dài (m)", value: formatNumericValue(props.ChieuDai, 2) },
                { label: "Đường kính (mm)", value: formatNumericValue(props.DuongKinh, 2) },
                { label: "Bề rộng (m)", value: formatNumericValue(props.BeRong, 2) },
                { label: "Chiều cao (m)", value: formatNumericValue(props.ChieuCao, 2) },
                { label: "Số cửa", value: formatNumericValue(props.SoCua, 0) },
                { label: "Cao trình đáy cống (m)", value: formatNumericValue(props.CaoTrinhDayCong, 2) },
                { label: "Cao trình đỉnh cống (m)", value: formatNumericValue(props.CaoTrinhDinhCong, 2) },
                { label: "Hình thức vận hành", value: formatValue(props.HinhThucVanHanh) },
                { label: "Mục tiêu nhiệm vụ", value: formatValue(props.MucTieuNhiemVu) },
                { label: "Diện tích phục vụ (ha)", value: formatNumericValue(props.DienTichPhucVu_ha, 2, "ha") },
                { label: "Năm sử dụng", value: formatValue(props.NamSuDung) },
                { label: "Cấp công trình", value: formatValue(props.CapCongTrinh) },
                { label: "Hệ thống công trình thủy lợi", value: formatValue(props.HeThongCongTrinhThuyLoi) },
                { label: "Đơn vị quản lý", value: formatValue(props.DonViQuanLy) },
                { label: "Năm cập nhật", value: formatValue(props.NamCapNhat) },
            ];
        case "CTTL_2023_DeBao_BoBao":
            return [
                { label: "Tên", value: formatValue(props.Ten) },
                { label: "Chiều dài (m)", value: formatNumericValue(props.ChieuDai, 2) },
                { label: "Cao trình đáy kênh (m)", value: formatNumericValue(props.CaoTrinhDayKenh, 2) },
                { label: "Bề rộng kênh (m)", value: formatNumericValue(props.BeRongKenh, 2) },
                { label: "Hệ số mái", value: formatNumericValue(props.HeSoMai, 2) },
                { label: "Cao trình bờ trái (m)", value: formatNumericValue(props.CaoTrinhBoTrai, 2) },
                { label: "Cao trình bờ phải (m)", value: formatNumericValue(props.CaoTrinhBoPhai, 2) },
                { label: "Bề rộng bờ trái (m)", value: formatNumericValue(props.BeRongBoTrai, 2) },
                { label: "Bề rộng bờ phải (m)", value: formatNumericValue(props.BeRongBoPhai, 2) },
                { label: "Hành lang bảo vệ", value: formatNumericValue(props.HanhLangBaoVe, 2) },
                { label: "Cấp công trình", value: formatValue(props.CapCongTrinh) },
                { label: "Kết cấu công trình", value: formatValue(props.KetCauCongTrinh) },
                { label: "Mục tiêu nhiệm vụ", value: formatValue(props.MucTieuNhiemVu) },
                { label: "Diện tích phục vụ (ha)", value: formatNumericValue(props.DienTichPhucVu, 2) },
                { label: "Năm sử dụng", value: formatValue(props.NamSuDung) },
                { label: "Hệ thống công trình thủy lợi", value: formatValue(props.HeThongCongTrinhThuyLoi) },
                { label: "Đơn vị quản lý", value: formatValue(props.DonViQuanLy) },
                { label: "Năm cập nhật", value: formatValue(props.NamCapNhat) },
            ];
        case "CTTL_2023_KenhMuong":
            return [
                { label: "Tên kênh mương", value: formatValue(props.TenKenhMuong) },
                { label: "Chiều dài (m)", value: formatNumericValue(props.ChieuDai, 2) },
                { label: "Cao trình đáy kênh (m)", value: formatNumericValue(props.CaoTrinhDayKenh, 2) },
                { label: "Bề rộng kênh (m)", value: formatNumericValue(props.BeRongKenh, 2) },
                { label: "Hệ số mái", value: formatNumericValue(props.HeSoMai, 2) },
                { label: "Cao trình bờ trái (m)", value: formatNumericValue(props.CaoTrinhBoTrai, 2) },
                { label: "Cao trình bờ phải (m)", value: formatNumericValue(props.CaoTrinhBoPhai, 2) },
                { label: "Bề rộng bờ trái (m)", value: formatNumericValue(props.BeRongBoTrai, 2) },
                { label: "Bề rộng bờ phải (m)", value: formatNumericValue(props.BeRongBoPhai, 2) },
                { label: "Hành lang bảo vệ", value: formatNumericValue(props.HanhLangBaoVe, 2) },
                { label: "Cấp công trình", value: formatValue(props.CapCongTrinh) },
                { label: "Kết cấu công trình", value: formatValue(props.KetCauCongTrinh) },
                { label: "Mục tiêu nhiệm vụ", value: formatValue(props.MucTieuNhiemVu) },
                { label: "Diện tích phục vụ (ha)", value: formatNumericValue(props.DienTichPhucVu, 2) },
                { label: "Năm sử dụng", value: formatValue(props.NamSuDung) },
                { label: "Hệ thống công trình thủy lợi", value: formatValue(props.HeThongCongTrinhThuyLoi) },
                { label: "Đơn vị quản lý", value: formatValue(props.DonViQuanLy) },
                { label: "Năm cập nhật", value: formatValue(props.NamCapNhat) },
            ];
        case "CTTL_2023_TramBom":
            return [
                { label: "Tên trạm bơm", value: formatValue(props.TenTramBom) },
                { label: "Loại", value: formatValue(props.Loai) },
                { label: "Công suất", value: formatNumericValue(props.CongSuat, 2) },
                { label: "Mục tiêu nhiệm vụ", value: formatValue(props.MucTieuNhiemVu) },
                { label: "Diện tích phục vụ", value: formatNumericValue(props.DienTichPhucVu_ha, 2, "ha") },
                { label: "Hệ thống công trình thủy lợi", value: formatValue(props.HeThongCongTrinhThuyLoi) },
                { label: "Năm sử dụng", value: formatValue(props.NamSuDung) },
                { label: "Đơn vị quản lý", value: formatValue(props.DonViQuanLy) },
            ];
        case "HoChuaThuongLuu":
            return [
                { label: "Ký hiệu", value: formatValue(props.KiHieu) },
                { label: "Tên hồ", value: formatValue(props.TenHo || props.name) },
                { label: "Kinh độ", value: formatValue(props.KinhDo || props.lng) },
                { label: "Vĩ độ", value: formatValue(props.ViDo || props.lat) },
                { label: "Yếu tố", value: formatValue(props.YeuTo) },
                { label: "Thời gian", value: formatValue(props.ThoiGian) },
                { label: "Tần suất", value: formatValue(props.TanSuat) },
            ];
        case "CTTL_2030_Vung_HeThong":
        case "CTTL_2030_NongThonMoi":
        case "CTTL_2030_NoiDong":
            return [
                { label: "Tên", value: formatValue(props.Ten) },
                { label: "Vùng thủy lợi", value: formatValue(props.VungThuyLoi) },
            ];
        case "CTTL_2030_VungThuyLoi":
            return [
                { label: "Vùng thủy lợi", value: formatValue(props.VungThuyLoi) },
                { label: "Mô tả", value: formatValue(props.MoTa) },
            ];
        default:
            return [];
    }
};

export const createLayerPopupContent = (layerName, props) => {
    const title = WMS_POPUP_TITLES[layerName] || layerName;

    if (layerName === "DiemDoCao") {
        return createMetricPopup(title, "Độ cao (m)", props?.docao_m ?? props?.DoCao ?? props?.docao ?? "-");
    }

    const rows = rowsForLayer(layerName, props);
    if (rows.length === 0) {
        return createPopupShell(
            title,
            `<div style="font-size: 14px; color: #64748b; padding: 4px 2px 2px;">Không có cấu hình hiển thị cho lớp này.</div>`,
        );
    }

    if (layerName.startsWith("CTTL_")) {
        return createFourColumnTablePopup(title, rows);
    }

    return createTablePopup(title, rows);
};
