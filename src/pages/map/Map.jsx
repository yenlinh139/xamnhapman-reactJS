import React, { useEffect, useState, useRef, useCallback } from "react";
import MapboxMap from "@pages/map/MapboxMap";
import LeftMenuMap from "@components/LeftMenuMap";

import { Helmet } from "react-helmet-async";
import axiosInstance from "@config/axios-config";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "@stores/actions/authActions";
import { NavLink } from "react-router-dom";
import { ROUTES } from "@common/constants";
import SettingUser from "@pages/setting/SettingUser";
import "@styles/components/AreaStationsPanel.scss";

const SEARCH_TYPE_META = {
    iot_station: {
        priority: 1,
        icon: "fa-solid fa-tower-broadcast",
        subtitle: "Trạm IoT",
        apiRef: "/iot/stations",
        titleResolver: (result) => result?.StationName || result?.name,
    },
    diem_do_man: {
        priority: 2,
        icon: "fa-solid fa-droplet",
        subtitle: "Điểm đo mặn",
        apiRef: "/salinity-points",
        titleResolver: (result) => result?.TenDiem || result?.name,
    },
    khi_tuong_thuy_van: {
        priority: 3,
        icon: "fa-solid fa-cloud-rain",
        subtitle: "Trạm khí tượng thủy văn",
        apiRef: "/hydrometeorology-stations",
        titleResolver: (result) => result?.TenTram || result?.name,
    },
    ho_chua: {
        priority: 4,
        icon: "fa-solid fa-water",
        subtitle: "Hồ chứa thượng lưu",
        apiRef: "/reservoir-points",
        titleResolver: (result) => result?.TenHo || result?.name,
    },
    cttl_cong: {
        priority: 5,
        icon: "fa-solid fa-bridge-water",
        subtitle: "CTTL 2023 - Cống",
        titleResolver: (result) => result?.TenCongDap || result?.name,
    },
    cttl_tram_bom: {
        priority: 5,
        icon: "fa-solid fa-faucet-drip",
        subtitle: "CTTL 2023 - Trạm bơm",
        titleResolver: (result) => result?.TenTramBom || result?.name,
    },
    cttl_de_bao: {
        priority: 5,
        icon: "fa-solid fa-road-barrier",
        subtitle: "CTTL 2023 - Đê bao, bờ bao",
        titleResolver: (result) => result?.TenDeBao || result?.name,
    },
    cttl_kenh_muong: {
        priority: 5,
        icon: "fa-solid fa-water",
        subtitle: "CTTL 2023 - Kênh mương",
        titleResolver: (result) => result?.TenKenhMuong || result?.name,
    },
    cttl_2030_noi_dong: {
        priority: 5,
        icon: "fa-solid fa-draw-polygon",
        subtitle: "CTTL 2030 - Nội đồng",
        titleResolver: (result) => result?.Ten || result?.name,
    },
    cttl_2030_nong_thon_moi: {
        priority: 5,
        icon: "fa-solid fa-seedling",
        subtitle: "CTTL 2030 - Nông thôn mới",
        titleResolver: (result) => result?.Ten || result?.name,
    },
    cttl_2030_vung_thuy_loi: {
        priority: 5,
        icon: "fa-solid fa-layer-group",
        subtitle: "CTTL 2030 - Vùng thủy lợi",
        titleResolver: (result) => result?.VungThuyLoi || result?.name,
    },
    cttl_2030_vung_he_thong: {
        priority: 5,
        icon: "fa-solid fa-network-wired",
        subtitle: "CTTL 2030 - Vùng, hệ thống",
        titleResolver: (result) => result?.Ten || result?.name,
    },
    xa: {
        priority: 6,
        icon: "fa-solid fa-draw-polygon",
        subtitle: "Địa giới hành chính - Xã",
        titleResolver: (result) => result?.tenXa || result?.TenXa || result?.name,
    },
    huyen: {
        priority: 7,
        icon: "fa-solid fa-map-location-dot",
        subtitle: "Địa giới hành chính - Huyện",
        titleResolver: (result) => result?.tenHuyen || result?.TenHuyen || result?.name,
    },
    giao_thong_line: {
        priority: 8,
        icon: "fa-solid fa-road",
        subtitle: "Giao thông - Đường bộ",
        titleResolver: (result) => result?.TenDuong || result?.name,
    },
    giao_thong_polygon: {
        priority: 9,
        icon: "fa-solid fa-road",
        subtitle: "Giao thông - Cầu, đường sắt",
        titleResolver: (result) => result?.Ten || result?.name,
    },
    thuy_he_line: {
        priority: 10,
        icon: "fa-solid fa-water",
        subtitle: "Thủy hệ - Đường sông",
        titleResolver: (result) => result?.TenSong || result?.name,
    },
    thuy_he_polygon: {
        priority: 11,
        icon: "fa-solid fa-water",
        subtitle: "Thủy hệ - Vùng nước",
        titleResolver: (result) => result?.Ten || result?.name,
    }
};

