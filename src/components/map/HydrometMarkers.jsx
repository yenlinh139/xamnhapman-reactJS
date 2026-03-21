import React from "react";
import L from "leaflet";
import { dmsToDecimal } from "@components/convertDMSToDecimal";
import { fetchHydrometStations, fetchHydrometData } from "@components/map/mapDataServices";
import { prefixUnitMap } from "@components/map/mapStyles";

const getStationCode = (station) => {
    return String(station?.KiHieu || station?.kiHieu || station?.maTram || "").trim();
};

const getStationName = (station) => {
    return String(
        station?.TenTram || station?.TenTam || station?.tenTram || station?.tenTam || station?.name || "",
    ).trim();
};

const normalizeHydrometStation = (station = {}) => {
    const stationCode = getStationCode(station);
    const stationName = getStationName(station) || stationCode || "Không xác định";

    return {
        ...station,
        KiHieu: stationCode,
        TenTram: stationName,
        TenTam: station.TenTam || stationName,
        ViDo: station.ViDo || station.viDo || station.latitude || station.lat || null,
        KinhDo: station.KinhDo || station.kinhDo || station.longitude || station.lng || null,
        PhanLoai: station.PhanLoai || station.phanLoai || "Không xác định",
        TinhTrang: station.TinhTrang || station.tinhTrang || station.TrangThai || station.status || "Không xác định",
    };
};

const escapePopupActionValue = (value) => {
    return String(value || "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'");
};

