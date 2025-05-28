import React, { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet.locatecontrol/dist/L.Control.Locate.css';
import 'leaflet.locatecontrol';
import 'leaflet-draw';
import '../../components/BetterWMS.js';
import axiosInstance from '../../config/axios-config';
import {
  convertDMSToDecimal,
  convertDMSToDecimalNo,
} from '../../components/convertDMSToDecimal';
import { ToastCommon } from '../../components/ToastCommon.jsx';
import { TOAST } from '../../common/constants.js';
import SaltChartFull from './SaltChartFull';
import MapDetails from './MapDetails';
import { initializeMap } from '../../components/map/mapInitialization';
import { renderSalinityPoints } from '../../components/map/SalinityMarkers';
import { renderHydrometStations } from '../../components/map/HydrometMarkers';
import { updateLegendVisibility } from '../../components/map/mapStyles';
import {
  handleLocationChange,
  handleFeatureHighlight,
} from '../../components/map/mapUtils';

import {
  fetchSalinityStationPositions,
  fetchHydrometeorologyStationPositions,
} from '../../components/map/mapDataServices';
import {
  getSalinityIcon,
  getHydrometIcon,
} from '../../components/map/mapMarkers';
import { prefixUnitMap } from '../../components/map/mapStyles.js';

const MapboxMap = ({
  selectedLayers,
  selectedLocation,
  highlightedFeature,
  setHighlightedFeature,
}) => {
  const mapContainer = useRef(null);
  const [map, setMap] = useState(null);
  const overlayLayers = useRef({});
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [showFullChart, setShowFullChart] = useState(false);
  const [salinityData, setSalinityData] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [hydrometData, setHydrometData] = useState([]);
  const highlightedLayerRef = useRef(null);
  const highlightedMarkerRef = useRef(null);

  const handleCloseDetails = () => {
    setSelectedPoint(null);
    setSelectedStation(null);
  };

  // Add global function for popup button action
  useEffect(() => {
    window.openChartDetails = (kiHieu) => {
      // Find the selected point data
      const selectedPointData =
        selectedPoint?.kiHieu === kiHieu ? selectedPoint : null;

      if (selectedPointData && salinityData.length > 0) {
        setShowFullChart(true);
      } else {
        // If point data is not available, fetch it
        const fetchPointData = async () => {
          try {
            // You might need to fetch the point data here if not already available
            // For now, just open the chart with available data
            setShowFullChart(true);
          } catch (error) {
            console.error('Error opening chart details:', error);
          }
        };
        fetchPointData();
      }
    };

    window.openHydrometDetails = (maTram) => {
      // Find the selected station data
      const selectedStationData =
        selectedStation?.maTram === maTram ? selectedStation : null;

      if (selectedStationData && hydrometData.length > 0) {
        setShowFullChart(true);
      } else {
        // If station data is not available, fetch it
        const fetchStationData = async () => {
          try {
            // You might need to fetch the station data here if not already available
            // For now, just open the chart with available data
            setShowFullChart(true);
          } catch (error) {
            console.error('Error opening hydromet details:', error);
          }
        };
        fetchStationData();
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
    };
  }, [selectedPoint, salinityData, selectedStation, hydrometData]);

  // Initialize map
  useEffect(() => {
    if (map || !mapContainer.current) return;

    const { mapInstance } = initializeMap(mapContainer.current);
    setMap(mapInstance);

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, []);

  // Handle layer changes and re-render map
  useEffect(() => {
    if (!map || !selectedLayers) return;

    // Clear existing selections when layers change
    setSelectedPoint(null);
    setSelectedStation(null);
    setShowFullChart(false);
    setSalinityData([]);
    setHydrometData([]);

    // Clear existing overlay layers (WMS layers)
    Object.entries(overlayLayers.current).forEach(([_, layer]) => {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });
    overlayLayers.current = {};

    // Clear all markers and layers from map
    map.eachLayer((layer) => {
      if (layer.options?.isSalinityPoint || layer.options?.isHydrometStation) {
        map.removeLayer(layer);
      }
    });

    // Implement mutual exclusivity between salinity points and hydromet stations
    const hasSalinityPoints = selectedLayers.includes('salinityPoints');
    const hasHydrometStations = selectedLayers.includes('hydrometStations');

    // Add selected layers with mutual exclusivity logic
    selectedLayers.forEach((layerName) => {
      if (layerName === 'salinityPoints') {
        // Only render if hydromet stations are not selected
        if (
          !hasHydrometStations ||
          selectedLayers.indexOf('salinityPoints') >
            selectedLayers.indexOf('hydrometStations')
        ) {
          renderSalinityPoints(map, setSalinityData, setSelectedPoint);
          // Add to overlay layers for legend visibility
          overlayLayers.current[layerName] = {
            name: 'Điểm đo mặn',
            type: 'marker',
          };
        }
      } else if (layerName === 'hydrometStations') {
        // Only render if salinity points are not selected
        if (
          !hasSalinityPoints ||
          selectedLayers.indexOf('hydrometStations') >
            selectedLayers.indexOf('salinityPoints')
        ) {
          renderHydrometStations(map, setHydrometData, setSelectedStation);
          // Add to overlay layers for legend visibility
          overlayLayers.current[layerName] = {
            name: 'Trạm khí tượng thủy văn',
            type: 'marker',
          };
        }
      } else {
        // Handle WMS layers from GeoServer
        const wmsLayer = L.tileLayer.betterWms(
          'http://localhost:8080/geoserver/xamnhapman_tphcm/wms',
          {
            layers: `xamnhapman_tphcm:${layerName}`,
            transparent: true,
            format: 'image/png',
            version: '1.1.1', // quan trọng
            info_format: 'text/html', // để hiển thị bảng đẹp
            attribution: 'GeoServer',
          }
        );

        wmsLayer.addTo(map);
        overlayLayers.current[layerName] = wmsLayer;
      }
    });

    updateLegendVisibility(overlayLayers.current);

    // Force map refresh/re-render
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [selectedLayers, map]);

  // Handle location changes
  useEffect(() => {
    handleLocationChange(map, selectedLocation);
  }, [selectedLocation, map]);

  // Handle feature highlighting
  useEffect(() => {
    handleFeatureHighlight(
      map,
      highlightedFeature,
      highlightedLayerRef,
      highlightedMarkerRef
    );
  }, [highlightedFeature, map]);

  // Force re-render when key dependencies change
  useEffect(() => {
    if (!map) return;

    // Close any open popups
    map.closePopup();

    // Clear any highlighted features
    if (highlightedLayerRef.current) {
      map.removeLayer(highlightedLayerRef.current);
      highlightedLayerRef.current = null;
    }

    if (highlightedMarkerRef.current) {
      map.removeLayer(highlightedMarkerRef.current);
      highlightedMarkerRef.current = null;
    }

    // Force map refresh
    map.invalidateSize();
  }, [selectedLayers, selectedLocation, map]);

  // Date search functionality for legend
  useEffect(() => {
    if (!map) return;

    setTimeout(() => {
      const dateInput = document.getElementById('legend-date');
      if (!dateInput) return;

      dateInput.addEventListener('change', async () => {
        const rawDate = dateInput.value; // yyyy-mm-dd

        if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return;

        const [year, month, day] = rawDate.split('-');
        if (parseInt(year, 10) < 1000) return;

        try {
          const response = await axiosInstance.get(
            `/api/search-date/${rawDate}`
          );
          const data = response.data;

          if (data.meteorologyData?.length || data.hydrologyData?.length) {
            const hydrometeorologyPositions =
              await fetchHydrometeorologyStationPositions(
                data.meteorologyData || data.hydrologyData
              );

            renderHydrometeorologySummaryPoints(map, hydrometeorologyPositions);
          }

          if (data.salinityData?.length) {
            const salinityPositions = await fetchSalinityStationPositions(
              data.salinityData
            );
            renderSalinitySummaryPoints(map, salinityPositions);
          }

          // Update legend UI with new structure
          const legendSummary = document.getElementById('legend-summary');
          const legendPrimary = document.getElementById('legend-primary');

          if (legendSummary && legendPrimary) {
            legendSummary.style.display = 'block';

            const formattedDate = `${day}-${month}-${year}`;
            const labelMapping = {
              meteorologyData: 'Khí tượng',
              salinityData: 'Độ mặn',
              hydrologyData: 'Thủy văn',
            };

            legendPrimary.innerHTML = `
              <div class="data-summary-card">
                <div class="summary-header">
                  <h6 class="summary-date">📅 ${formattedDate}</h6>
                </div>
                <div class="summary-stats">
                  ${Object.keys(data)
                    .map((key) => {
                      const label = labelMapping[key] || key;
                      const count = data[key].length;
                      return `
                        <div class="stat-item">
                          <span class="stat-label">${label}</span>
                          <span class="stat-value">${count} bản ghi</span>
                        </div>
                      `;
                    })
                    .join('')}
                </div>
              </div>
            `;
          }
        } catch (error) {
          console.log(`error.message:`, error.message);
          ToastCommon(TOAST.ERROR, error.message);
        }
      });
    }, 0);
  }, [map]);

  // Summary points rendering functions for date search
  const renderSalinitySummaryPoints = (mapInstance, salinityPositions) => {
    const latLngs = [];

    salinityPositions.forEach((station) => {
      const point = station.position[0];
      const lat = convertDMSToDecimal(point.ViDo);
      const lng = convertDMSToDecimal(point.KinhDo);
      const value = parseFloat(station.value);
      const date = new Date(station.date).toLocaleDateString('vi-VN');
      let color = '#6c757d';
      if (value < 1) color = 'blue';
      else if (value < 4) color = '#fd7e14';
      else color = '#dc3545';

      if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
        console.warn(`⚠️ Không thể chuyển tọa độ tại điểm ${point.TenDiem}`);
        return;
      }

      const icon = getSalinityIcon(value);

      const marker = L.marker([lat, lng], {
        icon,
        isSalinityPoint: true,
      }).addTo(mapInstance);

      latLngs.push([lat, lng]);

      marker.bindTooltip(point.TenDiem, {
        permanent: true,
        direction: 'top',
        offset: [0, -10],
        className: `custom-tooltip tooltip-${color.replace('#', '')}`,
      });

      marker.on('click', () => {
        const zoomLevel = 15;
        const offsetX = 0;
        const offsetY = -100;

        const targetLatLng = L.latLng(lat, lng);
        const pointInPixel = mapInstance.project(targetLatLng, zoomLevel);
        const offsetPoint = pointInPixel.subtract([-offsetX, -offsetY]);
        const offsetLatLng = mapInstance.unproject(offsetPoint, zoomLevel);
        mapInstance.setView(offsetLatLng, zoomLevel, { animate: true });

        const popupHTML = `
          <div class="modern-popup">
            <div class="popup-header">
              <div class="popup-title">
                <h4 class="popup-name">${point.TenDiem}</h4>
                <span class="popup-type">Điểm đo độ mặn</span>
              </div>
              <div class="popup-status ${
                value < 1
                  ? 'status-low'
                  : value < 4
                  ? 'status-medium'
                  : 'status-high'
              }">
                ${
                  value < 1
                    ? 'Bình thường'
                    : value < 4
                    ? 'Rủi ro cấp 2'
                    : 'Rủi ro cấp 3'
                }
              </div>
            </div>
            
            <div class="popup-content">
              <div class="popup-main-value">
                <span class="value-label">Độ mặn</span>
                <span class="value-number" style="color: ${color}">
                  ${!isNaN(value) ? `${value.toFixed(2)} ‰` : 'N/A'}
                </span>
              </div>
              
              <div class="popup-details">
                <div class="detail-grid">
                  <div class="detail-item">
                    <div class="detail-content py-2">
                      <strong class="detail-label"><i class="detail-icon">🏷️</i> Phân loại: </strong>
                      <span class="detail-value">${point.PhanLoai}</span>
                    </div>
                  </div>
                  
                  <div class="detail-item">
                    <div class="detail-content py-2">
                      <strong class="detail-label font-weight"><i class="detail-icon">⏰</i> Thời gian: </strong>
                      <span class="detail-value">${point.ThoiGian}</span>
                    </div>
                  </div>
                  
                  <div class="detail-item">
                    <div class="detail-content py-2">
                      <strong class="detail-label"><i class="detail-icon">📊</i> Tần suất đo: </strong>
                      <span class="detail-value">${point.TanSuat}</span>
                    </div>
                  </div>
                  
                  <div class="detail-item">
                    <div class="detail-content py-2">
                      <strong class="detail-label"><i class="detail-icon">📅</i> Ngày thống kê: </strong>
                      <span class="detail-value">${date}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;

        marker.bindPopup(popupHTML).openPopup();
      });
    });

    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      mapInstance.fitBounds(bounds, {
        padding: [200, 200],
        animate: true,
      });
    }
  };

  const renderHydrometeorologySummaryPoints = (
    mapInstance,
    hydrometeorologyPositions
  ) => {
    const latLngs = [];
    const grouped = {};
    hydrometeorologyPositions.forEach((item) => {
      const key = item.position[0].KiHieu;
      if (!grouped[key]) {
        grouped[key] = {
          position: item.position,
          values: [],
          date: item.date,
        };
      }
      grouped[key].values.push({
        kiHieu: item.kiHieu,
        value: item.value,
      });
    });
    const result = Object.values(grouped);
    console.log(result);

    result.forEach((station) => {
      const point = station.position[0];
      const lat = convertDMSToDecimalNo(point.ViDo);
      const lng = convertDMSToDecimalNo(point.KinhDo);
      const date = station.date;

      if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
        console.warn(`⚠️ Không thể chuyển tọa độ tại điểm ${point.TenTam}`);
        return;
      }

      // Chỉ sử dụng icon chung cho trạm
      const icon = getHydrometIcon();

      const marker = L.marker([lat, lng], {
        icon,
        isHydrometPoint: true,
      }).addTo(mapInstance);

      latLngs.push([lat, lng]);

      marker.bindTooltip(point.TenTam, {
        permanent: true,
        direction: 'top',
        offset: [0, -10],
        className: 'custom-tooltip',
      });

      const valueRows = station.values
        .map((val) => {
          const prefix = val.kiHieu.split('_')[0];
          const unitData = prefixUnitMap()[prefix];

          let DonVi = '';
          let contentLabel = '';
          if (typeof unitData === 'object' && unitData !== null) {
            DonVi = unitData.donvi || '';
            contentLabel = unitData.content || '';
          } else {
            DonVi = unitData || '';
            contentLabel = unitData || '';
          }

          const value = parseFloat(val.value);

          // Color based on unit type (DonVi) instead of numerical value
          let color = '#6c757d'; // Default gray
          switch (DonVi) {
            case '(mm)': // Rainfall
              color = '#0d6efd'; // Blue for rainfall
              break;
            case '(°C)': // Temperature
              color = '#dc3545'; // Red for temperature
              break;
            case '(cm)': // Water level
              color = '#198754'; // Green for water level
              break;
            default:
              color = '#6c757d'; // Gray for unknown types
          }

          return `
          <div class="popup-main-value">
            <span class="value-label">${contentLabel || 'Giá trị đo'}</span>
            <span class="value-number" style="color: ${color}">
              ${!isNaN(value) ? value.toFixed(2) : '-'} ${DonVi}
            </span>
          </div>
        `;
        })
        .join('');

      const popupHTML = `
        <div class="modern-popup">
          <div class="popup-header">
            <div class="popup-icon">🌤️</div>
            <div class="popup-title">
              <h4 class="popup-name">${point.TenTam}</h4>
              <span class="popup-type">${
                point.PhanLoai || 'Trạm khí tượng thủy văn'
              }</span>
            </div>
          </div>
    
          <div class="popup-content">
            ${valueRows}
            <div class="popup-details">
              <div class="detail-grid">
                <div class="detail-item py-2">
                  <div class="detail-content">
                    <strong class="detail-label"><i class="detail-icon">🏭</i> Mã trạm:</strong>
                    <span class="detail-value">${point.KiHieu}</span>
                  </div>
                </div>
    
                <div class="detail-item py-2">
                  <div class="detail-content">
                    <strong class="detail-label"><i class="detail-icon">📅</i> Ngày đo:</strong>
                    <span class="detail-value">${date}</span>
                  </div>
                </div>
    
                <div class="detail-item py-2">
                  <div class="detail-content">
                    <strong class="detail-label"> <i class="detail-icon">📊</i> Yếu tố:</strong>
                    <span class="detail-value">${
                      point.YeuTo || 'Không xác định'
                    }</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHTML);
    });

    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      mapInstance.fitBounds(bounds, {
        padding: [50, 50],
        animate: true,
      });
    }
  };

  return (
    <>
      <div ref={mapContainer} id="mapContainer"></div>

      <MapDetails
        salinityData={salinityData}
        selectedPoint={selectedPoint}
        hydrometData={hydrometData}
        onOpenFullChart={() => setShowFullChart(true)}
        onClose={handleCloseDetails}
      />

      <SaltChartFull
        show={showFullChart}
        kiHieu={selectedPoint?.kiHieu}
        tenDiem={selectedPoint?.tenDiem}
        salinityData={salinityData}
        hydrometData={hydrometData}
        onClose={() => setShowFullChart(false)}
      />
    </>
  );
};

export default MapboxMap;
