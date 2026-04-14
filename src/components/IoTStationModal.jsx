import React, { useState, useEffect } from "react";
import { fetchIoTStations } from "./map/mapDataServices";

const IoTStationModal = ({ isOpen, onClose, onSubmit }) => {
    const [selectedStation, setSelectedStation] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [loading, setLoading] = useState(false);
    const [stations, setStations] = useState([]);
    const [loadingStations, setLoadingStations] = useState(false);

    // Load stations when modal opens
    useEffect(() => {
        if (isOpen) {
            loadStations();
        }
    }, [isOpen]);

    const loadStations = async () => {
        setLoadingStations(true);
        try {
            const stationsResponse = await fetchIoTStations();
            if (stationsResponse.success && stationsResponse.data) {
                setStations(stationsResponse.data);
            }
        } catch (error) {
            console.error("Error fetching IoT stations:", error);
            setStations([]);
        } finally {
            setLoadingStations(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedStation || !startDate || !endDate) {
            alert("Vui lòng điền đầy đủ thông tin!");
            return;
        }

        setLoading(true);
        try {
            // Tìm station theo serial_number thay vì serial
            const station = stations.find((s) => s.serial_number === selectedStation);
            const result = await onSubmit(station, startDate, endDate);

            // Chỉ đóng modal và hiển thị UI khi có dữ liệu thành công
            if (result && result.success) {
                handleClose();
            } else {
                // Hiển thị thông báo khi không có dữ liệu
                alert(result?.message || "Không có dữ liệu trong khoảng thời gian đã chọn!");
            }
        } catch (error) {
            console.error("Error fetching IoT data:", error);
            alert("Có lỗi xảy ra khi lấy dữ liệu!");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSelectedStation("");
        setStartDate("");
        setEndDate("");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content iot-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        <i className="fa-solid fa-tower-broadcast"></i>
                        Chọn Trạm IoT
                    </h3>
                    <button type="button" className="modal-close-btn" onClick={handleClose}>
                        <i className="fa-solid fa-times"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-group">
                        <label htmlFor="station-select" className="form-label">
                            <i className="fa-solid fa-tower-broadcast"></i>
                            Chọn trạm:
                        </label>
                        <select
                            id="station-select"
                            className="form-control"
                            value={selectedStation}
                            onChange={(e) => setSelectedStation(e.target.value)}
                            required
                            disabled={loadingStations}
                        >
                            <option value="">
                                {loadingStations ? "Đang tải..." : "-- Chọn trạm IoT --"}
                            </option>
                            {stations.map((station) => (
                                <option key={station.id} value={station.serial_number}>
                                    {station.station_name} ({station.serial_number || "Chưa có serial"}) -{" "}
                                    {station.total_records} bản ghi
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="start-date" className="form-label">
                            <i className="fa-solid fa-calendar-days"></i>
                            Ngày bắt đầu:
                        </label>
                        <input
                            type="date"
                            id="start-date"
                            className="form-control"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="end-date" className="form-label">
                            <i className="fa-solid fa-calendar-days"></i>
                            Ngày kết thúc:
                        </label>
                        <input
                            type="date"
                            id="end-date"
                            className="form-control"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={startDate}
                            required
                        />
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleClose}
                            disabled={loading}
                        >
                            Hủy
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin"></i>
                                    Đang tải...
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-download"></i>
                                    Lấy dữ liệu
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default IoTStationModal;
