import React, { useEffect, useState, useMemo, useRef } from "react";
import AreaInterestSelector from "./AreaInterestSelector";
import { getSingleStationClassification } from "@common/salinityClassification";
import { convertDMSToDecimal, dmsToDecimal } from "@components/convertDMSToDecimal";
import { mapLayers, irrigationLayers } from "@pages/map/dataLayers";
import { createSalinityPopup } from "./map/SalinityMarkers";
import { createHydrometPopup } from "./map/HydrometMarkers";
import IoTStationModal from "./IoTStationModal";
import {
    fetchIoTStations,
    fetchIoTData,
    fetchSalinityData,
    fetchHydrometData,
    formatIoTDataForDisplay,
} from "./map/mapDataServices";

const DEFAULT_MONITORING_LAYERS = [
    "salinityPoints",
    "iotStations",
    "hydrometRainStations",
    "hydrometMeteorologyStations",
    "hydrometHydrologyStations",
];

const BASE_MAP_OPTIONS = [
    {
        value: "Google Streets",
        label: "Google Streets",
        description: "Bản đồ đường phố",
    },
    {
        value: "Google Satellite",
        label: "Google Satellite",
        description: "Bản đồ vệ tinh",
    },
    {
        value: "Google Hybrid",
        label: "Google Hybrid",
        description: "Bản đồ lai",
    },
];

