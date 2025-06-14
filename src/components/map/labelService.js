import L from "leaflet";
import axiosInstance from "../../config/axios-config";

// Hàm để lấy thông tin các huyện từ GeoServer
export const getDistrictLabels = async () => {
    try {
        const response = await fetch(
            "http://localhost:8080/geoserver/xamnhapman_tphcm/ows?" +
                "service=WFS&version=1.0.0&request=GetFeature&typeName=xamnhapman_tphcm:DiaPhanHuyen&outputFormat=application/json",
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        return data.features.map((feature) => ({
            name: feature.properties.tenhuyen,
            code: feature.properties.mahuyen,
            coordinates: feature.geometry.coordinates,
            type: feature.geometry.type,
            centroid: calculateCentroid(feature.geometry),
        }));
    } catch (error) {
        console.error("Error fetching district labels:", error);
        return [];
    }
};

// Hàm để lấy thông tin các xã từ GeoServer
export const getCommuneLabels = async () => {
    try {
        const response = await fetch(
            "http://localhost:8080/geoserver/xamnhapman_tphcm/ows?" +
                "service=WFS&version=1.0.0&request=GetFeature&typeName=xamnhapman_tphcm:DiaPhanXa&outputFormat=application/json",
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        return data.features.map((feature) => ({
            name: feature.properties.tenxa,
            code: feature.properties.maxa,
            district: feature.properties.tenhuyen,
            coordinates: feature.geometry.coordinates,
            type: feature.geometry.type,
            centroid: calculateCentroid(feature.geometry),
        }));
    } catch (error) {
        console.error("Error fetching commune labels:", error);
        return [];
    }
};

// Hàm tính toán centroid của polygon/multipolygon
const calculateCentroid = (geometry) => {
    try {
        if (geometry.type === "Polygon") {
            const coords = geometry.coordinates[0];
            return calculatePolygonCentroid(coords);
        } else if (geometry.type === "MultiPolygon") {
            // Với MultiPolygon, lấy polygon lớn nhất
            let largestPolygon = null;
            let largestArea = 0;

            geometry.coordinates.forEach((polygon) => {
                const area = calculatePolygonArea(polygon[0]);
                if (area > largestArea) {
                    largestArea = area;
                    largestPolygon = polygon[0];
                }
            });

            return largestPolygon ? calculatePolygonCentroid(largestPolygon) : null;
        }
        return null;
    } catch (error) {
        console.error("Error calculating centroid:", error);
        return null;
    }
};

// Hàm tính centroid của polygon
const calculatePolygonCentroid = (coordinates) => {
    let x = 0;
    let y = 0;
    let area = 0;

    for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
        const xi = coordinates[i][0];
        const yi = coordinates[i][1];
        const xj = coordinates[j][0];
        const yj = coordinates[j][1];

        const a = xi * yj - xj * yi;
        x += (xi + xj) * a;
        y += (yi + yj) * a;
        area += a;
    }

    area *= 0.5;
    x /= 6 * area;
    y /= 6 * area;

    return [y, x]; // Return as [lat, lng] for Leaflet
};

// Hàm tính diện tích polygon
const calculatePolygonArea = (coordinates) => {
    let area = 0;
    for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
        const xi = coordinates[i][0];
        const yi = coordinates[i][1];
        const xj = coordinates[j][0];
        const yj = coordinates[j][1];
        area += xi * yj - xj * yi;
    }
    return Math.abs(area) * 0.5;
};

// Hàm tạo style cho label marker
export const createLabelMarker = (name, type = "district") => {
    const className = type === "district" ? "district-label" : "commune-label";
    const fontSize = type === "district" ? "12px" : "10px";
    const fontWeight = type === "district" ? "600" : "500";
    const backgroundColor = type === "district" ? "rgba(177, 133, 160, 0.8)" : "rgba(192, 179, 144, 0.8)";

    // Tính toán kích thước ước lượng của label để căn chỉnh vị trí
    const estimatedWidth = name.length * (type === "district" ? 8 : 7); // Ước lượng độ rộng
    const estimatedHeight = type === "district" ? 20 : 18; // Ước lượng chiều cao

    // Điều chỉnh vị trí anchor để dịch về bên trái
    const leftOffset = estimatedWidth * 0.6; // Dịch về bên trái 60% độ rộng
    const topOffset = estimatedHeight * 0.5; // Căn giữa theo chiều dọc

    return L.divIcon({
        html: `<div class="${className}" style="
            color: black;
            padding: 2px 6px;
            font-size: ${fontSize};
            font-weight: ${fontWeight};
            text-align: center;
            white-space: nowrap;
            text-shadow:
                -1px -1px 0 white,
                1px -1px 0 white,
                -1px  1px 0 white,
                1px  1px 0 white;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            pointer-events: none;
        ">${name}</div>`,
        className: "label-marker",
        iconSize: [estimatedWidth, estimatedHeight],
        iconAnchor: [leftOffset, topOffset], // Dịch về bên trái và căn giữa dọc
    });
};
