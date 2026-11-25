// Logic cho bảng "BÁO CÁO NHANH ĐỘ MẶN" (markup ở createLegendControl - mapInitialization.js):
// luôn hiện, cho MỌI điểm đo mặn + trạm IoT, không cần chọn mốc thời gian:
//   - Độ mặn quan trắc GẦN NHẤT của đúng điểm/trạm đó (mốc giờ có thể khác nhau giữa các điểm/trạm).
//   - Độ mặn dự báo 10 ngày tới: với MỖI cấp rủi ro xuất hiện trong chuỗi dự báo, liệt kê khoảng giá
//     trị (nhỏ nhất/lớn nhất) và TẤT CẢ khoảng thời gian dự báo rơi vào đúng cấp đó (có thể nhiều
//     khoảng rời nhau trong 10 ngày).
// Bấm vào 1 dòng -> bản đồ pan/zoom tới ĐÚNG marker gốc (điểm đo mặn/trạm IoT đã render bởi
// SalinityMarkers.jsx / IoTMarkers.jsx - bật lớp tương ứng hộ nếu đang tắt) và mở popup ĐẦY ĐỦ có
// sẵn của marker đó, chứ không tạo/vẽ lại marker hay popup rút gọn riêng cho bảng này.
import {
    fetchForecastLatest,
    fetchSalinityTimelineTimes,
    fetchSalinityTimelineLatest,
} from "@components/map/mapDataServices";
import { getRiskBadgeMeta, getSingleStationClassification } from "@common/salinityClassification";

const escapeHtml = (text) =>
    String(text ?? "").replace(
        /[&<>"']/g,
        (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
    );

// "2026-11-13 22:00" -> "22:00 13/11/2026"
const formatObservedTime = (time) => {
    const matched = String(time).match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2})$/);
    return matched ? `${matched[4]} ${matched[3]}/${matched[2]}/${matched[1]}` : String(time);
};

const forecastTimeFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
});

// epoch ms -> "02:00 19/11/2026" (giờ VN)
const formatForecastTime = (epochMs) => {
    const [datePart, timePart] = forecastTimeFormatter.format(new Date(epochMs)).split(", ");
    return `${timePart} ${datePart}`;
};

const formatSalinity = (value) =>
    Number(value).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Trạm IoT phân cấp rủi ro theo mã gốc (CKC_IoT -> CKC), giống IoTMarkers.jsx.
const toClassificationCode = (code) => String(code || "").replace(/_IOT$/i, "");

// Thứ tự cố định + nhãn cột cho 4 cấp rủi ro (khớp getSingleStationClassification).
const RISK_LEVELS = [
    { level: "normal", label: "Bình thường" },
    { level: "warning", label: "Rủi ro cấp 1" },
    { level: "high-warning", label: "Rủi ro cấp 2" },
    { level: "critical", label: "Rủi ro cấp 3" },
];

// Gộp chuỗi dự báo (điểm đo mặn + trạm IoT) thành Map<code, [{time, value}]> đã sắp theo thời gian.
const buildForecastSeriesByCode = (payloads) => {
    const seriesByCode = new Map();

    payloads.forEach((payload) => {
        if (!Array.isArray(payload?.timeGrid) || !Array.isArray(payload?.stations)) return;

        payload.stations.forEach((station) => {
            const code = station.manualCode;
            if (!code) return;
            if (!seriesByCode.has(code)) seriesByCode.set(code, []);
            const series = seriesByCode.get(code);

            payload.timeGrid.forEach((isoTime, index) => {
                // Giá trị theo mốc 2 giờ; mốc nào thiếu thì dùng giá trị dự báo theo ngày.
                const rawValue = station.values?.[index] ?? station.dailyValues?.[index];
                if (rawValue === null || rawValue === undefined || rawValue === "") return;
                const value = Number(rawValue);
                if (!Number.isFinite(value)) return;
                const time = new Date(isoTime).getTime();
                if (Number.isNaN(time)) return;
                series.push({ time, value });
            });
        });
    });

    seriesByCode.forEach((series) => series.sort((a, b) => a.time - b.time));
    return seriesByCode;
};

// Chuỗi dự báo đã sắp theo thời gian -> theo từng cấp rủi ro: {min, max, intervals: [{start,end}]}.
// Các điểm LIÊN TIẾP cùng cấp được gộp thành 1 khoảng; đổi cấp (hoặc quay lại cấp cũ sau khi đổi) mở
// khoảng mới - nên 1 cấp có thể có NHIỀU khoảng rời nhau trong 10 ngày.
const groupForecastByRiskLevel = (series, classificationCode) => {
    const groups = {};
    let current = null;

    const flush = () => {
        if (!current) return;
        const bucket = groups[current.level] || { min: current.min, max: current.max, intervals: [] };
        bucket.min = Math.min(bucket.min, current.min);
        bucket.max = Math.max(bucket.max, current.max);
        bucket.intervals.push({ start: current.start, end: current.end });
        groups[current.level] = bucket;
    };

    series.forEach((point) => {
        const level = getSingleStationClassification(point.value, classificationCode).level;
        if (current && current.level === level) {
            current.end = point.time;
            current.min = Math.min(current.min, point.value);
            current.max = Math.max(current.max, point.value);
        } else {
            flush();
            current = { level, start: point.time, end: point.time, min: point.value, max: point.value };
        }
    });
    flush();

    return groups;
};

