import L from 'leaflet';
import { createBaseMaps, createWMSLayer } from './mapStyles';

export const createLegendControl = () => {
  const legendContainer = L.control({ position: 'topright' });

  legendContainer.onAdd = () => {
    const div = L.DomUtil.create('div');
    div.innerHTML = `
      <div class="legend-container" id="legend-container">
        <div class="legend-header">
          <h4 class="legend-title">
            <i class="legend-icon">📊</i>
            Bảng chú thích
          </h4>
          <button class="legend-toggle" id="legend-toggle">
            <span class="toggle-icon">−</span>
          </button>
        </div>
        
        <div class="legend-content" id="legend-content">
          <div class="legend-search">
            <label for="legend-date" class="legend-search__label">
              <i class="search-icon">🗓️</i>
              Thời gian thống kê:
            </label>
            <input type="date" id="legend-date" class="legend-date-input" 
                   placeholder="Chọn ngày thống kê" />
          </div>
          
          <div class="legend-divider"></div>
          
          <div class="legend-layers">
            <h5 class="legend-section-title">Tổng quan dữ liệu</h5>
            <div class="legend-primary" id="legend-primary">
              <!-- Dynamic layer content will be inserted here -->
            </div>
          </div>
          
          <div class="legend-summary" id="legend-summary" style="display: none;">
            <h5 class="legend-section-title">Lớp dữ liệu hiển thị</h5>
            <div class="legend-secondary" id="legend-secondary">
              <!-- Dynamic summary content will be inserted here -->
            </div>
          </div>
        </div>
      </div>
    `;

    // Add toggle functionality
    setTimeout(() => {
      const toggleBtn = document.getElementById('legend-toggle');
      const content = document.getElementById('legend-content');
      const toggleIcon = toggleBtn?.querySelector('.toggle-icon');

      if (toggleBtn && content && toggleIcon) {
        toggleBtn.addEventListener('click', () => {
          const isCollapsed = content.style.display === 'none';
          content.style.display = isCollapsed ? 'block' : 'none';
          toggleIcon.textContent = isCollapsed ? '−' : '+';
          toggleBtn.setAttribute('aria-expanded', isCollapsed.toString());
        });
      }
    }, 100);

    return div;
  };

  return legendContainer;
};

export const initializeMap = (container) => {
  const mapInstance = L.map(container, {
    center: [10.747890979236143, 106.74911060545153],
    zoom: 10,
    zoomControl: false,
  });

  const baseMaps = createBaseMaps();
  const overlayMaps = {};

  // Add default base layer
  baseMaps['Google Satellite'].addTo(mapInstance);

  // Add WMS layer
  const wmsLayer = createWMSLayer();
  wmsLayer.addTo(mapInstance);

  // Add legend control
  const legendControl = createLegendControl();
  legendControl.addTo(mapInstance);

  // Add layer control
  const layerControl = L.control
    .layers(baseMaps, overlayMaps, { position: 'bottomright' })
    .addTo(mapInstance);

  // Add locate control
  L.control
    .locate({
      position: 'topleft',
      strings: {
        title: 'Vị trí của tôi',
      },
    })
    .addTo(mapInstance);

  // Add zoom control
  L.control
    .zoom({
      position: 'topleft',
    })
    .addTo(mapInstance);

  return { mapInstance, layerControl, overlayMaps };
};
