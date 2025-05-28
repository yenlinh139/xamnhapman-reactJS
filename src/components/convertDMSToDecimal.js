export const convertDMSToDecimal = (dms) => {
  const dmsRegex = /(\d+)°(\d+)'([\d.]+)"([NSEW])/;
  const match = dms.trim().match(dmsRegex);

  if (!match) return null;

  const degrees = parseFloat(match[1]);
  const minutes = parseFloat(match[2]);
  const seconds = parseFloat(match[3]);
  const direction = match[4];

  let decimal = degrees + minutes / 60 + seconds / 3600;

  if (direction === 'S' || direction === 'W') {
    decimal *= -1;
  }

  return decimal;
};

export const convertDMSToDecimalNo = (dms) => {
  if (!dms) return null;

  const match = dms.match(/^(-?\d+)°(\d+)'(\d+)"$/);
  if (match) {
    const degrees = parseFloat(match[1]);
    const minutes = parseFloat(match[2]);
    const seconds = parseFloat(match[3]);

    let decimal = degrees + minutes / 60 + seconds / 3600;

    // If the degrees is negative, make sure the whole result is negative
    if (degrees < 0) {
      decimal = -Math.abs(decimal);
    }

    return decimal;
  }

  // Log warning if format doesn't match
  console.warn('Invalid DMS format:', dms);
  return null;
};

export const dmsToDecimal = (dms) => {
  const regex = /(\d+)°(\d+)'([\d.]+)"([NSEW])/;
  const match = dms.match(regex);
  if (!match) return null;

  const degrees = parseFloat(match[1]);
  const minutes = parseFloat(match[2]);
  const seconds = parseFloat(match[3]);
  const direction = match[4];

  let decimal = degrees + minutes / 60 + seconds / 3600;
  if (direction === 'S' || direction === 'W') {
    decimal = -decimal;
  }
  return decimal;
};
