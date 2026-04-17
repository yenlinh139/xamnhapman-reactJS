import React from "react";
import L from "leaflet";
import { convertDMSToDecimal } from "@components/convertDMSToDecimal";
import { fetchSalinityPoints } from "@components/map/mapDataServices";
import { getSalinityIcon } from "@components/map/mapMarkers";
import { getSingleStationClassification } from "../../common/salinityClassification";

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

export const getSalinityTooltipClass = (salinity, stationCode = null) => {
    const classification = getSingleStationClassification(salinity, stationCode);
    switch (classification.level) {
        case "normal":
            return "custom-tooltip tooltip-normal";
        case "warning":
            return "custom-tooltip tooltip-warning";
        case "high-warning":
            return "custom-tooltip tooltip-high-warning";
        case "critical":
            return "custom-tooltip tooltip-critical";
        default:
            return "custom-tooltip";
    }
};

const formatPopupDateValue = (value, fallback = "Chưa có dữ liệu") => {
    if (!value) return fallback;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return String(value);
    }
    return parsed.toLocaleDateString("vi-VN");
};

const formatDecimalDisplay = (value, digits = 2) => {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return "--";
  return numeric.toLocaleString("vi-VN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

export const createSalinityPopup = (point, latestSalinity, latestDate, trend, previousDate) => {
    const pointLatestValue = Number(point?.latest_value);
    const fallbackLatestValue = Number(latestSalinity);
    const salinityValue = Number.isFinite(pointLatestValue)
        ? pointLatestValue
        : Number.isFinite(fallbackLatestValue)
          ? fallbackLatestValue
          : null;

    const previousValue = Number(point?.previous_value);
    const hasValidSalinity = Number.isFinite(salinityValue);
    const formattedSalinity = hasValidSalinity ? formatDecimalDisplay(salinityValue, 2) : "N/A";
    // const formattedPreviousValue = Number.isFinite(previousValue) ? `${previousValue.toFixed(2)} ‰` : "N/A";
    const descriptionText = point.MoTa || point.PhanLoai || "Không có mô tả";
    const latestDateText =
        latestDate || formatPopupDateValue(point?.latest_date, "Chưa có thời gian quan trắc");
    const previousDateText = previousDate || formatPopupDateValue(point?.previous_date, "Chưa có dữ liệu");
    const startDateText = formatPopupDateValue(point?.start_date, "Không xác định");
    const endDateText = formatPopupDateValue(point?.end_date, "Không xác định");
    const frequencyText = point?.TanSuat || "Không xác định";
    const totalRecordsText = Number.isFinite(Number(point?.total_records))
        ? Number(point.total_records).toLocaleString("vi-VN")
        : "--";

    const latDecimal = convertDMSToDecimal(point?.ViDo);
    const lngDecimal = convertDMSToDecimal(point?.KinhDo);
    const latDisplay = Number.isFinite(latDecimal) ? formatDecimalDisplay(latDecimal, 6) : point.ViDo || "Không xác định";
    const lngDisplay = Number.isFinite(lngDecimal) ? formatDecimalDisplay(lngDecimal, 6) : point.KinhDo || "Không xác định";
    const stationCodeForClick = String(point.KiHieu || "").replace(/'/g, "\\'");
    const stationNameForClick = String(point.TenDiem || "").replace(/'/g, "\\'");

    const stationCode = point.KiHieu;
    const classification = getSingleStationClassification(salinityValue, stationCode);
    let statusClass = `status-${classification.level}`;
    let statusText = classification.shortText;
    let statusColor = "#198754";

    switch (classification.level) {
        case "critical":
            statusColor = "#dc3545";
            break;
        case "high-warning":
            statusColor = "#fd7e14";
            break;
        case "warning":
            statusColor = "#ffc107";
            break;
        default:
            statusColor = "#198754";
    }

    return `
    <div class="modern-popup salinity-popup">
      <div class="popup-header">
        <div class="popup-title">
          <h4 class="popup-name">${point.TenDiem}</h4>
          <span class="popup-type">Điểm đo mặn</span>
        </div>
        <div class="popup-status ${statusClass}">
          ${statusText}
        </div>
      </div>
      
      <div class="popup-content">
        <div class="popup-main-value">
          <span class="value-label">Độ mặn</span>
          <span class="value-number" style="color: ${statusColor}">
            ${formattedSalinity} ‰
          </span>
          <span class="value-date">${latestDateText}</span>
        </div>
        
        ${
            trend
                ? `
          <div class="trend-indicator">
            <div class="trend-icon" style="color: ${trend.color}">
              ${trend.icon}
            </div>
            <div class="trend-content">
              <span class="trend-text" style="color: ${trend.color}">
                ${trend.text}
              </span>
              <span class="trend-date">${previousDateText}</span>
            </div>
          </div>
        `
                : ""
        }
        
        <div class="popup-details">
          <div class="detail-grid">
            <div class="detail-item">
              <div class="detail-content py-2">
                <strong class="detail-label">Mã trạm: </strong>
                <span class="detail-value">${point.KiHieu || "Không xác định"}</span>
              </div>
            </div>
            
            <div class="detail-item">
              <div class="detail-content py-2">
                <strong class="detail-label font-weight">Mô tả: </strong>
                <span class="detail-value">${descriptionText}</span>
              </div>
            </div>

            <div class="detail-item">
              <div class="detail-content py-2">
                <strong class="detail-label">Kinh độ: </strong>
                <span class="detail-value">${lngDisplay}</span>
              </div>
            </div>

            <div class="detail-item">
              <div class="detail-content py-2">
                <strong class="detail-label">Vĩ độ: </strong>
                <span class="detail-value">${latDisplay}</span>
              </div>
            </div>

            <div class="detail-item">
              <div class="detail-content py-2">
                <strong class="detail-label">Tần suất: </strong>
                <span class="detail-value">${frequencyText}</span>
              </div>
            </div>

            <div class="detail-item">
              <div class="detail-content py-2">
                <strong class="detail-label">Thời gian: </strong>
                <span class="detail-value">${startDateText} - ${endDateText}</span>
              </div>
            </div>

            <div class="detail-item">
              <div class="detail-content py-2">
                <strong class="detail-label">Tổng bản ghi: </strong>
                <span class="detail-value">${totalRecordsText}</span>
              </div>
            </div>

            
            
          </div>
        </div>

        <div class="popup-actions">
          <button class="action-btn primary" onclick="window.openChartDetails('${stationCodeForClick}', '${stationNameForClick}')">
            Xem dữ liệu chi tiết
          </button>
        </div>
      </div>
    </div>
  `;
};

export const renderSalinityPoints = async (mapInstance, setSalinityData, setSelectedPoint) => {
    try {
        ensureStationPanes(mapInstance);

        const points = await fetchSalinityPoints();
        const latLngs = [];

        for (const point of points) {
            const lat = convertDMSToDecimal(point.ViDo);
            const lng = convertDMSToDecimal(point.KinhDo);

            if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
                console.warn(`⚠️ Không thể chuyển tọa độ tại điểm ${point.TenDiem}`);
                continue;
            }

            // Use latest/previous values directly from fetchSalinityPoints API response
            const latestSalinity = point.latest_value;
            const previousSalinity = point.previous_value;
            const latestDate = point.latest_date
                ? new Date(point.latest_date).toLocaleDateString("vi-VN")
                : null;
            const previousDate = point.previous_date
                ? new Date(point.previous_date).toLocaleDateString("vi-VN")
                : null;

            // Calculate trend from latest and previous values (no API call needed)
            let trend = null;
            if (
                latestSalinity !== null &&
                latestSalinity !== undefined &&
                previousSalinity !== null &&
                previousSalinity !== undefined
            ) {
                const diff = latestSalinity - previousSalinity;
                if (Math.abs(diff) > 0.01) {
                    trend = {
                        text:
                        diff > 0
                          ? `Tăng ${formatDecimalDisplay(diff, 2)} ‰ so với `
                          : `Giảm ${formatDecimalDisplay(Math.abs(diff), 2)} ‰ so với`,
                        color: diff > 0 ? "#dc3545" : "#198754",
                        icon: diff > 0 ? "▲" : "▼",
                    };
                }
            }

            const icon = getSalinityIcon(latestSalinity, point.KiHieu);
            const tooltipClass = getSalinityTooltipClass(latestSalinity, point.KiHieu);

            const marker = L.marker([lat, lng], {
                icon,
                isSalinityPoint: true,
                pane: "salinityMarkerPane",
                zIndexOffset: 2000,
            }).addTo(mapInstance);

            latLngs.push([lat, lng]);

            marker.bindTooltip(point.TenDiem, {
                permanent: true,
                direction: "top",
                offset: [0, -10],
                className: `${tooltipClass} station-tooltip`,
                pane: "salinityTooltipPane",
            });

            const popupHTML = createSalinityPopup(point, latestSalinity, latestDate, trend, previousDate);

            marker.bindPopup(popupHTML, {
                maxWidth: 300,
                className: "custom-popup",
                autoClose: true,
                closeOnClick: true,
            });

            marker.on("click", async () => {
                try {
                    marker.openPopup();

                    // Store point info for later (data will be fetched on demand when clicking "Xem biểu đồ")
                    setSelectedPoint({
                        kiHieu: point.KiHieu,
                        tenDiem: point.TenDiem,
                        thongTin: point,
                    });
                } catch (error) {
                    console.error("❌ Error in marker click handler:", error);
                }
            });
        }
    } catch (error) {
        console.error("❌ Error rendering salinity points:", error);
    }
};
