import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";
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
import HydrometChartFull from "@pages/map/HydrometChartFull";
import IoTChartFull from "@pages/map/IoTChartFull";
import { initializeMap } from "@components/map/mapInitialization";
import { getSalinityTooltipClass, renderSalinityPoints } from "@components/map/SalinityMarkers";
import { renderHydrometStations } from "@components/map/HydrometMarkers";
import { renderIoTStations, removeIoTStations } from "@components/map/IoTMarkers";
import { handleLocationChange, handleFeatureHighlight } from "@components/map/mapUtils";
import { handleLayerLabelToggle, handleZoomChange, clearAllLabels } from "@components/map/mapLabels";
import {
    fetchSalinityData,
    fetchSalinityStationPositions,
    fetchHydrometeorologyStationPositions,
} from "@components/map/mapDataServices";
import { getSalinityIcon, getHydrometIcon } from "@components/map/mapMarkers";
import { 
    prefixUnitMap, 
    layerStyles, 
    legendNames, 
    updateLegendVisibility 
} from "@components/map/mapStyles";

const MapboxMap = forwardRef(({ selectedLayers, selectedLocation, highlightedFeature, iotData, onMapReady }, ref) => {
    const mapContainer = useRef(null);
    const [map, setMap] = useState(null);
    const overlayLayers = useRef({});
    const [selectedPoint, setSelectedPoint] = useState(null);
    const [showFullChart, setShowFullChart] = useState(false);
    const [showHydrometChart, setShowHydrometChart] = useState(false);
    const [showIoTChart, setShowIoTChart] = useState(false);
    const [salinityData, setSalinityData] = useState([]);
    const [selectedStation, setSelectedStation] = useState(null);
    const [hydrometData, setHydrometData] = useState([]);
    const [internalIotData, setInternalIotData] = useState(null);
    const highlightedLayerRef = useRef(null);
    const highlightedMarkerRef = useRef(null);

    // Expose map instance through ref
    const onMapReadyRef = useRef(onMapReady);

    useEffect(() => {
        onMapReadyRef.current = onMapReady;
    }, [onMapReady]);
    useImperativeHandle(ref, () => ({
        getMap: () => map,
        flyTo: (coords, zoom, options) => {
            if (map) {
                map.flyTo(coords, zoom, options);
            }
        },
        fitBounds: (bounds, options) => {
            if (map) {
                map.fitBounds(bounds, options);
            }
        },
        setView: (coords, zoom) => {
            if (map) {
                map.setView(coords, zoom);
            }
        }
    }), [map]);

    // Helper function to create WMS layer with consistent configuration
    const createWMSLayer = (layerName, options = {}) => {
        const defaultOptions = {
            layers: `xamnhapman_tphcm:${layerName}`,
            transparent: true,
            format: "image/png",
            version: "1.1.1",
            info_format: "text/html",
            attribution: "GeoServer",
            ...options
        };

        return L.tileLayer.betterWms(
            "https://xamnhapman.opengis.vn/m/gsrv/xamnhapman_tphcm/wms",
            defaultOptions
        );
    };

    // Helper function to get layer configuration from mapStyles
    const getLayerConfig = (layerName) => {
        const layerStyle = layerStyles[layerName];
        const layerDisplayName = legendNames[layerName] || layerName;
        
        return {
            name: layerDisplayName,
            type: layerStyle?.type || "wms",
            legend: layerStyle?.legend || undefined
        };
    };

    // Register global function for opening IoT chart from leaflet popup
    useEffect(() => {
        window.onOpenIoTChart = (iotInfo) => {
            if (!iotInfo) return;

            const rows = iotInfo.dataPoints || iotInfo.data || [];

            // Keep IoT flow independent from MapDetails side panel.
            setSelectedPoint(null);
            setSelectedStation(null);

            setInternalIotData({
                stationInfo: iotInfo.stationInfo,
                stationName: iotInfo.stationName,
                serialNumber: iotInfo.serialNumber,
                dataPoints: rows,
                data: rows,
                summary: iotInfo.summary,
            });
            setShowIoTChart(true);
        };

        return () => {
            if (window.onOpenIoTChart) {
                delete window.onOpenIoTChart;
            }
        };
    }, []);

    // Add global function for popup button action
    useEffect(() => {
        window.openChartDetails = async (kiHieu, tenDiem) => {
            if (!kiHieu) return;

            try {
                const isCurrentPoint = selectedPoint?.kiHieu === kiHieu;
                const hasCurrentData = Array.isArray(salinityData) && salinityData.length > 0;

                if (!isCurrentPoint || !hasCurrentData) {
                    const fetchedData = await fetchSalinityData(kiHieu);
                    setSalinityData(Array.isArray(fetchedData) ? fetchedData : []);
                }

                setSelectedPoint((prev) => ({
                    kiHieu,
                    tenDiem: tenDiem || prev?.tenDiem || kiHieu,
                    thongTin: prev?.thongTin || { KiHieu: kiHieu, TenDiem: tenDiem || kiHieu },
                }));

                setShowFullChart(true);
            } catch (error) {
                console.error("Error opening chart details:", error);
                ToastCommon({ message: "Không thể mở biểu đồ độ mặn", type: TOAST.ERROR });
            }
        };

        window.openHydrometDetails = async (stationCode, stationName) => {
            try {
                // Set the selected station info for the chart
                if (stationCode || stationName) {
                    const stationKey = stationCode || stationName;

                    // Try to find the station in the existing data
                    const existingStation = hydrometData.find(
                        (data) =>
                            data.TenTram === stationName ||
                            data.TenTam === stationName ||
                            data.TenTram === stationKey ||
                            data.TenTam === stationKey ||
                            data.thongTin?.TenTram === stationName ||
                            data.thongTin?.TenTam === stationName ||
                            data.maTram === stationKey ||
                            data.KiHieu === stationKey,
                    );

                    if (existingStation) {
                        setSelectedStation({
                            maTram: existingStation.maTram || stationKey,
                            tenTram:
                                existingStation.thongTin?.TenTram ||
                                existingStation.thongTin?.TenTam ||
                                stationName ||
                                stationKey,
                            thongTin: {
                                ...(existingStation.thongTin || {}),
                                TenTram:
                                    existingStation.thongTin?.TenTram ||
                                    existingStation.thongTin?.TenTam ||
                                    stationName ||
                                    stationKey,
                                TenTam:
                                    existingStation.thongTin?.TenTam ||
                                    existingStation.thongTin?.TenTram ||
                                    stationName ||
                                    stationKey,
                                KiHieu: existingStation.KiHieu || stationCode || stationKey,
                            },
                            data: hydrometData,
                        });
                    } else {
                        // Create a basic station object for the chart
                        setSelectedStation({
                            maTram: stationKey,
                            tenTram: stationName || stationKey,
                            thongTin: {
                                TenTram: stationName || stationKey,
                                TenTam: stationName || stationKey,
                                KiHieu: stationCode || stationKey,
                            },
                            data: hydrometData,
                        });
                    }
                }

                // Open the hydromet chart
                setShowHydrometChart(true);
            } catch (error) {
                console.error("Error opening hydromet details:", error);
                ToastCommon({ message: "Không thể mở biểu đồ chi tiết", type: TOAST.ERROR });
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
    }, [selectedPoint, salinityData, hydrometData]);

    // Initialize map
    useEffect(() => {
        if (map || !mapContainer.current) return;

        const { mapInstance } = initializeMap(mapContainer.current);
        setMap(mapInstance);
        if (typeof onMapReadyRef.current === "function") {
            onMapReadyRef.current(mapInstance);
        }

        

        // Listen for location found and error events
        mapInstance.on('locationfound', (e) => {
            const { lat, lng } = e.latlng;
            console.log('GPS Location found:', lat, lng);
            
            // Show success notification
            ToastCommon({ 
                message: `Đã định vị: ${lat.toFixed(6)}, ${lng.toFixed(6)}`, 
                type: TOAST.SUCCESS 
            });
        });

        mapInstance.on('locationerror', (e) => {
            console.error('GPS Location error:', e);
            ToastCommon({ 
                message: `Lỗi định vị GPS: ${e.message}`, 
                type: TOAST.ERROR 
            });
        });

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
                if (typeof onMapReadyRef.current === "function") {
                    onMapReadyRef.current(null);
                }
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
        Object.entries(overlayLayers.current).forEach(([layerName, layerData]) => {
            // Get the actual layer instance (for WMS layers, diemdocao)
            // Marker layers (salinityPoints, hydrometStations) don't have layer property
            const actualLayer = layerData.layer;
            
            if (actualLayer && map.hasLayer(actualLayer)) {
                map.removeLayer(actualLayer);
            }
        });
        overlayLayers.current = {};

        // Clear all markers and layers from map
        map.eachLayer((layer) => {
            if (
                layer.options?.isSalinityPoint ||
                layer.options?.isHydrometStation ||
                layer.isIoTStation ||
                layer.options?.isIoTStation ||
                layer.options?.isDistrictLabel ||
                layer.options?.isCommuneLabel
            ) {
                map.removeLayer(layer);
            }
        });

        // Implement mutual exclusivity between salinity points and hydromet stations
        const hasSalinityPoints = selectedLayers.includes("salinityPoints");
        const hasHydrometStations = selectedLayers.includes("hydrometStations");

        // Add selected layers with optimized configuration
        selectedLayers.forEach((layerName) => {
            // Handle special marker layers
            if (layerName === "salinityPoints") {
                renderSalinityPoints(map, setSalinityData, setSelectedPoint);
                overlayLayers.current[layerName] = {
                    ...getLayerConfig(layerName),
                    type: "marker"
                };
            } else if (layerName === "hydrometStations") {
                renderHydrometStations(map, setHydrometData, setSelectedStation);
                overlayLayers.current[layerName] = {
                    ...getLayerConfig(layerName),
                    type: "marker"
                };
            } else if (layerName === "iotStations") {
                renderIoTStations(map, setInternalIotData);
                overlayLayers.current[layerName] = {
                    ...getLayerConfig(layerName),
                    type: "marker"
                };
            }
            // Handle special raster layer (diemdocao)
            else if (layerName === "diemdocao") {
                const rasterLayer = L.tileLayer.wms("https://xamnhapman.opengis.vn/m/gsrv/xamnhapman_tphcm/wms", {
                    layers: `xamnhapman_tphcm:${layerName}`,
                    transparent: true,
                    format: "image/png",
                    version: "1.1.0",
                    attribution: "GeoServer",
                });

                rasterLayer.addTo(map);
                overlayLayers.current[layerName] = {
                    layer: rasterLayer,
                    ...getLayerConfig(layerName)
                };
            } 
            // Handle all other WMS layers uniformly
            else {
                const wmsLayer = createWMSLayer(layerName);
                wmsLayer.addTo(map);
                
                overlayLayers.current[layerName] = {
                    layer: wmsLayer,
                    ...getLayerConfig(layerName)
                };
            }
        });

        updateLegendVisibility(overlayLayers.current);

        // Handle label display for administrative layers
        const handleLabels = async () => {
            // Clear all existing labels first
            clearAllLabels(map);

            // Process each selected layer for label display
            for (const layerName of selectedLayers) {
                const layerStyle = layerStyles[layerName];
                if (layerStyle?.type === "administrative" || 
                    layerName === "DiaPhanHuyen" || 
                    layerName === "DiaPhanXa") {
                    await handleLayerLabelToggle(map, layerName, true);
                }
            }
        };

        // Execute label handling
        handleLabels();

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

    // Handle zoom changes for label visibility
    useEffect(() => {
        if (!map) return;

        const onZoomEnd = () => {
            handleZoomChange(map, selectedLayers);
        };

        map.on("zoomend", onZoomEnd);

        return () => {
            map.off("zoomend", onZoomEnd);
        };
    }, [map, selectedLayers]);

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
                            // Kiểm tra xem station có tọa độ hợp lệ không
                            if (station && station.position) {
                                const { vido, kinhdo } = station.position;

                                // Có thể zoom đến vị trí trạm trên bản đồ
                                if (map && vido && kinhdo) {
                                    map.setView([vido, kinhdo], 14);

                                    // Determine station type and create appropriate popup
                                    let popupContent;
                                    if (station.kiHieu) {
                                        // This is a salinity station
                                        const classification = getSalinityRiskLevel(
                                            station.value,
                                            station.kiHieu,
                                        );
                                        const statusColor = getSalinityColor(
                                            parseFloat(station.value || 0),
                                            station.kiHieu,
                                        );
                                        const statusClass = classification.level
                                            ? `status-${classification.level}`
                                            : "status-no-data";

                                        popupContent = `
                                            <div class="modern-popup salinity-popup enhanced">
                                                <div class="popup-header">
                                                    <div class="popup-icon">🌊</div>
                                                    <div class="popup-title">
                                                        <h4 class="popup-name">${station.name || "Trạm quan trắc"}</h4>
                                                        <span class="popup-type">Điểm đo độ mặn</span>
                                                    </div>
                                                </div>
                                                
                                                <div class="popup-content">
                                                    <div class="popup-main-value">
                                                        <span class="value-label">Độ mặn hiện tại</span>
                                                        <span class="value-number" style="color: ${statusColor}">
                                                            ${station.value || "--"} ${station.unit || "‰"}
                                                        </span>
                                                        <span class="value-date">Ngày tìm kiếm</span>
                                                    </div>
                                                    
                                                    <div class="popup-details">
                                                        <div class="detail-grid">
                                                            <div class="detail-item">
                                                                <div class="detail-content">
                                                                    <strong class="detail-label"><i class="detail-icon">🏷️</i> Mã trạm:</strong>
                                                                    <span class="detail-value">${station.kiHieu || "N/A"}</span>
                                                                </div>
                                                            </div>
                                                            
                                                            <div class="detail-item">
                                                                <div class="detail-content">
                                                                    <strong class="detail-label"><i class="detail-icon">📍</i> Vĩ độ:</strong>
                                                                    <span class="detail-value">${vido.toFixed(6)}</span>
                                                                </div>
                                                            </div>
                                                            
                                                            <div class="detail-item">
                                                                <div class="detail-content">
                                                                    <strong class="detail-label"><i class="detail-icon">📍</i> Kinh độ:</strong>
                                                                    <span class="detail-value">${kinhdo.toFixed(6)}</span>
                                                                </div>
                                                            </div>
                                                            
                                                            <div class="detail-item">
                                                                <div class="detail-content">
                                                                    <strong class="detail-label"><i class="detail-icon">⚠️</i> Mức rủi ro:</strong>
                                                                    <span class="detail-value" style="color: ${statusColor}; font-weight: 600;">
                                                                        ${classification || "Không xác định"}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="popup-actions">
                                                        <button class="action-btn primary" onclick="window.openChartDetails('${station.kiHieu || station.name}')">
                                                            <i class="btn-icon">📈</i>
                                                            Xem biểu đồ chi tiết
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        `;
                                    } else {
                                        // This is a hydrometeorology station
                                        const hasData = station.values && station.values.length > 0;
                                        const primaryParam = hasData ? station.values[0] : null;

                                        popupContent = `
                                            <div class="modern-popup hydromet-popup enhanced">
                                                <div class="popup-header">
                                                    <div class="popup-icon">🌤️</div>
                                                    <div class="popup-title">
                                                        <h4 class="popup-name">${station.name || "Trạm quan trắc"}</h4>
                                                        <span class="popup-type">Trạm khí tượng thủy văn</span>
                                                    </div>
                                                </div>
                                                
                                                <div class="popup-content">
                                                    ${
                                                        hasData && primaryParam
                                                            ? `
                                                        <div class="popup-main-value">
                                                            <span class="value-label">${primaryParam.paramName || "Thông số chính"}</span>
                                                            <span class="value-number" style="color: #0066cc">
                                                                ${primaryParam.value} ${primaryParam.unit}
                                                            </span>
                                                            <span class="value-date">Ngày tìm kiếm</span>
                                                        </div>
                                                        
                                                        ${
                                                            station.values.length > 1
                                                                ? `
                                                            <div class="multi-param-grid">
                                                                ${station.values
                                                                    .slice(1)
                                                                    .map(
                                                                        (param) => `
                                                                    <div class="param-item">
                                                                        <div class="param-content">
                                                                            <span class="param-label">${param.paramName}</span>
                                                                            <span class="param-value" style="background-color: rgba(13, 110, 253, 0.1); padding: 2px 6px; border-radius: 10px; font-weight: 500;">
                                                                                ${param.value} ${param.unit}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                `,
                                                                    )
                                                                    .join("")}
                                                            </div>
                                                        `
                                                                : ""
                                                        }
                                                    `
                                                            : `
                                                        <div class="no-data-message">
                                                            <i class="no-data-icon">📊</i>
                                                            <span>Chưa có dữ liệu quan trắc</span>
                                                        </div>
                                                    `
                                                    }
                                                    
                                                    <div class="popup-details">
                                                        <div class="detail-grid">
                                                            <div class="detail-item">
                                                                <div class="detail-content">
                                                                    <strong class="detail-label"><i class="detail-icon">📍</i> Vĩ độ:</strong>
                                                                    <span class="detail-value">${vido.toFixed(6)}</span>
                                                                </div>
                                                            </div>
                                                            
                                                            <div class="detail-item">
                                                                <div class="detail-content">
                                                                    <strong class="detail-label"><i class="detail-icon">📍</i> Kinh độ:</strong>
                                                                    <span class="detail-value">${kinhdo.toFixed(6)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="popup-actions">
                                                        <button class="action-btn primary" onclick="window.openHydrometDetails('${station.name}')">
                                                            <i class="btn-icon">📈</i>
                                                            Xem biểu đồ chi tiết
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        `;
                                    }

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
                                    color: getSalinityColor(parseFloat(station.value), station.kiHieu),
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
                                                            <span class="station-value" style="color: ${station.color}; font-weight: 600; background-color: rgba(${
                                                                station.color === "#28a745"
                                                                    ? "40,167,69,0.1" // Green
                                                                    : station.color === "#ffc107"
                                                                      ? "255,193,7,0.1" // Yellow
                                                                      : station.color === "#fd7e14"
                                                                        ? "253,126,20,0.1" // Orange
                                                                        : station.color === "#dc3545"
                                                                          ? "220,53,69,0.1" // Red
                                                                          : "108,117,125,0.1" // Gray for no-data
                                                            }); padding: 3px 8px; border-radius: 12px;">
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

                        // Gắn event listeners sau khi update legend
                        const attachEventListeners = () => {
                            const items = legendPrimary.querySelectorAll(".station-item[data-position]");

                            items.forEach((el) => {
                                // Remove existing listeners to prevent duplicates
                                el.removeEventListener("click", handleStationClick);
                                el.removeEventListener("mouseenter", handleStationMouseEnter);
                                el.removeEventListener("mouseleave", handleStationMouseLeave);

                                // Add new listeners
                                el.addEventListener("click", handleStationClick);
                                el.addEventListener("mouseenter", handleStationMouseEnter);
                                el.addEventListener("mouseleave", handleStationMouseLeave);

                                // Set cursor style
                                el.style.cursor = "pointer";
                            });
                        };

                        const handleStationClick = (event) => {
                            event.preventDefault();
                            event.stopPropagation();

                            try {
                                const raw = event.currentTarget.getAttribute("data-position");

                                if (raw) {
                                    const station = JSON.parse(raw);
                                    handleClickSearchDate(station);
                                } else {
                                    console.warn("Không tìm thấy data-position attribute");
                                }
                            } catch (e) {
                                console.error("❌ Lỗi khi parse data-position:", e);
                                console.error("Raw data:", event.currentTarget.getAttribute("data-position"));
                            }
                        };

                        const handleStationMouseEnter = function () {
                            this.style.backgroundColor = "rgba(0, 123, 255, 0.1)";
                        };

                        const handleStationMouseLeave = function () {
                            this.style.backgroundColor = "transparent";
                        };

                        // Update legend and then attach event listeners
                        updateLegendWithStations()
                            .then(() => {
                                // Wait a bit for DOM to be fully updated
                                setTimeout(attachEventListeners, 50);
                            })
                            .catch((error) => {
                                console.error("Error updating legend:", error);
                                // Try to attach listeners anyway
                                setTimeout(attachEventListeners, 50);
                            });
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

    // Helper function to get salinity color based on new 5-level classification
    const getSalinityColor = (value, stationCode = null) => {
        if (
            value === "NULL" ||
            value === null ||
            value === undefined ||
            value === "" ||
            isNaN(parseFloat(value))
        ) {
            return "#6c757d"; // Gray for no data
        }

        const numericValue = parseFloat(value);

        if (numericValue < 1) {
            return "#28a745"; // Green - Bình thường
        } else if (numericValue <= 4) {
            if (stationCode === "MNB") {
                return "#ffc107"; // Yellow - Rủi ro cấp 1 (Nhà Bè 1-4‰)
            } else {
                return "#fd7e14"; // Orange - Rủi ro cấp 2 (các điểm khác 1-4‰)
            }
        } else {
            return "#dc3545"; // Red - Rủi ro cấp 3 (> 4‰)
        }
    };

    // Helper function to get risk level description
    const getSalinityRiskLevel = (value, stationCode = null) => {
        if (
            value === "NULL" ||
            value === null ||
            value === undefined ||
            value === "" ||
            isNaN(parseFloat(value))
        ) {
            return "Khuyết số liệu";
        }

        const numericValue = parseFloat(value);

        if (numericValue < 1) {
            return "Bình thường";
        } else if (numericValue <= 4) {
            if (stationCode === "MNB") {
                return "Rủi ro cấp 1";
            } else {
                return "Rủi ro cấp 2";
            }
        } else {
            return "Rủi ro cấp 3";
        }
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

            // Use new classification system
            const color = getSalinityColor(value, station.kiHieu);
            const riskLevel = getSalinityRiskLevel(value, station.kiHieu);

            if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
                console.warn(`⚠️ Không thể chuyển tọa độ tại điểm ${point.TenDiem}`);
                return;
            }

            const icon = getSalinityIcon(value, station.kiHieu);

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
                  color === "#28a745"
                      ? "status-normal"
                      : color === "#ffc107"
                        ? "status-warning"
                        : color === "#fd7e14"
                          ? "status-high-warning"
                          : color === "#dc3545"
                            ? "status-critical"
                            : "status-no-data"
              }">
                ${riskLevel}
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
                      <strong class="detail-label"><i class="detail-icon">📅</i> Ngày quan trắc: </strong>
                      <span class="detail-value">${date}</span>
                    </div>
                  </div>
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
                    <strong class="detail-label"><i class="detail-icon">📅</i> Ngày quan trắc:</strong>
                    <span class="detail-value">${date}</span>
                  </div>
                </div>
                <div class="detail-item py-2">
                  <div class="detail-content">
                    <strong class="detail-label"><i class="detail-icon">🏭</i> Mã trạm:</strong>
                    <span class="detail-value">${point.KiHieu}</span>
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

            <SaltChartFull
                show={showFullChart}
                kiHieu={selectedPoint?.kiHieu}
                tenDiem={selectedPoint?.tenDiem}
                salinityData={salinityData}
                onClose={() => setShowFullChart(false)}
            />

            <HydrometChartFull
                show={showHydrometChart}
                kiHieu={selectedStation?.maTram || selectedPoint?.kiHieu}
                TenTam={
                    selectedStation?.thongTin?.TenTram ||
                    selectedStation?.thongTin?.TenTam ||
                    selectedStation?.tenTram ||
                    selectedPoint?.tenDiem
                }
                hydrometData={hydrometData}
                onClose={() => setShowHydrometChart(false)}
            />

            <IoTChartFull
                show={showIoTChart}
                iotData={iotData || internalIotData}
                onClose={() => setShowIoTChart(false)}
            />
        </>
    );
});

MapboxMap.displayName = 'MapboxMap';

export default MapboxMap;
