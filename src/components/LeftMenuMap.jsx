import React, { useEffect, useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { ROUTES } from '../common/constants';
import imageLogo from '../assets/logo.png';
import { menusGIS } from '../pages/map/dataLayers';

function LeftMenuMap({
  sidebarOpen,
  setSidebarOpen,
  onLayerToggle,
  searchResults,
  setSelectedLocation,
  setHighlightedFeature,
  highlightedFeature,
}) {
  const [state, setState] = useState({
    openMenuIndex: null,
    enabledLayers: [],
    activeTab: 'Data', // Mặc định là tab Data
    isLoadingSearchResults: true,
  });
  const [districtList, setDistrictList] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null);

  const handleSalinityPointsToggle = (checked) => {
    setState((prevState) => ({
      ...prevState,
      enabledLayers: checked
        ? [...prevState.enabledLayers, 'salinityPoints']
        : prevState.enabledLayers.filter((layer) => layer !== 'salinityPoints'),
    }));

    onLayerToggle('salinityPoints', checked);
  };

  const handleHydrometStationsToggle = (checked) => {
    setState((prevState) => ({
      ...prevState,
      enabledLayers: checked
        ? [...prevState.enabledLayers, 'hydrometStations']
        : prevState.enabledLayers.filter(
            (layer) => layer !== 'hydrometStations'
          ),
    }));

    onLayerToggle('hydrometStations', checked);
  };

  useEffect(() => {
    if (searchResults && searchResults.length > 0) {
      setState((prevState) => ({
        ...prevState,
        activeTab: 'search',
        isLoadingSearchResults: false,
      }));
    } else {
      setState((prevState) => ({
        ...prevState,
        isLoadingSearchResults: false,
      }));
    }
  }, [searchResults]);

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

    if (layer === 'DiaPhanHuyen' && checked) {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_BASE_URL}/api/districts`
        );
        const data = await res.json();
        console.log('Districts data:', data);

        setDistrictList(data);
      } catch (error) {
        console.error('Lỗi khi lấy danh sách huyện:', error);
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
        if (typeof c[0] === 'number' && typeof c[1] === 'number') {
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

  const handleClick = (result) => {
    try {
      if (result.type === 'diem_do_man') {
        const lat = result.ViDo;
        const lng = result.KinhDo;
        if (lat && lng) {
          setSelectedLocation({ lat, lng, zoom: 15 });
          setHighlightedFeature({
            type: 'Point',
            coordinates: [lng, lat],
            icon: 'droplet',
            name: result.TenDiem,
          });
        }
        return;
      }

      const geojson = result.geom;
      if (!geojson || !geojson.type) return;

      if (geojson.type === 'Point') {
        const [lng, lat] = geojson.coordinates;
        setSelectedLocation({ lat, lng, zoom: 14 });
        setHighlightedFeature(geojson);
      } else if (
        geojson.type === 'Polygon' ||
        geojson.type === 'MultiPolygon'
      ) {
        const bounds = getBoundsFromCoordinates(geojson.coordinates);
        setSelectedLocation({ bounds });
        setHighlightedFeature(geojson);
      }
    } catch (err) {
      console.error('Lỗi xử lý GeoJSON hoặc tọa độ:', err);
    }
  };

  const renderTabContent = useMemo(() => {
    if (state.activeTab === 'Data') {
      return (
        <div className="tab-content-data">
          {/* Monitoring Data Section */}
          <div className="data-section">
            <div className="section-header">
              <i className="fa-solid fa-chart-line section-icon"></i>
              <h3 className="section-title">Dữ liệu quan trắc</h3>
            </div>
            <div className="monitoring-layers">
              <div className="layer-item monitoring-layer">
                <div className="layer-toggle">
                  <input
                    type="checkbox"
                    id="layer-salinity-points"
                    className="layer-checkbox"
                    checked={state.enabledLayers.includes('salinityPoints')}
                    onChange={(e) =>
                      handleSalinityPointsToggle(e.target.checked)
                    }
                  />
                  <label
                    htmlFor="layer-salinity-points"
                    className="layer-label"
                  >
                    <div className="layer-info">
                      <div className="layer-icon-wrapper salinity-icon">
                        <i className="fa-solid fa-droplet"></i>
                      </div>
                      <div className="layer-details">
                        <span className="layer-name">Điểm đo mặn</span>
                        <span className="layer-desc">
                          Các điểm quan trắc độ mặn
                        </span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="layer-item monitoring-layer">
                <div className="layer-toggle">
                  <input
                    type="checkbox"
                    id="layer-hydromet-stations"
                    className="layer-checkbox"
                    checked={state.enabledLayers.includes('hydrometStations')}
                    onChange={(e) =>
                      handleHydrometStationsToggle(e.target.checked)
                    }
                  />
                  <label
                    htmlFor="layer-hydromet-stations"
                    className="layer-label"
                  >
                    <div className="layer-info">
                      <div className="layer-icon-wrapper hydromet-icon">
                        <i className="fa-solid fa-tower-observation"></i>
                      </div>
                      <div className="layer-details">
                        <span className="layer-name">
                          Trạm khí tượng thủy văn
                        </span>
                        <span className="layer-desc">
                          Trạm quan trắc thời tiết
                        </span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* GIS Data Sections */}
          {menusGIS.map((group, groupIndex) => (
            <div className="data-section" key={groupIndex}>
              <div className="section-header">
                <i
                  className={`${
                    group.icon || 'fa-solid fa-layer-group'
                  } section-icon`}
                ></i>
                <h3 className="section-title">{group.title}</h3>
              </div>
              <div className="gis-categories">
                {group.items.map((menu, itemIndex) => {
                  const uniqueIndex = `${groupIndex}-${itemIndex}`;
                  const isOpen = state.openMenuIndex === uniqueIndex;

                  return (
                    <div className="category-item" key={uniqueIndex}>
                      <div
                        className={`category-header ${isOpen ? 'active' : ''}`}
                        onClick={() => toggleDropdown(uniqueIndex)}
                      >
                        <div className="category-info">
                          <i className={`${menu.icon} category-icon`}></i>
                          <span className="category-name">{menu.name}</span>
                        </div>
                        <i
                          className={`fa-solid fa-chevron-right expand-icon ${
                            isOpen ? 'rotated' : ''
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
                                  checked={state.enabledLayers.includes(layer)}
                                  onChange={(e) =>
                                    handleLayerToggle(layer, e.target.checked)
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
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* District Selection */}
          {state.enabledLayers.includes('DiaPhanHuyen') &&
            districtList.length > 0 && (
              <div className="data-section">
                <div className="section-header">
                  <i className="fa-solid fa-map-location-dot section-icon"></i>
                  <h3 className="section-title">Lọc theo huyện</h3>
                </div>
                <div className="district-selector">
                  <select
                    className="district-select"
                    value={selectedDistrict || ''}
                    onChange={(e) => {
                      const district = districtList.find(
                        (d) => d.name === e.target.value
                      );
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

    if (state.activeTab === 'search') {
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
                  key={result.id || idx}
                  className={`result-card ${
                    selectedItemId === result.id ? 'selected' : ''
                  }`}
                  onClick={() => handleClick(result)}
                >
                  {result.type === 'diem_do_man' ? (
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
                          <span className="detail-value">
                            {result.PhanLoai}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Tọa độ:</span>
                          <span className="detail-value">
                            {result.ViDo}, {result.KinhDo}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Thời gian:</span>
                          <span className="detail-value">
                            {result.ThoiGian}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Tần suất:</span>
                          <span className="detail-value">{result.TanSuat}</span>
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
    state.activeTab,
    state.openMenuIndex,
    state.enabledLayers,
    searchResults,
    state.isLoadingSearchResults,
    selectedItemId,
    districtList,
    selectedDistrict,
  ]);

  return (
    <>
      {!sidebarOpen && (
        <div className="overlay" onClick={() => setSidebarOpen(true)}></div>
      )}

      <div className={`sidebar ${sidebarOpen ? '' : 'open'}`}>
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
            onClick={() =>
              setState((prevState) => ({ ...prevState, activeTab: 'Data' }))
            }
            className={`flex-fill py-2 fw-semibold text-uppercase text-sm border-0 bg-transparent ${
              state.activeTab === 'Data'
                ? 'text-dark border-bottom border-2 border-warning'
                : 'text-secondary'
            }`}
          >
            LỚP DỮ LIỆU
          </button>
          <button
            onClick={() =>
              setState((prevState) => ({ ...prevState, activeTab: 'search' }))
            }
            className={`flex-fill py-2 fw-semibold text-uppercase text-sm border-0 bg-transparent ${
              state.activeTab === 'search'
                ? 'text-dark border-bottom border-2 border-warning'
                : 'text-secondary'
            }`}
          >
            TÌM KIẾM
          </button>
        </div>

        {/* Tab Content */}
        {renderTabContent}
      </div>
    </>
  );
}

export default LeftMenuMap;
