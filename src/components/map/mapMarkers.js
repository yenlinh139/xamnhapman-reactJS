import L from "leaflet";

export const getSalinityIcon = (salinity) => {
    let color = "#6c757d";

    if (salinity < 1) color = "blue";
    else if (salinity < 4) color = "#fd7e14";
    else color = "#dc3545";

    return L.divIcon({
        className: "custom-salinity-icon",
        html: `
      <i class="fa-solid fa-droplet glow-icon" style="color: ${color}; font-size: 1.5rem;"></i>
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
