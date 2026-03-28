import L from "leaflet";
import { createBaseMaps, createWMSLayer } from "@components/map/mapStyles";

const formatDistance = (meters) => {
  if (!Number.isFinite(meters)) return "0 m";
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${meters.toFixed(1)} m`;
};

const formatArea = (squareMeters) => {
  if (!Number.isFinite(squareMeters)) return "0 m²";
  if (squareMeters >= 1000000) {
    return `${(squareMeters / 1000000).toFixed(2)} km²`;
  }
  return `${squareMeters.toFixed(0)} m²`;
};

const updateMeasurementTooltip = (layer) => {
  if (!layer || typeof layer.getLatLngs !== "function") return;

  // Polygon extends Polyline, so polygon must be checked first.
  const isPolygon = layer instanceof L.Polygon;
  const isPolyline = layer instanceof L.Polyline;
  if (!isPolygon && !isPolyline) return;

  let label = "";

  if (isPolygon) {
    const latlngs = layer.getLatLngs();
    const ring = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
    const area = L.GeometryUtil.geodesicArea(ring);
    label = `Diện tích: ${formatArea(area)}`;
  } else {
    const latlngs = layer.getLatLngs();
    let distance = 0;

    for (let i = 1; i < latlngs.length; i++) {
      distance += latlngs[i - 1].distanceTo(latlngs[i]);
    }

    label = `Khoảng cách: ${formatDistance(distance)}`;
  }

  layer.bindTooltip(label, {
    permanent: true,
    direction: "center",
    className: "leaflet-measure-tooltip",
  });
};

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
              <span>Chọn ngày quan trắc</span>
            </div>
            <input type="date" id="legend-date" class="legend-date-input" 
                   placeholder="Chọn ngày thống kê" />
          </div>
          
          <div class="legend-section">
            <h5 class="legend-section-title">Số liệu quan trắc</h5>
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
            <h5 class="legend-section-title">Chú giải</h5>
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
          // Handle date input with dd/mm/yyyy format and default value
          const dateInput = document.getElementById("legend-date");
          if (dateInput) {
            // Use fixed ISO string to avoid timezone shift (UTC conversion can subtract one day)
            const isoDate = "2025-03-08";
            dateInput.value = isoDate;

            // Format display as dd/mm/yyyy
            const formatDateDisplay = (isoDateStr) => {
              if (!isoDateStr) return '';
              const [year, month, day] = isoDateStr.split('-');
              return `${day}/${month}/${year}`;
            };

            // Create a wrapper to show formatted date
            const dateWrapper = dateInput.parentElement;
            const dateDisplay = document.createElement('div');
            dateDisplay.style.cssText = `
              font-size: 13px;
              color: #6c757d;
              margin-top: 4px;
              font-weight: 500;
            `;
            
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
    baseMaps["Google Streets"].addTo(mapInstance);

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
            zoom: 15,
        })
        .addTo(mapInstance);

    // Add draw controls for measuring distance and area.
    const drawnItems = new L.FeatureGroup();
    mapInstance.addLayer(drawnItems);

    if (L.Control?.Draw) {
        if (L.drawLocal?.draw?.toolbar?.buttons) {
            L.drawLocal.draw.toolbar.buttons.polyline = "Đo khoảng cách";
            L.drawLocal.draw.toolbar.buttons.polygon = "Đo diện tích";
        }
        if (L.drawLocal?.edit?.toolbar?.buttons) {
            L.drawLocal.edit.toolbar.buttons.edit = "Chỉnh sửa vùng đo";
            L.drawLocal.edit.toolbar.buttons.remove = "Xóa vùng đo";
        }

      if (L.drawLocal?.draw?.toolbar?.actions) {
        L.drawLocal.draw.toolbar.actions.title = "Hủy thao tác vẽ";
        L.drawLocal.draw.toolbar.actions.text = "Hủy";
      }
      if (L.drawLocal?.edit?.toolbar?.actions) {
        L.drawLocal.edit.toolbar.actions.save.title = "Lưu thay đổi";
        L.drawLocal.edit.toolbar.actions.save.text = "Lưu";
        L.drawLocal.edit.toolbar.actions.cancel.title = "Thoát chế độ chỉnh sửa/xóa";
        L.drawLocal.edit.toolbar.actions.cancel.text = "Thoát";
        L.drawLocal.edit.toolbar.actions.clearAll.title = "Xóa toàn bộ vùng đo";
        L.drawLocal.edit.toolbar.actions.clearAll.text = "Xóa tất cả";
      }

      if (L.drawLocal?.edit?.handlers?.remove?.tooltip) {
        L.drawLocal.edit.handlers.remove.tooltip.text = "Nhấn vào đối tượng để xóa";
      }
      if (L.drawLocal?.edit?.handlers?.edit?.tooltip) {
        L.drawLocal.edit.handlers.edit.tooltip.text = "Kéo điểm để chỉnh sửa";
        L.drawLocal.edit.handlers.edit.tooltip.subtext =
          "Nhấn Lưu để áp dụng hoặc Thoát để hủy";
      }

        const drawControl = new L.Control.Draw({
            position: "topleft",
            draw: {
                polyline: {
                    shapeOptions: {
                        color: "#0d6efd",
                        weight: 3,
                    },
                    metric: true,
                    feet: false,
                    nautic: false,
                    showLength: true,
                    repeatMode: false,
                },
                polygon: {
                    allowIntersection: false,
                    showArea: true,
                    metric: true,
                    shapeOptions: {
                        color: "#198754",
                        weight: 2,
                        fillOpacity: 0.2,
                    },
                    repeatMode: false,
                },
                rectangle: false,
                circle: false,
                marker: false,
                circlemarker: false,
            },
            edit: {
                featureGroup: drawnItems,
                edit: {
                    selectedPathOptions: {
                        color: "#2563eb",
                        dashArray: "8, 6",
                        fillOpacity: 0.2,
                        maintainColor: false,
                    },
                },
                remove: {},
            },
        });
        mapInstance.addControl(drawControl);

        const exitDrawModes = () => {
          // Disable any active draw/edit mode.
          drawControl?._toolbars?.draw?.disable();
          drawControl?._toolbars?.edit?.disable();
        };

        const onEscKey = (event) => {
          if (event.key === "Escape") {
            exitDrawModes();
          }
        };

        document.addEventListener("keydown", onEscKey);
        mapInstance.on("unload", () => {
          document.removeEventListener("keydown", onEscKey);
        });

        mapInstance.on(L.Draw.Event.CREATED, (event) => {
            const { layer } = event;
            drawnItems.addLayer(layer);
            updateMeasurementTooltip(layer);
        });

        mapInstance.on(L.Draw.Event.EDITED, (event) => {
            event.layers.eachLayer((layer) => {
                updateMeasurementTooltip(layer);
            });
        });
    } else {
        console.warn("Leaflet.Draw chưa được nạp, bỏ qua control đo đạc.");
    }

    // Add zoom control
    L.control
        .zoom({
            position: "topleft",
        })
        .addTo(mapInstance);

    // Add scale control.
    L.control
        .scale({
            position: "bottomleft",
            metric: true,
            imperial: false,
            maxWidth: 140,
            updateWhenIdle: true,
        })
        .addTo(mapInstance);

    return { mapInstance, layerControl, overlayMaps };
};
