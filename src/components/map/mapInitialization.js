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
      <div class="legend-container legend-stats-container" id="legend-container">
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
            <input type="text" id="legend-date" class="legend-date-input"
                   placeholder="dd/mm/yyyy" maxlength="10" autocomplete="off" />
          </div>

          <div class="legend-section">
            <h6 class="legend-section-title">Số liệu quan trắc</h6>
            <div class="legend-layers">
              <div class="legend-primary" id="legend-primary">
                <div class="empty-state">
                  <i class="fas fa-calendar-day"></i>
                  <p>Chọn ngày để xem dữ liệu</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.disableScrollPropagation(div);

        setTimeout(() => {
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

            const dateInput = document.getElementById("legend-date");
            if (dateInput) {
                dateInput.value = "08/03/2025";
                dateInput.addEventListener("input", (e) => {
                    let v = e.target.value.replace(/\D/g, "").slice(0, 8);
                    if (v.length > 4) v = v.slice(0, 2) + "/" + v.slice(2, 4) + "/" + v.slice(4);
                    else if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
                    e.target.value = v;
                });
            }
        }, 100);

        return div;
    };

    return legendContainer;
};

export const createExplanationControl = () => {
    const explanationControl = L.control({ position: "bottomright" });

    explanationControl.onAdd = () => {
        const div = L.DomUtil.create("div");
        div.innerHTML = `
      <div class="legend-container legend-explanation-container" id="legend-explanation-container" >
        <button
          type="button"
          class="legend-header legend-header-button"
          id="legend-explanation-toggle"
          aria-label="Thu gọn chú giải"
          aria-expanded="true"
        >
          <div class="legend-title-section">
            <i class="legend-icon fas fa-layer-group"></i>
            <h4 class="legend-title">CHÚ GIẢI</h4>
          </div>
          <span class="legend-toggle explanation-toggle" aria-hidden="true">
            <span class="toggle-icon">−</span>
          </span>
        </button>

        <div class="legend-content legend-content-static" id="legend-explanation-content">
          <div class="legend-section legend-section-compact">
            <div class="legend-summary" id="legend-summary">
              <div class="legend-secondary" id="legend-secondary">
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

        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.disableScrollPropagation(div);

        setTimeout(() => {
            const container = document.getElementById("legend-explanation-container");
            const toggleBtn = document.getElementById("legend-explanation-toggle");
            const content = document.getElementById("legend-explanation-content");
            const toggleIcon = toggleBtn?.querySelector(".toggle-icon");
            const toggleControl = toggleBtn?.querySelector(".explanation-toggle");

            if (container && toggleBtn && content && toggleIcon && toggleControl) {
                const setCollapsed = (collapsed) => {
                    container.classList.toggle("is-collapsed", collapsed);
                    content.style.display = collapsed ? "none" : "block";
                    toggleIcon.textContent = "−";
                    toggleControl.style.display = collapsed ? "none" : "flex";
                    toggleBtn.setAttribute("aria-expanded", String(!collapsed));
                    toggleBtn.setAttribute(
                        "aria-label",
                        collapsed ? "Mở chú giải" : "Thu gọn chú giải",
                    );
                };

                setCollapsed(false);
                toggleBtn.addEventListener("click", () => {
                    const collapsed = container.classList.contains("is-collapsed");
                    setCollapsed(!collapsed);
                });
            }
        }, 0);

        return div;
    };

    return explanationControl;
};

export const initializeMap = (container) => {
    if (!container) {
        console.error("Map initialization skipped: container is not available");
        return { mapInstance: null };
    }

    let mapInstance;
    try {
        mapInstance = L.map(container, {
            center: [10.747890979236143, 106.74911060545153],
            zoom: 10,
            zoomControl: false,
        });
    } catch (error) {
        console.error("Map initialization failed:", error);
        return { mapInstance: null };
    }

    const baseMaps = createBaseMaps();
    const defaultBaseMapName = "Google Streets";

    // Add default base layer
    baseMaps[defaultBaseMapName].addTo(mapInstance);

    // Add WMS layer
    const wmsLayer = createWMSLayer();
    wmsLayer.addTo(mapInstance);

    // Add statistic/search panel and separate legend panel.
    const legendControl = createLegendControl();
    legendControl.addTo(mapInstance);

    const explanationControl = createExplanationControl();
    explanationControl.addTo(mapInstance);

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

    return {
        mapInstance,
        baseMaps,
        defaultBaseMapName,
        wmsLayer,
        overlayMaps: {},
    };
};
