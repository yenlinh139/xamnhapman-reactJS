import React, { useEffect, useState, useRef, useCallback } from "react";
import MapboxMap from "@pages/map/MapboxMap";
import LeftMenuMap from "@components/LeftMenuMap";
import AreaSelector from "@components/map/AreaSelector";
import { Helmet } from "react-helmet-async";
import axiosInstance from "@config/axios-config";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "@stores/actions/authActions";
import { NavLink, useNavigate } from "react-router-dom";
import { ROUTES } from "@common/constants";
import "@styles/components/AreaStationsPanel.scss";

const Map = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [selectedLayers, setSelectedLayers] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const { userInfo } = useSelector((state) => state.authStore);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [searchText, setSearchText] = useState("");
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [highlightedFeature, setHighlightedFeature] = useState(null);
    const [iotData, setIotData] = useState(null);
    const [activeTab, setActiveTab] = useState("Data"); // Thêm state quản lý tab
    const [leafletMapInstance, setLeafletMapInstance] = useState(null);
    const mapInstanceRef = useRef(null);

    const handleMapReady = useCallback((instance) => {
        setLeafletMapInstance(instance);
    }, []);

    const handleAreaSelect = (areaInfo) => {
        console.log('Map.jsx - Selected area:', areaInfo);
        console.log('Map.jsx - mapInstanceRef current:', mapInstanceRef.current);
        console.log('Map.jsx - mapInstance from ref:', mapInstanceRef.current?.getMap());
        // Additional handling if needed
        if (areaInfo.area && areaInfo.type) {
            // You can add custom handling here, like showing info popup
            console.log(`Đã chọn ${areaInfo.type}: ${areaInfo.area.name || areaInfo.area.TenTram || areaInfo.area.TenTam}`);
        }
    };

    const handleLogout = () => {
        dispatch(logout());
        navigate(ROUTES.home);
    };

    const handleSearch = async () => {
        if (!searchText) return;
        setSearchResults([]);
        try {
            const response = await axiosInstance.get(
                `${import.meta.env.VITE_BASE_URL}/search/${encodeURIComponent(searchText)}`,
            );

            // Backend trả về mảng kết quả trực tiếp hoặc object chứa results
            const searchData = Array.isArray(response.data) ? response.data : (response.data.results || []);
            setSearchResults(searchData);

            // Log để debug
            console.log(`🔍 Tìm kiếm "${searchText}":`, searchData.length, 'kết quả');
            
        } catch (err) {
            console.error("Lỗi tìm kiếm:", err);
            setSearchResults([]);
            
            // Có thể thêm toast notification ở đây nếu cần
            if (err.response?.status === 400) {
                console.warn("Từ khóa tìm kiếm không hợp lệ");
            } else if (err.response?.status === 500) {
                console.error("Lỗi server khi tìm kiếm");
            }
        }
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
                        <div className="search-container">
                            <div className="search-input-wrapper">
                                <i className="fa-solid fa-magnifying-glass search-icon"></i>
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Tìm kiếm địa điểm, trạm quan trắc..."
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
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
                                <i className="fa-solid fa-house"></i>
                                <span>Trang chủ</span>
                            </a>

                            <NavLink
                                to={ROUTES.map}
                                className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
                            >
                                <i className="fa-solid fa-map-location-dot"></i>
                                <span>Bản đồ</span>
                            </NavLink>

                            {/* User Dropdown */}
                            {userInfo?.name ? 
                            <div className="user-dropdown">
                                <button
                                    className="user-button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                >
                                    <div className="user-avatar">
                                        <i className="fa-solid fa-user"></i>
                                    </div>
                                    <div className="user-info">
                                        <span className="user-name">{userInfo?.name}</span>
                                    </div>
                                    <i className="fa-solid fa-chevron-down dropdown-arrow"></i>
                                </button>

                                <ul className="dropdown-menu">
                                    <li>
                                        <NavLink to={ROUTES.setting} className="dropdown-item">
                                            <i className="fa-solid fa-gear"></i>
                                            <span>Cài đặt</span>
                                        </NavLink>
                                    </li>
                                    <li>
                                        <hr className="dropdown-divider" />
                                    </li>
                                    <li>
                                        <button className="dropdown-item" onClick={handleLogout}>
                                            <i className="fa-solid fa-right-from-bracket"></i>
                                            <span>Đăng xuất</span>
                                        </button>
                                    </li>
                                </ul>
                                </div>
                                : null
                            }
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
                            <NavLink to={ROUTES.setting} className="mobile-link">
                                <i className="fa-solid fa-gear"></i>
                                <span>Cài đặt</span>
                            </NavLink>
                            <button className="mobile-link logout-link" onClick={handleLogout}>
                                <i className="fa-solid fa-right-from-bracket"></i>
                                <span>Đăng xuất</span>
                            </button>
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
                    searchResults={searchResults}
                    setSelectedLocation={setSelectedLocation}
                    setHighlightedFeature={setHighlightedFeature}
                    highlightedFeature={highlightedFeature}
                    setIotData={setIotData}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />
                <div className="mapbox-container">
                    <MapboxMap
                        ref={mapInstanceRef}
                        onMapReady={handleMapReady}
                        selectedLayers={selectedLayers}
                        selectedLocation={selectedLocation}
                        highlightedFeature={highlightedFeature}
                        setHighlightedFeature={setHighlightedFeature}
                        iotData={iotData}
                    />
                    <AreaSelector 
                        mapInstance={leafletMapInstance}
                        onAreaSelect={handleAreaSelect}
                        className="map-area-selector"
                    />
                </div>
            </div>
        </div>
    );
};

export default Map;
