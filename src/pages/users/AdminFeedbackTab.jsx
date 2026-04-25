import { useEffect, useMemo, useState } from "react";
import axiosInstance, { BASE_URL } from "@config/axios-config";
import { ToastCommon } from "@components/ToastCommon";
import { TOAST } from "@common/constants";

const FEEDBACK_TYPE_OPTIONS = [
    { code: 0, label: "Tất cả loại góp ý" },
    { code: 1, label: "Báo cáo lỗi" },
    { code: 2, label: "Cải thiện hệ thống" },
    { code: 3, label: "Khác" },
];

const STATUS_OPTIONS = [
    { code: 0, label: "Tất cả trạng thái" },
    { code: 1, label: "Chưa xem" },
    { code: 2, label: "Đã xem" },
    { code: 3, label: "Đang giải quyết" },
    { code: 4, label: "Đã giải quyết" },
];

const typeCodeByLabel = {
    "Báo cáo lỗi": 1,
    "Cải thiện hệ thống": 2,
    Khác: 3,
};

const typeLabelByCode = {
    1: "Báo cáo lỗi",
    2: "Cải thiện hệ thống",
    3: "Khác",
};

const statusCodeByLabel = {
    "Chưa xem": 1,
    "Đã xem": 2,
    "Đang giải quyết": 3,
    "Đã giải quyết": 4,
};

const statusLabelByCode = {
    1: "Chưa xem",
    2: "Đã xem",
    3: "Đang giải quyết",
    4: "Đã giải quyết",
};

const MAX_ATTACHMENT_SIZE = 2 * 1024 * 1024;

const formatDateTime = (dateValue) => {
    if (!dateValue) {
        return "--";
    }

    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) {
        return String(dateValue);
    }

    return parsedDate.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
};

const getAttachmentFileName = (imageUrl) => {
    if (!imageUrl) {
        return "";
    }

    const cleanedValue = String(imageUrl).split("?")[0];
    const lastSegment = cleanedValue.split("/").filter(Boolean).pop() || "";

    try {
        return decodeURIComponent(lastSegment);
    } catch (_) {
        return lastSegment;
    }
};

const buildImageSource = (imageUrl) => {
    if (!imageUrl) {
        return "";
    }

    if (/^https?:\/\//i.test(imageUrl) || /^data:/i.test(imageUrl) || /^blob:/i.test(imageUrl)) {
        return imageUrl;
    }

    try {
        const baseOrigin = new URL(BASE_URL).origin;
        const normalizedPath = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
        return `${baseOrigin}${normalizedPath}`;
    } catch (_) {
        return imageUrl;
    }
};

const normalizeFeedbackItem = (item) => {
    if (!item || typeof item !== "object") {
        return null;
    }

    const feedbackTypeCode =
        (Number.isInteger(item.feedbackTypeCode) && item.feedbackTypeCode) ||
        (Number.isInteger(item.feedback_type_code) && item.feedback_type_code) ||
        typeCodeByLabel[item.feedbackType || item.feedback_type || item.category] ||
        3;

    const statusCode =
        (Number.isInteger(item.statusCode) && item.statusCode) ||
        (Number.isInteger(item.status_code) && item.status_code) ||
        statusCodeByLabel[item.status || item.state] ||
        1;

    return {
        id: item.id || item._id || item.feedback_id || item.feedbackId,
        userName: item.user?.name || item.userName || item.username || item.fullName || item.name || "",
        email: item.user?.email || item.email || item.userEmail || "",
        feedbackTypeCode,
        feedbackTypeLabel: typeLabelByCode[feedbackTypeCode],
        content: item.content || item.detail || item.message || item.description || "",
        imageUrl: item.imageUrl || item.image_url || item.image || item.attachment || item.attachmentUrl || "",
        createdAt: item.createdAt || item.created_at || item.timestamp || item.time || item.date || "",
        statusCode,
        statusLabel: statusLabelByCode[statusCode],
    };
};