function LeftMenuMap({
    sidebarOpen,
    setSidebarOpen,
    onLayerToggle,
    onBaseMapChange,
    selectedBaseMap = "Google Streets",
    setSelectedLocation,
    setHighlightedFeature,
    setIotData,
}) {
    const [state, setState] = useState({
        openMenuIndex: null,
        enabledLayers: DEFAULT_MONITORING_LAYERS,
        openSalinityDropdown: false,
        openHydrometDropdown: true,
        openIrrigationDropdown: false,
        openBaseMapDropdown: false,
        openIrrigationSubIndex: null,
    });
    const hasAppliedDefaultLayersRef = useRef(false);
    const [iotModalOpen, setIotModalOpen] = useState(false);
    const [iotStationStats, setIotStationStats] = useState({ active: 0, total: 0, lastSync: null });

    const handleSalinityPointsToggle = (checked) => {
        setState((prevState) => ({
            ...prevState,
            enabledLayers: checked
                ? [...prevState.enabledLayers, "salinityPoints"]
                : prevState.enabledLayers.filter((layer) => layer !== "salinityPoints"),
        }));

        onLayerToggle("salinityPoints", checked);
    };

    const handleHydrometLayerToggle = (layerName, checked) => {
        setState((prevState) => ({
            ...prevState,
            enabledLayers: checked
                ? [...prevState.enabledLayers.filter((layer) => layer !== layerName), layerName]
                : prevState.enabledLayers.filter((layer) => layer !== layerName),
        }));

        onLayerToggle(layerName, checked);
    };

    const handleIoTStationsToggle = (checked) => {
        setState((prevState) => ({
            ...prevState,
            enabledLayers: checked
                ? [...prevState.enabledLayers, "iotStations"]
                : prevState.enabledLayers.filter((layer) => layer !== "iotStations"),
        }));

        onLayerToggle("iotStations", checked);
    };

    const handleMonitoringDataVisibilityToggle = () => {
        const shouldEnableAll = !DEFAULT_MONITORING_LAYERS.every((layer) =>
            state.enabledLayers.includes(layer),
        );

        setState((prevState) => ({
            ...prevState,
            enabledLayers: shouldEnableAll
                ? [...new Set([...prevState.enabledLayers, ...DEFAULT_MONITORING_LAYERS])]
                : prevState.enabledLayers.filter((layer) => !DEFAULT_MONITORING_LAYERS.includes(layer)),
        }));

        DEFAULT_MONITORING_LAYERS.forEach((layerName) => {
            onLayerToggle(layerName, shouldEnableAll);
        });
    };

    const toggleSalinityDropdown = () => {
        setState((prevState) => ({
            ...prevState,
            openSalinityDropdown: !prevState.openSalinityDropdown,
        }));
    };

    const toggleIrrigationDropdown = () => {
        setState((prevState) => ({
            ...prevState,
            openIrrigationDropdown: !prevState.openIrrigationDropdown,
        }));
    };

    const toggleHydrometDropdown = () => {
        setState((prevState) => ({
            ...prevState,
            openHydrometDropdown: !prevState.openHydrometDropdown,
        }));
    };

    const toggleBaseMapDropdown = () => {
        setState((prevState) => ({
            ...prevState,
            openBaseMapDropdown: !prevState.openBaseMapDropdown,
        }));
    };

    const toggleIrrigationSubDropdown = (index) => {
        setState((prevState) => ({
            ...prevState,
            openIrrigationSubIndex: prevState.openIrrigationSubIndex === index ? null : index,
        }));
    };

    const handleIoTStationClick = () => {
        setIotModalOpen(true);
    };

    // Hàm để lấy dữ liệu IoT mặc định (7 ngày gần nhất)
    const handleIoTQuickView = async () => {
        try {
            // Hiển thị trạm IoT trên bản đồ trước
            setState((prevState) => ({
                ...prevState,
                enabledLayers: [...prevState.enabledLayers.filter((l) => l !== "iotStations"), "iotStations"],
            }));
            onLayerToggle("iotStations", true);

            const stationsResponse = await fetchIoTStations();
            if (stationsResponse.success && stationsResponse.data && stationsResponse.data.length > 0) {
                // Cập nhật thống kê
                const stats = calculateStationStats(stationsResponse.data);
                setIotStationStats(stats);

                // Lấy trạm có nhiều dữ liệu nhất
                const activeStation = stationsResponse.data
                    .filter((station) => station.total_records > 0 && station.serial_number)
                    .sort((a, b) => parseInt(b.total_records) - parseInt(a.total_records))[0];

                if (activeStation) {
                    // Tự động lấy dữ liệu 7 ngày gần nhất
                    const endDate = new Date().toISOString().split("T")[0];
                    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        .toISOString()
                        .split("T")[0];

                    const result = await fetchIoTData(activeStation.serial_number, {
                        startDate,
                        endDate,
                        limit: 1000,
                    });

                    if (result.success && result.data && result.data.length > 0) {
                        const formattedData = formatIoTDataForDisplay(result, activeStation);

                        if (formattedData) {
                            setIotData(formattedData);
                        }
                    } else {
                        console.warn("⚠️ No IoT data found for quick view");
                    }
                } else {
                    console.warn("⚠️ No active station found with data");
                }
            } else {
                console.warn("⚠️ No IoT stations found");
            }
        } catch (error) {
            console.error("❌ Error fetching IoT quick view:", error);
        }
    };

    // Hàm tính toán thống kê trạm
    const calculateStationStats = (stations) => {
        const activeStations = stations.filter(
            (station) => station.total_records > 0 && station.serial_number && station.status === "active",
        ).length;

        const lastSyncTimes = stations
            .filter((station) => station.last_data_time)
            .map((station) => new Date(station.last_data_time))
            .sort((a, b) => b - a);

        return {
            active: activeStations,
            total: stations.length,
            lastSync: lastSyncTimes[0] || null,
        };
    };

    const handleIoTDataSubmit = async (stationInfo, startDate, endDate) => {
        try {
            // Sử dụng serial_number thay vì serial
            const serialNumber = stationInfo.serial_number;

            if (!serialNumber) {
                return {
                    success: false,
                    message: "Trạm chưa có serial number. Vui lòng chọn trạm khác.",
                };
            }

            // Gọi API mới với định dạng ngày yyyy-mm-dd
            const result = await fetchIoTData(serialNumber, {
                startDate: startDate, // startDate đã được format từ modal
                endDate: endDate, // endDate đã được format từ modal
                limit: 1000, // Lấy nhiều dữ liệu hơn
            });

            // Kiểm tra xem có dữ liệu thành công hay không
            if (result.success && result.data && result.data.length > 0) {
                const formattedData = formatIoTDataForDisplay(result, stationInfo);
                if (formattedData) {
                    setIotData(formattedData);
                    // Trả về success để modal biết có thể đóng
                    return {
                        success: true,
                        message: `Đã lấy thành công ${formattedData.summary.totalRecords} bản ghi từ trạm ${formattedData.stationName}. Dữ liệu sẽ hiển thị trong panel MapDetails.`,
                    };
                }
            }

            // Không có dữ liệu
            return {
                success: false,
                message: result.message || "Không có dữ liệu trong khoảng thời gian đã chọn",
            };
        } catch (error) {
            console.error("Error handling IoT data:", error);
            return {
                success: false,
                message: "Có lỗi xảy ra khi lấy dữ liệu. Vui lòng thử lại.",
            };
        }
    };

    // Tự động tải thống kê trạm IoT khi component mount
    useEffect(() => {
        const loadIoTStationStats = async () => {
            try {
                const stationsResponse = await fetchIoTStations();
                if (stationsResponse.success && stationsResponse.data) {
                    const stats = calculateStationStats(stationsResponse.data);
                    setIotStationStats(stats);
                }
            } catch (error) {
                console.error("Error loading IoT station stats:", error);
            }
        };

        loadIoTStationStats();

        // Tự động refresh stats mỗi 3 phút (để sync với backend)
        const interval = setInterval(loadIoTStationStats, 3 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // Apply default monitoring layers once on first load.
    useEffect(() => {
        if (hasAppliedDefaultLayersRef.current) return;

        DEFAULT_MONITORING_LAYERS.forEach((layerName) => {
            onLayerToggle(layerName, true);
        });

        hasAppliedDefaultLayersRef.current = true;
    }, [onLayerToggle]);

    const toggleDropdown = (index) => {
        setState((prevState) => ({
            ...prevState,
            openMenuIndex: prevState.openMenuIndex === index ? null : index,
        }));
    };

    const handleLayerToggle = async (layer, checked) => {
        const updatedLayers = checked
            ? [...state.enabledLayers, layer]
            : state.enabledLayers.filter((l) => l !== layer);

        onLayerToggle(layer, checked);

        setState((prevState) => ({
            ...prevState,
            enabledLayers: updatedLayers,
        }));
    };

    const getBoundsFromCoordinates = (coordinates) => {
        let lats = [];
        let lngs = [];

        const extractCoords = (coords) => {
            coords.forEach((c) => {
                if (typeof c[0] === "number" && typeof c[1] === "number") {
                    lngs.push(c[0]);
                    lats.push(c[1]);
                } else {
                    extractCoords(c);
                }
            });
        };

        extractCoords(coordinates);

        const southWest = [Math.min(...lats), Math.min(...lngs)];
        const northEast = [Math.max(...lats), Math.max(...lngs)];

        return [southWest, northEast];
    };

    const normalizeCoordinate = (value) => {
        if (value === null || value === undefined) return null;
        if (typeof value === "number") return value;

        const raw = String(value).trim();
        if (!raw) return null;

        const numeric = parseFloat(raw);
        if (!Number.isNaN(numeric) && /^-?\d+(\.\d+)?$/.test(raw)) {
            return numeric;
        }

        return convertDMSToDecimal(raw) ?? dmsToDecimal(raw);
    };

    const escapeHtml = (value) =>
        String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");

    const escapeJsString = (value) =>
        String(value ?? "")
            .replace(/\\/g, "\\\\")
            .replace(/'/g, "\\'");

    useEffect(() => {
        if (!window.searchIoTPopupPayloads) {
            window.searchIoTPopupPayloads = {};
        }

        window.openSearchIoTChart = (serialNumber) => {
            const payload = window.searchIoTPopupPayloads?.[serialNumber];
            if (!payload) {
                console.warn("Không tìm thấy dữ liệu popup IoT cho serial:", serialNumber);
                return;
            }

            if (typeof window.onOpenIoTChart === "function") {
                window.onOpenIoTChart(payload);
            }
        };

        return () => {
            if (window.openSearchIoTChart) {
                delete window.openSearchIoTChart;
            }
        };
    }, []);

    const formatPopupDate = (value) => {
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

    const buildSalinityTrend = (data = []) => {
        let latestSalinity = null;
        let previousSalinity = null;
        let latestDate = null;
        let previousDate = null;
        let trend = null;

        for (let index = data.length - 1; index >= 0; index -= 1) {
            const value = Number(data[index]?.salinity);
            if (!Number.isFinite(value)) continue;

            if (latestSalinity === null) {
                latestSalinity = value;
                latestDate = new Date(data[index].date).toLocaleDateString("vi-VN");
                continue;
            }

            if (previousSalinity === null) {
                previousSalinity = value;
                previousDate = new Date(data[index].date).toLocaleDateString("vi-VN");
                break;
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

        return {
            latestSalinity,
            latestDate,
            previousDate,
            trend,
        };
    };

    const buildIoTSearchPopupHtml = (result, options = {}) => {
        const {
            loading = false,
            error = null,
            hasChart = false,
            latestSaltValue = null,
            latestSaltUnit = "‰",
            lastDataTime = null,
            totalRecords = 0,
        } = options;

        const baseCode = String(result.StationCode || "").replace(/_IoT$/i, "");
        const classification = getSingleStationClassification(latestSaltValue, baseCode);
        const riskMap = {
            normal: { className: "status-normal", color: "#28a745" },
            warning: { className: "status-warning", color: "#ffc107" },
            "high-warning": { className: "status-high-warning", color: "#fd7e14" },
            critical: { className: "status-critical", color: "#dc3545" },
            "no-data": { className: "status-no-data", color: "#6c757d" },
        };
        const riskInfo = riskMap[classification.class] || riskMap["no-data"];

        const actionHtml = hasChart
            ? `<div class="popup-actions">
                    <button class="btn-view-data" onclick="window.openSearchIoTChart('${escapeJsString(result.SerialNumber)}')">
                        <i class="fa-solid fa-chart-line"></i>
                        Xem biểu đồ
                    </button>
               </div>`
            : "";

        const contentHtml = loading
            ? `<div class="popup-loading"><i class="fa-solid fa-spinner fa-spin"></i><p>Đang tải dữ liệu...</p></div>`
            : error
              ? `<div class="popup-error"><i class="fa-solid fa-circle-exclamation"></i><p>${escapeHtml(error)}</p></div>`
              : `
                    <div class="popup-main-value">
                        <span class="value-label">Độ mặn hiện tại</span>
                        <span class="value-number" style="color: ${riskInfo.color}">
                            ${latestSaltValue !== null && latestSaltValue !== undefined ? `${Number(latestSaltValue).toFixed(2)} ${escapeHtml(latestSaltUnit)}` : "--"}
                        </span>
                        <span class="value-date">${escapeHtml(formatPopupDate(lastDataTime))}</span>
                    </div>
                    <div class="popup-details">
                        <div class="detail-item"><div class="detail-content py-2"><strong class="detail-label">Mã serial: </strong><span class="detail-value">${escapeHtml(result.SerialNumber)}</span></div></div>
                        <div class="detail-item"><div class="detail-content py-2"><strong class="detail-label">Mã trạm: </strong><span class="detail-value">${escapeHtml(result.StationCode)}</span></div></div>
                        <div class="detail-item"><div class="detail-content py-2"><strong class="detail-label">Cảnh báo: </strong><span class="detail-value" style="color: ${riskInfo.color}; font-weight: 600;">${escapeHtml(classification.shortText)}</span></div></div>
                        <div class="detail-item"><div class="detail-content py-2"><strong class="detail-label">Tọa độ: </strong><span class="detail-value">${escapeHtml(result.ViDo)}, ${escapeHtml(result.KinhDo)}</span></div></div>
                        <div class="detail-item"><div class="detail-content py-2"><strong class="detail-label">Tần suất: </strong><span class="detail-value">${escapeHtml(result.TanSuat)}</span></div></div>
                        <div class="detail-item"><div class="detail-content py-2"><strong class="detail-label">Tổng bản ghi: </strong><span class="detail-value">${Number(totalRecords || 0).toLocaleString()}</span></div></div>
                   </div>`;

        return `
            <div class="modern-popup iot-popup">
                <div class="popup-header">
                    <div class="popup-icon">📡</div>
                    <div class="popup-title">
                        <h4 class="popup-name">${escapeHtml(result.StationName)}</h4>
                        <span class="popup-type">Trạm IoT</span>
                    </div>
                    <div class="popup-status ${riskInfo.className}">${escapeHtml(classification.shortText)}</div>
                </div>
                <div class="popup-content">
                    ${contentHtml}
                    ${actionHtml}
                </div>
            </div>
        `;
    };

    const buildSearchPopupHtml = (result, options = {}) => {
        if (result.type === "iot_station") {
            return buildIoTSearchPopupHtml(result, options);
        }
        return null;
    };

    const handleIoTSearchResultClick = async (result, lat, lng) => {
        try {
            setHighlightedFeature({
                id: result.SerialNumber,
                geometry: {
                    type: "Point",
                    coordinates: [lng, lat],
                },
                icon: "tower-broadcast",
                name: result.StationName,
                popupHtml: buildSearchPopupHtml(result, { loading: true }),
            });

            const endDate = new Date().toISOString().split("T")[0];
            const startDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

            const dataResult = await fetchIoTData(result.SerialNumber, {
                startDate,
                endDate,
                limit: 1000,
            });

            if (dataResult.success && dataResult.data && dataResult.data.length > 0) {
                const formattedData = formatIoTDataForDisplay(dataResult, {
                    serial_number: result.SerialNumber,
                    station_name: result.StationName,
                    station_code: result.StationCode,
                });
                const latestRow = dataResult.data[0] || null;

                if (formattedData) {
                    setIotData(formattedData);
                    window.searchIoTPopupPayloads[result.SerialNumber] = formattedData;
                    setHighlightedFeature({
                        id: result.SerialNumber,
                        geometry: {
                            type: "Point",
                            coordinates: [lng, lat],
                        },
                        icon: "tower-broadcast",
                        name: result.StationName,
                        popupHtml: buildSearchPopupHtml(result, {
                            hasChart: true,
                            latestSaltValue: latestRow?.salt_value ?? null,
                            latestSaltUnit: latestRow?.salt_unit || "‰",
                            lastDataTime: latestRow?.date_time || null,
                            totalRecords: formattedData.summary.totalRecords || dataResult.data.length,
                        }),
                    });
                }
            } else {
                setHighlightedFeature({
                    id: result.SerialNumber,
                    geometry: {
                        type: "Point",
                        coordinates: [lng, lat],
                    },
                    icon: "tower-broadcast",
                    name: result.StationName,
                    popupHtml: buildSearchPopupHtml(result, {
                        error: dataResult.message || "Không có dữ liệu trong 14 ngày gần nhất",
                    }),
                });
            }
        } catch (error) {
            console.error("Error loading IoT search result data:", error);
            setHighlightedFeature({
                id: result.SerialNumber,
                geometry: {
                    type: "Point",
                    coordinates: [lng, lat],
                },
                icon: "tower-broadcast",
                name: result.StationName,
                popupHtml: buildSearchPopupHtml(result, { error: "Lỗi khi tải dữ liệu trạm IoT" }),
            });
        }
    };

    const handleSalinitySearchResultClick = async (result, lat, lng) => {
        setHighlightedFeature({
            id: result.KiHieu,
            geometry: {
                type: "Point",
                coordinates: [lng, lat],
            },
            icon: "droplet",
            name: result.TenDiem,
            popupHtml:
                '<div class="popup-loading"><i class="fa-solid fa-spinner fa-spin"></i><p>Đang tải dữ liệu...</p></div>',
        });

        try {
            const data = await fetchSalinityData(result.KiHieu);
            const { latestSalinity, latestDate, previousDate, trend } = buildSalinityTrend(data);

            setHighlightedFeature({
                id: result.KiHieu,
                geometry: {
                    type: "Point",
                    coordinates: [lng, lat],
                },
                icon: "droplet",
                name: result.TenDiem,
                popupHtml: createSalinityPopup(result, latestSalinity, latestDate, trend, previousDate),
            });
        } catch (error) {
            console.error("Error loading salinity search result data:", error);
        }
    };

    const handleHydrometSearchResultClick = async (result, lat, lng) => {
        setHighlightedFeature({
            id: result.KiHieu,
            geometry: {
                type: "Point",
                coordinates: [lng, lat],
            },
            icon: "cloud-rain",
            name: result.TenTram,
            popupHtml:
                '<div class="popup-loading"><i class="fa-solid fa-spinner fa-spin"></i><p>Đang tải dữ liệu...</p></div>',
        });

        try {
            const hydrometResponse = await fetchHydrometData(result.KiHieu, {
                limit: 100,
                orderBy: "DESC",
            });
            const normalizedHydrometResponse = {
                ...hydrometResponse,
                data: Array.isArray(hydrometResponse?.data)
                    ? [...hydrometResponse.data].reverse()
                    : hydrometResponse?.data,
            };

            setHighlightedFeature({
                id: result.KiHieu,
                geometry: {
                    type: "Point",
                    coordinates: [lng, lat],
                },
                icon: "cloud-rain",
                name: result.TenTram,
                popupHtml: createHydrometPopup(result, normalizedHydrometResponse),
            });
        } catch (error) {
            console.error("Error loading hydromet search result data:", error);
        }
    };

    const handleClick = (result) => {
        try {
            if (result.type === "diem_do_man") {
                const lat = normalizeCoordinate(result.ViDo);
                const lng = normalizeCoordinate(result.KinhDo);
                if (lat && lng) {
                    setSelectedLocation({ lat, lng, zoom: 15 });
                    handleSalinitySearchResultClick(result, lat, lng);
                }
                return;
            }

            if (result.type === "khi_tuong_thuy_van") {
                const lat = normalizeCoordinate(result.ViDo);
                const lng = normalizeCoordinate(result.KinhDo);
                if (lat && lng) {
                    setSelectedLocation({ lat, lng, zoom: 15 });
                    handleHydrometSearchResultClick(result, lat, lng);
                }
                return;
            }

            if (result.type === "iot_station") {
                const lat = normalizeCoordinate(result.ViDo);
                const lng = normalizeCoordinate(result.KinhDo);
                if (lat && lng) {
                    setSelectedLocation({ lat, lng, zoom: 15 });
                    handleIoTSearchResultClick(result, lat, lng);
                }
                return;
            }

            const geojson = result.geom;
            if (!geojson || !geojson.type) {
                console.warn("⚠️ No valid geojson found in result");
                return;
            }

            if (geojson.type === "Point") {
                const [lng, lat] = geojson.coordinates;
                setSelectedLocation({ lat, lng, zoom: 14 });
                setHighlightedFeature({
                    geometry: geojson,
                    id: result.id || result.mahuyen || result.maxa || result.MaHuyen || result.MaXa,
                    icon: "marker",
                    name:
                        result.name ||
                        result.tenhuyen ||
                        result.tenxa ||
                        result.TenHuyen ||
                        result.TenXa ||
                        "Điểm",
                });
            } else if (geojson.type === "Polygon" || geojson.type === "MultiPolygon") {
                const bounds = getBoundsFromCoordinates(geojson.coordinates);
                setSelectedLocation({ bounds });
                setHighlightedFeature({
                    type: "Feature",
                    geometry: geojson,
                    id: result.id || result.mahuyen || result.maxa || result.MaHuyen || result.MaXa,
                    name:
                        result.name ||
                        result.tenhuyen ||
                        result.tenxa ||
                        result.TenHuyen ||
                        result.TenXa ||
                        "Vùng",
                });
            }
        } catch (err) {
            console.error("❌ Lỗi xử lý GeoJSON hoặc tọa độ:", err);
        }
    };

    useEffect(() => {
        const handleSearchResultSelect = (event) => {
            const result = event?.detail;
            if (!result) return;
            handleClick(result);
        };

        window.addEventListener("map-search-result-select", handleSearchResultSelect);
        return () => {
            window.removeEventListener("map-search-result-select", handleSearchResultSelect);
        };
    }, [handleClick]);

    const enabledLayerSet = useMemo(() => new Set(state.enabledLayers), [state.enabledLayers]);

    const hasEnabledChildLayer = (layers = []) =>
        Array.isArray(layers) && layers.some((layer) => enabledLayerSet.has(layer));

    const renderTabContent = useMemo(() => {
        return (
            <>
                <div className="tab-content-data">
                    {/* Monitoring Data Section */}
                    <div className="data-section">
                        <div className="section-header d-flex justify-content-between align-items-center gap-2 flex-wrap">
                            <h3 className="section-title mb-0">Dữ liệu chuyên đề</h3>
                        </div>
                        <div className="monitoring-layers">
                            {/* Salinity Monitoring Dropdown */}
                            <div className="category-item">
                                <div
                                    className={`category-header ${state.openSalinityDropdown ? "active" : ""} ${
                                        hasEnabledChildLayer(["salinityPoints", "iotStations"])
                                            ? "has-active-children"
                                            : ""
                                    }`}
                                    onClick={toggleSalinityDropdown}
                                >
                                    <div className="category-info">
                                        <i className="fa-solid fa-droplet category-icon"></i>
                                        <span className="category-name">Quan trắc mặn</span>
                                    </div>
                                    <i
                                        className={`fa-solid fa-chevron-right expand-icon ${
                                            state.openSalinityDropdown ? "rotated" : ""
                                        }`}
                                    ></i>
                                </div>

                                {state.openSalinityDropdown && (
                                    <div className="category-layers">
                                        {/* Điểm đo mặn */}
                                        <div className="layer-item">
                                            <div className="layer-toggle">
                                                <input
                                                    type="checkbox"
                                                    id="layer-salinity-points"
                                                    className="layer-checkbox"
                                                    checked={state.enabledLayers.includes("salinityPoints")}
                                                    onChange={(e) =>
                                                        handleSalinityPointsToggle(e.target.checked)
                                                    }
                                                />
                                                <label
                                                    htmlFor="layer-salinity-points"
                                                    className="layer-label"
                                                >
                                                    <span className="layer-name">Điểm đo mặn</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Trạm IoT - Enhanced UI */}
                                        <div className="iot-station-container">
                                            {/* Toggle để hiển thị trạm IoT trên map */}
                                            <div className="layer-item monitoring-layer">
                                                <div className="layer-toggle">
                                                    <input
                                                        type="checkbox"
                                                        id="layer-iot-stations"
                                                        className="layer-checkbox"
                                                        checked={state.enabledLayers.includes("iotStations")}
                                                        onChange={(e) =>
                                                            handleIoTStationsToggle(e.target.checked)
                                                        }
                                                    />
                                                    <label
                                                        htmlFor="layer-iot-stations"
                                                        className="layer-label"
                                                    >
                                                        <div className="layer-info">
                                                            <div className="layer-details">
                                                                <span className="layer-name">Trạm IoT</span>
                                                            </div>
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Hydromet Stations */}
                            <div className="category-item">
                                <div
                                    className={`category-header ${state.openHydrometDropdown ? "active" : ""} ${
                                        hasEnabledChildLayer([
                                            "hydrometRainStations",
                                            "hydrometMeteorologyStations",
                                            "hydrometHydrologyStations",
                                            "hydrometStations",
                                        ])
                                            ? "has-active-children"
                                            : ""
                                    }`}
                                    onClick={toggleHydrometDropdown}
                                >
                                    <div className="category-info">
                                        <i className="fa-solid fa-cloud-rain category-icon"></i>
                                        <span className="category-name">Khí tượng thủy văn</span>
                                    </div>
                                    <i
                                        className={`fa-solid fa-chevron-right expand-icon ${
                                            state.openHydrometDropdown ? "rotated" : ""
                                        }`}
                                    ></i>
                                </div>

                                {state.openHydrometDropdown && (
                                    <div className="category-layers">
                                        <div className="layer-item monitoring-layer">
                                            <div className="layer-toggle">
                                                <input
                                                    type="checkbox"
                                                    id="layer-hydromet-rain-stations"
                                                    className="layer-checkbox"
                                                    checked={state.enabledLayers.includes(
                                                        "hydrometRainStations",
                                                    )}
                                                    onChange={(e) =>
                                                        handleHydrometLayerToggle(
                                                            "hydrometRainStations",
                                                            e.target.checked,
                                                        )
                                                    }
                                                />
                                                <label
                                                    htmlFor="layer-hydromet-rain-stations"
                                                    className="layer-label"
                                                >
                                                    <div className="layer-info">
                                                        <div className="layer-details">
                                                            <span className="layer-name">Điểm đo mưa</span>
                                                        </div>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="layer-item monitoring-layer">
                                            <div className="layer-toggle">
                                                <input
                                                    type="checkbox"
                                                    id="layer-hydromet-meteorology-stations"
                                                    className="layer-checkbox"
                                                    checked={state.enabledLayers.includes(
                                                        "hydrometMeteorologyStations",
                                                    )}
                                                    onChange={(e) =>
                                                        handleHydrometLayerToggle(
                                                            "hydrometMeteorologyStations",
                                                            e.target.checked,
                                                        )
                                                    }
                                                />
                                                <label
                                                    htmlFor="layer-hydromet-meteorology-stations"
                                                    className="layer-label"
                                                >
                                                    <div className="layer-info">
                                                        <div className="layer-details">
                                                            <span className="layer-name">Trạm khí tượng</span>
                                                        </div>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="layer-item monitoring-layer">
                                            <div className="layer-toggle">
                                                <input
                                                    type="checkbox"
                                                    id="layer-hydromet-hydrology-stations"
                                                    className="layer-checkbox"
                                                    checked={state.enabledLayers.includes(
                                                        "hydrometHydrologyStations",
                                                    )}
                                                    onChange={(e) =>
                                                        handleHydrometLayerToggle(
                                                            "hydrometHydrologyStations",
                                                            e.target.checked,
                                                        )
                                                    }
                                                />
                                                <label
                                                    htmlFor="layer-hydromet-hydrology-stations"
                                                    className="layer-label"
                                                >
                                                    <div className="layer-info">
                                                        <div className="layer-details">
                                                            <span className="layer-name">Trạm thủy văn</span>
                                                        </div>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Irrigation Works (Công trình thủy lợi) */}
                            <div className="category-item">
                                <div
                                    className={`category-header ${state.openIrrigationDropdown ? "active" : ""} ${
                                        hasEnabledChildLayer(
                                            irrigationLayers.items.flatMap((menu) => menu.layers || []),
                                        )
                                            ? "has-active-children"
                                            : ""
                                    }`}
                                    onClick={toggleIrrigationDropdown}
                                >
                                    <div className="category-info">
                                        <i className="fa-solid fa-building category-icon"></i>
                                        <span className="category-name">Công trình thủy lợi</span>
                                    </div>
                                    <i
                                        className={`fa-solid fa-chevron-right expand-icon ${
                                            state.openIrrigationDropdown ? "rotated" : ""
                                        }`}
                                    ></i>
                                </div>

                                {state.openIrrigationDropdown && (
                                    <div className="category-layers">
                                        {irrigationLayers.items.map((menu, index) => {
                                            const uniqueIndex = `irrigation-${index}`;
                                            const isOpen = state.openIrrigationSubIndex === uniqueIndex;

                                            return (
                                                <div className="subcategory-item" key={uniqueIndex}>
                                                    <div
                                                        className={`subcategory-header ${isOpen ? "active" : ""} ${
                                                            hasEnabledChildLayer(menu.layers)
                                                                ? "has-active-children"
                                                                : ""
                                                        }`}
                                                        onClick={() =>
                                                            toggleIrrigationSubDropdown(uniqueIndex)
                                                        }
                                                    >
                                                        <div className="subcategory-info">
                                                            <i
                                                                className={`${menu.icon} subcategory-icon`}
                                                            ></i>
                                                            <span className="subcategory-name">
                                                                {menu.name}
                                                            </span>
                                                        </div>
                                                        <i
                                                            className={`fa-solid fa-chevron-right expand-icon ${
                                                                isOpen ? "rotated" : ""
                                                            }`}
                                                        ></i>
                                                    </div>

                                                    {isOpen && (
                                                        <div className="subcategory-layers">
                                                            {menu.layers.map((layer, idx) => (
                                                                <div
                                                                    className="layer-item"
                                                                    key={`${uniqueIndex}-${idx}`}
                                                                >
                                                                    <div className="layer-toggle">
                                                                        <input
                                                                            type="checkbox"
                                                                            id={`layer-${layer}`}
                                                                            className="layer-checkbox"
                                                                            checked={state.enabledLayers.includes(
                                                                                layer,
                                                                            )}
                                                                            onChange={(e) =>
                                                                                handleLayerToggle(
                                                                                    layer,
                                                                                    e.target.checked,
                                                                                )
                                                                            }
                                                                        />
                                                                        <label
                                                                            htmlFor={`layer-${layer}`}
                                                                            className="layer-label"
                                                                        >
                                                                            <span className="layer-name">
                                                                                {menu.nameItem?.[idx] ||
                                                                                    layer}
                                                                            </span>
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* GIS Data Section */}
                    <div className="data-section">
                        <div className="section-header">
                            <h3 className="section-title">{mapLayers.title}</h3>
                        </div>
                        <div className="gis-categories">
                            {mapLayers.items.map((menu, index) => {
                                const uniqueIndex = index;
                                const isOpen = state.openMenuIndex === uniqueIndex;
                                const isSingleLayer = menu.layer && !menu.layers;
                                const hasChildLayerEnabled = hasEnabledChildLayer(menu.layers || []);

                                return (
                                    <div className="category-item" key={uniqueIndex}>
                                        {isSingleLayer ? (
                                            // Single layer item - direct toggle
                                            <div className="layer-item">
                                                <div className="layer-toggle">
                                                    <input
                                                        type="checkbox"
                                                        id={`layer-${menu.layer}`}
                                                        className="layer-checkbox"
                                                        checked={state.enabledLayers.includes(menu.layer)}
                                                        onChange={(e) =>
                                                            handleLayerToggle(menu.layer, e.target.checked)
                                                        }
                                                    />
                                                    <label
                                                        htmlFor={`layer-${menu.layer}`}
                                                        className="layer-label"
                                                    >
                                                        <div className="layer-info">
                                                            <i className={`${menu.icon} category-icon`}></i>
                                                            <span className="layer-name">{menu.name}</span>
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>
                                        ) : (
                                            // Multi-layer item - dropdown
                                            <>
                                                <div
                                                    className={`category-header ${isOpen ? "active" : ""} ${
                                                        hasChildLayerEnabled ? "has-active-children" : ""
                                                    }`}
                                                    onClick={() => toggleDropdown(uniqueIndex)}
                                                >
                                                    <div className="category-info">
                                                        <i className={`${menu.icon} category-icon`}></i>
                                                        <span className="category-name">{menu.name}</span>
                                                    </div>
                                                    <i
                                                        className={`fa-solid fa-chevron-right expand-icon ${
                                                            isOpen ? "rotated" : ""
                                                        }`}
                                                    ></i>
                                                </div>

                                                {isOpen && (
                                                    <div className="category-layers">
                                                        {menu.layers.map((layer, idx) => (
                                                            <div
                                                                className="layer-item"
                                                                key={`${uniqueIndex}-${idx}`}
                                                            >
                                                                <div className="layer-toggle">
                                                                    <input
                                                                        type="checkbox"
                                                                        id={`layer-${layer}`}
                                                                        className="layer-checkbox"
                                                                        checked={state.enabledLayers.includes(
                                                                            layer,
                                                                        )}
                                                                        onChange={(e) =>
                                                                            handleLayerToggle(
                                                                                layer,
                                                                                e.target.checked,
                                                                            )
                                                                        }
                                                                    />
                                                                    <label
                                                                        htmlFor={`layer-${layer}`}
                                                                        className="layer-label"
                                                                    >
                                                                        <span className="layer-name">
                                                                            {menu.nameItem?.[idx] || layer}
                                                                        </span>
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                );
                            })}

                            <div className="category-item">
                                <div
                                    className={`category-header ${state.openBaseMapDropdown ? "active" : ""}`}
                                    onClick={toggleBaseMapDropdown}
                                >
                                    <div className="category-info">
                                        <i className="fa-solid fa-map category-icon"></i>
                                        <span className="category-name">Nền Google</span>
                                    </div>
                                    <i
                                        className={`fa-solid fa-chevron-right expand-icon ${
                                            state.openBaseMapDropdown ? "rotated" : ""
                                        }`}
                                    ></i>
                                </div>

                                {state.openBaseMapDropdown && (
                                    <div className="category-layers basemap-layers">
                                        {BASE_MAP_OPTIONS.map((option) => {
                                            const optionId = `basemap-${option.value.toLowerCase().replace(/\s+/g, "-")}`;
                                            return (
                                                <div className="layer-item" key={option.value}>
                                                    <div className="layer-toggle">
                                                        <input
                                                            type="radio"
                                                            name="base-map-option"
                                                            id={optionId}
                                                            className="layer-checkbox basemap-radio"
                                                            checked={selectedBaseMap === option.value}
                                                            onChange={() => onBaseMapChange?.(option.value)}
                                                        />
                                                        <label htmlFor={optionId} className="layer-label">
                                                            <div className="layer-info">
                                                                <div className="layer-details">
                                                                    <span className="layer-name">
                                                                        {option.label}
                                                                    </span>
                                                                    <span className="layer-desc">
                                                                        {option.description}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </label>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }, [
        state.openMenuIndex,
        state.enabledLayers,
        state.openSalinityDropdown,
        state.openHydrometDropdown,
        state.openIrrigationDropdown,
        state.openBaseMapDropdown,
        state.openIrrigationSubIndex,
        selectedBaseMap,
        onBaseMapChange,
    ]);

    return (
        <>
            {!sidebarOpen && (
                <div
                    className="overlay"
                    onClick={() => {
                        setSidebarOpen(true);
                        setTimeout(() => {
                            window.dispatchEvent(new Event("resize"));
                        }, 350);
                    }}
                ></div>
            )}

            <div className={`sidebar ${sidebarOpen ? "" : "open"}`}>
                <div className="sidebarHeader pt-3">
                    <AreaInterestSelector
                        setSelectedLocation={setSelectedLocation}
                        setHighlightedFeature={setHighlightedFeature}
                    />
                    <div className="lineLeftMenu"></div>
                </div>

                {/* Sidebar Content */}
                {renderTabContent}
            </div>

            {/* IoT Station Modal */}
            <IoTStationModal
                isOpen={iotModalOpen}
                onClose={() => setIotModalOpen(false)}
                onSubmit={handleIoTDataSubmit}
            />
        </>
    );
}

export default LeftMenuMap;