const renderEmptyRow = (icon, message) => `
    <tr>
        <td colspan="9" class="salinity-report-empty">
            <i class="fas ${icon}"></i> ${escapeHtml(message)}
        </td>
    </tr>
`;

const renderIntervals = (intervals) =>
    intervals
        .map((interval) => `Từ ${formatForecastTime(interval.start)} đến ${formatForecastTime(interval.end)}`)
        .join("; ");

const renderRiskCell = (bucket) => {
    if (!bucket) return `<td class="salinity-report-risk-cell salinity-report-risk-empty">-</td>`;
    return `
        <td class="salinity-report-risk-cell">
            <div class="salinity-report-risk-range">Khoảng độ mặn: ${formatSalinity(bucket.min)} - ${formatSalinity(bucket.max)} ‰</div>
            <div class="salinity-report-risk-time">Khoảng thời gian: ${renderIntervals(bucket.intervals)}</div>
        </td>
    `;
};

// 1 dòng báo cáo của 1 điểm/trạm.
const renderStationRow = (station) => {
    const { code, type, name, observed, forecastWindow, groups } = station;

    const observedCells = observed
        ? (() => {
              const badge = getRiskBadgeMeta(observed.value, toClassificationCode(code));
              return `
                <td>${escapeHtml(formatObservedTime(observed.time))}</td>
                <td>${formatSalinity(observed.value)} ‰</td>
                <td>
                    <span class="salinity-report-badge" style="color: ${badge.textColor}; background-color: ${badge.backgroundColor}">
                        ${escapeHtml(badge.description)}
                    </span>
                </td>
              `;
          })()
        : `<td colspan="3" class="salinity-report-empty-cell">Chưa có số liệu quan trắc</td>`;

    const windowCell = forecastWindow
        ? `<td>Từ ${formatForecastTime(forecastWindow.start)} đến ${formatForecastTime(forecastWindow.end)}</td>`
        : `<td class="salinity-report-empty-cell">Chưa có dự báo</td>`;

    const riskCells = RISK_LEVELS.map((item) => renderRiskCell(groups?.[item.level])).join("");

    return `
        <tr class="salinity-report-row" data-code="${escapeHtml(code)}" data-type="${escapeHtml(type)}" tabindex="0" role="button">
            <td class="salinity-report-col-station">
                <i class="fas ${type === "iot" ? "fa-tower-broadcast" : "fa-location-dot"}"
                   title="${type === "iot" ? "Trạm IoT" : "Điểm đo mặn"}"></i>
                ${escapeHtml(name)}${type === "iot" ? " (IoT)" : ""}
            </td>
            ${observedCells}
            ${windowCell}
            ${riskCells}
        </tr>
    `;
};

// Marker gốc (điểm đo mặn/trạm IoT) đã render trên map hay chưa - để không bật/gen lại nếu đã có.
const hasLayerOfType = (mapInstance, type) => {
    let found = false;
    mapInstance.eachLayer((layer) => {
        if (found) return;
        if (type === "iot") {
            if (layer.options?.isIoTStation || layer.isIoTStation) found = true;
        } else if (layer.options?.isSalinityPoint) {
            found = true;
        }
    });
    return found;
};

// Tìm đúng marker gốc theo mã điểm/trạm (KiHieu/station_code) trong các layer đã render bởi
// SalinityMarkers.jsx (pointCode) / IoTMarkers.jsx (stationData.station_code).
const findMarkerByCode = (mapInstance, code, type) => {
    let found = null;
    mapInstance.eachLayer((layer) => {
        if (found) return;
        if (type === "iot") {
            if (!(layer.options?.isIoTStation || layer.isIoTStation)) return;
            const stationCode = layer.stationData?.station_code ?? layer.options?.stationData?.station_code;
            if (stationCode === code) found = layer;
        } else if (layer.options?.isSalinityPoint && layer.options?.pointCode === code) {
            found = layer;
        }
    });
    return found;
};

