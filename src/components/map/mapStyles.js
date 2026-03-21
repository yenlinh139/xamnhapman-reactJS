import L from "leaflet";

export const layerStyles = {
    salinityPoints: {
        type: "point",
        color: "#003366",
        legend: `<div class="d-flex justify-content-center gap-3 mt-2 small">
                            <div class="d-flex align-items-center gap-1">
                                <div
                                    style="width: 12px; height: 12px; background-color: #28a745; border-radius: 2px;">
                                </div>
                                <span>Bình thường</span>
                            </div>
                            <div class="d-flex align-items-center gap-1">
                                <div
                                    style="width: 12px; height: 12px; background-color: #ffc107; border-radius: 2px;">
                                </div>
                                <span>Rủi ro cấp 1</span>
                            </div>
                            <div class="d-flex align-items-center gap-1">
                                <div
                                    style="width: 12px; height: 12px; background-color: #fd7e14; border-radius: 2px;">
                                </div>
                                <span>Rủi ro cấp 2</span>
                            </div>
                            <div class="d-flex align-items-center gap-1">
                                <div
                                    style="width: 12px; height: 12px; background-color: #dc3545; border-radius: 2px;">
                                </div>
                                <span>Rủi ro cấp 3</span>
                            </div>
                        </div>`,
    },
    hydrometStations: { type: "point", color: "#990000" },
    DiaPhanHuyen: { type: "polygon", color: "#FF7D31" },
    DiaPhanXa: { type: "polygon", color: "#BEB297" },
    ThuyHe_line: { type: "line", color: "#495cc8" },
    ThuyHe_polygon: { type: "polygon", color: "#3191f8" },
    HienTrangSDD_2020: {
        type: "polygon",
        legend: `
            <div style="margin-bottom: 8px;">
                <p style="margin: 0; font-weight: bold; font-size: 1.2em;">Hiện trạng sử dụng đất 2020</p>
            </div>
            <div style="margin-left: 10px; margin-bottom: 10px; font-size: 1em; max-height: 200px; overflow-y: auto;">
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 3px; font-size: 1em;">
                    <div><span style="display:inline-block;width:10px;height:10px;background:repeating-linear-gradient(90deg, transparent, transparent 2px, #000 2px, #000 3px);margin-right:3px;border:1px solid #000;"></span>BCS</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,80,70);margin-right:3px;border:1px solid #ccc;"></span>CAN</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,210,160);margin-right:3px;border:1px solid #ccc;"></span>CLN</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,100,80);margin-right:3px;border:1px solid #ccc;"></span>CQP</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,170,160);margin-right:3px;border:1px solid #ccc;"></span>DBV</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,170,160);margin-right:3px;border:1px solid #ccc;"></span>DDT</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,170,160);margin-right:3px;border:1px solid #ccc;"></span>DGD</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,170,50);margin-right:3px;border:1px solid #ccc;"></span>DGT</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,170,160);margin-right:3px;border:1px solid #ccc;"></span>DHT</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,170,160);margin-right:3px;border:1px solid #ccc;"></span>DKH</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,170,160);margin-right:3px;border:1px solid #ccc;"></span>DKV</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,170,160);margin-right:3px;border:1px solid #ccc;"></span>DNL</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(205,170,205);margin-right:3px;border:1px solid #ccc;"></span>DRA</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(170,255,255);margin-right:3px;border:1px solid #ccc;"></span>DTL</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,170,160);margin-right:3px;border:1px solid #ccc;"></span>DTT</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,170,160);margin-right:3px;border:1px solid #ccc;"></span>DVH</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,170,160);margin-right:3px;border:1px solid #ccc;"></span>DYT</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:repeating-linear-gradient(0deg, transparent, transparent 1px, #000 1px, #000 2px), repeating-linear-gradient(90deg, transparent, transparent 1px, #000 1px, #000 2px);margin-right:3px;border:2px solid #000;"></span>LMU</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,252,130);margin-right:3px;border:1px solid #ccc;"></span>LUA</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,252,140);margin-right:3px;border:1px solid #ccc;"></span>LUC</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(180,255,255);margin-right:3px;border:1px solid #ccc;"></span>MNC</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,255,100);margin-right:3px;border:1px solid #ccc;"></span>NNL</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(210,210,210);margin-right:3px;border:1px solid #ccc;"></span>NTD</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(170,255,255);margin-right:3px;border:1px solid #ccc;"></span>NTS</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,160,255);margin-right:3px;border:1px solid #ccc;"></span>ODT</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,208,255);margin-right:3px;border:1px solid #ccc;"></span>ONT</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,170,160);margin-right:3px;border:1px solid #ccc;"></span>PNK</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(110,255,100);margin-right:3px;border:1px solid #ccc;"></span>RDD</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(190,255,30);margin-right:3px;border:1px solid #ccc;"></span>RPH</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(180,255,180);margin-right:3px;border:1px solid #ccc;"></span>RSX</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(250,170,160);margin-right:3px;border:1px solid #ccc;"></span>SKC</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(250,170,160);margin-right:3px;border:1px solid #ccc;"></span>SKK</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(250,170,160);margin-right:3px;border:1px solid #ccc;"></span>SKN</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(160,255,255);margin-right:3px;border:1px solid #ccc;"></span>SON</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(250,170,160);margin-right:3px;border:1px solid #ccc;"></span>TMD</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,170,160);margin-right:3px;border:1px solid #ccc;"></span>TSC</div>
                </div>
            </div>
        `,
    },
    QuyHoachSDD_2030: {
        type: "polygon",
        legend: `
            <div style="margin-bottom: 8px;">
                <p style="margin: 0; font-weight: bold; font-size: 1.2em;">Quy hoạch sử dụng đất 2030</p>
            </div>    
            <div style="margin-left: 10px; margin-bottom: 10px; font-size: 1em; max-height: 200px; overflow-y: auto;">
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 3px; font-size: 1em;">
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,80,70);margin-right:3px;border:1px solid #ccc;"></span>CAN</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,210,160);margin-right:3px;border:1px solid #ccc;"></span>CLN</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,100,80);margin-right:3px;border:1px solid #ccc;"></span>CQP</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,255,254);margin-right:3px;border:1px solid #ccc;"></span>CSD</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,170,160);margin-right:3px;border:1px solid #ccc;"></span>DDT</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,170,160);margin-right:3px;border:1px solid #ccc;"></span>DGD</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,170,50);margin-right:3px;border:1px solid #ccc;"></span>DGT</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,170,160);margin-right:3px;border:1px solid #ccc;"></span>DHT</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(205,170,205);margin-right:3px;border:1px solid #ccc;"></span>DRA</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(170,255,255);margin-right:3px;border:1px solid #ccc;"></span>DTL</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,170,160);margin-right:3px;border:1px solid #ccc;"></span>DTT</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,170,160);margin-right:3px;border:1px solid #ccc;"></span>DVH</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,170,160);margin-right:3px;border:1px solid #ccc;"></span>DYT</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:repeating-linear-gradient(0deg, transparent, transparent 1px, #000 1px, #000 2px), repeating-linear-gradient(90deg, transparent, transparent 1px, #000 1px, #000 2px);margin-right:3px;border:2px solid #000;"></span>LMU</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,252,130);margin-right:3px;border:1px solid #ccc;"></span>LUA</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,252,140);margin-right:3px;border:1px solid #ccc;"></span>LUC</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,255,100);margin-right:3px;border:1px solid #ccc;"></span>NNL</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(210,210,210);margin-right:3px;border:1px solid #ccc;"></span>NTD</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(170,255,255);margin-right:3px;border:1px solid #ccc;"></span>NTS</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,160,255);margin-right:3px;border:1px solid #ccc;"></span>ODT</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,208,255);margin-right:3px;border:1px solid #ccc;"></span>ONT</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(255,170,160);margin-right:3px;border:1px solid #ccc;"></span>PNL</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(110,255,100);margin-right:3px;border:1px solid #ccc;"></span>RDD</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(190,255,30);margin-right:3px;border:1px solid #ccc;"></span>RPH</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(180,255,180);margin-right:3px;border:1px solid #ccc;"></span>RSX</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(250,170,160);margin-right:3px;border:1px solid #ccc;"></span>SKC</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(250,170,160);margin-right:3px;border:1px solid #ccc;"></span>SKK</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(250,170,160);margin-right:3px;border:1px solid #ccc;"></span>SKN</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(160,255,255);margin-right:3px;border:1px solid #ccc;"></span>SON</div>
                    <div><span style="display:inline-block;width:10px;height:10px;background:rgb(250,170,160);margin-right:3px;border:1px solid #ccc;"></span>TMD</div>
                </div>
            </div>
        `,
    },
    diemdocao: {
        type: "raster",
        legend: `
                        <div style="margin-left: 20px; margin-bottom: 10px; font-size: 1em;">
                            <div><span style="display:inline-block;width:12px;height:12px;background:#08306b;margin-right:5px;"></span>-20 – 0 m</div>
                            <div><span style="display:inline-block;width:12px;height:12px;background:#41ab5d;margin-right:5px;"></span>1 – 5 m</div>
                            <div><span style="display:inline-block;width:12px;height:12px;background:#ffff00;margin-right:5px;"></span>6 – 10 m</div>
                            <div><span style="display:inline-block;width:12px;height:12px;background:#fd8d3c;margin-right:5px;"></span>11 – 15 m</div>
                            <div><span style="display:inline-block;width:12px;height:12px;background:#e31a1c;margin-right:5px;"></span>16 – 35 m</div>
                        </div>
                    `,
    },
    GiaoThong_line: { type: "line", color: "#C43C39" },
    GiaoThong_polygon: { type: "polygon", color: "#E5B636" },
    // Công trình thủy lợi - Hiện trạng 2023
    CTTL_2023_Cong: { type: "point", color: "#2563eb" },
    CTTL_2023_DeBao_BoBao: { type: "line", color: "#dc2626" },
    CTTL_2023_KenhMuong: { type: "line", color: "#059669" },
    CTTL_2023_TramBom: { type: "point", color: "#7c3aed" },
    // Công trình thủy lợi - Quy hoạch 2030
    CTTL_2030_Vung_HeThong: { type: "line", color: "#0891b2" },
    CTTL_2030_NongThonMoi: { type: "line", color: "#65a30d" },
    CTTL_2030_NoiDong: { type: "line", color: "#ca8a04" },
    CTTL_2030_VungThuyLoi: { type: "polygon", color: "#0369a1" },
    iotStations: {
        type: "point",
        color: "#7c3aed",
        legend: `<div class="d-flex justify-content-center gap-3 mt-2 small">
                            <div class="d-flex align-items-center gap-1">
                                <div
                                    style="width: 12px; height: 12px; background-color: #28a745; border-radius: 2px;">
                                </div>
                                <span>Bình thường</span>
                            </div>
                            <div class="d-flex align-items-center gap-1">
                                <div
                                    style="width: 12px; height: 12px; background-color: #ffc107; border-radius: 2px;">
                                </div>
                                <span>Rủi ro cấp 1</span>
                            </div>
                            <div class="d-flex align-items-center gap-1">
                                <div
                                    style="width: 12px; height: 12px; background-color: #fd7e14; border-radius: 2px;">
                                </div>
                                <span>Rủi ro cấp 2</span>
                            </div>
                            <div class="d-flex align-items-center gap-1">
                                <div
                                    style="width: 12px; height: 12px; background-color: #dc3545; border-radius: 2px;">
                                </div>
                                <span>Rủi ro cấp 3</span>
                            </div>
                        </div>`,
    },
};

