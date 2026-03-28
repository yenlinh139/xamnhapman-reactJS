import React from "react";
import L from "leaflet";
import { dmsToDecimal } from "@components/convertDMSToDecimal";
import { fetchHydrometStations, fetchHydrometData } from "@components/map/mapDataServices";
import { prefixUnitMap } from "@components/map/mapStyles";
import { getHydrometIcon } from "@components/map/mapMarkers";

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

const getStationCode = (station) => {
    return String(station?.KiHieu || station?.kiHieu || station?.maTram || "").trim();
};

const getStationName = (station) => {
    return String(
        station?.TenTram || station?.TenTam || station?.tenTram || station?.tenTam || station?.name || "",
    ).trim();
};

const normalizeHydrometText = (value) =>
    String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

const HYDROMET_LAYER_TO_CATEGORY = {
    hydrometStations: "all",
    hydrometRainStations: "rain",
    hydrometMeteorologyStations: "meteorology",
    hydrometHydrologyStations: "hydrology",
};

const inferStationCategories = (station) => {
    const categories = new Set();
    const rawMetadata = [
        station?.LoaiTram,
        station?.loaiTram,
        station?.PhanLoai,
        station?.phanLoai,
        station?.TenTram,
        station?.TenTam,
        station?.KiHieu,
    ]
        .filter(Boolean)
        .map(normalizeHydrometText)
        .join(" ");

    if (rawMetadata.includes("mua")) {
        categories.add("rain");
    }
    if (rawMetadata.includes("khi tuong") || rawMetadata.includes("khi tuong thuy van")) {
        categories.add("meteorology");
    }
    if (rawMetadata.includes("thuy van")) {
        categories.add("hydrology");
    }

    const stationCode = String(station?.KiHieu || "").toUpperCase();
    if (stationCode.endsWith("_TV") || stationCode.includes("TV")) {
        categories.add("hydrology");
    }
    if (stationCode.endsWith("_KT") || stationCode.includes("KT")) {
        categories.add("meteorology");
    }

    if (categories.size === 0) {
        categories.add("meteorology");
    }

    return categories;
};

const stationMatchesLayerSelection = (station, activeLayerNames = []) => {
    if (!Array.isArray(activeLayerNames) || activeLayerNames.length === 0) {
        return true;
    }

    if (activeLayerNames.includes("hydrometStations")) {
        return true;
    }

    const stationCategories = inferStationCategories(station);

    return activeLayerNames.some((layerName) => {
        const category = HYDROMET_LAYER_TO_CATEGORY[layerName];
        return category === "all" || stationCategories.has(category);
    });
};

const getStationTypeLabel = (station, activeLayerNames = []) => {
    const categories = inferStationCategories(station);

    if (activeLayerNames.includes("hydrometRainStations") && categories.has("rain")) {
        return "Điểm đo mưa";
    }
    if (activeLayerNames.includes("hydrometHydrologyStations") && categories.has("hydrology")) {
        return "Trạm thủy văn";
    }
    if (activeLayerNames.includes("hydrometMeteorologyStations") && categories.has("meteorology")) {
        return "Trạm khí tượng";
    }
    if (categories.has("rain")) return "Điểm đo mưa";
    if (categories.has("hydrology")) return "Trạm thủy văn";
    return "Trạm khí tượng";
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
export const renderHydrometStations = async (
    mapInstance,
    setHydrometData,
    setSelectedStation,
    activeLayerNames = ["hydrometStations"],
) => {
    try {
        ensureStationPanes(mapInstance);

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

            if (!stationMatchesLayerSelection(station, activeLayerNames)) {
                continue;
            }

            const stationTypeLabel = getStationTypeLabel(station, activeLayerNames);
            const icon = getHydrometIcon(stationTypeLabel);

            const marker = L.marker([lat, lng], {
                icon,
                isHydrometStation: true,
                pane: "hydrometMarkerPane",
                zIndexOffset: 1000,
            }).addTo(mapInstance);

            latLngs.push([lat, lng]);

            // Enhanced tooltip with status info
            const tooltipText = station.TenTram || station.TenTam;

            marker.bindTooltip(tooltipText, {
                permanent: true,
                direction: "top",
                offset: [-1, -9],
                className: "custom-tooltip enhanced-tooltip station-tooltip",
                pane: "hydrometTooltipPane",
            });

            marker.on("click", async () => {
                try {
                    marker.bindPopup(
                        '<div class="popup-loading"><i class="fa-solid fa-spinner fa-spin"></i><p>Đang tải dữ liệu...</p></div>',
                        {
                            maxWidth: 400,
                            className: "custom-popup enhanced-popup",
                        },
                    );
                    marker.openPopup();

                    const fetchResult = await fetchHydrometData(station.KiHieu, {
                        limit: 100,
                        orderBy: "DESC",
                    });
                    const hydrometeorologyData = Array.isArray(fetchResult)
                        ? fetchResult
                        : Array.isArray(fetchResult?.data)
                          ? fetchResult.data
                          : [];

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
                        data: hydrometeorologyData,
                    });
                } catch (error) {
                    console.error("❌ Error in hydromet marker click handler:", error);
                }
            });
        }
    } catch (error) {
        console.error("❌ Error rendering hydromet stations:", error);
    }
};
