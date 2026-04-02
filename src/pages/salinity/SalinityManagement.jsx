import React, { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { useSelector, useDispatch } from "react-redux";
import Header from "@pages/themes/headers/Header";
import Footer from "@pages/themes/footer/Footer";
import Loading from "../../components/Loading";
import ModalConfirm from "../../components/ModalConfirm";
import CreateSalinityModal from "./CreateSalinityModal";
import EditSalinityModal from "./EditSalinityModal";
import PaginationSalinity from "./PaginationSalinity";
import SalinityTable from "./SalinityTable";
import IoTManagementTab from "./IoTManagementTab";
import axiosInstance from "@config/axios-config";
import {
    fetchSalinityData,
    deleteSalinityData,
    deleteSalinityDataRange,
} from "../../stores/actions/salinityActions";
import "../../styles/components/_salinityManagement.scss";
import { ToastCommon } from "@/components/ToastCommon";
import { TOAST } from "@/common/constants";

const DEFAULT_FILTER_DATE_RANGE = {
    startDate: "2007-05-06",
    endDate: "2025-05-25",
};

const formatDateDisplay = (dateString) => {
    if (!dateString) return "";
    const raw = String(dateString).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const [year, month, day] = raw.split("-");
        return `${day}/${month}/${year}`;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;

    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
};

const normalizeDateInputText = (value) => {
    const digits = String(value || "")
        .replace(/\D/g, "")
        .slice(0, 8);

    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const parseDisplayDateToIso = (value) => {
    if (!value) return "";
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return null;

    const [day, month, year] = value.split("/");
    const isoDate = `${year}-${month}-${day}`;
    const parsedDate = new Date(isoDate);
    return Number.isNaN(parsedDate.getTime()) ? null : isoDate;
};

const DEFAULT_FILTER_INPUT_RANGE = {
    startDate: formatDateDisplay(DEFAULT_FILTER_DATE_RANGE.startDate),
    endDate: formatDateDisplay(DEFAULT_FILTER_DATE_RANGE.endDate),
};

const SALINITY_EXPORT_COLUMNS = [
    { key: "Ngày", label: "Ngày" },
    { key: "CRT", label: "Cầu Rạch Tra (CRT)" },
    { key: "CTT", label: "Cầu Thủ Thiêm (CTT)" },
    { key: "COT", label: "Cầu Ông Thìn (COT)" },
    { key: "CKC", label: "Cống Kênh C (CKC)" },
    { key: "KXAH", label: "Kênh Xáng - An Hạ (KXAH)" },
    { key: "MNB", label: "Mũi Nhà Bè (MNB)" },
    { key: "PCL", label: "Phà Cát Lái (PCL)" },
];

const SalinityManagement = () => {
    const dispatch = useDispatch();
    const { data: salinityData, loading, error, pagination } = useSelector((state) => state.salinity);
    const { userInfo } = useSelector((state) => state.authStore);

    // Local states
    const [currentPage, setCurrentPage] = useState(1);
    const [activeTab, setActiveTab] = useState("salinity");
    const [limit] = useState(20);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDeleteRangeModal, setShowDeleteRangeModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [selectedRecords, setSelectedRecords] = useState([]);
    const [isExporting, setIsExporting] = useState(false);
    const [filterDate, setFilterDate] = useState(DEFAULT_FILTER_DATE_RANGE);
    const [inputDateFilter, setInputDateFilter] = useState(DEFAULT_FILTER_INPUT_RANGE);

    // Debounced filter update
    const updateFilterWithValidation = useCallback((newInputFilter) => {
        const { startDate, endDate } = newInputFilter;
        const nextStartDate = startDate ? parseDisplayDateToIso(startDate) : "";
        const nextEndDate = endDate ? parseDisplayDateToIso(endDate) : "";

        const startDateValid = !startDate || Boolean(nextStartDate);
        const endDateValid = !endDate || Boolean(nextEndDate);

        if (startDateValid && endDateValid) {
            setFilterDate({
                startDate: nextStartDate,
                endDate: nextEndDate,
            });
            setCurrentPage(1);
        }
    }, []);

    // Debounce the filter update
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            updateFilterWithValidation(inputDateFilter);
        }, 500); // 500ms delay

        return () => clearTimeout(timeoutId);
    }, [inputDateFilter, updateFilterWithValidation]);

    // Load salinity data on component mount and when filters change
    useEffect(() => {
        dispatch(
            fetchSalinityData({
                page: currentPage,
                limit,
                ...filterDate,
            }),
        );
    }, [dispatch, currentPage, limit, filterDate]);

    // Handle page change
    const handlePageChange = useCallback((page) => {
        setCurrentPage(page);
    }, []);

    // Handle date filter
    const handleDateFilter = (startDate, endDate) => {
        const newFilter = { startDate, endDate };
        setInputDateFilter(newFilter);
    };

    // Clear filters
    const clearFilters = () => {
        setFilterDate(DEFAULT_FILTER_DATE_RANGE);
        setInputDateFilter(DEFAULT_FILTER_INPUT_RANGE);
        setCurrentPage(1);
    };

    const formatDateForExport = useCallback((dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return dateString;
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }, []);

    const formatFileDate = useCallback((dateString) => {
        if (!dateString) return "tat_ca";
        return String(dateString).replaceAll("-", "");
    }, []);

    const exportFilteredData = useCallback(
        async (fileType) => {
            try {
                setIsExporting(true);

                const exportLimit = pagination?.total || salinityData.length || 1000;
                const queryParams = new URLSearchParams({
                    page: "1",
                    limit: String(exportLimit),
                });

                if (filterDate.startDate) queryParams.append("startDate", filterDate.startDate);
                if (filterDate.endDate) queryParams.append("endDate", filterDate.endDate);

                const response = await axiosInstance.get(`/salinity-data?${queryParams.toString()}`);
                const exportRows = Array.isArray(response?.data?.data) ? response.data.data : [];

                if (exportRows.length === 0) {
                    ToastCommon(TOAST.ERROR, "Không có dữ liệu để xuất theo bộ lọc hiện tại");
                    return;
                }

                const worksheetData = exportRows.map((row, index) => {
                    const formattedRow = { STT: index + 1 };

                    SALINITY_EXPORT_COLUMNS.forEach(({ key, label }) => {
                        const rawValue = row?.[key];
                        formattedRow[label] =
                            key === "Ngày"
                                ? formatDateForExport(rawValue)
                                : rawValue === null || rawValue === undefined || rawValue === "NULL"
                                  ? ""
                                  : rawValue;
                    });

                    return formattedRow;
                });

                const worksheet = XLSX.utils.json_to_sheet(worksheetData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "DuLieuDoMan");

                const fileName = `du_lieu_do_man_${formatFileDate(filterDate.startDate)}_${formatFileDate(filterDate.endDate)}.${fileType}`;

                if (fileType === "csv") {
                    XLSX.writeFile(workbook, fileName, { bookType: "csv" });
                } else {
                    XLSX.writeFile(workbook, fileName, { bookType: "xlsx" });
                }

                ToastCommon(TOAST.SUCCESS, `Xuất file ${fileType.toUpperCase()} thành công`);
            } catch (error) {
                console.error(`Error exporting ${fileType}:`, error);
                ToastCommon(TOAST.ERROR, `Không thể xuất file ${fileType.toUpperCase()}`);
            } finally {
                setIsExporting(false);
            }
        },
        [filterDate, formatDateForExport, formatFileDate, pagination?.total, salinityData.length],
    );

    // Handle create salinity data
    const handleCreateSalinity = useCallback(() => {
        setShowCreateModal(true);
    }, []);

    // Handle edit salinity data
    const handleEditSalinity = useCallback((record) => {
        setSelectedRecord(record);
        setShowEditModal(true);
    }, []);

    // Handle delete single record
    const handleDeleteSalinity = useCallback((record) => {
        setDeleteTarget(record);
        setShowDeleteModal(true);
    }, []);

    // Handle delete multiple records
    const handleDeleteRange = useCallback(() => {
        if (selectedRecords.length === 0) {
            ToastCommon(TOAST.ERROR, "Vui lòng chọn ít nhất một ngày để xóa");
            return;
        }
        setShowDeleteRangeModal(true);
    }, [selectedRecords.length]);

    // Confirm delete single record
    const confirmDelete = async () => {
        try {
            await dispatch(deleteSalinityData(deleteTarget.Ngày));
            ToastCommon(TOAST.SUCCESS, `Xóa dữ liệu mặn thành công`);
            setShowDeleteModal(false);
            setDeleteTarget(null);
            // Reload data
            dispatch(
                fetchSalinityData({
                    page: currentPage,
                    limit,
                    ...filterDate,
                }),
            );
        } catch (error) {
            ToastCommon(TOAST.ERROR, error.message || "Có lỗi xảy ra khi xóa dữ liệu");
        }
    };

    // Confirm delete range
    const confirmDeleteRange = async () => {
        try {
            const dates = selectedRecords.map((record) => record.Ngày).sort();
            const startDate = dates[0];
            const endDate = dates[dates.length - 1];

            await dispatch(deleteSalinityDataRange({ startDate, endDate }));
            ToastCommon(TOAST.SUCCESS, `Xóa thành công ${selectedRecords.length} bản ghi`);
            setShowDeleteRangeModal(false);
            setSelectedRecords([]);
            // Reload data
            dispatch(
                fetchSalinityData({
                    page: currentPage,
                    limit,
                    ...filterDate,
                }),
            );
        } catch (error) {
            ToastCommon(TOAST.ERROR, error.message || "Có lỗi xảy ra khi xóa dữ liệu");
        }
    };

    // Handle record selection
    const handleRecordSelection = useCallback((record, isSelected) => {
        if (isSelected) {
            setSelectedRecords((prev) => [...prev, record]);
        } else {
            setSelectedRecords((prev) => prev.filter((r) => r.Ngày !== record.Ngày));
        }
    }, []);

    // Handle select all records
    const handleSelectAll = useCallback(
        (isSelected) => {
            if (isSelected) {
                setSelectedRecords(salinityData);
            } else {
                setSelectedRecords([]);
            }
        },
        [salinityData],
    );

    // Handle modal success callbacks
    const handleCreateSuccess = useCallback(() => {
        setShowCreateModal(false);
        dispatch(
            fetchSalinityData({
                page: currentPage,
                limit,
                ...filterDate,
            }),
        );
    }, [dispatch, currentPage, limit, filterDate]);

    const handleEditSuccess = useCallback(() => {
        setShowEditModal(false);
        setSelectedRecord(null);
        dispatch(
            fetchSalinityData({
                page: currentPage,
                limit,
                ...filterDate,
            }),
        );
    }, [dispatch, currentPage, limit, filterDate]);

    const handleCreateClose = useCallback(() => {
        setShowCreateModal(false);
    }, []);

    const handleEditClose = useCallback(() => {
        setShowEditModal(false);
        setSelectedRecord(null);
    }, []);

    return (
        <div className="salinity-management">
            <Header />
            <main className="main-content">
                <div className="salinity-container">
                    <ul className="nav nav-tabs mb-3" role="tablist">
                        <li className="nav-item" role="presentation">
                            <button
                                className={`nav-link ${activeTab === "salinity" ? "active" : ""}`}
                                type="button"
                                onClick={() => setActiveTab("salinity")}
                            >
                                Điểm đo mặn
                            </button>
                        </li>
                        <li className="nav-item" role="presentation">
                            <button
                                className={`nav-link ${activeTab === "iot" ? "active" : ""}`}
                                type="button"
                                onClick={() => setActiveTab("iot")}
                            >
                                Trạm IoT
                            </button>
                        </li>
                    </ul>

                    {activeTab === "salinity" && (
                        <>
                            {/* Filter Section */}
                            <div className="filter-section">
                        <div className="filter-row">
                            <div className="filter-left">
                                <div className="filter-group">
                                    <label htmlFor="startDate">Từ ngày:</label>
                                    <input
                                        type="text"
                                        id="startDate"
                                        value={inputDateFilter.startDate}
                                        onChange={(e) =>
                                            setInputDateFilter((prev) => ({
                                                ...prev,
                                                startDate: normalizeDateInputText(e.target.value),
                                            }))
                                        }
                                        onBlur={() =>
                                            setInputDateFilter((prev) => ({
                                                ...prev,
                                                startDate:
                                                    parseDisplayDateToIso(prev.startDate)
                                                        ? formatDateDisplay(parseDisplayDateToIso(prev.startDate))
                                                        : prev.startDate,
                                            }))
                                        }
                                        className="filter-input"
                                        placeholder="dd/mm/yyyy"
                                        inputMode="numeric"
                                        maxLength={10}
                                    />
                                </div>
                                <div className="filter-group">
                                    <label htmlFor="endDate">Đến ngày:</label>
                                    <input
                                        type="text"
                                        id="endDate"
                                        value={inputDateFilter.endDate}
                                        onChange={(e) =>
                                            setInputDateFilter((prev) => ({
                                                ...prev,
                                                endDate: normalizeDateInputText(e.target.value),
                                            }))
                                        }
                                        onBlur={() =>
                                            setInputDateFilter((prev) => ({
                                                ...prev,
                                                endDate:
                                                    parseDisplayDateToIso(prev.endDate)
                                                        ? formatDateDisplay(parseDisplayDateToIso(prev.endDate))
                                                        : prev.endDate,
                                            }))
                                        }
                                        className="filter-input"
                                        placeholder="dd/mm/yyyy"
                                        inputMode="numeric"
                                        maxLength={10}
                                    />
                                </div>
                                <div className="filter-actions d-flex gap-2 flex-wrap">
                                    <button className="btn btn-secondary" onClick={clearFilters}>
                                        Xóa bộ lọc
                                    </button>
                                    <button
                                        className="btn btn-success"
                                        onClick={() => exportFilteredData("xlsx")}
                                        disabled={loading || isExporting}
                                    >
                                        <i className="fas fa-file-excel me-1"></i>
                                        {isExporting ? "Đang xuất..." : "Xuất Excel"}
                                    </button>
                                    <button
                                        className="btn btn-outline-primary"
                                        onClick={() => exportFilteredData("csv")}
                                        disabled={loading || isExporting}
                                    >
                                        <i className="fas fa-file-csv me-1"></i>
                                        {isExporting ? "Đang xuất..." : "Xuất CSV"}
                                    </button>
                                </div>
                            </div>
                            <div className="filter-right">
                                {userInfo && (
                                    <button className="btn btn-primary" onClick={handleCreateSalinity}>
                                        <i className="fas fa-plus"></i>
                                        Thêm dữ liệu mới
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bulk Actions */}
                    {selectedRecords.length > 0 && userInfo && (
                        <div className="bulk-actions">
                            <span className="selection-count">Đã chọn {selectedRecords.length} bản ghi</span>
                            <button className="btn btn-danger" onClick={handleDeleteRange}>
                                <i className="fas fa-trash"></i>
                                Xóa đã chọn
                            </button>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="error-message">
                            <i className="fas fa-exclamation-triangle"></i>
                            {error}
                        </div>
                    )}

                    {/* Data Table */}
                    <div className="table-container">
                        <SalinityTable
                            key={`salinity-table-${salinityData.length}-${currentPage}-${JSON.stringify(filterDate)}`}
                            data={salinityData}
                            onEdit={handleEditSalinity}
                            onDelete={handleDeleteSalinity}
                            selectedRecords={selectedRecords}
                            onRecordSelection={handleRecordSelection}
                            onSelectAll={handleSelectAll}
                            canEdit={!!userInfo}
                            canDelete={!!userInfo}
                            loading={loading}
                        />
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="pagination-container">
                            <PaginationSalinity
                                currentPage={currentPage}
                                totalPages={pagination.totalPages}
                                onPageChange={handlePageChange}
                                totalRecords={pagination.total}
                                recordsPerPage={limit}
                            />
                        </div>
                    )}

                    {/* No Data Message */}
                    {!loading && salinityData.length === 0 && (
                        <div className="no-data">
                            <i className="fas fa-water"></i>
                            <h3>Không có dữ liệu độ mặn</h3>
                            <p>Chưa có dữ liệu độ mặn nào được ghi nhận.</p>
                            {userInfo && (
                                <button className="btn btn-primary" onClick={handleCreateSalinity}>
                                    Thêm dữ liệu đầu tiên
                                </button>
                            )}
                        </div>
                    )}
                        </>
                    )}

                    {activeTab === "iot" && <IoTManagementTab userInfo={userInfo} />}
                </div>

                {/* Modals */}
                {showCreateModal && (
                    <CreateSalinityModal
                        onClose={() => setShowCreateModal(false)}
                        onSuccess={() => {
                            setShowCreateModal(false);
                            dispatch(
                                fetchSalinityData({
                                    page: currentPage,
                                    limit,
                                    ...filterDate,
                                }),
                            );
                        }}
                    />
                )}

                {showEditModal && selectedRecord && (
                    <EditSalinityModal
                        record={selectedRecord}
                        onClose={() => {
                            setShowEditModal(false);
                            setSelectedRecord(null);
                        }}
                        onSuccess={() => {
                            setShowEditModal(false);
                            setSelectedRecord(null);
                            dispatch(
                                fetchSalinityData({
                                    page: currentPage,
                                    limit,
                                    ...filterDate,
                                }),
                            );
                        }}
                    />
                )}

                {showDeleteModal && deleteTarget && (
                    <ModalConfirm
                        title="Xác nhận xóa dữ liệu"
                        message={`Bạn có chắc chắn muốn xóa dữ liệu độ mặn ngày ${deleteTarget.Ngày}?`}
                        onConfirm={confirmDelete}
                        onCancel={() => {
                            setShowDeleteModal(false);
                            setDeleteTarget(null);
                        }}
                        confirmText="Xóa"
                        cancelText="Hủy"
                        type="danger"
                    />
                )}

                {showDeleteRangeModal && (
                    <ModalConfirm
                        title="Xác nhận xóa nhiều dữ liệu"
                        message={`Bạn có chắc chắn muốn xóa ${selectedRecords.length} bản ghi đã chọn?`}
                        onConfirm={confirmDeleteRange}
                        onCancel={() => setShowDeleteRangeModal(false)}
                        confirmText="Xóa tất cả"
                        cancelText="Hủy"
                        type="danger"
                    />
                )}
            </main>
            <Footer />
        </div>
    );
};

export default SalinityManagement;