const getHydrometIcon = () => {
    return L.divIcon({
        className: "custom-hydromet-icon",
        html: `<i class="fa-solid fa-tower-observation" style="color: #990000; font-size: 1.5rem;"></i>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -10],
    });
};

// Basic popup for stations without data - MOVED TO TOP
const createBasicPopup = (station, message = "Chưa có dữ liệu") => {
    const normalizedStation = normalizeHydrometStation(station);
    const stationCodeForClick = escapePopupActionValue(normalizedStation.KiHieu);
    const stationNameForClick = escapePopupActionValue(normalizedStation.TenTram);

    return `
    <div class="modern-popup hydromet-popup basic">
      <div class="popup-header">
        <div class="popup-icon">🌤️</div>
        <div class="popup-title">
                    <h4 class="popup-name">${normalizedStation.TenTram}</h4>
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
                                <span class="detail-value">${normalizedStation.PhanLoai}</span>
              </div>
            </div>
            <div class="detail-item">
              <div class="detail-content">
                                <strong class="detail-label"><i class="detail-icon">🛠️</i> Tình trạng:</strong>
                                <span class="detail-value">${normalizedStation.TinhTrang}</span>
                            </div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-content">
                <strong class="detail-label"><i class="detail-icon">📍</i> Ký hiệu:</strong>
                                <span class="detail-value">${normalizedStation.KiHieu || "N/A"}</span>
              </div>
            </div>
          </div>
        </div>

                <div class="popup-actions">
                    <button class="action-btn primary" onclick="window.openHydrometDetails('${stationCodeForClick}', '${stationNameForClick}')">
                        <i class="btn-icon">📈</i>
                        Xem dữ liệu chi tiết
                    </button>
                </div>
      </div>
    </div>
  `;
};

// Enhanced popup creation with multiple parameter support
export const createHydrometPopup = (station, hydrometeorologyData) => {
    const normalizedStation = normalizeHydrometStation(station);
    const stationCodeForClick = escapePopupActionValue(normalizedStation.KiHieu);
    const stationNameForClick = escapePopupActionValue(normalizedStation.TenTram);

    // Better data validation
    let latestData = null;
    
    if (hydrometeorologyData) {
        // Handle both array response and object with data property
        const dataArray = Array.isArray(hydrometeorologyData) 
            ? hydrometeorologyData 
            : (hydrometeorologyData.data || []);
        
        if (dataArray && dataArray.length > 0) {
            latestData = dataArray[dataArray.length - 1];
        }
    }

    // Check if we have actual measurement data
    const hasValidData = latestData && Object.keys(latestData).some(key => {
        return (key.startsWith('R_') || key.startsWith('T') || key.startsWith('H')) && 
               latestData[key] !== null && 
               latestData[key] !== undefined && 
               latestData[key] !== "NULL" && 
               latestData[key] !== "";
    });

    if (!hasValidData) {
        console.log(`No valid data for station ${normalizedStation.KiHieu}, using basic popup`);
        return createBasicPopup(normalizedStation, "Chưa có dữ liệu đo đạc");
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
                    <h4 class="popup-name">${normalizedStation.TenTram}</h4>
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
        
        <div class="popup-details mt-3">
          <div class="detail-grid">
            <div class="detail-item">
              <div class="detail-content">
                <strong class="detail-label"><i class="detail-icon">🏷️</i> Phân loại:</strong>
                                <span class="detail-value">${normalizedStation.PhanLoai}</span>
              </div>
            </div>
            
            <div class="detail-item">
              <div class="detail-content">
                                <strong class="detail-label"><i class="detail-icon">🛠️</i> Tình trạng:</strong>
                                <span class="detail-value">${normalizedStation.TinhTrang}</span>
              </div>
            </div>
            
            <div class="detail-item">
              <div class="detail-content">
                                <strong class="detail-label"><i class="detail-icon">📍</i> Ký hiệu:</strong>
                                <span class="detail-value">${normalizedStation.KiHieu || "N/A"}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="popup-actions">
                    <button class="action-btn primary" onclick="window.openHydrometDetails('${stationCodeForClick}', '${stationNameForClick}')">
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
        R_NB: "Nhà Bè", // Rainfall from NB_KT station
        R_PVC: "Phạm Văn Cội",
        R_TTH: "Tam Thôn Hiệp", // Primary rainfall station for TTH
        R_TD: "Thủ Đức",
        R_TSH: "Tân Sơn Hòa",
        Ttb_TSH: "Nhiệt độ không khí trung bình", // Temperature from TSH station
        Tx_TSH: "Nhiệt độ không khí cao nhất",
        Tm_TSH: "Nhiệt độ không khí thấp nhất",

        // Water level (tb=trung bình, x=max, m=min) from NB_TV station
        Htb_NB: "Mực nước trung bình", // Nhà Bè NB_TV (Thủy văn)
        Hx_NB: "Mực nước cao nhất",
        Hm_NB: "Mực nước thấp nhất",
        Htb_PA: "Mực nước trung bình", // Phú An station
        Hx_PA: "Mực nước cao nhất",
        Hm_PA: "Mực nước thấp nhất",
    };

    return labelMap[paramKey] || paramKey;
};

// Enhanced rendering function with improved data processing
export const renderHydrometStations = async (mapInstance, setHydrometData, setSelectedStation) => {
    try {
        const stations = await fetchHydrometStations();
        const latLngs = [];

        for (const rawStation of stations || []) {
            const station = normalizeHydrometStation(rawStation);

            if (!station.KiHieu) {
                console.warn("⚠️ Bỏ qua trạm KTTV thiếu KiHieu:", rawStation);
                continue;
            }

            const lat = dmsToDecimal(station.ViDo);
            const lng = dmsToDecimal(station.KinhDo);

            if (lat === null || lng === null || Number.isNaN(lat) || Number.isNaN(lng)) {
                console.warn(`⚠️ Không thể chuyển tọa độ tại trạm ${station.TenTram}`);
                continue;
            }

            // Fetch station data with better error handling
            let hydrometeorologyData = null;
            try {
                const fetchResult = await fetchHydrometData(station.KiHieu);
                
                // Handle both array response and object with data property
                if (fetchResult) {
                    if (Array.isArray(fetchResult)) {
                        hydrometeorologyData = fetchResult;
                    } else if (fetchResult.data && Array.isArray(fetchResult.data)) {
                        hydrometeorologyData = fetchResult.data;
                    }
                }
                
                console.log(`Station ${station.KiHieu} data:`, {
                    hasData: !!hydrometeorologyData,
                    dataLength: hydrometeorologyData ? hydrometeorologyData.length : 0,
                    sampleData: hydrometeorologyData && hydrometeorologyData.length > 0 
                        ? Object.keys(hydrometeorologyData[0]) 
                        : 'No keys'
                });
            } catch (error) {
                console.warn(`Error fetching data for station ${station.KiHieu}:`, error);
                hydrometeorologyData = null;
            }

            let stationData = {
                rainfall: 0,
                temperature: 0,
                humidity: 0,
                hasData: false,
            };

            if (hydrometeorologyData && hydrometeorologyData.length > 0) {
                const latestRecord = hydrometeorologyData[hydrometeorologyData.length - 1];
                
                // Validate that we have actual measurement data
                const hasMeasurementData = Object.keys(latestRecord).some(key => {
                    return (key.startsWith('R_') || key.startsWith('T') || key.startsWith('H')) && 
                           latestRecord[key] !== null && 
                           latestRecord[key] !== undefined && 
                           latestRecord[key] !== "NULL" && 
                           latestRecord[key] !== "";
                });

                if (hasMeasurementData) {
                    stationData.hasData = true;

                    // Extract rainfall data - prioritize R_TTH then sum all R_ parameters
                    const rainfallKeys = Object.keys(latestRecord).filter((key) => key.startsWith("R_"));
                    
                    // Check for R_TTH specifically first
                    if (latestRecord.R_TTH !== null && latestRecord.R_TTH !== undefined && latestRecord.R_TTH !== "NULL") {
                        stationData.rainfall = parseFloat(latestRecord.R_TTH) || 0;
                    } else {
                        // Fallback: sum all available rainfall data
                        stationData.rainfall = rainfallKeys.reduce((sum, key) => {
                            const value = parseFloat(latestRecord[key]) || 0;
                            return sum + value;
                        }, 0);
                    }

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
                } else {
                    console.log(`Station ${station.KiHieu} has data but no valid measurements`);
                }
            } else {
                console.log(`Station ${station.KiHieu} has no data at all`);
            }

            // Create enhanced icon based on all parameters
            const icon = getHydrometIcon();

            const marker = L.marker([lat, lng], {
                icon,
                isHydrometStation: true,
            }).addTo(mapInstance);

            latLngs.push([lat, lng]);

            // Enhanced tooltip with status info
            const tooltipText = stationData.hasData
                ? `${station.TenTram || station.TenTam} - ${
                      stationData.rainfall > 0
                          ? `Mưa: ${stationData.rainfall.toFixed(1)}mm`
                          : stationData.temperature > 0
                          ? `${stationData.temperature.toFixed(1)}°C`
                          : "Có dữ liệu"
                  }`
                : `${station.TenTram || station.TenTam} - Chưa có dữ liệu`;

            marker.bindTooltip(tooltipText, {
                permanent: true,
                direction: "top",
                offset: [0, -15],
                className: `custom-tooltip enhanced-tooltip ${stationData.hasData ? 'has-data' : 'no-data'}`,
            });

            marker.on("click", () => {
                try {
                    const zoomLevel = 13;
                    const clickLat = dmsToDecimal(station.ViDo);
                    const clickLng = dmsToDecimal(station.KinhDo);

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
