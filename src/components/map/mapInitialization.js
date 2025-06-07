import L from "leaflet";
import { createBaseMaps, createWMSLayer } from "@components/map/mapStyles";

export const createLegendControl = () => {
    const legendContainer = L.control({ position: "topright" });

    legendContainer.onAdd = () => {
        const div = L.DomUtil.create("div");
        div.innerHTML = `
      <div class="legend-container" id="legend-container">
        <div class="legend-header">
          <div class="legend-title-section">
            <i class="legend-icon fas fa-chart-bar"></i>
            <h4 class="legend-title">THỐNG KÊ DỮ LIỆU</h4>
          </div>
          <button class="legend-toggle" id="legend-toggle" aria-label="Thu gọn bảng điều khiển">
            <span class="toggle-icon">−</span>
          </button>
        </div>
        
        <div class="legend-content" id="legend-content">
          <div class="legend-search">
            <div class="search-header">
              <i class="search-icon fas fa-calendar-alt"></i>
              <span>Lọc dữ liệu theo ngày</span>
            </div>
            <input type="date" id="legend-date" class="legend-date-input" 
                   placeholder="Chọn ngày thống kê" />
          </div>
          
          <div class="legend-section">
            <h5 class="legend-section-title">Dữ liệu trạm</h5>
            <div class="legend-layers">
              <div class="legend-primary" id="legend-primary">
                <!-- Dynamic data content will be inserted here -->
                <div class="empty-state">
                  <i class="fas fa-calendar-day"></i>
                  <p>Chọn ngày để xem dữ liệu</p>
                </div>
              </div>
            </div>
          </div>
          
          <div class="legend-section">
            <h5 class="legend-section-title">Lớp hiển thị</h5>
            <div class="legend-summary" id="legend-summary">
              <div class="legend-secondary" id="legend-secondary">
                <!-- Dynamic layer content will be inserted here -->
                <div class="empty-state">
                  <i class="fas fa-layer-group"></i>
                  <p>Chưa có lớp dữ liệu được chọn</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

        // Add toggle functionality
        setTimeout(() => {
            // Toggle expand/collapse functionality
            const toggleBtn = document.getElementById("legend-toggle");
            const content = document.getElementById("legend-content");
            const toggleIcon = toggleBtn?.querySelector(".toggle-icon");

            if (toggleBtn && content && toggleIcon) {
                toggleBtn.addEventListener("click", () => {
                    const isCollapsed = content.style.display === "none";
                    content.style.display = isCollapsed ? "block" : "none";
                    toggleIcon.textContent = isCollapsed ? "−" : "+";
                    toggleBtn.setAttribute("aria-expanded", isCollapsed.toString());
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
    baseMaps["Google Satellite"].addTo(mapInstance);

    // Add WMS layer
    const wmsLayer = createWMSLayer();
    wmsLayer.addTo(mapInstance);

    // Add legend control
    const legendControl = createLegendControl();
    legendControl.addTo(mapInstance);

    // Add layer control
    const layerControl = L.control
        .layers(baseMaps, overlayMaps, { position: "bottomright" })
        .addTo(mapInstance);

    // Add locate control
    L.control
        .locate({
            position: "topleft",
            strings: {
                title: "Vị trí của tôi",
            },
        })
        .addTo(mapInstance);

    // Add zoom control
    L.control
        .zoom({
            position: "topleft",
        })
        .addTo(mapInstance);

    return { mapInstance, layerControl, overlayMaps };
};
