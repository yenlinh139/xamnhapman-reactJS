/**
 * Diagnostic page để kiểm tra API hydrometeorology
 */

import React, { useState, useEffect } from 'react';
import axiosInstance from '@config/axios-config';

const HydrometAPITest = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const endpoints = [
    {
      name: 'Danh sách trạm',
      url: '/hydrometeorology-stations',
      method: 'GET'
    },
    {
      name: 'Dữ liệu mới nhất',
      url: '/hydrometeorology-latest', 
      method: 'GET'
    },
    {
      name: 'Thống kê tổng quan',
      url: '/hydrometeorology-stats/summary',
      method: 'GET'
    },
    {
      name: 'Thống kê mưa theo trạm',
      url: '/hydrometeorology-stats/rainfall-by-station',
      method: 'GET'
    },
    {
      name: 'Thống kê mực nước',
      url: '/hydrometeorology-stats/water-level-by-station',
      method: 'GET'
    },
    {
      name: 'Dashboard',
      url: '/hydrometeorology-stats/dashboard?period=7days',
      method: 'GET'
    },
    {
      name: 'Cảnh báo',
      url: '/hydrometeorology-stats/alerts',
      method: 'GET'
    },
    {
      name: 'Dữ liệu theo trạm (test)',
      url: '/hydrometeorology-data/TSH?limit=5',
      method: 'GET'
    }
  ];

  const testAPI = async (endpoint) => {
    setLoading(true);
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Testing: ${endpoint.url}`);
      const response = await axiosInstance.get(endpoint.url);
      const duration = Date.now() - startTime;
      
      const result = {
        name: endpoint.name,
        url: endpoint.url,
        status: 'success',
        statusCode: response.status,
        duration: `${duration}ms`,
        dataSize: JSON.stringify(response.data).length,
        dataPreview: JSON.stringify(response.data, null, 2).substring(0, 500) + '...',
        fullData: response.data
      };
      
      setResults(prev => [...prev, result]);
      console.log(`✅ Success:`, response.data);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      const result = {
        name: endpoint.name,
        url: endpoint.url,
        status: 'error',
        statusCode: error.response?.status || 'Network Error',
        duration: `${duration}ms`,
        error: error.message,
        errorDetails: error.response?.data || error.toString(),
        fullError: error
      };
      
      setResults(prev => [...prev, result]);
      console.error(`❌ Error:`, error);
    }
    
    setLoading(false);
  };

  const testAllAPIs = async () => {
    setResults([]);
    setLoading(true);
    
    for (const endpoint of endpoints) {
      await testAPI(endpoint);
      // Delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setLoading(false);
  };

  const clearResults = () => {
    setResults([]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  useEffect(() => {
    // Test connection on component mount
    const checkConnection = async () => {
      try {
        console.log('🔗 Checking backend connection...');
        console.log('VITE_BASE_URL:', import.meta.env.VITE_BASE_URL);
        
        // Test a simple endpoint first
        await axiosInstance.get('/');
      } catch (error) {
        console.error('❌ Backend connection failed:', error);
      }
    };

    checkConnection();
  }, []);

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '2rem',
        borderRadius: '1rem',
        marginBottom: '2rem',
        textAlign: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: '2rem' }}>🔧 Hydrometeorology API Diagnostic</h1>
        <p style={{ margin: '1rem 0 0 0', opacity: 0.9 }}>
          Kiểm tra tình trạng các API endpoint khí tượng thủy văn
        </p>
        <div style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>
          Backend URL: {import.meta.env.VITE_BASE_URL}
        </div>
      </div>

      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <button
          onClick={testAllAPIs}
          disabled={loading}
          style={{
            padding: '1rem 2rem',
            background: loading ? '#9ca3af' : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginRight: '1rem'
          }}
        >
          {loading ? '🔄 Đang test...' : '🚀 Test tất cả API'}
        </button>

        <button
          onClick={clearResults}
          disabled={loading}
          style={{
            padding: '1rem 2rem',
            background: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          🗑️ Xóa kết quả
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {endpoints.map((endpoint, index) => (
          <button
            key={index}
            onClick={() => testAPI(endpoint)}
            disabled={loading}
            style={{
              padding: '1rem',
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              textAlign: 'left',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
              }
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
              {endpoint.name}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#6b7280', fontFamily: 'monospace' }}>
              {endpoint.method} {endpoint.url}
            </div>
          </button>
        ))}
      </div>

      {results.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '1rem',
          padding: '2rem',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ margin: '0 0 2rem 0', color: '#1f2937' }}>📊 Kết quả kiểm tra</h2>
          
          <div style={{ marginBottom: '2rem' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{
                padding: '1rem',
                background: '#ecfdf5',
                borderRadius: '0.5rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', color: '#10b981', fontWeight: '700' }}>
                  {results.filter(r => r.status === 'success').length}
                </div>
                <div style={{ color: '#065f46' }}>Thành công</div>
              </div>
              
              <div style={{
                padding: '1rem',
                background: '#fef2f2',
                borderRadius: '0.5rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', color: '#ef4444', fontWeight: '700' }}>
                  {results.filter(r => r.status === 'error').length}
                </div>
                <div style={{ color: '#991b1b' }}>Lỗi</div>
              </div>
              
              <div style={{
                padding: '1rem',
                background: '#f0f9ff',
                borderRadius: '0.5rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', color: '#3b82f6', fontWeight: '700' }}>
                  {results.length}
                </div>
                <div style={{ color: '#1e40af' }}>Tổng cộng</div>
              </div>
            </div>
          </div>

          {results.map((result, index) => (
            <div
              key={index}
              style={{
                marginBottom: '1.5rem',
                padding: '1.5rem',
                border: `1px solid ${result.status === 'success' ? '#d1fae5' : '#fecaca'}`,
                borderRadius: '0.5rem',
                borderLeft: `4px solid ${getStatusColor(result.status)}`
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <h3 style={{
                  margin: 0,
                  color: '#1f2937',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {getStatusIcon(result.status)} {result.name}
                </h3>
                
                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  fontSize: '0.85rem',
                  color: '#6b7280'
                }}>
                  <span>Status: {result.statusCode}</span>
                  <span>Time: {result.duration}</span>
                  {result.dataSize && <span>Size: {result.dataSize} chars</span>}
                </div>
              </div>

              <div style={{
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                color: '#4b5563',
                marginBottom: '1rem'
              }}>
                {result.url}
              </div>

              {result.status === 'success' ? (
                <details style={{ cursor: 'pointer' }}>
                  <summary style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#059669' }}>
                    ✅ Xem dữ liệu trả về
                  </summary>
                  <pre style={{
                    background: '#f8fafc',
                    padding: '1rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.75rem',
                    overflow: 'auto',
                    maxHeight: '400px',
                    border: '1px solid #e2e8f0'
                  }}>
                    {result.dataPreview}
                  </pre>
                </details>
              ) : (
                <div>
                  <div style={{ color: '#dc2626', fontWeight: '600', marginBottom: '0.5rem' }}>
                    ❌ Lỗi: {result.error}
                  </div>
                  <details style={{ cursor: 'pointer' }}>
                    <summary style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#dc2626' }}>
                      Xem chi tiết lỗi
                    </summary>
                    <pre style={{
                      background: '#fef2f2',
                      padding: '1rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      overflow: 'auto',
                      maxHeight: '400px',
                      border: '1px solid #fecaca',
                      color: '#991b1b'
                    }}>
                      {JSON.stringify(result.errorDetails, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HydrometAPITest;