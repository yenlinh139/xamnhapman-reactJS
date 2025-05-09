import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import mapboxgl from 'mapbox-gl';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet.locatecontrol/dist/L.Control.Locate.css';
import 'leaflet.locatecontrol';
import 'leaflet-draw';
import '../../components/BetterWMS.js';
import {
  convertDMSToDecimal,
  convertDMSToDecimalNo,
} from '../../components/convertDMSToDecimal';
import axiosInstance from '../../config/axios-config';
import salinityIconImg from '../../assets/iconSalinity.svg';
import hydrometIconImg from '../../assets/iconHydromet.svg';
import SaltChartFull from './SaltChartFull';
import MapDetails from './MapDetails';

mapboxgl.accessToken =
  'pk.eyJ1Ijoid2VuZHlsYjA1IiwiYSI6ImNtM3R2MG5ubzBhdGwybHF0MWpwMDM5NDYifQ.OyGWJKEb7e2OsZFznBYzlQ';

const MapboxMap = ({ selectedLayers, selectedLocation }) => {
  const mapContainer = useRef(null);
  const [map, setMap] = useState(null);
  const overlayLayers = useRef({});
  const overlayMaps = useRef({});
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [showFullChart, setShowFullChart] = useState(false);
  const [salinityData, setSalinityData] = useState([]);

  const handleCloseDetails = () => {
    setSelectedPoint(null);
  };

  const updateLegendVisibility = () => {
    const legendDiv = document.querySelector('.legend-container');
    const secondaryLegend = document.querySelector('.legend-secondary');
    const hasSelectedLayer = Object.keys(overlayLayers.current).length > 0;
    legendDiv.style.display = hasSelectedLayer ? 'block' : 'none';
    secondaryLegend.style.display = hasSelectedLayer ? 'block' : 'none';

    secondaryLegend.innerHTML = hasSelectedLayer ? `<h5>Lớp Đã Chọn</h5>` : '';
    Object.keys(overlayLayers.current).forEach((layerName) => {
      secondaryLegend.innerHTML += `<p>📌 <b>${layerName}</b></p>`;
    });
  };

  useEffect(() => {
    if (map) return;

    const mapInstance = L.map(mapContainer.current, {
      center: [10.747890979236143, 106.74911060545153],
      zoom: 10,
      zoomControl: false,
    });

    const baseMaps = {
      'Google Satellite': L.tileLayer(
        'https://mt1.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}',
        { maxZoom: 20, attribution: '© Google' }
      ).addTo(mapInstance),

      'Google Streets': L.tileLayer(
        'https://mt1.google.com/vt/lyrs=y&hl=vi&x={x}&y={y}&z={z}',
        { maxZoom: 20, attribution: '© Google' }
      ),

      'Esri Imagery': L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 20, attribution: 'Map tiles by Esri' }
      ),
    };

    const legendContainer = L.control({ position: 'topright' });
    legendContainer.onAdd = () => {
      const div = L.DomUtil.create('div', 'legend-container');
      div.innerHTML = `
        <h4 class="legend-title">Chú Thích</h4>
        <div class="legend-main" style="display: none;"></div>
        <div class="legend-secondary" style="display: none;"></div>
      `;
      return div;
    };
    legendContainer.addTo(mapInstance);

    L.control
      .layers(baseMaps, overlayMaps.current, { position: 'bottomright' })
      .addTo(mapInstance);

    // Thêm control zoom (nút zoom vào/ra)
    L.control.zoom({ position: 'topright' }).addTo(mapInstance);

    // Thêm control Locate (vị trí thiết bị)
    L.control.locate({ position: 'topright' }).addTo(mapInstance);

    setMap(mapInstance);
  }, [map]);

  useEffect(() => {
    if (!map) return;

    Object.entries(overlayLayers.current).forEach(([_, layer]) => {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });

    overlayLayers.current = {};

    selectedLayers.forEach((layerName) => {
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
    });

    updateLegendVisibility();
  }, [selectedLayers, map]);

  useEffect(() => {
    if (!map) return;

    // Handle salinity points layer
    if (selectedLayers.includes('salinityPoints')) {
      renderSalinityPoints(map);
    } else {
      // Remove salinity points if layer is disabled
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker && layer.options.isSalinityPoint) {
          map.removeLayer(layer);
        }
      });
    }

    // Handle hydromet stations layer
    if (selectedLayers.includes('hydrometStations')) {
      renderHydrometStations(map);
    } else {
      // Remove hydromet stations if layer is disabled
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker && layer.options.isHydrometStation) {
          map.removeLayer(layer);
        }
      });
    }
  }, [selectedLayers, map]);

  const fetchSalinityPoints = async () => {
    try {
      const response = await axiosInstance.get('/api/salinity-points');
      return response.data;
    } catch (error) {
      console.error('Error fetching salinity points:', error);
      return [];
    }
  };

  const salinityIcon = L.icon({
    iconUrl: salinityIconImg,
    iconSize: [30, 30], // hoặc kích thước tùy chỉnh
    iconAnchor: [15, 30], // tâm của icon (góc gắn vào tọa độ)
    popupAnchor: [0, -30], // vị trí popup nếu dùng
  });

  const fetchSalinityData = async (kiHieu) => {
    try {
      const response = await axiosInstance.get(`/api/salinity-data/${kiHieu}`);
      const formatted = response.data.map((item) => ({
        date: new Date(item.Ngày).toISOString(),
        salinity: item.DoMan,
      }));
      formatted.sort((a, b) => new Date(a.date) - new Date(b.date));
      return formatted;
    } catch (error) {
      console.error('Error fetching salinity data:', error);
      return [];
    }
  };

  const renderSalinityPoints = async (mapInstance) => {
    const points = await fetchSalinityPoints();

    points.forEach((point) => {
      const lat = convertDMSToDecimal(point.ViDo);
      const lng = convertDMSToDecimal(point.KinhDo);

      if (lat == null || lng == null) {
        console.warn(`⚠️ Không thể chuyển tọa độ tại điểm ${point.TenDiem}`);
        return;
      }

      const marker = L.marker([lat, lng], {
        icon: salinityIcon,
        isSalinityPoint: true,
      }).addTo(mapInstance);

      marker.on('click', async () => {
        marker
          .bindPopup(
            `
              <div class="popup-container">
                <div class="popup-header">${point.TenDiem}</div>
                <div class="popup-content">
                  <div class="popup-row">
                    <span class="popup-label">Phân loại:</span>
                    <span class="popup-value">${point.PhanLoai}</span>
                  </div>
                  <div class="popup-row">
                    <span class="popup-label">Thời gian:</span>
                    <span class="popup-value">${point.ThoiGian}</span>
                  </div>
                  <div class="popup-row">
                    <span class="popup-label">Tần suất:</span>
                    <span class="popup-value">${point.TanSuat}</span>
                  </div>
                </div>
              </div>
            `
          )
          .openPopup();

        const data = await fetchSalinityData(point.KiHieu);
        setSalinityData(data);

        setSelectedPoint({
          kiHieu: point.KiHieu,
          tenDiem: point.TenDiem,
          thongTin: point,
        });
      });
    });
  };

  const fetchHydrometStations = async () => {
    try {
      const response = await axiosInstance.get('/api/hydrometeorology-station');
      return response.data;
    } catch (error) {
      console.error('Error fetching hydrometeorology stations:', error);
      return [];
    }
  };

  const hydrometIcon = L.icon({
    iconUrl: hydrometIconImg,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });

  const renderHydrometStations = async (mapInstance) => {
    const stations = await fetchHydrometStations();

    stations.forEach((station) => {
      const lat = convertDMSToDecimalNo(station.ViDo);
      const lng = convertDMSToDecimalNo(station.KinhDo);

      if (lat == null || lng == null) {
        console.warn(`⚠️ Không thể chuyển tọa độ tại trạm ${station.TenTram}`);
        return;
      }

      const marker = L.marker([lat, lng], {
        icon: hydrometIcon,
        isHydrometStation: true, // Flag to identify hydromet markers
      }).addTo(mapInstance);

      marker.on('click', () => {
        marker
          .bindPopup(
            `
              <div class="popup-container">
                <div class="popup-header">${station.TenTam}</div>
                <div class="popup-content">
                  <div class="popup-row">
                    <span class="popup-label">Phân loại:</span>
                    <span class="popup-value">${station.PhanLoai}</span>
                  </div>
                  <div class="popup-row">
                    <span class="popup-label">Yếu tố:</span>
                    <span class="popup-value">${station.YeuTo}</span>
                  </div>
                  <div class="popup-row">
                    <span class="popup-label">Thời gian:</span>
                    <span class="popup-value">${station.ThoiGian}</span>
                  </div>
                  <div class="popup-row">
                    <span class="popup-label">Tần suất:</span>
                    <span class="popup-value">${station.TanSuat}</span>
                  </div>
                </div>
              </div>
            `
          )
          .openPopup();

        setSelectedStation({
          maTram: station.MaTram,
          tenTram: station.TenTram,
          thongTin: station,
        });
      });
    });
  };

  useEffect(() => {
    if (selectedLocation && mapRef.current) {
      mapRef.current.flyTo({
        center: [selectedLocation.lng, selectedLocation.lat],
        zoom: 12,
        speed: 1.2,
      });
    }
  }, [selectedLocation]);

  return (
    <>
      <div ref={mapContainer} id="mapContainer"></div>

      <MapDetails
        salinityData={salinityData}
        selectedPoint={selectedPoint}
        onOpenFullChart={() => setShowFullChart(true)}
        onClose={handleCloseDetails}
      />

      <SaltChartFull
        show={showFullChart}
        kiHieu={selectedPoint?.kiHieu}
        tenDiem={selectedPoint?.tenDiem}
        salinityData={salinityData}
        onClose={() => setShowFullChart(false)}
      />
    </>
  );
};

export default MapboxMap;
