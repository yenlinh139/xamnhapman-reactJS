import React, { useEffect, useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { ROUTES } from '../common/constants';
import imageLogo from '../assets/logo.png';
import { menusGIS } from '../pages/map/dataLayers';
// import wellknown from 'wellknown';
// import { Buffer } from 'buffer';
// import wkx from 'wkx';

function LeftMenuMap({
  sidebarOpen,
  setSidebarOpen,
  onLayerToggle,
  searchResults,
  setSelectedLocation,
}) {
  const [state, setState] = useState({
    openMenuIndex: null,
    enabledLayers: [],
    activeTab: 'Data', // Mặc định là tab Data
    isLoadingSearchResults: true,
  });

  // const [showSalinityPoints, setShowSalinityPoints] = useState(false);

  const handleSalinityPointsToggle = (checked) => {
    // Update the enabledLayers state
    setState((prevState) => ({
      ...prevState,
      enabledLayers: checked
        ? [...prevState.enabledLayers, 'salinityPoints']
        : prevState.enabledLayers.filter((layer) => layer !== 'salinityPoints'),
    }));

    // Make sure to notify parent component
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

  // Kiểm tra khi có dữ liệu tìm kiếm và tự động chuyển sang tab search
  useEffect(() => {
    if (searchResults && searchResults.length > 0) {
      setState((prevState) => ({
        ...prevState,
        activeTab: 'search', // Chuyển sang tab search khi có dữ liệu
        isLoadingSearchResults: false,
      }));
    } else {
      setState((prevState) => ({
        ...prevState,
        isLoadingSearchResults: false,
      }));
    }
  }, [searchResults]); // Theo dõi sự thay đổi của searchResults

  const toggleDropdown = (index) => {
    setState((prevState) => ({
      ...prevState,
      openMenuIndex: prevState.openMenuIndex === index ? null : index,
    }));
  };

  const handleLayerToggle = (layer, checked) => {
    setState((prevState) => {
      const updatedLayers = checked
        ? [...prevState.enabledLayers, layer]
        : prevState.enabledLayers.filter((l) => l !== layer);

      onLayerToggle(layer, checked);

      return {
        ...prevState,
        enabledLayers: updatedLayers,
      };
    });
  };

  // const handleClick = (result) => {
  //   try {
  //     const buffer = Buffer.from(result.geom, 'hex'); // 👈 chuyển chuỗi hex về buffer
  //     const geometry = wkx.Geometry.parse(buffer); // 👈 parse buffer thành geometry
  //     const geojson = geometry.toGeoJSON(); // 👈 convert sang GeoJSON

  //     if (!geojson || !geojson.type) return;

  //     if (geojson.type === 'Point') {
  //       const [lng, lat] = geojson.coordinates;
  //       setSelectedLocation({ lat, lng });
  //     } else if (geojson.type === 'Polygon') {
  //       const center = getPolygonCenter(geojson.coordinates[0]);
  //       setSelectedLocation({ lat: center.lat, lng: center.lng });
  //     }
  //   } catch (err) {
  //     console.error('❌ Lỗi khi parse WKB:', err);
  //   }
  // };

  // const getPolygonCenter = (coordinates) => {
  //   // Tính trung tâm của Polygon
  //   let latSum = 0;
  //   let lngSum = 0;
  //   coordinates.forEach(([lng, lat]) => {
  //     latSum += lat;
  //     lngSum += lng;
  //   });
  //   const centerLat = latSum / coordinates.length;
  //   const centerLng = lngSum / coordinates.length;

  //   return { lat: centerLat, lng: centerLng };
  // };

  const renderTabContent = useMemo(() => {
    if (state.activeTab === 'Data') {
      return (
        <div>
          {/* Add custom li for salinity points */}
          <div className="groupWrapper">
            <p className="titleListMenu textMenuBig">Dữ liệu quan trắc</p>
            <ul className="p-0">
              <li className="listMenu">
                <input
                  type="checkbox"
                  id="layer-salinity-points"
                  checked={state.enabledLayers.includes('salinityPoints')}
                  onChange={(e) => handleSalinityPointsToggle(e.target.checked)}
                />
                <label htmlFor="layer-salinity-points" className="ps-3">
                  <i className="fa-solid fa-droplet pe-2"></i>
                  Điểm đo độ mặn
                </label>
              </li>
              <li className="listMenu">
                <input
                  type="checkbox"
                  id="layer-hydromet-stations"
                  checked={state.enabledLayers.includes('hydrometStations')}
                  onChange={(e) =>
                    handleHydrometStationsToggle(e.target.checked)
                  }
                />
                <label htmlFor="layer-hydromet-stations" className="ps-3">
                  <i className="fa-solid fa-cloud-rain pe-2"></i>
                  Trạm khí tượng thủy văn
                </label>
              </li>
            </ul>
          </div>
          {menusGIS.map((group, groupIndex) => (
            <div className="groupWrapper" key={groupIndex}>
              <p className="titleListMenu textMenuBig">{group.title}</p>
              <ul className="p-0">
                {group.items.map((menu, itemIndex) => {
                  const uniqueIndex = `${groupIndex}-${itemIndex}`;
                  return (
                    <React.Fragment key={uniqueIndex}>
                      <li
                        className={`listMenu ${
                          state.openMenuIndex === uniqueIndex ? 'active' : ''
                        }`}
                        onClick={() => toggleDropdown(uniqueIndex)}
                      >
                        <i className={menu.icon}></i>
                        <span className="ps-3 textMenuBig">{menu.name}</span>
                        <i className="textMenuBig iconRight fa-solid fa-angle-right"></i>
                      </li>
                      {state.openMenuIndex === uniqueIndex && (
                        <ul className="ps-4">
                          {menu.layers.map((layer, idx) => (
                            <li key={`${uniqueIndex}-${idx}`}>
                              <input
                                type="checkbox"
                                id={`layer-${layer}`}
                                checked={state.enabledLayers.includes(layer)}
                                onChange={(e) =>
                                  handleLayerToggle(layer, e.target.checked)
                                }
                              />
                              <label
                                htmlFor={`layer-${layer}`}
                                className="ps-3"
                              >
                                {menu.nameItem?.[idx] || layer}
                              </label>
                            </li>
                          ))}
                        </ul>
                      )}
                    </React.Fragment>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      );
    }

    if (state.activeTab === 'search') {
      return (
        <div className="p-2">
          <h6 className="fw-bold mb-3">Kết quả tìm kiếm</h6>
          {state.isLoadingSearchResults ? (
            <p className="text-muted small">Đang tải dữ liệu...</p>
          ) : Array.isArray(searchResults) && searchResults.length === 0 ? (
            <p className="text-muted small">Không tìm thấy kết quả.</p>
          ) : Array.isArray(searchResults) ? (
            <ul className="mb-0 px-2 pt-2">
              {searchResults.map((result, idx) => (
                <li
                  key={result.id || idx}
                  className="border rounded px-2 py-2 mb-3 bg-white shadow-sm"
                  style={{
                    fontSize: '0.8rem',
                    wordWrap: 'break-word',
                    whiteSpace: 'normal',
                  }}
                  // onClick={() => handleClick(result)}
                >
                  <ul className="list-unstyled mb-0">
                    <li className="fw-bold text-primary mb-2">
                      {result.tenxa} - {result.tenhuyen}
                    </li>
                    <li>
                      <strong>Mã xã: </strong> {result.maxa}
                    </li>
                    <li>
                      <strong>Tên huyện: </strong> {result.tenhuyen}
                    </li>
                    <li>
                      <strong>Diện tích tự nhiên: </strong>{' '}
                      {result.dientichtunhien.toFixed(2)} ha
                    </li>
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted small">Dữ liệu không hợp lệ.</p>
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
