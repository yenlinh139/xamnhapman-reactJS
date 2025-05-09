import React, { useEffect, useState } from 'react';
import axiosInstance from '../../config/axios-config';
import { InfoCircle, X } from 'react-bootstrap-icons';
import SalinityBarChart from './SalinityBarChart';

const SaltMiniChart = ({ salinityData }) => {
  return (
    <div
      className="chart-wrapper rounded shadow-sm border p-2 bg-light"
      style={{ transition: '0.2s' }}
    >
      <SalinityBarChart data={salinityData} />
    </div>
  );
};

const MapDetails = ({
  salinityData,
  selectedPoint,
  onOpenFullChart,
  onClose,
}) => {
  if (!selectedPoint) return null;

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
          <h5 className="mb-0">{selectedPoint.tenDiem}</h5>
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
    </div>
  );
};

export default MapDetails;
