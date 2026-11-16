import React, { useState } from "react";

// Bảng toạ độ (kinh độ/vĩ độ) của các điểm/trạm đang quản lý trong tab này - hiển thị LUÔN bên
// cạnh bộ lọc (không chỉ có trong file xuất GeoJSON), để biết ngay từng điểm/trạm nằm ở đâu.
// `stations`: [{ code, name, longitude, latitude }] - longitude/latitude giữ nguyên dạng lưu trong
// DB (độ-phút-giây, vd 106°39'19.13"E), giống hệt cách các popup bản đồ đang hiển thị.
const StationCoordinatesTable = ({ stations, title = "Toạ độ các điểm/trạm" }) => {
    const [collapsed, setCollapsed] = useState(false);
    if (!stations || stations.length === 0) return null;

    return (
        <div className="station-coordinates-table mb-3">
            <button
                type="button"
                className="station-coordinates-toggle"
                onClick={() => setCollapsed((prev) => !prev)}
                aria-expanded={!collapsed}
            >
                <i className="fas fa-map-marker-alt me-1"></i>
                {title} ({stations.length})
                <i className={`fas fa-chevron-${collapsed ? "down" : "up"} ms-2`}></i>
            </button>

            {!collapsed && (
                <div className="table-responsive">
                    <table className="table table-sm table-bordered mb-0 bg-white">
                        <thead className="table-light">
                            <tr>
                                <th>Mã</th>
                                <th>Tên điểm/trạm</th>
                                <th>Kinh độ</th>
                                <th>Vĩ độ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stations.map((station) => (
                                <tr key={station.code}>
                                    <td>{station.code}</td>
                                    <td>{station.name}</td>
                                    <td>{station.longitude || "-"}</td>
                                    <td>{station.latitude || "-"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default StationCoordinatesTable;
