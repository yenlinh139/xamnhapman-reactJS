import React, { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import Header from "../themes/headers/Header";
import Footer from "../themes/footer/Footer";
import Loading from "../../components/Loading";
import ModalConfirm from "../../components/ModalConfirm";
import CreateSalinityModal from "./CreateSalinityModal";
import EditSalinityModal from "./EditSalinityModal";
import PaginationSalinity from "./PaginationSalinity";
import SalinityTable from "./SalinityTable";
import {
    fetchSalinityData,
    deleteSalinityData,
    deleteSalinityDataRange,
} from "../../stores/actions/salinityActions";
import "../../styles/components/_salinityManagement.scss";
import { ToastCommon } from "@/components/ToastCommon";
import { TOAST } from "@/common/constants";

const SalinityManagement = () => {
    const dispatch = useDispatch();
    const { data: salinityData, loading, error, pagination } = useSelector((state) => state.salinity);
    const { userInfo } = useSelector((state) => state.authStore);

    // Local states
    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(20);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDeleteRangeModal, setShowDeleteRangeModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [selectedRecords, setSelectedRecords] = useState([]);
    const [filterDate, setFilterDate] = useState({
        startDate: "",
        endDate: "",
    });
    const [inputDateFilter, setInputDateFilter] = useState({
        startDate: "",
        endDate: "",
    });

    // Helper function to validate date format and year digits
    const isValidDateForFilter = (dateString) => {
        if (!dateString) return false;
        // Check if the year part has at least 2 digits
        const yearMatch = dateString.match(/^(\d{2,4})-/);
        return yearMatch && yearMatch[1].length >= 2;
    };

    // Debounced filter update
    const updateFilterWithValidation = useCallback((newInputFilter) => {
        const { startDate, endDate } = newInputFilter;

        // Only apply filter if both dates are empty (clearing) or both dates have valid years
        const startDateValid = !startDate || isValidDateForFilter(startDate);
        const endDateValid = !endDate || isValidDateForFilter(endDate);

        if (startDateValid && endDateValid) {
            setFilterDate(newInputFilter);
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

    // Debug effect to track data changes
    useEffect(() => {
        console.log("🔄 SalinityData updated:", {
            length: salinityData?.length || 0,
            data: salinityData,
            loading,
            timestamp: new Date().toISOString(),
        });
    }, [salinityData, loading]);

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
        setFilterDate({ startDate: "", endDate: "" });
        setInputDateFilter({ startDate: "", endDate: "" });
        setCurrentPage(1);
    };

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
            ToastCommon(TOAST.ERROR, "Vui lòng chọn ít nhất một bản ghi để xóa");
            return;
        }
        setShowDeleteRangeModal(true);
    }, [selectedRecords.length]);

    // Confirm delete single record
    const confirmDelete = async () => {
        try {
            console.log("Deleting record:", deleteTarget);

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
                    {/* Header Section */}
                    <div className="salinity-header">
                        <div className="header-left">
                            <h1 className="page-title">Quản Lý Dữ Liệu Độ Mặn</h1>
                            <p className="page-subtitle">
                                Quản lý dữ liệu độ mặn tại các trạm quan trắc ở TP.HCM
                            </p>
                        </div>
                        <div className="header-actions">
                            {userInfo && (
                                <button className="btn btn-primary" onClick={handleCreateSalinity}>
                                    <i className="fas fa-plus"></i>
                                    Thêm dữ liệu mới
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter Section */}
                    <div className="filter-section">
                        <div className="filter-row">
                            <div className="filter-group">
                                <label htmlFor="startDate">Từ ngày:</label>
                                <input
                                    type="date"
                                    id="startDate"
                                    value={inputDateFilter.startDate}
                                    onChange={(e) =>
                                        setInputDateFilter((prev) => ({
                                            ...prev,
                                            startDate: e.target.value,
                                        }))
                                    }
                                    className="filter-input"
                                />
                            </div>
                            <div className="filter-group">
                                <label htmlFor="endDate">Đến ngày:</label>
                                <input
                                    type="date"
                                    id="endDate"
                                    value={inputDateFilter.endDate}
                                    onChange={(e) =>
                                        setInputDateFilter((prev) => ({
                                            ...prev,
                                            endDate: e.target.value,
                                        }))
                                    }
                                    className="filter-input"
                                />
                            </div>
                            <div className="filter-actions">
                                <button className="btn btn-secondary" onClick={clearFilters}>
                                    Xóa bộ lọc
                                </button>
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
