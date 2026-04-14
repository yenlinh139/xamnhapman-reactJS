import React, { useEffect, useState, useRef, useCallback } from "react";
import MapboxMap from "@pages/map/MapboxMap";
import LeftMenuMap from "@components/LeftMenuMap";

import { Helmet } from "react-helmet-async";
import axiosInstance from "@config/axios-config";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "@stores/actions/authActions";
import { NavLink } from "react-router-dom";
import { ROUTES } from "@common/constants";
import "@styles/components/AreaStationsPanel.scss";

const Map = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [selectedLayers, setSelectedLayers] = useState([]);
    const [selectedBaseMap, setSelectedBaseMap] = useState("Google Streets");
    const [searchResults, setSearchResults] = useState([]);
    const { userInfo } = useSelector((state) => state.authStore);
    const dispatch = useDispatch();
    const [searchText, setSearchText] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [highlightedFeature, setHighlightedFeature] = useState(null);
    const [iotData, setIotData] = useState(null);
    const [leafletMapInstance, setLeafletMapInstance] = useState(null);
    const mapInstanceRef = useRef(null);
    const searchContainerRef = useRef(null);
    const hasAccess = userInfo && userInfo.role == 1;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!searchContainerRef.current?.contains(event.target)) {
                setShowSearchDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleMapReady = useCallback((instance) => {
        setLeafletMapInstance(instance);
    }, []);

    const handleAreaSelect = (areaInfo) => {
        console.log("Map.jsx - Selected area:", areaInfo);
        console.log("Map.jsx - mapInstanceRef current:", mapInstanceRef.current);
        console.log("Map.jsx - mapInstance from ref:", mapInstanceRef.current?.getMap());
        // Additional handling if needed
        if (areaInfo.area && areaInfo.type) {
            // You can add custom handling here, like showing info popup
            console.log(
                `Đã chọn ${areaInfo.type}: ${areaInfo.area.name || areaInfo.area.TenTram || areaInfo.area.TenTam}`,
            );
        }
    };

    const handleLogout = async () => {
        await dispatch(logout());
    };

    const handleSearch = async () => {
        if (!searchText.trim()) {
            setSearchResults([]);
            setShowSearchDropdown(false);
            return;
        }
        setShowSearchDropdown(true);
        setIsSearching(true);
        setSearchResults([]);
        try {
            const response = await axiosInstance.get(`/search/${encodeURIComponent(searchText)}`);

            // Backend trả về mảng kết quả trực tiếp hoặc object chứa results
            const searchData = Array.isArray(response.data) ? response.data : response.data.results || [];
            setSearchResults(searchData);

            // Log để debug nội dung API sau khi tìm kiếm
            console.group(`🔍 Search API - ${searchText}`);
            console.log("Request URL:", `/search/${encodeURIComponent(searchText)}`);
            console.log("Raw response.data:", response.data);
            console.log("Parsed searchData:", searchData);
            console.log("Total results:", searchData.length);
            console.log("Result types:", [...new Set(searchData.map((item) => item?.type).filter(Boolean))]);
            console.table(
                searchData.map((item, index) => ({
                    index: index + 1,
                    type: item?.type,
                    name:
                        item?.TenDiem ||
                        item?.TenTram ||
                        item?.StationName ||
                        item?.tenxa ||
                        item?.tenhuyen ||
                        null,
                    code:
                        item?.KiHieu ||
                        item?.SerialNumber ||
                        item?.StationCode ||
                        item?.maxa ||
                        item?.mahuyen ||
                        null,
                    latitude: item?.ViDo || null,
                    longitude: item?.KinhDo || null,
                })),
            );
            console.groupEnd();
        } catch (err) {
            console.error("Lỗi tìm kiếm:", err);
            setSearchResults([]);

            // Có thể thêm toast notification ở đây nếu cần
            if (err.response?.status === 400) {
                console.warn("Từ khóa tìm kiếm không hợp lệ");
            } else if (err.response?.status === 500) {
                console.error("Lỗi server khi tìm kiếm");
            }
        } finally {
            setIsSearching(false);
            setShowSearchDropdown(true);
        }
    };

    const handleSearchResultSelect = (result) => {
        window.dispatchEvent(new CustomEvent("map-search-result-select", { detail: result }));
        setShowSearchDropdown(false);
    };

    const getSearchItemMeta = (result) => {
        if (result?.type === "diem_do_man") {
            return {
                icon: "fa-solid fa-droplet",
                title: result.TenDiem,
                subtitle: "Điểm đo mặn",
            };
        }

        if (result?.type === "khi_tuong_thuy_van") {
            return {
                icon: "fa-solid fa-cloud-rain",
                title: result.TenTram,
                subtitle: "Trạm khí tượng thủy văn",
            };
        }

        if (result?.type === "iot_station") {
            return {
                icon: "fa-solid fa-tower-broadcast",
                title: result.StationName,
                subtitle: "Trạm IoT",
            };
        }

        if (result?.tenxa) {
            return {
                icon: "fa-solid fa-draw-polygon",
                title: result.tenxa,
                subtitle: result.tenhuyen || "Phường/Xã",
            };
        }

        return {
            icon: "fa-solid fa-location-dot",
            title: result?.tenhuyen || result?.name || "Khu vực",
            subtitle: "Địa giới hành chính",
        };
    };

    const onSidebarToggle = () => {
        // Toggle sidebar state
        setSidebarOpen(!sidebarOpen);

        // Ensure the map is invalidated and redrawn after sidebar animation completes
        setTimeout(() => {
            // Force map container resize event
            window.dispatchEvent(new Event("resize"));
        }, 350); // Slightly longer than transition time to ensure animation completes
    };

    const handleLayerToggle = (layerName, checked) => {
        setSelectedLayers((prevLayers) =>
            checked ? [...prevLayers, layerName] : prevLayers.filter((l) => l !== layerName),
        );
    };
    return (
        <div className="map-page-container">
            <Helmet>
                <title>Bản đồ | Xâm nhập mặn Tp. Hồ Chí Minh</title>
            </Helmet>{" "}
            {/* Modern Header */}
            <header className="modern-header" id="headerMap">
                <div className="header-container">
                    {/* Left Section */}
                    <div className="header-left">
                        <button className="sidebar-toggle" onClick={onSidebarToggle}>
                            <i className="fa-solid fa-bars"></i>
                        </button>
                    </div>

                    {/* Center Section - Search */}
                    <div className="header-center">
                        <div className="search-container" ref={searchContainerRef}>
                            <div className="search-input-wrapper">
                                <i className="fa-solid fa-magnifying-glass search-icon"></i>
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Tìm kiếm địa điểm, trạm quan trắc..."
                                    value={searchText}
                                    onFocus={() => {
                                        if (searchText.trim()) {
                                            setShowSearchDropdown(true);
                                        }
                                    }}
                                    onChange={(e) => {
                                        const nextValue = e.target.value;
                                        setSearchText(nextValue);

                                        if (!nextValue.trim()) {
                                            setSearchResults([]);
                                            setShowSearchDropdown(false);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleSearch();
                                        }
                                    }}
                                />
                                <button className="search-button" onClick={handleSearch}>
                                    <span>Tìm kiếm</span>
                                </button>
                            </div>

                            {showSearchDropdown && searchText.trim() && (
                                <div className="search-dropdown">
                                    {isSearching ? (
                                        <div className="search-dropdown-empty">
                                            <i className="fa-solid fa-spinner fa-spin"></i>
                                            <span>Đang tìm kiếm...</span>
                                        </div>
                                    ) : searchResults.length === 0 ? (
                                        <div className="search-dropdown-empty">
                                            <i className="fa-solid fa-magnifying-glass"></i>
                                            <span>Không tìm thấy kết quả phù hợp</span>
                                        </div>
                                    ) : (
                                        <div className="search-dropdown-list">
                                            {searchResults.slice(0, 10).map((result, index) => {
                                                const itemMeta = getSearchItemMeta(result);
                                                const key =
                                                    result.KiHieu ||
                                                    result.MaHuyen ||
                                                    result.MaXa ||
                                                    result.SerialNumber ||
                                                    result.StationCode ||
                                                    `search-item-${index}`;

                                                return (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        className="search-dropdown-item"
                                                        onClick={() => handleSearchResultSelect(result)}
                                                    >
                                                        <span className="item-icon">
                                                            <i className={itemMeta.icon}></i>
                                                        </span>
                                                        <span className="item-text">
                                                            <span className="item-title">
                                                                {itemMeta.title}
                                                            </span>
                                                            <span className="item-subtitle">
                                                                {itemMeta.subtitle}
                                                            </span>
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Section - Navigation */}
                    <div className="header-right">
                        <nav className="header-nav">
                            <a
                                href={ROUTES.home}
                                className="nav-link"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <span>Trang chủ</span>
                            </a>

                            <NavLink
                                to={ROUTES.map}
                                className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
                            >
                                <span>Bản đồ</span>
                            </NavLink>

                            <NavLink
                                to={ROUTES.salinityReport}
                                className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
                            >
                                <span>Báo cáo độ mặn</span>
                            </NavLink>
                            {hasAccess && (
                                <NavLink
                                    to={ROUTES.salinity}
                                    className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
                                >
                                    <span>Quản lý độ mặn</span>
                                </NavLink>
                            )}
                            {hasAccess && (
                                <NavLink
                                    to={ROUTES.users}
                                    className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
                                >
                                    <span>Quản lý người dùng</span>
                                </NavLink>
                            )}
                            {/* User Dropdown */}
                            {userInfo?.name ? (
                                <div className="user-dropdown">
                                    <button
                                        className="user-button"
                                        data-bs-toggle="dropdown"
                                        aria-expanded="false"
                                    >
                                        <div className="user-info">
                                            <span className="user-name">{userInfo?.name}</span>
                                        </div>
                                        <i className="fa-solid fa-chevron-down dropdown-arrow"></i>
                                    </button>

                                    <ul className="dropdown-menu">
                                        <li>
                                            <NavLink to={ROUTES.setting} className="dropdown-item">
                                                <span>Cài đặt</span>
                                            </NavLink>
                                        </li>
                                        <li>
                                            <hr className="dropdown-divider" />
                                        </li>
                                        <li>
                                            <button className="dropdown-item" onClick={handleLogout}>
                                                <span>Đăng xuất</span>
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                            ) : (
                                <NavLink
                                    to={ROUTES.login}
                                    className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
                                >
                                    <span>Đăng nhập</span>
                                </NavLink>
                            )}
                        </nav>

                        {/* Mobile Menu Toggle */}
                        <button
                            className="mobile-toggle"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#mobileNav"
                            aria-controls="mobileNav"
                            aria-expanded="false"
                        >
                            <i className="fa-solid fa-ellipsis-vertical"></i>
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                <div className="collapse" id="mobileNav">
                    <div className="mobile-nav">
                        <div className="mobile-search">
                            <div className="search-input-wrapper">
                                <i className="fa-solid fa-magnifying-glass search-icon"></i>
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Tìm kiếm..."
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleSearch();
                                        }
                                    }}
                                />
                                <button className="search-button" onClick={handleSearch}>
                                    <i className="fa-solid fa-magnifying-glass"></i>
                                </button>
                            </div>
                        </div>

                        <div className="mobile-links">
                            <NavLink to={ROUTES.home} className="mobile-link">
                                <i className="fa-solid fa-house"></i>
                                <span>Trang chủ</span>
                            </NavLink>
                            <NavLink
                                to={ROUTES.map}
                                className={({ isActive }) =>
                                    isActive ? "mobile-link active" : "mobile-link"
                                }
                            >
                                <i className="fa-solid fa-map-location-dot"></i>
                                <span>Bản đồ</span>
                            </NavLink>
                            <NavLink
                                to={ROUTES.salinityReport}
                                className={({ isActive }) =>
                                    isActive ? "mobile-link active" : "mobile-link"
                                }
                            >
                                <i className="fa-solid fa-chart-column"></i>
                                <span>Báo cáo độ mặn</span>
                            </NavLink>
                            {userInfo?.name ? (
                                <>
                                    <NavLink to={ROUTES.setting} className="mobile-link">
                                        <i className="fa-solid fa-gear"></i>
                                        <span>Cài đặt</span>
                                    </NavLink>
                                    <button className="mobile-link logout-link" onClick={handleLogout}>
                                        <i className="fa-solid fa-right-from-bracket"></i>
                                        <span>Đăng xuất</span>
                                    </button>
                                </>
                            ) : (
                                <NavLink to={ROUTES.login} className="mobile-link">
                                    <i className="fa-solid fa-right-to-bracket"></i>
                                    <span>Đăng nhập</span>
                                </NavLink>
                            )}
                        </div>
                    </div>
                </div>
            </header>
            {/* Main Content Area */}
            <div className="map-content">
                <LeftMenuMap
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                    onLayerToggle={handleLayerToggle}
                    onBaseMapChange={setSelectedBaseMap}
                    selectedBaseMap={selectedBaseMap}
                    setSelectedLocation={setSelectedLocation}
                    setHighlightedFeature={setHighlightedFeature}
                    setIotData={setIotData}
                />
                <div className="mapbox-container">
                    <MapboxMap
                        ref={mapInstanceRef}
                        onMapReady={handleMapReady}
                        selectedLayers={selectedLayers}
                        selectedBaseMap={selectedBaseMap}
                        selectedLocation={selectedLocation}
                        highlightedFeature={highlightedFeature}
                        setHighlightedFeature={setHighlightedFeature}
                        iotData={iotData}
                    />
                </div>
            </div>
        </div>
    );
};

export default Map;
