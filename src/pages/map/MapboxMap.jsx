import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet.locatecontrol/dist/L.Control.Locate.css";
import "leaflet.locatecontrol";
import "leaflet-draw";
import "@components/BetterWMS.js";
import { ToastCommon } from "@components/ToastCommon.jsx";
import { TOAST } from "@common/constants.js";
import SaltChartFull from "@pages/map/SaltChartFull";
import HydrometChartFull from "@pages/map/HydrometChartFull";
import IoTChartFull from "@pages/map/IoTChartFull";
import ReservoirChartFull from "@pages/map/ReservoirChartFull";
import AdministrativeDashboard from "@pages/map/AdministrativeDashboard";
import { initializeMap } from "@components/map/mapInitialization";
import { initSalinityStatsPanel } from "@components/map/salinityStatsPanel";
import { renderSalinityPoints } from "@components/map/SalinityMarkers";
import { renderHydrometStations } from "@components/map/HydrometMarkers";
import { renderReservoirPoints } from "@components/map/ReservoirMarkers";
import { renderIoTStations, removeIoTStations } from "@components/map/IoTMarkers";
import { handleLocationChange, handleFeatureHighlight } from "@components/map/mapUtils";
import { handleLayerLabelToggle, handleZoomChange, clearAllLabels } from "@components/map/mapLabels";
import {
    fetchSalinityData,
    fetchReservoirOverview,
    fetchReservoirData,
} from "@components/map/mapDataServices";
import { layerStyles, legendNames, updateLegendVisibility } from "@components/map/mapStyles";

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
        const [showReservoirChart, setShowReservoirChart] = useState(false);
        const [salinityData, setSalinityData] = useState([]);
        // Theo dõi salinityData hiện đang thuộc về trạm nào - KHÔNG được suy ra từ
        // selectedPoint.kiHieu vì marker.on("click") trong SalinityMarkers.jsx đã set
        // selectedPoint.kiHieu = trạm vừa bấm NGAY LẬP TỨC khi click marker (trước khi nút "Xem
        // biểu đồ" gọi openChartDetails), khiến phép so sánh isCurrentPoint luôn đúng và bỏ qua
        // fetch - gây hiện tượng mở biểu đồ trạm mới nhưng hiển thị lại data của trạm mở trước đó.
        const loadedSalinityKiHieuRef = useRef(null);
        const [selectedStation, setSelectedStation] = useState(null);
        const [hydrometData, setHydrometData] = useState([]);
        const [internalIotData, setInternalIotData] = useState(null);
        const [reservoirOverview, setReservoirOverview] = useState(null);
        const [reservoirData, setReservoirData] = useState([]);
        const [selectedReservoir, setSelectedReservoir] = useState(null);
        const [reservoirInitialTab, setReservoirInitialTab] = useState("chart");
        const [adminDashboard, setAdminDashboard] = useState(null);
        const activeLayers = selectedLayers;
        const highlightedLayerRef = useRef(null);
        const highlightedMarkerRef = useRef(null);
        const baseMapsRef = useRef({});
        const activeBaseMapRef = useRef("Google Streets");
        const boundaryLayerRef = useRef(null);

        const applyReservoirDateRange = async ({ code, startDate, endDate }) => {
            if (!code) return;

            try {
                const overview = await fetchReservoirOverview(code, { limit: 50, startDate, endDate });
                const requestedLimit = Number(overview?.total_records || 0);
                const tableRows = await fetchReservoirData(code, {
                    startDate,
                    endDate,
                    limit: requestedLimit > 0 ? requestedLimit : 20000,
                });

                const overviewRows = Array.isArray(overview?.data) ? overview.data : [];
                const effectiveRows =
                    Array.isArray(tableRows) && tableRows.length > 0 ? tableRows : overviewRows;

                const latestRow = effectiveRows[effectiveRows.length - 1] || null;
                const latestValue =
                    latestRow?.TongLuongXa ?? latestRow?.latest_value ?? overview?.latest_value ?? null;

                setReservoirOverview(
                    overview
                        ? {
                              ...overview,
                              total_records: effectiveRows.length,
                              latest_value: latestValue,
                          }
                        : null,
                );
                setReservoirData(effectiveRows);
            } catch (error) {
                console.error("Error applying reservoir date range:", error);
                ToastCommon({ message: "Không thể lọc dữ liệu theo giai đoạn", type: TOAST.ERROR });
            }
        };

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

        useEffect(() => {
            window.openAdministrativeDashboard = (level, code) => {
                if (level && code) setAdminDashboard({ level, code });
            };

            return () => {
                delete window.openAdministrativeDashboard;
            };
        }, []);

        // Add global function for popup button action
        useEffect(() => {
            window.openChartDetails = async (kiHieu, tenDiem) => {
                if (!kiHieu) return;

                try {
                    if (loadedSalinityKiHieuRef.current !== kiHieu) {
                        const fetchedData = await fetchSalinityData(kiHieu);
                        setSalinityData(Array.isArray(fetchedData) ? fetchedData : []);
                        loadedSalinityKiHieuRef.current = kiHieu;
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

            window.openReservoirDetails = async (reservoirCode, reservoirName, initialTab = "chart") => {
                if (!reservoirCode) return;

                try {
                    const [overview, tableRows] = await Promise.all([
                        fetchReservoirOverview(reservoirCode, { limit: 20000 }),
                        fetchReservoirData(reservoirCode, { limit: 20000 }),
                    ]);

                    setSelectedReservoir({
                        code: reservoirCode,
                        name: reservoirName || reservoirCode,
                    });
                    setReservoirOverview(overview || null);
                    setReservoirData(Array.isArray(tableRows) ? tableRows : []);
                    setReservoirInitialTab(initialTab === "data" ? "data" : "chart");
                    setShowReservoirChart(true);
                } catch (error) {
                    console.error("Error opening reservoir details:", error);
                    ToastCommon({ message: "Không thể mở dữ liệu hồ chứa", type: TOAST.ERROR });
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
                if (window.openReservoirDetails) {
                    delete window.openReservoirDetails;
                }
            };
        }, [hydrometData]);

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
                    message: `Đã định vị: ${lat.toFixed(6).replace(".", ",")}, ${lng.toFixed(6).replace(".", ",")}`,
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
            if (!map || !activeLayers) return;

            // Clear existing selections when layers change
            setSelectedPoint(null);
            setSelectedStation(null);
            setShowFullChart(false);
            setShowReservoirChart(false);
            setSalinityData([]);
            loadedSalinityKiHieuRef.current = null;
            setHydrometData([]);
            setReservoirData([]);
            setReservoirOverview(null);
            setSelectedReservoir(null);

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
                    layer.options?.isReservoirPoint ||
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
            const activeHydrometLayers = activeLayers.filter((layerName) =>
                hydrometLayerNames.includes(layerName),
            );
            let hydrometRendered = false;

            // Add selected layers with optimized configuration
            activeLayers.forEach((layerName) => {
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
                } else if (layerName === "HoChuaThuongLuu") {
                    renderReservoirPoints(map);
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
                for (const layerName of activeLayers) {
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
        }, [activeLayers, map]);

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
                handleZoomChange(map, activeLayers);
            };

            map.on("zoomend", onZoomEnd);

            return () => {
                map.off("zoomend", onZoomEnd);
            };
        }, [map, activeLayers]);

        // Bảng "Thống kê dữ liệu đo mặn": chọn mốc quan trắc/dự báo -> liệt kê số liệu; bấm 1 dòng ->
        // bật hộ lớp điểm đo mặn/trạm IoT nếu đang tắt rồi mở đúng popup đầy đủ của marker gốc.
        useEffect(() => {
            if (!map) return;
            return initSalinityStatsPanel(map, {
                ensureSalinityLayer: () => renderSalinityPoints(map, setSalinityData, setSelectedPoint),
                ensureIoTLayer: () => renderIoTStations(map, setInternalIotData),
            });
        }, [map]);

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

                <ReservoirChartFull
                    show={showReservoirChart}
                    reservoirCode={selectedReservoir?.code}
                    reservoirName={selectedReservoir?.name}
                    overview={reservoirOverview}
                    reservoirData={reservoirData}
                    initialTab={reservoirInitialTab}
                    onApplyRange={applyReservoirDateRange}
                    onClose={() => setShowReservoirChart(false)}
                />

                {adminDashboard && (
                    <AdministrativeDashboard
                        key={`${adminDashboard.level}:${adminDashboard.code}`}
                        show
                        level={adminDashboard.level}
                        code={adminDashboard.code}
                        onClose={() => setAdminDashboard(null)}
                    />
                )}
            </>
        );
    },
);

MapboxMap.displayName = "MapboxMap";

export default MapboxMap;
