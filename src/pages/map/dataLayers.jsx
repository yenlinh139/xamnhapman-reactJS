export const menusGIS = [
    {
        title: "DỮ LIỆU NỀN ĐỊA LÝ",
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
        ],
    },
    {
        title: "HỆ THỐNG THỦY VĂN",
        items: [
            {
                icon: "fa-solid fa-water",
                name: "Thủy hệ tự nhiên",
                layers: ["ThuyHe_line", "ThuyHe_polygon"],
                nameItem: ["Sông, kênh (đường)", "Mặt nước (vùng)"],
            },
        ],
    },
    {
        title: "GIAO THÔNG & CƠ SỞ HẠ TẦNG",
        items: [
            {
                icon: "fa-solid fa-road",
                name: "Mạng lưới giao thông",
                layers: ["GiaoThong_line", "GiaoThong_polygon"],
                nameItem: ["Đường", "Vùng"],
            },
        ],
    },
    {
        title: "Sử dụng đất",
        items: [
            {
                icon: "fa-solid fa-landmark",
                name: "Quy hoạch sử dụng đất",
                layers: ["HienTrangSDD_2020", "QuyHoachSDD_2030"],
                nameItem: ["2020", "2030"],
            },
        ],
    },
];

export const nameToCodeSalt = {
    CauRachTra: "CRT",
    CauThuThiem: "CTT",
    CauOngThin: "COT",
    CongKenhC: "CKC",
    "KenhXang-AnHa": "KXAH",
    MuiNhaBe: "MNB",
    PhaCatLai: "PCL",
};
