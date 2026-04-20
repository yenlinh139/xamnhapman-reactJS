import L from "leaflet";
import { createBaseMaps, createWMSLayer } from "@components/map/mapStyles";

const LOCATION_CONSENT_MODAL_ID = "locationConsentModal";

const fallbackLocationConfirm = () => {
    return window.confirm(
        [
            "Hệ thống cần quyền vị trí để xác định vị trí thiết bị của bạn trên bản đồ.",
            "",
            "Ở hộp thoại trình duyệt tiếp theo:",
            "- Allow = Cho phép",
            "- Block = Từ chối",
            "",
            "Bạn có muốn tiếp tục không?",
        ].join("\n"),
    );
};

const shouldProceedWithLocationRequest = () => {
    const bootstrapModal = window.bootstrap?.Modal;
    if (!bootstrapModal || !document?.body) {
        return Promise.resolve(fallbackLocationConfirm());
    }

    const oldModal = document.getElementById(LOCATION_CONSENT_MODAL_ID);
    if (oldModal) {
        oldModal.remove();
    }

    return new Promise((resolve) => {
        const modalElement = document.createElement("div");
        modalElement.className = "modal fade";
        modalElement.id = LOCATION_CONSENT_MODAL_ID;
        modalElement.tabIndex = -1;
        modalElement.setAttribute("aria-hidden", "true");

        modalElement.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow">
                    <div class="modal-header">
                        <h5 class="modal-title">Cho phép truy cập vị trí</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button>
                    </div>
                    <div class="modal-body">
                        <p class="mb-2">Hệ thống cần quyền vị trí để xác định vị trí thiết bị của bạn trên bản đồ.</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-role="cancel">Hủy</button>
                        <button type="button" class="btn btn-primary" data-role="confirm">Tiếp tục</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modalElement);

        const modal = new bootstrapModal(modalElement, {
            backdrop: "static",
            keyboard: false,
        });

        let resolved = false;
        const finalize = (accepted) => {
            if (resolved) return;
            resolved = true;
            resolve(accepted);
        };

        modalElement.querySelector('[data-role="cancel"]')?.addEventListener("click", () => {
            finalize(false);
            modal.hide();
        });

        modalElement.querySelector('[data-role="confirm"]')?.addEventListener("click", () => {
            finalize(true);
            modal.hide();
        });

        modalElement.addEventListener("hidden.bs.modal", () => {
            finalize(false);
            modalElement.remove();
        });

        modal.show();
    });
};

const formatDistance = (meters) => {
    if (!Number.isFinite(meters)) return "0 m";
    if (meters >= 1000) {
        return `${(meters / 1000).toFixed(2).replace(".", ",")} km`;
    }
    return `${meters.toFixed(1).replace(".", ",")} m`;
};

const formatArea = (squareMeters) => {
    if (!Number.isFinite(squareMeters)) return "0 m²";
    if (squareMeters >= 1000000) {
        return `${(squareMeters / 1000000).toFixed(2).replace(".", ",")} km²`;
    }
    return `${squareMeters.toFixed(0).replace(".", ",")} m²`;
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

    const tooltipOptions = {
        permanent: true,
        direction: isPolygon ? "center" : "top",
        offset: isPolygon ? [0, 0] : [0, -6],
        opacity: 1,
        interactive: false,
        className: "leaflet-measure-tooltip",
    };

    const tooltipCenter = typeof layer.getBounds === "function" ? layer.getBounds().getCenter() : null;
    const existingTooltip = typeof layer.getTooltip === "function" ? layer.getTooltip() : null;

    if (existingTooltip) {
        existingTooltip.setContent(label);
        if (tooltipCenter) {
            existingTooltip.setLatLng(tooltipCenter);
        }
    } else {
        layer.bindTooltip(label, tooltipOptions);
        if (tooltipCenter && layer.getTooltip()) {
            layer.getTooltip().setLatLng(tooltipCenter);
        }
    }

    if (typeof layer.openTooltip === "function") {
        layer.openTooltip();
    }
};

const setMeasurementInteractionMode = (mapInstance, isActive) => {
    if (!mapInstance) return;

    const container = mapInstance.getContainer?.();
    if (container) {
        container.style.cursor = isActive ? "crosshair" : "";
    }

    ["scrollWheelZoom", "doubleClickZoom", "boxZoom"].forEach((handlerName) => {
        const handler = mapInstance[handlerName];
        if (!handler) return;

        if (isActive) {
            handler.disable();
        } else {
            handler.enable();
        }
    });
};

const formatIsoDateForDisplay = (isoDate) => {
    if (!isoDate) return "";
    const [year, month, day] = String(isoDate).split("-");
    if (!year || !month || !day) return "";
    return `${day}/${month}/${year}`;
};

