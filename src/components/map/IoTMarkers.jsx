import React from "react";
import L from "leaflet";
import { convertDMSToDecimal } from "@components/convertDMSToDecimal";
import IoTCongAnHaImage from "@assets/IoT_CongAnHa.jpg";
import IoTCongKenhCImage from "@assets/IoT_CongKenhC.jpg";
import IoTCongVuonThomImage from "@assets/IoT_CongVuonThom.jpg";
import {
    fetchIoTStations,
    fetchIoTData,
    normalizeIoTDataRows,
    fetchForecastLatest,
} from "@components/map/mapDataServices";
import { getSingleStationClassification } from "@common/salinityClassification";
import {
    buildForecastLookup,
    buildValueBoxHtml,
    buildTrendMeta,
    statusColorFromLevel,
    formatForecastTime,
    formatForecastDateOnly,
    formatDecimalDisplay,
} from "@components/map/SalinityMarkers";

// Trạm IoT nào có mã trạm độ mặn tương ứng (manualCode) thì dùng chung API dự báo
// (/forecast-latest) của điểm đo mặn đó - sau này nhóm AI sẽ có API dự báo IoT riêng, nhưng thuộc
// tính/giá trị trả về vẫn theo đúng quy tắc này nên map lại là dùng được ngay.
export const IOT_STATION_FORECAST_MAP = {
    CAH_IoT: "KXAH",
    CKC_IoT: "CKC",
};

const ensureStationPanes = (mapInstance) => {
    const paneConfigs = [
        ["hydrometMarkerPane", 610],
        ["hydrometTooltipPane", 611],
        ["salinityMarkerPane", 620],
        ["salinityTooltipPane", 621],
        ["iotMarkerPane", 630],
        ["iotTooltipPane", 631],
    ];

    paneConfigs.forEach(([name, zIndex]) => {
        if (!mapInstance.getPane(name)) {
            mapInstance.createPane(name);
        }
        mapInstance.getPane(name).style.zIndex = String(zIndex);
    });
};

const getIoTRowsFromResponse = (response) => {
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.dataPoints)) return response.dataPoints;
    if (Array.isArray(response?.rows)) return response.rows;
    if (Array.isArray(response?.result?.data)) return response.result.data;
    return [];
};

const buildIoTChartPayload = (station, iotResponse) => {
    const rawRows = getIoTRowsFromResponse(iotResponse);
    const normalizedRows = normalizeIoTDataRows(rawRows);

    // Merge (không ghi đè hoàn toàn): /iot/data/:serial co the tra ve "station" thieu mot so field
    // (vd station_code, start_time) so voi station list item goc - merge de khong bi mat du lieu
    // qua moi lan fetch (tung gay bug: hasForecast bi "chop tat" giua 2 lan render do thieu
    // station_code).
    const stationInfo = { ...station, ...(iotResponse?.station || {}) };
    const stationName =
        stationInfo?.station_name || station?.station_name || station?.stationName || "Trạm IoT";
    const serialNumber =
        stationInfo?.serial_number || stationInfo?.serial || station?.serial_number || station?.serial || "";

    return {
        stationInfo,
        stationName,
        serialNumber,
        stationCode: stationInfo?.station_code || station?.station_code || "",
        dataPoints: normalizedRows,
        data: normalizedRows,
        summary: {
            totalRecords: iotResponse?.count || normalizedRows.length,
            totalRecordsInRange: normalizedRows.length,
            totalRecordsAll: parseInt(stationInfo?.total_records || station?.total_records || 0),
            rangeLabel: "toàn bộ chuỗi số liệu",
            firstRecord: normalizedRows[0]?.Date || null,
            lastRecord: normalizedRows[normalizedRows.length - 1]?.Date || null,
        },
    };
};

