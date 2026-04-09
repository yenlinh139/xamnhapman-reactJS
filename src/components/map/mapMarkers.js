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
    meteorology: "#fd7e14",
    hydrology: "#198754",
    default: "#990000",
};

const resolveHydrometColor = (stationType = "") => {
    const normalizedType = String(stationType || "").toLowerCase();

    if (normalizedType.includes("mưa") || normalizedType.includes("rain")) {
        return HYDROMET_ICON_COLORS.rain;
    }
    if (normalizedType.includes("thủy văn") || normalizedType.includes("hydrology")) {
        return HYDROMET_ICON_COLORS.hydrology;
    }
    if (normalizedType.includes("khí tượng") || normalizedType.includes("meteorology")) {
        return HYDROMET_ICON_COLORS.meteorology;
    }

    return HYDROMET_ICON_COLORS.default;
};

export const getHydrometIcon = (stationType = "") => {
    const iconColor = resolveHydrometColor(stationType);

    return L.divIcon({
        className: "custom-hydromet-icon",
        html: `
            <span style="
                display:inline-block;
                width:14px;
                height:14px;
                border-radius:50%;
                background:${iconColor};
                border:2px solid #ffffff;
                box-shadow:0 0 0 1px rgba(0,0,0,0.25);
            "></span>
        `,
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
