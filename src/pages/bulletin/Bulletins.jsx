import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import Header from "@pages/themes/headers/Header";
import Footer from "@pages/themes/footer/Footer";
import axiosInstance from "@config/axios-config";
import { formatSummaryTime } from "@components/map/administrativeSummary";
import { RISK_COLOR_MAP } from "@pages/map/SalinityRiskLegend";
import BulletinSubscribeModal from "@pages/bulletin/BulletinSubscribeModal";
import SalinityReport from "@pages/salinity/SalinityReport";
import SortableHeader from "@components/common/SortableHeader";
import { useSortableRows } from "@common/useSortableRows";

// Tab chính: "observed" là báo cáo quan trắc độ mặn theo ngày (trang Báo cáo độ mặn trước đây),
// "alerts" gộp chung Cảnh báo + Dự báo, chọn tiếp bằng thanh chuyển đổi con (ALERT_TYPES).
const PRIMARY_TABS = [
    { key: "observed", label: "Quan trắc" },
    { key: "alerts", label: "Cảnh báo, dự báo" },
];

const ALERT_TYPES = [
    { key: "warning", label: "Cảnh báo" },
    { key: "forecast", label: "Dự báo" },
];

const TARGET_GROUPS = [
    { key: "salinity", label: "Điểm đo mặn" },
    { key: "iot", label: "Trạm IoT" },
    { key: "huyen", label: "Đơn vị hành chính" },
];

const RISK_COLORS = [
    RISK_COLOR_MAP.normal,
    RISK_COLOR_MAP.warning,
    RISK_COLOR_MAP["high-warning"],
    RISK_COLOR_MAP.critical,
];

const formatNumber = (value) =>
    Number(value).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const issuedText = (bulletin) => formatSummaryTime(bulletin.issuedAt, bulletin.issuedResolution);

const timeText = (time) => formatSummaryTime(time, String(time).length <= 10 ? "day" : "time");

// "2026-08-21" -> "21/08/2026"
const formatDMY = (day) => {
    const matched = String(day).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return matched ? `${matched[3]}/${matched[2]}/${matched[1]}` : String(day);
};

const hydrologyLines = (bulletin) => {
    const intro = bulletin.hydrologyWindow
        ? `Trong 7 ngày qua từ ${formatDMY(bulletin.hydrologyWindow.start)} đến ngày ${formatDMY(bulletin.hydrologyWindow.end)}, diễn biến mực nước tại các trạm như sau:`
        : null;
    const lines =
        bulletin.hydrology.length === 0
            ? ["Chưa có số liệu mực nước trong 7 ngày qua"]
            : bulletin.hydrology.map(
                  (item) =>
                      `${item.name}: trung bình ${formatNumber(item.mean)} ${item.unit}, lớn nhất ${formatNumber(item.max)} ${item.unit}, nhỏ nhất ${formatNumber(item.min)} ${item.unit}`,
              );
    return intro ? [intro, ...lines] : lines;
};

const peakText = (peak) =>
    peak ? `${formatNumber(peak.value)} ‰ (${timeText(peak.time)})` : "Chưa có số liệu";

// "Hiện trạng XNM (7 ngày qua)": độ mặn quan trắc lớn nhất trong 7 ngày trước thời điểm dự báo,
// liệt kê ĐỦ các ngày đạt giá trị đó (có thể lặp lại nhiều ngày).
const currentXnmText = (bulletin) => {
    if (!bulletin.current || !bulletin.hydrologyWindow) {
        return "Chưa có số liệu độ mặn quan trắc trong 7 ngày qua";
    }
    const { start, end } = bulletin.hydrologyWindow;
    const days = bulletin.current.days.map(formatDMY).join(", ");
    return `Trong 7 ngày qua từ ${formatDMY(start)} đến ngày ${formatDMY(end)}, độ mặn tại điểm đo đạt giá trị lớn nhất là ${formatNumber(bulletin.current.value)} ‰ (ghi nhận vào ngày ${days})`;
};

// "Dự báo XNM (10 ngày tới)": độ mặn dự báo lớn nhất trong cả chuỗi dự báo, liệt kê ĐỦ các mốc
// giờ đạt giá trị đó.
const forecastXnmText = (bulletin) => {
    if (!bulletin.forecast || !bulletin.forecastWindow) return "Chưa có số liệu dự báo độ mặn";
    const { start, end } = bulletin.forecastWindow;
    const times = bulletin.forecast.times.map((time) => formatSummaryTime(time, "time")).join(", ");
    return `Trong 10 ngày tới từ ${formatDMY(start)} đến ngày ${formatDMY(end)}, độ mặn tại điểm đo dự báo đạt giá trị lớn nhất là ${formatNumber(bulletin.forecast.value)} ‰ (ghi nhận vào lúc ${times})`;
};

