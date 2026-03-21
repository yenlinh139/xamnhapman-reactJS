import React, { useEffect, useState, useMemo } from "react";
import { NavLink } from "react-router-dom";
import { ROUTES } from "@common/constants";
import imageLogo from "@assets/logo.png";
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

function LeftMenuMap({
    sidebarOpen,
    setSidebarOpen,
    onLayerToggle,
    searchResults,
    setSelectedLocation,
    setHighlightedFeature,
    highlightedFeature,
    setIotData,
    activeTab,
    setActiveTab,
}) {
    const [state, setState] = useState({
        openMenuIndex: null,
        enabledLayers: [],
        isLoadingSearchResults: true,
        openSalinityDropdown: false,
        openIrrigationDropdown: false,
        openIrrigationSubIndex: null,
    });
    const [districtList, setDistrictList] = useState([]);
    const [selectedDistrict, setSelectedDistrict] = useState(null);
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

    const handleHydrometStationsToggle = (checked) => {
        setState((prevState) => ({
            ...prevState,
            enabledLayers: checked
                ? [...prevState.enabledLayers, "hydrometStations"]
                : prevState.enabledLayers.filter((layer) => layer !== "hydrometStations"),
        }));

        onLayerToggle("hydrometStations", checked);
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
                enabledLayers: [...prevState.enabledLayers.filter(l => l !== "iotStations"), "iotStations"]
            }));
            onLayerToggle("iotStations", true);

            const stationsResponse = await fetchIoTStations();            
            if (stationsResponse.success && stationsResponse.data && stationsResponse.data.length > 0) {
                // Cập nhật thống kê
                const stats = calculateStationStats(stationsResponse.data);
                setIotStationStats(stats);
                
                // Lấy trạm có nhiều dữ liệu nhất
                const activeStation = stationsResponse.data
                    .filter(station => station.total_records > 0 && station.serial_number)
                    .sort((a, b) => parseInt(b.total_records) - parseInt(a.total_records))[0];

                if (activeStation) {                  
                    // Tự động lấy dữ liệu 7 ngày gần nhất
                    const endDate = new Date().toISOString().split('T')[0];
                    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];                 
                    
                    const result = await fetchIoTData(activeStation.serial_number, {
                        startDate,
                        endDate,
                        limit: 1000
                    });
                    
                    if (result.success && result.data && result.data.length > 0) {
                        const formattedData = formatIoTDataForDisplay(result, activeStation);

                        if (formattedData) {
                            setIotData(formattedData);
                        }
                    } else {
                        console.warn('⚠️ No IoT data found for quick view');
                    }
                } else {
                    console.warn('⚠️ No active station found with data');
                }
            } else {
                console.warn('⚠️ No IoT stations found');
            }
        } catch (error) {
            console.error("❌ Error fetching IoT quick view:", error);
        }
    };

    // Hàm tính toán thống kê trạm
    const calculateStationStats = (stations) => {
        const activeStations = stations.filter(station => 
            station.total_records > 0 && 
            station.serial_number &&
            station.status === 'active'
        ).length;
        
        const lastSyncTimes = stations
            .filter(station => station.last_data_time)
            .map(station => new Date(station.last_data_time))
            .sort((a, b) => b - a);
        
        return {
            active: activeStations,
            total: stations.length,
            lastSync: lastSyncTimes[0] || null
        };
    };

    const handleIoTDataSubmit = async (stationInfo, startDate, endDate) => {
        try {
            // Sử dụng serial_number thay vì serial
            const serialNumber = stationInfo.serial_number;
            
            if (!serialNumber) {
                return {
                    success: false,
                    message: "Trạm chưa có serial number. Vui lòng chọn trạm khác."
                };
            }

            // Gọi API mới với định dạng ngày yyyy-mm-dd
            const result = await fetchIoTData(serialNumber, {
                startDate: startDate, // startDate đã được format từ modal
                endDate: endDate,     // endDate đã được format từ modal
                limit: 1000          // Lấy nhiều dữ liệu hơn
            });
            
            // Kiểm tra xem có dữ liệu thành công hay không
            if (result.success && result.data && result.data.length > 0) {
                const formattedData = formatIoTDataForDisplay(result, stationInfo);
                if (formattedData) {
                    setIotData(formattedData);
                    // Trả về success để modal biết có thể đóng
                    return {
                        success: true,
                        message: `Đã lấy thành công ${formattedData.summary.totalRecords} bản ghi từ trạm ${formattedData.stationName}. Dữ liệu sẽ hiển thị trong panel MapDetails.`
                    };
                }
            }
            
            // Không có dữ liệu
            return {
                success: false,
                message: result.message || "Không có dữ liệu trong khoảng thời gian đã chọn"
            };
        } catch (error) {
            console.error("Error handling IoT data:", error);
            return {
                success: false,
                message: "Có lỗi xảy ra khi lấy dữ liệu. Vui lòng thử lại."
            };
        }
    };

    useEffect(() => {
        if (searchResults && searchResults.length > 0) {
            setState((prevState) => ({
                ...prevState,
                isLoadingSearchResults: false,
            }));
            setActiveTab("search");
        } else {
            setState((prevState) => ({
                ...prevState,
                isLoadingSearchResults: false,
            }));
        }
    }, [searchResults, setActiveTab]);

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

        if (layer === "DiaPhanHuyen" && checked) {
            try {
                const res = await fetch(`${import.meta.env.VITE_BASE_URL}/districts`);
                const data = await res.json();

                setDistrictList(data);
            } catch (error) {
                console.error("Lỗi khi lấy danh sách huyện:", error);
            }
        }

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
            const startDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0];

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
            popupHtml: '<div class="popup-loading"><i class="fa-solid fa-spinner fa-spin"></i><p>Đang tải dữ liệu...</p></div>',
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
            popupHtml: '<div class="popup-loading"><i class="fa-solid fa-spinner fa-spin"></i><p>Đang tải dữ liệu...</p></div>',
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
                    name: result.name || result.tenhuyen || result.tenxa || result.TenHuyen || result.TenXa || "Điểm",
                });
            } else if (geojson.type === "Polygon" || geojson.type === "MultiPolygon") {
                const bounds = getBoundsFromCoordinates(geojson.coordinates);
                setSelectedLocation({ bounds });
                setHighlightedFeature({
                    type: "Feature",
                    geometry: geojson,
                    id: result.id || result.mahuyen || result.maxa || result.MaHuyen || result.MaXa,
                    name: result.name || result.tenhuyen || result.tenxa || result.TenHuyen || result.TenXa || "Vùng",
                });
            }
        } catch (err) {
            console.error("❌ Lỗi xử lý GeoJSON hoặc tọa độ:", err);
        }
    };

    const renderTabContent = useMemo(() => {
        if (activeTab === "Data") {
            return (
                <div className="tab-content-data">
                    {/* Monitoring Data Section */}
                    <div className="data-section">
                        <div className="section-header">
                            <i className="fa-solid fa-chart-line section-icon"></i>
                            <h3 className="section-title">Dữ liệu chuyên đề</h3>
                        </div>
                        <div className="monitoring-layers">
                            {/* Salinity Monitoring Dropdown */}
                            <div className="category-item">
                                <div
                                    className={`category-header ${state.openSalinityDropdown ? "active" : ""}`}
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
                                            {/* Station Status Info */}
                                            <div className="iot-status-bar">
                                                <div className="status-item">
                                                    <span className="status-dot active"></span>
                                                    <span className="status-text">
                                                        {iotStationStats.active}/{iotStationStats.total} trạm
                                                        hoạt động
                                                    </span>
                                                </div>
                                                {iotStationStats.lastSync && (
                                                    <div className="status-item">
                                                        <i className="fa-solid fa-clock"></i>
                                                        <span className="status-text">
                                                            Sync:{" "}
                                                            {new Date(
                                                                iotStationStats.lastSync,
                                                            ).toLocaleTimeString("vi-VN", {
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                            })}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

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

                            {/* Irrigation Works (Công trình thủy lợi) */}
                            <div className="category-item">
                                <div
                                    className={`category-header ${state.openIrrigationDropdown ? "active" : ""}`}
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
                                                        className={`subcategory-header ${isOpen ? "active" : ""}`}
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

                            {/* Hydromet Stations */}
                            <div className="layer-item monitoring-layer">
                                <div className="layer-toggle">
                                    <input
                                        type="checkbox"
                                        id="layer-hydromet-stations"
                                        className="layer-checkbox"
                                        checked={state.enabledLayers.includes("hydrometStations")}
                                        onChange={(e) => handleHydrometStationsToggle(e.target.checked)}
                                    />
                                    <label htmlFor="layer-hydromet-stations" className="layer-label">
                                        <div className="layer-info">
                                            <div className="layer-details">
                                                <span className="layer-name">Trạm khí tượng thủy văn</span>
                                            </div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* GIS Data Section */}
                    <div className="data-section">
                        <div className="section-header">
                            <i className="fa-solid fa-layer-group section-icon"></i>
                            <h3 className="section-title">{mapLayers.title}</h3>
                        </div>
                        <div className="gis-categories">
                            {mapLayers.items.map((menu, index) => {
                                const uniqueIndex = index;
                                const isOpen = state.openMenuIndex === uniqueIndex;
                                const isSingleLayer = menu.layer && !menu.layers;

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
                                                    className={`category-header ${isOpen ? "active" : ""}`}
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
                        </div>
                    </div>

                    {/* District Selection */}
                    {state.enabledLayers.includes("DiaPhanHuyen") && districtList.length > 0 && (
                        <div className="data-section">
                            <div className="section-header">
                                <i className="fa-solid fa-map-location-dot section-icon"></i>
                                <h3 className="section-title">Lọc theo huyện</h3>
                            </div>
                            <div className="district-selector">
                                <select
                                    className="district-select"
                                    value={selectedDistrict || ""}
                                    onChange={(e) => {
                                        const district = districtList.find((d) => d.name === e.target.value);
                                        setSelectedDistrict(e.target.value);
                                        if (district) {
                                            setSelectedLocation({
                                                lat: district.centerLat,
                                                lng: district.centerLng,
                                                zoom: 12,
                                            });
                                        }
                                    }}
                                >
                                    <option value="">-- Chọn huyện --</option>
                                    {districtList.map((d, idx) => (
                                        <option key={idx} value={d.name}>
                                            {d.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        if (activeTab === "search") {
            return (
                <div className="tab-content-search">
                    {state.isLoadingSearchResults ? (
                        <div className="search-state">
                            <div className="loading-spinner">
                                <i className="fa-solid fa-spinner fa-spin"></i>
                            </div>
                            <p className="state-message">Đang tải dữ liệu...</p>
                        </div>
                    ) : Array.isArray(searchResults) && searchResults.length === 0 ? (
                        <div className="search-state">
                            <div className="empty-icon">
                                <i className="fa-solid fa-magnifying-glass"></i>
                            </div>
                            <p className="state-message">Không tìm thấy kết quả.</p>
                        </div>
                    ) : Array.isArray(searchResults) ? (
                        <div className="search-results">
                            {searchResults.map((result, idx) => (
                                <div
                                    key={result.KiHieu || result.MaHuyen || result.MaXa || `search-result-${idx}`}
                                    className={`result-card ${
                                        highlightedFeature?.id === (result.KiHieu || result.MaHuyen || result.MaXa) ? "selected" : ""
                                    }`}
                                    onClick={() => handleClick(result)}
                                >
                                    {result.type === "diem_do_man" ? (
                                        <div className="result-content salinity-result">
                                            <div className="result-header">
                                                <div className="result-icon">
                                                    <i className="fa-solid fa-droplet"></i>
                                                </div>
                                                <div className="result-title">
                                                    <h4 className="result-name">{result.TenDiem}</h4>
                                                    <span className="result-type">Điểm đo mặn</span>
                                                </div>
                                            </div>
                                            <div className="result-details">
                                                <div className="detail-item">
                                                    <span className="detail-label">Phân loại:</span>
                                                    <span className="detail-value">{result.PhanLoai}</span>
                                                </div>
                                                <div className="detail-item">
                                                    <span className="detail-label">Tọa độ:</span>
                                                    <span className="detail-value">
                                                        {result.ViDo}, {result.KinhDo}
                                                    </span>
                                                </div>
                                                <div className="detail-item">
                                                    <span className="detail-label">Thời gian:</span>
                                                    <span className="detail-value">{result.ThoiGian}</span>
                                                </div>
                                                <div className="detail-item">
                                                    <span className="detail-label">Tần suất:</span>
                                                    <span className="detail-value">{result.TanSuat}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : result.type === "khi_tuong_thuy_van" ? (
                                        <div className="result-content weather-result">
                                            <div className="result-header">
                                                <div className="result-icon">
                                                    <i className="fa-solid fa-cloud-rain"></i>
                                                </div>
                                                <div className="result-title">
                                                    <h4 className="result-name">{result.TenTram}</h4>
                                                    <span className="result-type">Trạm khí tượng thủy văn</span>
                                                </div>
                                            </div>
                                            <div className="result-details">
                                                <div className="detail-item">
                                                    <span className="detail-label">Ký hiệu:</span>
                                                    <span className="detail-value">{result.KiHieu}</span>
                                                </div>
                                                <div className="detail-item">
                                                    <span className="detail-label">Loại trạm:</span>
                                                    <span className="detail-value">{result.LoaiTram}</span>
                                                </div>
                                                <div className="detail-item">
                                                    <span className="detail-label">Tọa độ:</span>
                                                    <span className="detail-value">
                                                        {result.ViDo}, {result.KinhDo}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : result.tenxa ? (
                                        <div className="result-content ward-result">
                                            <div className="result-header">
                                                <div className="result-icon">
                                                    <i className="fa-solid fa-building"></i>
                                                </div>
                                                <div className="result-title">
                                                    <h4 className="result-name">{result.tenxa}</h4>
                                                    <span className="result-type">{result.tenhuyen}</span>
                                                </div>
                                            </div>
                                            <div className="result-details">
                                                <div className="detail-item">
                                                    <span className="detail-label">Mã xã:</span>
                                                    <span className="detail-value">{result.maxa}</span>
                                                </div>
                                                <div className="detail-item">
                                                    <span className="detail-label">Diện tích:</span>
                                                    <span className="detail-value">
                                                        {result.dientichtunhien.toFixed(2)} ha
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        ) : result.type === "iot_station" ? (
                                            <div className="result-content iot-result">
                                                <div className="result-header">
                                                    <div className="result-icon">
                                                        <i className="fa-solid fa-tower-broadcast"></i>
                                                    </div>
                                                    <div className="result-title">
                                                        <h4 className="result-name">{result.StationName}</h4>
                                                        <span className="result-type">Trạm IoT</span>
                                                    </div>
                                                </div>
                                                <div className="result-details">
                                                    <div className="detail-item">
                                                        <span className="detail-label">Mã serial:</span>
                                                        <span className="detail-value">{result.SerialNumber}</span>
                                                    </div>
                                                    <div className="detail-item">
                                                        <span className="detail-label">Mã trạm:</span>
                                                        <span className="detail-value">{result.StationCode}</span>
                                                    </div>
                                                </div>
                                            </div>
                                    ) : (
                                        <div className="result-content district-result">
                                            <div className="result-header">
                                                <div className="result-icon">
                                                    <i className="fa-solid fa-city"></i>
                                                </div>
                                                <div className="result-title">
                                                    <h4 className="result-name">{result.tenhuyen}</h4>
                                                    <span className="result-type">Huyện</span>
                                                </div>
                                            </div>
                                            <div className="result-details">
                                                <div className="detail-item">
                                                    <span className="detail-label">Mã huyện:</span>
                                                    <span className="detail-value">{result.mahuyen}</span>
                                                </div>
                                                <div className="detail-item">
                                                    <span className="detail-label">Diện tích:</span>
                                                    <span className="detail-value">
                                                        {result.dientichtunhien.toFixed(2)} ha
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="search-state">
                            <div className="error-icon">
                                <i className="fa-solid fa-exclamation-triangle"></i>
                            </div>
                            <p className="state-message">Dữ liệu không hợp lệ.</p>
                        </div>
                    )}
                </div>
            );
        }
    }, [
        activeTab,
        state.openMenuIndex,
        state.enabledLayers,
        state.openSalinityDropdown,
        state.openIrrigationDropdown,
        state.openIrrigationSubIndex,
        searchResults,
        state.isLoadingSearchResults,
        districtList,
        selectedDistrict,
        highlightedFeature,
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
                    <NavLink to={ROUTES.home}>
                        <div className="logo-container">
                            <img src={imageLogo} alt="logo" className="w-100" />
                        </div>
                    </NavLink>
                    <div className="lineLeftMenu"></div>
                </div>

                <div className="d-flex border-bottom text-center">
                    <button
                        onClick={() => setActiveTab("Data")}
                        className={`flex-fill py-2 fw-semibold text-uppercase text-sm border-0 bg-transparent ${
                            activeTab === "Data"
                                ? "text-dark border-bottom border-2 border-warning"
                                : "text-secondary"
                        }`}
                    >
                        LỚP DỮ LIỆU
                    </button>
                    <button
                        onClick={() => setActiveTab("search")}
                        className={`flex-fill py-2 fw-semibold text-uppercase text-sm border-0 bg-transparent ${
                            activeTab === "search"
                                ? "text-dark border-bottom border-2 border-warning"
                                : "text-secondary"
                        }`}
                    >
                        TÌM KIẾM
                    </button>
                </div>

                {/* Tab Content */}
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
