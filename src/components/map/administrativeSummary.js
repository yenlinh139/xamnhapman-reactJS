import axiosInstance from "@config/axios-config";
import { formatVNDate, formatVNHour } from "@common/vnDateTime";

export const ADMIN_LAYER_LEVELS = {
    DiaPhanHuyen: "huyen",
    DiaPhanXa: "xa",
};

const summaryRequests = new Map();

export const fetchAdministrativeSummary = (level, code) => {
    const key = `${level}:${code}`;
    if (!summaryRequests.has(key)) {
        const request = axiosInstance
            .get("/administrative/summary", { params: { level, code } })
            .then((response) => response.data)
            .catch((error) => {
                summaryRequests.delete(key);
                throw error;
            });
        summaryRequests.set(key, request);
    }
    return summaryRequests.get(key);
};

const escapeHtml = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

const formatNumber = (value, digits = 2) =>
    Number(value).toLocaleString("vi-VN", { minimumFractionDigits: digits, maximumFractionDigits: digits });

// Mốc thời gian API trả về: "YYYY-MM-DD" (theo ngày), "YYYY-MM-DDTHH:mm:ss" (giờ VN, không offset)
// hoặc ISO có offset (dự báo)
export const formatSummaryTime = (time, resolution) => {
    if (!time) return "";
    if (resolution === "day") {
        const [year, month, day] = String(time).slice(0, 10).split("-");
        return `${day}/${month}/${year}`;
    }
    const withOffset = /([+-]\d{2}:\d{2}|Z)$/.test(time) ? time : `${time}+07:00`;
    return `${formatVNHour(withOffset)} ${formatVNDate(withOffset)}`;
};

const TREND_META = {
    up: { symbol: "▲", label: "tăng", color: "#dc3545" },
    down: { symbol: "▼", label: "giảm", color: "#198754" },
    flat: { symbol: "■", label: "không đổi", color: "#6c757d" },
};

const renderTrend = (trend, unit) => {
    if (!trend) return "";
    const meta = TREND_META[trend.direction] || TREND_META.flat;
    const amount = trend.direction === "flat" ? "" : ` ${formatNumber(Math.abs(trend.delta))} ${escapeHtml(unit)}`;
    return `<span style="color: ${meta.color}; white-space: nowrap;"> | ${meta.symbol} ${meta.label}${amount}</span>`;
};

const SECTION_TITLE_STYLE =
    "font-size: 13px; font-weight: 700; color: #1f2937; text-transform: uppercase; margin: 12px 0 2px;";
const LINE_STYLE = "font-size: 13px; color: #374151; line-height: 1.55; padding-left: 10px;";
const MUTED_STYLE = "font-size: 12px; color: #6b7280;";

const renderStationLine = (label, stations) => {
    const names = stations.map((station) => escapeHtml(station.name || station.code)).join(", ");
    return `<div style="${LINE_STYLE}">- <strong>${stations.length}</strong> ${label}${names ? `: ${names}` : ""}</div>`;
};

const renderMeasureSection = (title, observation, emptyText) => {
    if (!observation) {
        return `
            <div style="${SECTION_TITLE_STYLE}">${title}</div>
            <div style="${LINE_STYLE} color: #6b7280;">${emptyText}</div>
        `;
    }

    const unit = observation.unit || "";
    const safeUnit = escapeHtml(unit);
    const timeLabel = observation.resolution === "day" ? "ngày" : "giờ";
    return `
        <div style="${SECTION_TITLE_STYLE}">${title}</div>
        <div style="${MUTED_STYLE} padding-left: 10px;">(${timeLabel} ${formatSummaryTime(observation.time, observation.resolution)} · ${observation.count} điểm/trạm có số liệu)</div>
        <div style="${LINE_STYLE}">- Trung bình: <strong>${formatNumber(observation.mean)} ${safeUnit}</strong>${renderTrend(observation.trend, unit)}</div>
        <div style="${LINE_STYLE}">- Lớn nhất: ${formatNumber(observation.max)} ${safeUnit} | Nhỏ nhất: ${formatNumber(observation.min)} ${safeUnit}</div>
    `;
};

export const ADMIN_SUMMARY_LOADING_HTML = `
    <div style="${MUTED_STYLE} padding: 12px 2px 2px;">Đang tải số liệu quan trắc trong địa bàn...</div>
`;

export const ADMIN_SUMMARY_ERROR_HTML = `
    <div style="${MUTED_STYLE} padding: 12px 2px 2px;">Không tải được số liệu quan trắc trong địa bàn.</div>
`;

export const buildAdministrativeSummaryHtml = (summary) => {
    const { stations, level, unit } = summary;
    const hasSalinitySource = stations.salinity.length > 0 || stations.iot.length > 0;

    return `
        <div style="${SECTION_TITLE_STYLE}">${stations.total} trạm đo</div>
        ${renderStationLine("điểm đo mặn", stations.salinity)}
        ${renderStationLine("điểm đo mưa", stations.rain)}
        ${renderStationLine("trạm khí tượng", stations.meteorology)}
        ${renderStationLine("trạm thủy văn", stations.hydrology)}
        ${renderStationLine("trạm IoT", stations.iot)}
        ${renderMeasureSection(
            "Độ mặn dự báo",
            summary.salinityForecast,
            hasSalinitySource ? "Chưa có số liệu dự báo" : "Không có điểm đo mặn trong địa bàn",
        )}
        ${renderMeasureSection(
            "Độ mặn quan trắc",
            summary.salinityObserved,
            hasSalinitySource ? "Chưa có số liệu quan trắc" : "Không có điểm đo mặn, trạm IoT trong địa bàn",
        )}
        ${renderMeasureSection("Mực nước quan trắc", summary.waterLevel, "Không có trạm đo mực nước trong địa bàn")}
        ${renderMeasureSection("Lượng mưa quan trắc", summary.rainfall, "Không có điểm đo mưa trong địa bàn")}
        ${
            stations.total > 0
                ? `<div style="text-align: center; margin-top: 14px;">
                    <button
                        type="button"
                        onclick="window.openAdministrativeDashboard && window.openAdministrativeDashboard('${escapeHtml(level)}', '${escapeHtml(unit.code)}')"
                        style="border: none; background: #2f8cff; color: #fff; font-size: 13px; font-weight: 600; padding: 8px 18px; border-radius: 8px; cursor: pointer;"
                    >Xem dữ liệu chi tiết</button>
                </div>`
                : ""
        }
    `;
};