const stationLabel = (bulletin) =>
    `${bulletin.stationType === "iot" ? "Trạm IoT" : "Điểm đo mặn"} ${bulletin.stationName}`;

// Các cột của danh sách theo mẫu; dùng chung cho bảng, CSV và bản in.
// `sortValue` trả về giá trị đã chuẩn hoá (số/ngày) để sort đúng, khác với `text` (chuỗi hiển thị).
const buildColumns = (type) => [
    { label: "Vị trí", text: stationLabel, sortValue: stationLabel },
    {
        label: "Khu vực",
        text: (bulletin) => bulletin.tenHuyen || "-",
        sortValue: (bulletin) => bulletin.tenHuyen || "",
    },
    {
        label: "Hiện trạng thủy văn (7 ngày qua)",
        text: (bulletin) => hydrologyLines(bulletin).join("; "),
        sortValue: (bulletin) => bulletin.hydrology[0]?.mean ?? null,
    },
    ...(type === "forecast"
        ? [
              {
                  label: "Hiện trạng XNM (7 ngày qua)",
                  text: currentXnmText,
                  sortValue: (bulletin) => bulletin.current?.value ?? null,
              },
              {
                  label: "Dự báo XNM (10 ngày tới)",
                  text: forecastXnmText,
                  sortValue: (bulletin) => bulletin.forecast?.value ?? null,
              },
          ]
        : [
              {
                  label: "Độ mặn quan trắc",
                  text: (bulletin) => peakText(bulletin.observed),
                  sortValue: (bulletin) => bulletin.observed?.value ?? null,
              },
          ]),
    {
        label: "Cảnh báo cấp độ rủi ro thiên tai do XNM",
        text: (bulletin) => bulletin.risk.label,
        sortValue: (bulletin) => bulletin.risk.level,
    },
    { label: "Thời gian ban hành", text: issuedText, sortValue: (bulletin) => bulletin.issuedAt },
];

const escapeHtml = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