const normalizeSearchResult = (result = {}) => {
    const type = String(result?.type || "").toLowerCase();
    const typeMeta = SEARCH_TYPE_META[type] || null;
    const searchSubtitle =
        type === "khi_tuong_thuy_van"
            ? result?.PhanLoai || result?.phanLoai || typeMeta?.subtitle || "Trạm khí tượng thủy văn"
            : typeMeta?.subtitle || "Đối tượng bản đồ";

    const title =
        typeMeta?.titleResolver?.(result) ||
        result?.name ||
        result?.StationName ||
        result?.TenDiem ||
        result?.TenTram ||
        result?.TenHo ||
        result?.tenXa ||
        result?.tenHuyen ||
        "Khu vực";

    const apiRef = result?.apiRef || typeMeta?.apiRef || null;
    const scopeText = result?.tenHuyen || result?.TenHuyen || result?.VungThuyLoi || "";

    return {
        ...result,
        _searchType: type,
        _searchPriority: Number(typeMeta?.priority ?? result?.priority ?? 99),
        _searchIcon: typeMeta?.icon || "fa-solid fa-location-dot",
        _searchTitle: title,
        _searchSubtitle: searchSubtitle,
        _searchMeta: [scopeText, apiRef].filter(Boolean).join(" • "),
    };
};

