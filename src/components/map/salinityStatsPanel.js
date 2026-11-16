// Logic cho bảng "THỐNG KÊ DỮ LIỆU ĐO MẶN" (markup ở createLegendControl - mapInitialization.js):
// - Listbox "thời điểm quan trắc": mọi mốc có số liệu của điểm đo mặn + trạm IoT (mới -> cũ)
// - Listbox "thời điểm dự báo": mọi mốc của chuỗi dự báo mới nhất (điểm đo mặn + trạm IoT)
// Chọn 1 mốc -> liệt kê độ mặn kèm mức rủi ro của các điểm/trạm có số liệu ở mốc đó, đồng thời bản đồ
// chuyển sang CHẾ ĐỘ LỌC THEO THỜI GIAN: mọi lớp đang bật tạm ẩn (MapboxMap.jsx - timeFilterActive),
// chỉ còn các điểm/trạm có số liệu ở mốc đó, màu theo giá trị tại mốc. Bỏ chọn cả 2 listbox (hoặc bấm
// "Bỏ lọc") -> các lớp hiện lại như cũ.
import L from "leaflet";
import { convertDMSToDecimal } from "@components/convertDMSToDecimal";
import {
    fetchForecastLatest,
    fetchSalinityTimelineTimes,
    fetchSalinityTimelineValues,
} from "@components/map/mapDataServices";
import { getRiskBadgeMeta, getSingleStationClassification } from "@common/salinityClassification";
import { getSalinityIcon } from "@components/map/mapMarkers";
import {
    buildValueBoxHtml,
    getSalinityTooltipClass,
    statusColorFromLevel,
} from "@components/map/SalinityMarkers";
import { getIoTIcon, getIoTTooltipClass } from "@components/map/IoTMarkers";

const VN_TIMEZONE = "Asia/Ho_Chi_Minh";
const PLACEHOLDER_OPTION = '<option value="">— Chọn thời điểm —</option>';

const escapeHtml = (text) =>
    String(text ?? "").replace(
        /[&<>"']/g,
        (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
    );

// "2026-11-13 23:00" -> "13/11/2026 23:00"
const formatObservedTime = (time) => {
    const matched = String(time).match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2})$/);
    return matched ? `${matched[3]}/${matched[2]}/${matched[1]} ${matched[4]}` : String(time);
};

const forecastTimeFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: VN_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
});

// epoch ms -> "13/11/2026 23:00" (giờ VN)
const formatForecastTime = (epochMs) => forecastTimeFormatter.format(new Date(epochMs)).replace(",", "");

const formatSalinity = (value) =>
    Number(value).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Trạm IoT phân cấp rủi ro theo mã gốc (CKC_IoT -> CKC), giống IoTMarkers.jsx.
const toClassificationCode = (code) => String(code || "").replace(/_IOT$/i, "");

