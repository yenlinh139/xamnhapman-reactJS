// Logic cho bảng "THỐNG KÊ DỮ LIỆU ĐO MẶN" (markup ở createLegendControl - mapInitialization.js):
// - Listbox "thời điểm quan trắc": mọi mốc có số liệu của điểm đo mặn + trạm IoT (mới -> cũ)
// - Listbox "thời điểm dự báo": mọi mốc của chuỗi dự báo mới nhất (điểm đo mặn + trạm IoT)
// Chọn 1 mốc -> liệt kê độ mặn kèm mức rủi ro của các điểm/trạm có số liệu ở mốc đó. Bấm vào 1 dòng
// -> bản đồ pan/zoom tới ĐÚNG marker gốc (điểm đo mặn/trạm IoT đã render bởi SalinityMarkers.jsx /
// IoTMarkers.jsx - bật lớp tương ứng hộ nếu đang tắt) và mở popup ĐẦY ĐỦ có sẵn của marker đó, chứ
// không tạo/vẽ lại marker hay popup rút gọn riêng cho bảng này.
import {
    fetchForecastLatest,
    fetchSalinityTimelineTimes,
    fetchSalinityTimelineValues,
} from "@components/map/mapDataServices";
import { getRiskBadgeMeta } from "@common/salinityClassification";

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
    timeZone: "Asia/Ho_Chi_Minh",
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

// rows: [{ code, type: "manual" | "iot", value }]. totalStations: tổng số điểm/trạm đã biết, để
// hiện "X/Y trạm có số liệu" - giúp thấy ngay mức độ bao phủ của mốc đang chọn.
const renderRows = (container, rows, stationNames, totalStations) => {
    const sorted = rows
        .map((row) => ({ ...row, name: stationNames[row.code] || row.code }))
        .sort((a, b) => {
            if (a.type !== b.type) return a.type === "manual" ? -1 : 1;
            return a.name.localeCompare(b.name, "vi");
        });

    const summaryHtml = totalStations
        ? `
            <div class="salinity-stat-summary">
                <i class="fas fa-list-check"></i>
                <strong>${sorted.length}/${totalStations}</strong> điểm/trạm có số liệu
                <span class="salinity-stat-summary-hint">(bấm vào 1 dòng để xem vị trí trên bản đồ)</span>
            </div>
        `
        : "";

    container.innerHTML = `
        ${summaryHtml}
        <ul class="salinity-stat-list">
            ${sorted
                .map((row) => {
                    const badge = getRiskBadgeMeta(row.value, toClassificationCode(row.code));
                    return `
                        <li
                            class="salinity-stat-row"
                            data-code="${escapeHtml(row.code)}"
                            data-type="${escapeHtml(row.type)}"
                            tabindex="0"
                            role="button"
                        >
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
    const observedSelect = document.getElementById("stats-observed-time");
    const observedList = document.getElementById("stats-observed-list");
    const forecastSelect = document.getElementById("stats-forecast-time");
    const forecastList = document.getElementById("stats-forecast-list");
    const filterBar = document.getElementById("stats-filter-bar");
    const filterClearButton = document.getElementById("stats-filter-clear");
    if (!mapInstance || !observedSelect || !observedList || !forecastSelect || !forecastList) {
        return () => {};
    }

    let disposed = false;
    let observedRequestId = 0;
    let stationNames = {};
    let forecastTimeline = new Map();
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

    const updateFilterBar = () => {
        if (!filterBar) return;
        filterBar.hidden = !observedSelect.value && !forecastSelect.value;
    };

    // Bấm (hoặc Enter) vào 1 dòng trong danh sách -> bản đồ pan/zoom tới đúng điểm/trạm đó và mở popup
    // ĐẦY ĐỦ có sẵn của marker gốc (bật hộ lớp tương ứng nếu đang tắt), giúp xác định ngay vị trí thay
    // vì phải tự dò trên bản đồ.
    const focusStation = async (code, type) => {
        await ensureLayer(type);
        if (disposed) return;

        const marker = findMarkerByCode(mapInstance, code, type);
        if (!marker) return;

        mapInstance.setView(marker.getLatLng(), Math.max(mapInstance.getZoom(), 15), { animate: true });
        marker.openPopup();
    };

    const handleObservedChange = async () => {
        const time = observedSelect.value;
        const requestId = ++observedRequestId;
        updateFilterBar();

        if (!time) {
            renderEmptyState(observedList, "fa-clock", "Chọn thời điểm để xem số liệu");
            return;
        }

        renderLoading(observedList);
        const rows = await fetchSalinityTimelineValues(time);
        if (disposed || requestId !== observedRequestId) return;

        if (!rows) {
            renderEmptyState(
                observedList,
                "fa-triangle-exclamation",
                "Không tải được số liệu. Vui lòng thử lại.",
            );
        } else if (rows.length === 0) {
            renderEmptyState(
                observedList,
                "fa-exclamation-circle",
                `Không có số liệu lúc ${formatObservedTime(time)}`,
            );
        } else {
            renderRows(observedList, rows, stationNames, Object.keys(stationNames).length);
        }
    };

    const handleForecastChange = () => {
        const epochMs = forecastSelect.value;
        updateFilterBar();

        const rows = epochMs ? forecastTimeline.get(Number(epochMs)) || [] : null;
        if (!rows) {
            renderEmptyState(forecastList, "fa-clock", "Chọn thời điểm để xem số liệu");
        } else if (rows.length === 0) {
            renderEmptyState(forecastList, "fa-exclamation-circle", "Không có số liệu dự báo ở mốc này");
        } else {
            renderRows(forecastList, rows, stationNames, Object.keys(stationNames).length);
        }
    };

    const handleClearFilter = () => {
        observedRequestId += 1;
        observedSelect.value = "";
        forecastSelect.value = "";
        renderEmptyState(observedList, "fa-clock", "Chọn thời điểm để xem số liệu");
        renderEmptyState(forecastList, "fa-clock", "Chọn thời điểm để xem số liệu");
        updateFilterBar();
    };

    const handleListInteraction = (event) => {
        const row = event.target.closest?.(".salinity-stat-row[data-code]");
        if (!row) return;
        if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") return;
        if (event.type === "keydown") event.preventDefault();
        focusStation(row.dataset.code, row.dataset.type);
    };

    observedSelect.addEventListener("change", handleObservedChange);
    forecastSelect.addEventListener("change", handleForecastChange);
    filterClearButton?.addEventListener("click", handleClearFilter);
    observedList.addEventListener("click", handleListInteraction);
    observedList.addEventListener("keydown", handleListInteraction);
    forecastList.addEventListener("click", handleListInteraction);
    forecastList.addEventListener("keydown", handleListInteraction);

    const loadOptions = async () => {
        const [timeline, salinityForecast, iotForecast] = await Promise.all([
            fetchSalinityTimelineTimes(),
            fetchForecastLatest(),
            fetchForecastLatest("iot"),
        ]);
        if (disposed) return;

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
        observedList.removeEventListener("click", handleListInteraction);
        observedList.removeEventListener("keydown", handleListInteraction);
        forecastList.removeEventListener("click", handleListInteraction);
        forecastList.removeEventListener("keydown", handleListInteraction);
    };
};
