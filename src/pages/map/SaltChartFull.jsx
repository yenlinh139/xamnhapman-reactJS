import React, { useEffect, useState } from 'react';
import axiosInstance from '../../config/axios-config';
import SalinityBarChart from './SalinityBarChart';

const ExportPreviewTable = ({ data }) => (
  <div className="table-responsive mb-3" style={{ maxHeight: 300 }}>
    <table className="table table-bordered table-sm table-striped">
      <thead className="table-light">
        <tr>
          <th>#</th>
          <th>Ngày</th>
          <th>Độ mặn (‰)</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item, idx) => (
          <tr key={idx}>
            <td>{idx + 1}</td>
            <td>{new Date(item.date).toLocaleDateString('vi-VN')}</td>
            <td>{Number(item.salinity).toFixed(4)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const SaltChartFull = ({ show, kiHieu, tenDiem, salinityData, onClose }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (show && salinityData) {
      setData(salinityData);
    } else {
      setData([]);
    }
  }, [show, salinityData]);

  useEffect(() => {
    if (!show) setData([]);
  }, [show]);

  const handleExportExcel = async () => {
    try {
      const res = await axiosInstance.get(`/api/salinity-export/${kiHieu}`, {
        responseType: 'blob',
      });

      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `DoMan_${tenDiem || kiHieu}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('❌ Xuất Excel lỗi:', error);
      alert('Không thể xuất dữ liệu từ máy chủ.');
    }
  };

  const validData = data?.filter(
    (item) =>
      item.salinity !== null &&
      item.salinity !== 'NULL' &&
      !isNaN(item.salinity)
  );

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
      className={`modal fade ${show ? 'show d-block' : ''}`}
      tabIndex="-1"
      style={{ backgroundColor: show ? 'rgba(0,0,0,0.5)' : 'transparent' }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header border-0 pb-0">
            <div className="w-100 text-center">
              <h5 className="modal-title mb-1 fw-bold">
                Biểu đồ xâm nhập mặn - {tenDiem}
              </h5>
              {startDate && endDate && (
                <div className="text-muted small">
                  Từ <strong>{startDate}</strong> đến <strong>{endDate}</strong>
                </div>
              )}
            </div>
            <button
              type="button"
              className="btn-close position-absolute end-0 top-0 m-3"
              onClick={onClose}
            ></button>
          </div>

          <div className="modal-body">
            <ul className="nav nav-tabs mb-3" role="tablist">
              <li className="nav-item">
                <button
                  className="nav-link active"
                  id="chart-tab"
                  data-bs-toggle="tab"
                  data-bs-target="#chart"
                  type="button"
                >
                  Biểu đồ
                </button>
              </li>
              <li className="nav-item">
                <button
                  className="nav-link"
                  id="export-tab"
                  data-bs-toggle="tab"
                  data-bs-target="#export"
                  type="button"
                >
                  Xuất dữ liệu
                </button>
              </li>
            </ul>

            <div className="tab-content">
              <div className="tab-pane fade show active" id="chart">
                {data.length > 0 ? (
                  <SalinityBarChart data={data} height={350} />
                ) : (
                  <p className="text-muted">Không có dữ liệu.</p>
                )}
              </div>

              <div className="tab-pane fade" id="export">
                {data.length > 0 ? (
                  <>
                    <ExportPreviewTable data={data} />
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-success"
                        onClick={handleExportExcel}
                      >
                        📥 Tải Excel
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-muted">Không có dữ liệu để hiển thị.</p>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaltChartFull;
