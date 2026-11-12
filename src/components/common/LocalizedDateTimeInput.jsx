import React, { useEffect, useRef, useState } from "react";

// Giống hệt LocalizedDateInput (chữ gõ được dd/mm/yyyy, lịch popup native ẩn phía sau) nhưng có
// thêm giờ:phút - dùng cho các form cần nhập chính xác "Thời điểm" (ngày + giờ) như bảng chi tiết
// quan trắc độ mặn, thay cho input type="datetime-local" mặc định (hiển thị mm/dd/yyyy theo
// locale trình duyệt, không đổi được sang dd/mm/yyyy).
const formatIsoToDisplay = (isoValue) => {
    if (!isoValue) return "";
    const [datePart, timePart] = String(isoValue).split("T");
    const [year, month, day] = (datePart || "").split("-");
    if (!year || !month || !day) return "";
    const hhmm = (timePart || "00:00").slice(0, 5);
    return `${day}/${month}/${year} ${hhmm}`;
};

const parseDisplayToIso = (text) => {
    const raw = String(text || "").trim();
    const matched = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})$/);
    if (!matched) return "";

    const [, dd, mm, yyyy, hh, min] = matched;
    const day = Number(dd);
    const month = Number(mm);
    const year = Number(yyyy);
    const hour = Number(hh);
    const minute = Number(min);
    const parsed = new Date(year, month - 1, day, hour, minute);

    if (
        Number.isNaN(parsed.getTime()) ||
        parsed.getDate() !== day ||
        parsed.getMonth() + 1 !== month ||
        parsed.getFullYear() !== year ||
        parsed.getHours() !== hour ||
        parsed.getMinutes() !== minute
    ) {
        return "";
    }

    const pad = (n) => String(n).padStart(2, "0");
    return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
};

const clampToRange = (value, min, max) => {
    if (!value) return value;
    if (min && value < min) return min;
    if (max && value > max) return max;
    return value;
};

const LocalizedDateTimeInput = ({
    id,
    value,
    onChange,
    className,
    style,
    placeholder = "dd/mm/yyyy hh:mm",
    min,
    max,
    disabled,
    required,
}) => {
    const nativeInputRef = useRef(null);
    const [displayValue, setDisplayValue] = useState(formatIsoToDisplay(value));

    useEffect(() => {
        setDisplayValue(formatIsoToDisplay(value));
    }, [value]);

    const emitChange = (nextValue) => {
        if (typeof onChange !== "function") return;
        onChange({ target: { id, value: nextValue }, currentTarget: { id, value: nextValue } });
    };

    const openPicker = () => {
        const native = nativeInputRef.current;
        if (!native || disabled) return;
        if (typeof native.showPicker === "function") {
            native.showPicker();
        }
    };

    const wrapperWidth = style?.width || "100%";

    return (
        <span style={{ position: "relative", display: "inline-block", width: wrapperWidth }}>
            <input
                type="text"
                id={id}
                className={className}
                style={style}
                value={displayValue}
                onChange={(e) => setDisplayValue(e.target.value)}
                onBlur={() => {
                    const parsed = parseDisplayToIso(displayValue);
                    if (parsed) {
                        const clamped = clampToRange(parsed, min, max);
                        setDisplayValue(formatIsoToDisplay(clamped));
                        emitChange(clamped);
                    } else {
                        setDisplayValue(formatIsoToDisplay(value));
                    }
                }}
                onFocus={openPicker}
                onClick={openPicker}
                placeholder={placeholder}
                autoComplete="off"
                disabled={disabled}
                required={required}
            />

            <input
                ref={nativeInputRef}
                type="datetime-local"
                tabIndex={-1}
                aria-hidden="true"
                value={value || ""}
                min={min}
                max={max}
                disabled={disabled}
                onChange={(e) => {
                    const nextValue = e.target.value;
                    setDisplayValue(formatIsoToDisplay(nextValue));
                    emitChange(nextValue);
                }}
                style={{ position: "absolute", inset: 0, opacity: 0, pointerEvents: "none" }}
            />
        </span>
    );
};

export default LocalizedDateTimeInput;
