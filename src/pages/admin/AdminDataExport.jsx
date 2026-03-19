import React, { useState, useEffect } from 'react';
import axiosInstance from '@config/axios-config';
import { ToastCommon } from '@components/ToastCommon';
import { TOAST } from '@common/constants';
import { Helmet } from 'react-helmet-async';

const normalizeStationsPayload = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.data?.data)) return payload.data.data;
    if (Array.isArray(payload?.results)) return payload.results;
    if (Array.isArray(payload?.stations)) return payload.stations;
    return [];
};

const AdminDataExport = () => {
    const [selectedDataType, setSelectedDataType] = useState('salinity');
    const [exportFormat, setExportFormat] = useState('excel');
    const [dateRange, setDateRange] = useState({
        startDate: '',
        endDate: ''
    });
    const [stations, setStations] = useState([]);
    const [selectedStations, setSelectedStations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const dataTypes = [
        { value: 'salinity', label: 'Độ mặn', icon: 'fa-droplet' },
        { value: 'hydrometeorology', label: 'Khí tượng thủy văn', icon: 'fa-cloud-rain' },
        { value: 'iot', label: 'Dữ liệu IoT', icon: 'fa-microchip' },
        { value: 'administrative', label: 'Dữ liệu hành chính', icon: 'fa-map' }
    ];

    const exportFormats = [
        { value: 'excel', label: 'Excel (.xlsx)', icon: 'fa-file-excel' },
        { value: 'gis', label: 'GIS (.shp)', icon: 'fa-map-pin' },
        { value: 'pdf', label: 'Báo cáo PDF', icon: 'fa-file-pdf' }
    ];

    // Load stations based on selected data type
    useEffect(() => {
        const loadStations = async () => {
            try {
                let endpoint = '';
                switch (selectedDataType) {
                    case 'salinity':
                        endpoint = '/salinity-points';
                        break;
                    case 'hydrometeorology':
                        endpoint = '/hydrometeorology-stations';
                        break;
                    case 'iot':
                        endpoint = '/iot/stations';
                        break;
                    default:
                        setStations([]);
                        return;
                }

                const response = await axiosInstance.get(endpoint);
                const normalizedStations = normalizeStationsPayload(response.data);
                setStations(normalizedStations);
                setSelectedStations([]);
            } catch (error) {
                console.error('Error loading stations:', error);
                setStations([]);
                setSelectedStations([]);
                ToastCommon({ message: 'Không thể tải danh sách trạm', type: TOAST.ERROR });
            }
        };

        loadStations();
    }, [selectedDataType]);

    const stationList = Array.isArray(stations) ? stations : [];

    const handleStationToggle = (stationId) => {
        if (!stationId) return;
        setSelectedStations(prev => 
            prev.includes(stationId) 
                ? prev.filter(id => id !== stationId)
                : [...prev, stationId]
        );
    };

    const handleSelectAll = () => {
        setSelectedStations(stationList.map(station => 
            station.KiHieu || station.maTram || station.serial_number || station.id
        ).filter(Boolean));
    };

    const handleClearAll = () => {
        setSelectedStations([]);
    };

    const handleExport = async () => {
        if (selectedStations.length === 0) {
            ToastCommon({ message: 'Vui lòng chọn ít nhất một trạm', type: TOAST.ERROR });
            return;
        }

        if (!dateRange.startDate || !dateRange.endDate) {
            ToastCommon({ message: 'Vui lòng chọn khoảng thời gian', type: TOAST.ERROR });
            return;
        }

        setIsLoading(true);
        
        try {
            let endpoint = '';
            let requestData = {
                stations: selectedStations,
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
                format: exportFormat
            };

            switch (selectedDataType) {
                case 'salinity':
                    endpoint = '/salinity-export';
                    break;
                case 'hydrometeorology':
                    endpoint = '/hydrometeorology-export';
                    break;
                case 'iot':
                    endpoint = '/iot/export';
                    break;
                case 'administrative':
                    endpoint = '/administrative-export';
                    break;
                default:
                    throw new Error('Loại dữ liệu không hợp lệ');
            }

            const response = await axiosInstance.post(endpoint, requestData, {
                responseType: 'blob'
            });

            // Create download link
            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            const extension = exportFormat === 'excel' ? 'xlsx' : exportFormat === 'gis' ? 'zip' : 'pdf';
            link.download = `${selectedDataType}_export_${dateRange.startDate}_${dateRange.endDate}.${extension}`;
            
            document.body.appendChild(link);
            link.click();
            
            window.URL.revokeObjectURL(url);
            document.body.removeChild(link);

            ToastCommon({ message: 'Xuất dữ liệu thành công', type: TOAST.SUCCESS });
            
        } catch (error) {
            console.error('Export error:', error);
            ToastCommon({ message: 'Lỗi khi xuất dữ liệu', type: TOAST.ERROR });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="admin-data-export">
            <Helmet>
                <title>Xuất dữ liệu | Quản trị hệ thống</title>
            </Helmet>

            <div className="container-fluid">
                <div className="row">
                    <div className="col-12">
                        <div className="card">
                            <div className="card-header">
                                <h4 className="card-title mb-0">
                                    <i className="fa-solid fa-download me-2"></i>
                                    Xuất dữ liệu hệ thống
                                </h4>
                            </div>
                            <div className="card-body">
                                <div className="row">
                                    {/* Data Type Selection */}
                                    <div className="col-md-4 mb-4">
                                        <h6 className="mb-3">1. Chọn loại dữ liệu</h6>
                                        <div className="data-type-grid">
                                            {dataTypes.map(type => (
                                                <div 
                                                    key={type.value}
                                                    className={`data-type-card ${selectedDataType === type.value ? 'active' : ''}`}
                                                    onClick={() => setSelectedDataType(type.value)}
                                                >
                                                    <i className={`fa-solid ${type.icon}`}></i>
                                                    <span>{type.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Export Format Selection */}
                                    <div className="col-md-4 mb-4">
                                        <h6 className="mb-3">2. Chọn định dạng xuất</h6>
                                        <div className="export-format-list">
                                            {exportFormats.map(format => (
                                                <div 
                                                    key={format.value}
                                                    className={`export-format-item ${exportFormat === format.value ? 'active' : ''}`}
                                                    onClick={() => setExportFormat(format.value)}
                                                >
                                                    <i className={`fa-solid ${format.icon}`}></i>
                                                    <span>{format.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Date Range Selection */}
                                    <div className="col-md-4 mb-4">
                                        <h6 className="mb-3">3. Chọn khoảng thời gian</h6>
                                        <div className="date-range">
                                            <div className="mb-3">
                                                <label className="form-label">Từ ngày</label>
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    value={dateRange.startDate}
                                                    onChange={(e) => setDateRange(prev => ({
                                                        ...prev,
                                                        startDate: e.target.value
                                                    }))}
                                                />
                                            </div>
                                            <div className="mb-3">
                                                <label className="form-label">Đến ngày</label>
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    value={dateRange.endDate}
                                                    onChange={(e) => setDateRange(prev => ({
                                                        ...prev,
                                                        endDate: e.target.value
                                                    }))}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Station Selection */}
                                <div className="row mt-4">
                                    <div className="col-12">
                                        <h6 className="mb-3">4. Chọn trạm đo</h6>
                                        <div className="station-selection">
                                            <div className="d-flex justify-content-between align-items-center mb-3">
                                                <span className="text-muted">
                                                    Đã chọn {selectedStations.length}/{stationList.length} trạm
                                                </span>
                                                <div>
                                                    <button
                                                        className="btn btn-sm btn-outline-primary me-2"
                                                        onClick={handleSelectAll}
                                                    >
                                                        Chọn tất cả
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-outline-secondary"
                                                        onClick={handleClearAll}
                                                    >
                                                        Bỏ chọn tất cả
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="stations-grid">
                                                {stationList.map((station, index) => {
                                                    const stationId = station.KiHieu || station.maTram || station.serial_number || station.id;
                                                    const stationName = station.TenDiem || station.TenTram || station.name || stationId;
                                                    const isSelected = selectedStations.includes(stationId);
                                                    
                                                    return (
                                                        <div
                                                            key={stationId || `station-${index}`}
                                                            className={`station-item ${isSelected ? 'selected' : ''}`}
                                                            onClick={() => handleStationToggle(stationId)}
                                                        >
                                                            <div className="station-info">
                                                                <strong>{stationName}</strong>
                                                                <small className="text-muted d-block">{stationId}</small>
                                                            </div>
                                                            {isSelected && <i className="fa-solid fa-check-circle text-success"></i>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Export Button */}
                                <div className="row mt-4">
                                    <div className="col-12">
                                        <div className="text-center">
                                            <button
                                                className="btn btn-lg btn-success"
                                                onClick={handleExport}
                                                disabled={isLoading || selectedStations.length === 0 || !dateRange.startDate || !dateRange.endDate}
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                        Đang xuất dữ liệu...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="fa-solid fa-download me-2"></i>
                                                        Xuất dữ liệu
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDataExport;