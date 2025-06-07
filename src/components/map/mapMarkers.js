import L from "leaflet";

export const getSalinityIcon = () => {
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
