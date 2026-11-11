import L from "leaflet";
import { dmsToDecimal } from "@components/convertDMSToDecimal";
import { fetchReservoirPoints, fetchReservoirOverview } from "@components/map/mapDataServices";
import { getReservoirIcon } from "@components/map/mapMarkers";

const escapeHtml = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");

const escapeJsString = (value) =>
    String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/\n/g, " ")
        .replace(/\r/g, " ");

const getStationCode = (station = {}) => {
    return String(station?.KiHieu || station?.kiHieu || station?.station_code || station?.code || "").trim();
};

const getStationName = (station = {}) => {
    return String(station?.TenHo || station?.tenHo || station?.station_name || station?.name || "").trim();
};

const getStationField = (station = {}, keys = []) => {
    for (const key of keys) {
        const value = station?.[key];
        if (value !== null && value !== undefined && String(value).trim() !== "") {
            return String(value).trim();
        }
    }
    return "--";
};

const normalizeCoordinate = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;

    const raw = String(value).trim();
    if (!raw) return null;

    const numeric = Number.parseFloat(raw.replace(",", "."));
    if (Number.isFinite(numeric) && /^-?\d+(\.\d+)?$/.test(raw.replace(",", "."))) {
        return numeric;
    }

    return dmsToDecimal(raw);
};

// dd/mm/yyyy (không kèm giờ)
const formatDate = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);

    return parsed.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
};

const formatReservoirValue = (value) => {
    const numeric = Number.parseFloat(value);
    if (!Number.isFinite(numeric)) return "--";
    return numeric.toFixed(3).replace(".", ",");
};

// Giá trị và ngày mới nhất lấy từ dòng đầu của /reservoir-overview (sắp xếp "Ngày" DESC)
const createReservoirPopup = ({ station, overview }) => {
    const code = getStationCode(station) || "N/A";
    const name = getStationName(station) || code;

    const latestRow = overview?.data?.[0];
    const latestValue = latestRow?.TongLuongXa ?? overview?.latest_value ?? null;
    const latestDate = latestRow?.Ngày ?? latestRow?.Ngay ?? latestRow?.date ?? null;

    const safeCodeForAction = escapeJsString(code);
    const safeNameForAction = escapeJsString(name);
    const longitudeText = getStationField(station, ["KinhDo", "kinhdo", "longitude", "lng"]);
    const latitudeText = getStationField(station, ["ViDo", "vido", "latitude", "lat"]);
    const frequencyText = getStationField(station, ["TanSuat", "tanSuat", "frequency"]);
    const factorText = getStationField(station, ["YeuTo", "yeuTo", "factor"]);
    const latestDateText = formatDate(latestDate);

    // Thời gian: <ngày cũ nhất> - <ngày mới nhất>
    const startDateText = formatDate(overview?.start_time);
    const endDateText = formatDate(overview?.end_time) || latestDateText;
    const periodText =
        startDateText && endDateText
            ? `${startDateText} - ${endDateText}`
            : getStationField(station, ["ThoiGian", "thoiGian", "period"]);

    return `
        <div class="modern-popup hydromet-popup enhanced reservoir-popup">
            <div class="popup-header">
                <div class="popup-title">
                    <h4 class="popup-name">${name}</h4>
                    <span class="popup-type">Hồ chứa thượng lưu</span>
                </div>
            </div>

            <div class="popup-content">
                <div class="popup-main-value">
                    <span class="value-label">Tổng lượng xả</span>
                    <span class="value-number" style="color: #1d4ed8;">${formatReservoirValue(latestValue)} (m³/s)</span>
                    <span class="value-date">${latestDateText || "Chưa có dữ liệu"}</span>
                </div>

                <div class="popup-details mt-3">
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-content">
                                <strong class="detail-label">Mã hồ chứa:</strong>
                                <span class="detail-value">${escapeHtml(code)}</span>
                            </div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-content">
                                <strong class="detail-label">Tên hồ chứa:</strong>
                                <span class="detail-value">${escapeHtml(name)}</span>
                            </div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-content">
                                <strong class="detail-label">Kinh độ:</strong>
                                <span class="detail-value">${escapeHtml(longitudeText)}</span>
                            </div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-content">
                                <strong class="detail-label">Vĩ độ:</strong>
                                <span class="detail-value">${escapeHtml(latitudeText)}</span>
                            </div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-content">
                                <strong class="detail-label">Tần suất:</strong>
                                <span class="detail-value">${escapeHtml(frequencyText)}</span>
                            </div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-content">
                                <strong class="detail-label">Thời gian:</strong>
                                <span class="detail-value">${escapeHtml(periodText)}</span>
                            </div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-content">
                                <strong class="detail-label">Yếu tố:</strong>
                                <span class="detail-value">${escapeHtml(factorText)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="popup-actions">
                    <button
                        type="button"
                        class="action-btn primary"
                        onclick="window.openReservoirDetails && window.openReservoirDetails('${safeCodeForAction}', '${safeNameForAction}', 'chart')"
                    >
                        Xem dữ liệu chi tiết
                    </button>
                </div>
            </div>
        </div>
    `;
};

export const renderReservoirPoints = async (mapInstance) => {
    if (!mapInstance) return;

    try {
        // Chỉ tải danh sách điểm hồ; số liệu được lấy khi người dùng bấm vào từng hồ
        const points = await fetchReservoirPoints();

        for (const point of points) {
            const code = getStationCode(point);
            if (!code) continue;

            const lat = normalizeCoordinate(point?.ViDo || point?.vido || point?.latitude || point?.lat);
            const lng = normalizeCoordinate(point?.KinhDo || point?.kinhdo || point?.longitude || point?.lng);

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                continue;
            }

            const marker = L.marker([lat, lng], {
                isReservoirPoint: true,
                icon: getReservoirIcon(),
                pane: "hydrometMarkerPane",
                zIndexOffset: 1000,
            }).addTo(mapInstance);

            const stationName = getStationName(point) || code;
            marker.bindTooltip(stationName, {
                permanent: true,
                direction: "top",
                offset: [-1, -9],
                className: "custom-tooltip enhanced-tooltip station-tooltip",
                pane: "hydrometTooltipPane",
            });

            marker.on("click", async () => {
                marker.bindPopup(
                    '<div class="popup-loading"><i class="fa-solid fa-spinner fa-spin"></i><p>Đang tải dữ liệu hồ chứa...</p></div>',
                    {
                        maxWidth: 360,
                        className: "custom-popup enhanced-popup",
                    },
                );
                marker.openPopup();

                // Popup chỉ cần dòng mới nhất (+ khoảng thời gian do API tính sẵn)
                const overview = await fetchReservoirOverview(code, { limit: 1 });

                const popupHtml = createReservoirPopup({
                    station: point,
                    overview,
                });

                marker.bindPopup(popupHtml, {
                    maxWidth: 360,
                    className: "custom-popup enhanced-popup",
                });
                marker.openPopup();
            });
        }
    } catch (error) {
        console.error("Error rendering reservoir points:", error);
    }
};
