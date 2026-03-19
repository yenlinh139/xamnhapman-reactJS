import React from "react";
import L from "leaflet";
import { convertDMSToDecimal } from "@components/convertDMSToDecimal";
import { fetchSalinityPoints, fetchSalinityData } from "@components/map/mapDataServices";
import { getSalinityIcon } from "@components/map/mapMarkers";
import { getSingleStationClassification } from "../../common/salinityClassification";

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

export const createSalinityPopup = (point, latestSalinity, latestDate, trend, previousDate) => {
  const numericSalinity = Number(latestSalinity);
  const hasValidSalinity =
    latestSalinity !== null && latestSalinity !== undefined && Number.isFinite(numericSalinity);
  const salinityValue = hasValidSalinity ? numericSalinity : null;
  const formattedSalinity = hasValidSalinity ? salinityValue.toFixed(2) : "N/A";
  const descriptionText = point.MoTa || point.PhanLoai || "Không có mô tả";

  const latDecimal = convertDMSToDecimal(point?.ViDo);
  const lngDecimal = convertDMSToDecimal(point?.KinhDo);
  const latDisplay = Number.isFinite(latDecimal)
    ? latDecimal.toFixed(6)
    : point.ViDo || "Không xác định";
  const lngDisplay = Number.isFinite(lngDecimal)
    ? lngDecimal.toFixed(6)
    : point.KinhDo || "Không xác định";
  const stationCodeForClick = String(point.KiHieu || "").replace(/'/g, "\\'");
  const stationNameForClick = String(point.TenDiem || "").replace(/'/g, "\\'");

    // Get station code from point data
    const stationCode = point.KiHieu;

    // Determine status and color based on new classification
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
        <div class="popup-icon">🌊</div>
        <div class="popup-title">
          <h4 class="popup-name">${point.TenDiem}</h4>
          <span class="popup-type">Điểm đo độ mặn</span>
        </div>
        <div class="popup-status ${statusClass}">
          ${statusText}
        </div>
      </div>
      
      <div class="popup-content">
        <div class="popup-main-value">
          <span class="value-label">Độ mặn hiện tại</span>
          <span class="value-number" style="color: ${statusColor}">
            ${formattedSalinity} ‰
          </span>
          <span class="value-date">${latestDate || "Chưa có thời gian quan trắc"}</span>
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
              <span class="trend-date">${previousDate}</span>
            </div>
          </div>
        `
                : ""
        }
        
        <div class="popup-details">
          <div class="detail-grid">
            <div class="detail-item">
              <div class="detail-content py-2">
                <strong class="detail-label"><i class="detail-icon">🆔</i> Mã trạm: </strong>
                <span class="detail-value">${point.KiHieu || "Không xác định"}</span>
              </div>
            </div>
            
            <div class="detail-item">
              <div class="detail-content py-2">
                <strong class="detail-label font-weight"><i class="detail-icon">📝</i> Mô tả: </strong>
                <span class="detail-value">${descriptionText}</span>
              </div>
            </div>
            
            <div class="detail-item">
              <div class="detail-content py-2">
                <strong class="detail-label"><i class="detail-icon">🌐</i> Kinh độ: </strong>
                <span class="detail-value">${lngDisplay}</span>
              </div>
            </div>

            <div class="detail-item">
              <div class="detail-content py-2">
                <strong class="detail-label"><i class="detail-icon">📍</i> Vĩ độ: </strong>
                <span class="detail-value">${latDisplay}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="popup-actions">
          <button class="action-btn primary" onclick="window.openChartDetails('${stationCodeForClick}', '${stationNameForClick}')">
            <i class="btn-icon">📈</i>
            Xem dữ liệu chi tiết
          </button>
        </div>
      </div>
    </div>
  `;
};

export const renderSalinityPoints = async (mapInstance, setSalinityData, setSelectedPoint) => {
    try {
        const points = await fetchSalinityPoints();
        const latLngs = [];

        for (const point of points) {
            const lat = convertDMSToDecimal(point.ViDo);
            const lng = convertDMSToDecimal(point.KinhDo);

            if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
                console.warn(`⚠️ Không thể chuyển tọa độ tại điểm ${point.TenDiem}`);
                continue;
            }

            const data = await fetchSalinityData(point.KiHieu);
            let latestSalinity = null;
            let previousSalinity = null;
            let latestDate = null;
            let previousDate = null;
            let trend = null;

            // Find latest and previous salinity values
            for (let i = data.length - 1; i >= 0; i--) {
              const value = Number(data[i].salinity);

              if (Number.isFinite(value)) {
                    if (latestSalinity === null) {
                  latestSalinity = value;
                        latestDate = new Date(data[i].date).toLocaleDateString("vi-VN");
                    } else if (previousSalinity === null) {
                  previousSalinity = value;
                        previousDate = new Date(data[i].date).toLocaleDateString("vi-VN");
                        break;
                    }
                }
            }

            if (latestSalinity !== null && previousSalinity !== null) {
                const diff = latestSalinity - previousSalinity;
                trend = {
                    text:
                        diff > 0
                            ? `Tăng ${diff.toFixed(2)} ‰ so với `
                            : diff < 0
                              ? `Giảm ${Math.abs(diff).toFixed(2)} ‰ so với`
                              : "Không thay đổi so với",
                    color: diff > 0 ? "#dc3545" : diff < 0 ? "#198754" : "#6c757d",
                    icon: diff > 0 ? "▲" : diff < 0 ? "▼" : "■",
                };
            }

            const icon = getSalinityIcon(latestSalinity, point.KiHieu);
            const tooltipClass = getSalinityTooltipClass(latestSalinity, point.KiHieu);

            const marker = L.marker([lat, lng], {
                icon,
                isSalinityPoint: true,
            }).addTo(mapInstance);

            latLngs.push([lat, lng]);

            marker.bindTooltip(point.TenDiem, {
                permanent: true,
                direction: "top",
                offset: [0, -10],
                className: tooltipClass,
            });

            marker.on("click", () => {
                try {
                    const zoomLevel = 13;
                    const clickLat = convertDMSToDecimal(point.ViDo.trim());
                    const clickLng = convertDMSToDecimal(point.KinhDo.trim());
                    if (clickLat !== null && clickLng !== null) {
                        const clickLatLng = L.latLng(clickLat, clickLng);
                        const map = mapInstance;
                        const originalPoint = map.latLngToContainerPoint(clickLatLng);
                        const offsetPixels = L.point(0, 70);
                        const newPoint = originalPoint.subtract(offsetPixels);
                        const newLatLng = map.containerPointToLatLng(newPoint);
                        map.setView(newLatLng, zoomLevel, {
                            animate: true,
                        });
                    }

                    const popupHTML = createSalinityPopup(
                        point,
                        latestSalinity,
                        latestDate,
                        trend,
                        previousDate,
                    );
                    marker.bindPopup(popupHTML, {
                        maxWidth: 300,
                        className: "custom-popup",
                    });
                    marker.openPopup();
                    setSalinityData(data);
                    setSelectedPoint({
                        kiHieu: point.KiHieu,
                        tenDiem: point.TenDiem,
                        thongTin: point,
                    });
                    marker.once("popupclose", () => {
                        mapInstance.flyTo([10.769236178832742, 106.42333733153667], 10);
                    });
                } catch (error) {
                    console.error("❌ Error in marker click handler:", error);
                }
            });
        }

        if (latLngs.length > 0) {
            const bounds = L.latLngBounds(latLngs);
            mapInstance.fitBounds(bounds, {
                padding: [50, 50],
                animate: true,
            });
        }
    } catch (error) {
        console.error("❌ Error rendering salinity points:", error);
    }
};
