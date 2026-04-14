import React, { useEffect, useRef, useState } from "react";

const formatIsoToDisplay = (isoDate) => {
    if (!isoDate) return "";
    const [year, month, day] = String(isoDate).split("-");
    if (!year || !month || !day) return "";
    return `${day}/${month}/${year}`;
};

const parseDisplayToIso = (text) => {
    const raw = String(text || "").trim();
    const matched = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!matched) return "";

    const [, dd, mm, yyyy] = matched;
    const day = Number(dd);
    const month = Number(mm);
    const year = Number(yyyy);
    const parsed = new Date(year, month - 1, day);

    if (
        Number.isNaN(parsed.getTime()) ||
        parsed.getDate() !== day ||
        parsed.getMonth() + 1 !== month ||
        parsed.getFullYear() !== year
    ) {
        return "";
    }

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const LocalizedDateInput = ({
    id,
    name,
    value,
    onChange,
    className,
    style,
    placeholder = "dd/mm/yyyy",
    min,
    max,
    disabled,
    required,
    autoComplete = "off",
}) => {
    const nativeInputRef = useRef(null);
    const [displayValue, setDisplayValue] = useState(formatIsoToDisplay(value));

    useEffect(() => {
        setDisplayValue(formatIsoToDisplay(value));
    }, [value]);

    const emitChange = (nextIsoValue) => {
        if (typeof onChange !== "function") return;

        onChange({
            target: {
                id,
                name,
                value: nextIsoValue,
            },
            currentTarget: {
                id,
                name,
                value: nextIsoValue,
            },
        });
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
                name={name}
                className={className}
                style={style}
                value={displayValue}
                onChange={(e) => setDisplayValue(e.target.value)}
                onBlur={() => {
                    const isoDate = parseDisplayToIso(displayValue);
                    if (isoDate) {
                        setDisplayValue(formatIsoToDisplay(isoDate));
                        emitChange(isoDate);
                    } else {
                        setDisplayValue(formatIsoToDisplay(value));
                    }
                }}
                onFocus={openPicker}
                onClick={openPicker}
                placeholder={placeholder}
                autoComplete={autoComplete}
                inputMode="numeric"
                disabled={disabled}
                required={required}
            />

            <input
                ref={nativeInputRef}
                type="date"
                tabIndex={-1}
                aria-hidden="true"
                value={value || ""}
                min={min}
                max={max}
                disabled={disabled}
                onChange={(e) => {
                    const isoDate = e.target.value;
                    setDisplayValue(formatIsoToDisplay(isoDate));
                    emitChange(isoDate);
                }}
                style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0,
                    pointerEvents: "none",
                }}
            />
        </span>
    );
};

export default LocalizedDateInput;