// Map classification class to popup/icon styles with stronger colors for better visibility
const RISK_CLASS_MAP = {
    normal: {
        statusClass: "status-normal",
        color: "#228b22",
        accentColor: "#16a34a",
        glowColor: "rgba(34, 139, 34, 0.62)",
        shadowColor: "rgba(21, 128, 61, 0.36)",
    },
    warning: {
        statusClass: "status-warning",
        color: "#d97706",
        accentColor: "#f59e0b",
        glowColor: "rgba(217, 119, 6, 0.62)",
        shadowColor: "rgba(180, 83, 9, 0.36)",
    },
    "high-warning": {
        statusClass: "status-high-warning",
        color: "#c2410c",
        accentColor: "#ea580c",
        glowColor: "rgba(194, 65, 12, 0.62)",
        shadowColor: "rgba(154, 52, 18, 0.36)",
    },
    critical: {
        statusClass: "status-critical",
        color: "#b91c1c",
        accentColor: "#ef4444",
        glowColor: "rgba(185, 28, 28, 0.64)",
        shadowColor: "rgba(153, 27, 27, 0.38)",
    },
    "no-data": {
        statusClass: "status-no-data",
        color: "#6b7280",
        accentColor: "#9ca3af",
        glowColor: "rgba(107, 114, 128, 0.55)",
        shadowColor: "rgba(75, 85, 99, 0.35)",
    },
};

const getLatestIoTSaltValue = (station) => {
    const rawValue =
        station?.latest_hour_avg_salt ??
        station?.latest_salt_value ??
        station?.salt_value ??
        station?.latest_value ??
        station?.value ??
        station?.salinity ??
        station?.do_man ??
        station?.DoMan ??
        null;

    if (rawValue === null || rawValue === undefined || rawValue === "" || rawValue === "NULL") {
        return null;
    }

    const normalized = String(rawValue).replace(",", ".");
    const numeric = Number.parseFloat(normalized);
    return Number.isFinite(numeric) ? numeric : null;
};

const LOCAL_IOT_STATION_IMAGES = {
    CKC: [IoTCongKenhCImage],
    CAH: [IoTCongAnHaImage],
    CVT: [IoTCongVuonThomImage],
    default: [IoTCongKenhCImage],
};

const normalizeStationCode = (stationCode) => {
    return String(stationCode || "")
        .toUpperCase()
        .replace(/_IOT$/i, "")
        .trim();
};