const printHtml = (title, bodyHtml) => {
    const printWindow = window.open("", "_blank", "width=1000,height=700");
    if (!printWindow) {
        alert("Trình duyệt đang chặn cửa sổ in, vui lòng cho phép pop-up.");
        return;
    }
    printWindow.document
        .write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
        <style>
            body { font-family: "Segoe UI", Arial, sans-serif; margin: 24px; color: #1f2937; }
            h1 { font-size: 20px; } h2 { font-size: 15px; margin: 16px 0 4px; }
            table { border-collapse: collapse; width: 100%; font-size: 12px; }
            th, td { border: 1px solid #9ca3af; padding: 6px 8px; text-align: left; vertical-align: top; }
            th { background: #f3f4f6; } ul { margin: 4px 0; padding-left: 20px; }
        </style></head><body>${bodyHtml}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
};

const bulletinSections = (bulletin) => [
    { title: "Hiện trạng thủy văn (7 ngày qua)", lines: hydrologyLines(bulletin) },
    ...(bulletin.type === "forecast"
        ? [
              {
                  title: "Hiện trạng xâm nhập mặn (7 ngày qua)",
                  lines: [currentXnmText(bulletin)],
              },
              {
                  title: "Dự báo xâm nhập mặn (10 ngày tới)",
                  lines: [forecastXnmText(bulletin)],
              },
          ]
        : [{ title: "Độ mặn quan trắc", lines: [peakText(bulletin.observed)] }]),
    {
        title: "Cảnh báo cấp độ rủi ro thiên tai do xâm nhập mặn",
        lines: [
            `${bulletin.risk.label} (dựa trên ${bulletin.type === "forecast" ? "độ mặn dự báo lớn nhất trong 10 ngày tới" : "độ mặn quan trắc"})`,
        ],
    },
    { title: "Thời gian ban hành bản tin", lines: [issuedText(bulletin)] },
];

const RiskBadge = ({ risk }) => (
    <span
        className="badge"
        style={{
            backgroundColor: RISK_COLORS[risk.level] || RISK_COLOR_MAP["no-data"],
            color: risk.level === 1 ? "#212529" : "#fff",
        }}
    >
        {risk.label}
    </span>
);

const BulletinDetailModal = ({ bulletin, onClose }) => {
    if (!bulletin) return null;
    const sections = bulletinSections(bulletin);

    const handlePrint = () =>
        printHtml(
            bulletin.title,
            `<h1>${escapeHtml(bulletin.title)}</h1><p>Khu vực: ${escapeHtml(bulletin.tenHuyen || "-")}</p>${sections
                .map(
                    (section) =>
                        `<h2>${escapeHtml(section.title)}</h2><ul>${section.lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`,
                )
                .join("")}`,
        );

    return (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content">
                    <div className="modal-header">
                        <div>
                            <h5 className="modal-title fw-bold">{bulletin.title}</h5>
                            <div className="text-muted small">Khu vực: {bulletin.tenHuyen || "-"}</div>
                        </div>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        {sections.map((section) => (
                            <div key={section.title} className="mb-3">
                                <h6 className="fw-bold mb-1">{section.title}</h6>
                                <ul className="mb-0">
                                    {section.lines.map((line) => (
                                        <li key={line}>{line}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                        <RiskBadge risk={bulletin.risk} />
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-outline-primary" onClick={handlePrint}>
                            In bản tin
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Đóng
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Bulletins = () => {
    const [primaryTab, setPrimaryTab] = useState("observed");
    const [alertType, setAlertType] = useState("warning");
    const type = primaryTab === "observed" ? "observed" : alertType;
    const [target, setTarget] = useState("");
    const [options, setOptions] = useState(null);
    const [subscriptions, setSubscriptions] = useState(null);
    const [state, setState] = useState({ loading: true, error: "", bulletins: [], total: 0 });
    const [selectedBulletin, setSelectedBulletin] = useState(null);
    const [showSubscribe, setShowSubscribe] = useState(false);

    useEffect(() => {
        Promise.all([axiosInstance.get("/bulletin/options"), axiosInstance.get("/bulletin/subscriptions")])
            .then(([optionsResponse, subscriptionsResponse]) => {
                setOptions(optionsResponse.data);
                setSubscriptions(subscriptionsResponse.data);
            })
            .catch((error) => console.error("Lỗi tải thông tin đăng ký bản tin:", error));
    }, []);

    const loadBulletins = useCallback(() => {
        if (type === "observed") return;
        const [targetType, targetCode] = target ? target.split("|") : [];
        setState((current) => ({ ...current, loading: true, error: "" }));
        axiosInstance
            .get("/bulletins", { params: { type, targetType, targetCode } })
            .then(({ data }) =>
                setState({ loading: false, error: "", bulletins: data.bulletins, total: data.total }),
            )
            .catch((error) => {
                console.error("Lỗi tải bản tin:", error);
                setState({ loading: false, error: "Không tải được bản tin.", bulletins: [], total: 0 });
            });
    }, [type, target]);

    useEffect(() => {
        loadBulletins();
    }, [loadBulletins, subscriptions]);

    const columns = useMemo(() => buildColumns(type), [type]);
    const getSortValue = useCallback(
        (bulletin, key) => columns.find((column) => column.label === key)?.sortValue(bulletin) ?? null,
        [columns],
    );
    const {
        sortedRows: sortedBulletins,
        sortConfig,
        handleSort,
    } = useSortableRows(state.bulletins, {
        defaultKey: "Thời gian ban hành",
        defaultDirection: "desc",
        getSortValue,
    });
    const typeLabel = `Bản tin ${ALERT_TYPES.find((item) => item.key === type)?.label.toLowerCase() || "quan trắc"}`;
    const hasSubscriptions =
        subscriptions && TARGET_GROUPS.some((group) => subscriptions[group.key]?.length > 0);

    const subscribedTargets = useMemo(() => {
        if (!options || !subscriptions) return [];
        return TARGET_GROUPS.map((group) => ({
            ...group,
            items: options[group.key].filter((option) => subscriptions[group.key]?.includes(option.code)),
        })).filter((group) => group.items.length > 0);
    }, [options, subscriptions]);

    const handleDownloadCsv = () => {
        const rows = [
            columns.map((column) => column.label),
            ...sortedBulletins.map((bulletin) => columns.map((column) => column.text(bulletin))),
        ];
        const csv = rows
            .map((cells) => cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
            .join("\r\n");
        const url = URL.createObjectURL(
            new Blob([String.fromCharCode(0xfeff) + csv], { type: "text/csv;charset=utf-8" }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = `ban_tin_${type === "forecast" ? "du_bao" : "canh_bao"}_xnm_${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const handlePrintList = () =>
        printHtml(
            `${typeLabel} xâm nhập mặn`,
            `<h1>${escapeHtml(typeLabel)} xâm nhập mặn</h1><table><thead><tr>${columns
                .map((column) => `<th>${escapeHtml(column.label)}</th>`)
                .join("")}</tr></thead><tbody>${sortedBulletins
                .map(
                    (bulletin) =>
                        `<tr>${columns.map((column) => `<td>${escapeHtml(column.text(bulletin))}</td>`).join("")}</tr>`,
                )
                .join("")}</tbody></table>`,
        );

    return (
        <div className="d-flex flex-column min-vh-100">
            <Helmet>
                <title>Bản tin dự báo, cảnh báo xâm nhập mặn | Xâm nhập mặn Tp. Hồ Chí Minh</title>
            </Helmet>
            <Header />

            <main className="container-fluid flex-grow-1 py-3 px-3 px-lg-5">
                <div className="bulletin-primary-tabs-row">
                    <ul className="nav bulletin-primary-tabs mb-0">
                        {PRIMARY_TABS.map((item) => (
                            <li className="nav-item" key={item.key}>
                                <button
                                    type="button"
                                    className={`nav-link ${primaryTab === item.key ? "active" : ""}`}
                                    onClick={() => setPrimaryTab(item.key)}
                                >
                                    {item.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                {primaryTab === "alerts" && (
                    <div className="bulletin-toolbar-row">
                        <div
                            className="bulletin-alert-toggle btn-group"
                            role="group"
                            aria-label="Loại bản tin"
                        >
                            {ALERT_TYPES.map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    className={`btn ${alertType === item.key ? "active" : ""}`}
                                    onClick={() => setAlertType(item.key)}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            className="btn btn-primary bulletin-subscribe-btn"
                            onClick={() => setShowSubscribe(true)}
                        >
                            Đăng kí nhận bản tin
                        </button>
                    </div>
                )}

                {primaryTab === "alerts" && (
                    <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                        <select
                            className="form-select"
                            style={{ width: 300, maxWidth: "100%" }}
                            value={target}
                            onChange={(event) => setTarget(event.target.value)}
                            aria-label="Lọc theo khu vực đã đăng kí"
                        >
                            <option value="">Tất cả khu vực đã đăng kí</option>
                            {subscribedTargets.map((group) => (
                                <optgroup key={group.key} label={group.label}>
                                    {group.items.map((item) => (
                                        <option key={item.code} value={`${group.key}|${item.code}`}>
                                            {item.name}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>

                        <div className="ms-auto d-flex gap-2">
                            <button
                                type="button"
                                className="btn btn-outline-success"
                                onClick={handleDownloadCsv}
                                disabled={state.bulletins.length === 0}
                            >
                                Tải CSV
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline-primary"
                                onClick={handlePrintList}
                                disabled={state.bulletins.length === 0}
                            >
                                In danh sách
                            </button>
                        </div>
                    </div>
                )}

                {type === "observed" ? (
                    <SalinityReport embedded />
                ) : state.loading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Đang tải...</span>
                        </div>
                    </div>
                ) : state.error ? (
                    <p className="text-muted text-center py-5">{state.error}</p>
                ) : subscriptions && !hasSubscriptions ? (
                    <p className="text-muted text-center py-5">
                        Bạn chưa đăng kí khu vực nào. Nhấn &quot;Đăng kí nhận bản tin&quot; để chọn điểm đo
                        mặn, trạm IoT hoặc huyện muốn theo dõi.
                    </p>
                ) : state.bulletins.length === 0 ? (
                    <p className="text-muted text-center py-5">Chưa có bản tin nào cho khu vực đã chọn.</p>
                ) : (
                    <>
                        <div className="text-muted small mb-2">
                            Hiển thị {state.bulletins.length}/{state.total} bản tin, mới nhất trước. Nhấn vào
                            một dòng để xem bản tin.
                        </div>
                        <div className="table-responsive">
                            <table className="table table-bordered table-hover table-sm align-middle bg-white">
                                <thead className="table-light">
                                    <tr>
                                        {columns.map((column) => (
                                            <SortableHeader
                                                key={column.label}
                                                label={column.label}
                                                sortKey={column.label}
                                                sortConfig={sortConfig}
                                                onSort={handleSort}
                                            />
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedBulletins.map((bulletin) => (
                                        <tr
                                            key={bulletin.id}
                                            style={{ cursor: "pointer" }}
                                            onClick={() => setSelectedBulletin(bulletin)}
                                        >
                                            {columns.map((column) => (
                                                <td key={column.label}>
                                                    {column.label.startsWith("Cảnh báo") ? (
                                                        <RiskBadge risk={bulletin.risk} />
                                                    ) : column.label.startsWith("Hiện trạng thủy văn") ? (
                                                        hydrologyLines(bulletin).map((line) => (
                                                            <div key={line} className="small">
                                                                {line}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        column.text(bulletin)
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </main>

            <Footer />

            <BulletinDetailModal bulletin={selectedBulletin} onClose={() => setSelectedBulletin(null)} />
            <BulletinSubscribeModal
                show={showSubscribe}
                onClose={() => setShowSubscribe(false)}
                onSaved={(next) => {
                    setTarget("");
                    setSubscriptions(next);
                }}
            />
        </div>
    );
};

export default Bulletins;
