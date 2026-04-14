import L from "leaflet";
import { dmsToDecimal } from "@components/convertDMSToDecimal";
import {
    fetchReservoirPoints,
    fetchReservoirOverview,
    fetchReservoirData,
    fetchReservoirLatest,
} from "@components/map/mapDataServices";
import { getReservoirIcon } from "@components/map/mapMarkers";

const escapeHtml = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");

const normalizeUrl = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    return null;
};

const toShortSourceText = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "--";

    const url = normalizeUrl(raw);
    if (url) {
        try {
            const hostname = new URL(url).hostname.replace(/^www\./i, "");
            return hostname.length > 22 ? `${hostname.slice(0, 22)}...` : hostname;
        } catch {
            // Fallback to plain shortening below
        }
    }

    return raw.length > 22 ? `${raw.slice(0, 22)}...` : raw;
};

const escapeJsString = (value) =>
    String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/\n/g, " ")
        .replace(/\r/g, " ");

const toArray = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.results)) return payload.results;
    return [];
};

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

const formatDateTime = (value) => {
    if (!value) return "Chưa có dữ liệu";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);

    return parsed.toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const formatReservoirValue = (value) => {
    const numeric = Number.parseFloat(value);
    if (!Number.isFinite(numeric)) return "--";
    return numeric.toFixed(3);
};

const createReservoirPopup = ({ station, latestRecord, overview, dataCount }) => {
    const code = getStationCode(station) || "N/A";
    const name = getStationName(station) || code;

    const latestValue =
        latestRecord?.latest_value ??
        latestRecord?.TongLuongXa ??
        overview?.latest_value ??
        overview?.data?.[0]?.TongLuongXa ??
        null;

    const latestDate =
        latestRecord?.Ngày ??
        latestRecord?.Ngay ??
        latestRecord?.date ??
        overview?.data?.[0]?.Ngày ??
        overview?.data?.[0]?.Ngay ??
        overview?.data?.[0]?.date ??
        null;

    const source = latestRecord?.latest_source || overview?.latest_source || overview?.data?.[0]?.NguonDuLieu || "--";
    const sourceUrl = normalizeUrl(source);
    const sourceText = toShortSourceText(source);
    const totalRecords = Number(overview?.total_records ?? dataCount ?? 0);
    const safeCodeForAction = escapeJsString(code);
    const safeNameForAction = escapeJsString(name);
    const longitudeText = getStationField(station, ["KinhDo", "kinhdo", "longitude", "lng"]);
    const latitudeText = getStationField(station, ["ViDo", "vido", "latitude", "lat"]);
    const frequencyText = getStationField(station, ["TanSuat", "tanSuat", "frequency"]);
    const periodText = getStationField(station, ["ThoiGian", "thoiGian", "period"]);
    const factorText = getStationField(station, ["YeuTo", "yeuTo", "factor"]);

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
                    <span class="value-label">Giá trị</span>
                    <span class="value-number" style="color: #1d4ed8;">${formatReservoirValue(latestValue)} (m³/s)</span>
                    <span class="value-date">${formatDateTime(latestDate)}</span>
                </div>

                <div class="popup-details mt-3">
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-content">
                                <strong class="detail-label">Ký hiệu:</strong>
                                <span class="detail-value">${escapeHtml(code)}</span>
                            </div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-content">
                                <strong class="detail-label">Tên hồ:</strong>
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
                        <div class="detail-item">
                            <div class="detail-content">
                                <strong class="detail-label">Tổng bản ghi:</strong>
                                <span class="detail-value">${Number.isFinite(totalRecords) ? totalRecords.toLocaleString("vi-VN") : "--"}</span>
                            </div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-content">
                                <strong class="detail-label">Nguồn dữ liệu:</strong>
                                ${
                                    sourceUrl
                                        ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer" class="detail-link">${escapeHtml(sourceText)}</a>`
                                        : `<span class="detail-value">${escapeHtml(sourceText)}</span>`
                                }
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
                        <i class="btn-icon">📊</i>
                        Xem chi tiết dữ liệu
                    </button>
                </div>
            </div>
        </div>
    `;
};

export const renderReservoirPoints = async (mapInstance) => {
    if (!mapInstance) return;

    try {
        const [points, latestPayload] = await Promise.all([fetchReservoirPoints(), fetchReservoirLatest()]);

        const latestRows = toArray(latestPayload);
        const latestByCode = latestRows.reduce((acc, row) => {
            const code = getStationCode(row);
            if (code) {
                acc[code] = row;
            }
            return acc;
        }, {});

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

            const initialPopupHtml = createReservoirPopup({
                station: point,
                latestRecord: latestByCode[code],
                overview: null,
                dataCount: latestByCode[code]?.total_records,
            });

            marker.bindPopup(initialPopupHtml, {
                maxWidth: 360,
                className: "custom-popup enhanced-popup",
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

                const [overview, tableRows] = await Promise.all([
                    fetchReservoirOverview(code, { limit: 5 }),
                    fetchReservoirData(code),
                ]);

                const popupHtml = createReservoirPopup({
                    station: point,
                    latestRecord: latestByCode[code],
                    overview,
                    dataCount: Array.isArray(tableRows) ? tableRows.length : 0,
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
