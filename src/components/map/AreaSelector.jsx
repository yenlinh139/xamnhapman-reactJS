import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { fetchHydrometStations, fetchIoTStations, fetchSalinityPoints } from '@components/map/mapDataServices';
import { getAllAreasGrouped } from '@common/administrativeAreas';
import { convertDMSToDecimal, dmsToDecimal } from '@components/convertDMSToDecimal';

const STATION_TYPE_CONFIG = {
  hydromet: { color: '#dc2626', label: 'Trạm khí tượng thủy văn', icon: '🌡️' },
  salinity: { color: '#0ea5e9', label: 'Trạm đo độ mặn', icon: '🌊' },
  iot: { color: '#16a34a', label: 'Trạm IoT', icon: '📡' }
};

const parseCoordinate = (rawValue) => {
  if (rawValue === null || rawValue === undefined || rawValue === '') return null;

  if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
    return rawValue;
  }

  const normalized = String(rawValue)
    .trim()
    .replace(/[’‘]/g, "'")
    .replace(/[”“]/g, '"')
    .replace(',', '.');

  if (!normalized) return null;

  if (normalized.includes('°')) {
    const converted = convertDMSToDecimal(normalized) ?? dmsToDecimal(normalized);
    return Number.isFinite(converted) ? converted : null;
  }

  const numeric = Number.parseFloat(normalized);
  return Number.isFinite(numeric) ? numeric : null;
};

const getStationCoordinates = (station) => {
  if (!station) return null;

  const lat = parseCoordinate(
    station.ViDo ?? station.latitude ?? station.lat ?? station.Latitude ?? station.viDo,
  );
  const lng = parseCoordinate(
    station.KinhDo ?? station.longitude ?? station.lng ?? station.Longitude ?? station.kinhDo,
  );

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return [lat, lng];
};

const getStationDisplayName = (station) => {
  return (
    station?.station_name ||
    station?.TenDiem ||
    station?.TenTram ||
    station?.TenTam ||
    station?.name ||
    'Không tên'
  );
};

const getStationDisplayCode = (station) => {
  return (
    station?.station_code ||
    station?.serial_number ||
    station?.KiHieu ||
    station?.kiHieu ||
    station?.id ||
    ''
  );
};

const includesSearchTerm = (value, searchTerm) => {
  if (value === null || value === undefined || !searchTerm) return false;
  return String(value).toLowerCase().includes(searchTerm.toLowerCase());
};

