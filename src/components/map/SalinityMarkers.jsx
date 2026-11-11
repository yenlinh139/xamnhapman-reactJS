import React from "react";
import L from "leaflet";
import { convertDMSToDecimal } from "@components/convertDMSToDecimal";
import { fetchSalinityPoints, fetchForecastLatest } from "@components/map/mapDataServices";
import { getSalinityIcon } from "@components/map/mapMarkers";
import { getSingleStationClassification } from "../../common/salinityClassification";

const ensureStationPanes = (mapInstance) => {
    const paneConfigs = [
        ["hydrometMarkerPane", 610],
        ["hydrometTooltipPane", 611],
        ["salinityMarkerPane", 620],
        ["salinityTooltipPane", 621],
        ["iotMarkerPane", 630],
        ["iotTooltipPane", 631],
    ];

    paneConfigs.forEach(([name, zIndex]) => {
        if (!mapInstance.getPane(name)) {
            mapInstance.createPane(name);
        }
        mapInstance.getPane(name).style.zIndex = String(zIndex);
    });
};

export const getSalinityTooltipClass = (salinity, stationCode = null) => {
    const classification = getSingleStationClassification(salinity, stationCode);
    switch (classification.level) {
        case "normal":
            return "custom-tooltip tooltip-normal";
        case "warning":
            return "custom-tooltip tooltip-warning";
        case "high-warning":
            return "custom-tooltip tooltip-high-warning";
        case "critical":
            return "custom-tooltip tooltip-critical";
        default:
            return "custom-tooltip";
    }
};

const formatPopupDateValue = (value, fallback = "Chưa có dữ liệu") => {
    if (!value) return fallback;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return String(value);
    }
    return parsed.toLocaleDateString("vi-VN");
};