// Trả về hàm cleanup. `ensureSalinityLayer`/`ensureIoTLayer`: do MapboxMap.jsx truyền vào, bật hộ lớp
// tương ứng (render marker + popup đầy đủ y hệt khi người dùng tự bật lớp) nếu đang tắt.
export const initSalinityStatsPanel = (mapInstance, { ensureSalinityLayer, ensureIoTLayer } = {}) => {
    const summaryEl = document.getElementById("salinity-report-summary");
    const bodyEl = document.getElementById("salinity-report-body");
    const refreshButton = document.getElementById("salinity-report-refresh");
    if (!mapInstance || !bodyEl) {
        return () => {};
    }

    let disposed = false;
    let loadRequestId = 0;
    // Trong lúc chờ render lớp gốc (fetch dữ liệu) tránh bấm nhiều lần gây render trùng marker.
    let salinityLayerPromise = null;
    let iotLayerPromise = null;

    const ensureLayer = (type) => {
        if (hasLayerOfType(mapInstance, type)) return Promise.resolve();
        if (type === "iot") {
            if (!iotLayerPromise) {
                iotLayerPromise = Promise.resolve(ensureIoTLayer?.()).finally(() => {
                    iotLayerPromise = null;
                });
            }
            return iotLayerPromise;
        }
        if (!salinityLayerPromise) {
            salinityLayerPromise = Promise.resolve(ensureSalinityLayer?.()).finally(() => {
                salinityLayerPromise = null;
            });
        }
        return salinityLayerPromise;
    };

    // Đóng khung overlay lại (y hệt bấm nút thu gọn) - gọi sau khi đã pan/zoom xong để người dùng
    // thấy ngay vị trí trên bản đồ thay vì bị khung che mất.
    const closeReportOverlay = () => {
        const container = document.getElementById("legend-container");
        const content = document.getElementById("legend-content");
        const toggleBtn = document.getElementById("legend-toggle");
        const toggleIcon = toggleBtn?.querySelector(".toggle-icon");
        const backdrop = document.getElementById("salinity-report-backdrop");
        if (!container || !content || !toggleBtn || !toggleIcon) return;

        container.classList.add("is-collapsed");
        content.style.display = "none";
        toggleIcon.textContent = "+";
        toggleBtn.setAttribute("aria-expanded", "false");
        toggleBtn.setAttribute("aria-label", "Xem báo cáo nhanh độ mặn");
        if (backdrop) backdrop.hidden = true;
    };

    // Bấm (hoặc Enter) vào 1 dòng -> bản đồ pan/zoom tới đúng điểm/trạm đó, mở popup ĐẦY ĐỦ có
    // sẵn của marker gốc (bật hộ lớp tương ứng nếu đang tắt), rồi đóng khung overlay lại để thấy
    // ngay vị trí trên bản đồ.
    const focusStation = async (code, type) => {
        await ensureLayer(type);
        if (disposed) return;

        const marker = findMarkerByCode(mapInstance, code, type);
        if (!marker) return;

        mapInstance.setView(marker.getLatLng(), Math.max(mapInstance.getZoom(), 15), { animate: true });
        marker.openPopup();
        closeReportOverlay();
    };

    const handleRowInteraction = (event) => {
        const row = event.target.closest?.(".salinity-report-row[data-code]");
        if (!row) return;
        if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") return;
        if (event.type === "keydown") event.preventDefault();
        focusStation(row.dataset.code, row.dataset.type);
    };

    bodyEl.addEventListener("click", handleRowInteraction);
    bodyEl.addEventListener("keydown", handleRowInteraction);

    const loadReport = async () => {
        const requestId = ++loadRequestId;
        bodyEl.innerHTML = renderEmptyRow("fa-spinner fa-spin", "Đang tải...");
        if (summaryEl) summaryEl.textContent = "";

        const [timeline, latestRows, salinityForecast, iotForecast] = await Promise.all([
            fetchSalinityTimelineTimes(),
            fetchSalinityTimelineLatest(),
            fetchForecastLatest(),
            fetchForecastLatest("iot"),
        ]);
        if (disposed || requestId !== loadRequestId) return;

        const stations = timeline.stations || [];
        if (stations.length === 0) {
            bodyEl.innerHTML = renderEmptyRow("fa-exclamation-circle", "Chưa có điểm đo mặn/trạm IoT nào");
            return;
        }

        const observedByCode = new Map(latestRows.map((row) => [row.code, row]));
        const forecastSeriesByCode = buildForecastSeriesByCode([salinityForecast, iotForecast]);

        const rows = stations
            .map((station) => {
                const observed = observedByCode.get(station.code) || null;
                const series = forecastSeriesByCode.get(station.code) || [];
                const forecastWindow = series.length
                    ? { start: series[0].time, end: series[series.length - 1].time }
                    : null;
                const groups = series.length
                    ? groupForecastByRiskLevel(series, toClassificationCode(station.code))
                    : null;

                return {
                    code: station.code,
                    type: station.type,
                    name: station.name,
                    observed,
                    forecastWindow,
                    groups,
                };
            })
            .sort((a, b) => {
                if (a.type !== b.type) return a.type === "manual" ? -1 : 1;
                return a.name.localeCompare(b.name, "vi");
            });

        bodyEl.innerHTML = rows.map(renderStationRow).join("");

        const observedCount = rows.filter((row) => row.observed).length;
        if (summaryEl) {
            summaryEl.innerHTML = `<i class="fas fa-list-check"></i> ${observedCount}/${rows.length} điểm/trạm có số liệu quan trắc <span class="salinity-report-hint">(bấm vào 1 dòng để xem vị trí trên bản đồ)</span>`;
        }
    };

    refreshButton?.addEventListener("click", loadReport);

    loadReport();

    return () => {
        disposed = true;
        bodyEl.removeEventListener("click", handleRowInteraction);
        bodyEl.removeEventListener("keydown", handleRowInteraction);
        refreshButton?.removeEventListener("click", loadReport);
    };
};
