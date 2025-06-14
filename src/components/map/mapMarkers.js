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
                iconColor = "#ffc107"; // Yellow
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
              <i class="fa-solid fa-droplet glow-icon" style="color: #003366; font-size: 1.5rem;"></i>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -10],
    });
};

export const getHydrometIcon = () => {
    return L.divIcon({
        className: "custom-hydromet-icon",
        html: `<i class="fa-solid fa-tower-observation" style="color: red; font-size: 1.5rem;"></i>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
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