const compareSearchResults = (a, b) => {
    const priorityDelta = (a?._searchPriority ?? 99) - (b?._searchPriority ?? 99);
    if (priorityDelta !== 0) return priorityDelta;

    return String(a?._searchTitle || "").localeCompare(String(b?._searchTitle || ""), "vi", {
        sensitivity: "base",
    });
};

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
    const [isSettingModalOpen, setIsSettingModalOpen] = useState(false);
    const [leafletMapInstance, setLeafletMapInstance] = useState(null);
    const mapInstanceRef = useRef(null);
    const searchContainerRef = useRef(null);
    const mobileNavRef = useRef(null);
    const mobileToggleRef = useRef(null);
    const isLoggedIn = Boolean(localStorage.getItem("access_token"));
    const parsedRole = Number(userInfo?.role);
    const roleId = Number.isFinite(parsedRole) ? parsedRole : 0;
    const isAdmin = roleId === 0;
    const isTechnician = roleId === 1;
    const isGuest = roleId === 2;
    const canManageData = isTechnician || isAdmin;
    const canManageUsers = isAdmin;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!searchContainerRef.current?.contains(event.target)) {
                setShowSearchDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const desktopBreakpoint = 992;

        const resetMobileMenuOnDesktop = () => {
            if (window.innerWidth <= desktopBreakpoint) {
                return;
            }

            const mobileNav = mobileNavRef.current;
            const toggleButton = mobileToggleRef.current;

            if (mobileNav) {
                mobileNav.classList.remove("show", "collapsing");
                mobileNav.style.height = "";
            }

            if (toggleButton) {
                toggleButton.classList.add("collapsed");
                toggleButton.setAttribute("aria-expanded", "false");
            }
        };

        window.addEventListener("resize", resetMobileMenuOnDesktop);
        resetMobileMenuOnDesktop();

        return () => {
            window.removeEventListener("resize", resetMobileMenuOnDesktop);
        };
    }, []);

    useEffect(() => {
        const handleClickOutsideMobileMenu = (event) => {
            const mobileNav = mobileNavRef.current;
            const toggleButton = mobileToggleRef.current;

            if (!mobileNav || !mobileNav.classList.contains("show")) {
                return;
            }

            const clickedInsideMenu = mobileNav.contains(event.target);
            const clickedToggle = toggleButton?.contains(event.target);

            if (clickedInsideMenu || clickedToggle) {
                return;
            }

            mobileNav.classList.remove("show", "collapsing");
            mobileNav.style.height = "";

            if (toggleButton) {
                toggleButton.classList.add("collapsed");
                toggleButton.setAttribute("aria-expanded", "false");
            }
        };

        document.addEventListener("mousedown", handleClickOutsideMobileMenu);

        return () => {
            document.removeEventListener("mousedown", handleClickOutsideMobileMenu);
        };
    }, []);

    const handleMapReady = useCallback((instance) => {
        setLeafletMapInstance(instance);
    }, []);

    const handleLogout = async () => {
        await dispatch(logout());
    };

    const handleOpenSettingModal = () => {
        setIsSettingModalOpen(true);
    };

    const handleCloseSettingModal = () => {
        setIsSettingModalOpen(false);
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
            const normalizedSearchData = searchData
                .map((item) => normalizeSearchResult(item))
                .sort(compareSearchResults);
            setSearchResults(normalizedSearchData);
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
        return {
            icon: result?._searchIcon || "fa-solid fa-location-dot",
            title: result?._searchTitle || result?.name || "Khu vực",
            subtitle: result?._searchSubtitle || "Đối tượng bản đồ",
            meta: result?._searchMeta || "",
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
                                    placeholder="Tìm kiếm địa điểm, trạm đo, công trình thủy lợi"
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
                                            {searchResults.slice(0, 30).map((result, index) => {
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
                            <NavLink
                                to={ROUTES.home}
                                className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
                            >
                                <span>Trang chủ</span>
                            </NavLink>

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
                                <span>Bản tin xâm nhập mặn</span>
                            </NavLink>

                            <NavLink
                                to={ROUTES.feedback}
                                className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
                            >
                                <span>Liên hệ</span>
                            </NavLink>

                            {canManageData && (
                                <NavLink
                                    to={ROUTES.salinity}
                                    className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
                                >
                                    <span>Quản trị dữ liệu</span>
                                </NavLink>
                            )}

                            {canManageUsers && (
                                <NavLink
                                    to={ROUTES.users}
                                    className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
                                >
                                    <span>Quản trị tài khoản</span>
                                </NavLink>
                            )}

                            {/* User Dropdown */}
                            {isLoggedIn ? (
                                <div className="user-dropdown">
                                    <button
                                        className="user-button"
                                        data-bs-toggle="dropdown"
                                        aria-expanded="false"
                                    >
                                        <div className="user-info">
                                            <span className="user-name">{userInfo?.name || "Tài khoản"}</span>
                                        </div>
                                        <i className="fa-solid fa-chevron-down dropdown-arrow"></i>
                                    </button>

                                    <ul className="dropdown-menu">
                                        <li>
                                            <button
                                                type="button"
                                                className="dropdown-item"
                                                onClick={handleOpenSettingModal}
                                            >
                                                <span>Cài đặt</span>
                                            </button>
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
                            ref={mobileToggleRef}
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
                <div ref={mobileNavRef} className="collapse" id="mobileNav">
                    <div className="mobile-nav">
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
                                <span>Bản tin xâm nhập mặn</span>
                            </NavLink>
                            <NavLink
                                to={ROUTES.feedback}
                                className={({ isActive }) =>
                                    isActive ? "mobile-link active" : "mobile-link"
                                }
                            >
                                <i className="fa-solid fa-comment-dots"></i>
                                <span>Liên hệ</span>
                            </NavLink>
                            {canManageData && (
                                <NavLink
                                    to={ROUTES.salinity}
                                    className={({ isActive }) =>
                                        isActive ? "mobile-link active" : "mobile-link"
                                    }
                                >
                                    <i className="fa-solid fa-droplet"></i>
                                    <span>Quản trị dữ liệu</span>
                                </NavLink>
                            )}
                            {canManageUsers && (
                                <NavLink
                                    to={ROUTES.users}
                                    className={({ isActive }) =>
                                        isActive ? "mobile-link active" : "mobile-link"
                                    }
                                >
                                    <i className="fa-solid fa-users"></i>
                                    <span>Quản trị tài khoản</span>
                                </NavLink>
                            )}
                            {isLoggedIn ? (
                                <>
                                    <button
                                        type="button"
                                        className="mobile-link"
                                        onClick={handleOpenSettingModal}
                                    >
                                        <i className="fa-solid fa-gear"></i>
                                        <span>Cài đặt</span>
                                    </button>
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
            <SettingUser isOpen={isSettingModalOpen} onClose={handleCloseSettingModal} />
        </div>
    );
};

export default Map;
