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

const getHydrometTypeLabel = (station = {}) => {
    const metadata = [
        station?.PhanLoai,
        station?.phanLoai,
        station?.LoaiTram,
        station?.loaiTram,
        station?.TenTram,
        station?.TenTam,
    ]
        .filter(Boolean)
        .map(normalizeHydrometText)
        .join(" ");

    const stationCode = String(station?.KiHieu || station?.kiHieu || "").toUpperCase();

    if (metadata.includes("mua") || stationCode.includes("R_")) {
        return "Điểm đo mưa";
    }

    if (metadata.includes("thuy van") || stationCode.endsWith("_TV") || stationCode.includes("TV")) {
        return "Thủy văn";
    }

    if (metadata.includes("khi tuong") || stationCode.endsWith("_KT") || stationCode.includes("KT")) {
        return "Trạm khí tượng";
    }

    return "Trạm khí tượng";
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
        PhanLoai: getHydrometTypeLabel(station),
        TinhTrang:
            station.TinhTrang || station.tinhTrang || station.TrangThai || station.status || "Không xác định",
    };
};

const escapePopupActionValue = (value) => {
    return String(value || "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'");
};

const getFirstValidValue = (...values) => {
    const found = values.find(
        (value) => value !== null && value !== undefined && value !== "" && value !== "NULL",
    );
    return found ?? null;
};

const getHydrometRowTimestamp = (row) => {
    const rawDate = getFirstValidValue(
        row?.Ngày,
        row?.Ngay,
        row?.date,
        row?.Date,
        row?.timestamp,
        row?.created_at,
    );
    if (!rawDate) return null;

    const parsed = new Date(rawDate);
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
};

const isRainfallParamKey = (key = "") => /^R_/i.test(String(key).trim());
const isTemperatureParamKey = (key = "") => {
    const normalized = String(key).trim();
    return /^(Ttb|Tx|Tm)(_|$)/i.test(normalized) || /^T_/i.test(normalized);
};
const isHydrologyParamKey = (key = "") => {
    const normalized = String(key).trim();
    return /^(Htb|Hx|Hm)(_|$)/i.test(normalized) || /^H_/i.test(normalized);
};
const isHydrometMeasurementKey = (key = "") => {
    return isRainfallParamKey(key) || isTemperatureParamKey(key) || isHydrologyParamKey(key);
};

const resolveTemperatureType = (paramKey = "") => {
    const normalized = String(paramKey).toLowerCase();
    if (normalized.startsWith("ttb")) return "Ttb";
    if (normalized.startsWith("tx")) return "Tx";
    if (normalized.startsWith("tm")) return "Tm";
    return "Ttb";
};

const resolveHydrologyType = (paramKey = "") => {
    const normalized = String(paramKey).toLowerCase();
    if (normalized.startsWith("htb")) return "Htb";
    if (normalized.startsWith("hx")) return "Hx";
    if (normalized.startsWith("hm")) return "Hm";
    return "Htb";
};

const inferHydrometStationTypeKey = (station = {}) => {
    const stationType = normalizeHydrometText(station?.PhanLoai || station?.phanLoai);
    const stationCode = String(station?.KiHieu || "").toUpperCase();

    if (stationType.includes("mua")) return "rain";
    if (stationType.includes("thuy van") || stationCode.endsWith("_TV")) return "hydrology";
    return "meteorology";
};

const formatHydrometDateLabel = (value) => {
    if (!value) return "Chưa có dữ liệu";

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return String(value);
    }

    return parsed.toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const summarizeHydrometElement = (value) => {
    if (!value) return null;

    const parts = String(value)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

    if (parts.length <= 4) return parts.join(", ");
    return `${parts.slice(0, 4).join(", ")}...`;
};

const FLOOD_ALERT_THRESHOLDS_M = {
    BD1: 1.4,
    BD2: 1.5,
    BD3: 1.6,
};

