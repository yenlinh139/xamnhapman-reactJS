import { createLayerPopupContent, WMS_POPUP_TITLES } from "@components/map/wmsPopupTemplates";
import {
    ADMIN_LAYER_LEVELS,
    ADMIN_SUMMARY_ERROR_HTML,
    ADMIN_SUMMARY_LOADING_HTML,
    buildAdministrativeSummaryHtml,
    fetchAdministrativeSummary,
} from "@components/map/administrativeSummary";

L.TileLayer.BetterWMS = L.TileLayer.WMS.extend({
    isDiemDoCaoLayer: function (layerName) {
        return layerName === "DiemDoCao";
    },

    // Khi thêm lớp vào bản đồ
    onAdd: function (map) {
        L.TileLayer.WMS.prototype.onAdd.call(this, map);
        map.on("click", this.getFeatureInfo, this);
    },

    // Khi bỏ lớp khỏi bản đồ
    onRemove: function (map) {
        L.TileLayer.WMS.prototype.onRemove.call(this, map);
        map.off("click", this.getFeatureInfo, this);
    },

    // Gửi yêu cầu GetFeatureInfo
    getFeatureInfo: function (evt) {
        var url = this.getFeatureInfoUrl(evt.latlng);
        var showResults = L.Util.bind(this.showGetFeatureInfo, this);
        var layerName = this.wmsParams.layers.split(":")[1];

        fetch(url)
            .then((res) => {
                const contentType = res.headers.get("content-type") || "";
                return res.text().then((text) => ({ text, contentType, status: res.status }));
            })
            .then((result) => {
                showResults(null, evt.latlng, result);
            })
            .catch((error) => {
                if (this.isDiemDoCaoLayer(layerName)) {
                    console.error("[DiemDoCao API] GetFeatureInfo error", {
                        layerName,
                        error,
                    });
                }
                showResults(error);
            });
    },

    // Tạo URL GetFeatureInfo
    getFeatureInfoUrl: function (latlng) {
        var point = this._map.latLngToContainerPoint(latlng, this._map.getZoom());
        var size = this._map.getSize();
        const width = Math.max(Math.round(size.x), 1);
        const height = Math.max(Math.round(size.y), 1);
        const safeX = Math.max(0, Math.min(Math.floor(point.x), width - 1));
        const safeY = Math.max(0, Math.min(Math.floor(point.y), height - 1));
        const version = this.wmsParams.version || "1.1.1";

        var params = {
            request: "GetFeatureInfo",
            service: "WMS",
            srs: "EPSG:4326",
            styles: this.wmsParams.styles || "", // Đảm bảo có giá trị hợp lệ
            transparent: this.wmsParams.transparent ?? true, // Giữ được cả giá trị false
            version,
            format: "image/png", // Định dạng hình ảnh
            bbox: this._map.getBounds().toBBoxString(),
            height,
            width,
            layers: this.wmsParams.layers,
            query_layers: this.wmsParams.layers,
            info_format: "application/json", // Định dạng trả về JSON
        };

        // Chọn đúng tham số `x` và `y` hoặc `i` và `j` dựa trên phiên bản
        if (params.version === "1.3.0") {
            params.crs = "EPSG:4326";
            delete params.srs;
            params.i = safeX;
            params.j = safeY;
        } else {
            params.x = safeX;
            params.y = safeY;
        }

        // Trả về URL với các tham số GET
        return this._url + L.Util.getParamString(params, this._url, true);
    },

    // Hiển thị kết quả GetFeatureInfo
    showGetFeatureInfo: function (err, latlng, responseData) {
        if (err) {
            console.log("Error:", err);
            return;
        }

        const content = responseData?.text ?? "";
        const contentType = responseData?.contentType ?? "";

        try {
            const contentTrimmed = String(content).trim();
            const looksLikeXmlOrHtml = contentTrimmed.startsWith("<");
            const canParseJson = contentType.includes("application/json") || contentTrimmed.startsWith("{");

            if (!contentTrimmed) {
                return;
            }

            if (!canParseJson || looksLikeXmlOrHtml) {
                const xmlErrorMessage = this.extractXmlErrorMessage(contentTrimmed);
                const requestUrl = this.getFeatureInfoUrl(latlng);
                const requestParams = new URL(requestUrl).searchParams;
                const pixelX = requestParams.get("x") ?? requestParams.get("i");
                const pixelY = requestParams.get("y") ?? requestParams.get("j");

                console.warn("GetFeatureInfo trả về không phải JSON", {
                    contentType,
                    version: this.wmsParams.version || "1.1.1",
                    pixelX,
                    pixelY,
                    sample: contentTrimmed.slice(0, 180),
                    message: xmlErrorMessage,
                });

                if (xmlErrorMessage) {
                    L.popup()
                        .setLatLng(latlng)
                        .setContent(
                            `<div style="padding: 8px 10px; font-size: 13px; color: #475569;">${xmlErrorMessage}</div>`,
                        )
                        .openOn(this._map);
                }
                return;
            }

            const featureInfo = JSON.parse(content);
            const feature = featureInfo?.features?.[0];
            const props = feature?.properties;

            if (!props) return;

            const layerName = this.wmsParams.layers.split(":")[1];

            const popupContent = createLayerPopupContent(layerName, props);

            const adminLevel = ADMIN_LAYER_LEVELS[layerName];
            const adminCode = adminLevel === "huyen" ? props.maHuyen : props.maXa;
            if (adminLevel && adminCode) {
                this.showAdministrativePopup(latlng, popupContent, feature, adminLevel, adminCode);
                return;
            }

            L.popup().setLatLng(latlng).setContent(popupContent).openOn(this._map);
        } catch (e) {
            console.log("Lỗi khi xử lý dữ liệu JSON:", e);
        }
    },

    // Popup huyện/xã: thông tin cơ bản + số liệu tóm tắt các trạm trong địa bàn, kèm khoanh vùng ranh giới
    showAdministrativePopup: function (latlng, baseContent, feature, level, code) {
        const map = this._map;
        const container = document.createElement("div");
        container.innerHTML = `${baseContent}<div data-admin-summary style="padding: 0 14px 12px;">${ADMIN_SUMMARY_LOADING_HTML}</div>`;
        const summaryBox = container.querySelector("[data-admin-summary]");

        const popup = L.popup({ maxWidth: 460, maxHeight: Math.max(260, map.getSize().y - 140) })
            .setLatLng(latlng)
            .setContent(container)
            .openOn(map);

        const firstCoordinate = feature?.geometry?.coordinates?.flat?.(Infinity)?.[0];
        const highlight =
            Number.isFinite(firstCoordinate) && Math.abs(firstCoordinate) <= 180
                ? L.geoJSON(feature, {
                      interactive: false,
                      style: { color: "#ff6b00", weight: 3, fillColor: "#ff6b00", fillOpacity: 0.08 },
                  }).addTo(map)
                : null;
        if (highlight) {
            popup.on("remove", () => map.removeLayer(highlight));
        }

        fetchAdministrativeSummary(level, code)
            .then((summary) => {
                summaryBox.innerHTML = buildAdministrativeSummaryHtml(summary);
            })
            .catch((error) => {
                console.error("Lỗi tải số liệu tóm tắt đơn vị hành chính:", error);
                summaryBox.innerHTML = ADMIN_SUMMARY_ERROR_HTML;
            })
            .finally(() => {
                if (map.hasLayer(popup)) popup.update();
            });
    },

    extractXmlErrorMessage: function (xmlText) {
        try {
            if (!xmlText || !xmlText.startsWith("<")) {
                return "";
            }

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");

            const parserError = xmlDoc.querySelector("parsererror");
            if (parserError) {
                return "Phản hồi GetFeatureInfo không đúng định dạng JSON.";
            }

            const exceptionNode =
                xmlDoc.querySelector("ServiceException") ||
                xmlDoc.querySelector("ExceptionText") ||
                xmlDoc.querySelector("ows\\:ExceptionText");

            if (exceptionNode?.textContent) {
                return exceptionNode.textContent.trim();
            }

            return "Dữ liệu truy vấn không ở định dạng JSON.";
        } catch (_error) {
            return "Không thể đọc phản hồi từ máy chủ WMS.";
        }
    },
});

// Hàm tạo lớp BetterWMS
L.tileLayer.betterWms = function (url, options) {
    return new L.TileLayer.BetterWMS(url, options);
};
