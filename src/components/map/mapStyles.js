import L from "leaflet";

export const layerStyles = {
    salinityPoints: { type: "point", color: "#003366" },
    hydrometStations: { type: "point", color: "#990000" },
    DiaPhanHuyen: { type: "polygon", color: "#b185a0" },
    DiaPhanXa: { type: "polygon", color: "#c0b390" },
    ThuyHe_line: { type: "line", color: "#495cc8" },
    ThuyHe_polygon: { type: "polygon", color: "#3191f8" },
};

export const legendNames = {
    salinityPoints: "Điểm đo mặn",
    hydrometStations: "Trạm khí tượng thủy văn",
    DiaPhanHuyen: "Địa phận huyện",
    DiaPhanXa: "Địa phận xã",
    ThuyHe_line: "Thủy hệ 1 nét",
    ThuyHe_polygon: "Thủy hệ 2 nét",
};

export const createBaseMaps = () => {
    return {
        "Google Streets": L.tileLayer("https://mt1.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}", {
            maxZoom: 20,
            attribution: "© Google",
        }),

        "Google Satellite": L.tileLayer("https://mt1.google.com/vt/lyrs=y&hl=vi&x={x}&y={y}&z={z}", {
            maxZoom: 20,
            attribution: "© Google",
        }),

        "Esri Imagery": L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            { maxZoom: 20, attribution: "Map tiles by Esri" },
        ),
    };
};

export const createWMSLayer = () => {
    return L.tileLayer.wms("http://localhost:8080/geoserver/xamnhapman_tphcm/wms", {
        layers: `xamnhapman_tphcm:DiaGioiHuyen`,
        transparent: true,
        format: "image/png",
        version: "1.1.1",
        info_format: "text/html",
        attribution: "GeoServer",
    });
};

export const updateLegendVisibility = (overlayLayers) => {
    const legendDiv = document.querySelector(".legend-container");
    const secondaryLegend = document.querySelector(".legend-secondary");

    if (!legendDiv || !secondaryLegend) return;

    legendDiv.style.display = "block";
    secondaryLegend.style.display = "block";
    secondaryLegend.innerHTML = "";

    Object.keys(overlayLayers).forEach((layerName) => {
        const style = layerStyles[layerName] || {};
        const { type, color } = style;

        let symbolHTML = "";
        if (layerName === "salinityPoints") {
            symbolHTML = `<i class="fa-solid fa-droplet" style="color: ${color}; margin-right: 5px;"></i>`;
        } else if (layerName === "hydrometStations") {
            symbolHTML = `<i class="fa-solid fa-tower-observation" style="color: ${color}; margin-right: 5px;"></i>`;
        } else if (type === "point") {
            symbolHTML = `<span style="display:inline-block;width:10px;height:10px;background:${color};border-radius:50%;margin-right:5px;"></span>`;
        } else if (type === "line") {
            symbolHTML = `<span style="display:inline-block;width:20px;height:3px;background:${color};margin-right:5px;"></span>`;
        } else if (type === "polygon") {
            symbolHTML = `<span style="display:inline-block;width:12px;height:12px;background:${color};border:1px solid #333;margin-right:5px;"></span>`;
        } else {
            symbolHTML = `<span style="margin-right:5px;">📌</span>`;
        }

        secondaryLegend.innerHTML += `<p>${symbolHTML}<b>${legendNames[layerName] || layerName}</b></p>`;
    });
};

export const prefixUnitMap = () => ({
    R: { content: "Lượng mưa", donvi: "(mm)" },
    Ttb: { content: "Nhiệt độ không khí trung bình", donvi: "(°C)" },
    Tx: { content: "Nhiệt độ không khí cao nhất", donvi: "(°C)" },
    Tm: { content: "Nhiệt độ không khí thấp nhất", donvi: "(°C)" },
    Htb: { content: "Mực nước trung bình", donvi: "(cm)" },
    Hx: { content: "Mực nước cao nhất", donvi: "(cm)" },
    Hm: { content: "Mực nước thấp nhất", donvi: "(cm)" },
});