const renderEmptyState = (container, icon, message) => {
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas ${icon}"></i>
            <p>${escapeHtml(message)}</p>
        </div>
    `;
};

const renderLoading = (container) => {
    container.innerHTML = `
        <div class="empty-state">
            <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
            <p>Đang tải...</p>
        </div>
    `;
};

// rows: [{ code, type: "manual" | "iot", value }]
const renderRows = (container, rows, stationNames) => {
    const sorted = rows
        .map((row) => ({ ...row, name: stationNames[row.code] || row.code }))
        .sort((a, b) => {
            if (a.type !== b.type) return a.type === "manual" ? -1 : 1;
            return a.name.localeCompare(b.name, "vi");
        });

    container.innerHTML = `
        <ul class="salinity-stat-list">
            ${sorted
                .map((row) => {
                    const badge = getRiskBadgeMeta(row.value, toClassificationCode(row.code));
                    return `
                        <li class="salinity-stat-row">
                            <span class="salinity-stat-name" title="${escapeHtml(row.name)}">
                                <i class="fas ${row.type === "iot" ? "fa-tower-broadcast" : "fa-location-dot"}"
                                   title="${row.type === "iot" ? "Trạm IoT" : "Điểm đo mặn"}"></i>
                                ${escapeHtml(row.name)}
                            </span>
                            <span class="salinity-stat-value">${formatSalinity(row.value)} ‰</span>
                            <span class="salinity-stat-risk"
                                  style="color: ${badge.textColor}; background-color: ${badge.backgroundColor}">
                                ${escapeHtml(badge.description)}
                            </span>
                        </li>
                    `;
                })
                .join("")}
        </ul>
    `;
};

// Gộp 2 chuỗi dự báo (điểm đo mặn + trạm IoT, lưới thời gian riêng) thành: epoch ms -> rows
const buildForecastTimeline = (payloads) => {
    const timeline = new Map();

    payloads.forEach(({ payload, type }) => {
        if (!Array.isArray(payload?.timeGrid) || !Array.isArray(payload?.stations)) return;

        payload.timeGrid.forEach((isoTime, index) => {
            const epochMs = new Date(isoTime).getTime();
            if (Number.isNaN(epochMs)) return;

            payload.stations.forEach((station) => {
                // Giá trị theo mốc 2 giờ; mốc nào thiếu thì dùng giá trị dự báo theo ngày.
                const rawValue = station.values?.[index] ?? station.dailyValues?.[index];
                if (rawValue === null || rawValue === undefined || rawValue === "") return;
                const value = Number(rawValue);
                if (!Number.isFinite(value)) return;

                if (!timeline.has(epochMs)) timeline.set(epochMs, []);
                timeline.get(epochMs).push({ code: station.manualCode, type, value });
            });
        });
    });

    return timeline;
};

// Cùng tên pane/zIndex với SalinityMarkers.jsx, IoTMarkers.jsx (có thể chưa được tạo nếu 2 lớp đó
// chưa từng bật).
const ensureResultPanes = (mapInstance) => {
    [
        ["salinityMarkerPane", 620],
        ["salinityTooltipPane", 621],
        ["iotMarkerPane", 630],
        ["iotTooltipPane", 631],
    ].forEach(([name, zIndex]) => {
        if (!mapInstance.getPane(name)) mapInstance.createPane(name);
        mapInstance.getPane(name).style.zIndex = String(zIndex);
    });
};

const buildResultPopup = ({ station, row, classification, sourceLabel, timeLabel }) => `
    <div class="modern-popup salinity-popup">
        <div class="popup-header">
            <div class="popup-title">
                <h4 class="popup-name">${escapeHtml(station.name)}</h4>
                <span class="popup-type">${row.type === "iot" ? "Trạm IoT" : "Điểm đo mặn"}</span>
            </div>
            <div class="popup-status status-${classification.level}">${classification.shortText}</div>
        </div>
        <div class="popup-content">
            <div class="popup-value-row">
                ${buildValueBoxHtml({
                    boxClass: "popup-main-value",
                    label: `ĐỘ MẶN ${sourceLabel}`,
                    valueText: `${formatSalinity(row.value)} ‰`,
                    statusColor: statusColorFromLevel(classification.level),
                    dateText: timeLabel,
                })}
            </div>
        </div>
    </div>
`;

// Vẽ các điểm/trạm có số liệu ở mốc đang lọc vào layerGroup riêng của bảng thống kê.
const renderResultMarkers = ({ mapInstance, layerGroup, rows, stations, sourceLabel, timeLabel }) => {
    layerGroup.clearLayers();
    ensureResultPanes(mapInstance);

    rows.forEach((row) => {
        const station = stations[row.code];
        const lat = convertDMSToDecimal(station?.latitude);
        const lng = convertDMSToDecimal(station?.longitude);
        if (!station || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

        const isIoT = row.type === "iot";
        const classificationCode = toClassificationCode(row.code);
        const classification = getSingleStationClassification(row.value, classificationCode);
        const icon = isIoT
            ? getIoTIcon("active", 1, classification.class)
            : getSalinityIcon(row.value, classificationCode);
        const tooltipClass = isIoT
            ? `${getIoTTooltipClass("active", 1, classification.class)} station-tooltip iot-tooltip`
            : `${getSalinityTooltipClass(row.value, classificationCode)} station-tooltip`;

        L.marker([lat, lng], {
            icon,
            isTimeFilterResult: true,
            pane: isIoT ? "iotMarkerPane" : "salinityMarkerPane",
            zIndexOffset: isIoT ? 3000 : 2000,
        })
            .bindTooltip(`${escapeHtml(station.name)}: ${formatSalinity(row.value)} ‰`, {
                permanent: true,
                direction: "top",
                offset: [0, -10],
                className: tooltipClass,
                pane: isIoT ? "iotTooltipPane" : "salinityTooltipPane",
            })
            .bindPopup(buildResultPopup({ station, row, classification, sourceLabel, timeLabel }), {
                maxWidth: 300,
                className: "custom-popup",
            })
            .addTo(layerGroup);
    });
};

// Trả về hàm cleanup.
export const initSalinityStatsPanel = (mapInstance, { onFilterActiveChange } = {}) => {
    const observedSelect = document.getElementById("stats-observed-time");
    const observedList = document.getElementById("stats-observed-list");
    const forecastSelect = document.getElementById("stats-forecast-time");
    const forecastList = document.getElementById("stats-forecast-list");
    const filterBar = document.getElementById("stats-filter-bar");
    const filterClearButton = document.getElementById("stats-filter-clear");
    if (!mapInstance || !observedSelect || !observedList || !forecastSelect || !forecastList) {
        return () => {};
    }

    const resultLayer = L.layerGroup().addTo(mapInstance);

    let disposed = false;
    let observedRequestId = 0;
    let stationNames = {};
    let stations = {}; // code -> { name, type, latitude, longitude }
    let forecastTimeline = new Map();
    // Số liệu đang hiển thị của từng nguồn + nguồn được chọn SAU CÙNG (nguồn đó quyết định bản đồ).
    const selection = { observed: null, forecast: null, last: null };
    const SOURCE_LABELS = { observed: "QUAN TRẮC", forecast: "DỰ BÁO" };
    const getTimeLabel = (source) => {
        const select = source === "forecast" ? forecastSelect : observedSelect;
        return select.selectedOptions[0]?.textContent || "";
    };

    const syncMap = () => {
        const order = selection.last === "forecast" ? ["forecast", "observed"] : ["observed", "forecast"];
        const activeSource = order.find((source) => selection[source]) || null;

        if (activeSource) {
            renderResultMarkers({
                mapInstance,
                layerGroup: resultLayer,
                rows: selection[activeSource],
                stations,
                sourceLabel: SOURCE_LABELS[activeSource],
                timeLabel: getTimeLabel(activeSource),
            });
        } else {
            resultLayer.clearLayers();
        }

        if (filterBar) filterBar.hidden = !activeSource;
        onFilterActiveChange?.(Boolean(activeSource));

        observedSelect.closest(".stats-block")?.classList.toggle("is-on-map", activeSource === "observed");
        forecastSelect.closest(".stats-block")?.classList.toggle("is-on-map", activeSource === "forecast");
    };

    const handleObservedChange = async () => {
        const time = observedSelect.value;
        const requestId = ++observedRequestId;
        selection.last = "observed";

        if (!time) {
            selection.observed = null;
            renderEmptyState(observedList, "fa-clock", "Chọn thời điểm để xem số liệu");
            syncMap();
            return;
        }

        renderLoading(observedList);
        const rows = await fetchSalinityTimelineValues(time);
        if (disposed || requestId !== observedRequestId) return;

        if (!rows) {
            selection.observed = null;
            renderEmptyState(
                observedList,
                "fa-triangle-exclamation",
                "Không tải được số liệu. Vui lòng thử lại.",
            );
        } else if (rows.length === 0) {
            selection.observed = null;
            renderEmptyState(
                observedList,
                "fa-exclamation-circle",
                `Không có số liệu lúc ${formatObservedTime(time)}`,
            );
        } else {
            selection.observed = rows;
            renderRows(observedList, rows, stationNames);
        }
        syncMap();
    };

    const handleForecastChange = () => {
        const epochMs = forecastSelect.value;
        selection.last = "forecast";

        const rows = epochMs ? forecastTimeline.get(Number(epochMs)) || [] : null;
        if (!rows) {
            selection.forecast = null;
            renderEmptyState(forecastList, "fa-clock", "Chọn thời điểm để xem số liệu");
        } else if (rows.length === 0) {
            selection.forecast = null;
            renderEmptyState(forecastList, "fa-exclamation-circle", "Không có số liệu dự báo ở mốc này");
        } else {
            selection.forecast = rows;
            renderRows(forecastList, rows, stationNames);
        }
        syncMap();
    };

    const handleClearFilter = () => {
        observedRequestId += 1;
        observedSelect.value = "";
        forecastSelect.value = "";
        selection.observed = null;
        selection.forecast = null;
        renderEmptyState(observedList, "fa-clock", "Chọn thời điểm để xem số liệu");
        renderEmptyState(forecastList, "fa-clock", "Chọn thời điểm để xem số liệu");
        syncMap();
    };

    observedSelect.addEventListener("change", handleObservedChange);
    forecastSelect.addEventListener("change", handleForecastChange);
    filterClearButton?.addEventListener("click", handleClearFilter);

    const loadOptions = async () => {
        const [timeline, salinityForecast, iotForecast] = await Promise.all([
            fetchSalinityTimelineTimes(),
            fetchForecastLatest(),
            fetchForecastLatest("iot"),
        ]);
        if (disposed) return;

        stations = timeline.stations.reduce((accumulator, station) => {
            accumulator[station.code] = station;
            return accumulator;
        }, {});
        stationNames = timeline.stations.reduce((accumulator, station) => {
            accumulator[station.code] = station.name;
            return accumulator;
        }, {});

        observedSelect.innerHTML =
            PLACEHOLDER_OPTION +
            timeline.times
                .map((time) => `<option value="${escapeHtml(time)}">${formatObservedTime(time)}</option>`)
                .join("");
        observedSelect.disabled = timeline.times.length === 0;
        if (timeline.times.length === 0) {
            renderEmptyState(observedList, "fa-exclamation-circle", "Chưa có số liệu quan trắc");
        }

        forecastTimeline = buildForecastTimeline([
            { payload: salinityForecast, type: "manual" },
            { payload: iotForecast, type: "iot" },
        ]);
        const forecastTimes = [...forecastTimeline.keys()].sort((a, b) => b - a);
        forecastSelect.innerHTML =
            PLACEHOLDER_OPTION +
            forecastTimes
                .map((epochMs) => `<option value="${epochMs}">${formatForecastTime(epochMs)}</option>`)
                .join("");
        forecastSelect.disabled = forecastTimes.length === 0;
        if (forecastTimes.length === 0) {
            renderEmptyState(forecastList, "fa-exclamation-circle", "Chưa có dữ liệu dự báo");
        }
    };

    loadOptions();

    return () => {
        disposed = true;
        observedSelect.removeEventListener("change", handleObservedChange);
        forecastSelect.removeEventListener("change", handleForecastChange);
        filterClearButton?.removeEventListener("click", handleClearFilter);
        resultLayer.remove();
        onFilterActiveChange?.(false);
    };
};