const parseDisplayDateToIso = (text) => {
    const raw = String(text || "").trim();
    const matched = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!matched) return "";

    const [, dd, mm, yyyy] = matched;
    const day = Number(dd);
    const month = Number(mm);
    const year = Number(yyyy);
    const date = new Date(year, month - 1, day);

    if (
        Number.isNaN(date.getTime()) ||
        date.getDate() !== day ||
        date.getMonth() + 1 !== month ||
        date.getFullYear() !== year
    ) {
        return "";
    }

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const createDateInputComponentMarkup = ({ displayId, nativeId, placeholder = "dd/mm/yyyy" }) => {
    return `
                 <div class="legend-date-wrap" style="position: relative;">
                   <input
                     type="text"
                     id="${displayId}"
                     class="legend-date-input"
                     autocomplete="off"
                     inputmode="numeric"
                     placeholder="${placeholder}"
                   />
                   <input
                     type="date"
                     id="${nativeId}"
                     tabindex="-1"
                     aria-hidden="true"
                     style="position: absolute; inset: 0; opacity: 0; pointer-events: none;"
                   />
                 </div>
    `;
};

const initializeDateInputComponent = ({ displayInput, nativeInput, defaultIsoDate }) => {
    if (!displayInput || !nativeInput) return;

    nativeInput.value = defaultIsoDate;
    displayInput.value = formatIsoDateForDisplay(nativeInput.value);

    nativeInput.addEventListener("change", () => {
        displayInput.value = formatIsoDateForDisplay(nativeInput.value);
        displayInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const openPicker = () => {
        if (typeof nativeInput.showPicker === "function") {
            nativeInput.showPicker();
        }
    };

    displayInput.addEventListener("focus", openPicker);
    displayInput.addEventListener("click", openPicker);

    displayInput.addEventListener("blur", () => {
        const isoDate = parseDisplayDateToIso(displayInput.value);
        if (!isoDate) return;

        nativeInput.value = isoDate;
        displayInput.value = formatIsoDateForDisplay(isoDate);
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
                        ${createDateInputComponentMarkup({
                                displayId: "legend-date",
                                nativeId: "legend-date-native",
                        })}
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
            const nativeDateInput = document.getElementById("legend-date-native");
            initializeDateInputComponent({
                displayInput: dateInput,
                nativeInput: nativeDateInput,
                defaultIsoDate: "2025-03-08",
            });
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
                    toggleBtn.setAttribute("aria-label", collapsed ? "Mở chú giải" : "Thu gọn chú giải");
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
            preferCanvas: true,
            zoomSnap: 0.5,
            zoomDelta: 0.5,
            wheelPxPerZoomLevel: 140,
            wheelDebounceTime: 60,
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
    const locateControl = L.control
        .locate({
            position: "topleft",
            strings: {
                title: "Vị trí của tôi",
            },
            zoom: 15,
        })
        .addTo(mapInstance);

    const locateControlContainer = locateControl?.getContainer?.();
    const locateControlButton = locateControlContainer?.querySelector("a");

    if (locateControlButton) {
        let bypassNextLocateClick = false;
        let isLocationRequestPending = false;

        locateControlButton.addEventListener(
            "click",
            (event) => {
                if (bypassNextLocateClick) {
                    bypassNextLocateClick = false;
                    return;
                }

                event.preventDefault();
                event.stopImmediatePropagation();
                event.stopPropagation();

                if (isLocationRequestPending) {
                    return;
                }

                isLocationRequestPending = true;
                shouldProceedWithLocationRequest()
                    .then((accepted) => {
                        if (!accepted) {
                            return;
                        }

                        bypassNextLocateClick = true;
                        locateControlButton.click();
                    })
                    .finally(() => {
                        isLocationRequestPending = false;
                    });
            },
            true,
        );
    }

    // Add draw controls for measuring distance and area.
    const drawnItems = new L.FeatureGroup();
    mapInstance.addLayer(drawnItems);

    if (L.Control?.Draw) {
        if (L.drawLocal?.draw?.toolbar?.actions) {
            L.drawLocal.draw.toolbar.actions.title = "Hủy thao tác đo";
            L.drawLocal.draw.toolbar.actions.text = "Hủy";
        }
        if (L.drawLocal?.draw?.toolbar?.finish) {
            L.drawLocal.draw.toolbar.finish.title = "Hoàn tất phép đo";
            L.drawLocal.draw.toolbar.finish.text = "Hoàn tất";
        }
        if (L.drawLocal?.draw?.toolbar?.undo) {
            L.drawLocal.draw.toolbar.undo.title = "Xóa điểm vừa tạo";
            L.drawLocal.draw.toolbar.undo.text = "Xóa điểm cuối";
        }
        if (L.drawLocal?.draw?.toolbar?.buttons) {
            L.drawLocal.draw.toolbar.buttons.polyline = "Đo khoảng cách";
            L.drawLocal.draw.toolbar.buttons.polygon = "Đo diện tích";
        }
        if (L.drawLocal?.draw?.handlers?.polyline) {
            L.drawLocal.draw.handlers.polyline.error = "<strong>Lỗi:</strong> Đường đo không hợp lệ.";
            if (L.drawLocal.draw.handlers.polyline.tooltip) {
                L.drawLocal.draw.handlers.polyline.tooltip.start =
                    "Nhấp lên bản đồ để bắt đầu đo khoảng cách";
                L.drawLocal.draw.handlers.polyline.tooltip.cont = "Nhấp để thêm điểm tiếp theo";
                L.drawLocal.draw.handlers.polyline.tooltip.end =
                    "Nhấp điểm cuối hoặc chọn ‘Hoàn tất’ để kết thúc";
            }
        }
        if (L.drawLocal?.draw?.handlers?.polygon?.tooltip) {
            L.drawLocal.draw.handlers.polygon.tooltip.start = "Nhấp lên bản đồ để bắt đầu đo diện tích";
            L.drawLocal.draw.handlers.polygon.tooltip.cont = "Nhấp để tiếp tục thêm điểm cho vùng đo";
            L.drawLocal.draw.handlers.polygon.tooltip.end =
                "Nhấp vào điểm đầu hoặc chọn ‘Hoàn tất’ để đóng vùng";
        }
        if (L.drawLocal?.draw?.handlers?.simpleshape?.tooltip) {
            L.drawLocal.draw.handlers.simpleshape.tooltip.end = "Thả chuột để hoàn tất";
        }
        if (L.drawLocal?.edit?.toolbar?.buttons) {
            L.drawLocal.edit.toolbar.buttons.edit = "Chỉnh sửa vùng đo";
            L.drawLocal.edit.toolbar.buttons.editDisabled = "Không có vùng đo để chỉnh sửa";
            L.drawLocal.edit.toolbar.buttons.remove = "Xóa vùng đo";
            L.drawLocal.edit.toolbar.buttons.removeDisabled = "Không có vùng đo để xóa";
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
            L.drawLocal.edit.handlers.edit.tooltip.text = "Kéo các điểm để chỉnh sửa";
            L.drawLocal.edit.handlers.edit.tooltip.subtext = "Nhấn Lưu để áp dụng hoặc Thoát để hủy";
        }

        const drawControl = new L.Control.Draw({
            position: "topleft",
            draw: {
                polyline: {
                    shapeOptions: {
                        color: "#0d6efd",
                        weight: 4,
                        opacity: 0.95,
                        lineCap: "round",
                        lineJoin: "round",
                    },
                    metric: true,
                    feet: false,
                    nautic: false,
                    showLength: true,
                    guidelineDistance: 16,
                    repeatMode: false,
                },
                polygon: {
                    allowIntersection: true,
                    showArea: true,
                    metric: true,
                    guidelineDistance: 16,
                    shapeOptions: {
                        color: "#198754",
                        weight: 2,
                        opacity: 0.95,
                        lineJoin: "round",
                        fillOpacity: 0.18,
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

        const activateMeasurementMode = () => {
            setMeasurementInteractionMode(mapInstance, true);
        };

        const deactivateMeasurementMode = () => {
            setMeasurementInteractionMode(mapInstance, false);
        };

        const exitDrawModes = () => {
            // Disable any active draw/edit mode.
            drawControl?._toolbars?.draw?.disable();
            drawControl?._toolbars?.edit?.disable();
            deactivateMeasurementMode();
        };

        const onEscKey = (event) => {
            if (event.key === "Escape") {
                exitDrawModes();
            }
        };

        document.addEventListener("keydown", onEscKey);
        mapInstance.on("unload", () => {
            document.removeEventListener("keydown", onEscKey);
            deactivateMeasurementMode();
        });

        mapInstance.on(L.Draw.Event.DRAWSTART, activateMeasurementMode);
        mapInstance.on(L.Draw.Event.EDITSTART, activateMeasurementMode);
        mapInstance.on(L.Draw.Event.DELETESTART, activateMeasurementMode);

        mapInstance.on(L.Draw.Event.DRAWSTOP, deactivateMeasurementMode);
        mapInstance.on(L.Draw.Event.EDITSTOP, deactivateMeasurementMode);
        mapInstance.on(L.Draw.Event.DELETESTOP, deactivateMeasurementMode);
        mapInstance.on(L.Draw.Event.DELETED, deactivateMeasurementMode);

        mapInstance.on(L.Draw.Event.CREATED, (event) => {
            const { layer } = event;
            drawnItems.addLayer(layer);
            updateMeasurementTooltip(layer);
            deactivateMeasurementMode();
        });

        mapInstance.on(L.Draw.Event.EDITED, (event) => {
            event.layers.eachLayer((layer) => {
                updateMeasurementTooltip(layer);
            });
            deactivateMeasurementMode();
        });
    } else {
        console.warn("Leaflet.Draw chưa được nạp, bỏ qua control đo đạc.");
    }

    // Add zoom control
    L.control
        .zoom({
            position: "topleft",
            zoomInTitle: "Phóng to",
            zoomOutTitle: "Thu nhỏ",
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
