import React, { useEffect } from "react";

function ModalConfirm({ message, onConfirm, onCancel }) {
    useEffect(() => {
        // Lấy modal và sử dụng API Bootstrap 5 để điều khiển
        const modalElement = document.getElementById("ModalConfirm");
        const modal = new window.bootstrap.Modal(modalElement);

        modal.show();

        return () => {
            modal.hide();
        };
    }, []);

    return (
        <div
            className="modal fade"
            id="ModalConfirm"
            tabIndex="-1"
            aria-labelledby="exampleModalLabel"
            aria-hidden="true"
            style={{ zIndex: "50000" }}
            data-bs-keyboard="false"
            data-bs-backdrop="static"
        >
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title" id="exampleModalLabel">
                            Xác nhận
                        </h5>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="modal"
                            aria-label="Đóng"
                            onClick={onCancel}
                        ></button>
                    </div>
                    <div className="modal-body">{message}</div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onCancel}>
                            Hủy
                        </button>
                        <button type="button" className="btn btn-primary" onClick={onConfirm}>
                            Xác nhận
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ModalConfirm;
