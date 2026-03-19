// Dữ liệu đơn vị hành chính TPHCM chi tiết
export const TPHCM_ADMINISTRATIVE_AREAS = {
  districts: [
    // Quận nội thành
    { 
      id: 'quan1', 
      name: 'Quận 1', 
      type: 'district',
      center: [10.7764, 106.7005],
      bounds: [[10.7600, 106.6800], [10.7900, 106.7200]],
      area: 'Nội thành'
    },
    { 
      id: 'quan3', 
      name: 'Quận 3', 
      type: 'district',
      center: [10.7860, 106.6917],
      bounds: [[10.7700, 106.6750], [10.8000, 106.7100]],
      area: 'Nội thành'
    },
    { 
      id: 'quan4', 
      name: 'Quận 4', 
      type: 'district',
      center: [10.7574, 106.7024],
      bounds: [[10.7400, 106.6850], [10.7750, 106.7200]],
      area: 'Nội thành'
    },
    { 
      id: 'quan5', 
      name: 'Quận 5', 
      type: 'district',
      center: [10.7592, 106.6758],
      bounds: [[10.7400, 106.6600], [10.7800, 106.6900]],
      area: 'Nội thành'
    },
    { 
      id: 'quan6', 
      name: 'Quận 6', 
      type: 'district',
      center: [10.7472, 106.6364],
      bounds: [[10.7300, 106.6200], [10.7650, 106.6550]],
      area: 'Nội thành'
    },
    { 
      id: 'quan7', 
      name: 'Quận 7', 
      type: 'district',
      center: [10.7333, 106.7172],
      bounds: [[10.7100, 106.6900], [10.7600, 106.7400]],
      area: 'Nội thành'
    },
    { 
      id: 'quan8', 
      name: 'Quận 8', 
      type: 'district',
      center: [10.7388, 106.6761],
      bounds: [[10.7200, 106.6600], [10.7600, 106.6950]],
      area: 'Nội thành'
    },
    { 
      id: 'quan10', 
      name: 'Quận 10', 
      type: 'district',
      center: [10.7742, 106.6686],
      bounds: [[10.7600, 106.6550], [10.7900, 106.6850]],
      area: 'Nội thành'
    },
    { 
      id: 'quan11', 
      name: 'Quận 11', 
      type: 'district',
      center: [10.7614, 106.6503],
      bounds: [[10.7450, 106.6350], [10.7800, 106.6650]],
      area: 'Nội thành'
    },
    { 
      id: 'quan12', 
      name: 'Quận 12', 
      type: 'district',
      center: [10.8596, 106.6647],
      bounds: [[10.8300, 106.6400], [10.8900, 106.6900]],
      area: 'Ngoại thành'
    },
    { 
      id: 'quantanbinh', 
      name: 'Quận Tân Bình', 
      type: 'district',
      center: [10.8006, 106.6534],
      bounds: [[10.7800, 106.6300], [10.8200, 106.6800]],
      area: 'Nội thành'
    },
    { 
      id: 'quanbinhthanh', 
      name: 'Quận Bình Thạnh', 
      type: 'district',
      center: [10.8142, 106.7106],
      bounds: [[10.7900, 106.6800], [10.8400, 106.7400]],
      area: 'Nội thành'
    },
    { 
      id: 'quangovap', 
      name: 'Quận Gò Vấp', 
      type: 'district',
      center: [10.8376, 106.6755],
      bounds: [[10.8100, 106.6500], [10.8650, 106.7000]],
      area: 'Ngoại thành'
    },
    { 
      id: 'quanphunhuan', 
      name: 'Quận Phú Nhuận', 
      type: 'district',
      center: [10.7974, 106.6831],
      bounds: [[10.7800, 106.6650], [10.8150, 106.7000]],
      area: 'Nội thành'
    },
    { 
      id: 'quantanphu', 
      name: 'Quận Tân Phú', 
      type: 'district',
      center: [10.7944, 106.6347],
      bounds: [[10.7700, 106.6100], [10.8200, 106.6600]],
      area: 'Ngoại thành'
    },
    { 
      id: 'quanthuduc', 
      name: 'Thành phố Thủ Đức', 
      type: 'district',
      center: [10.8456, 106.7606],
      bounds: [[10.7800, 106.7000], [10.9200, 106.8200]],
      area: 'Ngoại thành'
    },

    // Huyện ngoại thành
    { 
      id: 'binhchanh', 
      name: 'Huyện Bình Chánh', 
      type: 'district',
      center: [10.7411, 106.5969],
      bounds: [[10.6800, 106.5200], [10.8000, 106.6700]],
      area: 'Ngoại thành'
    },
    { 
      id: 'hocomnon', 
      name: 'Huyện Hóc Môn', 
      type: 'district',
      center: [10.8797, 106.5919],
      bounds: [[10.8400, 106.5600], [10.9200, 106.6300]],
      area: 'Ngoại thành'
    },
    { 
      id: 'cangio', 
      name: 'Huyện Cần Giờ', 
      type: 'district',
      center: [10.4064, 106.9611],
      bounds: [[10.2500, 106.8000], [10.5500, 107.1000]],
      area: 'Ngoại thành'
    },
    { 
      id: 'cucho', 
      name: 'Huyện Củ Chi', 
      type: 'district',
      center: [11.0150, 106.4950],
      bounds: [[10.9500, 106.4000], [11.0800, 106.6000]],
      area: 'Ngoại thành'
    },
    { 
      id: 'nhaebe', 
      name: 'Huyện Nhà Bè', 
      type: 'district',
      center: [10.6647, 106.7289],
      bounds: [[10.6200, 106.6800], [10.7100, 106.7800]],
      area: 'Ngoại thành'
    }
  ],

  communes: [
    // Quận 1
    { 
      id: 'benthanh', 
      name: 'Phường Bến Thành', 
      district: 'Quận 1',
      type: 'commune',
      center: [10.7724, 106.7008],
      bounds: [[10.7680, 106.6980], [10.7770, 106.7040]]
    },
    { 
      id: 'dakao', 
      name: 'Phường Đa Kao', 
      district: 'Quận 1',
      type: 'commune',
      center: [10.7889, 106.7022],
      bounds: [[10.7850, 106.6990], [10.7930, 106.7060]]
    },
    { 
      id: 'tandinh', 
      name: 'Phường Tân Định', 
      district: 'Quận 1',
      type: 'commune',
      center: [10.7847, 106.6889],
      bounds: [[10.7800, 106.6850], [10.7900, 106.6930]]
    },
    { 
      id: 'nguyenthabinh', 
      name: 'Phường Nguyễn Thái Bình', 
      district: 'Quận 1',
      type: 'commune',
      center: [10.7683, 106.6969],
      bounds: [[10.7640, 106.6930], [10.7720, 106.7010]]
    },
    { 
      id: 'phamnguulao', 
      name: 'Phường Phạm Ngũ Lão', 
      district: 'Quận 1',
      type: 'commune',
      center: [10.7607, 106.6921],
      bounds: [[10.7570, 106.6880], [10.7650, 106.6960]]
    },

    // Quận 3
    { 
      id: 'votan', 
      name: 'Phường Võ Thị Sáu', 
      district: 'Quận 3',
      type: 'commune',
      center: [10.7825, 106.6917],
      bounds: [[10.7780, 106.6880], [10.7870, 106.6950]]
    },
    { 
      id: 'ward1q3', 
      name: 'Phường 1', 
      district: 'Quận 3',
      type: 'commune',
      center: [10.7901, 106.6863],
      bounds: [[10.7860, 106.6820], [10.7940, 106.6900]]
    },
    { 
      id: 'ward2q3', 
      name: 'Phường 2', 
      district: 'Quận 3',
      type: 'commune',
      center: [10.7836, 106.6836],
      bounds: [[10.7790, 106.6800], [10.7880, 106.6870]]
    },

    // Quận 7
    { 
      id: 'tanhung', 
      name: 'Phường Tân Hưng', 
      district: 'Quận 7',
      type: 'commune',
      center: [10.7378, 106.7189],
      bounds: [[10.7320, 106.7150], [10.7430, 106.7230]]
    },
    { 
      id: 'tanphong', 
      name: 'Phường Tân Phong', 
      district: 'Quận 7',
      type: 'commune',
      center: [10.7289, 106.7156],
      bounds: [[10.7240, 106.7110], [10.7340, 106.7200]]
    },
    { 
      id: 'tanphu', 
      name: 'Phường Tân Phú', 
      district: 'Quận 7',
      type: 'commune',
      center: [10.7411, 106.7089],
      bounds: [[10.7360, 106.7040], [10.7460, 106.7140]]
    },

    // Huyện Bình Chánh
    { 
      id: 'tanbinhq', 
      name: 'Xã Tân Bình', 
      district: 'Huyện Bình Chánh',
      type: 'commune',
      center: [10.7156, 106.6347],
      bounds: [[10.7100, 106.6300], [10.7200, 106.6400]]
    },
    { 
      id: 'anhap', 
      name: 'Xã An Hạ', 
      district: 'Huyện Bình Chánh',
      type: 'commune',
      center: [10.6947, 106.6156],
      bounds: [[10.6900, 106.6100], [10.7000, 106.6200]]
    },

    // Huyện Cần Giờ
    { 
      id: 'cangio_center', 
      name: 'Thị trấn Cần Thạnh', 
      district: 'Huyện Cần Giờ',
      type: 'commune',
      center: [10.4064, 106.9611],
      bounds: [[10.4000, 106.9550], [10.4130, 106.9670]]
    },
    { 
      id: 'anhoa', 
      name: 'Xã An Hòa', 
      district: 'Huyện Cần Giờ',
      type: 'commune',
      center: [10.3456, 106.8678],
      bounds: [[10.3400, 106.8620], [10.3500, 106.8730]]
    },

    // Huyện Củ Chi
    { 
      id: 'cuchi_center', 
      name: 'Thị trấn Củ Chi', 
      district: 'Huyện Củ Chi',
      type: 'commune',
      center: [11.0150, 106.4950],
      bounds: [[11.0100, 106.4900], [11.0200, 106.5000]]
    },
    { 
      id: 'phuhoabinh', 
      name: 'Xã Phú Hòa Đông', 
      district: 'Huyện Củ Chi',
      type: 'commune',
      center: [11.0322, 106.5123],
      bounds: [[11.0270, 106.5070], [11.0370, 106.5170]]
    }
  ]
};

