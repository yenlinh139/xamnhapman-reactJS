import React from "react";
import { getSingleStationClassification } from "@common/salinityClassification";

export const RISK_COLOR_MAP = {
    normal: "#28a745", // Xanh lá - Bình thường
    warning: "#ffc107", // Vàng - Rủi ro cấp 1
    "high-warning": "#ff8c00", // Cam - Rủi ro cấp 2
    critical: "#dc3545", // Đỏ - Rủi ro cấp 3
    "no-data": "#6c757d",
};

// Ngưỡng phân cấp rủi ro dùng chung cho mọi trạm (xem common/salinityClassification.js)
export const RISK_THRESHOLD_LOW = 1; // ‰
export const RISK_THRESHOLD_HIGH = 4; // ‰

// Chú giải 3 cấp rủi ro theo đúng ngưỡng của trạm hiện tại (Nhà Bè có ngưỡng khác các trạm còn lại
// - xem common/salinityClassification.js): tính bằng cách lấy phân loại tại 1 giá trị đại diện cho
// mỗi vùng (0.5‰, 2‰, >4‰) nên luôn khớp với logic tô màu ở cả biểu đồ dự báo lẫn quan trắc, không
// cần khai báo lại thủ công.
const SalinityRiskLegend = ({ kiHieu, className = "" }) => {
    const items = [
        getSingleStationClassification(0.5, kiHieu),
        getSingleStationClassification(2, kiHieu),
        getSingleStationClassification(RISK_THRESHOLD_HIGH + 1, kiHieu),
    ];

    return (
        <div
            className={`d-flex flex-wrap justify-content-center align-items-center gap-3 small mb-2 w-100 ${className}`}
        >
            {items.map((item) => (
                <span key={item.class} className="d-inline-flex align-items-center gap-1">
                    <span
                        style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            backgroundColor: RISK_COLOR_MAP[item.class],
                            display: "inline-block",
                        }}
                    />
                    <span className="text-muted">{item.description}</span>
                </span>
            ))}
        </div>
    );
};

export default SalinityRiskLegend;
