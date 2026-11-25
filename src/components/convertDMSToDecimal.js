export const convertDMSToDecimal = (dms) => {
    const dmsRegex = /(\d+)°(\d+)'([\d.]+)"([NSEW])/;
    const match = dms.trim().match(dmsRegex);

    if (!match) return null;

    const degrees = parseFloat(match[1]);
    const minutes = parseFloat(match[2]);
    const seconds = parseFloat(match[3]);
    const direction = match[4];

    let decimal = degrees + minutes / 60 + seconds / 3600;

    if (direction === "S" || direction === "W") {
        decimal *= -1;
    }

    return decimal;
};

// Chieu nguoc lai: do thap phan -> chuoi DMS dung dinh dang luu trong DB (vd 106.49917 -> 106°29'57"E).
// isLatitude = true -> huong N/S, false -> huong E/W.
export const decimalToDMS = (decimal, isLatitude) => {
    const value = Number(decimal);
    if (!Number.isFinite(value)) return null;

    const direction = isLatitude ? (value < 0 ? "S" : "N") : value < 0 ? "W" : "E";
    const absolute = Math.abs(value);
    const degrees = Math.floor(absolute);
    const minutesFull = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesFull);
    const seconds = (minutesFull - minutes) * 60;

    return `${degrees}°${minutes}'${seconds.toFixed(2)}"${direction}`;
};

export const dmsToDecimal = (dms) => {
    if (!dms) return null;

    // Chuẩn hóa Unicode ký tự về ASCII
    dms = dms.replace(/[’‘]/g, "'").replace(/[”“]/g, '"');

    // Bắt degrees, minutes, optional seconds
    const regex = /(\d+)°\s*(\d+)'(?:\s*([\d.]+)")?/;
    const match = dms.match(regex);

    if (!match) return null;

    const degrees = parseFloat(match[1]);
    const minutes = parseFloat(match[2]);
    const seconds = match[3] ? parseFloat(match[3]) : 0;

    const decimal = degrees + minutes / 60 + seconds / 3600;
    return decimal;
};