// Nhóm theo khu vực để dễ tìm kiếm
export const getDistrictsByArea = () => {
  return {
    'Nội thành': TPHCM_ADMINISTRATIVE_AREAS.districts.filter(d => d.area === 'Nội thành'),
    'Ngoại thành': TPHCM_ADMINISTRATIVE_AREAS.districts.filter(d => d.area === 'Ngoại thành')
  };
};

// Lấy commune theo quận/huyện
export const getCommunesByDistrict = (districtName) => {
  return TPHCM_ADMINISTRATIVE_AREAS.communes.filter(c => c.district === districtName);
};

// Tìm kiếm đơn vị hành chính
export const searchAdministrativeAreas = (query) => {
  const searchTerm = query.toLowerCase();
  
  const districts = TPHCM_ADMINISTRATIVE_AREAS.districts.filter(d =>
    d.name.toLowerCase().includes(searchTerm)
  );
  
  const communes = TPHCM_ADMINISTRATIVE_AREAS.communes.filter(c =>
    c.name.toLowerCase().includes(searchTerm) ||
    c.district.toLowerCase().includes(searchTerm)
  );
  
  return { districts, communes };
};

// Lấy tất cả khu vực có phân nhóm
export const getAllAreasGrouped = () => {
  const districtsByArea = getDistrictsByArea();
  const communesByDistrict = {};
  
  TPHCM_ADMINISTRATIVE_AREAS.districts.forEach(district => {
    communesByDistrict[district.name] = getCommunesByDistrict(district.name);
  });
  
  return {
    districts: districtsByArea,
    communes: communesByDistrict
  };
};