const normalizeWaterLevelToMeters = (value, unit = "") => {
    const numeric = Number.parseFloat(value);
    if (!Number.isFinite(numeric)) return null;

    const normalizedUnit = String(unit || "").toLowerCase();
    if (normalizedUnit.includes("cm")) return numeric / 100;
    if (normalizedUnit.includes("mm")) return numeric / 1000;
    return numeric;
};

const getWaterLevelAlertMeta = (value, unit = "") => {
    const waterLevelMeters = normalizeWaterLevelToMeters(value, unit);

    if (!Number.isFinite(waterLevelMeters)) {
        return {
            level: "Không xác định",
            color: "#6c757d",
        };
    }

    if (waterLevelMeters >= FLOOD_ALERT_THRESHOLDS_M.BD3) {
        return { level: "BD3", color: "#dc3545" };
    }
    if (waterLevelMeters >= FLOOD_ALERT_THRESHOLDS_M.BD2) {
        return { level: "BD2", color: "#fd7e14" };
    }
    if (waterLevelMeters >= FLOOD_ALERT_THRESHOLDS_M.BD1) {
        return { level: "BD1", color: "#ffc107" };
    }

    return { level: "Dưới BD1", color: "#28a745" };
};

const createMetricCard = ({ label, value, unit, color }) => {
    const numericValue = Number.parseFloat(value);
    const displayValue = Number.isFinite(numericValue) ? numericValue.toFixed(1) : "--";

    return `
            <div class="param-item metric-card">
                <div class="param-content">
                    <span class="param-label">${label}</span>
                    <span class="param-value" style="color: ${color}">
                        ${displayValue} ${unit || ""}
                    </span>
                </div>
            </div>
        `;
};