export const legendNames = {
    salinityPoints: "Điểm đo mặn",
    hydrometStations: "Trạm khí tượng thủy văn",
    DiaPhanHuyen: "Địa phận huyện",
    DiaPhanXa: "Địa phận xã",
    ThuyHe_line: "Thủy hệ 1 nét",
    ThuyHe_polygon: "Thủy hệ 2 nét",
    HienTrangSDD_2020: "Hiện trạng sử dụng đất 2020",
    QuyHoachSDD_2030: "Quy hoạch sử dụng đất 2030",
    diemdocao: "Độ cao (m)",
    GiaoThong_line: "Giao thông 1 nét",
    GiaoThong_polygon: "Giao thông 2 nét",
    // Công trình thủy lợi - Hiện trạng 2023
    CTTL_2023_Cong: "Cống",
    CTTL_2023_DeBao_BoBao: "Đê bao, bờ bao",
    CTTL_2023_KenhMuong: "Kênh mương",
    CTTL_2023_TramBom: "Trạm bơm",
    // Công trình thủy lợi - Quy hoạch 2030
    CTTL_2030_Vung_HeThong: "Công trình thủy lợi vùng, hệ thống",
    CTTL_2030_NongThonMoi: "Công trình nông thôn mới",
    CTTL_2030_NoiDong: "Công trình thủy lợi nhỏ, nội đồng",
    CTTL_2030_VungThuyLoi: "Vùng thủy lợi",
    iotStations: "Trạm IoT",
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
    return L.tileLayer.wms("https://xamnhapman.opengis.vn/m/gsrv/xamnhapman_tphcm/wms", {
        layers: `xamnhapman_tphcm:DiaGioiHCM`,
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
        const layerInfo = overlayLayers[layerName];
        const style = layerStyles[layerName] || {};
        const { type, color, colors } = style;

        let symbolHTML = "";
        // Skip creating symbol for QuyHoachSDD_2030, HienTrangSDD_2020 and diemdocao as they use custom legend handling
        if (layerName !== "QuyHoachSDD_2030" && layerName !== "HienTrangSDD_2020" && layerName !== "diemdocao") {
            if (layerName === "salinityPoints") {
                symbolHTML = `<i class="fa-solid fa-droplet" style="color: ${color}; margin-right: 5px;"></i>`;
            } else if (layerName === "hydrometStations") {
                symbolHTML = `<i class="fa-solid fa-tower-observation" style="color: ${color}; margin-right: 5px;"></i>`;
            } else if (layerName === "iotStations") {
                symbolHTML = `<i class="fa-solid fa-tower-broadcast" style="color: ${color}; margin-right: 5px;"></i>`;
            } else if (type === "point") {
                symbolHTML = `<span style="display:inline-block;width:10px;height:10px;background:${color};border-radius:50%;margin-right:5px;"></span>`;
            } else if (type === "line") {
                symbolHTML = `<span style="display:inline-block;width:20px;height:3px;background:${color};margin-right:5px;"></span>`;
            } else if (type === "polygon") {
                symbolHTML = `<span style="display:inline-block;width:12px;height:12px;background:${color};border:1px solid #333;margin-right:5px;"></span>`;
            } else if (type === "raster") {
                symbolHTML = `<span style="display:inline-block;width:12px;height:12px;background:linear-gradient(to right, ${colors?.join(', ')});margin-right:5px;"></span>`;
            } else {
                symbolHTML = `<span style="margin-right:5px;">📌</span>`;
            }
        }

        // Get layer name - either from layerInfo.name or legendNames fallback
        const layerDisplayName = layerInfo?.name || legendNames[layerName] || layerName;
        
        // Handle special cases for layers with custom legends
        if (layerName === "QuyHoachSDD_2030") {
            // QuyHoachSDD_2030: only show detailed legend without symbol
            if (style?.legend) {
                secondaryLegend.innerHTML += `${style.legend}`;
            }
        } else if (layerName === "HienTrangSDD_2020") {
            // HienTrangSDD_2020: only show detailed legend without symbol
            if (style?.legend) {
                secondaryLegend.innerHTML += `${style.legend}`;
            }
        } else if (layerName === "diemdocao") {
            // diemdocao: show mountain icon with name and detailed legend
            secondaryLegend.innerHTML += `<p><i class="fa-solid fa-mountain" style="color: #227200; margin-right: 5px;"></i><b>${layerDisplayName}</b></p>`;
            if (layerInfo?.legend) {
                secondaryLegend.innerHTML += `${layerInfo.legend}`;
            }
        } else {
            // All other layers: show symbol with name and optional detailed legend
            secondaryLegend.innerHTML += `<p>${symbolHTML}<b>${layerDisplayName}</b></p>`;
            
            // Add detailed legend if available
            if (style?.legend) {
                secondaryLegend.innerHTML += `${style.legend}`;
            }
        }
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
