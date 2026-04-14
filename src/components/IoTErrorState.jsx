import React from "react";

const IoTErrorState = ({ message, onRetry }) => {
    return (
        <div className="iot-error">
            <div className="error-icon">
                <i className="fas fa-exclamation-triangle"></i>
            </div>
            <div className="error-text">{message}</div>
            {onRetry && (
                <button className="retry-btn" onClick={onRetry}>
                    <i className="fas fa-redo"></i>
                    Thử lại
                </button>
            )}
        </div>
    );
};

export default IoTErrorState;
