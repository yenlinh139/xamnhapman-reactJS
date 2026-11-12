import React from "react";
import { DATE_RANGE_PRESETS, findActivePresetKey } from "@common/dateRangePresets";

// Dropdown chọn nhanh giai đoạn [7 ngày] [30 ngày] [90 ngày] [Toàn bộ].
const RangePresetSelect = ({ startDate, endDate, minDate, maxDate, onSelect, disabled = false, style }) => (
    <select
        className="form-select form-select-sm"
        style={{ width: 100, ...style }}
        value={findActivePresetKey(startDate, endDate, { startDate: minDate, endDate: maxDate })}
        onChange={(e) => onSelect(e.target.value)}
        disabled={disabled || !maxDate}
    >
        <option value="" disabled>
            Chọn nhanh...
        </option>
        {DATE_RANGE_PRESETS.map((preset) => (
            <option key={preset.key} value={preset.key}>
                {preset.label}
            </option>
        ))}
    </select>
);

export default RangePresetSelect;
