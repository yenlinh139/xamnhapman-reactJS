import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useDispatch, useSelector } from "react-redux";
import Header from "@pages/themes/headers/Header";
import Footer from "@pages/themes/footer/Footer";
import { ToastCommon } from "@components/ToastCommon";
import { TOAST } from "@common/constants";
import axiosInstance, { BASE_URL } from "@config/axios-config";
import { hideLoading, showLoading } from "@stores/actions/appAction";
import "@/styles/components/_feedback.scss";

const FEEDBACK_TYPE_OPTIONS = [
    { code: 1, label: "Báo cáo lỗi" },
    { code: 2, label: "Cải thiện hệ thống" },
    { code: 3, label: "Khác" },
];
const STATUS_OPTIONS = [
    { code: 1, label: "Chưa xem" },
    { code: 2, label: "Đã xem" },
    { code: 3, label: "Đang giải quyết" },
    { code: 4, label: "Đã giải quyết" },
];
const DEFAULT_STATUS_CODE = 1;
const MAX_ATTACHMENT_SIZE = 2 * 1024 * 1024;

const RESEARCH_GROUP_INFO = [
    {
        label: "Tên nhiệm vụ",
        value: "Xây dựng hệ thống quan trắc tự động hỗ trợ dự báo, cảnh báo xâm nhập mặn hệ thống sông, kênh, rạch địa bàn Thành phố Hồ Chí Minh trên nền tảng tri thức nhân tạo",
    },
    { label: "Chủ nhiệm nhiệm vụ", value: "GS.TS. Nguyễn Kim Lợi" },
    { label: "Cơ quan chủ trì", value: "Trường Đại học Nông Lâm TP. Hồ Chí Minh" },
    {
        label: "Địa chỉ",
        value: "Khu phố 6, phường Linh Xuân, TP. Hồ Chí Minh",
        href: "https://maps.app.goo.gl/n5B9inxjUXu1aUio7",
        display: "Khu phố 6, phường Linh Xuân, TP. Hồ Chí Minh",
    },
    { label: "Cán bộ kĩ thuật", value: "ThS. Nguyễn Duy Liêm" },
    {
        label: "Số điện thoại / Zalo",
        value: "0983613551",
        href: "tel:0983613551",
        display: "0983613551",
    },
    {
        label: "Email",
        value: "nguyenduyliem@hcmuaf.edu.vn",
        href: "mailto:nguyenduyliem@hcmuaf.edu.vn",
        display: "nguyenduyliem@hcmuaf.edu.vn",
    },
    {
        label: "Facebook",
        value: "https://www.facebook.com/nguyenduyliem.gis",
        href: "https://www.facebook.com/nguyenduyliem.gis",
        display: "facebook.com/nguyenduyliem.gis",
        external: true,
    },
];

const emptyFormData = {
    feedbackTypeCode: 0,
    statusCode: DEFAULT_STATUS_CODE,
    detail: "",
    attachmentName: "",
    attachmentPreview: "",
    attachmentFile: null,
    imageUrl: "",
};

const feedbackTypeLabelByCode = Object.fromEntries(FEEDBACK_TYPE_OPTIONS.map((item) => [item.code, item.label]));
const feedbackTypeCodeByLabel = Object.fromEntries(FEEDBACK_TYPE_OPTIONS.map((item) => [item.label, item.code]));
const statusLabelByCode = Object.fromEntries(STATUS_OPTIONS.map((item) => [item.code, item.label]));
const statusCodeByLabel = Object.fromEntries(STATUS_OPTIONS.map((item) => [item.label, item.code]));

const getCollectionFromPayload = (payload) => {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (Array.isArray(payload?.data)) {
        return payload.data;
    }

    if (Array.isArray(payload?.feedbacks)) {
        return payload.feedbacks;
    }

    if (payload && typeof payload === "object") {
        return [payload];
    }

    return [];
};

