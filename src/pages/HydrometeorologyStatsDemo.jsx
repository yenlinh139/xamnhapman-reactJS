/**
 * Demo/Example sử dụng Hydrometeorology Statistics Components
 */

import React, { useState } from 'react';
import {
  HydroDashboard,
  RainfallStatsChart,
  WaterLevelStatsChart,
  WeatherAlerts,
  HydroSummary,
  DateRangeSelector
} from '@components/HydrometeorologyStats';

const HydrometeorologyStatsDemo = () => {
  const [dateRange, setDateRange] = useState({
    startDate: '2022-09-01', // Data có sẵn từ Sep 2022  
    endDate: '2022-09-30',   // Đến cuối Sep 2022
    label: 'Tháng 9/2022'
  });
  
  const [dashboardPeriod, setDashboardPeriod] = useState('7days');

  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange);
    
    // Convert to dashboard period if it's a preset (Updated for Sep 2022 data)
    const periodMap = {
      '7 ngày cuối tháng 9/2022': '7days',
      'Tháng 9/2022': '30days', 
      'Quý 3/2022': '90days',
      'Tháng 8/2022': 'lastMonth'
    };
    
    setDashboardPeriod(periodMap[newRange.label] || '7days');
  };

  return (
    <div className="hydrometeorology-stats-demo">
      <div className="demo-header">
        <h1>📊 Demo Thống kê Khí tượng Thủy văn</h1>
        <p>Các component để hiển thị dữ liệu và thống kê khí tượng thủy văn TPHCM</p>
      </div>

      {/* Date Range Selector */}
      <div className="demo-section">
        <h2>📅 Chọn khoảng thời gian</h2>
        <DateRangeSelector 
          onDateRangeChange={handleDateRangeChange}
          className="demo-date-selector"
        />
        <p className="current-range">
          <strong>Khoảng thời gian hiện tại:</strong> {dateRange.label}
          {dateRange.startDate && dateRange.endDate && (
            ` (${new Date(dateRange.startDate).toLocaleDateString('vi-VN')} - ${new Date(dateRange.endDate).toLocaleDateString('vi-VN')})`
          )}
        </p>
      </div>

      {/* Dashboard */}
      <div className="demo-section">
        <h2>🎛️ Dashboard tổng quan</h2>
        <HydroDashboard 
          period={dashboardPeriod}
          className="demo-dashboard"
        />
      </div>

      {/* Summary Statistics */}
      <div className="demo-section">
        <h2>📋 Thống kê tổng quan</h2>
        <HydroSummary 
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          className="demo-summary"
        />
      </div>

      {/* Charts Row */}
      <div className="demo-section">
        <h2>📊 Biểu đồ thống kê</h2>
        <div className="charts-grid">
          <div className="chart-container">
            <RainfallStatsChart 
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              className="demo-rainfall-chart"
            />
          </div>
          
          <div className="chart-container">
            <WaterLevelStatsChart 
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              className="demo-water-level-chart"
            />
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="demo-section">
        <h2>⚠️ Cảnh báo thời tiết & thủy văn</h2>
        <div className="alerts-grid">
          <WeatherAlerts 
            alertType="all"
            days={7}
            className="demo-alerts-week"
          />
          
          <WeatherAlerts 
            alertType="critical"
            days={30}
            className="demo-alerts-critical"
          />
        </div>
      </div>

      {/* API Testing Section */}
      <div className="demo-section">
        <h2>🔧 Test API Endpoints</h2>
        <div className="api-test-grid">
          <button 
            onClick={() => testAPI('/hydrometeorology-stations')}
            className="api-test-button"
          >
            Test Stations API
          </button>
          
          <button 
            onClick={() => testAPI('/hydrometeorology-latest')}
            className="api-test-button"
          >
            Test Latest Data API
          </button>
          
          <button 
            onClick={() => testAPI('/hydrometeorology-stats/summary')}
            className="api-test-button"
          >
            Test Summary Stats API
          </button>
          
          <button 
            onClick={() => testAPI('/hydrometeorology-stats/dashboard?period=7days')}
            className="api-test-button"
          >
            Test Dashboard API
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function để test API endpoints
const testAPI = async (endpoint) => {
  try {
    console.log(`🔍 Testing API: ${endpoint}`);
    
    // Import axios config
    const { default: axiosInstance } = await import('@config/axios-config');
    
    const response = await axiosInstance.get(endpoint);
    console.log(`✅ API Success:`, response.data);
    alert(`✅ API ${endpoint} thành công! Check console để xem dữ liệu.`);
  } catch (error) {
    console.error(`❌ API Error:`, error);
    alert(`❌ API ${endpoint} thất bại: ${error.message}`);
  }
};

// CSS Styles for Demo
const demoStyles = `
  .hydrometeorology-stats-demo {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    background-color: #f8fafc;
  }

  .demo-header {
    text-align: center;
    margin-bottom: 3rem;
    padding: 2rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 1rem;
  }

  .demo-header h1 {
    margin: 0 0 1rem 0;
    font-size: 2.5rem;
    font-weight: 700;
  }

  .demo-header p {
    margin: 0;
    font-size: 1.1rem;
    opacity: 0.9;
  }

  .demo-section {
    margin-bottom: 3rem;
    background: white;
    border-radius: 0.75rem;
    padding: 2rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .demo-section h2 {
    margin: 0 0 1.5rem 0;
    color: #1f2937;
    font-size: 1.75rem;
    font-weight: 600;
    padding-bottom: 1rem;
    border-bottom: 2px solid #e5e7eb;
  }

  .current-range {
    margin-top: 1rem;
    padding: 1rem;
    background-color: #f0f9ff;
    border-radius: 0.5rem;
    border-left: 4px solid #3b82f6;
  }

  .charts-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }

  .chart-container {
    background: #f8fafc;
    border-radius: 0.75rem;
    padding: 1rem;
  }

  .alerts-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 2rem;
  }

  .api-test-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .api-test-button {
    padding: 1rem 1.5rem;
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    color: white;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
  }

  .api-test-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
  }

  @media (max-width: 768px) {
    .hydrometeorology-stats-demo {
      padding: 1rem;
    }

    .charts-grid,
    .alerts-grid {
      grid-template-columns: 1fr;
    }

    .demo-header h1 {
      font-size: 2rem;
    }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = demoStyles;
  document.head.appendChild(styleSheet);
}

export default HydrometeorologyStatsDemo;