const inferStationCodeFromName = (stationName) => {
    const normalizedName = String(stationName || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    if (normalizedName.includes("kenh c")) return "CKC";
    if (normalizedName.includes("an ha")) return "KXAH";
    if (normalizedName.includes("vuon thom")) return "COT";
    return "";
};

const getIoTStationImages = (station = {}) => {
    const baseCode =
        normalizeStationCode(station?.station_code || station?.StationCode) ||
        inferStationCodeFromName(station?.station_name || station?.StationName);

    return LOCAL_IOT_STATION_IMAGES[baseCode] || LOCAL_IOT_STATION_IMAGES.default;
};

const renderIoTImageContainer = (station) => {
    const images = getIoTStationImages(station);

    if (images.length === 0) {
        return `
            <div class="iot-image-container">
                <div class="iot-image-empty">
                    <i class="fa-regular fa-image"></i>
                    <span>Chưa có ảnh trạm</span>
                </div>
            </div>
        `;
    }

    const mainImage = images[0];
    const thumbnails = images
        .map(
            (imageUrl, index) => `
                <button
                    type="button"
                    class="iot-image-thumb ${index === 0 ? "active" : ""}"
                    data-image-src="${imageUrl}"
                    aria-label="Ảnh trạm ${index + 1}"
                >
                    <img src="${imageUrl}" alt="Ảnh trạm ${index + 1}" loading="lazy" />
                </button>
            `,
        )
        .join("");

    return `
        <div class="iot-image-container">
            <div class="iot-image-main-wrap">
                <img class="iot-image-main" src="${mainImage}" alt="Ảnh trạm IoT" loading="lazy" />
            </div>
            ${images.length > 1 ? `<div class="iot-image-thumbs">${thumbnails}</div>` : ""}
        </div>
    `;
};

// Create custom IoT icon using the same risk palette as the salinity markers.
export const getIoTIcon = (status, totalRecords, riskClass = "no-data") => {
    const normalizedRiskClass = String(riskClass || "no-data");
    const riskStyle = RISK_CLASS_MAP[normalizedRiskClass] || RISK_CLASS_MAP["no-data"];
    const hasValueBasedRisk = normalizedRiskClass !== "no-data";
    const isInactive =
        !hasValueBasedRisk &&
        (String(status || "").toLowerCase() === "inactive" || Number(totalRecords || 0) <= 0);

    const markerStyle = hasValueBasedRisk ? riskStyle : RISK_CLASS_MAP["no-data"];
    const markerStateClass = isInactive ? "inactive" : "active";

    return L.divIcon({
        className: "custom-iot-marker",
        html: `
            <div class="iot-marker-container">
                <div
                    class="iot-marker ${markerStateClass}"
                    style="--risk-color: ${markerStyle.color}; --risk-accent-color: ${markerStyle.accentColor}; --risk-glow-color: ${markerStyle.glowColor}; --risk-shadow-color: ${markerStyle.shadowColor};"
                >
                    <div class="iot-icon">
                        <i class="fa-solid fa-tower-broadcast"></i>
                    </div>
                    <div class="iot-signal">
                        <div class="signal-ring ring-1"></div>
                        <div class="signal-ring ring-2"></div>
                        <div class="signal-ring ring-3"></div>
                    </div>
                </div>
            </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15],
    });
};

const toYMD = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

// Mặc định lấy TOÀN BỘ chuỗi số liệu của trạm (không chỉ 14 ngày gần nhất) - khớp với cách popup
// hiển thị "Thời gian: <start> - <end>" là cả chuỗi. Vẫn nhẹ vì dùng groupBy=hour khi fetch (xem
// window.openIoTChartDetails bên dưới) thay vì lấy dữ liệu thô 5 phút/lần.
const getFullDataRange = (startTime, lastDataTime) => {
    const end = lastDataTime ? new Date(lastDataTime) : new Date();
    const start = startTime ? new Date(startTime) : null;

    const fallbackEnd = Number.isNaN(end.getTime()) ? new Date() : end;
    const fallbackStart =
        start && !Number.isNaN(start.getTime())
            ? start
            : (() => {
                  const d = new Date(fallbackEnd);
                  d.setDate(d.getDate() - 14);
                  return d;
              })();

    return {
        startDate: toYMD(fallbackStart),
        endDate: toYMD(fallbackEnd),
    };
};

// Create IoT station popup - Lấy dữ liệu từ API thực tế
// forecastInfo/forecastMeta/classificationValue: dùng chung quy tắc hiển thị dự báo với điểm đo mặn
// (xem buildForecastLookup/renderSalinityPoints trong SalinityMarkers.jsx) - trạm IoT nào có
// manualCode tương ứng (IOT_STATION_FORECAST_MAP) mới có 2 khung dự báo.
export const createIoTPopup = (
    station,
    forecastInfo = null,
    forecastMeta = null,
    classificationValue = null,
) => {
    const stationSerial = String(
        station?.serial_number ?? station?.serialNumber ?? station?.serial ?? station?.serial_no ?? "",
    ).trim();
    const hasSerial = stationSerial !== "";

    const mainMetricUnit =
        station?.display_metric_unit || station?.metric_unit || station?.latest_salt_unit || "‰";

    // Latest/previous hourly salinity values
    const latestSaltValue = getLatestIoTSaltValue(station);
    const previousSaltValueRaw =
        station?.previous_hour_avg_salt ??
        station?.previousHourAvgSalt ??
        station?.prev_hour_avg_salt ??
        station?.previous_salt_value ??
        station?.previousSaltValue ??
        station?.prev_salt_value ??
        station?.prev_value;
    const previousSaltValue =
        previousSaltValueRaw !== null && previousSaltValueRaw !== undefined && previousSaltValueRaw !== ""
            ? parseFloat(previousSaltValueRaw)
            : null;
    const hasSaltValue = Number.isFinite(latestSaltValue);

    // Previous day salinity average (optional summary field)
    const previousDayAvgRaw =
        station?.previous_day_avg_salt ?? station?.previousDayAvgSalt ?? station?.prev_day_avg_salt;
    const previousDayAvgSalt =
        previousDayAvgRaw !== null && previousDayAvgRaw !== undefined && previousDayAvgRaw !== ""
            ? parseFloat(previousDayAvgRaw)
            : null;
    const previousDaySaltDisplay = Number.isFinite(previousDayAvgSalt)
        ? `${formatDecimalDisplay(previousDayAvgSalt, 2)} ${mainMetricUnit}`
        : "--";

    // Format latest hour end time
    const latestTime = station.latest_hour_end_time
        ? new Date(station.latest_hour_end_time).toLocaleString("vi-VN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
          })
        : "Chưa có dữ liệu";

    // Format previous hour end time (optional)
    const previousHourEndTime = station?.previous_hour_end_time || station?.previousHourEndTime;
    const previousHourLabel = previousHourEndTime
        ? new Date(previousHourEndTime).toLocaleString("vi-VN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
          })
        : "Giờ liền trước";

    const baseStationCode = normalizeStationCode(station?.station_code || station?.StationCode);

    // Nhãn trạng thái ở header + màu icon: ưu tiên mốc dự báo gần nhất trong tương lai (nếu có);
    // nếu không thì dùng quan trắc gần nhất (classificationValue do renderIoTStations tính sẵn).
    const valueForClassification = Number.isFinite(Number(classificationValue))
        ? Number(classificationValue)
        : latestSaltValue;
    const classification = getSingleStationClassification(valueForClassification, baseStationCode);
    const riskStatusClass = `status-${classification.level}`;
    const riskColor = statusColorFromLevel(classification.level);

    // Get format coordinates
    const lngDecimal = convertDMSToDecimal(station?.longitude);
    const latDecimal = convertDMSToDecimal(station?.latitude);
    const latDisplay = Number.isFinite(latDecimal)
        ? formatDecimalDisplay(latDecimal, 6)
        : station.latitude || "Không xác định";
    const lngDisplay = Number.isFinite(lngDecimal)
        ? formatDecimalDisplay(lngDecimal, 6)
        : station.longitude || "Không xác định";

    const stationCode = station.station_code || "N/A";
    const stationName = station.station_name || "Trạm IoT";

    const totalRecordsText = Number.isFinite(Number(station?.total_records))
        ? Number(station.total_records).toLocaleString("vi-VN")
        : "--";

    const formatDateTime = (dateStr) => {
        const date = new Date(dateStr);

        const pad = (n) => n.toString().padStart(2, "0");

        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        const day = pad(date.getDate());
        const month = pad(date.getMonth() + 1);
        const year = date.getFullYear();

        return `${hours}:${minutes} ${day}/${month}/${year}`;
    };

    const startTime = formatDateTime(station.start_time);
    const endTime = formatDateTime(station.end_time);
    // Giá trị quan trắc hiển thị luôn là trung bình GIỜ (latest_hour_avg_salt/previous_hour_avg_salt
    // từ backend - xem iot.controller.js), không phải tần suất gửi dữ liệu thô của cảm biến
    // (station.frequency, vd "5 phút") - nên ghi rõ "(1 giờ)" thay vì tần suất thô của trạm.
    const frequencyText = "1 giờ";

    // 2 khung dự báo (2h / ngày) - chỉ trạm có manualCode tương ứng (IOT_STATION_FORECAST_MAP) mới có
    let boxesHtml = "";
    const forecastSalinity = Number(forecastInfo?.salinity);
    if (forecastInfo && Number.isFinite(forecastSalinity)) {
        const salinityClass = getSingleStationClassification(forecastSalinity, baseStationCode);
        const dailySalinity = Number(forecastInfo?.dailySalinity);
        const dailyClass = Number.isFinite(dailySalinity)
            ? getSingleStationClassification(dailySalinity, baseStationCode)
            : null;

        const trend2h = buildTrendMeta(forecastSalinity, forecastInfo.previousSalinity);
        const trendDaily = Number.isFinite(dailySalinity)
            ? buildTrendMeta(dailySalinity, forecastInfo.previousDailySalinity)
            : null;

        const rangeText =
            forecastMeta?.firstTime && forecastMeta?.lastTime
                ? `Thời gian: ${formatForecastTime(forecastMeta.firstTime)} - ${formatForecastTime(forecastMeta.lastTime)}`
                : "";
        const totalForecastText = Number.isFinite(forecastMeta?.totalRecords)
            ? forecastMeta.totalRecords.toLocaleString("vi-VN")
            : "";

        const box2hHtml = buildValueBoxHtml({
            boxClass: "popup-forecast-value",
            label: "ĐỘ MẶN DỰ BÁO (2 GIỜ)",
            valueText: `${formatDecimalDisplay(forecastSalinity, 2)} ‰`,
            statusColor: salinityClass ? statusColorFromLevel(salinityClass.level) : riskColor,
            dateText: formatForecastTime(forecastInfo.time),
            trend: trend2h,
            previousDateText: forecastInfo.previousTime ? formatForecastTime(forecastInfo.previousTime) : "",
            totalRecordsText: totalForecastText,
            rangeText,
        });

        const boxDailyHtml = Number.isFinite(dailySalinity)
            ? buildValueBoxHtml({
                  boxClass: "popup-forecast-value",
                  label: "ĐỘ MẶN DỰ BÁO (NGÀY)",
                  valueText: `${formatDecimalDisplay(dailySalinity, 2)} ‰`,
                  statusColor: dailyClass ? statusColorFromLevel(dailyClass.level) : riskColor,
                  dateText: formatForecastDateOnly(forecastInfo.time),
                  trend: trendDaily,
                  previousDateText: forecastInfo.previousDailyTime
                      ? formatForecastDateOnly(forecastInfo.previousDailyTime)
                      : "",
                  totalRecordsText: totalForecastText,
                  rangeText,
              })
            : "";

        boxesHtml = `${box2hHtml}${boxDailyHtml}`;
    }

    const quanTracTrend = buildTrendMeta(latestSaltValue, previousSaltValue);
    const quanTracBoxHtml = buildValueBoxHtml({
        boxClass: "popup-main-value",
        label: `ĐỘ MẶN QUAN TRẮC (${frequencyText})`,
        valueText: hasSaltValue ? `${formatDecimalDisplay(latestSaltValue, 2)} ${mainMetricUnit}` : "N/A",
        statusColor: riskColor,
        dateText: latestTime,
        trend: quanTracTrend,
        previousDateText: previousHourLabel,
        totalRecordsText,
        rangeText: `Thời gian: ${startTime} - ${endTime}`,
    });

    return `
        <div class="modern-popup salinity-popup iot-popup">
            <div class="popup-header">
                <div class="popup-title">
                    <h4 class="popup-name">${stationName}</h4>
                    <span class="popup-type">Trạm IoT</span>
                </div>
                <div class="popup-status ${riskStatusClass}">
                    ${classification.shortText}
                </div>
            </div>

            <div class="popup-content">
                <div class="popup-value-row${boxesHtml ? " double" : ""}">${boxesHtml}${quanTracBoxHtml}</div>

                <div class="popup-details">
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-content py-1">
                                <strong class="detail-label">Mã trạm: </strong>
                                <span class="detail-value">${stationCode}</span>
                            </div>
                        </div>

                        <div class="detail-item">
                            <div class="detail-content py-1">
                                <strong class="detail-label">Kinh độ: </strong>
                                <span class="detail-value">${lngDisplay}</span>
                            </div>
                        </div>

                        <div class="detail-item">
                            <div class="detail-content py-1">
                                <strong class="detail-label">Vĩ độ: </strong>
                                <span class="detail-value">${latDisplay}</span>
                            </div>
                        </div>
                    </div>
                </div>

                ${
                    hasSerial
                        ? `
                    <div class="popup-actions">
                        <button
                            type="button"
                            class="action-btn primary btn-view-data"
                            data-serial="${stationSerial}"
                            data-name="${stationName}"
                            onclick="(window.openSearchIoTChart && window.openSearchIoTChart(this.getAttribute('data-serial'))) || (window.openIoTChartDetails && window.openIoTChartDetails(this.getAttribute('data-serial')))"
                        >
                            Xem dữ liệu chi tiết
                        </button>
                    </div>
                `
                        : ""
                }
            </div>
        </div>
    `;
};

// Get IoT tooltip class by risk level (used to color station name label)
export const getIoTTooltipClass = (_status, _totalRecords, riskClass = "no-data") => {
    const normalizedRiskClass = String(riskClass || "no-data");

    if (normalizedRiskClass === "normal") {
        return "custom-tooltip tooltip-normal";
    }
    if (normalizedRiskClass === "warning") {
        return "custom-tooltip tooltip-warning";
    }
    if (normalizedRiskClass === "high-warning") {
        return "custom-tooltip tooltip-high-warning";
    }
    if (normalizedRiskClass === "critical") {
        return "custom-tooltip tooltip-critical";
    }
    return "custom-tooltip tooltip-no-data";
};

// Main function to render IoT stations on map
export const renderIoTStations = async (mapInstance, setIotData) => {
    try {
        ensureStationPanes(mapInstance);

        const [stationsResponse, forecastPayload] = await Promise.all([
            fetchIoTStations(),
            fetchForecastLatest(),
        ]);

        if (!stationsResponse.success || !stationsResponse.data) {
            console.warn("⚠️ No IoT stations data received", stationsResponse);
            return;
        }

        const forecastLookup = buildForecastLookup(forecastPayload);
        const stations = stationsResponse.data;
        const stationMapBySerial = new Map();

        stations.forEach((stationItem) => {
            const serial = String(
                stationItem?.serial_number ??
                    stationItem?.serialNumber ??
                    stationItem?.serial ??
                    stationItem?.serial_no ??
                    "",
            ).trim();
            if (serial) {
                stationMapBySerial.set(serial, stationItem);
            }
        });

        window.openIoTChartDetails = async (serialInput) => {
            const serial = String(serialInput || "").trim();
            if (!serial) return;

            const matchedStation = stationMapBySerial.get(serial);
            if (!matchedStation) return;

            try {
                const fallbackPayload = buildIoTChartPayload(matchedStation, { success: true, data: [] });
                if (typeof setIotData === "function") {
                    setIotData(fallbackPayload);
                }
                if (typeof window.onOpenIoTChart === "function") {
                    window.onOpenIoTChart(fallbackPayload);
                }

                const { startDate, endDate } = getFullDataRange(
                    matchedStation.start_time,
                    matchedStation.latest_hour_end_time ||
                        matchedStation.last_data_time ||
                        matchedStation.end_time,
                );
                const iotResponse = await fetchIoTData(serial, {
                    startDate,
                    endDate,
                    groupBy: "hour",
                });
                const chartPayload = buildIoTChartPayload(matchedStation, iotResponse);

                if (typeof setIotData === "function") {
                    setIotData(chartPayload);
                }
                if (typeof window.onOpenIoTChart === "function") {
                    window.onOpenIoTChart(chartPayload);
                }
            } catch (error) {
                console.error("❌ Error khi mở modal IoT:", error);
                alert("Có lỗi khi mở biểu đồ IoT");
            }
        };

        const latLngs = [];

        for (const station of stations) {
            // Convert DMS coordinates to decimal
            const lat = convertDMSToDecimal(station.latitude);
            const lng = convertDMSToDecimal(station.longitude);

            if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
                console.warn(`⚠️ Không thể chuyển tọa độ tại trạm ${station.station_name}`, {
                    latitude: station.latitude,
                    longitude: station.longitude,
                    convertedLat: lat,
                    convertedLng: lng,
                });
                continue;
            }

            // Mau icon/tooltip/badge: uu tien moc du bao 2h gan nhat trong TUONG LAI (neu con, va
            // tram co manualCode tuong ung); neu khong thi dung quan trac gan nhat (cung quy tac
            // nhu diem do man - xem renderSalinityPoints trong SalinityMarkers.jsx).
            const forecastManualCode = IOT_STATION_FORECAST_MAP[station.station_code];
            const forecastInfo = forecastManualCode
                ? forecastLookup.stations[forecastManualCode] || null
                : null;
            const forecastSalinityValue = Number(forecastInfo?.salinity);
            const latestSaltValue = getLatestIoTSaltValue(station);
            const classificationValue =
                forecastLookup.hasFutureForecast && Number.isFinite(forecastSalinityValue)
                    ? forecastSalinityValue
                    : latestSaltValue;
            const baseStationCode = normalizeStationCode(station?.station_code);
            const riskInfo = getSingleStationClassification(classificationValue, baseStationCode);
            const icon = getIoTIcon(station.status, station.total_records, riskInfo.class);
            const tooltipClass = getIoTTooltipClass(station.status, station.total_records, riskInfo.class);

            const marker = L.marker([lat, lng], {
                icon,
                isIoTStation: true,
                stationData: station,
                pane: "iotMarkerPane",
                zIndexOffset: 3000,
            });

            // Add to map first
            marker.addTo(mapInstance);

            // Set custom properties after adding to map
            marker.isIoTStation = true;
            marker.stationData = station;

            latLngs.push([lat, lng]);

            // Add permanent tooltip
            marker.bindTooltip(station.station_name, {
                permanent: true,
                direction: "top",
                offset: [0, -10],
                className: `${tooltipClass} station-tooltip iot-tooltip`,
                pane: "iotTooltipPane",
            });

            const popupHTML = createIoTPopup(station, forecastInfo, forecastLookup, classificationValue);
            marker.bindPopup(popupHTML, {
                maxWidth: forecastInfo ? 440 : 380,
                className: "custom-popup iot-custom-popup",
                autoClose: true,
                closeOnClick: false,
            });

            marker.on("popupopen", (event) => {
                const popupElement = event?.popup?.getElement?.();
                if (popupElement) {
                    L.DomEvent.disableClickPropagation(popupElement);
                    L.DomEvent.disableScrollPropagation(popupElement);
                }
                const mainImage = popupElement?.querySelector(".iot-image-main");
                const imageThumbs = popupElement?.querySelectorAll(".iot-image-thumb") || [];

                imageThumbs.forEach((thumbButton) => {
                    thumbButton.onclick = () => {
                        const nextImage = thumbButton.getAttribute("data-image-src");
                        if (!mainImage || !nextImage) return;

                        mainImage.src = nextImage;
                        imageThumbs.forEach((item) => item.classList.remove("active"));
                        thumbButton.classList.add("active");
                    };
                });

                const btnViewData = popupElement?.querySelector(".btn-view-data");
                const stationSerial = String(
                    station?.serial_number ??
                        station?.serialNumber ??
                        station?.serial ??
                        station?.serial_no ??
                        btnViewData?.getAttribute("data-serial") ??
                        "",
                ).trim();

                if (!btnViewData || !stationSerial) {
                    return;
                }

                btnViewData.onclick = async (clickEvent) => {
                    clickEvent?.preventDefault?.();
                    clickEvent?.stopPropagation?.();
                    if (typeof window.openIoTChartDetails === "function") {
                        await window.openIoTChartDetails(stationSerial);
                        marker.closePopup();
                    }
                };
            });

            // Add click handler
            marker.on("click", async () => {
                try {
                    marker.openPopup();
                } catch (error) {
                    console.error("❌ Error in IoT marker click handler:", error);
                }
            });
        }

        // Count current markers
        let markerCount = 0;
        let allLayersCount = 0;
        if (mapInstance.eachLayer) {
            mapInstance.eachLayer((layer) => {
                allLayersCount++;
                // Check both options and direct property
                if (layer.isIoTStation === true || (layer.options && layer.options.isIoTStation === true)) {
                    markerCount++;
                }
            });
        }
    } catch (error) {
        console.error("❌ Error rendering IoT stations:", error);
        console.error("❌ Error stack:", error.stack);
    }
};

// Function to remove existing IoT markers from map
export const removeIoTStations = (mapInstance) => {
    if (!mapInstance.eachLayer) {
        console.warn("⚠️ Map instance does not have eachLayer method");
        return;
    }

    let removedCount = 0;
    const layersToRemove = [];

    mapInstance.eachLayer((layer) => {
        if (layer.isIoTStation || (layer.options && layer.options.isIoTStation)) {
            layersToRemove.push(layer);
        }
    });
    layersToRemove.forEach((layer) => {
        mapInstance.removeLayer(layer);
        removedCount++;
    });
};
