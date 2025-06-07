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