const normalizeFeedbackTypeCode = (item) => {
    const rawCode = item?.feedbackTypeCode || item?.feedback_type_code;
    if (Number.isInteger(rawCode) && feedbackTypeLabelByCode[rawCode]) {
        return rawCode;
    }

    const rawText = item?.feedbackType || item?.feedback_type || item?.category || item?.type || item?.topic || "";
    return feedbackTypeCodeByLabel[rawText] || 3;
};

const normalizeStatusCode = (item) => {
    const rawCode = item?.statusCode || item?.status_code;
    if (Number.isInteger(rawCode) && statusLabelByCode[rawCode]) {
        return rawCode;
    }

    const rawText = item?.status || item?.state || "";
    return statusCodeByLabel[rawText] || DEFAULT_STATUS_CODE;
};

const normalizeFeedbackItem = (item) => {
    if (!item || typeof item !== "object") {
        return null;
    }

    return {
        id: item.id || item._id || item.feedback_id || item.feedbackId || item.email || `${Date.now()}`,
        userName: item.user?.name || item.userName || item.username || item.fullName || item.name || "",
        email: item.user?.email || item.email || item.userEmail || "",
        feedbackTypeCode: normalizeFeedbackTypeCode(item),
        feedbackTypeLabel:
            item.feedbackType || item.feedback_type || item.category || item.type || feedbackTypeLabelByCode[normalizeFeedbackTypeCode(item)],
        detail: item.content || item.detail || item.message || item.description || "",
        attachmentUrl: item.imageUrl || item.image_url || item.image || item.attachment || item.attachmentUrl || "",
        attachmentName: item.attachmentName || item.fileName || item.imageName || "",
        statusCode: normalizeStatusCode(item),
        statusLabel: item.status || item.state || statusLabelByCode[normalizeStatusCode(item)],
        createdAt: item.createdAt || item.created_at || item.timestamp || item.time || item.date || "",
    };
};

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

