L.TileLayer.BetterWMS = L.TileLayer.WMS.extend({
    // Khi thêm lớp vào bản đồ
    onAdd: function (map) {
        L.TileLayer.WMS.prototype.onAdd.call(this, map);
        map.on("click", this.getFeatureInfo, this);
    },

    // Khi bỏ lớp khỏi bản đồ
    onRemove: function (map) {
        L.TileLayer.WMS.prototype.onRemove.call(this, map);
        map.off("click", this.getFeatureInfo, this);
    },

    // Gửi yêu cầu GetFeatureInfo
    getFeatureInfo: function (evt) {
        var url = this.getFeatureInfoUrl(evt.latlng);
        var showResults = L.Util.bind(this.showGetFeatureInfo, this);
        fetch(url)
            .then((res) => res.text())
            .then((data) => {
                showResults(null, evt.latlng, data);
            })
            .catch((error) => {
                showResults(error);
            });
    },

    // Tạo URL GetFeatureInfo
    getFeatureInfoUrl: function (latlng) {
        var point = this._map.latLngToContainerPoint(latlng, this._map.getZoom());
        var size = this._map.getSize();
        var params = {
            request: "GetFeatureInfo",
            service: "WMS",
            srs: "EPSG:4326",
            styles: this.wmsParams.styles || "", // Đảm bảo có giá trị hợp lệ
            transparent: this.wmsParams.transparent || true, // Đảm bảo có giá trị hợp lệ
            version: this.wmsParams.version || "1.1.1", // Đảm bảo có giá trị hợp lệ
            format: "image/png", // Định dạng hình ảnh
            bbox: this._map.getBounds().toBBoxString(),
            height: size.y,
            width: size.x,
            layers: this.wmsParams.layers,
            query_layers: this.wmsParams.layers,
            info_format: "application/json", // Định dạng trả về JSON
        };

        // Chọn đúng tham số `x` và `y` hoặc `i` và `j` dựa trên phiên bản
        if (params.version === "1.3.0") {
            params.i = point.x;
            params.j = point.y;
        } else {
            params.x = point.x;
            params.y = point.y;
        }

        // Trả về URL với các tham số GET
        return this._url + L.Util.getParamString(params, this._url, true);
    },

    // Hiển thị kết quả GetFeatureInfo
    showGetFeatureInfo: function (err, latlng, content) {
        if (err) {
            console.log("Error:", err);
            return;
        }

        try {
            const featureInfo = JSON.parse(content);
            const feature = featureInfo.features[0];
            const props = feature?.properties;
            console.log("Feature properties:", props);

            if (!props) return;

            const layerName = this.wmsParams.layers.split(":")[1];

            const legendNames = {
                salinityPoints: "Điểm đo mặn",
                hydrometStations: "Trạm khí tượng thủy văn",
                DiaPhanHuyen: "Địa phận huyện",
                DiaPhanXa: "Địa phận xã",
                ThuyHe_line: "Thủy hệ 1 nét",
                ThuyHe_polygon: "Thủy hệ 2 nét",
                HienTrangSDD_2020: "Hiện trạng sử dụng đất 2020",
                QuyHoachSDD_2030: "Quy hoạch sử dụng đất 2030",
                diemdocao: "Mô hình độ cao số",
                GiaoThong_line: "Giao thông 1 nét",
                GiaoThong_polygon: "Giao thông 2 nét",
                // Công trình thủy lợi - Hiện trạng 2023
                CTTL_2023_Cong: "Cống",
                CTTL_2023_DeBao_BoBao: "Đê bao, bờ bao",
                CTTL_2023_KenhMuong: "Kênh mương",
                CTTL_2023_TramBom: "Trạm bơm",
                // Công trình thủy lợi - Quy hoạch 2030
                CTTL_2030_Vung_HeThong: "Công trình thủy lợi vùng, hệ thống",
                CTTL_2030_NongThonMoi: "Công trình nông thôn mới",
                CTTL_2030_NoiDong: "Công trình thủy lợi nhỏ, nội đồng",
                CTTL_2030_VungThuyLoi: "Vùng thủy lợi",
            };
            let popupContent = `
      <div style="font-family: 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.6; padding: 10px 16px;">
        <div style="font-weight: bold; color: #2c3e50; font-size: 16px; padding-bottom: 5px; margin-bottom: 5px; border-bottom: 1px solid #ccc;">
          🗂️  ${legendNames[layerName]}
        </div>
    `;

            switch (layerName) {
                case "DiaPhanHuyen":
                    popupContent += `
                        <b>📍 Huyện:</b> ${props.tenHuyen}<br/>
                        <b>🆔 Mã huyện:</b> ${props.maHuyen}<br/>
                        <b>📐 Diện tích:</b> ${props.dienTichTuNhien}m²
                    `;
                    break;
                case "DiaPhanXa":
                    popupContent += `
                        <b>📍 Xã:</b> ${props.tenXa}<br/>
                        <b>🆔 Mã xã:</b> ${props.maXa}<br/>
                        <b>🏞️ Huyện:</b> ${props.tenHuyen}<br/>
                        <b>📐 Diện tích:</b> ${props.dienTichTuNhien}m²
                    `;
                    break;
                case "diemdocao":
                    popupContent += `<b>📏 Độ cao:</b> ${props.docao_m} m`;
                    break;
                case "GiaoThong_line":
                    popupContent += `
                        <b>🚧 Tên đường:</b> ${props.tenDuong}<br/>
                        <b>📏 Chiều dài:</b> ${props.chieuDai} m
                    `;
                    break;
                case "GiaoThong_polygon":
                    popupContent += `
                        <b>🚧 Tên đường:</b> ${props.TenDuong}<br/>
                        <b>↔️ Rộng:</b> ${props.DoRong} m<br/>
                        <b>↕️ Dài:</b> ${props.ChieuDai} m<br/>
                        <b>🧱 Kết cấu:</b> ${props.KetCau}<br/>
                        <b>🛠️ Tình trạng:</b> ${props.TinhTrang}<br/>
                        <b>Cấp quản lý:</b> ${props.CapQuanLy}
                    `;
                    break;
                case "ThuyHe_line":
                    popupContent += `
                        <b>🌊 Tên sông/kênh:</b> ${props.Ten}<br/>
                        <b>🔼 Điểm đầu:</b> ${props.DiemDau}<br/>
                        <b>🔽 Điểm cuối:</b> ${props.DiemCuoi}<br/>
                        <b>📏 Dài:</b> ${props.ChieuDai}m
                    `;
                    break;
                case "ThuyHe_polygon":
                    popupContent += `
                        <b>🌊 Tên:</b> ${props.Ten}<br/>
                        <b>⚠️ Trạng thái:</b> ${props.TrangThai}<br/>
                        <b>📖 Loại:</b> ${props.PhanLoai}<br/>
                        <b>↔️ Rộng:</b> ${props.DoRong} m<br/>
                        <b>↕️ Sâu:</b> ${props.DoSau} m
                    `;
                    break;
                case "HienTrangSDD_2020":
                    popupContent += `
                        <b>🌱 Loại đất:</b> ${props.loaidat}<br/>
                        <b>🔢 Ký hiệu:</b> ${props.kihieu1}
                    `;
                    break;
                case "QuyHoachSDD_2030":
                    popupContent += `
                        <b>🏗️ Loại đất:</b> ${props.loaidat}<br/>
                        <b>📚 Phân loại:</b> ${props.phanloai}<br/>
                        <b>🔢 Ký hiệu:</b> ${props.kihieu1}
                    `;
                    break;
                // Công trình thủy lợi - Hiện trạng 2023
                case "CTTL_2023_Cong":
                    popupContent += `
                        <b>🏗️ Tên cống đập:</b> ${props.TenCongDap || 'N/A'}<br/>
                        <b>📍 Lý trình:</b> ${props.LyTrinh || 'N/A'}<br/>
                        <b>🏢 Cụm công trình:</b> ${props.CumCongTrinh || 'N/A'}<br/>
                        <b>📋 Loại công trình:</b> ${props.LoaiCongTrinh || 'N/A'}<br/>
                        <b>🔧 Hình thức:</b> ${props.HinhThuc || 'N/A'}<br/>
                        <b>📏 Chiều dài:</b> ${props.ChieuDai || 'N/A'}<br/>
                        <b>⭕ Đường kính:</b> ${props.DuongKinh || 'N/A'}<br/>
                        <b>📐 Bề rộng:</b> ${props.BeRong || 'N/A'}<br/>
                        <b>📏 Chiều cao:</b> ${props.ChieuCao || 'N/A'}<br/>
                        <b>🚪 Số cửa:</b> ${props.SoCua || 'N/A'}<br/>
                        <b>📊 Cao trình đáy cống:</b> ${props.CaoTrinhDayCong || 'N/A'}<br/>
                        <b>📊 Cao trình đỉnh cống:</b> ${props.CaoTrinhDinhCong || 'N/A'}<br/>
                        <b>⚙️ Hình thức vận hành:</b> ${props.HinhThucVanHanh || 'N/A'}<br/>
                        <b>🎯 Mục tiêu nhiệm vụ:</b> ${props.MucTieuNhiemVu || 'N/A'}<br/>
                        <b>🌾 Diện tích phục vụ:</b> ${props.DienTichPhucVu_ha || 'N/A'} ha<br/>
                        <b>📅 Năm sử dụng:</b> ${props.NamSuDung || 'N/A'}<br/>
                        <b>🏆 Cấp công trình:</b> ${props.CapCongTrinh || 'N/A'}<br/>
                        <b>🌊 Hệ thống công trình thủy lợi:</b> ${props.HeThongCongTrinhThuyLoi || 'N/A'}<br/>
                        <b>🏛️ Đơn vị quản lý:</b> ${props.DonViQuanLy || 'N/A'}<br/>
                        <b>🔄 Năm cập nhật:</b> ${props.NamCapNhat || 'N/A'}
                    `;
                    break;
                case "CTTL_2023_DeBao_BoBao":
                    popupContent += `
                        <b>🏗️ Tên:</b> ${props.Ten || 'N/A'}<br/>
                        <b>📏 Chiều dài:</b> ${props.ChieuDai || 'N/A'}<br/>
                        <b>📊 Cao trình đáy kênh:</b> ${props.CaoTrinhDayKenh || 'N/A'}<br/>
                        <b>📐 Bề rộng kênh:</b> ${props.BeRongKenh || 'N/A'}<br/>
                        <b>📐 Hệ số mái:</b> ${props.HeSoMai || 'N/A'}<br/>
                        <b>📊 Cao trình bờ trái:</b> ${props.CaoTrinhBoTrai || 'N/A'}<br/>
                        <b>📊 Cao trình bờ phải:</b> ${props.CaoTrinhBoPhai || 'N/A'}<br/>
                        <b>📐 Bề rộng bờ trái:</b> ${props.BeRongBoTrai || 'N/A'}<br/>
                        <b>📐 Bề rộng bờ phải:</b> ${props.BeRongBoPhai || 'N/A'}<br/>
                        <b>🛡️ Hành lang bảo vệ:</b> ${props.HanhLangBaoVe || 'N/A'}<br/>
                        <b>🏆 Cấp công trình:</b> ${props.CapCongTrinh || 'N/A'}<br/>
                        <b>🏗️ Kết cấu công trình:</b> ${props.KetCauCongTrinh || 'N/A'}<br/>
                        <b>🎯 Mục tiêu nhiệm vụ:</b> ${props.MucTieuNhiemVu || 'N/A'}<br/>
                        <b>🌾 Diện tích phục vụ:</b> ${props.DienTichPhucVu || 'N/A'}<br/>
                        <b>📅 Năm sử dụng:</b> ${props.NamSuDung || 'N/A'}<br/>
                        <b>🌊 Hệ thống công trình thủy lợi:</b> ${props.HeThongCongTrinhThuyLoi || 'N/A'}<br/>
                        <b>🏛️ Đơn vị quản lý:</b> ${props.DonViQuanLy || 'N/A'}<br/>
                        <b>🔄 Năm cập nhật:</b> ${props.NamCapNhat || 'N/A'}<br/>
                        <b>📏 Chiều dài shape:</b> ${props.SHAPE_Length || 'N/A'}
                    `;
                    break;
                case "CTTL_2023_KenhMuong":
                    popupContent += `
                        <b>🌊 Tên kênh mương:</b> ${props.TenKenhMuong || 'N/A'}<br/>
                        <b>📏 Chiều dài:</b> ${props.ChieuDai || 'N/A'}<br/>
                        <b>📊 Cao trình đáy kênh:</b> ${props.CaoTrinhDayKenh || 'N/A'}<br/>
                        <b>📐 Bề rộng kênh:</b> ${props.BeRongKenh || 'N/A'}<br/>
                        <b>📐 Hệ số mái:</b> ${props.HeSoMai || 'N/A'}<br/>
                        <b>📊 Cao trình bờ trái:</b> ${props.CaoTrinhBoTrai || 'N/A'}<br/>
                        <b>📊 Cao trình bờ phải:</b> ${props.CaoTrinhBoPhai || 'N/A'}<br/>
                        <b>📐 Bề rộng bờ trái:</b> ${props.BeRongBoTrai || 'N/A'}<br/>
                        <b>📐 Bề rộng bờ phải:</b> ${props.BeRongBoPhai || 'N/A'}<br/>
                        <b>🛡️ Hành lang bảo vệ:</b> ${props.HanhLangBaoVe || 'N/A'}<br/>
                        <b>🏆 Cấp công trình:</b> ${props.CapCongTrinh || 'N/A'}<br/>
                        <b>🏗️ Kết cấu công trình:</b> ${props.KetCauCongTrinh || 'N/A'}<br/>
                        <b>🎯 Mục tiêu nhiệm vụ:</b> ${props.MucTieuNhiemVu || 'N/A'}<br/>
                        <b>🌾 Diện tích phục vụ:</b> ${props.DienTichPhucVu || 'N/A'}<br/>
                        <b>📅 Năm sử dụng:</b> ${props.NamSuDung || 'N/A'}<br/>
                        <b>🌊 Hệ thống công trình thủy lợi:</b> ${props.HeThongCongTrinhThuyLoi || 'N/A'}<br/>
                        <b>🏛️ Đơn vị quản lý:</b> ${props.DonViQuanLy || 'N/A'}<br/>
                        <b>🔄 Năm cập nhật:</b> ${props.NamCapNhat || 'N/A'}<br/>
                        <b>📏 Chiều dài shape:</b> ${props.SHAPE_Length || 'N/A'}
                    `;
                    break;
                case "CTTL_2023_TramBom":
                    popupContent += `
                        <b>🏗️ Tên trạm bơm:</b> ${props.TenTramBom || 'N/A'}<br/>
                        <b>📋 Loại:</b> ${props.Loai || 'N/A'}<br/>
                        <b>⚡ Công suất:</b> ${props.CongSuat || 'N/A'}<br/>
                        <b>🎯 Mục tiêu nhiệm vụ:</b> ${props.MucTieuNhiemVu || 'N/A'}<br/>
                        <b>🌾 Diện tích phục vụ:</b> ${props.DienTichPhucVu_ha || 'N/A'} ha<br/>
                        <b>🌊 Hệ thống công trình thủy lợi:</b> ${props.HeThongCongTrinhThuyLoi || 'N/A'}<br/>
                        <b>📅 Năm sử dụng:</b> ${props.NamSuDung || 'N/A'}<br/>
                        <b>🏛️ Đơn vị quản lý:</b> ${props.DonViQuanLy || 'N/A'}
                    `;
                    break;
                // Công trình thủy lợi - Quy hoạch 2030
                case "CTTL_2030_Vung_HeThong":
                    popupContent += `
                        <b>🏗️ Tên:</b> ${props.Ten || 'N/A'}<br/>
                        <b>🌊 Vùng thủy lợi:</b> ${props.VungThuyLoi || 'N/A'}<br/>
                        <b>📏 Chiều dài shape:</b> ${props.Shape_Length || 'N/A'}
                    `;
                    break;
                case "CTTL_2030_NongThonMoi":
                    popupContent += `
                        <b>🏗️ Tên:</b> ${props.Ten || 'N/A'}<br/>
                        <b>🌊 Vùng thủy lợi:</b> ${props.VungThuyLoi || 'N/A'}<br/>
                        <b>📏 Chiều dài shape:</b> ${props.Shape_Length || 'N/A'}
                    `;
                    break;
                case "CTTL_2030_NoiDong":
                    popupContent += `
                        <b>🏗️ Tên:</b> ${props.Ten || 'N/A'}<br/>
                        <b>🌊 Vùng thủy lợi:</b> ${props.VungThuyLoi || 'N/A'}<br/>
                        <b>📏 Chiều dài shape:</b> ${props.Shape_Length || 'N/A'}
                    `;
                    break;
                case "CTTL_2030_VungThuyLoi":
                    popupContent += `
                        <b>🌊 Vùng thủy lợi:</b> ${props.VungThuyLoi || 'N/A'}<br/>
                        <b>📝 Mô tả:</b> ${props.MoTa || 'N/A'}<br/>
                        <b>📏 Chiều dài shape:</b> ${props.Shape_Length || 'N/A'}<br/>
                        <b>📐 Diện tích shape:</b> ${props.Shape_Area || 'N/A'}
                    `;
                    break;
                default:
                    popupContent += `<i>Không có cấu hình hiển thị cho lớp này.</i>`;
            }

            popupContent += `</div>`; // kết thúc container

            L.popup().setLatLng(latlng).setContent(popupContent).openOn(this._map);
        } catch (e) {
            console.log("Lỗi khi xử lý dữ liệu JSON:", e);
        }
    },
});

// Hàm tạo lớp BetterWMS
L.tileLayer.betterWms = function (url, options) {
    return new L.TileLayer.BetterWMS(url, options);
};
