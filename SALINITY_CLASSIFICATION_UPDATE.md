# Salinity Classification System Update - Complete Implementation

## Overview

Successfully updated the salinity risk classification system from a simple 3-level system to a comprehensive 5-level disaster risk classification system based on saltwater intrusion in Ho Chi Minh City.

## New Classification System

### Cấp độ rủi ro thiên tai do xâm nhập mặn:

1. **Bình thường** (độ mặn tại các điểm <1‰) - 🟢 Green (#28a745)
2. **Rủi ro cấp 1** (độ mặn tại Nhà Bè 1-4‰) - 🟡 Yellow (#ffc107)
3. **Rủi ro cấp 2** (độ mặn tại Nhà Bè >4‰, các điểm khác 1-4‰) - 🟠 Orange (#fd7e14)
4. **Rủi ro cấp 3** (độ mặn tại các điểm >4‰) - 🔴 Red (#dc3545)
5. **Khuyết số liệu** - ⚫ Gray (#6c757d)

## Khi nào "Rủi ro cấp 2" xuất hiện?

### 📊 **Cho từng trạm riêng lẻ:**

- **Các trạm KHÁC Nhà Bè** (CRT, CTT, COT, CKC, KXAH, PCL) có độ mặn **1-4‰** → 🟠 "Rủi ro cấp 2"
- **Trạm Nhà Bè (MNB)** có độ mặn **>4‰** → 🟠 "Rủi ro cấp 2"

### 🗺️ **Cho hệ thống tổng thể:**

- **Nhà Bè >4‰** VÀ **tất cả trạm khác ≤4‰** → 🟠 "Rủi ro cấp 2"

### ⚠️ **Lưu ý quan trọng:**

- Nếu **bất kỳ trạm nào khác** (không phải Nhà Bè) có độ mặn **>4‰** → 🔴 "Rủi ro cấp 3" (ưu tiên cao nhất)
- Trạm **Nhà Bè 1-4‰** → 🟡 "Rủi ro cấp 1"
- Tất cả trạm **<1‰** → 🟢 "Bình thường"

## Files Modified

### 1. Core Classification Logic

- **Created**: `src/common/salinityClassification.js`
    - New utility functions for classification logic
    - Station-specific classification (special rules for MNB - Mũi Nhà Bè)
    - System-wide risk assessment
    - Backward compatibility with legacy class names

### 2. Data Table Components

- **Modified**: `src/pages/salinity/SalinityTable.jsx`

    - Updated to use new classification system
    - Updated legend with new risk levels
    - Pass station codes to classification function

- **Modified**: `src/pages/salinity/SalinityReport.jsx`
    - Updated classification calls
    - Updated legend text and descriptions

### 3. Styling Updates

- **Modified**: `src/styles/components/_salinityManagement.scss`

    - Added new CSS classes: `.normal`, `.warning`, `.high-warning`, `.critical`
    - Updated legend colors to match new classification
    - Maintained backward compatibility with old class names
    - Added specific colors for each risk level

- **Modified**: `src/styles/components/_salinityReport.scss`
    - Added new color classes for salinity values
    - Updated legend color definitions
    - Added `.salinity-high-warning` class

### 4. Map Components

- **Modified**: `src/components/map/SalinityMarkers.jsx`

    - Updated popup content with new classification
    - Station-specific risk assessment
    - Updated tooltip classes

- **Modified**: `src/pages/map/MapboxMap.jsx`

    - Updated marker colors and status text
    - Changed from blue to green for normal levels
    - Updated popup status classes

- **Modified**: `src/pages/map/SalinityBarChart.jsx`
    - Updated chart colors to match new classification
    - Changed legend text to reflect new risk levels
    - Updated bar colors: Green (normal), Yellow (risk 1), Red (risk 3)

## Color Scheme

### 4. Map Components

- **Modified**: `src/pages/map/MapboxMap.jsx`

    - Updated getSalinityColor function with station-specific logic
    - Added getSalinityRiskLevel function for status text
    - Updated popup status classes and descriptions
    - Fixed legend background color mapping for all 5 levels

- **Modified**: `src/components/map/SalinityMarkers.jsx`

    - Updated tooltip classes with new classification
    - Fixed popup creation with station-specific colors
    - Updated icon rendering with proper station codes

- **Modified**: `src/components/map/mapMarkers.js`
    - Enhanced getSalinityIcon to accept value and stationCode parameters
    - Dynamic color selection based on classification level
    - Maintained backward compatibility

### 5. Chart Components

- **Modified**: `src/pages/map/SalinityBarChart.jsx`
    - Updated bar colors to use new classification system
    - Added comprehensive legend with all 5 risk levels
    - Updated tooltip descriptions

### 6. CSS Updates

- **Modified**: `src/styles/components/_map.scss`

    - Added new status classes: `.status-normal`, `.status-warning`, `.status-high-warning`, `.status-critical`, `.status-no-data`
    - Updated tooltip classes: `.tooltip-normal`, `.tooltip-warning`, `.tooltip-high-warning`, `.tooltip-critical`, `.tooltip-no-data`
    - Proper color mapping for all risk levels

- **Modified**: `src/styles/components/_salinityManagement.scss`

    - Enhanced color classes for table rows and elements
    - Updated legend styling with new risk levels

- **Modified**: `src/styles/components/_salinityReport.scss`
    - Updated report styling with new classification colors
- Gradual migration path for existing code

### Responsive Design

- All updates maintain mobile compatibility
- Legend items wrap appropriately on smaller screens
- Color indicators remain visible across devices

## Testing Recommendations

1. **Visual Testing**:

    - Verify color consistency across all components
    - Check legend accuracy in tables and reports
    - Test map marker colors and popup content

2. **Functional Testing**:

    - Test classification logic with different data sets
    - Verify MNB station special handling
    - Check system-wide risk assessment accuracy

3. **Responsive Testing**:
    - Test on mobile devices
    - Verify legend readability
    - Check table formatting on small screens

## Migration Notes

- All existing data remains compatible
- No database changes required
- Classification is applied at display time
- Can easily revert by updating import statements

## Future Enhancements

1. Add configuration for threshold values
2. Implement historical risk trend analysis
3. Add alert notifications for high-risk conditions
4. Create detailed risk assessment reports
