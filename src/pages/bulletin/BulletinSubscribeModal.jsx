import React, { useEffect, useState } from "react";
import axiosInstance from "@config/axios-config";
import { ToastCommon } from "@components/ToastCommon";
import { TOAST } from "@common/constants";

const GROUPS = [
    { key: "salinity", label: "Điểm đo mặn" },
    { key: "iot", label: "Trạm IoT" },
    { key: "huyen", label: "Đơn vị hành chính cấp huyện" },
];

const EMPTY_SELECTION = { salinity: [], iot: [], huyen: [] };

const BulletinSubscribeModal = ({ show, onClose, onSaved }) => {
    const [options, setOptions] = useState(null);
    const [selected, setSelected] = useState(EMPTY_SELECTION);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!show) return undefined;
        let cancelled = false;
        setLoading(true);
        Promise.all([axiosInstance.get("/bulletin/options"), axiosInstance.get("/bulletin/subscriptions")])
            .then(([optionsResponse, subscriptionsResponse]) => {
                if (cancelled) return;
                setOptions(optionsResponse.data);
                setSelected({ ...EMPTY_SELECTION, ...subscriptionsResponse.data });
            })
            .catch((error) => {
                console.error("Lỗi tải thông tin đăng ký bản tin:", error);
                if (!cancelled) ToastCommon(TOAST.ERROR, "Không tải được danh sách khu vực");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [show]);

    if (!show) return null;

    const toggle = (group, code) =>
        setSelected((current) => ({
            ...current,
            [group]: current[group].includes(code)
                ? current[group].filter((item) => item !== code)
                : [...current[group], code],
        }));

    const totalSelected = GROUPS.reduce((sum, group) => sum + selected[group.key].length, 0);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const { data } = await axiosInstance.put("/bulletin/subscriptions", selected);
            ToastCommon(TOAST.SUCCESS, data?.message || "Đăng ký nhận bản tin thành công");
            onSaved?.(data?.subscriptions || selected);
            onClose();
        } catch (error) {
            console.error("Lỗi lưu đăng ký bản tin:", error);
            ToastCommon(TOAST.ERROR, "Không lưu được đăng ký, vui lòng thử lại");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                <form className="modal-content" onSubmit={handleSubmit}>
                    <div className="modal-header">
                        <h5 className="modal-title fw-bold">Đăng kí nhận bản tin dự báo, cảnh báo xâm nhập mặn</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        {loading || !options ? (
                            <div className="text-center py-4">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Đang tải...</span>
                                </div>
                            </div>
                        ) : (
                            <>
                                <p className="text-muted small">
                                    Chọn các khu vực muốn nhận bản tin. Đăng kí theo huyện sẽ nhận bản tin của mọi
                                    điểm đo mặn, trạm IoT nằm trong huyện đó.
                                </p>
                                {GROUPS.map((group) => (
                                    <fieldset key={group.key} className="mb-3">
                                        <legend className="fs-6 fw-bold mb-2">
                                            {group.label}{" "}
                                            <span className="text-muted fw-normal small">
                                                ({selected[group.key].length}/{options[group.key].length})
                                            </span>
                                        </legend>
                                        <div className="row g-2">
                                            {options[group.key].map((option) => {
                                                const inputId = `bulletin-${group.key}-${option.code}`;
                                                return (
                                                    <div className="col-12 col-sm-6 col-lg-4" key={option.code}>
                                                        <div className="form-check">
                                                            <input
                                                                id={inputId}
                                                                type="checkbox"
                                                                className="form-check-input"
                                                                checked={selected[group.key].includes(option.code)}
                                                                onChange={() => toggle(group.key, option.code)}
                                                            />
                                                            <label className="form-check-label" htmlFor={inputId}>
                                                                {option.name}
                                                            </label>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </fieldset>
                                ))}
                            </>
                        )}
                    </div>
                    <div className="modal-footer">
                        <span className="text-muted small me-auto">Đã chọn {totalSelected} khu vực</span>
                        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                            Đóng
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading || saving || !options}>
                            {saving ? "Đang gửi..." : "Gửi"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BulletinSubscribeModal;
