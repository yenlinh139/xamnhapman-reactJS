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
        {
            icon: "fa-solid fa-tree",
            name: "Sử dụng đất",
            layers: ["HienTrangSDD_2020", "QuyHoachSDD_2030"],
            nameItem: ["Hiện trạng sử dụng đất 2020", "Quy hoạch sử dụng đất 2030"],
        },
        {
            icon: "fa-solid fa-location-dot",
            name: "Mô hình độ cao số",
            layer: "diemdocao",
        },
        {
            icon: "fa-solid fa-road",
            name: "Giao thông",
            layers: ["GiaoThong_line", "GiaoThong_polygon"],
            nameItem: ["Giao thông 1 nét", "Giao thông 2 nét"],
        },  
    ],
};

export const irrigationLayers = {
    title: "CÔNG TRÌNH THỦY LỢI",
    items: [
        {
            icon: "fa-solid fa-calendar-check",
            name: "Hiện trạng 2023",
            layers: ["CTTL_2023_Cong", "CTTL_2023_DeBao_BoBao", "CTTL_2023_KenhMuong", "CTTL_2023_TramBom"],
            nameItem: ["Cống", "Đê bao, bờ bao", "Kênh mương", "Trạm bơm"],
        },
        {
            icon: "fa-solid fa-calendar-days",
            name: "Quy hoạch 2030",
            layers: ["CTTL_2030_Vung_HeThong", "CTTL_2030_NongThonMoi", "CTTL_2030_NoiDong", "CTTL_2030_VungThuyLoi"],
            nameItem: ["Công trình thủy lợi vùng, hệ thống", "Công trình nông thôn mới", "Công trình thủy lợi nhỏ, nội đồng", "Vùng thủy lợi"],
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