const AreaSelector = ({ mapInstance, onAreaSelect, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('stations');
  const [searchTerm, setSearchTerm] = useState('');
  const [stationData, setStationData] = useState({ hydromet: [], iot: [], salinity: [] });
  const [loading, setLoading] = useState(false);
  const [areaFilter, setAreaFilter] = useState('all'); // 'all', 'noi-thanh', 'ngoai-thanh'
  const [selectedArea, setSelectedArea] = useState(null);
  const [areaStations, setAreaStations] = useState([]);
  const previewLayerRef = useRef(null);

  // Get grouped administrative data
  const administrativeData = getAllAreasGrouped();

  const ensurePreviewLayer = () => {
    if (!mapInstance) return null;

    if (!previewLayerRef.current || !mapInstance.hasLayer(previewLayerRef.current)) {
      previewLayerRef.current = L.layerGroup().addTo(mapInstance);
    }

    return previewLayerRef.current;
  };

  const clearPreviewLayer = () => {
    if (previewLayerRef.current) {
      previewLayerRef.current.clearLayers();
    }
  };

  const getStationTypeKey = (station, fallbackType = null) => {
    if (station?.stationType) return station.stationType;

    if (fallbackType === 'hydromet_station') return 'hydromet';
    if (fallbackType === 'salinity_station') return 'salinity';
    if (fallbackType === 'iot_station') return 'iot';

    if (station?.station_name || station?.serial_number) return 'iot';
    if (station?.TenDiem || station?.MoTa) return 'salinity';
    return 'hydromet';
  };

  const addStationPreviewMarker = (station, fallbackType = null) => {
    const previewLayer = ensurePreviewLayer();
    if (!previewLayer) return null;

    const coordinates = getStationCoordinates(station);
    if (!coordinates) return null;

    const [lat, lng] = coordinates;
    const stationTypeKey = getStationTypeKey(station, fallbackType);
    const config = STATION_TYPE_CONFIG[stationTypeKey] || STATION_TYPE_CONFIG.hydromet;
    const stationName = getStationDisplayName(station);
    const stationCode = getStationDisplayCode(station);

    const marker = L.circleMarker([lat, lng], {
      radius: 8,
      color: '#ffffff',
      weight: 2,
      fillColor: config.color,
      fillOpacity: 0.95
    });

    marker.bindTooltip(stationName, {
      permanent: false,
      direction: 'top',
      offset: [0, -10]
    });

    marker.bindPopup(`
      <div style="min-width: 180px;">
        <div style="font-weight: 700; margin-bottom: 4px;">${config.icon} ${stationName}</div>
        <div style="font-size: 12px; color: #475569; margin-bottom: 2px;">${config.label}</div>
        <div style="font-size: 12px;"><strong>Mã:</strong> ${stationCode || 'N/A'}</div>
      </div>
    `);

    marker.addTo(previewLayer);
    return [lat, lng];
  };

  const renderStationsPreview = (stations, fallbackType = null) => {
    clearPreviewLayer();

    if (!mapInstance || !Array.isArray(stations)) return [];

    const coordinates = [];
    stations.forEach((station) => {
      const latLng = addStationPreviewMarker(station, fallbackType);
      if (latLng) coordinates.push(latLng);
    });

    return coordinates;
  };

  useEffect(() => {
    if (!mapInstance) return;

    ensurePreviewLayer();

    return () => {
      if (previewLayerRef.current && mapInstance.hasLayer(previewLayerRef.current)) {
        mapInstance.removeLayer(previewLayerRef.current);
      }
      previewLayerRef.current = null;
    };
  }, [mapInstance]);

  // Load station data
  useEffect(() => {
    const loadStations = async () => {
      setLoading(true);
      try {
        const [hydrometStations, iotStationsResponse, salinityStations] = await Promise.all([
          fetchHydrometStations(),
          fetchIoTStations(),
          fetchSalinityPoints()
        ]);

        // Handle different response formats
        const hydrometData = Array.isArray(hydrometStations) ? hydrometStations : [];
        const iotData = iotStationsResponse?.data || iotStationsResponse || [];
        const salinityData = Array.isArray(salinityStations) ? salinityStations : [];
        
        console.log('AreaSelector - Loading stations:', {
          hydrometData: hydrometData.length,
          iotData: iotData.length,
          salinityData: salinityData.length
        });
        
        // Ensure data is always array
        setStationData({
          hydromet: Array.isArray(hydrometData) ? hydrometData : [],
          iot: Array.isArray(iotData) ? iotData : [],
          salinity: Array.isArray(salinityData) ? salinityData : []
        });
      } catch (error) {
        console.error('Error loading stations:', error);
        // Set empty arrays on error
        setStationData({
          hydromet: [],
          iot: [],
          salinity: []
        });
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadStations();
    }
  }, [isOpen]);

  // Filter data based on search term
  const filterData = (data, searchTerm) => {
    if (!searchTerm || !Array.isArray(data)) return data || [];
    return data.filter(item => 
      includesSearchTerm(item.name, searchTerm) ||
      includesSearchTerm(item.station_name, searchTerm) ||
      includesSearchTerm(item.TenTram, searchTerm) ||
      includesSearchTerm(item.TenDiem, searchTerm) ||
      includesSearchTerm(item.TenTam, searchTerm) ||
      includesSearchTerm(item.KiHieu, searchTerm) ||
      includesSearchTerm(item.station_code, searchTerm) ||
      includesSearchTerm(item.serial_number, searchTerm)
    );
  };

  // Function to check if station is in bounds
  const isStationInBounds = (station, bounds) => {
    if (!bounds || !station) return false;

    const coordinates = getStationCoordinates(station);
    if (!coordinates) {
      return false;
    }

    const [lat, lng] = coordinates;
    
    const [[southWest_lat, southWest_lng], [northEast_lat, northEast_lng]] = bounds;
    
    return lat >= southWest_lat && lat <= northEast_lat && 
           lng >= southWest_lng && lng <= northEast_lng;
  };

  // Function to get stations in selected area
  const getStationsInArea = (area, type) => {
    if (type !== 'district' && type !== 'commune') return [];
    
    const { bounds } = area;
    if (!bounds) return [];
    
    const stationsInArea = [];
    
    // Check salinity stations
    stationData.salinity.forEach(station => {
      if (isStationInBounds(station, bounds)) {
        stationsInArea.push({ ...station, stationType: 'salinity' });
      }
    });
    
    // Check hydromet stations
    stationData.hydromet.forEach(station => {
      if (isStationInBounds(station, bounds)) {
        stationsInArea.push({ ...station, stationType: 'hydromet' });
      }
    });
    
    // Check IoT stations
    stationData.iot.forEach(station => {
      if (isStationInBounds(station, bounds)) {
        stationsInArea.push({ ...station, stationType: 'iot' });
      }
    });
    
    return stationsInArea;
  };

  const handleAreaSelect = (area, type) => {
    console.log('AreaSelector - handleAreaSelect called:', { area, type, mapInstance });
    let center, bounds, zoomLevel = 13;
    let stationsInArea = [];

    switch (type) {
      case 'hydromet_station':
      case 'salinity_station':
      case 'iot_station': {
        const stationCoordinates = getStationCoordinates(area);
        if (!stationCoordinates) {
          console.warn('Không thể xác định tọa độ trạm:', area);
          return;
        }

        center = stationCoordinates;
        zoomLevel = 15;
        setSelectedArea(null);
        setAreaStations([]);

        renderStationsPreview([{ ...area, stationType: getStationTypeKey(area, type) }], type);
        console.log('Station center coordinates:', center);
        break;
      }
      
      case 'district':
      case 'commune':
        center = area.center;
        bounds = area.bounds;
        zoomLevel = area.type === 'district' ? 12 : 14;
        
        console.log('Administrative area selected:', { center, bounds, zoomLevel });
        
        // Get stations in this area
        stationsInArea = getStationsInArea(area, type);
        console.log('Stations found in area:', stationsInArea.length);
        setAreaStations(stationsInArea);
        setSelectedArea({ area, type });

        renderStationsPreview(stationsInArea);
        break;
      
      default:
        return;
    }

    // Check if map instance exists
    if (!mapInstance) {
      console.warn('Map instance not available, but will still close selector');
      setIsOpen(false);
      if (onAreaSelect) {
        onAreaSelect({ area, type, center, bounds, stationsInArea });
      }
      return;
    }

    console.log('Map instance available, zooming to:', { center, bounds, zoomLevel });

    // Zoom to area using Leaflet methods
    if (bounds && mapInstance.fitBounds) {
      console.log('Using fitBounds with bounds:', bounds);
      mapInstance.fitBounds(bounds, {
        padding: [50, 50]
      });
    } else if (center && mapInstance.flyTo) {
      console.log('Using flyTo with center:', center, 'zoom:', zoomLevel);
      mapInstance.flyTo(center, zoomLevel);
    }

    // Close selector
    setIsOpen(false);
    
    // Callback
    if (onAreaSelect) {
      onAreaSelect({ area, type, center, bounds, stationsInArea });
    }
  };

  const renderStationsList = () => {
    // Ensure stationData properties are arrays
    const hydrometStations = Array.isArray(stationData.hydromet) ? stationData.hydromet : [];
    const iotStations = Array.isArray(stationData.iot) ? stationData.iot : [];
    const salinityStations = Array.isArray(stationData.salinity) ? stationData.salinity : [];
    
    const allStations = [
      ...hydrometStations.map(s => ({ ...s, stationType: 'hydromet' })),
      ...iotStations.map(s => ({ ...s, stationType: 'iot' })),
      ...salinityStations.map(s => ({ ...s, stationType: 'salinity' }))
    ];

    const filteredStations = filterData(allStations, searchTerm);

    return (
      <div className="stations-list">
        {loading ? (
          <div className="text-center py-3">
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">Đang tải...</span>
            </div>
            <p className="small mt-2 mb-0">Đang tải danh sách trạm...</p>
          </div>
        ) : filteredStations.length === 0 ? (
          <div className="text-center text-muted py-3">
            <i className="bi bi-search" style={{ fontSize: '2rem', opacity: 0.5 }}></i>
            <p className="small mt-2 mb-0">
              {searchTerm ? `Không tìm thấy trạm với từ khóa "${searchTerm}"` : 'Không có trạm nào'}
            </p>
            {searchTerm && (
              <button 
                className="btn btn-link btn-sm mt-2" 
                onClick={() => setSearchTerm('')}
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className="list-group">
            {/* Station type headers */}
            {filteredStations.some(s => s.stationType === 'hydromet') && (
              <>
                <div className="list-group-item list-group-item-secondary">
                  <strong><i className="bi bi-thermometer me-2"></i>Trạm khí tượng thủy văn</strong>
                </div>
                {filteredStations
                  .filter(s => s.stationType === 'hydromet')
                  .map((station, index) => {
                    const stationName = getStationDisplayName(station);
                    const stationCode = getStationDisplayCode(station);
                    
                    return (
                      <button
                        key={`hydromet-${index}`}
                        type="button"
                        className="list-group-item list-group-item-action d-flex align-items-center"
                        onClick={() => handleAreaSelect(station, 'hydromet_station')}
                      >
                        <div className="me-3">
                          <span style={{ fontSize: '1.2rem' }}>🌡️</span>
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="mb-1">{stationName}</h6>
                          <p className="mb-1 small text-muted">
                            {stationCode && <span className="badge bg-primary me-2">{stationCode}</span>}
                            <span className="badge bg-info">Khí tượng thủy văn</span>
                          </p>
                        </div>
                        <div>
                          <i className="bi bi-geo-alt text-primary"></i>
                        </div>
                      </button>
                    );
                  })}
              </>
            )}

            {/* Salinity Stations */}
            {filteredStations.some(s => s.stationType === 'salinity') && (
              <>
                {(filteredStations.some(s => s.stationType === 'hydromet') || filteredStations.some(s => s.stationType === 'iot')) && 
                  <div className="border-top my-2"></div>
                }
                <div className="list-group-item list-group-item-secondary">
                  <strong><i className="bi bi-droplet me-2"></i>Trạm đo độ mặn</strong>
                </div>
                {filteredStations
                  .filter(s => s.stationType === 'salinity')
                  .map((station, index) => {
                    const stationName = getStationDisplayName(station);
                    const stationCode = getStationDisplayCode(station);
                    
                    return (
                      <button
                        key={`salinity-${index}`}
                        type="button"
                        className="list-group-item list-group-item-action d-flex align-items-center"
                        onClick={() => handleAreaSelect(station, 'salinity_station')}
                      >
                        <div className="me-3">
                          <span style={{ fontSize: '1.2rem' }}>🌊</span>
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="mb-1">{stationName}</h6>
                          <p className="mb-1 small text-muted">
                            {stationCode && <span className="badge bg-warning me-2">{stationCode}</span>}
                            <span className="badge bg-info">Độ mặn</span>
                          </p>
                        </div>
                        <div>
                          <i className="bi bi-geo-alt text-primary"></i>
                        </div>
                      </button>
                    );
                  })}
              </>
            )}

            {/* IoT Stations */}
            {filteredStations.some(s => s.stationType === 'iot') && (
              <>
                {(filteredStations.some(s => s.stationType === 'hydromet') || filteredStations.some(s => s.stationType === 'salinity')) && 
                  <div className="border-top my-2"></div>
                }
                <div className="list-group-item list-group-item-secondary">
                  <strong><i className="bi bi-wifi me-2"></i>Trạm IoT</strong>
                </div>
                {filteredStations
                  .filter(s => s.stationType === 'iot')
                  .map((station, index) => {
                    const stationName = getStationDisplayName(station);
                    const stationCode = station.station_code || station.serial_number || getStationDisplayCode(station);

                    
                    return (
                      <button
                        key={`iot-${index}`}
                        type="button"
                        className="list-group-item list-group-item-action d-flex align-items-center"
                        onClick={() => handleAreaSelect(station, 'iot_station')}
                      >
                        <div className="me-3">
                          <span style={{ fontSize: '1.2rem' }}>📡</span>
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="mb-1">{stationName}</h6>
                          <p className="mb-1 small text-muted">
                            {stationCode && <span className="badge bg-success me-2">{stationCode}</span>}
                            {station.serial_number && <span className="badge bg-light text-dark me-2">{station.serial_number}</span>}
                            <span className="badge bg-secondary">IoT</span>
                          </p>
                        </div>
                        <div>
                          <i className="bi bi-geo-alt text-primary"></i>
                        </div>
                      </button>
                    );
                  })}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render stations in selected area with offset positioning
  const renderAreaStations = () => {
    if (!selectedArea || areaStations.length === 0) return null;

    // Group stations by type
    const groupedStations = {
      salinity: areaStations.filter(s => s.stationType === 'salinity'),
      hydromet: areaStations.filter(s => s.stationType === 'hydromet'),
      iot: areaStations.filter(s => s.stationType === 'iot')
    };

    const handleStationClick = (station) => {
      if (station.stationType === 'salinity') {
        handleAreaSelect(station, 'salinity_station');
      } else if (station.stationType === 'hydromet') {
        handleAreaSelect(station, 'hydromet_station');
      } else if (station.stationType === 'iot') {
        handleAreaSelect(station, 'iot_station');
      }
    };

    return (
      <div className="area-stations-panel">
        <div className="panel-header">
          <div className="d-flex align-items-center justify-content-between">
            <h6 className="mb-0">
              <i className="bi bi-geo-alt-fill text-primary me-2"></i>
              Trạm trong vùng: {selectedArea.area.name}
            </h6>
            <button 
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                setSelectedArea(null);
                setAreaStations([]);
              }}
              title="Đóng"
            >
              <i className="bi bi-x"></i>
            </button>
          </div>
          <small className="text-muted">
            Tìm thấy {areaStations.length} trạm quan trắc
          </small>
        </div>
        
        <div className="stations-grid">
          {/* Salinity Stations */}
          {groupedStations.salinity.length > 0 && (
            <div className="station-group">
              <div className="group-header">
                <span className="badge bg-info">🌊 Độ mặn ({groupedStations.salinity.length})</span>
              </div>
              <div className="station-cards">
                {groupedStations.salinity.map((station, index) => (
                  <button
                    key={`area-salinity-${index}`}
                    className="station-card btn btn-outline-primary text-start"
                    onClick={() => handleStationClick(station)}
                    style={{
                      transform: `translateY(${index * 2}px)`,
                      zIndex: 1000 - index
                    }}
                  >
                    <div className="card-content">
                      <div className="station-name">{getStationDisplayName(station)}</div>
                      <div className="station-code">{getStationDisplayCode(station)}</div>
                    </div>
                    <i className="bi bi-geo-alt card-icon"></i>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Hydromet Stations */}
          {groupedStations.hydromet.length > 0 && (
            <div className="station-group">
              <div className="group-header">
                <span className="badge bg-primary">🌡️ KTTV ({groupedStations.hydromet.length})</span>
              </div>
              <div className="station-cards">
                {groupedStations.hydromet.map((station, index) => (
                  <button
                    key={`area-hydromet-${index}`}
                    className="station-card btn btn-outline-primary text-start"
                    onClick={() => handleStationClick(station)}
                    style={{
                      transform: `translateY(${index * 2}px)`,
                      zIndex: 1000 - index
                    }}
                  >
                    <div className="card-content">
                      <div className="station-name">{getStationDisplayName(station)}</div>
                      <div className="station-code">{getStationDisplayCode(station)}</div>
                    </div>
                    <i className="bi bi-geo-alt card-icon"></i>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* IoT Stations */}
          {groupedStations.iot.length > 0 && (
            <div className="station-group">
              <div className="group-header">
                <span className="badge bg-success">📡 IoT ({groupedStations.iot.length})</span>
              </div>
              <div className="station-cards">
                {groupedStations.iot.map((station, index) => (
                  <button
                    key={`area-iot-${index}`}
                    className="station-card btn btn-outline-primary text-start"
                    onClick={() => handleStationClick(station)}
                    style={{
                      transform: `translateY(${index * 2}px)`,
                      zIndex: 1000 - index
                    }}
                  >
                    <div className="card-content">
                      <div className="station-name">{getStationDisplayName(station)}</div>
                      <div className="station-code">{station.station_code || station.serial_number || getStationDisplayCode(station)}</div>
                    </div>
                    <i className="bi bi-geo-alt card-icon"></i>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAdministrativeList = () => {
    // Filter districts based on area filter
    let filteredDistricts = [];
    if (areaFilter === 'all') {
      filteredDistricts = [...administrativeData.districts['Nội thành'], ...administrativeData.districts['Ngoại thành']];
    } else if (areaFilter === 'noi-thanh') {
      filteredDistricts = administrativeData.districts['Nội thành'];
    } else if (areaFilter === 'ngoai-thanh') {
      filteredDistricts = administrativeData.districts['Ngoại thành'];
    }

    // Get all communes
    const allCommunes = Object.values(administrativeData.communes).flat();

    // Apply search filter
    const searchedDistricts = filteredDistricts.filter(district =>
      !searchTerm || district.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const searchedCommunes = allCommunes.filter(commune =>
      !searchTerm || 
      commune.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commune.district.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const hasResults = searchedDistricts.length > 0 || searchedCommunes.length > 0;

    return (
      <div className="administrative-list">
        {/* Area Filter */}
        <div className="mb-3">
          <div className="btn-group w-100" role="group">
            <button
              type="button"
              className={`btn btn-sm ${areaFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setAreaFilter('all')}
            >
              Tất cả
            </button>
            <button
              type="button"
              className={`btn btn-sm ${areaFilter === 'noi-thanh' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setAreaFilter('noi-thanh')}
            >
              Nội thành
            </button>
            <button
              type="button"
              className={`btn btn-sm ${areaFilter === 'ngoai-thanh' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setAreaFilter('ngoai-thanh')}
            >
              Ngoại thành
            </button>
          </div>
        </div>

        {!hasResults ? (
          <div className="text-center text-muted py-3">
            <i className="bi bi-search"></i>
            <p className="small mt-2 mb-0">Không tìm thấy khu vực nào</p>
          </div>
        ) : (
          <div className="list-group">
            {/* Districts */}
            {searchedDistricts.length > 0 && (
              <>
                <div className="list-group-item list-group-item-secondary">
                  <strong><i className="bi bi-buildings me-2"></i>Quận/Huyện</strong>
                </div>
                {searchedDistricts.map((area) => {
                  const icon = area.type === 'district' ? '🏢' : '🏘️';
                  const areaType = area.area || 'Không xác định';
                  
                  return (
                    <button
                      key={area.id}
                      type="button"
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={() => handleAreaSelect(area, area.type)}
                    >
                      <div className="me-3">
                        <span style={{ fontSize: '1.2rem' }}>{icon}</span>
                      </div>
                      <div className="flex-grow-1">
                        <h6 className="mb-1">{area.name}</h6>
                        <p className="mb-1 small text-muted">
                          <span className="badge bg-info me-2">Quận/Huyện</span>
                          <span className="badge bg-secondary">{areaType}</span>
                        </p>
                      </div>
                      <div>
                        <i className="bi bi-geo-alt text-primary"></i>
                      </div>
                    </button>
                  );
                })}
              </>
            )}

            {/* Communes */}
            {searchedCommunes.length > 0 && (
              <>
                {searchedDistricts.length > 0 && <div className="border-top my-2"></div>}
                <div className="list-group-item list-group-item-secondary">
                  <strong><i className="bi bi-house me-2"></i>Phường/Xã</strong>
                </div>
                {searchedCommunes.map((area) => {
                  const icon = '🏘️';
                  
                  return (
                    <button
                      key={area.id}
                      type="button"
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={() => handleAreaSelect(area, area.type)}
                    >
                      <div className="me-3">
                        <span style={{ fontSize: '1rem' }}>{icon}</span>
                      </div>
                      <div className="flex-grow-1">
                        <h6 className="mb-1">{area.name}</h6>
                        <p className="mb-1 small text-muted">
                          <span className="badge bg-success me-2">Phường/Xã</span>
                          <span>{area.district}</span>
                        </p>
                      </div>
                      <div>
                        <i className="bi bi-geo-alt text-primary"></i>
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen && !selectedArea) {
    return (
      <button
        type="button"
        className={`btn btn-primary area-selector-toggle ${className}`}
        onClick={() => setIsOpen(true)}
        title="Chọn vùng quan tâm"
      >
        <i className="bi bi-geo-alt me-1"></i>
        Chọn vùng quan tâm
      </button>
    );
  }

  if (!isOpen && selectedArea) {
    return (
      <div className={`area-selector ${className}`}>
        <button
          type="button"
          className="btn btn-primary area-selector-toggle"
          onClick={() => setIsOpen(true)}
          title="Chọn vùng quan tâm"
        >
          <i className="bi bi-geo-alt me-1"></i>
          Chọn vùng quan tâm
        </button>
        
        {/* Area Stations Panel */}
        {renderAreaStations()}
      </div>
    );
  }

  return (
    <div className="area-selector-modal">
      {/* Area Stations Panel - positioned outside modal */}
      {renderAreaStations()}
      
      {/* Backdrop */}
      <div 
        className="modal-backdrop show" 
        onClick={() => setIsOpen(false)}
        style={{ zIndex: 1040 }}
      ></div>

      {/* Modal */}
      <div 
        className="modal show d-block" 
        tabIndex="-1" 
        style={{ zIndex: 1050 }}
      >
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="bi bi-geo-alt me-2"></i>
                Chọn vùng quan tâm
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              ></button>
            </div>

            <div className="modal-body">
              {/* Search */}
              <div className="mb-3">
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Tìm kiếm trạm đo hoặc địa danh..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Tabs */}
              <ul className="nav nav-tabs mb-3" role="tablist">
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${selectedTab === 'stations' ? 'active' : ''}`}
                    type="button"
                    role="tab"
                    onClick={() => setSelectedTab('stations')}
                  >
                    <i className="bi bi-broadcast-pin me-1"></i>
                    Trạm đo ({(Array.isArray(stationData.hydromet) ? stationData.hydromet.length : 0) + 
                             (Array.isArray(stationData.iot) ? stationData.iot.length : 0) +
                             (Array.isArray(stationData.salinity) ? stationData.salinity.length : 0)})
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${selectedTab === 'administrative' ? 'active' : ''}`}
                    type="button"
                    role="tab"
                    onClick={() => setSelectedTab('administrative')}
                  >
                    <i className="bi bi-buildings me-1"></i>
                    Đơn vị hành chính ({Object.values(administrativeData.districts).flat().length + Object.values(administrativeData.communes).flat().length})
                  </button>
                </li>
              </ul>

              {/* Tab Content */}
              <div className="tab-content" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {selectedTab === 'stations' && renderStationsList()}
                {selectedTab === 'administrative' && renderAdministrativeList()}
              </div>
            </div>

            <div className="modal-footer">
              <div className="d-flex justify-content-between align-items-center w-100">
                <div className="text-muted small">
                  💡 Chọn một vùng để bản đồ tự động phóng to tới khu vực đó
                </div>
                <div className="text-muted small">
                  📍 {Object.values(administrativeData.districts).flat().length + 
                       (Array.isArray(stationData.hydromet) ? stationData.hydromet.length : 0) + 
                       (Array.isArray(stationData.iot) ? stationData.iot.length : 0) + 
                       (Array.isArray(stationData.salinity) ? stationData.salinity.length : 0)} vị trí có sẵn
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AreaSelector;