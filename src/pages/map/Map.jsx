import React, { useState } from 'react';
import MapboxMap from './MapboxMap';
import LeftMenuMap from '../../components/LeftMenuMap';
import { Helmet } from 'react-helmet-async';
import axiosInstance from '../../config/axios-config';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../common/constants';

const Map = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedLayers, setSelectedLayers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const { userInfo } = useSelector((state) => state.authStore);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);

  const handleLogout = () => {
    dispatch(logout());
    navigate(ROUTES.home);
  };

  const handleSearch = async () => {
    if (!searchText) return; // Nếu không có từ khoá tìm kiếm thì không gọi API

    try {
      const response = await axiosInstance.get(
        `${import.meta.env.VITE_BASE_URL}/api/search/${encodeURIComponent(
          searchText
        )}`
      );

      setSearchResults(response.data);
    } catch (err) {
      console.log('Đã có lỗi xảy ra khi tìm kiếm.', err);
    }
  };

  const onSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLayerToggle = (layerName, checked) => {
    setSelectedLayers((prevLayers) =>
      checked
        ? [...prevLayers, layerName]
        : prevLayers.filter((l) => l !== layerName)
    );
  };

  return (
    <>
      <Helmet>
        <title>Bản đồ | Xâm nhập mặn Tp. Hồ Chí Minh</title>
      </Helmet>
      {/* Header */}
      <nav className="navbar navbar-expand-md p-0" id="headerMap">
        <div className="container-fluid">
          <div className="header">
            <button className=" icon-menu" onClick={onSidebarToggle}>
              <i className="fa-solid fa-bars"></i>
            </button>
            <button
              className="navbar-toggler "
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#collapsibleNavbar"
            >
              <i className="fa-solid fa-ellipsis-vertical"></i>
            </button>
          </div>
          <div
            className="collapse navbar-collapse justify-content-end"
            id="collapsibleNavbar"
          >
            <ul className="navbar-nav">
              <li className="searchMap">
                <i className="fa-solid fa-magnifying-glass ps-3"></i>
                <input
                  type="text"
                  placeholder="Nhập từ khóa..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: 'none',
                    outline: 'none',
                  }}
                />
                <button onClick={handleSearch}>TÌM KIẾM</button>
              </li>
              <li className="nav-item">
                <a
                  href={ROUTES.home}
                  className="text-menu"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className="fa-solid fa-house"></i> &nbsp; TRANG CHỦ
                </a>
              </li>
              <li className="nav-item">
                <NavLink
                  to={ROUTES.map}
                  className={({ isActive }) =>
                    isActive ? ' text-menu active' : ' text-menu'
                  }
                >
                  <i className="fa-solid fa-map-location-dot"></i> &nbsp; BẢN ĐỒ
                </NavLink>
              </li>
              <li className="nav-item dropdown">
                <NavLink
                  to={ROUTES.users}
                  className="dropdown-toggle text-menu"
                  data-bs-toggle="dropdown"
                  role="button"
                >
                  {userInfo?.name || 'Người dùng'}
                </NavLink>

                <ul className="dropdown-menu">
                  <li>
                    <NavLink to={ROUTES.setting} className="dropdown-item">
                      Cài đặt
                    </NavLink>
                  </li>
                  <li>
                    <button className="dropdown-item" onClick={handleLogout}>
                      Đăng xuất
                    </button>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <div className="d-flex">
        <LeftMenuMap
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          onLayerToggle={handleLayerToggle}
          searchResults={searchResults}
          setSelectedLocation={setSelectedLocation}
        />
        <div className="mapbox-container">
          <MapboxMap
            selectedLayers={selectedLayers}
            selectedLocation={selectedLocation}
          />
        </div>
      </div>
    </>
  );
};

export default Map;
