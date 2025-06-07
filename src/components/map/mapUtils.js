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
    if (!map) {
        console.warn("⛔ Map chưa khởi tạo");
        return;
    }

    // Clear previous highlights
    if (highlightedLayerRef.current) {
        map.removeLayer(highlightedLayerRef.current);
        highlightedLayerRef.current = null;
    }
    if (highlightedMarkerRef.current) {
        map.removeLayer(highlightedMarkerRef.current);
        highlightedMarkerRef.current = null;
    }

    if (!highlightedFeature) {
        return;
    }
    highlightedFeature ? console.log(`highlightedFeature:`, highlightedFeature) : null;

    const isPoint = highlightedFeature?.geometry?.type === "Point";
    const coordinates = isPoint ? highlightedFeature?.geometry?.coordinates : null;

    const name = highlightedFeature?.name || highlightedFeature?.properties?.name || "Địa điểm";

    const iconType = highlightedFeature?.icon || "droplet";

    if (isPoint && Array.isArray(coordinates)) {
        let [lng, lat] = coordinates;

        if (typeof lng === "string" || typeof lat === "string") {
            lng = convertDMSToDecimal(lng);
            lat = convertDMSToDecimal(lat);
        } else {
            lng = parseFloat(lng);
            lat = parseFloat(lat);
        }

        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            console.error("❌ Tọa độ không hợp lệ:", { lat, lng, coordinates });
            return;
        }

        const iconHtml =
            iconType === "marker"
                ? '<i class="fa-solid fa-location-dot" style="color:#dc3545; font-size:24px;"></i>'
                : '<i class="fa-solid fa-droplet" style="color:#007bff; font-size:24px;"></i>';

        const customIcon = L.divIcon({
            html: iconHtml,
            className: "custom-highlight-marker",
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40],
        });

        highlightedMarkerRef.current = L.marker([lat, lng], {
            icon: customIcon,
            zIndexOffset: 1000,
        }).addTo(map);
        console.log("✅ Marker đã add vào map", highlightedMarkerRef.current);
        highlightedMarkerRef.current.bindPopup(`
            <div class="highlight-popup">
                <h4 style="margin:0 0 8px;color:#007bff;">
                    <i class="fa-solid fa-${iconType}"></i> ${name}
                </h4>
                <p style="font-size:12px;color:#666;margin:0">
                    <strong>Tọa độ:</strong><br>
                    Kinh độ: ${lng.toFixed(6)}<br>
                    Vĩ độ: ${lat.toFixed(6)}
                </p>
            </div>
        `);

        map.flyTo([lat, lng], 15, { animate: true });
        setTimeout(() => {
            if (highlightedMarkerRef.current) {
                highlightedMarkerRef.current.openPopup();
            }
        }, 1000);
    }
    // Nếu là Polygon hoặc MultiPolygon
    else if (highlightedFeature?.geometry?.type?.includes("MultiPolygon")) {
        try {
            const geoJsonLayer = L.geoJSON(highlightedFeature, {
                style: {
                    color: "red",
                    weight: 3,
                    fillOpacity: 0.2,
                },
            }).addTo(map);

            highlightedLayerRef.current = geoJsonLayer;

            const bounds = geoJsonLayer.getBounds();

            if (bounds.isValid()) {
                console.log("✅ Bounds hợp lệ, zoom tới vùng này.");
                map.fitBounds(bounds);
            } else {
                console.warn("Bounds invalid, possibly because geometry is a Point.");
            }
        } catch (err) {
            console.error("❌ Lỗi render polygon:", err);
        }
    }
};
