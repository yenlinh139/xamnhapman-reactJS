import L from "leaflet";
import { getSingleStationClassification } from "../../common/salinityClassification";

export const getSalinityIcon = (value = null, stationCode = null) => {
    let iconColor = "#6c757d"; // Default gray for no data

    if (value !== null && value !== "NULL" && !isNaN(parseFloat(value))) {
        const classification = getSingleStationClassification(value, stationCode);
        switch (classification.level) {
            case "normal":
                iconColor = "#28a745"; // Green
                break;
            case "warning":
                iconColor = "#ffe600"; // Yellow
                break;
            case "high-warning":
                iconColor = "#fd7e14"; // Orange
                break;
            case "critical":
                iconColor = "#dc3545"; // Red
                break;
            default:
                iconColor = "#6c757d"; // Gray
        }
    }

    return L.divIcon({
        className: "custom-salinity-icon",
        html: `
              <i class="fa-solid fa-droplet glow-icon" style="color: ${iconColor}; font-size: 1.5rem; "></i>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -10],
    });
};

const HYDROMET_ICON_COLORS = {
    rain: "#0d6efd",
    meteorology: "#000000",
    hydrology: "#0d6efd",
    default: "#990000",
};

const resolveHydrometIconType = (stationType = "") => {
    const normalizedType = String(stationType || "").toLowerCase();

    if (normalizedType.includes("mưa") || normalizedType.includes("rain")) {
        return "rain";
    }
    if (normalizedType.includes("thủy văn") || normalizedType.includes("hydrology")) {
        return "hydrology";
    }
    if (normalizedType.includes("khí tượng") || normalizedType.includes("meteorology")) {
        return "meteorology";
    }

    return "default";
};

const resolveHydrometColor = (stationType = "") => {
    const iconType = resolveHydrometIconType(stationType);
    return HYDROMET_ICON_COLORS[iconType] || HYDROMET_ICON_COLORS.default;
};

export const getHydrometIcon = (stationType = "") => {
    const iconType = resolveHydrometIconType(stationType);
    const iconColor = resolveHydrometColor(stationType);
    const triangleDirection = iconType === "hydrology" ? "down" : "up";

    const markerShapeHtml =
        iconType === "meteorology" || iconType === "hydrology"
            ? `
            <span style="
                display:inline-block;
                width:16px;
                height:16px;
                background:${iconColor};
                clip-path:polygon(50% 0%, 0% 100%, 100% 100%);
                transform:${triangleDirection === "down" ? "rotate(180deg)" : "none"};
                border:2px solid #ffffff;
                box-shadow:0 0 0 1px rgba(0,0,0,0.25);
            "></span>
        `
            : `
            <span style="
                display:inline-block;
                width:14px;
                height:14px;
                border-radius:50%;
                background:${iconColor};
                border:2px solid #ffffff;
                box-shadow:0 0 0 1px rgba(0,0,0,0.25);
            "></span>
        `;

    return L.divIcon({
        className: "custom-hydromet-icon",
        html: markerShapeHtml,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        popupAnchor: [0, -10],
    });
};

export const getHighlightedMarkerIcon = () => {
    return L.divIcon({
        html: '<i class="fa-solid fa-droplet" style="color:blue; font-size:24px;"></i>',
        className: "",
        iconSize: [24, 24],
        iconAnchor: [12, 24],
    });
};