const Feedback = () => {
    const dispatch = useDispatch();
    const userInfo = useSelector((state) => state.authStore?.userInfo);
    const [formData, setFormData] = useState(emptyFormData);
    const [errors, setErrors] = useState({});
    const [feedbackItems, setFeedbackItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState(0);
    const [editingItem, setEditingItem] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [imageZoom, setImageZoom] = useState(1);
    const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
    const [isImageDragging, setIsImageDragging] = useState(false);
    const [dragStartPoint, setDragStartPoint] = useState({ x: 0, y: 0 });
    const [isLoadingList, setIsLoadingList] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);

    const resetForm = () => {
        setErrors({});
        setEditingItem(null);
        setDeleteTarget(null);
        setIsFormModalOpen(false);
        setFormData(emptyFormData);
    };

    const fetchFeedbacks = async () => {
        setIsLoadingList(true);
        dispatch(showLoading());

        try {
            const response = await axiosInstance.get("/feedback");

            const normalizedItems = getCollectionFromPayload(response?.data)
                .map(normalizeFeedbackItem)
                .filter(Boolean);

            const currentEmail = String(userInfo?.email || "")
                .trim()
                .toLowerCase();

            const ownedItems = currentEmail
                ? normalizedItems.filter(
                      (item) => String(item.email || "").trim().toLowerCase() === currentEmail,
                  )
                : [];

            setFeedbackItems(ownedItems);
        } catch (error) {
            if (error.response?.status === 404) {
                setFeedbackItems([]);
            } else {
                ToastCommon(TOAST.ERROR, "Không thể tải danh sách góp ý. Vui lòng thử lại.");
            }
        } finally {
            dispatch(hideLoading());
            setIsLoadingList(false);
        }
    };

    useEffect(() => {
        fetchFeedbacks();
    }, [userInfo?.email]);

    const handleFieldChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const handleCategoryChange = (category) => {
        setFormData((prev) => ({ ...prev, feedbackTypeCode: category }));

        if (errors.feedbackTypeCode) {
            setErrors((prev) => ({ ...prev, feedbackTypeCode: "" }));
        }
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

    const validateForm = () => {
        const nextErrors = {};

        if (!formData.feedbackTypeCode) {
            nextErrors.feedbackTypeCode = "Vui lòng chọn loại góp ý.";
        }

        if (!formData.detail.trim()) {
            nextErrors.detail = "Vui lòng mô tả chi tiết vấn đề hoặc đề xuất của bạn.";
        }

        return nextErrors;
    };

    const buildPayload = (resolvedImageUrl) => ({
        feedbackTypeCode: formData.feedbackTypeCode,
        feedbackType: feedbackTypeLabelByCode[formData.feedbackTypeCode],
        content: formData.detail.trim(),
        imageUrl: resolvedImageUrl || null,
    });

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

    const handleSubmit = async (event) => {
        event.preventDefault();

        const nextErrors = validateForm();
        setErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            return;
        }

        setIsSubmitting(true);
        dispatch(showLoading());

        try {
            let resolvedImageUrl = formData.imageUrl || "";
            if (formData.attachmentFile) {
                resolvedImageUrl = await uploadFeedbackImage(formData.attachmentFile);
            }

            const payload = buildPayload(resolvedImageUrl);

            if (editingItem) {
                const identifier = editingItem.id || editingItem.email;
                await axiosInstance.put(`/feedback/${encodeURIComponent(String(identifier))}`, payload);
                ToastCommon(TOAST.SUCCESS, "Cập nhật góp ý thành công!");
            } else {
                await axiosInstance.post("/feedback", payload);
                ToastCommon(TOAST.SUCCESS, "Gửi góp ý thành công!");
            }

            resetForm();
            await fetchFeedbacks();
        } catch (error) {
            const fallbackMessage = editingItem ? "Không thể cập nhật góp ý." : "Không thể gửi góp ý.";
            ToastCommon(TOAST.ERROR, error.response?.data?.message || fallbackMessage);
        } finally {
            dispatch(hideLoading());
            setIsSubmitting(false);
        }
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setDeleteTarget(null);
        setIsFormModalOpen(true);
        setErrors({});
        setFormData({
            feedbackTypeCode: item.feedbackTypeCode || 0,
            statusCode: item.statusCode || DEFAULT_STATUS_CODE,
            detail: item.detail || "",
            attachmentName: item.attachmentName || "",
            attachmentPreview: item.attachmentUrl || "",
            attachmentFile: null,
            imageUrl: item.attachmentUrl || "",
        });
    };

    const handleOpenCreateModal = () => {
        setEditingItem(null);
        setDeleteTarget(null);
        setErrors({});
        setFormData(emptyFormData);
        setIsFormModalOpen(true);
    };

    const handleOpenImagePreview = (imageUrl) => {
        const normalizedUrl = buildImageSource(imageUrl);
        if (!normalizedUrl) {
            return;
        }

        setImageZoom(1);
        setImageOffset({ x: 0, y: 0 });
        setIsImageDragging(false);

        setPreviewImage({
            url: normalizedUrl,
            fileName: getAttachmentFileName(imageUrl),
        });
    };

    const handleCloseImagePreview = () => {
        setPreviewImage(null);
        setIsImageDragging(false);
        setImageZoom(1);
        setImageOffset({ x: 0, y: 0 });
    };

    const clampZoom = (zoom) => {
        return Math.min(4, Math.max(0.5, zoom));
    };

    const applyZoom = (nextZoom) => {
        const clampedZoom = clampZoom(nextZoom);
        setImageZoom(clampedZoom);

        if (clampedZoom <= 1) {
            setImageOffset({ x: 0, y: 0 });
            setIsImageDragging(false);
        }
    };

    const handleZoomIn = () => {
        applyZoom(imageZoom + 0.2);
    };

    const handleZoomOut = () => {
        applyZoom(imageZoom - 0.2);
    };

    const handleZoomReset = () => {
        setImageZoom(1);
        setImageOffset({ x: 0, y: 0 });
        setIsImageDragging(false);
    };

    const handleImageWheel = (event) => {
        event.preventDefault();
        const wheelDelta = event.deltaY < 0 ? 0.2 : -0.2;
        applyZoom(imageZoom + wheelDelta);
    };

    const handleImageMouseDown = (event) => {
        if (imageZoom <= 1) {
            return;
        }

        event.preventDefault();
        setIsImageDragging(true);
        setDragStartPoint({
            x: event.clientX - imageOffset.x,
            y: event.clientY - imageOffset.y,
        });
    };

    const handleImageMouseMove = (event) => {
        if (!isImageDragging) {
            return;
        }

        setImageOffset({
            x: event.clientX - dragStartPoint.x,
            y: event.clientY - dragStartPoint.y,
        });
    };

    const stopImageDragging = () => {
        if (isImageDragging) {
            setIsImageDragging(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) {
            return;
        }

        dispatch(showLoading());

        try {
            await axiosInstance.delete(`/feedback/${encodeURIComponent(String(deleteTarget.id))}`);
            ToastCommon(TOAST.SUCCESS, "Xóa góp ý thành công!");

            if (editingItem?.id === deleteTarget.id) {
                resetForm();
            } else {
                setDeleteTarget(null);
            }

            await fetchFeedbacks();
        } catch (error) {
            ToastCommon(TOAST.ERROR, error.response?.data?.message || "Không thể xóa góp ý.");
        } finally {
            dispatch(hideLoading());
        }
    };

    const filteredItems = feedbackItems.filter((item) => {
        const matchesSearch = [item.feedbackTypeLabel, item.detail, item.statusLabel, formatDateTime(item.createdAt)]
            .join(" ")
            .toLowerCase()
            .includes(searchTerm.trim().toLowerCase());

        const matchesStatus = statusFilter === 0 || item.statusCode === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const statusOptions = [{ code: 0, label: "Tất cả trạng thái" }, ...STATUS_OPTIONS];

    return (
        <div className="feedback-page">
            <Helmet>
                <title>Liên hệ hỗ trợ, góp ý | Xâm nhập mặn Tp. Hồ Chí Minh</title>
            </Helmet>
            <Header />

            <main className="feedback-main">
                <div className="container">
                    <div className="feedback-shell">
                        <section className="feedback-intro">
                            <aside className="feedback-intro__contact">
                                <h2>Thông tin nhóm nghiên cứu</h2>
                                <div className="contact-card">
                                    {RESEARCH_GROUP_INFO.map((item) =>
                                        item.href ? (
                                            <p key={item.label}>
                                                <strong>{item.label}:</strong>{" "}
                                                <a
                                                    href={item.href}
                                                    target={item.external ? "_blank" : undefined}
                                                    rel={item.external ? "noopener noreferrer" : undefined}
                                                >
                                                    {item.display || item.value}
                                                </a>
                                            </p>
                                        ) : (
                                            <p key={item.label}>
                                                <strong>{item.label}:</strong> {item.value}
                                            </p>
                                        ),
                                    )}
                                </div>
                            </aside>
                        </section>

                        <section className="feedback-workspace">
                            <div className="feedback-list-card">
                                <div className="feedback-list-card__toolbar">
                                    <button
                                        type="button"
                                        className="primary-button add-button"
                                        onClick={handleOpenCreateModal}
                                    >
                                        <i className="fas fa-plus"></i>
                                        <span>Gửi ý kiến</span>
                                    </button>

                                    <div className="feedback-filters">
                                        <div className="feedback-search-field">
                                            <i className="fas fa-search"></i>
                                            <input
                                                type="search"
                                                value={searchTerm}
                                                onChange={(event) => setSearchTerm(event.target.value)}
                                                placeholder="Tìm kiếm..."
                                            />
                                        </div>

                                        <select
                                            value={statusFilter}
                                            onChange={(event) => setStatusFilter(Number(event.target.value))}
                                        >
                                            {statusOptions.map((option) => (
                                                <option key={option.code} value={option.code}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="feedback-table-wrapper">
                                    <table className="feedback-table">
                                        <thead>
                                            <tr>
                                                <th>Loại góp ý</th>
                                                <th>Nội dung chi tiết</th>
                                                <th>Hình ảnh tải lên</th>
                                                <th>Thời điểm</th>
                                                <th>Trạng thái</th>
                                                <th>Hành động</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {isLoadingList ? (
                                                <tr>
                                                    <td colSpan="6" className="feedback-table__empty">
                                                        Đang tải dữ liệu góp ý...
                                                    </td>
                                                </tr>
                                            ) : filteredItems.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" className="feedback-table__empty">
                                                        Chưa có góp ý phù hợp với điều kiện tìm kiếm.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredItems.map((item) => (
                                                    <tr key={item.id}>
                                                        <td>{item.feedbackTypeLabel}</td>
                                                        <td className="feedback-table__detail">
                                                            {item.detail}
                                                        </td>
                                                        <td>
                                                            {item.attachmentUrl ? (
                                                                <button
                                                                    type="button"
                                                                    className="feedback-table__file-button"
                                                                    onClick={() =>
                                                                        handleOpenImagePreview(
                                                                            item.attachmentUrl,
                                                                        )
                                                                    }
                                                                >
                                                                    {getAttachmentFileName(
                                                                        item.attachmentUrl,
                                                                    )}
                                                                </button>
                                                            ) : (
                                                                ""
                                                            )}
                                                        </td>
                                                        <td className="feedback-table__time">
                                                            {formatDateTime(item.createdAt)}
                                                        </td>
                                                        <td className="feedback-table__status">
                                                            {item.statusLabel}
                                                        </td>
                                                        <td>
                                                            <div className="feedback-table__actions">
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-primary btn-sm py-1"
                                                                    onClick={() => handleEdit(item)}
                                                                >
                                                                    Chỉnh sửa
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-danger btn-sm py-1"
                                                                    onClick={() => setDeleteTarget(item)}
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
                            </div>
                        </section>

                        {isFormModalOpen && (
                            <div className="feedback-modal" role="dialog" aria-modal="true">
                                <div className="feedback-modal__backdrop" onClick={resetForm}></div>
                                <div className="feedback-modal__dialog">
                                    <div className="feedback-form-card">
                                        <div className="feedback-form-card__header">
                                            <div className="text-center">
                                                <h2>Góp ý</h2>
                                                <p>
                                                    Chia sẻ ý kiến của bạn để giúp chúng tôi cải thiện hệ
                                                    thống.
                                                </p>
                                            </div>
                                        </div>

                                        <form className="feedback-form" onSubmit={handleSubmit}>
                                            <div className="input-wrapper">
                                                <label className="required">Loại góp ý</label>
                                                <div className="feedback-category-group">
                                                    {FEEDBACK_TYPE_OPTIONS.map((category) => (
                                                        <label key={category.code} className="feedback-radio">
                                                            <input
                                                                type="radio"
                                                                name="category"
                                                                checked={
                                                                    formData.feedbackTypeCode ===
                                                                    category.code
                                                                }
                                                                onChange={() =>
                                                                    handleCategoryChange(category.code)
                                                                }
                                                            />
                                                            <span>{category.label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                {errors.feedbackTypeCode && (
                                                    <div className="error-message">
                                                        {errors.feedbackTypeCode}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="input-wrapper">
                                                <label htmlFor="detail" className="required">Nội dung chi tiết</label>
                                                <textarea
                                                    id="detail"
                                                    name="detail"
                                                    rows="6"
                                                    value={formData.detail}
                                                    onChange={handleFieldChange}
                                                    className={errors.detail ? "error" : ""}
                                                    placeholder="Vui lòng mô tả càng chi tiết càng tốt, để chúng tôi hiểu vấn đề của bạn"
                                                />
                                                {errors.detail && (
                                                    <div className="error-message">{errors.detail}</div>
                                                )}
                                            </div>

                                            <div className="input-wrapper">
                                                <label htmlFor="attachment">Tải lên hình ảnh</label>
                                                <div className="feedback-upload-row">
                                                    <label
                                                        htmlFor="attachment"
                                                        className="upload-button"
                                                        role="button"
                                                    >
                                                        <i className="fas fa-arrow-up"></i>
                                                        <span>Tải lên hình ảnh</span>
                                                    </label>
                                                    <input
                                                        id="attachment"
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleAttachmentChange}
                                                    />
                                                    {formData.attachmentName && (
                                                        <span className="attachment-name">
                                                            {formData.attachmentName}
                                                        </span>
                                                    )}
                                                </div>
                                                {errors.attachment && (
                                                    <div className="error-message">{errors.attachment}</div>
                                                )}

                                                {formData.attachmentPreview && (
                                                    <div className="attachment-preview">
                                                        <img
                                                            src={buildImageSource(formData.attachmentPreview)}
                                                            alt="Tệp đính kèm góp ý"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="feedback-form__actions">
                                                <button
                                                    type="button"
                                                    className="secondary-button"
                                                    onClick={resetForm}
                                                >
                                                    Hủy
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="primary-button"
                                                    disabled={isSubmitting}
                                                >
                                                    {isSubmitting
                                                        ? "Đang xử lý..."
                                                        : editingItem
                                                          ? "Cập nhật"
                                                          : "Gửi"}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        )}

                        {deleteTarget && (
                            <>
                                <div
                                    className="modal fade show d-block"
                                    role="dialog"
                                    aria-modal="true"
                                >
                                    <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 400 }}>
                                        <div className="modal-content">
                                            <div className="modal-header py-2 px-3">
                                                <h5 className="modal-title">Xác nhận xóa</h5>
                                                <button
                                                    type="button"
                                                    className="btn-close"
                                                    onClick={() => setDeleteTarget(null)}
                                                    aria-label="Đóng"
                                                />
                                            </div>
                                            <div className="modal-body py-2 px-3">
                                                <p className="mb-0">Bạn có chắc muốn xóa ý kiến này?</p>
                                            </div>
                                            <div className="modal-footer py-2 px-3">
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => setDeleteTarget(null)}
                                                >
                                                    Hủy
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-danger btn-sm"
                                                    onClick={handleDelete}
                                                >
                                                    Xóa
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-backdrop fade show"></div>
                            </>
                        )}

                        {previewImage && (
                            <div
                                className="feedback-modal image-viewer-modal"
                                role="dialog"
                                aria-modal="true"
                            >
                                <div
                                    className="feedback-modal__backdrop"
                                    onClick={handleCloseImagePreview}
                                ></div>
                                <div className="feedback-modal__dialog image-viewer-modal__dialog">
                                    <div className="image-viewer-modal__header">
                                        <h3>{previewImage.fileName}</h3>
                                        <div className="image-viewer-modal__controls">
                                            <button
                                                type="button"
                                                className="image-viewer-modal__control"
                                                onClick={handleZoomOut}
                                            >
                                                -
                                            </button>
                                            <span className="image-viewer-modal__zoom-value">
                                                {Math.round(imageZoom * 100)}%
                                            </span>
                                            <button
                                                type="button"
                                                className="image-viewer-modal__control"
                                                onClick={handleZoomIn}
                                            >
                                                +
                                            </button>
                                            <button
                                                type="button"
                                                className="image-viewer-modal__control reset"
                                                onClick={handleZoomReset}
                                            >
                                                Reset
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            className="image-viewer-modal__close"
                                            onClick={handleCloseImagePreview}
                                            aria-label="Đóng"
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <div
                                        className="image-viewer-modal__content"
                                        onWheel={handleImageWheel}
                                        onMouseMove={handleImageMouseMove}
                                        onMouseUp={stopImageDragging}
                                        onMouseLeave={stopImageDragging}
                                    >
                                        <img
                                            src={previewImage.url}
                                            alt={previewImage.fileName || "Ảnh góp ý"}
                                            onMouseDown={handleImageMouseDown}
                                            draggable="false"
                                            style={{
                                                transform: `translate(${imageOffset.x}px, ${imageOffset.y}px) scale(${imageZoom})`,
                                                cursor:
                                                    imageZoom > 1
                                                        ? isImageDragging
                                                            ? "grabbing"
                                                            : "grab"
                                                        : "default",
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Feedback;
