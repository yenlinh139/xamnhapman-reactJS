import html2canvas from "html2canvas";

// Tải ảnh PNG của 1 biểu đồ (dự báo hoặc quan trắc, điểm đo mặn hoặc IoT) - dùng chung để tiêu đề
// và chú giải cấp rủi ro luôn đi kèm ảnh tải về, giống hệt những gì đang hiển thị trên màn hình
// (tránh lặp lại logic này ở nhiều nơi rồi lệch nhau khi chỉnh sửa sau này).
// title: dòng tiêu đề đậm (vd "Diễn biến độ mặn - Mũi Nhà Bè")
// subtitleHtml: dòng phụ bên dưới, đã kèm sẵn HTML (vd "Quan trắc từ <strong>...</strong> đến ...")
// chartElementId: id của DOM element chứa biểu đồ (recharts) cần chụp
// filename: tên file .png khi tải về
export const downloadChartImage = async ({ title, subtitleHtml, chartElementId, filename }) => {
    const chartContainer = document.createElement("div");
    chartContainer.style.backgroundColor = "white";
    chartContainer.style.padding = "20px";
    chartContainer.style.width = "800px";
    chartContainer.style.margin = "0 auto";

    const titleDiv = document.createElement("div");
    titleDiv.style.width = "100%";
    titleDiv.style.textAlign = "center";
    titleDiv.style.marginBottom = "10px";
    titleDiv.innerHTML = `
        <h5 style="font-weight: bold; margin-bottom: 4px; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${title}
        </h5>
        ${subtitleHtml ? `<div style="color: #6c757d; font-size: 11px">${subtitleHtml}</div>` : ""}
    `;
    chartContainer.appendChild(titleDiv);

    // Chú giải cấp rủi ro: lấy đúng bản đang HIỂN THỊ (modal điểm đo mặn và IoT đều render song
    // song trong DOM, chỉ 1 cái đang mở - offsetParent null nghĩa là đang ẩn). Ảnh tải về chỉ cần
    // chữ nhỏ gọn để biểu đồ (phần quan trọng nhất) không bị lép vế.
    const legendCandidates = document.querySelectorAll(".risk-legend-row");
    const legendElement = Array.from(legendCandidates).find((el) => el.offsetParent !== null);
    if (legendElement) {
        const legendClone = legendElement.cloneNode(true);
        legendClone.style.justifyContent = "center";
        legendClone.style.marginBottom = "10px";
        legendClone.style.fontSize = "11px";
        legendClone.style.gap = "10px";
        legendClone.querySelectorAll("span").forEach((span) => {
            if (span.style.width === "10px") {
                span.style.width = "8px";
                span.style.height = "8px";
            }
        });
        chartContainer.appendChild(legendClone);
    }

    const chartElement = document.getElementById(chartElementId);
    if (!chartElement) {
        alert("Không thể tìm thấy biểu đồ để tải xuống");
        return false;
    }
    chartContainer.appendChild(chartElement.cloneNode(true));

    document.body.appendChild(chartContainer);

    try {
        const canvas = await html2canvas(chartContainer, {
            backgroundColor: "#ffffff",
            scale: 2,
        });

        const url = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        return true;
    } finally {
        document.body.removeChild(chartContainer);
    }
};