const AdminFeedbackTab = () => {
    const [feedbackItems, setFeedbackItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState(0);
    const [statusFilter, setStatusFilter] = useState(0);
    const [editingItem, setEditingItem] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState({
        feedbackTypeCode: 1,
        statusCode: 1,
    });

    const fetchFeedbacks = async () => {
        setIsLoading(true);
        try {
            const response = await axiosInstance.get("/feedback");
            const rawData = Array.isArray(response?.data?.data)
                ? response.data.data
                : Array.isArray(response?.data)
                  ? response.data
                  : [];

            const normalizedItems = rawData.map(normalizeFeedbackItem).filter(Boolean);
            setFeedbackItems(normalizedItems);
        } catch (error) {
            ToastCommon(TOAST.ERROR, "Không thể tải danh sách góp ý.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFeedbacks();
        const interval = setInterval(fetchFeedbacks, 30000);
        return () => clearInterval(interval);
    }, []);

    const filteredItems = useMemo(() => {
        return feedbackItems.filter((item) => {
            const searchKey = [item.userName, item.email, item.feedbackTypeLabel, item.content, item.statusLabel]
                .join(" ")
                .toLowerCase();

            const matchesSearch = searchKey.includes(searchTerm.trim().toLowerCase());
            const matchesType = typeFilter === 0 || item.feedbackTypeCode === typeFilter;
            const matchesStatus = statusFilter === 0 || item.statusCode === statusFilter;

            return matchesSearch && matchesType && matchesStatus;
        });
    }, [feedbackItems, searchTerm, typeFilter, statusFilter]);

    const openEdit = (item) => {
        setEditingItem(item);
        setErrors({});
        setFormData({
            feedbackTypeCode: item.feedbackTypeCode,
            statusCode: item.statusCode,
        });
    };

    const closeEdit = () => {
        setEditingItem(null);
        setErrors({});
        setFormData({
            feedbackTypeCode: 1,
            statusCode: 1,
        });
    };

    const handleAttachmentChange = (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        if (!file.type.startsWith("image/")) {
            setErrors((prev) => ({ ...prev, attachment: "Chỉ chấp nhận tệp hình ảnh." }));
            return;
        }

        if (file.size > MAX_ATTACHMENT_SIZE) {
            setErrors((prev) => ({ ...prev, attachment: "Hình ảnh không được vượt quá 2MB." }));
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setFormData((prev) => ({
                ...prev,
                attachmentName: file.name,
                attachmentPreview: typeof reader.result === "string" ? reader.result : "",
                attachmentFile: file,
            }));
            setErrors((prev) => ({ ...prev, attachment: "" }));
        };
        reader.readAsDataURL(file);
    };

    const uploadFeedbackImage = async (file) => {
        const uploadFormData = new FormData();
        uploadFormData.append("image", file);

        const response = await axiosInstance.post("/upload/feedback-image", uploadFormData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });

        return response?.data?.data?.imageUrl || response?.data?.imageUrl || "";
    };

    const handleOpenImagePreview = (imageUrl) => {
        const normalizedUrl = buildImageSource(imageUrl);
        if (!normalizedUrl) {
            return;
        }

        setPreviewImage({
            url: normalizedUrl,
            fileName: getAttachmentFileName(imageUrl),
        });
    };

    const handleCloseImagePreview = () => {
        setPreviewImage(null);
    };

    const handleUpdate = async () => {
        if (!editingItem) {
            return;
        }

        setIsSubmitting(true);
        try {
            await axiosInstance.put(`/feedback/${encodeURIComponent(String(editingItem.id))}`, {
                feedbackTypeCode: formData.feedbackTypeCode,
                statusCode: formData.statusCode,
            });

            ToastCommon(TOAST.SUCCESS, "Cập nhật góp ý thành công.");
            closeEdit();
            fetchFeedbacks();
        } catch (error) {
            ToastCommon(TOAST.ERROR, error.response?.data?.message || "Không thể cập nhật góp ý.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await axiosInstance.delete(`/feedback/${encodeURIComponent(String(deleteTarget.id))}`);
            ToastCommon(TOAST.SUCCESS, "Xóa góp ý thành công.");
            setDeleteTarget(null);
            fetchFeedbacks();
        } catch (error) {
            ToastCommon(TOAST.ERROR, error.response?.data?.message || "Không thể xóa góp ý.");
        }
    };

    return (
        <div className="admin-feedback-tab">
            {deleteTarget && (
                <>
                    <div
                        className="modal fade show d-block admin-feedback-tab__confirm-modal"
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h4 className="modal-title">Xác nhận xóa</h4>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        aria-label="Đóng"
                                        onClick={() => setDeleteTarget(null)}
                                    ></button>
                                </div>
                                <div className="modal-body">
                                    <p className="mb-0">Bạn có chắc muốn xóa ý kiến này?</p>
                                </div>
                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setDeleteTarget(null)}
                                    >
                                        Hủy
                                    </button>
                                    <button type="button" className="btn btn-danger" onClick={handleDelete}>
                                        Xác nhận
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show"></div>
                </>
            )}

            <div className="admin-feedback-tab__toolbar">
                <div className="admin-feedback-tab__search">
                    <i className="fa-solid fa-search"></i>
                    <input
                        type="search"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Tìm kiếm..."
                    />
                </div>

                <select value={typeFilter} onChange={(event) => setTypeFilter(Number(event.target.value))}>
                    {FEEDBACK_TYPE_OPTIONS.map((option) => (
                        <option key={option.code} value={option.code}>
                            {option.label}
                        </option>
                    ))}
                </select>

                <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(Number(event.target.value))}
                >
                    {STATUS_OPTIONS.map((option) => (
                        <option key={option.code} value={option.code}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="admin-feedback-tab__table-wrap">
                <table className="admin-feedback-tab__table">
                    <colgroup>
                        <col style={{ width: "12%" }} />
                        <col style={{ width: "18%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "15%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "13%" }} />
                        <col style={{ width: "8%" }} />
                        <col style={{ width: "12%" }} />
                    </colgroup>
                    <thead>
                        <tr>
                            <th>Tên người dùng</th>
                            <th>Email</th>
                            <th>Loại góp ý</th>
                            <th>Nội dung chi tiết</th>
                            <th>Hình ảnh tải lên</th>
                            <th>Thời điểm</th>
                            <th>Trạng thái</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan="8" className="empty-row">
                                    Đang tải dữ liệu góp ý...
                                </td>
                            </tr>
                        ) : filteredItems.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="empty-row">
                                    Chưa có góp ý phù hợp.
                                </td>
                            </tr>
                        ) : (
                            filteredItems.map((item) => (
                                <tr key={item.id}>
                                    <td>{item.userName || "--"}</td>
                                    <td>{item.email || "--"}</td>
                                    <td>{item.feedbackTypeLabel}</td>
                                    <td className="content-cell">{item.content}</td>
                                    <td>
                                        {item.imageUrl ? (
                                            <button
                                                type="button"
                                                className="admin-feedback-tab__file-button"
                                                onClick={() => handleOpenImagePreview(item.imageUrl)}
                                            >
                                                {getAttachmentFileName(item.imageUrl)}
                                            </button>
                                        ) : (
                                            ""
                                        )}
                                    </td>
                                    <td>{formatDateTime(item.createdAt)}</td>
                                    <td>{item.statusLabel}</td>
                                    <td>
                                        <div className="action-group">
                                            <button
                                                type="button"
                                                className="btn btn-primary btn-sm py-1 px-3"
                                                onClick={() => openEdit(item)}
                                                style={{ fontSize: "0.8rem" }}
                                            >
                                                Xử lý
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-danger btn-sm py-1 px-3"
                                                onClick={() => setDeleteTarget(item)}
                                                style={{ fontSize: "0.8rem" }}
                                            >
                                                Xóa
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {editingItem && (
                <div className="feedback-modal" role="dialog" aria-modal="true">
                    <div className="feedback-modal__backdrop" onClick={closeEdit}></div>
                    <div className="feedback-modal__dialog">
                        <div className="feedback-form-card">
                            <div className="feedback-form-card__header">
                                <div className="text-center">
                                    <h2>Xử lý ý kiến</h2>
                                    <p>Cập nhật loại góp ý và trạng thái.</p>
                                </div>
                            </div>

                            <div className="feedback-form admin-feedback-tab__modal-form">
                                <div className="admin-feedback-tab__meta-grid">
                                    <p>
                                        <strong>Email:</strong> {editingItem.email || "--"}
                                    </p>
                                    <p>
                                        <strong>Họ và tên:</strong> {editingItem.userName || "--"}
                                    </p>
                                    <p>
                                        <strong>Thời điểm:</strong> {formatDateTime(editingItem.createdAt)}
                                    </p>
                                </div>

                                <div className="input-wrapper">
                                    <label>Loại góp ý</label>
                                    <select
                                        value={formData.feedbackTypeCode}
                                        onChange={(event) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                feedbackTypeCode: Number(event.target.value),
                                            }))
                                        }
                                    >
                                        {FEEDBACK_TYPE_OPTIONS.filter((item) => item.code !== 0).map(
                                            (item) => (
                                                <option key={item.code} value={item.code}>
                                                    {item.label}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </div>

                                <div className="input-wrapper">
                                    <label>Trạng thái</label>
                                    <select
                                        value={formData.statusCode}
                                        onChange={(event) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                statusCode: Number(event.target.value),
                                            }))
                                        }
                                    >
                                        {STATUS_OPTIONS.filter((item) => item.code !== 0).map((item) => (
                                            <option key={item.code} value={item.code}>
                                                {item.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="input-wrapper">
                                    <label>Nội dung chi tiết</label>
                                    <p
                                        style={{
                                            margin: "0.25rem 0 0",
                                            whiteSpace: "pre-wrap",
                                            lineHeight: 1.6,
                                            color: "#666666",
                                            paddingLeft: "0.5rem",
                                            borderLeft: "3px solid #cccccc",
                                        }}
                                    >
                                        {editingItem.content || (
                                            <em style={{ color: "#999"}}>
                                                Không có nội dung
                                            </em>
                                        )}
                                    </p>
                                </div>

                                <div className="input-wrapper">
                                    <label>Hình ảnh đính kèm</label>
                                    {editingItem.imageUrl ? (
                                        <div className="attachment-preview">
                                            <img
                                                src={buildImageSource(editingItem.imageUrl)}
                                                alt={
                                                    getAttachmentFileName(editingItem.imageUrl) ||
                                                    "Ảnh đính kèm"
                                                }
                                                onClick={() => handleOpenImagePreview(editingItem.imageUrl)}
                                                role="button"
                                                style={{ cursor: "zoom-in" }}
                                            />
                                        </div>
                                    ) : (
                                        <p
                                            style={{
                                                color: "#999",
                                                fontStyle: "italic",
                                                margin: "0.25rem 0 0",
                                            }}
                                        >
                                            Không có ảnh
                                        </p>
                                    )}
                                </div>

                                <div className="feedback-form__actions">
                                    <button type="button" className="secondary-button" onClick={closeEdit}>
                                        Hủy
                                    </button>
                                    <button
                                        type="button"
                                        className="primary-button"
                                        onClick={handleUpdate}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? "Đang cập nhật..." : "Cập nhật"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {previewImage && (
                <div className="feedback-modal image-viewer-modal" role="dialog" aria-modal="true">
                    <div className="feedback-modal__backdrop" onClick={handleCloseImagePreview}></div>
                    <div className="feedback-modal__dialog image-viewer-modal__dialog">
                        <div className="image-viewer-modal__header">
                            <h3>{previewImage.fileName}</h3>
                            <button
                                type="button"
                                className="image-viewer-modal__close"
                                onClick={handleCloseImagePreview}
                                aria-label="Đóng"
                            >
                                ×
                            </button>
                        </div>
                        <div className="image-viewer-modal__content">
                            <img src={previewImage.url} alt={previewImage.fileName || "Ảnh góp ý"} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminFeedbackTab;
