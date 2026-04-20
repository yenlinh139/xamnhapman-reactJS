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
    const isPoint = highlightedFeature?.geometry?.type === "Point";
    const coordinates = isPoint ? highlightedFeature?.geometry?.coordinates : null;

    const name = highlightedFeature?.name || highlightedFeature?.properties?.name || "Địa điểm";

    const iconType = highlightedFeature?.icon || "droplet";
    const popupHtml = highlightedFeature?.popupHtml;

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

        const iconMap = {
            marker: { icon: "location-dot", color: "#dc3545" },
            droplet: { icon: "droplet", color: "#007bff" },
            "cloud-rain": { icon: "cloud-rain", color: "#16a34a" },
            "tower-broadcast": { icon: "tower-broadcast", color: "#f59e0b" },
            water: { icon: "water", color: "#0ea5e9" },
            router: { icon: "tower-broadcast", color: "#f59e0b" },
        };
        const markerConfig = iconMap[iconType] || iconMap.droplet;
        const iconHtml = `<i class="fa-solid fa-${markerConfig.icon}" style="color:${markerConfig.color}; font-size:24px;"></i>`;

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
        highlightedMarkerRef.current.bindPopup(
            popupHtml ||
                `
                <div class="highlight-popup">
                    <h4 style="margin:0 0 8px;color:${markerConfig.color};">
                        <i class="fa-solid fa-${markerConfig.icon}"></i> ${name}
                    </h4>
                    <p style="font-size:12px;color:#666;margin:0">
                        <strong>Tọa độ:</strong><br>
                        Kinh độ: ${lng.toFixed(6).replace(".", ",")}<br>
                        Vĩ độ: ${lat.toFixed(6).replace(".", ",")}
                    </p>
                </div>
            `,
            {
                maxWidth: 360,
                className: popupHtml ? "custom-popup search-highlight-popup" : "custom-popup",
            },
        );

        map.flyTo([lat, lng], 15, { animate: true });
        setTimeout(() => {
            if (highlightedMarkerRef.current) {
                highlightedMarkerRef.current.openPopup();
            }
        }, 1000);
    }
    // Nếu là Polygon hoặc MultiPolygon
    else if (["Polygon", "MultiPolygon"].includes(highlightedFeature?.geometry?.type)) {
        try {
            const geoJsonLayer = L.geoJSON(highlightedFeature, {
                style: {
                    color: "red",
                    weight: 3,
                    fillColor: "transparent",
                    fillOpacity: 0,
                },
            }).addTo(map);

            highlightedLayerRef.current = geoJsonLayer;

            const bounds = geoJsonLayer.getBounds();

            if (bounds.isValid()) {
                map.fitBounds(bounds);
            } else {
                console.warn("Bounds invalid, possibly because geometry is a Point.");
            }
        } catch (err) {
            console.error("❌ Lỗi render polygon:", err);
        }
    }
};
