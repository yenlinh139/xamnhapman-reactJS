export const mapLayers = {
    title: "DỮ LIỆU NỀN",
    items: [
        {
            name: "Hành chính",
            layers: ["DiaPhanHuyen", "DiaPhanXa"],
            nameItem: ["Địa phận huyện", "Địa phận xã"],
        },
        {
            name: "Địa hình",
            layers: ["DiemDoCao", "", "DEM"],
            nameItem: ["Điểm độ cao", "Mặt cắt địa hình", "Mô hình độ cao số"],
        },
        {
            name: "Giao thông",
            layers: ["GiaoThong_line", "GiaoThong_polygon"],
            nameItem: ["Giao thông 1 nét", "Giao thông 2 nét"],
        },
        {
            name: "Thủy hệ",
            layers: ["ThuyHe_line", "ThuyHe_polygon"],
            nameItem: ["Thủy hệ 1 nét", "Thủy hệ 2 nét"],
        },
        {
            name: "Sử dụng đất",
            layers: ["HienTrangSDD_2020", "QuyHoachSDD_2030"],
            nameItem: ["Hiện trạng sử dụng đất 2020", "Quy hoạch sử dụng đất 2030"],
        },
    ],
};

export const irrigationLayers = {
    title: "CÔNG TRÌNH THỦY LỢI",
    items: [
        {
            name: "Hồ chứa thượng lưu",
            layers: ["HoChuaThuongLuu"],
            nameItem: ["Hồ chứa thượng lưu"],
        },
        {
            name: "Hiện trạng 2023",
            layers: ["CTTL_2023_Cong", "CTTL_2023_DeBao_BoBao", "CTTL_2023_KenhMuong", "CTTL_2023_TramBom"],
            nameItem: ["Cống", "Đê bao, bờ bao", "Kênh mương", "Trạm bơm"],
        },
        {
            name: "Quy hoạch 2030",
            layers: [
                "CTTL_2030_Vung_HeThong",
                "CTTL_2030_NongThonMoi",
                "CTTL_2030_NoiDong",
                "CTTL_2030_VungThuyLoi",
            ],
            nameItem: [
                "Công trình thủy lợi vùng, hệ thống",
                "Công trình nông thôn mới",
                "Công trình thủy lợi nhỏ, nội đồng",
                "Vùng thủy lợi",
            ],
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
