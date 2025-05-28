import React from "react";
import L from "leaflet";
import { convertDMSToDecimal } from "@components/convertDMSToDecimal";
import { fetchSalinityPoints, fetchSalinityData } from "@components/map/mapDataServices";

const getSalinityIcon = (salinity) => {
    let color = "#6c757d";

    if (salinity < 1) color = "blue";
    else if (salinity < 4) color = "green";
    else if (salinity < 10) color = "yellow";
    else color = "red";

    return L.divIcon({
        className: "custom-salinity-icon",
        html: `
      <i class="fa-solid fa-droplet glow-icon" style="color: ${color}; font-size: 1.5rem;"></i>
    `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -10],
    });
};

export const createSalinityPopup = (point, latestSalinity, latestDate, trend, previousDate) => {
    const formattedSalinity = `${(+latestSalinity).toFixed(2)}`;
    const salinityValue = +latestSalinity;

    // Determine status and color based on salinity level
    let statusClass = "status-normal";
    let statusText = "Bình thường";
    let statusColor = "#198754";

    if (salinityValue >= 10) {
        statusClass = "status-critical";
        statusText = "Rủi ro cao";
        statusColor = "#dc3545";
    } else if (salinityValue >= 4) {
        statusClass = "status-warning";
        statusText = "Cảnh báo";
        statusColor = "#fd7e14";
    } else if (salinityValue >= 1) {
        statusClass = "status-caution";
        statusText = "Theo dõi";
        statusColor = "#ffc107";
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
          <span class="value-date">${latestDate}</span>
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
                <strong class="detail-label"><i class="detail-icon">🏷️</i> Phân loại: </strong>
                <span class="detail-value">${point.PhanLoai}</span>
              </div>
            </div>
            
            <div class="detail-item">
              <div class="detail-content py-2">
                <strong class="detail-label font-weight"><i class="detail-icon">⏰</i> Thời gian: </strong>
                <span class="detail-value">${point.ThoiGian}</span>
              </div>
            </div>
            
            <div class="detail-item">
              <div class="detail-content py-2">
                <strong class="detail-label"><i class="detail-icon">📊</i> Tần suất đo: </strong>
                <span class="detail-value">${point.TanSuat}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="popup-actions">
          <button class="action-btn primary" onclick="window.openChartDetails('${point.KiHieu}')">
            <i class="btn-icon">📈</i>
            Xem biểu đồ chi tiết
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
                if (
                    data[i].salinity !== "NULL" &&
                    data[i].salinity !== null &&
                    data[i].salinity !== undefined
                ) {
                    if (latestSalinity === null) {
                        latestSalinity = data[i].salinity;
                        latestDate = new Date(data[i].date).toLocaleDateString("vi-VN");
                    } else if (previousSalinity === null) {
                        previousSalinity = data[i].salinity;
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

            const icon = getSalinityIcon(latestSalinity);

            const marker = L.marker([lat, lng], {
                icon,
                isSalinityPoint: true,
            }).addTo(mapInstance);

            latLngs.push([lat, lng]);

            marker.bindTooltip(point.TenDiem, {
                permanent: true,
                direction: "top",
                offset: [0, -10],
                className: "custom-tooltip",
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
