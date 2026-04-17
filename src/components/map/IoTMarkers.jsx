import React from "react";
import L from "leaflet";
import { convertDMSToDecimal } from "@components/convertDMSToDecimal";
import IoTCongAnHaImage from "@assets/IoT_CongAnHa.jpg";
import IoTCongKenhCImage from "@assets/IoT_CongKenhC.jpg";
import IoTCongVuonThomImage from "@assets/IoT_CongVuonThom.jpg";
import { fetchIoTStations, fetchIoTData, normalizeIoTDataRows } from "@components/map/mapDataServices";
import { getSingleStationClassification } from "@common/salinityClassification";

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

    const stationInfo = iotResponse?.station || station;
    const stationName =
        stationInfo?.station_name || station?.station_name || station?.stationName || "Trạm IoT";
    const serialNumber =
        stationInfo?.serial_number || stationInfo?.serial || station?.serial_number || station?.serial || "";

    return {
        stationInfo,
        stationName,
        serialNumber,
        dataPoints: normalizedRows,
        data: normalizedRows,
        summary: {
            totalRecords: iotResponse?.count || normalizedRows.length,
            totalRecordsInRange: normalizedRows.length,
            totalRecordsAll: parseInt(stationInfo?.total_records || station?.total_records || 0),
            rangeLabel: "14 ngày gần nhất",
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

const formatDecimalDisplay = (value, digits = 2) => {
    const numeric = Number.parseFloat(value);
    if (!Number.isFinite(numeric)) return "--";
    return numeric.toLocaleString("vi-VN", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
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

// Helper: get risk classification for IoT station based on latest salt value
const getIoTRiskClassification = (station) => {
    const saltValue = getLatestIoTSaltValue(station);
    // Derive base station code (e.g. "CKC_IoT" → "CKC") for MNB detection
    const baseCode = String(station?.station_code || station?.StationCode || "")
        .replace(/_IoT$/i, "")
        .replace(/_iot$/i, "");
    return getSingleStationClassification(saltValue, baseCode);
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

// Keep IoT detail payload lightweight: fetch only 14 days from latest data point.
const getRecent14DaysRange = (lastDataTime) => {
    const end = lastDataTime ? new Date(lastDataTime) : new Date();
    if (Number.isNaN(end.getTime())) {
        const fallbackEnd = new Date();
        const fallbackStart = new Date(fallbackEnd);
        fallbackStart.setDate(fallbackStart.getDate() - 14);
        return {
            startDate: toYMD(fallbackStart),
            endDate: toYMD(fallbackEnd),
        };
    }

    const start = new Date(end);
    start.setDate(start.getDate() - 14);

    return {
        startDate: toYMD(start),
        endDate: toYMD(end),
    };
};

// Create IoT station popup - Lấy dữ liệu từ API thực tế
export const createIoTPopup = (station) => {
    const stationSerial = String(
        station?.serial_number ?? station?.serialNumber ?? station?.serial ?? station?.serial_no ?? "",
    ).trim();
    const hasSerial = stationSerial !== "";

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
    const saltUnit = station?.latest_salt_unit || "‰";

    // Previous day salinity average (optional summary field)
    const previousDayAvgRaw =
        station?.previous_day_avg_salt ?? station?.previousDayAvgSalt ?? station?.prev_day_avg_salt;
    const previousDayAvgSalt =
        previousDayAvgRaw !== null && previousDayAvgRaw !== undefined && previousDayAvgRaw !== ""
            ? parseFloat(previousDayAvgRaw)
            : null;
    const previousDay = station?.previous_day || station?.previousDay || null;
    const previousDayLabel = (() => {
        if (!previousDay) return null;
        const parsed = new Date(previousDay);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toLocaleDateString("vi-VN");
        }
        return String(previousDay);
    })();

    // Format values
    const saltDisplay = hasSaltValue ? `${formatDecimalDisplay(latestSaltValue, 2)} ${saltUnit}` : "N/A";
    const previousHourSaltDisplay = Number.isFinite(previousSaltValue)
        ? `${formatDecimalDisplay(previousSaltValue, 2)} ${saltUnit}`
        : "--";
    const previousDaySaltDisplay = Number.isFinite(previousDayAvgSalt)
        ? `${formatDecimalDisplay(previousDayAvgSalt, 2)} ${saltUnit}`
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

    // Risk level based on latest salt value
    const riskClassification = getIoTRiskClassification(station);
    const { statusClass: riskStatusClass, color: riskColor } =
        RISK_CLASS_MAP[riskClassification.class] || RISK_CLASS_MAP["no-data"];

    const buildTrend = (baselineValue, baselineLabel) => {
        if (!Number.isFinite(latestSaltValue) || !Number.isFinite(baselineValue)) {
            return null;
        }

        const diff = latestSaltValue - baselineValue;
        const absDiff = Math.abs(diff);
        if (absDiff < 0.01) {
            return {
                icon: "→",
                text: `Không đổi so với`,
                color: "#6c757d",
                date: baselineLabel,
                directionClass: "trend-flat",
            };
        }

        return {
            icon: diff > 0 ? "↑" : "↓",
            text: `${diff > 0 ? "Tăng" : "Giảm"} ${formatDecimalDisplay(absDiff, 2)} ${saltUnit} so với`,
            color: diff > 0 ? "#dc3545" : "#28a745",
            date: baselineLabel,
            directionClass: diff > 0 ? "trend-up" : "trend-down",
        };
    };

    // Show trends for previous hour and previous day average.
    const trendItems = [
        buildTrend(previousSaltValue, previousHourLabel),
        buildTrend(previousDayAvgSalt, previousDayLabel || "Ngày liền trước"),
    ].filter(Boolean);

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

    return `
        <div class="modern-popup salinity-popup iot-popup">
            <div class="popup-header">
                <div class="popup-title">
                    <h4 class="popup-name">${stationName}</h4>
                    <span class="popup-type">Trạm IoT</span>
                </div>
                <div class="popup-status ${riskStatusClass}">
                    ${riskClassification.shortText}
                </div>
            </div>
            
            <div class="popup-content">
                <div class="popup-main-value">
                    <span class="value-label">Độ mặn hiện tại</span>
                    <span class="value-number" style="color: ${riskColor}">
                        ${saltDisplay}
                    </span>
                    <span class="value-date">${latestTime}</span>
                </div>
                
                ${
                    trendItems.length > 0
                        ? `
                    <div class="iot-trend-list">
                        ${trendItems
                            .map(
                                (trend) => `
                    <div class="trend-indicator ${trend.directionClass}">
                        <div class="trend-icon" style="color: ${trend.color}">
                            ${trend.icon}
                        </div>
                        <div class="trend-content">
                            <span class="trend-text" style="color: ${trend.color}">
                                ${trend.text}
                            </span>
                            <span class="trend-date">${trend.date}</span>
                        </div>
                    </div>
                `,
                            )
                            .join("")}
                    </div>
                `
                        : ""
                }

                ${renderIoTImageContainer(station)}
                
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

                        <div class="detail-item">
                            <div class="detail-content py-1">
                                <strong class="detail-label">Tần suất: </strong>
                                <span class="detail-value">${station.frequency || ""}</span>
                            </div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-content py-1">
                                <strong class="detail-label">Thời gian: </strong>
                                </br>
                                <span class="detail-value">${startTime} - ${endTime}</span>
                            </div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-content py-1">
                                <strong class="detail-label">Tổng bản ghi: </strong>
                                <span class="detail-value">${totalRecordsText}</span>
                            </div>
                        </div>

                        <div class="detail-item">
                            <div class="detail-content py-1">
                                <strong class="detail-label">Độ mặn giờ trước: </strong>
                                <span class="detail-value">${previousHourSaltDisplay}</span>
                            </div>
                        </div>

                        <div class="detail-item">
                            <div class="detail-content py-1">
                                <strong class="detail-label">Độ mặn TB ngày trước: </strong>
                                <span class="detail-value">${previousDaySaltDisplay}</span>
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
                            onclick="window.openIoTChartDetails && window.openIoTChartDetails(this.getAttribute('data-serial'))"
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

        const stationsResponse = await fetchIoTStations();

        if (!stationsResponse.success || !stationsResponse.data) {
            console.warn("⚠️ No IoT stations data received", stationsResponse);
            return;
        }

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

                const { startDate, endDate } = getRecent14DaysRange(
                    matchedStation.latest_hour_end_time || matchedStation.last_data_time,
                );
                const iotResponse = await fetchIoTData(serial, {
                    startDate,
                    endDate,
                    groupBy: "none",
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

            const riskInfo = getIoTRiskClassification(station);
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

            const popupHTML = createIoTPopup(station);
            marker.bindPopup(popupHTML, {
                maxWidth: 350,
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
