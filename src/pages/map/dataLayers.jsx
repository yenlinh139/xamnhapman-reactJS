export const mapLayers = {
    title: "DỮ LIỆU NỀN",
    items: [
        {
            icon: "fa-solid fa-map",
            name: "Hành chính",
            layers: ["DiaPhanHuyen", "DiaPhanXa"],
            nameItem: ["Địa phận huyện", "Địa phận xã"],
        },
        {
            icon: "fa-solid fa-water",
            name: "Thủy văn",
            layers: ["ThuyHe_line", "ThuyHe_polygon"],
            nameItem: ["Thủy hệ 1 nét", "Thủy hệ 2 nét"],
        },
    ],
};

export const nameToCodeSalt = {
    CauRachTra: "CRT",
    CauThuThiem: "CTT",
    CauOngThin: "COT",
    CongKenhC: "CKC",
    "KenhXang-AnHa": "KXAH",
    MuiNhaBe: "MNB",
    PhaCatLai: "PCL",
};
