import React from "react";

const PaginationSalinity = ({ currentPage, totalPages, onPageChange, totalRecords, recordsPerPage }) => {
    // Calculate visible page range
    const getVisiblePages = () => {
        const delta = 2; // Number of pages to show on each side of current page
        const range = [];
        const rangeWithDots = [];

        for (
            let i = Math.max(2, currentPage - delta);
            i <= Math.min(totalPages - 1, currentPage + delta);
            i++
        ) {
            range.push(i);
        }

        if (currentPage - delta > 2) {
            rangeWithDots.push(1, "...");
        } else {
            rangeWithDots.push(1);
        }

        rangeWithDots.push(...range);

        if (currentPage + delta < totalPages - 1) {
            rangeWithDots.push("...", totalPages);
        } else {
            if (totalPages > 1) {
                rangeWithDots.push(totalPages);
            }
        }

        return rangeWithDots;
    };

    // Calculate record range
    const getRecordRange = () => {
        const start = (currentPage - 1) * recordsPerPage + 1;
        const end = Math.min(currentPage * recordsPerPage, totalRecords);
        return { start, end };
    };

    const { start, end } = getRecordRange();
    const visiblePages = getVisiblePages();

    // Handle page click
    const handlePageClick = (page) => {
        if (page !== currentPage && page >= 1 && page <= totalPages) {
            onPageChange(page);
        }
    };

    // Handle previous page
    const handlePrevious = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    // Handle next page
    const handleNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    // Handle first page
    const handleFirst = () => {
        if (currentPage !== 1) {
            onPageChange(1);
        }
    };

    // Handle last page
    const handleLast = () => {
        if (currentPage !== totalPages) {
            onPageChange(totalPages);
        }
    };

    if (totalPages <= 1) {
        return null;
    }

    return (
        <div className="pagination-salinity">
            {/* Records Info */}
            <div className="pagination-info">
                <span className="record-range">
                    Hiển thị {start}-{end} trong tổng số {totalRecords} bản ghi
                </span>
            </div>

            {/* Pagination Controls */}
            <div className="pagination-controls">
                {/* First Page */}
                <button
                    className={`pagination-btn first ${currentPage === 1 ? "disabled" : ""}`}
                    onClick={handleFirst}
                    disabled={currentPage === 1}
                    title="Trang đầu"
                >
                    <i className="fas fa-angle-double-left"></i>
                </button>

                {/* Previous Page */}
                <button
                    className={`pagination-btn prev ${currentPage === 1 ? "disabled" : ""}`}
                    onClick={handlePrevious}
                    disabled={currentPage === 1}
                    title="Trang trước"
                >
                    <i className="fas fa-angle-left"></i>
                </button>

                {/* Page Numbers */}
                <div className="pagination-pages">
                    {visiblePages.map((page, index) =>
                        page === "..." ? (
                            <span key={`dots-${index}`} className="pagination-dots">
                                ...
                            </span>
                        ) : (
                            <button
                                key={page}
                                className={`pagination-btn page ${page === currentPage ? "active" : ""}`}
                                onClick={() => handlePageClick(page)}
                            >
                                {page}
                            </button>
                        ),
                    )}
                </div>

                {/* Next Page */}
                <button
                    className={`pagination-btn next ${currentPage === totalPages ? "disabled" : ""}`}
                    onClick={handleNext}
                    disabled={currentPage === totalPages}
                    title="Trang sau"
                >
                    <i className="fas fa-angle-right"></i>
                </button>

                {/* Last Page */}
                <button
                    className={`pagination-btn last ${currentPage === totalPages ? "disabled" : ""}`}
                    onClick={handleLast}
                    disabled={currentPage === totalPages}
                    title="Trang cuối"
                >
                    <i className="fas fa-angle-double-right"></i>
                </button>
            </div>

            {/* Page Info */}
            <div className="pagination-page-info">
                <span>
                    Trang {currentPage} / {totalPages}
                </span>
            </div>
        </div>
    );
};

export default PaginationSalinity;
