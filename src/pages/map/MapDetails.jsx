import React, { useState } from 'react';
import { InfoCircle, X } from 'react-bootstrap-icons';
import SalinityBarChart from './SalinityBarChart';

const SaltMiniChart = ({ salinityData }) => {
  return (
    <div
      className="chart-wrapper rounded shadow-sm border p-2 bg-light"
      style={{ transition: '0.2s' }}
    >
      <SalinityBarChart data={salinityData} height={200} />
    </div>
  );
};
const MapDetails = ({
  salinityData,
  hydrometData,
  selectedPoint,
  onOpenFullChart,
  onClose,
}) => {
  if (!selectedPoint) return null;
  const validData = salinityData?.filter(
    (item) =>
      item.salinity !== null &&
      item.salinity !== 'NULL' &&
      !isNaN(item.salinity)
  );
  const [selectedDate, setSelectedDate] = useState('');
  const selectedSalinity = validData?.find(
    (item) => item.date.split('T')[0] === selectedDate
  )?.salinity;

  const startDate =
    validData?.length > 0
      ? new Date(validData[0].date).toLocaleDateString('vi-VN')
      : null;
  const endDate =
    validData?.length > 0
      ? new Date(validData[validData.length - 1].date).toLocaleDateString(
          'vi-VN'
        )
      : null;

  return (
    <div
      className="map-details-container rounded-3 shadow-lg bg-white p-4 animate__animated animate__fadeInRight"
      style={{
        maxHeight: '100vh',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="fw-bold mb-1">{selectedPoint.tenDiem}</h5>
          {startDate && endDate && (
            <div className="text-muted small">
              Từ <strong>{startDate}</strong> đến <strong>{endDate}</strong>
            </div>
          )}
        </div>

        <div className="d-flex align-items-center gap-2">
          <InfoCircle
            size={20}
            className="text-secondary"
            title="Thông tin điểm đo"
          />
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={onClose}
            title="Đóng thông tin"
            style={{ lineHeight: 1 }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div
        onClick={onOpenFullChart}
        style={{ cursor: 'pointer' }}
        className="hover-shadow"
      >
        <SaltMiniChart salinityData={salinityData} />
        <p className="text-center mt-2 text-primary small">
          Click để xem chi tiết và xuất dữ liệu
        </p>
      </div>

      {/* Hydromet Data Section */}
      <div className="mt-4">
        {hydrometData && hydrometData.length > 0 && (
          <>
            <h6 className="fw-bold mb-2">Yếu tố khí tượng thủy văn</h6>
            <div
              className="chart-wrapper rounded shadow-sm border p-2 bg-light"
              style={{ transition: '0.2s' }}
            >
              <SalinityBarChart data={hydrometData} height={200} />
            </div>

            <div className="mt-3">
              <label
                htmlFor="hydro-date-select"
                className="form-label mb-1 fw-semibold"
              >
                Chọn ngày để xem giá trị
              </label>
              <select
                id="hydro-date-select"
                className="form-select form-select-sm"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                aria-label="Chọn ngày đo khí tượng"
              >
                <option value="" disabled>
                  -- Chọn ngày --
                </option>
                {hydrometData.map((d) => (
                  <option key={d.date} value={d.date.slice(0, 10)}>
                    {new Date(d.date).toLocaleDateString('vi-VN')}
                  </option>
                ))}
              </select>

              {selectedDate && (
                <div
                  key={selectedDate}
                  className="salinity-info mt-2"
                  style={{
                    backgroundColor: (() => {
                      const val = hydrometData.find(
                        (d) => d.date.split('T')[0] === selectedDate
                      )?.hydrometeorology;

                      if (val == null) return '#dee2e6';
                      if (val < 10) return '#0d6efd'; // xanh dương
                      if (val < 30) return '#ffc107'; // vàng
                      return '#dc3545'; // đỏ
                    })(),
                    color: 'white',
                  }}
                >
                  Giá trị:{' '}
                  <span>
                    {(() => {
                      const value = hydrometData.find(
                        (d) => d.date.split('T')[0] === selectedDate
                      )?.hydrometeorology;
                      return value != null
                        ? Number(value).toFixed(2)
                        : 'Không có dữ liệu';
                    })()}{' '}
                    {selectedPoint?.thongTin?.DonVi || ''}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MapDetails;
