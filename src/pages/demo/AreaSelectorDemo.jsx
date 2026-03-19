import React, { useState, useRef } from 'react';
import AreaSelector from '@components/map/AreaSelector';

const AreaSelectorDemo = () => {
  const [selectedArea, setSelectedArea] = useState(null);
  const mapInstanceRef = useRef(null);

  const handleAreaSelect = (areaInfo) => {
    setSelectedArea(areaInfo);
    console.log('Demo - Selected area:', areaInfo);
  };

  return (
    <div className="container-fluid" style={{ height: '100vh', backgroundColor: '#f8f9fa' }}>
      <div className="row h-100">
        <div className="col-12 h-100 position-relative">
          {/* Fake Map Background */}
          <div 
            className="h-100 w-100 d-flex align-items-center justify-content-center"
            style={{
              backgroundColor: '#e9ecef',
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,.15) 1px, transparent 0)',
              backgroundSize: '20px 20px'
            }}
          >
            <div className="text-center">
              <h3 className="text-muted mb-4">Demo - Tính năng chọn vùng quan tâm</h3>
              
              {selectedArea && (
                <div className="card shadow-sm" style={{ maxWidth: '400px' }}>
                  <div className="card-header bg-primary text-white">
                    <h5 className="mb-0">
                      <i className="bi bi-geo-alt me-2"></i>
                      Vùng đã chọn
                    </h5>
                  </div>
                  <div className="card-body">
                    <h6 className="card-title">
                      {selectedArea.area.name || selectedArea.area.TenTram || selectedArea.area.TenTam}
                    </h6>
                    <p className="card-text">
                      <strong>Loại:</strong> {
                        selectedArea.type === 'hydromet_station' ? 'Trạm khí tượng thủy văn' :
                        selectedArea.type === 'iot_station' ? 'Trạm IoT' :
                        selectedArea.type === 'district' ? 'Quận/Huyện' :
                        selectedArea.type === 'commune' ? 'Phường/Xã' : 'Không xác định'
                      }
                    </p>
                    
                    {selectedArea.center && (
                      <div className="small text-muted">
                        <p className="mb-1">
                          <strong>Tọa độ:</strong> {selectedArea.center[0].toFixed(6)}, {selectedArea.center[1].toFixed(6)}
                        </p>
                      </div>
                    )}
                    
                    {selectedArea.area.KiHieu && (
                      <p className="mb-1">
                        <span className="badge bg-primary">{selectedArea.area.KiHieu}</span>
                      </p>
                    )}
                    
                    {selectedArea.area.district && (
                      <p className="mb-1 small text-muted">
                        Thuộc: {selectedArea.area.district}
                      </p>
                    )}
                    
                    {selectedArea.area.area && (
                      <p className="mb-1 small text-muted">
                        Khu vực: {selectedArea.area.area}
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {!selectedArea && (
                <div className="text-muted">
                  <i className="bi bi-arrow-up-right" style={{ fontSize: '2rem' }}></i>
                  <p className="mt-2">Nhấn nút "Chọn vùng quan tâm" để bắt đầu</p>
                </div>
              )}
            </div>
          </div>

          {/* Area Selector Component */}
          <AreaSelector 
            mapInstance={null} // Demo mode - no real map
            onAreaSelect={handleAreaSelect}
            className="demo-area-selector"
          />
        </div>
      </div>
    </div>
  );
};

export default AreaSelectorDemo;