// Basic popup for stations without data - MOVED TO TOP
const createBasicPopup = (station, message = "Chưa có dữ liệu") => {
    const normalizedStation = normalizeHydrometStation(station);
    const stationCodeForClick = escapePopupActionValue(normalizedStation.KiHieu);
    const stationNameForClick = escapePopupActionValue(normalizedStation.TenTram);
    const elementSummary = summarizeHydrometElement(
        getFirstValidValue(normalizedStation?.YeuTo, normalizedStation?.yeuTo, normalizedStation?.yeu_to),
    );
    const TanSuat = getFirstValidValue(
        normalizedStation?.TanSuat,
        normalizedStation?.Tansuat,
        normalizedStation?.tanSuat,
        normalizedStation?.tansuat,
        normalizedStation?.tan_suat,
    );

    return `
    <div class="modern-popup hydromet-popup basic">
      <div class="popup-header">
        <div class="popup-icon">🌤️</div>
        <div class="popup-title">
                    <h4 class="popup-name">${normalizedStation.TenTram}</h4>
          <span class="popup-type">${normalizedStation.PhanLoai}</span>
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
                <strong class="detail-label">Ký hiệu:</strong>
                                <span class="detail-value">${normalizedStation.KiHieu || "N/A"}</span>
              </div>
            </div>
                        <div class="detail-item">
                            <div class="detail-content">
                                                                <strong class="detail-label">Tần suất:</strong>
                                                                <span class="detail-value">${TanSuat || "Không xác định"}</span>
                            </div>
                        </div>
                        ${
                            elementSummary
                                ? `
                        <div class="detail-item">
                            <div class="detail-content">
                                                                <strong class="detail-label">Yếu tố:</strong>
                                                                <span class="detail-value">${elementSummary}</span>
                            </div>
                        </div>
                        `
                                : ""
                        }
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
    const stationTypeKey = inferHydrometStationTypeKey(normalizedStation);
    const stationCodeForClick = escapePopupActionValue(normalizedStation.KiHieu);
    const stationNameForClick = escapePopupActionValue(normalizedStation.TenTram);

    // Pick the newest valid row, regardless of API ordering.
    let latestData = null;

    if (hydrometeorologyData) {
        // Handle both array response and object with data property
        const dataArray = Array.isArray(hydrometeorologyData)
            ? hydrometeorologyData
            : hydrometeorologyData.data || [];

        if (dataArray && dataArray.length > 0) {
            const validRows = dataArray.filter((row) => {
                if (!row || typeof row !== "object") return false;
                return Object.keys(row).some((key) => {
                    const value = row[key];
                    return (
                        isHydrometMeasurementKey(key) &&
                        value !== null &&
                        value !== undefined &&
                        value !== "NULL" &&
                        value !== ""
                    );
                });
            });

            latestData =
                [...validRows].sort((a, b) => {
                    const timeA = getHydrometRowTimestamp(a);
                    const timeB = getHydrometRowTimestamp(b);

                    if (timeA === null && timeB === null) return 0;
                    if (timeA === null) return 1;
                    if (timeB === null) return -1;
                    return timeB - timeA;
                })[0] ||
                validRows[validRows.length - 1] ||
                dataArray[dataArray.length - 1];
        }
    }

    // Check if we have actual measurement data
    const hasValidData =
        latestData &&
        Object.keys(latestData).some((key) => {
            return (
                isHydrometMeasurementKey(key) &&
                latestData[key] !== null &&
                latestData[key] !== undefined &&
                latestData[key] !== "NULL" &&
                latestData[key] !== ""
            );
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
        if (isRainfallParamKey(key)) {
            rainfallParams[key] = latestData[key];
        } else if (isTemperatureParamKey(key)) {
            temperatureParams[key] = latestData[key];
        } else if (isHydrologyParamKey(key)) {
            humidityParams[key] = latestData[key];
        }
    });

    // Get primary parameter for main display using station type priority
    const { primaryLabel, primaryValue, primaryUnit, statusColor, primaryKey } = getPrimaryParameter(
        rainfallParams,
        temperatureParams,
        humidityParams,
        stationTypeKey,
        normalizedStation,
    );

    const formattedDate = formatHydrometDateLabel(
        getFirstValidValue(latestData?.Ngày, latestData?.Ngay, latestData?.date, latestData?.Date),
    );
    const element = getFirstValidValue(
        latestData?.YeuTo,
        latestData?.yeuTo,
        latestData?.yeu_to,
        normalizedStation?.YeuTo,
        normalizedStation?.yeuTo,
    );
    const TanSuat = getFirstValidValue(
        latestData?.TanSuat,
        latestData?.Tansuat,
        latestData?.tanSuat,
        latestData?.tansuat,
        latestData?.tan_suat,
        normalizedStation?.TanSuat,
        normalizedStation?.Tansuat,
        normalizedStation?.tanSuat,
        normalizedStation?.tansuat,
    );

    const elementSummary = summarizeHydrometElement(element);
    const shouldShowElement = Boolean(elementSummary) && stationTypeKey === "meteorology";
    const secondaryCards = createSecondaryParameterCards(
        stationTypeKey,
        rainfallParams,
        temperatureParams,
        humidityParams,
        primaryKey,
    );
    const isMeteorology = stationTypeKey === "meteorology";
    const primaryCard = createMetricCard({
        label: primaryLabel,
        value: primaryValue,
        unit: primaryUnit,
        color: statusColor,
    });
    const metricCardsHtml = isMeteorology ? `${primaryCard}${secondaryCards}` : secondaryCards;

        return `
        <div class="modern-popup hydromet-popup enhanced">
            <div class="popup-header">
                <div class="popup-title">
                    <h4 class="popup-name">${normalizedStation.TenTram}</h4>
                    <span class="popup-type">${normalizedStation.PhanLoai}</span>
                </div>
            </div>

            <div class="popup-content">
                ${
                        !isMeteorology
                                ? `<div class="popup-main-value">
                    <span class="value-label">${primaryLabel}</span>
                    <span class="value-number" style="color: ${statusColor}">
                        ${primaryValue.toFixed(1)} ${primaryUnit}
                    </span>
                </div>`
                                : ""
                }

                ${
                        metricCardsHtml
                                ? `<div class="multi-param-grid ${isMeteorology ? "meteorology-grid" : ""}">${metricCardsHtml}</div>`
                                : ""
                }

                <div class="popup-details mt-3">
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-content">
                                <strong class="detail-label">Quan trắc:</strong>
                                <span class="detail-value">${formattedDate}</span>
                            </div>
                        </div>

                        <div class="detail-item">
                            <div class="detail-content">
                                <strong class="detail-label">Ký hiệu:</strong>
                                <span class="detail-value">${normalizedStation.KiHieu || "N/A"}</span>
                            </div>
                        </div>

                        <div class="detail-item">
                            <div class="detail-content">
                                <strong class="detail-label">Tần suất:</strong>
                                <span class="detail-value">${TanSuat || "Không xác định"}</span>
                            </div>
                        </div>

                        ${
                                shouldShowElement
                                        ? `<div class="detail-item">
                            <div class="detail-content">
                                <strong class="detail-label">Yếu tố:</strong>
                                <span class="detail-value">${elementSummary}</span>
                            </div>
                        </div>`
                                        : ""
                        }
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
const createParameterCards = (rainfall, temperature, humidity, excludedPrimaryKey = null) => {
    const unitMap = prefixUnitMap();
    let cards = "";

    // Rainfall parameters
    if (Object.keys(rainfall).length > 0) {
        const rainfallCard = Object.entries(rainfall)
            .filter(([key]) => key !== excludedPrimaryKey)
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
            .filter(([key]) => key !== excludedPrimaryKey)
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
            .filter(([key]) => key !== excludedPrimaryKey)
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

const createSecondaryParameterCards = (
    stationTypeKey,
    rainfallParams,
    temperatureParams,
    humidityParams,
    excludedPrimaryKey,
) => {
    if (stationTypeKey === "rain") {
        return "";
    }

    const rainfallCards = Object.entries(rainfallParams)
        .filter(([key]) => key !== excludedPrimaryKey)
        .map(([key, value]) => ({ key, details: getParameterDetails(key, value) }));
    const temperatureCards = Object.entries(temperatureParams)
        .filter(([key]) => key !== excludedPrimaryKey)
        .map(([key, value]) => ({ key, details: getParameterDetails(key, value) }));
    const hydrologyCards = Object.entries(humidityParams)
        .filter(([key]) => key !== excludedPrimaryKey)
        .map(([key, value]) => ({ key, details: getParameterDetails(key, value) }));

    const orderedCards =
        stationTypeKey === "hydrology"
            ? [...hydrologyCards, ...rainfallCards, ...temperatureCards]
            : [...temperatureCards, ...hydrologyCards, ...rainfallCards];

    return orderedCards
        .slice(0, 3)
        .map(({ details }) => {
            return `
          <div class="param-item ${details.category}">
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
};

// Helper function to get primary parameter for display
const getPrimaryParameter = (
    rainfallParams,
    temperatureParams,
    humidityParams,
    stationTypeKey = "meteorology",
) => {
    const unitMap = prefixUnitMap();

    const pickRainfallPrimary = () => {
        if (Object.keys(rainfallParams).length === 0) return null;
        const rainfallKey = Object.keys(rainfallParams)[0];
        const rainfallValue = parseFloat(rainfallParams[rainfallKey]) || 0;
        return {
            primaryLabel: unitMap.R.content,
            primaryValue: rainfallValue,
            primaryUnit: unitMap.R.donvi,
            statusColor: getRainfallColor(rainfallValue),
            primaryKey: rainfallKey,
        };
    };

    const pickTemperaturePrimary = () => {
        if (Object.keys(temperatureParams).length === 0) return null;
        // Prioritize average temperature
        const tempKey =
            Object.keys(temperatureParams).find((key) => key.includes("tb")) ||
            Object.keys(temperatureParams)[0];
        const tempValue = parseFloat(temperatureParams[tempKey]) || 0;
        const tempType = resolveTemperatureType(tempKey);

        return {
            primaryLabel: unitMap[tempType].content,
            primaryValue: tempValue,
            primaryUnit: unitMap[tempType].donvi,
            statusColor: getTemperatureColor(tempValue),
            primaryKey: tempKey,
        };
    };

    const pickHydrologyPrimary = () => {
        if (Object.keys(humidityParams).length === 0) return null;
        // Prioritize average humidity
        const humidityKey =
            Object.keys(humidityParams).find((key) => key.includes("tb")) || Object.keys(humidityParams)[0];
        const humidityValue = parseFloat(humidityParams[humidityKey]) || 0;
        const humidityType = resolveHydrologyType(humidityKey);
        const alertMeta = getWaterLevelAlertMeta(humidityValue, unitMap[humidityType].donvi);

        return {
            primaryLabel: `${unitMap[humidityType].content} (${alertMeta.level})`,
            primaryValue: humidityValue,
            primaryUnit: unitMap[humidityType].donvi,
            statusColor: alertMeta.color,
            primaryKey: humidityKey,
        };
    };

    const typePriorityMap = {
        rain: [pickRainfallPrimary, pickTemperaturePrimary, pickHydrologyPrimary],
        meteorology: [pickTemperaturePrimary, pickHydrologyPrimary, pickRainfallPrimary],
        hydrology: [pickHydrologyPrimary, pickRainfallPrimary, pickTemperaturePrimary],
    };

    const priorityResolvers = typePriorityMap[stationTypeKey] || typePriorityMap.meteorology;
    for (const resolver of priorityResolvers) {
        const result = resolver();
        if (result) return result;
    }

    return {
        primaryLabel: "Không có dữ liệu",
        primaryValue: 0,
        primaryUnit: "",
        statusColor: "#6c757d",
        primaryKey: null,
    };
};

// Color functions based on parameter values
const getRainfallColor = (value) => {
    if (value === 0) return "#6c757d"; // Gray for no rain
    if (value < 10) return "#0ea5e9"; // Light blue
    if (value < 50) return "#0284c7"; // Medium blue
    if (value < 100) return "#0369a1"; // Deep blue
    return "#1d4ed8"; // Very high rainfall - strong blue
};

const getTemperatureColor = (value) => {
    if (value < 20) return "#007bff"; // Blue for cold
    if (value < 25) return "#28a745"; // Green for cool
    if (value < 30) return "#ffc107"; // Yellow for warm
    if (value < 35) return "#fd7e14"; // Orange for hot
    return "#dc3545"; // Red for very hot
};

const getHumidityColor = (value, unit = "") => {
    return getWaterLevelAlertMeta(value, unit).color;
};

// Helper function to get parameter details with correct units from prefixUnitMap
const getParameterDetails = (paramKey, value) => {
    const unitMap = prefixUnitMap();
    const numValue = parseFloat(value) || 0;

    // Determine parameter type and get appropriate unit/color
    if (isRainfallParamKey(paramKey)) {
        return {
            label: "Lượng mưa",
            value: numValue,
            unit: unitMap.R.donvi,
            color: getRainfallColor(numValue),
            icon: "🌧️",
            category: "rainfall",
        };
    } else if (isTemperatureParamKey(paramKey)) {
        const tempType = resolveTemperatureType(paramKey);
        const icon = numValue > 30 ? "🌡️" : numValue < 20 ? "❄️" : "🌡️";

        return {
            label: unitMap[tempType].content,
            value: numValue,
            unit: unitMap[tempType].donvi,
            color: getTemperatureColor(numValue),
            icon: icon,
            category: "temperature",
        };
    } else if (isHydrologyParamKey(paramKey)) {
        const humidityType = resolveHydrologyType(paramKey);
        const waterLevelAlert = getWaterLevelAlertMeta(numValue, unitMap[humidityType].donvi);

        return {
            label: `${unitMap[humidityType].content} (${waterLevelAlert.level})`,
            value: numValue,
            unit: unitMap[humidityType].donvi,
            color: getHumidityColor(numValue, unitMap[humidityType].donvi),
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
