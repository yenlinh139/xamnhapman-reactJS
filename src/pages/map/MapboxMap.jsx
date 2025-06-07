import React, { useEffect, useState, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet.locatecontrol/dist/L.Control.Locate.css";
import "leaflet.locatecontrol";
import "leaflet-draw";
import "@components/BetterWMS.js";
import axiosInstance from "@config/axios-config";
import { convertDMSToDecimal, dmsToDecimal } from "@components/convertDMSToDecimal";
import { ToastCommon } from "@components/ToastCommon.jsx";
import { TOAST } from "@common/constants.js";
import SaltChartFull from "@pages/map/SaltChartFull";
import MapDetails from "@pages/map/MapDetails";
import { initializeMap } from "@components/map/mapInitialization";
import { getSalinityTooltipClass, renderSalinityPoints } from "@components/map/SalinityMarkers";
import { renderHydrometStations } from "@components/map/HydrometMarkers";
import { updateLegendVisibility } from "@components/map/mapStyles";
import { handleLocationChange, handleFeatureHighlight } from "@components/map/mapUtils";

import {
    fetchSalinityStationPositions,
    fetchHydrometeorologyStationPositions,
} from "@components/map/mapDataServices";
import { getSalinityIcon, getHydrometIcon } from "@components/map/mapMarkers";
import { prefixUnitMap } from "@components/map/mapStyles.js";

const MapboxMap = ({ selectedLayers, selectedLocation, highlightedFeature }) => {
    const mapContainer = useRef(null);
    const [map, setMap] = useState(null);
    const overlayLayers = useRef({});
    const [selectedPoint, setSelectedPoint] = useState(null);
    const [showFullChart, setShowFullChart] = useState(false);
    const [salinityData, setSalinityData] = useState([]);
    const [selectedStation, setSelectedStation] = useState(null);
    const [hydrometData, setHydrometData] = useState([]);
    const highlightedLayerRef = useRef(null);
    const highlightedMarkerRef = useRef(null);

    const handleCloseDetails = () => {
        setSelectedPoint(null);
        setSelectedStation(null);
    };

    // Add global function for popup button action
    useEffect(() => {
        window.openChartDetails = (kiHieu) => {
            // Find the selected point data
            const selectedPointData = selectedPoint?.kiHieu === kiHieu ? selectedPoint : null;

            if (selectedPointData && salinityData.length > 0) {
                setShowFullChart(true);
            } else {
                // If point data is not available, fetch it
                const fetchPointData = async () => {
                    try {
                        // You might need to fetch the point data here if not already available
                        // For now, just open the chart with available data
                        setShowFullChart(true);
                    } catch (error) {
                        console.error("Error opening chart details:", error);
                    }
                };
                fetchPointData();
            }
        };

        window.openHydrometDetails = (maTram) => {
            // Find the selected station data
            const selectedStationData = selectedStation?.maTram === maTram ? selectedStation : null;

            if (selectedStationData && hydrometData.length > 0) {
                setShowFullChart(true);
            } else {
                // If station data is not available, fetch it
                const fetchStationData = async () => {
                    try {
                        // You might need to fetch the station data here if not already available
                        // For now, just open the chart with available data
                        setShowFullChart(true);
                    } catch (error) {
                        console.error("Error opening hydromet details:", error);
                    }
                };
                fetchStationData();
            }
        };

        // Cleanup function
        return () => {
            if (window.openChartDetails) {
                delete window.openChartDetails;
            }
            if (window.openHydrometDetails) {
                delete window.openHydrometDetails;
            }
        };
    }, [selectedPoint, salinityData, selectedStation, hydrometData]);

    // Initialize map
    useEffect(() => {
        if (map || !mapContainer.current) return;

        const { mapInstance } = initializeMap(mapContainer.current);
        setMap(mapInstance);

        // Add a test function to window for debugging
        window.testHighlightFeature = () => {
            const testFeature = {
                geometry: {
                    type: "Point",
                    coordinates: [106.7, 10.8], // Test coordinates in HCMC
                },
                icon: "droplet",
                name: "Test Point",
            };

            handleFeatureHighlight(mapInstance, testFeature, highlightedLayerRef, highlightedMarkerRef);
        };

        // Add a resize handler to recalculate map size when container changes
        const handleResize = () => {
            if (mapInstance) {
                // Invalidate map size after a short delay
                setTimeout(() => {
                    mapInstance.invalidateSize();
                }, 10);
            }
        };

        // Listen for window resize events
        window.addEventListener("resize", handleResize);

        return () => {
            // Clean up event listeners
            window.removeEventListener("resize", handleResize);
            delete window.testHighlightFeature;
            if (mapInstance) {
                mapInstance.remove();
            }
        };
    }, []);

    // Handle layer changes and re-render map
    useEffect(() => {
        if (!map || !selectedLayers) return;

        // Clear existing selections when layers change
        setSelectedPoint(null);
        setSelectedStation(null);
        setShowFullChart(false);
        setSalinityData([]);
        setHydrometData([]);

        // Clear existing overlay layers (WMS layers)
        Object.entries(overlayLayers.current).forEach(([_, layer]) => {
            if (map.hasLayer(layer)) {
                map.removeLayer(layer);
            }
        });
        overlayLayers.current = {};

        // Clear all markers and layers from map
        map.eachLayer((layer) => {
            if (layer.options?.isSalinityPoint || layer.options?.isHydrometStation) {
                map.removeLayer(layer);
            }
        });

        // Implement mutual exclusivity between salinity points and hydromet stations
        const hasSalinityPoints = selectedLayers.includes("salinityPoints");
        const hasHydrometStations = selectedLayers.includes("hydrometStations");

        // Add selected layers without mutual exclusivity
        selectedLayers.forEach((layerName) => {
            if (layerName === "salinityPoints") {
                renderSalinityPoints(map, setSalinityData, setSelectedPoint);
                // Add to overlay layers for legend visibility
                overlayLayers.current[layerName] = {
                    name: "Điểm đo mặn",
                    type: "marker",
                };
            } else if (layerName === "hydrometStations") {
                renderHydrometStations(map, setHydrometData, setSelectedStation);
                // Add to overlay layers for legend visibility
                overlayLayers.current[layerName] = {
                    name: "Trạm khí tượng thủy văn",
                    type: "marker",
                };
            } else {
                // Handle WMS layers from GeoServer
                const wmsLayer = L.tileLayer.betterWms(
                    "http://localhost:8080/geoserver/xamnhapman_tphcm/wms",
                    {
                        layers: `xamnhapman_tphcm:${layerName}`,
                        transparent: true,
                        format: "image/png",
                        version: "1.1.1", // quan trọng
                        info_format: "text/html", // để hiển thị bảng đẹp
                        attribution: "GeoServer",
                    },
                );

                wmsLayer.addTo(map);
                overlayLayers.current[layerName] = wmsLayer;
            }
        });

        updateLegendVisibility(overlayLayers.current);

        // Force map refresh/re-render
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    }, [selectedLayers, map]);

    // Handle location changes
    useEffect(() => {
        handleLocationChange(map, selectedLocation);
    }, [selectedLocation, map]);

    // Handle feature highlighting
    useEffect(() => {
        handleFeatureHighlight(map, highlightedFeature, highlightedLayerRef, highlightedMarkerRef);
    }, [highlightedFeature, map]);

    // Date search functionality for legend
    useEffect(() => {
        if (!map) return;

        // Define the function to clear date search data and markers
        window.clearDateSearchData = () => {
            // Clear all summary points and markers from the map
            map.eachLayer((layer) => {
                if (
                    layer.options?.isSummaryPoint ||
                    layer.options?.isHydrometSummary ||
                    (layer.options?.isSalinityPoint && layer.options?.kiHieu)
                ) {
                    map.removeLayer(layer);
                }
            });

            // Reset the legend UI
            const legendPrimary = document.getElementById("legend-primary");
            const legendSummary = document.getElementById("legend-summary");

            if (legendPrimary) {
                legendPrimary.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-calendar-day"></i>
                        <p>Chọn ngày để xem dữ liệu</p>
                    </div>
                `;
            }

            if (legendSummary) {
                legendSummary.style.display = "none";
            }

            // Reset date input if exists
            const dateInput = document.getElementById("legend-date");
            if (dateInput) {
                dateInput.value = "";
            }

            // Show success toast
            ToastCommon(TOAST.SUCCESS, "Đã xóa dữ liệu tìm kiếm thành công");
        };

        setTimeout(() => {
            const dateInput = document.getElementById("legend-date");
            if (!dateInput) return;

            // Date input processing

            // Configure date input events

            dateInput.addEventListener("change", async () => {
                const rawDate = dateInput.value; // yyyy-mm-dd
                const legendPrimary = document.getElementById("legend-primary");
                if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return;

                const [year, month, day] = rawDate.split("-");
                if (parseInt(year, 10) < 1000) return;

                try {
                    // Show loading indicator in the legend
                    if (legendPrimary) {
                        legendPrimary.innerHTML = `
                            <div class="loading-indicator">
                                <div class="spinner-border text-primary" role="status" style="width: 2rem; height: 2rem;">
                                    <span class="visually-hidden">Đang tải...</span>
                                </div>
                                <p>Đang tìm kiếm dữ liệu cho ngày ${day}-${month}-${year}...</p>
                            </div>
                        `;
                    }

                    // Clear previous summary points
                    map.eachLayer((layer) => {
                        if (layer.options?.isSummaryPoint || layer.options?.isHydrometSummary) {
                            map.removeLayer(layer);
                        }
                    });

                    const response = await axiosInstance.get(`search-date/${rawDate}`);
                    const data = response.data;

                    // Check if we have any data at all
                    const hasData =
                        data.meteorologyData?.length > 0 ||
                        data.hydrologyData?.length > 0 ||
                        data.salinityData?.length > 0;

                    if (!hasData) {
                        // No data found for this date
                        if (legendPrimary) {
                            legendPrimary.innerHTML = `
                                <div class="empty-state">
                                    <i class="fas fa-exclamation-circle"></i>
                                    <p>Không tìm thấy dữ liệu cho ngày ${day}-${month}-${year}</p>
                                </div>
                            `;
                        }
                        return;
                    }

                    // Process hydrometeorology data if available
                    if (data.meteorologyData?.length || data.hydrologyData?.length) {
                        const hydrometeorologyPositions = await fetchHydrometeorologyStationPositions(
                            data.meteorologyData || data.hydrologyData,
                        );

                        renderHydrometeorologySummaryPoints(map, hydrometeorologyPositions);
                    }

                    // Process salinity data if available
                    if (data.salinityData?.length) {
                        const salinityPositions = await fetchSalinityStationPositions(data.salinityData);
                        renderSalinitySummaryPoints(map, salinityPositions);
                    }

                    // Update legend UI with new structure
                    const legendSummary = document.getElementById("legend-summary");

                    if (legendSummary && legendPrimary) {
                        legendSummary.style.display = "block";

                        const formattedDate = `${day}-${month}-${year}`;
                        const labelMapping = {
                            meteorologyData: "Khí tượng",
                            salinityData: "Độ mặn",
                            hydrologyData: "Thủy văn",
                        };

                        const handleClickSearchDate = (station) => {
                            console.log(`handleClickSearchDate station:`, station);

                            // Kiểm tra xem station có tọa độ hợp lệ không
                            if (station && station.position) {
                                const { vido, kinhdo } = station.position;
                                console.log(`Tọa độ trạm:`, { vido, kinhdo });

                                // Có thể zoom đến vị trí trạm trên bản đồ
                                if (map && vido && kinhdo) {
                                    map.setView([vido, kinhdo], 14);

                                    // Tạo popup hiển thị thông tin trạm
                                    const popupContent = `
                                        <div class="station-popup">
                                            <h6>${station.name || "Trạm quan trắc"}</h6>
                                            ${station.value ? `<p>Giá trị: ${station.value} ${station.unit || ""}</p>` : ""}
                                            <p>Vĩ độ: ${vido}</p>
                                            <p>Kinh độ: ${kinhdo}</p>
                                        </div>
                                    `;

                                    L.popup().setLatLng([vido, kinhdo]).setContent(popupContent).openOn(map);
                                }
                            } else {
                                console.warn("Không có thông tin tọa độ hợp lệ cho trạm:", station);
                            }
                        };

                        // Process stations data for better display in the legend
                        const processStationsData = async () => {
                            const stationsInfo = {};

                            // Process salinity data
                            if (data.salinityData?.length > 0) {
                                const salinityPositions = await fetchSalinityStationPositions(
                                    data.salinityData,
                                );
                                stationsInfo.salinityData = salinityPositions.map((station) => ({
                                    position: {
                                        vido: convertDMSToDecimal(station.position[0].ViDo),
                                        kinhdo: convertDMSToDecimal(station.position[0].KinhDo),
                                    },
                                    name: station.position[0].TenDiem,
                                    value: parseFloat(station.value).toFixed(2),
                                    unit: "‰",
                                    kiHieu: station.kiHieu,
                                    color: getSalinityColor(parseFloat(station.value)),
                                }));
                            }

                            const groupHydrometStations = (positions) => {
                                const grouped = {};
                                positions.forEach((pos) => {
                                    if (!pos.position || !pos.position[0]) return;

                                    const key = pos.position[0].KiHieu;
                                    if (!grouped[key]) {
                                        grouped[key] = {
                                            position: {
                                                vido: dmsToDecimal(pos.position[0].ViDo),
                                                kinhdo: dmsToDecimal(pos.position[0].KinhDo),
                                            },
                                            name: pos.position[0].TenTam,
                                            values: [],
                                        };
                                    }

                                    const prefix = pos.kiHieu.split("_")[0];
                                    const unitData = prefixUnitMap()[prefix] || {};
                                    const unit = unitData.donvi || "";

                                    grouped[key].values.push({
                                        paramName: unitData.label || pos.kiHieu,
                                        value: parseFloat(pos.value).toFixed(2),
                                        unit,
                                    });
                                });

                                return Object.values(grouped);
                            };

                            // Process meteorology data
                            if (data.meteorologyData?.length > 0) {
                                const meteoPositions = await fetchHydrometeorologyStationPositions(
                                    data.meteorologyData,
                                );
                                stationsInfo.meteorologyData = groupHydrometStations(meteoPositions);
                            }

                            // Process hydrology data
                            if (data.hydrologyData?.length > 0) {
                                const hydroPositions = await fetchHydrometeorologyStationPositions(
                                    data.hydrologyData,
                                );
                                stationsInfo.hydrologyData = groupHydrometStations(hydroPositions);
                            }

                            return stationsInfo;
                        };

                        // Generate the legend HTML with station data
                        const updateLegendWithStations = async () => {
                            const stationsInfo = await processStationsData();

                            // Create array with all three data types to ensure they are all displayed
                            const allDataTypes = ["salinityData", "meteorologyData", "hydrologyData"];

                            legendPrimary.innerHTML = `
                              <div class="data-summary-card">
                                <div class="summary-header">
                                  <div class="d-flex justify-content-between align-items-center w-100">
                                    <h6 class="summary-date mb-0">📅 ${formattedDate}</h6>
                                    <button class="btn btn-sm btn-outline-danger clear-data-btn" onclick="clearDateSearchData()" title="Xóa dữ liệu tìm kiếm và các điểm trên bản đồ">
                                      <i class="fa-solid fa-xmark"></i>
                                    </button>
                                  </div>
                                </div>
                               <div class="summary-stats">
                                ${allDataTypes
                                    .map((key) => {
                                        const label = labelMapping[key] || key;
                                        const count = data[key]?.length || 0;

                                        // Salinity data
                                        if (key === "salinityData" && stationsInfo.salinityData?.length > 0) {
                                            return `
                                                <div class="stat-item" >
                                                    <span class="stat-label">${label}</span>
                                                    <div class="station-list">
                                                        ${stationsInfo.salinityData
                                                            .map(
                                                                (station) => `
                                                        <div class="station-item" data-station="${station.kiHieu}" data-position='${JSON.stringify(station)}' role="button" tabindex="0">
                                                            <span class="station-name">${station.name}</span>
                                                            <span class="station-value" style="color: ${station.color}; font-weight: 600; background-color: rgba(${station.color === "blue" ? "0,0,255,0.1" : station.color === "#fd7e14" ? "253,126,20,0.1" : "220,53,69,0.1"}); padding: 3px 8px; border-radius: 12px;">
                                                            ${station.value} ${station.unit}
                                                            </span>
                                                        </div>
                                                        `,
                                                            )
                                                            .join("")}
                                                    </div>
                                                </div>
                                            `;
                                        }

                                        // Meteorology data
                                        else if (
                                            key === "meteorologyData" &&
                                            stationsInfo.meteorologyData?.length > 0
                                        ) {
                                            return `
                                                <div class="stat-item">
                                                <span class="stat-label">${label}</span>
                                                <div class="station-list">
                                                    ${stationsInfo.meteorologyData
                                                        .map(
                                                            (station) => `
                                                    <div class="station-item" data-station="${station.name}" data-position='${JSON.stringify(station)}' role="button" tabindex="0">
                                                        <span class="station-name">${station.name}</span>
                                                        <div class="station-params">
                                                        ${station.values
                                                            .map(
                                                                (param) => `
                                                            <div class="param-item">
                                                            <span class="param-value" style="background-color: rgba(13, 110, 253, 0.1); padding: 2px 6px; border-radius: 10px; font-weight: 500;">
                                                                ${param.value} ${param.unit}
                                                            </span>
                                                            </div>
                                                        `,
                                                            )
                                                            .join("")}
                                                        </div>
                                                    </div>
                                                    `,
                                                        )
                                                        .join("")}
                                                </div>
                                                </div>
                                            `;
                                        }

                                        // Hydrology data
                                        else if (
                                            key === "hydrologyData" &&
                                            stationsInfo.hydrologyData?.length > 0
                                        ) {
                                            return `
                                                <div class="stat-item">
                                                <span class="stat-label">${label}</span>
                                                <div class="station-list">
                                                    ${stationsInfo.hydrologyData
                                                        .map(
                                                            (station) => `
                                                    <div class="station-item" data-station="${station.name}" data-position='${JSON.stringify(station)}' role="button" tabindex="0">
                                                        <span class="station-name">${station.name}</span>
                                                        <div class="station-params">
                                                        ${station.values
                                                            .map(
                                                                (param) => `
                                                            <div class="param-item">
                                                            <span class="param-value" style="background-color: rgba(25, 135, 84, 0.1); padding: 2px 6px; border-radius: 10px; font-weight: 500;">
                                                                ${param.value} ${param.unit}
                                                            </span>
                                                            </div>
                                                        `,
                                                            )
                                                            .join("")}
                                                        </div>
                                                    </div>
                                                    `,
                                                        )
                                                        .join("")}
                                                </div>
                                                </div>
                                            `;
                                        }

                                        // Default fallback
                                        else {
                                            return `
                                                <div class="stat-item">
                                                <span class="stat-label">${label}</span>
                                                <span class="stat-value">(0 trạm)</span>
                                                </div>
                                            `;
                                        }
                                    })
                                    .join("")}
                                </div>
                              </div>
                            `;
                        };

                        setTimeout(() => {
                            const items = legendPrimary.querySelectorAll(".station-item[data-position]");
                            console.log(`Tìm thấy ${items.length} station items để gắn sự kiện click`);

                            items.forEach((el) => {
                                el.addEventListener("click", (event) => {
                                    event.preventDefault();
                                    event.stopPropagation();

                                    try {
                                        const raw = el.getAttribute("data-position");
                                        console.log("Raw data-position:", raw);

                                        if (raw) {
                                            const station = JSON.parse(raw);
                                            console.log("Parsed station data:", station);
                                            handleClickSearchDate(station);
                                        } else {
                                            console.warn("Không tìm thấy data-position attribute");
                                        }
                                    } catch (e) {
                                        console.error("❌ Lỗi khi parse data-position:", e);
                                        console.error("Raw data:", el.getAttribute("data-position"));
                                    }
                                });

                                // Thêm visual feedback khi hover
                                el.style.cursor = "pointer";
                                el.addEventListener("mouseenter", function () {
                                    this.style.backgroundColor = "rgba(0, 123, 255, 0.1)";
                                });
                                el.addEventListener("mouseleave", function () {
                                    this.style.backgroundColor = "transparent";
                                });
                            });
                        }, 100);

                        updateLegendWithStations();
                    }
                } catch (error) {
                    console.log(`error.message:`, error.message);
                    ToastCommon(TOAST.ERROR, error.message);
                }
            });
        }, 0);

        // Cleanup function
        return () => {
            // Remove global function when component unmounts
            if (window.clearDateSearchData) {
                delete window.clearDateSearchData;
            }
        };
    }, [map]);

    // Helper function to get salinity color based on value
    const getSalinityColor = (value) => {
        if (value < 1) return "blue";
        else if (value < 4) return "#fd7e14";
        else return "#dc3545";
    };

    // Summary points rendering functions for date search
    const renderSalinitySummaryPoints = (mapInstance, salinityPositions) => {
        const latLngs = [];

        // First remove any existing salinity points to avoid duplicates
        mapInstance.eachLayer((layer) => {
            if (layer.options?.isSalinityPoint) {
                mapInstance.removeLayer(layer);
            }
        });

        salinityPositions.forEach((station) => {
            const point = station.position[0];
            const lat = convertDMSToDecimal(point.ViDo);
            const lng = convertDMSToDecimal(point.KinhDo);
            const value = parseFloat(station.value);
            const date = new Date(station.date).toLocaleDateString("vi-VN");
            let color = "#6c757d";
            if (value < 1) color = "blue";
            else if (value < 4) color = "#fd7e14";
            else color = "#dc3545";

            if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
                console.warn(`⚠️ Không thể chuyển tọa độ tại điểm ${point.TenDiem}`);
                return;
            }

            const icon = getSalinityIcon(value);

            const marker = L.marker([lat, lng], {
                icon,
                isSalinityPoint: true,
                isSummaryPoint: true,
                kiHieu: station.kiHieu,
            }).addTo(mapInstance);

            latLngs.push([lat, lng]);

            const tooltipClass = getSalinityTooltipClass(value || 0);
            marker.bindTooltip(point.TenDiem, {
                permanent: true,
                direction: "top",
                offset: [0, -10],
                className: tooltipClass,
            });

            marker.on("click", () => {
                const zoomLevel = 15;
                const offsetX = 0;
                const offsetY = -100;

                const targetLatLng = L.latLng(lat, lng);
                const pointInPixel = mapInstance.project(targetLatLng, zoomLevel);
                const offsetPoint = pointInPixel.subtract([-offsetX, -offsetY]);
                const offsetLatLng = mapInstance.unproject(offsetPoint, zoomLevel);
                mapInstance.setView(offsetLatLng, zoomLevel, { animate: true });

                const popupHTML = `
          <div class="modern-popup">
            <div class="popup-header">
              <div class="popup-title">
                <h4 class="popup-name">${point.TenDiem}</h4>
                <span class="popup-type">Điểm đo độ mặn</span>
              </div>
              <div class="popup-status ${
                  value < 1 ? "status-low" : value < 4 ? "status-medium" : "status-high"
              }">
                ${value < 1 ? "Bình thường" : value < 4 ? "Rủi ro cấp 2" : "Rủi ro cấp 3"}
              </div>
            </div>
            
            <div class="popup-content">
              <div class="popup-main-value">
                <span class="value-label">Độ mặn</span>
                <span class="value-number" style="color: ${color}">
                  ${!isNaN(value) ? `${value.toFixed(2)} ‰` : "N/A"}
                </span>
              </div>
              
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
                  
                  <div class="detail-item">
                    <div class="detail-content py-2">
                      <strong class="detail-label"><i class="detail-icon">📅</i> Ngày thống kê: </strong>
                      <span class="detail-value">${date}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;

                marker.bindPopup(popupHTML).openPopup();
            });
        });

        if (latLngs.length > 0) {
            const bounds = L.latLngBounds(latLngs);
            mapInstance.fitBounds(bounds, {
                padding: [200, 200],
                animate: true,
            });
        }
    };

    const renderHydrometeorologySummaryPoints = (mapInstance, hydrometeorologyPositions) => {
        const latLngs = [];

        // First remove any existing hydromet points to avoid duplicates
        mapInstance.eachLayer((layer) => {
            if (layer.options?.isHydrometPoint || layer.options?.isHydrometSummary) {
                mapInstance.removeLayer(layer);
            }
        });

        const grouped = {};
        hydrometeorologyPositions.forEach((item) => {
            const key = item.position[0].KiHieu;
            if (!grouped[key]) {
                grouped[key] = {
                    position: item.position,
                    values: [],
                    date: item.date,
                };
            }
            grouped[key].values.push({
                kiHieu: item.kiHieu,
                value: item.value,
            });
        });
        const result = Object.values(grouped);

        result.forEach((station) => {
            const point = station.position[0];
            const lat = dmsToDecimal(point.ViDo);
            const lng = dmsToDecimal(point.KinhDo);
            const date = station.date;

            if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
                console.warn(`⚠️ Không thể chuyển tọa độ tại điểm ${point.TenTam}`);
                return;
            }

            // Chỉ sử dụng icon chung cho trạm
            const icon = getHydrometIcon();

            const marker = L.marker([lat, lng], {
                icon,
                isHydrometPoint: true,
                isHydrometSummary: true,
                kiHieu: point.KiHieu,
                maTram: point.TenTam, // Add station name as identifier
            }).addTo(mapInstance);

            latLngs.push([lat, lng]);

            marker.bindTooltip(point.TenTam, {
                permanent: true,
                direction: "top",
                offset: [0, -10],
                className: "custom-tooltip",
            });

            const valueRows = station.values
                .map((val) => {
                    const prefix = val.kiHieu.split("_")[0];
                    const unitData = prefixUnitMap()[prefix];

                    let DonVi = "";
                    let contentLabel = "";
                    if (typeof unitData === "object" && unitData !== null) {
                        DonVi = unitData.donvi || "";
                        contentLabel = unitData.content || "";
                    } else {
                        DonVi = unitData || "";
                        contentLabel = unitData || "";
                    }

                    const value = parseFloat(val.value);

                    // Color based on unit type (DonVi) instead of numerical value
                    let color = "#6c757d"; // Default gray
                    switch (DonVi) {
                        case "(mm)": // Rainfall
                            color = "#0d6efd"; // Blue for rainfall
                            break;
                        case "(°C)": // Temperature
                            color = "#dc3545"; // Red for temperature
                            break;
                        case "(cm)": // Water level
                            color = "#198754"; // Green for water level
                            break;
                        default:
                            color = "#6c757d"; // Gray for unknown types
                    }

                    return `
          <div class="popup-main-value">
            <span class="value-label">${contentLabel || "Giá trị đo"}</span>
            <span class="value-number" style="color: ${color}">
              ${!isNaN(value) ? value.toFixed(2) : "-"} ${DonVi}
            </span>
          </div>
        `;
                })
                .join("");

            const popupHTML = `
        <div class="modern-popup">
          <div class="popup-header">
            <div class="popup-icon">🌤️</div>
            <div class="popup-title">
              <h4 class="popup-name">${point.TenTam}</h4>
              <span class="popup-type">${point.PhanLoai || "Trạm khí tượng thủy văn"}</span>
            </div>
          </div>
    
          <div class="popup-content">
            ${valueRows}
            <div class="popup-details">
              <div class="detail-grid">
                <div class="detail-item py-2">
                  <div class="detail-content">
                    <strong class="detail-label"><i class="detail-icon">🏭</i> Mã trạm:</strong>
                    <span class="detail-value">${point.KiHieu}</span>
                  </div>
                </div>
    
                <div class="detail-item py-2">
                  <div class="detail-content">
                    <strong class="detail-label"><i class="detail-icon">📅</i> Ngày đo:</strong>
                    <span class="detail-value">${date}</span>
                  </div>
                </div>
    
                <div class="detail-item py-2">
                  <div class="detail-content">
                    <strong class="detail-label"> <i class="detail-icon">📊</i> Yếu tố:</strong>
                    <span class="detail-value">${point.YeuTo || "Không xác định"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

            marker.bindPopup(popupHTML);
        });

        if (latLngs.length > 0) {
            const bounds = L.latLngBounds(latLngs);
            mapInstance.fitBounds(bounds, {
                padding: [50, 50],
                animate: true,
            });
        }
    };

    // Handle map resize when sidebar state changes
    useEffect(() => {
        if (!map) return;

        // Use requestAnimationFrame to ensure the DOM has updated before resizing the map
        const resizeMap = () => {
            requestAnimationFrame(() => {
                map.invalidateSize();
            });
        };

        // Slight delay to ensure transition has completed
        const timeoutId = setTimeout(resizeMap, 300);

        return () => clearTimeout(timeoutId);
    }, [map]);

    return (
        <>
            <div ref={mapContainer} id="mapContainer"></div>

            <MapDetails
                salinityData={salinityData}
                selectedPoint={selectedPoint}
                hydrometData={hydrometData}
                onOpenFullChart={() => setShowFullChart(true)}
                onClose={handleCloseDetails}
            />

            <SaltChartFull
                show={showFullChart}
                kiHieu={selectedPoint?.kiHieu}
                tenDiem={selectedPoint?.tenDiem}
                salinityData={salinityData}
                hydrometData={hydrometData}
                onClose={() => setShowFullChart(false)}
            />
        </>
    );
};

export default MapboxMap;
