export const mapLayers = {
    title: "HIỂN THỊ LỚP DỮ LIỆU",
    items: [
        {
            icon: "fa-solid fa-map",
            name: "Địa giới hành chính",
            layers: ["DiaPhanHuyen", "DiaPhanXa"],
            nameItem: ["Địa phận huyện", "Địa phận xã"],
        },
        {
            icon: "fa-solid fa-mountain",
            name: "Địa hình",
            layers: ["DiemDoCao"],
            nameItem: ["Điểm độ cao"],
        },
        {
            icon: "fa-solid fa-water",
            name: "Thủy hệ",
            layers: ["ThuyHe_line", "ThuyHe_polygon"],
            nameItem: ["Sông, kênh", "Mặt nước"],
        },
        {
            icon: "fa-solid fa-road",
            name: "Giao thông",
            layers: ["GiaoThong_line", "GiaoThong_polygon"],
            nameItem: ["Đường", "Vùng"],
        },
        {
            icon: "fa-solid fa-landmark",
            name: "Quy hoạch đất",
            layers: ["HienTrangSDD_2020", "QuyHoachSDD_2030"],
            nameItem: ["Hiện trạng 2020", "Quy hoạch 2030"],
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
