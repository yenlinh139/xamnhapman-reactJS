import React from "react";
import L from "leaflet";
import { convertDMSToDecimalNo } from "@components/convertDMSToDecimal";
import { fetchHydrometStations, fetchHydrometData } from "@components/map/mapDataServices";
import { prefixUnitMap } from "@components/map/mapStyles";

const getHydrometIcon = () => {
    return L.divIcon({
        className: "custom-hydromet-icon",
        html: `<i class="fa-solid fa-tower-observation" style="color: red; font-size: 1.5rem;"></i>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -10],
    });
};

// Enhanced popup creation with multiple parameter support
export const createHydrometPopup = (station, hydrometeorologyData) => {
    // Parse the latest data
    const latestData =
        hydrometeorologyData && hydrometeorologyData.length > 0
            ? hydrometeorologyData[hydrometeorologyData.length - 1]
            : null;

    if (!latestData) {
        return createBasicPopup(station, "Chưa có dữ liệu");
    }

    // Extract and categorize parameters
    const rainfallParams = {};
    const temperatureParams = {};
    const humidityParams = {};

    Object.keys(latestData).forEach((key) => {
        if (key.startsWith("R_")) {
            rainfallParams[key] = latestData[key];
        } else if (key.startsWith("T")) {
            temperatureParams[key] = latestData[key];
        } else if (key.startsWith("H")) {
            humidityParams[key] = latestData[key];
        }
    });

    // Get primary parameter for main display using prefixUnitMap
    const { primaryLabel, primaryValue, primaryUnit, statusColor } = getPrimaryParameter(
        rainfallParams,
        temperatureParams,
        humidityParams,
    );

    const formattedDate = latestData.Ngày || "Chưa có dữ liệu";

    return `
    <div class="modern-popup hydromet-popup enhanced">
      <div class="popup-header">
        <div class="popup-title">
          <h4 class="popup-name">${station.TenTam || station.TenTram}</h4>
          <span class="popup-type">Trạm khí tượng thủy văn</span>
        </div>
      </div>
      
      <div class="popup-content">
        <div class="popup-main-value">
          <span class="value-label">${primaryLabel}</span>
          <span class="value-number" style="color: ${statusColor}">
            ${primaryValue.toFixed(1)} ${primaryUnit}
          </span>
          <span class="value-date">${formattedDate}</span>
        </div>
        
        <div class="multi-param-grid">
          ${createParameterCards(rainfallParams, temperatureParams, humidityParams)}
        </div>
        
        <div class="popup-details">
          <div class="detail-grid">
            <div class="detail-item">
              <div class="detail-content">
                <strong class="detail-label"><i class="detail-icon">🏷️</i> Phân loại:</strong>
                <span class="detail-value">${station.PhanLoai || "Không xác định"}</span>
              </div>
            </div>
            
            <div class="detail-item">
              <div class="detail-content">
                <strong class="detail-label"><i class="detail-icon">⏰</i> Thời gian:</strong>
                <span class="detail-value">${station.ThoiGian || "Không xác định"}</span>
              </div>
            </div>
            
            <div class="detail-item">
              <div class="detail-content">
                <strong class="detail-label"><i class="detail-icon">📊</i> Tần suất:</strong>
                <span class="detail-value">${station.TanSuat || "Không xác định"}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="popup-actions">
          <button class="action-btn primary" onclick="window.openHydrometDetails('${station.KiHieu}')">
            <i class="btn-icon">📈</i>
            Xem biểu đồ chi tiết
          </button>
        </div>
      </div>
    </div>
  `;
};

// Helper function to create parameter cards with proper units and colors
const createParameterCards = (rainfall, temperature, humidity) => {
    const unitMap = prefixUnitMap();
    let cards = "";

    // Rainfall parameters
    if (Object.keys(rainfall).length > 0) {
        const rainfallCard = Object.entries(rainfall)
            .map(([key, value]) => {
                const details = getParameterDetails(key, value);
                return `
          <div class="param-item rainfall">
            <div class="param-icon">${details.icon}</div>
            <div class="param-content">
              <span class="param-label">${details.label}</span>
              <span class="param-value" style="color: ${details.color}">
                ${details.value.toFixed(1)} ${details.unit}
              </span>
            </div>
          </div>
        `;
            })
            .join("");
        cards += rainfallCard;
    }

    // Temperature parameters
    if (Object.keys(temperature).length > 0) {
        const tempCard = Object.entries(temperature)
            .map(([key, value]) => {
                const details = getParameterDetails(key, value);
                return `
          <div class="param-item temperature">
            <div class="param-icon">${details.icon}</div>
            <div class="param-content">
              <span class="param-label">${details.label}</span>
              <span class="param-value" style="color: ${details.color}">
                ${details.value.toFixed(1)} ${details.unit}
              </span>
            </div>
          </div>
        `;
            })
            .join("");
        cards += tempCard;
    }

    // Humidity parameters
    if (Object.keys(humidity).length > 0) {
        const humidityCard = Object.entries(humidity)
            .map(([key, value]) => {
                const details = getParameterDetails(key, value);
                return `
          <div class="param-item humidity">
            <div class="param-icon">${details.icon}</div>
            <div class="param-content">
              <span class="param-label">${details.label}</span>
              <span class="param-value" style="color: ${details.color}">
                ${details.value.toFixed(1)} ${details.unit}
              </span>
            </div>
          </div>
        `;
            })
            .join("");
        cards += humidityCard;
    }

    return cards;
};

// Helper function to get primary parameter for display
const getPrimaryParameter = (rainfallParams, temperatureParams, humidityParams) => {
    const unitMap = prefixUnitMap();

    // Priority: Rainfall > Temperature > Humidity
    if (Object.keys(rainfallParams).length > 0) {
        const totalRainfall = Object.values(rainfallParams).reduce(
            (sum, val) => sum + (parseFloat(val) || 0),
            0,
        );
        return {
            primaryLabel: unitMap.R.content,
            primaryValue: totalRainfall,
            primaryUnit: unitMap.R.donvi,
            statusColor: getRainfallColor(totalRainfall),
        };
    } else if (Object.keys(temperatureParams).length > 0) {
        // Prioritize average temperature
        const tempKey =
            Object.keys(temperatureParams).find((key) => key.includes("tb")) ||
            Object.keys(temperatureParams)[0];
        const tempValue = parseFloat(temperatureParams[tempKey]) || 0;
        const tempType = tempKey.includes("tb") ? "Ttb" : tempKey.includes("x") ? "Tx" : "Tm";

        return {
            primaryLabel: unitMap[tempType].content,
            primaryValue: tempValue,
            primaryUnit: unitMap[tempType].donvi,
            statusColor: getTemperatureColor(tempValue),
        };
    } else if (Object.keys(humidityParams).length > 0) {
        // Prioritize average humidity
        const humidityKey =
            Object.keys(humidityParams).find((key) => key.includes("tb")) || Object.keys(humidityParams)[0];
        const humidityValue = parseFloat(humidityParams[humidityKey]) || 0;
        const humidityType = humidityKey.includes("tb") ? "Htb" : humidityKey.includes("x") ? "Hx" : "Hm";

        return {
            primaryLabel: unitMap[humidityType].content,
            primaryValue: humidityValue,
            primaryUnit: unitMap[humidityType].donvi,
            statusColor: getHumidityColor(humidityValue),
        };
    }

    return {
        primaryLabel: "Không có dữ liệu",
        primaryValue: 0,
        primaryUnit: "",
        statusColor: "#6c757d",
    };
};

// Color functions based on parameter values
const getRainfallColor = (value) => {
    if (value === 0) return "#6c757d"; // Gray for no rain
    if (value < 10) return "#28a745"; // Green for light rain
    if (value < 50) return "#ffc107"; // Yellow for moderate rain
    if (value < 100) return "#fd7e14"; // Orange for heavy rain
    return "#dc3545"; // Red for very heavy rain
};

const getTemperatureColor = (value) => {
    if (value < 20) return "#007bff"; // Blue for cold
    if (value < 25) return "#28a745"; // Green for cool
    if (value < 30) return "#ffc107"; // Yellow for warm
    if (value < 35) return "#fd7e14"; // Orange for hot
    return "#dc3545"; // Red for very hot
};

const getHumidityColor = (value) => {
    if (value < -50) return "#dc3545"; // Red for very low water level
    if (value < 0) return "#fd7e14"; // Orange for low water level
    if (value < 50) return "#ffc107"; // Yellow for normal water level
    if (value < 100) return "#28a745"; // Green for high water level
    return "#007bff"; // Blue for very high water level
};

// Helper function to get parameter details with correct units from prefixUnitMap
const getParameterDetails = (paramKey, value) => {
    const unitMap = prefixUnitMap();
    const numValue = parseFloat(value) || 0;

    // Determine parameter type and get appropriate unit/color
    if (paramKey.startsWith("R_")) {
        return {
            label: getParameterLabel(paramKey),
            value: numValue,
            unit: unitMap.R.donvi,
            color: getRainfallColor(numValue),
            icon: "🌧️",
            category: "rainfall",
        };
    } else if (paramKey.startsWith("T")) {
        const tempType = paramKey.includes("tb") ? "Ttb" : paramKey.includes("x") ? "Tx" : "Tm";
        const icon = numValue > 30 ? "🌡️" : numValue < 20 ? "❄️" : "🌡️";

        return {
            label: unitMap[tempType].content,
            value: numValue,
            unit: unitMap[tempType].donvi,
            color: getTemperatureColor(numValue),
            icon: icon,
            category: "temperature",
        };
    } else if (paramKey.startsWith("H")) {
        const humidityType = paramKey.includes("tb") ? "Htb" : paramKey.includes("x") ? "Hx" : "Hm";

        return {
            label: unitMap[humidityType].content,
            value: numValue,
            unit: unitMap[humidityType].donvi,
            color: getHumidityColor(numValue),
            icon: "💧",
            category: "humidity",
        };
    }

    return {
        label: paramKey,
        value: numValue,
        unit: "",
        color: "#6c757d",
        icon: "📊",
        category: "unknown",
    };
};

// Helper function to get readable parameter labels
const getParameterLabel = (paramKey) => {
    const labelMap = {
        // Rainfall
        R_AP: "An Phú",
        R_BC: "Bình Chánh",
        R_CG: "Cần Giờ",
        R_CL: "Cát Lái",
        R_CC: "Củ Chi",
        R_HM: "Hóc Môn",
        R_LMX: "Lê Minh Xuân",
        R_LS: "Long Sơn",
        R_MDC: "Mạc Đĩnh Chi",
        R_NB: "Nhà Bè",
        R_PVC: "Phạm Văn Cội",
        R_TTH: "Tam Thôn Hiệp",
        R_TD: "Thủ Đức",
        R_TSH: "Tân Sơn Hòa",
        Ttb_TSH: "Nhiệt độ không khí trung bình",
        Tx_TSH: "Nhiệt độ không khí cao nhất",
        Tm_TSH: "Nhiệt độ không khí thấp nhất",

        // Humidity (tb=trung bình, x=max, m=min)
        Htb_NB: "Mực nước trung bình",
        Hx_NB: "Mực nước cao nhất",
        Hm_NB: "Mực nước thấp nhất",
        Htb_PA: "Mực nước trung bình",
        Hx_PA: "Mực nước cao nhất",
        Hm_PA: "Mực nước thấp nhất",
    };

    return labelMap[paramKey] || paramKey;
};

// Basic popup for stations without data
const createBasicPopup = (station, message) => {
    return `
    <div class="modern-popup hydromet-popup basic">
      <div class="popup-header">
        <div class="popup-icon">🌤️</div>
        <div class="popup-title">
          <h4 class="popup-name">${station.TenTam || station.TenTram}</h4>
          <span class="popup-type">Trạm khí tượng thủy văn</span>
        </div>
        <div class="popup-status status-no-data">
          ${message}
        </div>
      </div>
      
      <div class="popup-content">
        <div class="popup-details">
          <div class="detail-grid">
            <div class="detail-item">
              <div class="detail-content">
                <strong class="detail-label"><i class="detail-icon">🏷️</i> Phân loại:</strong>
                <span class="detail-value">${station.PhanLoai || "Không xác định"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
};

// Enhanced rendering function with improved data processing
export const renderHydrometStations = async (mapInstance, setHydrometData, setSelectedStation) => {
    try {
        const stations = await fetchHydrometStations();
        const latLngs = [];

        for (const station of stations) {
            const lat = convertDMSToDecimalNo(station.ViDo);
            const lng = convertDMSToDecimalNo(station.KinhDo);

            if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
                console.warn(`⚠️ Không thể chuyển tọa độ tại trạm ${station.TenTram}`);
                continue;
            }
            const hydrometeorologyData = await fetchHydrometData(station.KiHieu);

            let stationData = {
                rainfall: 0,
                temperature: 0,
                humidity: 0,
                hasData: false,
            };

            if (hydrometeorologyData && hydrometeorologyData.length > 0) {
                const latestRecord = hydrometeorologyData[hydrometeorologyData.length - 1];

                // Extract rainfall data (sum all R_ parameters)
                const rainfallKeys = Object.keys(latestRecord).filter((key) => key.startsWith("R_"));
                stationData.rainfall = rainfallKeys.reduce((sum, key) => {
                    const value = parseFloat(latestRecord[key]) || 0;
                    return sum + value;
                }, 0);

                // Extract temperature data (prioritize average, then max, then min)
                const tempKeys = Object.keys(latestRecord).filter((key) => key.startsWith("T"));
                const tempAvgKey = tempKeys.find((key) => key.includes("tb"));
                const tempMaxKey = tempKeys.find((key) => key.includes("x"));
                const tempMinKey = tempKeys.find((key) => key.includes("m"));

                if (tempAvgKey) {
                    stationData.temperature = parseFloat(latestRecord[tempAvgKey]) || 0;
                } else if (tempMaxKey) {
                    stationData.temperature = parseFloat(latestRecord[tempMaxKey]) || 0;
                } else if (tempMinKey) {
                    stationData.temperature = parseFloat(latestRecord[tempMinKey]) || 0;
                }

                // Extract humidity data (prioritize average)
                const humidityKeys = Object.keys(latestRecord).filter((key) => key.startsWith("H"));
                const humidityAvgKey = humidityKeys.find((key) => key.includes("tb"));
                const humidityMaxKey = humidityKeys.find((key) => key.includes("x"));
                const humidityMinKey = humidityKeys.find((key) => key.includes("m"));

                if (humidityAvgKey) {
                    stationData.humidity = parseFloat(latestRecord[humidityAvgKey]) || 0;
                } else if (humidityMaxKey) {
                    stationData.humidity = parseFloat(latestRecord[humidityMaxKey]) || 0;
                } else if (humidityMinKey) {
                    stationData.humidity = parseFloat(latestRecord[humidityMinKey]) || 0;
                }

                stationData.hasData = true;
            }

            // Create enhanced icon based on all parameters
            const icon = getHydrometIcon(stationData);

            const marker = L.marker([lat, lng], {
                icon,
                isHydrometStation: true,
            }).addTo(mapInstance);

            latLngs.push([lat, lng]);

            // Enhanced tooltip with primary info
            const tooltipText = stationData.hasData
                ? `${station.TenTam} - ${
                      stationData.rainfall > 0
                          ? `Mưa: ${stationData.rainfall.toFixed(1)}mm`
                          : `${stationData.temperature.toFixed(1)}°C`
                  }`
                : station.TenTam;

            marker.bindTooltip(tooltipText, {
                permanent: true,
                direction: "top",
                offset: [0, -15],
                className: "custom-tooltip enhanced-tooltip",
            });

            marker.on("click", () => {
                try {
                    const zoomLevel = 13;
                    const clickLat = convertDMSToDecimalNo(station.ViDo);
                    const clickLng = convertDMSToDecimalNo(station.KinhDo);

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

                    // Create enhanced popup with all parameters
                    const popupHTML = createHydrometPopup(station, hydrometeorologyData);

                    marker.bindPopup(popupHTML, {
                        maxWidth: 400,
                        className: "custom-popup enhanced-popup",
                    });
                    marker.openPopup();

                    // Update component state
                    setHydrometData(hydrometeorologyData);
                    setSelectedStation({
                        maTram: station.KiHieu,
                        tenTram: station.TenTram,
                        thongTin: station,
                        data: stationData,
                    });

                    marker.once("popupclose", () => {
                        mapInstance.flyTo([10.769236178832742, 106.42333733153667], 10);
                    });
                } catch (error) {
                    console.error("❌ Error in hydromet marker click handler:", error);
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
        console.error("❌ Error rendering hydromet stations:", error);
    }
};