// Dùng lại cho cả popup IoT (IoTMarkers.jsx) - cùng 1 bộ quy tắc hiển thị dự báo/quan trắc.
export const formatDecimalDisplay = (value, digits = 2) => {
    const numeric = Number.parseFloat(value);
    if (!Number.isFinite(numeric)) return "--";
    return numeric.toLocaleString("vi-VN", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
};

export const formatForecastTime = (isoString) => {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

export const formatForecastDateOnly = (isoString) => {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("vi-VN");
};

// Xu thế tăng/giảm dùng chung cho cả 3 khung giá trị (dự báo 2h / dự báo ngày / quan trắc), so
// với mốc GẦN NHẤT (không lùi tìm mốc khác biệt). Nếu không đổi thì vẫn hiện rõ "Không đổi" màu
// xám thay vì ẩn đi - chỉ trả null khi thực sự thiếu dữ liệu để so sánh.
// Luu y: Number(null) === 0 (huu han!) nen phai loai null/undefined truoc khi ep kieu, neu khong
// "thieu du lieu de so sanh" se bi hieu nham thanh "gia tri truoc = 0".
export const buildTrendMeta = (currentValue, previousValue) => {
    if (currentValue === null || currentValue === undefined) return null;
    if (previousValue === null || previousValue === undefined) return null;

    const current = Number(currentValue);
    const previous = Number(previousValue);
    if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;

    const diff = current - previous;
    if (Math.abs(diff) < 0.01) {
        return {
            text: "Không đổi so với",
            color: "#6c757d",
            icon: "■",
        };
    }

    return {
        text: `${diff > 0 ? "Tăng" : "Giảm"} ${formatDecimalDisplay(Math.abs(diff), 2)} ‰ so với`,
        color: diff > 0 ? "#dc3545" : "#198754",
        icon: diff > 0 ? "▲" : "▼",
    };
};

export const statusColorFromLevel = (level) => {
    switch (level) {
        case "critical":
            return "#dc3545";
        case "high-warning":
            return "#fd7e14";
        case "warning":
            return "#ffc107";
        default:
            return "#198754";
    }
};

// Khung giá trị dùng chung cho 3 loại: dự báo 2h / dự báo ngày / quan trắc. Cùng 1 cấu trúc
// value-label / value-number / (trend) / value-date / tổng bản ghi / khoảng thời gian.
// Màu số lớn (value-number) luôn theo CẤP RỦI RO của chính giá trị đó (statusColor) - xu thế
// tăng/giảm chỉ tô màu riêng cho dòng value-sub bên dưới.
export const buildValueBoxHtml = ({
    boxClass,
    label,
    valueText,
    statusColor,
    dateText,
    trend,
    previousDateText,
    totalRecordsText,
    rangeText,
}) => `
  <div class="${boxClass}">
    <span class="value-label">${label}</span>
    <span class="value-date">${dateText}</span>
    <span class="value-number" style="color: ${statusColor}">
      ${valueText}
    </span>
    ${
        trend
            ? `<span class="value-sub" style="color: ${trend.color}">${trend.icon} ${trend.text} ${previousDateText || ""}</span>`
            : ""
    }

    ${totalRecordsText ? `<span class="value-date">Tổng bản ghi: ${totalRecordsText}</span>` : ""}
    ${rangeText ? `<span class="value-date">${rangeText}</span>` : ""}
  </div>
`;

// Từ Forecast Result (/forecast-latest) build map manualCode -> { time, salinity, ... } của mốc dự báo
// "hiện tại". Mốc "hiện tại" do backend quyết định (currentIndex, tôn trọng biến
// FORECAST_NOW_OVERRIDE dùng cho test) - FE chỉ dùng lại, không tự tính Date.now() nữa để
// tránh lệch với giá trị hiển thị ở các màn khác (vd admin "Quản trị dữ liệu").
// Trả về { hasFutureForecast, totalRecords, firstTime, lastTime, intervalHours, isSynthetic, stations }
// - hasFutureForecast: co moc du bao thuc su nam trong tuong lai so voi "hien tai" hay khong (xem
//   getForecast.controller.js). Dung de quyet dinh uu tien mau/cap rui ro theo du bao hay quan trac.
export const buildForecastLookup = (forecastPayload) => {
    const empty = {
        hasFutureForecast: false,
        totalRecords: 0,
        firstTime: null,
        lastTime: null,
        intervalHours: null,
        isSynthetic: false,
        stations: {},
    };
    if (!forecastPayload?.timeGrid?.length || !forecastPayload?.stations?.length) {
        return empty;
    }

    let index = forecastPayload.currentIndex;
    if (!Number.isInteger(index) || index < 0 || index >= forecastPayload.timeGrid.length) {
        // Fallback cho payload cũ chưa có currentIndex (tuong thich nguoc)
        const now = Date.now();
        index = forecastPayload.timeGrid.findIndex((t) => new Date(t).getTime() >= now);
        if (index === -1) index = 0;
    }

    const timeGrid = forecastPayload.timeGrid;
    const firstTime = timeGrid[0];
    const lastTime = timeGrid[timeGrid.length - 1];
    const intervalHours = forecastPayload.intervalHours;
    const rowsPerDay = intervalHours ? Math.round(24 / intervalHours) : null;
    const previousIndex = index - 1 >= 0 ? index - 1 : null;
    const previousDailyIndex = rowsPerDay && index - rowsPerDay >= 0 ? index - rowsPerDay : null;

    const stations = {};
    forecastPayload.stations.forEach((station) => {
        const salinity = station.values?.[index];
        if (salinity !== null && salinity !== undefined) {
            stations[station.manualCode] = {
                time: timeGrid[index],
                salinity,
                previousTime: previousIndex !== null ? timeGrid[previousIndex] : null,
                previousSalinity: previousIndex !== null ? station.values?.[previousIndex] : null,
                dailySalinity: station.dailyValues?.[index] ?? null,
                previousDailyTime: previousDailyIndex !== null ? timeGrid[previousDailyIndex] : null,
                previousDailySalinity:
                    previousDailyIndex !== null ? station.dailyValues?.[previousDailyIndex] : null,
            };
        }
    });

    return {
        hasFutureForecast: Boolean(forecastPayload.hasFutureForecast),
        totalRecords: timeGrid.length,
        firstTime,
        lastTime,
        intervalHours,
        isSynthetic: forecastPayload.isSynthetic,
        stations,
    };
};

export const createSalinityPopup = (
    point,
    latestSalinity,
    latestDate,
    trend,
    previousDate,
    forecastInfo = null,
    forecastMeta = null,
    classificationValue = null,
) => {
    const pointLatestValue = Number(point?.latest_value);
    const fallbackLatestValue = Number(latestSalinity);
    const salinityValue = Number.isFinite(pointLatestValue)
        ? pointLatestValue
        : Number.isFinite(fallbackLatestValue)
          ? fallbackLatestValue
          : null;

    const hasValidSalinity = Number.isFinite(salinityValue);
    const formattedSalinity = hasValidSalinity ? formatDecimalDisplay(salinityValue, 2) : "N/A";
    const descriptionText = point.MoTa || point.PhanLoai || "Không có mô tả";
    const latestDateText =
        latestDate || formatPopupDateValue(point?.latest_date, "Chưa có thời gian quan trắc");
    const previousDateText = previousDate || formatPopupDateValue(point?.previous_date, "Chưa có dữ liệu");
    const startDateText = formatPopupDateValue(point?.start_date, "Không xác định");
    const endDateText = formatPopupDateValue(point?.end_date, "Không xác định");
    const frequencyText = point?.TanSuat || "Không xác định";
    const totalRecordsText = Number.isFinite(Number(point?.total_records))
        ? Number(point.total_records).toLocaleString("vi-VN")
        : "--";

    const latDecimal = convertDMSToDecimal(point?.ViDo);
    const lngDecimal = convertDMSToDecimal(point?.KinhDo);
    const latDisplay = Number.isFinite(latDecimal)
        ? formatDecimalDisplay(latDecimal, 6)
        : point.ViDo || "Không xác định";
    const lngDisplay = Number.isFinite(lngDecimal)
        ? formatDecimalDisplay(lngDecimal, 6)
        : point.KinhDo || "Không xác định";
    const stationCodeForClick = String(point.KiHieu || "").replace(/'/g, "\\'");
    const stationNameForClick = String(point.TenDiem || "").replace(/'/g, "\\'");

    const stationCode = point.KiHieu;
    // Nhãn trạng thái ở header + màu icon trên bản đồ: ưu tiên mốc dự báo gần nhất trong
    // tương lai (nếu có); nếu chuỗi dự báo không còn mốc tương lai nào thì dùng quan trắc gần nhất.
    // (classificationValue do renderSalinityPoints tính sẵn và truyền vào; fallback về giá trị
    // quan trắc nếu không được truyền, để hàm này vẫn dùng độc lập được.)
    const valueForClassification = Number.isFinite(Number(classificationValue))
        ? Number(classificationValue)
        : salinityValue;
    const classification = getSingleStationClassification(valueForClassification, stationCode);
    const statusClass = `status-${classification.level}`;
    const statusText = classification.shortText;
    const statusColor = statusColorFromLevel(classification.level);

    // 3 khung giá trị: ĐỘ MẶN DỰ BÁO (2 giờ) / ĐỘ MẶN DỰ BÁO (ngày) / ĐỘ MẶN QUAN TRẮC (4 lần/tháng)
    // (không có ở KXD2) mới hiện 2 khung dự báo đầu.
    let boxesHtml = "";
    const forecastSalinity = Number(forecastInfo?.salinity);
    if (forecastInfo && Number.isFinite(forecastSalinity)) {
        const salinityClass = getSingleStationClassification(forecastSalinity, stationCode);
        const dailySalinity = Number(forecastInfo?.dailySalinity);
        const dailyClass = Number.isFinite(dailySalinity)
            ? getSingleStationClassification(dailySalinity, stationCode)
            : null;

        const trend2h = buildTrendMeta(forecastSalinity, forecastInfo.previousSalinity);
        const trendDaily = Number.isFinite(dailySalinity)
            ? buildTrendMeta(dailySalinity, forecastInfo.previousDailySalinity)
            : null;

        const rangeText =
            forecastMeta?.firstTime && forecastMeta?.lastTime
                ? `Thời gian: ${formatForecastTime(forecastMeta.firstTime)} - ${formatForecastTime(forecastMeta.lastTime)}`
                : "";
        const totalForecastText = Number.isFinite(forecastMeta?.totalRecords)
            ? forecastMeta.totalRecords.toLocaleString("vi-VN")
            : "";

        const box2hHtml = buildValueBoxHtml({
            boxClass: "popup-forecast-value",
            label: "ĐỘ MẶN DỰ BÁO (2 giờ)",
            valueText: `${formatDecimalDisplay(forecastSalinity, 2)} ‰`,
            statusColor: salinityClass ? statusColorFromLevel(salinityClass.level) : statusColor,
            dateText: formatForecastTime(forecastInfo.time),
            trend: trend2h,
            previousDateText: forecastInfo.previousTime ? formatForecastTime(forecastInfo.previousTime) : "",
            totalRecordsText: totalForecastText,
            rangeText,
        });

        const boxDailyHtml = Number.isFinite(dailySalinity)
            ? buildValueBoxHtml({
                  boxClass: "popup-forecast-value",
                  label: "ĐỘ MẶN DỰ BÁO (ngày)",
                  valueText: `${formatDecimalDisplay(dailySalinity, 2)} ‰`,
                  statusColor: dailyClass ? statusColorFromLevel(dailyClass.level) : statusColor,
                  dateText: formatForecastDateOnly(forecastInfo.time),
                  trend: trendDaily,
                  previousDateText: forecastInfo.previousDailyTime
                      ? formatForecastDateOnly(forecastInfo.previousDailyTime)
                      : "",
                  totalRecordsText: totalForecastText,
                  rangeText,
              })
            : "";

        boxesHtml = `${box2hHtml}${boxDailyHtml}`;
    }

    // Màu số liệu trong khung "Quan trắc" luôn theo đúng cấp rủi ro của CHÍNH giá trị quan trắc
    // (độc lập với badge ở header, lúc này có thể đang theo dự báo)
    const actualClassification = getSingleStationClassification(salinityValue, stationCode);
    const actualStatusColor = statusColorFromLevel(actualClassification.level);
    const actualTrend = buildTrendMeta(salinityValue, point?.previous_value);
    const actualValueBoxHtml = buildValueBoxHtml({
        boxClass: "popup-main-value",
        label: `ĐỘ MẶN QUAN TRẮC (${frequencyText})`,
        valueText: `${formattedSalinity} ‰`,
        statusColor: actualStatusColor,
        dateText: latestDateText,
        trend: trend || actualTrend,
        previousDateText,
        totalRecordsText,
        rangeText: `Thời gian: ${startDateText} - ${endDateText}`,
    });

    return `
    <div class="modern-popup salinity-popup">
      <div class="popup-header">
        <div class="popup-title">
          <h4 class="popup-name">${point.TenDiem}</h4>
          <span class="popup-type">Điểm đo mặn</span>
        </div>
        <div class="popup-status ${statusClass}">
          ${statusText}
        </div>
      </div>

      <div class="popup-content">
        <div class="popup-value-row${boxesHtml ? " double" : ""}">${boxesHtml}${actualValueBoxHtml}</div>

        <div class="popup-details">
          <div class="detail-grid">
            <div class="detail-item">
              <div class="detail-content py-2">
                <strong class="detail-label">Mã trạm: </strong>
                <span class="detail-value">${point.KiHieu || "Không xác định"}</span>
              </div>
            </div>

            <div class="detail-item">
              <div class="detail-content py-2">
                <strong class="detail-label font-weight">Mô tả: </strong>
                <span class="detail-value">${descriptionText}</span>
              </div>
            </div>

            <div class="detail-item">
              <div class="detail-content py-2">
                <strong class="detail-label">Kinh độ: </strong>
                <span class="detail-value">${lngDisplay}</span>
              </div>
            </div>

            <div class="detail-item">
              <div class="detail-content py-2">
                <strong class="detail-label">Vĩ độ: </strong>
                <span class="detail-value">${latDisplay}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="popup-actions">
          <button class="action-btn primary" onclick="window.openChartDetails('${stationCodeForClick}', '${stationNameForClick}')">
            Xem dữ liệu chi tiết
          </button>
        </div>
      </div>
    </div>
  `;
};

export const renderSalinityPoints = async (mapInstance, setSalinityData, setSelectedPoint) => {
    try {
        ensureStationPanes(mapInstance);

        const [points, forecastPayload] = await Promise.all([fetchSalinityPoints(), fetchForecastLatest()]);
        const forecastLookup = buildForecastLookup(forecastPayload);
        const latLngs = [];

        for (const point of points) {
            const lat = convertDMSToDecimal(point.ViDo);
            const lng = convertDMSToDecimal(point.KinhDo);

            if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
                console.warn(`⚠️ Không thể chuyển tọa độ tại điểm ${point.TenDiem}`);
                continue;
            }

            // Use latest/previous values directly from fetchSalinityPoints API response
            const latestSalinity = point.latest_value;
            const latestDate = point.latest_date
                ? new Date(point.latest_date).toLocaleDateString("vi-VN")
                : null;
            const previousDate = point.previous_date
                ? new Date(point.previous_date).toLocaleDateString("vi-VN")
                : null;

            // Xu thế quan trắc (kể cả trạng thái "không đổi") do createSalinityPopup tự tính qua
            // buildTrendMeta - không cần tính lại ở đây nữa.

            // Mau icon/tooltip/badge: uu tien moc du bao 2h gan nhat trong TUONG LAI (neu con);
            // neu chuoi du bao khong con moc tuong lai nao (vd du lieu mau lich su) thi dung lai
            // gia tri quan trac gan nhat.
            const forecastInfo = forecastLookup.stations[point.KiHieu] || null;
            const forecastSalinityValue = Number(forecastInfo?.salinity);
            const classificationValue =
                forecastLookup.hasFutureForecast && Number.isFinite(forecastSalinityValue)
                    ? forecastSalinityValue
                    : latestSalinity;

            const icon = getSalinityIcon(classificationValue, point.KiHieu);
            const tooltipClass = getSalinityTooltipClass(classificationValue, point.KiHieu);

            const marker = L.marker([lat, lng], {
                icon,
                isSalinityPoint: true,
                pane: "salinityMarkerPane",
                zIndexOffset: 2000,
            }).addTo(mapInstance);

            latLngs.push([lat, lng]);

            marker.bindTooltip(point.TenDiem, {
                permanent: true,
                direction: "top",
                offset: [0, -10],
                className: `${tooltipClass} station-tooltip`,
                pane: "salinityTooltipPane",
            });

            const popupHTML = createSalinityPopup(
                point,
                latestSalinity,
                latestDate,
                null,
                previousDate,
                forecastInfo,
                forecastLookup,
                classificationValue,
            );

            marker.bindPopup(popupHTML, {
                maxWidth: forecastInfo ? 440 : 300,
                className: "custom-popup",
                autoClose: true,
                closeOnClick: true,
            });

            marker.on("click", async () => {
                try {
                    marker.openPopup();

                    // Store point info for later (data will be fetched on demand when clicking "Xem biểu đồ")
                    setSelectedPoint({
                        kiHieu: point.KiHieu,
                        tenDiem: point.TenDiem,
                        thongTin: point,
                    });
                } catch (error) {
                    console.error("❌ Error in marker click handler:", error);
                }
            });
        }
    } catch (error) {
        console.error("❌ Error rendering salinity points:", error);
    }
};
