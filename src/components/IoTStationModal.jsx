import React, { useState, useEffect, useMemo } from "react";
import { fetchIoTStations } from "./map/mapDataServices";

const toIsoDateOnly = (value) => {
    if (!value) return "";

    const raw = String(value).trim();
    if (!raw) return "";

    const vnDateMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (vnDateMatch) {
        const [, dd, mm, yyyy] = vnDateMatch;
        const day = Number(dd);
        const month = Number(mm);
        const year = Number(yyyy);
        const parsedVn = new Date(year, month - 1, day);

        if (
            !Number.isNaN(parsedVn.getTime()) &&
            parsedVn.getDate() === day &&
            parsedVn.getMonth() + 1 === month &&
            parsedVn.getFullYear() === year
        ) {
            return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        }
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const clampDate = (value, minDate, maxDate) => {
    if (!value) return "";
    if (minDate && value < minDate) return minDate;
    if (maxDate && value > maxDate) return maxDate;
    return value;
};

const getDaysAgoIso = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return toIsoDateOnly(date);
};

const IoTStationModal = ({ isOpen, onClose, onSubmit }) => {
    const [selectedStation, setSelectedStation] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [loading, setLoading] = useState(false);
    const [stations, setStations] = useState([]);
    const [loadingStations, setLoadingStations] = useState(false);

    const todayIso = useMemo(() => toIsoDateOnly(new Date()), []);

    const selectedStationInfo = useMemo(
        () => stations.find((s) => s.serial_number === selectedStation) || null,
        [stations, selectedStation],
    );

    const stationStartDate = useMemo(() => {
        const rawStart =
            selectedStationInfo?.start_time ||
            selectedStationInfo?.startTime ||
            selectedStationInfo?.StartTime ||
            selectedStationInfo?.first_data_time ||
            selectedStationInfo?.firstDataTime ||
            selectedStationInfo?.first_record ||
            selectedStationInfo?.firstRecord ||
            "";

        const parsed = toIsoDateOnly(rawStart);
        return parsed || "";
    }, [selectedStationInfo]);

    const minSelectableDate = stationStartDate || "";
    const maxSelectableDate = todayIso;
    const defaultStartDate = useMemo(
        () => clampDate(getDaysAgoIso(30), minSelectableDate, maxSelectableDate),
        [minSelectableDate, maxSelectableDate],
    );

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

    useEffect(() => {
        if (!selectedStation) {
            setStartDate("");
            setEndDate("");
            return;
        }

        const nextStart = clampDate(startDate || defaultStartDate, minSelectableDate, maxSelectableDate);
        const nextEndBase = endDate || maxSelectableDate;
        const nextEnd = clampDate(nextEndBase, nextStart || minSelectableDate, maxSelectableDate);

        setStartDate(nextStart);
        setEndDate(nextEnd);
    }, [selectedStation, minSelectableDate, maxSelectableDate, defaultStartDate]);

    useEffect(() => {
        if (!selectedStation) return;

        if (startDate && endDate && startDate > endDate) {
            setEndDate(startDate);
        }
    }, [startDate, endDate, selectedStation]);

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
                            min={minSelectableDate}
                            max={maxSelectableDate}
                            disabled={!selectedStation}
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
                            min={startDate || minSelectableDate}
                            max={maxSelectableDate}
                            disabled={!selectedStation}
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
