L.TileLayer.BetterWMS = L.TileLayer.WMS.extend({
  // Khi thêm lớp vào bản đồ
  onAdd: function (map) {
    L.TileLayer.WMS.prototype.onAdd.call(this, map);
    map.on('click', this.getFeatureInfo, this);
  },

  // Khi bỏ lớp khỏi bản đồ
  onRemove: function (map) {
    L.TileLayer.WMS.prototype.onRemove.call(this, map);
    map.off('click', this.getFeatureInfo, this);
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
      request: 'GetFeatureInfo',
      service: 'WMS',
      srs: 'EPSG:4326',
      styles: this.wmsParams.styles || '', // Đảm bảo có giá trị hợp lệ
      transparent: this.wmsParams.transparent || true, // Đảm bảo có giá trị hợp lệ
      version: this.wmsParams.version || '1.1.1', // Đảm bảo có giá trị hợp lệ
      format: 'image/png', // Định dạng hình ảnh
      bbox: this._map.getBounds().toBBoxString(),
      height: size.y,
      width: size.x,
      layers: this.wmsParams.layers,
      query_layers: this.wmsParams.layers,
      info_format: 'application/json', // Định dạng trả về JSON
    };

    // Chọn đúng tham số `x` và `y` hoặc `i` và `j` dựa trên phiên bản
    if (params.version === '1.3.0') {
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
      console.log('Error:', err);
      return;
    }

    try {
      const featureInfo = JSON.parse(content);
      const feature = featureInfo.features[0];
      const props = feature?.properties;

      if (!props) return;

      const layerName = this.wmsParams.layers.split(':')[1];

      let popupContent = `
      <div style="font-family: 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.6; padding: 6px 10px;">
        <div style="font-weight: bold; color: #2c3e50; font-size: 16px; margin-bottom: 5px; border-bottom: 1px solid #ccc;">
          🗂️ Thông tin lớp: ${layerName}
        </div>
    `;

      switch (layerName) {
        case 'DiaPhanHuyen':
          popupContent += `
          <b>📍 Huyện:</b> ${props.tenhuyen}<br/>
          <b>🆔 Mã huyện:</b> ${props.mahuyen}<br/>
          <b>📐 Diện tích:</b> ${props.dientichtunhien} m²
        `;
          break;
        case 'DiaPhanXa':
          popupContent += `
          <b>📍 Xã:</b> ${props.tenxa}<br/>
          <b>🆔 Mã xã:</b> ${props.maxa}<br/>
          <b>🏞️ Huyện:</b> ${props.tenhuyen}<br/>
          <b>📐 Diện tích:</b> ${props.dientichtunhien} m²
        `;
          break;
        case 'DiemDoCao':
          popupContent += `<b>📏 Độ cao:</b> ${props.docao_m} m`;
          break;
        case 'GiaoThong_line':
          popupContent += `
          <b>🚧 Tên đường:</b> ${props.tenduong}<br/>
          <b>📏 Chiều dài:</b> ${props.chieudai} m
        `;
          break;
        case 'GiaoThong_polygon':
          popupContent += `
          <b>🚧 Tên đường:</b> ${props.tenduong}<br/>
          <b>↔️ Rộng:</b> ${props.dorong} m<br/>
          <b>↕️ Dài:</b> ${props.chieudai} m<br/>
          <b>🧱 Kết cấu:</b> ${props.ketcau}<br/>
          <b>🛠️ Tình trạng:</b> ${props.tinhtrang}
        `;
          break;
        case 'ThuyHe_line':
          popupContent += `
          <b>🌊 Tên sông/kênh:</b> ${props.ten}<br/>
          <b>🔼 Điểm đầu:</b> ${props.diemdau}<br/>
          <b>🔽 Điểm cuối:</b> ${props.diemcuoi}<br/>
          <b>📏 Dài:</b> ${props.chieudai} m
        `;
          break;
        case 'ThuyHe_polygon':
          popupContent += `
          <b>🌊 Tên:</b> ${props.ten}<br/>
          <b>📖 Loại:</b> ${props.phanloai}<br/>
          <b>↔️ Rộng:</b> ${props.dorong} m<br/>
          <b>↕️ Sâu:</b> ${props.dosau} m<br/>
          <b>⚠️ Trạng thái:</b> ${props.trangthai}
        `;
          break;
        case 'HienTrangSDD_2020':
          popupContent += `
          <b>🌱 Loại đất:</b> ${props.loaidat}<br/>
          <b>🔢 Ký hiệu:</b> ${props.kihieu}
        `;
          break;
        case 'QuyHoachSDD_2030':
          popupContent += `
          <b>🏗️ Loại đất:</b> ${props.loaidat}<br/>
          <b>📚 Phân loại:</b> ${props.phanloai}<br/>
          <b>🔢 Ký hiệu:</b> ${props.kihieu}
        `;
          break;
        default:
          popupContent += `<i>Không có cấu hình hiển thị cho lớp này.</i>`;
      }

      popupContent += `</div>`; // kết thúc container

      L.popup().setLatLng(latlng).setContent(popupContent).openOn(this._map);
    } catch (e) {
      console.log('Lỗi khi xử lý dữ liệu JSON:', e);
    }
  },
});

// Hàm tạo lớp BetterWMS
L.tileLayer.betterWms = function (url, options) {
  return new L.TileLayer.BetterWMS(url, options);
};
