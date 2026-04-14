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
    fetchSalinityPoints,
    fetchHydrometeorologyStationPositions,
    fetchIoTStations,
} from "@components/map/mapDataServices";
import { getSalinityIcon, getHydrometIcon } from "@components/map/mapMarkers";
import { prefixUnitMap, layerStyles, legendNames, updateLegendVisibility } from "@components/map/mapStyles";

const MapboxMap = forwardRef(
    (
        {
            selectedLayers,
            selectedBaseMap = "Google Streets",
            selectedLocation,
            highlightedFeature,
            setHighlightedFeature,
            iotData,
            onMapReady,
        },
        ref,
    ) => {
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
        const baseMapsRef = useRef({});
        const activeBaseMapRef = useRef("Google Streets");
        const boundaryLayerRef = useRef(null);

        // Expose map instance through ref
        const onMapReadyRef = useRef(onMapReady);

        useEffect(() => {
            onMapReadyRef.current = onMapReady;
        }, [onMapReady]);

        useEffect(() => {
            if (!map || !selectedBaseMap) return;

            const availableBaseMaps = baseMapsRef.current || {};
            const nextBaseLayer = availableBaseMaps[selectedBaseMap];
            if (!nextBaseLayer) return;

            const currentBaseMapName = activeBaseMapRef.current;
            if (currentBaseMapName === selectedBaseMap) return;

            const currentBaseLayer = availableBaseMaps[currentBaseMapName];
            if (currentBaseLayer && map.hasLayer(currentBaseLayer)) {
                map.removeLayer(currentBaseLayer);
            }

            nextBaseLayer.addTo(map);

            if (typeof nextBaseLayer.bringToBack === "function") {
                nextBaseLayer.bringToBack();
            }

            if (boundaryLayerRef.current && typeof boundaryLayerRef.current.bringToFront === "function") {
                boundaryLayerRef.current.bringToFront();
            }

            Object.values(overlayLayers.current || {}).forEach((layerData) => {
                const actualLayer = layerData?.layer;
                if (actualLayer && typeof actualLayer.bringToFront === "function") {
                    actualLayer.bringToFront();
                }
            });

            activeBaseMapRef.current = selectedBaseMap;
        }, [map, selectedBaseMap]);

        useImperativeHandle(
            ref,
            () => ({
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
                },
            }),
            [map],
        );

        // Helper function to create WMS layer with consistent configuration
        const createWMSLayer = (layerName, options = {}) => {
            const defaultOptions = {
                layers: `xamnhapman_tphcm:${layerName}`,
                transparent: true,
                format: "image/png",
                version: "1.1.1",
                info_format: "text/html",
                attribution: "GeoServer",
                ...options,
            };

            return L.tileLayer.betterWms(
                "https://xamnhapman.opengis.vn/m/gsrv/xamnhapman_tphcm/wms",
                defaultOptions,
            );
        };

        // Helper function to get layer configuration from mapStyles
        const getLayerConfig = (layerName) => {
            const layerStyle = layerStyles[layerName];
            const layerDisplayName = legendNames[layerName] || layerName;

            return {
                name: layerDisplayName,
                type: layerStyle?.type || "wms",
                legend: layerStyle?.legend || undefined,
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

            const {
                mapInstance,
                baseMaps = {},
                defaultBaseMapName = "Google Streets",
                wmsLayer = null,
            } = initializeMap(mapContainer.current);
            if (!mapInstance) {
                return;
            }

            baseMapsRef.current = baseMaps;
            activeBaseMapRef.current = defaultBaseMapName;
            boundaryLayerRef.current = wmsLayer;

            setMap(mapInstance);
            if (typeof onMapReadyRef.current === "function") {
                onMapReadyRef.current(mapInstance);
            }

            // Listen for location found and error events
            mapInstance.on("locationfound", (e) => {
                const { lat, lng } = e.latlng;
                console.log("GPS Location found:", lat, lng);

                // Show success notification
                ToastCommon({
                    message: `Đã định vị: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                    type: TOAST.SUCCESS,
                });
            });

            mapInstance.on("locationerror", (e) => {
                console.error("GPS Location error:", e);
                ToastCommon({
                    message: `Lỗi định vị GPS: ${e.message}`,
                    type: TOAST.ERROR,
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
                // Get the actual layer instance for WMS layers.
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

            const hydrometLayerNames = [
                "hydrometStations",
                "hydrometRainStations",
                "hydrometMeteorologyStations",
                "hydrometHydrologyStations",
            ];
            const activeHydrometLayers = selectedLayers.filter((layerName) =>
                hydrometLayerNames.includes(layerName),
            );
            let hydrometRendered = false;

            // Add selected layers with optimized configuration
            selectedLayers.forEach((layerName) => {
                // Handle special marker layers
                if (layerName === "salinityPoints") {
                    renderSalinityPoints(map, setSalinityData, setSelectedPoint);
                    overlayLayers.current[layerName] = {
                        ...getLayerConfig(layerName),
                        type: "marker",
                    };
                } else if (activeHydrometLayers.includes(layerName)) {
                    if (!hydrometRendered) {
                        renderHydrometStations(
                            map,
                            setHydrometData,
                            setSelectedStation,
                            activeHydrometLayers,
                        );
                        hydrometRendered = true;
                    }

                    overlayLayers.current[layerName] = {
                        ...getLayerConfig(layerName),
                        type: "marker",
                    };
                } else if (layerName === "iotStations") {
                    renderIoTStations(map, setInternalIotData);
                    overlayLayers.current[layerName] = {
                        ...getLayerConfig(layerName),
                        type: "marker",
                    };
                }
                // Handle special raster layer (DEM)
                else if (layerName === "DEM") {
                    const rasterLayer = L.tileLayer.wms(
                        "https://xamnhapman.opengis.vn/m/gsrv/xamnhapman_tphcm/wms",
                        {
                            layers: `xamnhapman_tphcm:${layerName}`,
                            transparent: true,
                            format: "image/png",
                            version: "1.1.0",
                            attribution: "GeoServer",
                        },
                    );

                    rasterLayer.addTo(map);
                    overlayLayers.current[layerName] = {
                        layer: rasterLayer,
                        ...getLayerConfig(layerName),
                    };
                }
                // Handle all other WMS layers uniformly
                else {
                    const wmsLayer = createWMSLayer(layerName);
                    wmsLayer.addTo(map);

                    overlayLayers.current[layerName] = {
                        layer: wmsLayer,
                        ...getLayerConfig(layerName),
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
                    if (
                        layerStyle?.type === "administrative" ||
                        layerName === "DiaPhanHuyen" ||
                        layerName === "DiaPhanXa"
                    ) {
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

            let dateInputRef = null;
            let dateChangeHandlerRef = null;
            let initRetryTimer = null;

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

            const initializeLegendDateSearch = (retryCount = 0) => {
                const dateInput = document.getElementById("legend-date");
                if (!dateInput) {
                    if (retryCount < 10) {
                        initRetryTimer = setTimeout(() => initializeLegendDateSearch(retryCount + 1), 120);
                    }
                    return;
                }

                dateInputRef = dateInput;

                // Date input processing

                // Configure date input events

                const handleLegendDateChange = async () => {
                    const inputVal = dateInput.value.trim();
                    const legendPrimary = document.getElementById("legend-primary");
                    let day = "";
                    let month = "";
                    let year = "";

                    if (/^\d{4}-\d{2}-\d{2}$/.test(inputVal)) {
                        [year, month, day] = inputVal.split("-");
                    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(inputVal)) {
                        [day, month, year] = inputVal.split("/");
                    } else {
                        return;
                    }

                    if (parseInt(year, 10) < 1000) return;
                    const rawDate = `${year}-${month}-${day}`; // yyyy-MM-dd for API
                    const selectedDateLabel = `${day}/${month}/${year}`;

                    try {
                        // Show loading indicator in the legend
                        if (legendPrimary) {
                            legendPrimary.innerHTML = `
                            <div class="loading-indicator">
                                <div class="spinner-border text-primary" role="status" style="width: 2rem; height: 2rem;">
                                    <span class="visually-hidden">Đang tải...</span>
                                </div>
                                <p>Đang tìm kiếm dữ liệu cho ngày ${selectedDateLabel}...</p>
                            </div>
                        `;
                        }

                        // Clear previous summary points
                        map.eachLayer((layer) => {
                            if (layer.options?.isSummaryPoint || layer.options?.isHydrometSummary) {
                                map.removeLayer(layer);
                            }
                        });

                        let response;
                        try {
                            response = await axiosInstance.get(`/search-date/${encodeURIComponent(rawDate)}`);
                        } catch (primaryError) {
                            const statusCode = primaryError?.response?.status;
                            if (statusCode === 404) {
                                response = await axiosInstance.get(
                                    `/search-Date/${encodeURIComponent(rawDate)}`,
                                );
                            } else {
                                throw primaryError;
                            }
                        }

                        const data = response?.data || {};

                        const buildSalinityStationsFromSearchDate = async (rows = []) => {
                            const toNumber = (...values) => {
                                for (const value of values) {
                                    if (
                                        value === null ||
                                        value === undefined ||
                                        value === "" ||
                                        value === "NULL"
                                    ) {
                                        continue;
                                    }
                                    const normalized = String(value).replace(",", ".").trim();
                                    const numeric = Number.parseFloat(normalized);
                                    if (Number.isFinite(numeric)) {
                                        return numeric;
                                    }
                                }
                                return null;
                            };

                            const normalizedRows = Array.isArray(rows) ? rows : [];
                            if (normalizedRows.length === 0) {
                                return [];
                            }

                            const salinityPoints = await fetchSalinityPoints();
                            const salinityPointMap = (
                                Array.isArray(salinityPoints) ? salinityPoints : []
                            ).reduce((acc, point) => {
                                const key = String(point?.KiHieu || "").toUpperCase();
                                if (key) {
                                    acc[key] = point;
                                }
                                return acc;
                            }, {});

                            // Case A: row-wise payload already has station coordinates/fields
                            const rowWiseStations = normalizedRows
                                .map((row, index) => {
                                    const vido = toNumber(
                                        row?.vido,
                                        row?.ViDo,
                                        row?.latitude,
                                        row?.lat,
                                        row?.y,
                                    );
                                    const kinhdo = toNumber(
                                        row?.kinhdo,
                                        row?.KinhDo,
                                        row?.longitude,
                                        row?.lng,
                                        row?.x,
                                    );

                                    if (!Number.isFinite(vido) || !Number.isFinite(kinhdo)) {
                                        return null;
                                    }

                                    const rawValue = toNumber(
                                        row?.value,
                                        row?.DoMan,
                                        row?.do_man,
                                        row?.GiaTri,
                                        row?.salinity,
                                        row?.Salinity,
                                    );
                                    const kiHieu =
                                        row?.kiHieu ||
                                        row?.KiHieu ||
                                        row?.station_code ||
                                        row?.maTram ||
                                        row?.MaTram ||
                                        `salinity-${index}`;

                                    return {
                                        position: {
                                            vido,
                                            kinhdo,
                                        },
                                        name:
                                            row?.tenDiem ||
                                            row?.TenDiem ||
                                            row?.station_name ||
                                            row?.name ||
                                            kiHieu,
                                        value: Number.isFinite(rawValue) ? rawValue.toFixed(2) : "--",
                                        rawValue,
                                        unit: row?.unit || row?.donVi || row?.DonVi || "‰",
                                        kiHieu,
                                        color: getSalinityColor(rawValue, kiHieu),
                                        date: row?.date || row?.Ngay || row?.Ngày || row?.Date,
                                        phanLoai: row?.PhanLoai || row?.phanLoai || "--",
                                        tanSuat: row?.TanSuat || row?.tanSuat || row?.tan_suat || "--",
                                    };
                                })
                                .filter(Boolean);

                            if (rowWiseStations.length > 0) {
                                return rowWiseStations;
                            }

                            // Case B: wide payload like { Ngày, CRT, CTT, ... }
                            const latestValuesByCode = {};
                            normalizedRows.forEach((row) => {
                                Object.entries(row || {}).forEach(([key, raw]) => {
                                    const upperKey = String(key || "").toUpperCase();
                                    if (
                                        !upperKey ||
                                        upperKey === "ID" ||
                                        upperKey === "NGÀY" ||
                                        upperKey === "NGAY" ||
                                        upperKey === "DATE"
                                    ) {
                                        return;
                                    }

                                    const valueNumber = toNumber(raw);
                                    if (!Number.isFinite(valueNumber)) {
                                        return;
                                    }

                                    latestValuesByCode[upperKey] = {
                                        value: valueNumber,
                                        date: row?.Ngày || row?.Ngay || row?.date || row?.Date,
                                    };
                                });
                            });

                            return Object.entries(latestValuesByCode)
                                .map(([kiHieu, info]) => {
                                    const point = salinityPointMap[kiHieu];
                                    if (!point) {
                                        return null;
                                    }

                                    const vido = convertDMSToDecimal(point?.ViDo);
                                    const kinhdo = convertDMSToDecimal(point?.KinhDo);
                                    if (!Number.isFinite(vido) || !Number.isFinite(kinhdo)) {
                                        return null;
                                    }

                                    return {
                                        position: {
                                            vido,
                                            kinhdo,
                                        },
                                        name: point?.TenDiem || kiHieu,
                                        value: info.value.toFixed(2),
                                        rawValue: info.value,
                                        unit: "‰",
                                        kiHieu,
                                        color: getSalinityColor(info.value, kiHieu),
                                        date: info.date,
                                        phanLoai: point?.PhanLoai || "--",
                                        tanSuat: point?.TanSuat || "--",
                                    };
                                })
                                .filter(Boolean);
                        };

                        const salinityStationsFromSearchDate = await buildSalinityStationsFromSearchDate(
                            data.salinityData,
                        );

                        // Check if we have any data at all
                        const hasData =
                            data.meteorologyData?.length > 0 ||
                            data.hydrologyData?.length > 0 ||
                            data.salinityData?.length > 0 ||
                            data.iotData?.length > 0;

                        if (!hasData) {
                            // No data found for this date
                            if (legendPrimary) {
                                legendPrimary.innerHTML = `
                                <div class="empty-state">
                                    <i class="fas fa-exclamation-circle"></i>
                                    <p>Không tìm thấy dữ liệu cho ngày ${selectedDateLabel}</p>
                                </div>
                            `;
                            }
                            return;
                        }

                        // Search-date should only update the legend/list.
                        // Do not render temporary search-result markers on the map.

                        // Update legend UI with new structure
                        const legendSummary = document.getElementById("legend-summary");

                        if (legendSummary && legendPrimary) {
                            legendSummary.style.display = "block";

                            const formattedDate = selectedDateLabel;
                            const labelMapping = {
                                meteorologyData: "Khí tượng",
                                iotData: "IoT",
                                salinityData: "Độ mặn",
                                hydrologyData: "Thủy văn",
                            };

                            const handleClickSearchDate = (station) => {
                                if (!station?.position || !map) {
                                    console.warn("Không có thông tin tọa độ hợp lệ cho trạm:", station);
                                    return;
                                }

                                const { vido, kinhdo } = station.position;
                                if (!Number.isFinite(vido) || !Number.isFinite(kinhdo)) {
                                    console.warn("Tọa độ trạm không hợp lệ:", station);
                                    return;
                                }

                                // Click from search result should only zoom, no popup.
                                map.setView([vido, kinhdo], 14);
                                map.closePopup();
                            };

                            // Process stations data for better display in the legend
                            const processStationsData = async () => {
                                const stationsInfo = {};

                                if (data.iotData?.length > 0) {
                                    const iotStationsResponse = await fetchIoTStations();
                                    const iotStations = Array.isArray(iotStationsResponse?.data)
                                        ? iotStationsResponse.data
                                        : Array.isArray(iotStationsResponse)
                                          ? iotStationsResponse
                                          : [];

                                    const formatIoTNumber = (value, digits) => {
                                        const numeric = Number.parseFloat(value);
                                        return Number.isFinite(numeric) ? numeric.toFixed(digits) : "--";
                                    };

                                    const parseCoordinateValue = (rawValue) => {
                                        if (rawValue === null || rawValue === undefined || rawValue === "") {
                                            return NaN;
                                        }

                                        const rawText = String(rawValue).trim();

                                        // DMS strings like 10°47'34.77"N must be parsed by dmsToDecimal,
                                        // parseFloat would incorrectly return only the leading degree number.
                                        if (/[°'"NSEW]/i.test(rawText)) {
                                            return dmsToDecimal(rawText);
                                        }

                                        const normalized = rawText.replace(",", ".");
                                        const numeric = Number.parseFloat(normalized);
                                        return Number.isFinite(numeric) ? numeric : dmsToDecimal(rawText);
                                    };

                                    // Keep only the latest row per station to avoid duplicated entries in legend.
                                    const latestIoTRows = Object.values(
                                        data.iotData.reduce((accumulator, row) => {
                                            const key =
                                                row.station_code ||
                                                row.serial_number ||
                                                row.station_name ||
                                                JSON.stringify(row);
                                            const rowTime = new Date(
                                                row.date_time || row.Date || row.date || row.day || 0,
                                            ).getTime();
                                            const savedTime = new Date(
                                                accumulator[key]?.date_time ||
                                                    accumulator[key]?.Date ||
                                                    accumulator[key]?.date ||
                                                    accumulator[key]?.day ||
                                                    0,
                                            ).getTime();

                                            if (!accumulator[key] || rowTime >= savedTime) {
                                                accumulator[key] = row;
                                            }

                                            return accumulator;
                                        }, {}),
                                    );

                                    stationsInfo.iotData = latestIoTRows
                                        .map((row) => {
                                            const matchedStation = iotStations.find(
                                                (station) =>
                                                    station.serial_number === row.serial_number ||
                                                    station.station_code === row.station_code ||
                                                    station.station_name === row.station_name,
                                            );

                                            const latitude = parseCoordinateValue(
                                                matchedStation?.vido_decimal ??
                                                    matchedStation?.latitude ??
                                                    matchedStation?.vido ??
                                                    matchedStation?.ViDo ??
                                                    row?.vido ??
                                                    row?.latitude ??
                                                    row?.ViDo ??
                                                    NaN,
                                            );
                                            const longitude = parseCoordinateValue(
                                                matchedStation?.kinhdo_decimal ??
                                                    matchedStation?.longitude ??
                                                    matchedStation?.kinhdo ??
                                                    matchedStation?.KinhDo ??
                                                    row?.kinhdo ??
                                                    row?.longitude ??
                                                    row?.KinhDo ??
                                                    NaN,
                                            );

                                            return {
                                                position:
                                                    Number.isFinite(latitude) && Number.isFinite(longitude)
                                                        ? {
                                                              vido: latitude,
                                                              kinhdo: longitude,
                                                          }
                                                        : null,
                                                name:
                                                    row.station_name ||
                                                    matchedStation?.station_name ||
                                                    "Trạm IoT",
                                                stationName:
                                                    row.station_name ||
                                                    matchedStation?.station_name ||
                                                    "Trạm IoT",
                                                serial_number: row.serial_number,
                                                station_code: row.station_code,
                                                salt_value: formatIoTNumber(
                                                    row.salt_value ?? row.salt_value_avg,
                                                    2,
                                                ),
                                                salt_unit: row.salt_unit || "‰",
                                                temp_value: formatIoTNumber(
                                                    row.temp_value ?? row.temp_value_avg,
                                                    1,
                                                ),
                                                temp_unit: row.temp_unit || "°C",
                                                distance_value: formatIoTNumber(
                                                    row.distance_value ?? row.distance_value_avg,
                                                    2,
                                                ),
                                                distance_unit: row.distance_unit || "m",
                                                daily_rainfall_value: formatIoTNumber(
                                                    row.daily_rainfall_value ?? row.daily_rainfall_value_sum,
                                                    2,
                                                ),
                                                daily_rainfall_unit: row.daily_rainfall_unit || "mm",
                                                date_time: row.date_time || row.Date || row.date || row.day,
                                                color: "#7c3aed",
                                                isIoT: true,
                                            };
                                        })
                                        .filter(Boolean);
                                }

                                // Process salinity data
                                if (salinityStationsFromSearchDate.length > 0) {
                                    stationsInfo.salinityData = salinityStationsFromSearchDate;
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
                                const allDataTypes = [
                                    "salinityData",
                                    "iotData",
                                    "meteorologyData",
                                    "hydrologyData",
                                ];

                                const summaryTypeTags = allDataTypes
                                    .filter((key) => (data[key]?.length || 0) > 0)
                                    .map((key) => {
                                        if (key === "salinityData") return "Điểm đo mặn";
                                        if (key === "iotData") return "Trạm IoT";
                                        if (key === "meteorologyData") return "KTTV - Khí tượng";
                                        if (key === "hydrologyData") return "KTTV - Thủy văn";
                                        return key;
                                    })
                                    .map((label) => `<span class="summary-type-tag">${label}</span>`)
                                    .join("");

                                legendPrimary.innerHTML = `
                              <div class="data-summary-card">
                                <div class="summary-header">
                                  <div class="d-flex justify-content-between align-items-center w-100">
                                    <h6 class="summary-date mb-0">📅 ${formattedDate}</h6>
                                                                        <div class="summary-type-tags">${summaryTypeTags || '<span class="summary-type-tag">Không có dữ liệu</span>'}</div>
                                  </div>
                                </div>
                               <div class="summary-stats">
                                ${allDataTypes
                                    .map((key) => {
                                        const label = labelMapping[key] || key;

                                        // Salinity data
                                        if (key === "salinityData" && stationsInfo.salinityData?.length > 0) {
                                            return `
                                                <div class="stat-item" >
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
                                        } else if (key === "iotData" && stationsInfo.iotData?.length > 0) {
                                            return `
                                                <div class="stat-item">
                                                    <div class="station-list">
                                                        ${stationsInfo.iotData
                                                            .map(
                                                                (station) => `
                                                        <div class="station-item" data-station="${station.serial_number}" data-position='${JSON.stringify(station)}' role="button" tabindex="0">
                                                            <span class="station-name">${station.name}</span>
                                                            <div class="station-params">
                                                                <div class="param-item">
                                                                    <span class="param-value" style="color: ${station.color}; background-color: rgba(124,58,237,0.10); padding: 2px 6px; border-radius: 10px; font-weight: 600;">
                                                                        Độ mặn: </br> ${station.salt_value || "--"} ‰
                                                                    </span>
                                                                </div>
                                                                <div class="param-item">
                                                                    <span class="param-value" style="background-color: rgba(245, 158, 11, 0.12); padding: 2px 6px; border-radius: 10px; font-weight: 600; color: #b45309;">
                                                                        Nhiệt độ: ${station.temp_value || "--"} ${station.temp_unit || "°C"}
                                                                    </span>
                                                                </div>
                                                                <div class="param-item">
                                                                    <span class="param-value" style="background-color: rgba(13, 110, 253, 0.12); padding: 2px 6px; border-radius: 10px; font-weight: 600; color: #0d6efd;">
                                                                        Mực nước: ${station.distance_value || "--"} ${station.distance_unit || "m"}
                                                                    </span>
                                                                </div>
                                                                <div class="param-item">
                                                                    <span class="param-value" style="background-color: rgba(40, 167, 69, 0.12); padding: 2px 6px; border-radius: 10px; font-weight: 600; color: #2e7d32;">
                                                                        Lượng mưa: ${station.daily_rainfall_value || "--"} ${station.daily_rainfall_unit || "mm"}
                                                                    </span>
                                                                </div>
                                                            </div>
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

                                        return "";
                                    })
                                    .filter(Boolean)
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
                                    console.error(
                                        "Raw data:",
                                        event.currentTarget.getAttribute("data-position"),
                                    );
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
                        const statusCode = error?.response?.status;
                        const errorMessage = String(error?.message || "").toLowerCase();
                        const isNoDataCase =
                            statusCode === 404 ||
                            errorMessage.includes("404") ||
                            errorMessage.includes("not found") ||
                            errorMessage.includes("không có dữ liệu") ||
                            errorMessage.includes("no data");

                        const legendPrimary = document.getElementById("legend-primary");
                        const legendSummary = document.getElementById("legend-summary");

                        if (isNoDataCase) {
                            if (legendPrimary) {
                                legendPrimary.innerHTML = `
                                <div class="empty-state">
                                    <i class="fas fa-exclamation-circle"></i>
                                    <p>Không tìm thấy dữ liệu cho ngày ${selectedDateLabel}</p>
                                </div>
                            `;
                            }
                            if (legendSummary) {
                                legendSummary.style.display = "block";
                            }
                            return;
                        }

                        console.log(`error.message:`, error.message);
                        ToastCommon(TOAST.ERROR, "Không thể tải dữ liệu ngày quan trắc. Vui lòng thử lại.");
                    }
                };

                dateChangeHandlerRef = handleLegendDateChange;
                dateInput.addEventListener("change", handleLegendDateChange);
                dateInput.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") handleLegendDateChange();
                });

                // Set default date and fetch immediately so "Số liệu quan trắc" is populated on first load.
                if (!dateInput.value || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateInput.value)) {
                    dateInput.value = "08/03/2025";
                }

                handleLegendDateChange();
            };

            initializeLegendDateSearch();

            // Cleanup function
            return () => {
                // Remove global function when component unmounts
                if (window.clearDateSearchData) {
                    delete window.clearDateSearchData;
                }

                if (initRetryTimer) {
                    clearTimeout(initRetryTimer);
                }

                if (dateInputRef && dateChangeHandlerRef) {
                    dateInputRef.removeEventListener("change", dateChangeHandlerRef);
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

        const renderSalinitySummaryPoints = (mapInstance, salinityPositions) => {
            const latLngs = [];
            ensureStationPanes(mapInstance);

            // First remove any existing salinity points to avoid duplicates
            mapInstance.eachLayer((layer) => {
                if (layer.options?.isSalinityPoint) {
                    mapInstance.removeLayer(layer);
                }
            });

            salinityPositions.forEach((station) => {
                const sourcePoint = station?.position?.[0] || null;
                const hasDirectPosition =
                    station?.position &&
                    Number.isFinite(station.position.vido) &&
                    Number.isFinite(station.position.kinhdo);

                const lat = hasDirectPosition
                    ? station.position.vido
                    : convertDMSToDecimal(sourcePoint?.ViDo);
                const lng = hasDirectPosition
                    ? station.position.kinhdo
                    : convertDMSToDecimal(sourcePoint?.KinhDo);

                const value = parseFloat(station?.rawValue ?? station?.value);
                const date = station?.date
                    ? new Date(station.date).toLocaleDateString("vi-VN")
                    : "Ngày tìm kiếm";
                const pointName = sourcePoint?.TenDiem || station?.name || station?.kiHieu || "Điểm đo mặn";
                const phanLoai = sourcePoint?.PhanLoai || station?.phanLoai || "--";
                const thoiGian = sourcePoint?.ThoiGian || station?.date || "--";
                const tanSuat = sourcePoint?.TanSuat || station?.tanSuat || "--";

                // Use new classification system
                const color = getSalinityColor(value, station.kiHieu);
                const riskLevel = getSalinityRiskLevel(value, station.kiHieu);

                if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
                    console.warn(`⚠️ Không thể chuyển tọa độ tại điểm ${pointName}`);
                    return;
                }

                const icon = getSalinityIcon(value, station.kiHieu);

                const marker = L.marker([lat, lng], {
                    icon,
                    isSalinityPoint: true,
                    isSummaryPoint: true,
                    kiHieu: station.kiHieu,
                    pane: "salinityMarkerPane",
                    zIndexOffset: 2000,
                }).addTo(mapInstance);

                latLngs.push([lat, lng]);

                const tooltipClass = getSalinityTooltipClass(value || 0);
                marker.bindTooltip(pointName, {
                    permanent: true,
                    direction: "top",
                    offset: [0, -10],
                    className: `${tooltipClass} station-tooltip`,
                    pane: "salinityTooltipPane",
                });

                const valueDisplay = Number.isFinite(value) ? `${value.toFixed(2)} ‰` : "--";
                const popupDate = date || "Ngày tìm kiếm";
                const popupHTML = `
                <div class="modern-popup salinity-popup">
                    <div class="popup-header">
                        <div class="popup-title">
                            <h4 class="popup-name">${pointName}</h4>
                            <span class="popup-type">${phanLoai}</span>
                        </div>
                        <div class="popup-status">
                            ${riskLevel}
                        </div>
                    </div>
                    <div class="popup-content">
                        <div class="popup-main-value">
                            <span class="value-label">Giá trị ngày chọn</span>
                            <span class="value-number" style="color: ${color}">${valueDisplay}</span>
                            <span class="value-date">${popupDate}</span>
                        </div>
                        <div class="popup-details">
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <div class="detail-content py-2">
                                        <strong class="detail-label">Mã trạm: </strong>
                                        <span class="detail-value">${station?.kiHieu || "--"}</span>
                                    </div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-content py-2">
                                        <strong class="detail-label">Thời gian: </strong>
                                        <span class="detail-value">${thoiGian}</span>
                                    </div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-content py-2">
                                        <strong class="detail-label">Tần suất: </strong>
                                        <span class="detail-value">${tanSuat}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

                marker.bindPopup(popupHTML, {
                    maxWidth: 320,
                    className: "custom-popup",
                    autoClose: true,
                    closeOnClick: true,
                });

                marker.on("click", () => {
                    mapInstance.setView([lat, lng], Math.max(mapInstance.getZoom(), 14));
                    marker.openPopup();
                });
            });
        };

        const renderHydrometeorologySummaryPoints = (mapInstance, hydrometeorologyPositions) => {
            const latLngs = [];
            ensureStationPanes(mapInstance);

            const inferHydrometSummaryType = (values = []) => {
                const keys = values.map((item) => String(item?.kiHieu || "").toUpperCase()).filter(Boolean);

                if (keys.some((key) => key.startsWith("R_"))) {
                    return "Điểm đo mưa";
                }
                if (keys.some((key) => key.startsWith("H"))) {
                    return "Trạm thủy văn";
                }
                return "Trạm khí tượng";
            };

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

                const stationTypeLabel = inferHydrometSummaryType(station.values);
                const icon = getHydrometIcon(stationTypeLabel);

                const marker = L.marker([lat, lng], {
                    icon,
                    isHydrometPoint: true,
                    isHydrometSummary: true,
                    kiHieu: point.KiHieu,
                    maTram: point.TenTam, // Add station name as identifier
                    pane: "hydrometMarkerPane",
                    zIndexOffset: 1000,
                }).addTo(mapInstance);

                latLngs.push([lat, lng]);

                marker.bindTooltip(point.TenTam, {
                    permanent: true,
                    direction: "top",
                    offset: [0, -10],
                    className: "custom-tooltip station-tooltip",
                    pane: "hydrometTooltipPane",
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
                    <strong class="detail-label">Ngày quan trắc:</strong>
                    <span class="detail-value">${date}</span>
                  </div>
                </div>
                <div class="detail-item py-2">
                  <div class="detail-content">
                    <strong class="detail-label">Mã trạm:</strong>
                    <span class="detail-value">${point.KiHieu}</span>
                  </div>
                </div>    
                <div class="detail-item py-2">
                  <div class="detail-content">
                    <strong class="detail-label">Yếu tố:</strong>
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
    },
);

MapboxMap.displayName = "MapboxMap";

export default MapboxMap;
