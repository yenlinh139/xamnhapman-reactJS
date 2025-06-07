import React, { useEffect, useState } from "react";
import axiosInstance from "@config/axios-config";
import SalinityBarChart from "@pages/map/SalinityBarChart";
import html2canvas from 'html2canvas';

const ExportPreviewTable = ({ data }) => (
    <div className="table-responsive mb-3" style={{ maxHeight: 300 }}>
        <table className="table table-bordered table-sm table-striped">
            <thead className="table-light">
                <tr>
                    <th>#</th>
                    <th>Ngày</th>
                    <th>Độ mặn (‰)</th>
                </tr>
            </thead>
            <tbody>
                {data.map((item, idx) => (
                    <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{new Date(item.date).toLocaleDateString("vi-VN")}</td>
                        <td>{Number(item.salinity).toFixed(4)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const SaltChartFull = ({ show, kiHieu, tenDiem, salinityData, onClose }) => {
    const [data, setData] = useState([]);
    const [exportRange, setExportRange] = useState({
        startDate: '',
        endDate: ''
    });
    const [filteredData, setFilteredData] = useState([]);

    useEffect(() => {
        if (show && salinityData) {
            // Lọc bỏ các ngày có giá trị NULL
            const validSalinityData = salinityData.filter(
                item => item.salinity !== null && item.salinity !== "NULL" && !isNaN(item.salinity)
            );
            
            setData(validSalinityData);
            if (validSalinityData.length > 0) {
                setExportRange({
                    startDate: validSalinityData[0].date.split('T')[0],
                    endDate: validSalinityData[validSalinityData.length - 1].date.split('T')[0]
                });
            }
        } else {
            setData([]);
            setExportRange({ startDate: '', endDate: '' });
        }
    }, [show, salinityData]);

    useEffect(() => {
        if (!show) setData([]);
    }, [show]);

    const handleDateRangeChange = (e) => {
        const { name, value } = e.target;
        setExportRange(prev => ({
            ...prev,
            [name]: value
        }));

        // Filter data based on date range
        const startDate = new Date(name === 'startDate' ? value : exportRange.startDate);
        const endDate = new Date(name === 'endDate' ? value : exportRange.endDate);
        
        if (startDate && endDate && startDate <= endDate) {
            const filtered = data.filter(item => {
                const itemDate = new Date(item.date);
                return itemDate >= startDate && itemDate <= endDate;
            });
            setFilteredData(filtered);
        }
    };

    const handleExportExcel = async () => {
        try {
            if (!exportRange.startDate || !exportRange.endDate) {
                alert('Vui lòng chọn khoảng thời gian để xuất dữ liệu');
                return;
            }

            const dataToExport = filteredData.length > 0 ? filteredData : data;
            const exportData = {
                kiHieu,
                tenDiem,
                startDate: exportRange.startDate,
                endDate: exportRange.endDate,
                data: dataToExport
            };

            const res = await axiosInstance.post('/salinity-export', exportData, {
                responseType: "blob",
            });

            const blob = new Blob([res.data], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            const fileName = `DoMan_${tenDiem || kiHieu}_${exportRange.startDate}_${exportRange.endDate}.xlsx`;
            link.setAttribute("download", fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("❌ Xuất Excel lỗi:", error);
            alert("Không thể xuất dữ liệu từ máy chủ.");
        }
    };

    const downloadChart = async () => {
        try {
            const chartContainer = document.createElement('div');
            chartContainer.style.backgroundColor = 'white';
            chartContainer.style.padding = '20px';
            
            // Set width cho container
            chartContainer.style.width = '800px'; // Đặt chiều rộng cố định
            chartContainer.style.margin = '0 auto';

            // Tạo và thêm phần tiêu đề
            const titleDiv = document.createElement('div');
            titleDiv.style.width = '100%';
            titleDiv.style.textAlign = 'center';
            titleDiv.style.marginBottom = '20px';
            titleDiv.innerHTML = `
                <h5 style="font-weight: bold; margin-bottom: 8px; font-size: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    Biểu đồ xâm nhập mặn - ${tenDiem}
                </h5>
                ${startDate && endDate ? `
                    <div style="color: #6c757d; font-size: 14px">
                        Từ <strong>${startDate}</strong> đến <strong>${endDate}</strong>
                    </div>
                ` : ''}
            `;
            chartContainer.appendChild(titleDiv);
            
            // Sao chép phần biểu đồ
            const chartElement = document.getElementById('salinity-chart');
            if (!chartElement) {
                alert('Không thể tìm thấy biểu đồ để tải xuống');
                return;
            }
            const chartClone = chartElement.cloneNode(true);
            chartContainer.appendChild(chartClone);
            
            // Thêm container tạm thời vào document
            document.body.appendChild(chartContainer);
            
            // Chuyển thành canvas và tải xuống
            const canvas = await html2canvas(chartContainer, {
                backgroundColor: '#ffffff',
                scale: 2, // Tăng độ phân giải
            });
            
            // Xóa container tạm
            document.body.removeChild(chartContainer);
            
            const url = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = url;
            link.download = `BieuDo_${tenDiem || kiHieu}.png`;
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("❌ Tải ảnh biểu đồ lỗi:", error);
            alert("Không thể tải ảnh biểu đồ.");
        }
    };

    // Dữ liệu đã được lọc bỏ các giá trị NULL từ useEffect
    const startDate = data?.length > 0 ? new Date(data[0].date).toLocaleDateString("vi-VN") : null;
    const endDate =
        data?.length > 0
            ? new Date(data[data.length - 1].date).toLocaleDateString("vi-VN")
            : null;

    return (
        <div
            className={`modal fade ${show ? "show d-block" : ""}`}
            tabIndex="-1"
            style={{ backgroundColor: show ? "rgba(0,0,0,0.5)" : "transparent" }}
        >
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header border-0 pb-0">
                        <div className="w-100 text-center">
                            <h5 className="modal-title mb-1 fw-bold">Biểu đồ xâm nhập mặn - {tenDiem}</h5>
                            {startDate && endDate && (
                                <div className="text-muted small">
                                    Từ <strong>{startDate}</strong> đến <strong>{endDate}</strong>
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            className="btn-close position-absolute end-0 top-0 m-3"
                            onClick={onClose}
                        ></button>
                    </div>

                    <div className="modal-body">
                        <ul className="nav nav-tabs mb-3" role="tablist">
                            <li className="nav-item">
                                <button
                                    className="nav-link active"
                                    id="chart-tab"
                                    data-bs-toggle="tab"
                                    data-bs-target="#chart"
                                    type="button"
                                >
                                    Biểu đồ
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className="nav-link"
                                    id="export-tab"
                                    data-bs-toggle="tab"
                                    data-bs-target="#export"
                                    type="button"
                                >
                                    Xuất dữ liệu
                                </button>
                            </li>
                        </ul>

                        <div className="tab-content">
                            <div className="tab-pane fade show active" id="chart">
                                {data.length > 0 ? (
                                    <>
                                        <div id="salinity-chart">
                                            <SalinityBarChart data={data} height={350} />
                                        </div>
                                        <div className="mt-3 d-flex justify-content-between align-items-center">
                                            <div className="text-muted small">
                                                Hiển thị: <strong>{data.length}</strong> ngày có dữ liệu hợp lệ
                                            </div>
                                            <button className="btn btn-primary" onClick={downloadChart}>
                                                📸 Tải ảnh biểu đồ
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-muted">Không có dữ liệu hợp lệ.</p>
                                )}
                            </div>

                            <div className="tab-pane fade" id="export">
                                {data.length > 0 ? (
                                    <>
                                        <div className="mb-4">
                                            <h6 className="mb-3">Chọn khoảng thời gian xuất dữ liệu:</h6>
                                            <div className="row g-3">
                                                <div className="col-md-6">
                                                    <label className="form-label">Từ ngày:</label>
                                                    <input
                                                        type="date"
                                                        className="form-control"
                                                        name="startDate"
                                                        value={exportRange.startDate}
                                                        onChange={handleDateRangeChange}
                                                    />
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label">Đến ngày:</label>
                                                    <input
                                                        type="date"
                                                        className="form-control"
                                                        name="endDate"
                                                        value={exportRange.endDate}
                                                        onChange={handleDateRangeChange}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <ExportPreviewTable data={filteredData.length > 0 ? filteredData : data} />
                                        
                                        <div className="d-flex gap-2 justify-content-between align-items-center">
                                            <div className="text-muted small">
                                                {filteredData.length > 0 
                                                    ? `Hiển thị ${filteredData.length} bản ghi`
                                                    : `Tổng số ${data.length} bản ghi`}
                                            </div>
                                            <button 
                                                className="btn btn-success" 
                                                onClick={handleExportExcel}
                                                disabled={!exportRange.startDate || !exportRange.endDate}
                                            >
                                                📥 Tải Excel
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-muted">Không có dữ liệu để hiển thị.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SaltChartFull;
