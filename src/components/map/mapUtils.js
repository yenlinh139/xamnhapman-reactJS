import L from "leaflet";
import { convertDMSToDecimal } from "@components/convertDMSToDecimal";

export const handleLocationChange = (map, selectedLocation) => {
    if (!map || !selectedLocation) return;

    // Ưu tiên fitBounds nếu có
    if (selectedLocation.bounds) {
        map.fitBounds(selectedLocation.bounds);
        return;
    }

    // Kiểm tra lat/lng có hợp lệ không
    if (typeof selectedLocation.lat === "number" && typeof selectedLocation.lng === "number") {
        map.flyTo([selectedLocation.lat, selectedLocation.lng], selectedLocation.zoom || 12, {
            animate: true,
        });
    } else {
        console.warn("selectedLocation không hợp lệ:", selectedLocation);
    }
};

export const handleFeatureHighlight = (
    map,
    highlightedFeature,
    highlightedLayerRef,
    highlightedMarkerRef,
) => {
    if (!map) return;

    // Xóa lớp cũ nếu có
    if (highlightedLayerRef.current) {
        map.removeLayer(highlightedLayerRef.current);
        highlightedLayerRef.current = null;
    }
    if (highlightedMarkerRef.current) {
        map.removeLayer(highlightedMarkerRef.current);
        highlightedMarkerRef.current = null;
    }

    if (highlightedFeature) {
        if (highlightedFeature?.type === "Point") {
            // Tạo icon dựa trên loại icon được chỉ định
            let iconHtml = '<i class="fa-solid fa-droplet" style="color:#007bff; font-size:24px;"></i>';

            if (highlightedFeature.icon === "droplet") {
                iconHtml = '<i class="fa-solid fa-droplet" style="color:#007bff; font-size:24px;"></i>';
            } else if (highlightedFeature.icon === "marker") {
                iconHtml = '<i class="fa-solid fa-location-dot" style="color:#dc3545; font-size:24px;"></i>';
            }

            const customIcon = L.divIcon({
                html: iconHtml,
                className: "custom-highlight-marker",
                iconSize: [30, 30],
                iconAnchor: [15, 30],
                popupAnchor: [0, -30],
            });

            // Chuyển đổi tọa độ DMS thành decimal
            const coordinates = highlightedFeature.coordinates;

            // Làm sạch và chuyển đổi tọa độ
            const lngStr = coordinates[0].trim();
            const latStr = coordinates[1].trim();

            const lng = convertDMSToDecimal(lngStr);
            const lat = convertDMSToDecimal(latStr);

            if (!isNaN(lat) && !isNaN(lng) && lat !== null && lng !== null) {
                // Tạo marker với popup
                highlightedMarkerRef.current = L.marker([lat, lng], {
                    icon: customIcon,
                    zIndexOffset: 1000, // Đảm bảo marker hiển thị trên cùng
                }).addTo(map);

                // Thêm popup với thông tin
                const popupContent = `
          <div class="highlight-popup">
            <h4 style="margin: 0 0 8px 0; color: #007bff;">
              <i class="fa-solid fa-${highlightedFeature.icon || "droplet"}"></i>
              ${highlightedFeature.name || "Địa điểm"}
            </h4>
            <p style="margin: 0; font-size: 12px; color: #666;">
              <strong>Tọa độ:</strong><br>
              Kinh độ: ${lngStr}<br>
              Vĩ độ: ${latStr}
            </p>
          </div>
        `;

                highlightedMarkerRef.current.bindPopup(popupContent, {
                    offset: [0, -30],
                    className: "custom-highlight-popup",
                });

                // Bay đến vị trí với hiệu ứng mượt
                map.flyTo([lat, lng], 16, {
                    animate: true,
                    duration: 1.5,
                });

                // Tự động mở popup sau khi bay đến
                setTimeout(() => {
                    if (highlightedMarkerRef.current) {
                        highlightedMarkerRef.current.openPopup();
                    }
                }, 1000);
            } else {
                console.error("Không thể chuyển đổi tọa độ:", {
                    lngStr,
                    latStr,
                    lng,
                    lat,
                });
            }
        } else if (highlightedFeature?.geometry) {
            const geoJsonLayer = L.geoJSON(highlightedFeature.geometry, {
                style: {
                    color: "#ff0000",
                    weight: 10,
                    opacity: 1,
                    fillOpacity: 0.3,
                },
            }).addTo(map);

            highlightedLayerRef.current = geoJsonLayer;
            map.fitBounds(geoJsonLayer.getBounds());
        }
    }
};
