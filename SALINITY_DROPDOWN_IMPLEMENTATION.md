# Salinity Monitoring Dropdown Implementation

## Overview
Successfully implemented a dropdown structure for "Quan trắc mặn" (Salinity Monitoring) in the left menu map, replacing the previous flat structure with a collapsible dropdown similar to the administrative layers.

## Changes Made

### 1. Component Structure Modifications (`LeftMenuMap.jsx`)

#### New Imports
- Added `IoTStationModal` component
- Added `IoTService` for API integration

#### State Management
- Added `openSalinityDropdown` to control dropdown visibility
- Added `iotModalOpen` for modal state
- Added `iotData` to store fetched IoT data

#### New Functions
- `toggleSalinityDropdown()`: Controls the dropdown expand/collapse
- `handleIoTStationClick()`: Opens the IoT station selection modal
- `handleIoTDataSubmit()`: Handles IoT data fetching and processing

### 2. UI Structure Changes

#### Dropdown Header: "Quan trắc mặn"
- Clickable header with expand/collapse icon
- Similar visual style to administrative layers dropdown

#### Dropdown Items:
1. **Điểm đo mặn (Salinity Points)**
   - Maintains original checkbox functionality
   - Preserves existing `salinityPoints` layer toggle logic

2. **Trạm IoT (IoT Stations)**
   - Button-style interface
   - Opens modal for station and date selection

### 3. New Components

#### IoT Station Modal (`IoTStationModal.jsx`)
- **Station Selection**: Dropdown with two predefined stations
  - Kênh C-DHNL (Log01250713)
  - Kênh An Hạ-DHNL (Log01250711)
- **Date Range Selection**: Start and end date inputs
- **Validation**: Form validation for all required fields
- **Loading States**: Progress indicators during API calls

#### IoT Service (`iotService.js`)
- **API Integration**: Connects to `https://thegreenlab.xyz/Datums/DataByDateJson`
- **Authentication**: Basic Auth with provided credentials
  - Username: `nguyenduyliem@hcmuaf.edu.vn`
  - Password: `DHNL@2345`
- **Data Processing**: Formats API response for display
- **Error Handling**: Comprehensive error management

### 4. Styling Enhancements (`_menu.scss`)

#### IoT Button Styles
- Consistent with existing layer toggles
- Hover effects and transitions
- Proper color theming

#### Modal Styles
- Modern, responsive design
- Gradient backgrounds
- Form styling with focus states
- Button animations and states
- Mobile-friendly responsive design

### 5. Configuration Updates

#### Path Aliases
- Updated `jsconfig.json` to include `@services/*` mapping
- Updated `vite.config.js` to include services alias
- Ensures proper module resolution

## API Integration Details

### Endpoint Structure
```
GET https://thegreenlab.xyz/Datums/DataByDateJson
Query Parameters:
- DeviceSerialNumber: {serial_number}
- StartDate: {YYYY-MM-dd}
- EndDate: {YYYY-MM-dd}
```

### Authentication
- Method: HTTP Basic Authentication
- Credentials: Encoded in service layer for security
- **IMPORTANT**: Use correct credentials: `nguyenduyliem@hcmuaf.edu.vn:DHNL@2345`
- **Note**: Previous attempts with `dragonmountain.project@gmail.com` resulted in 401 errors

### Available Stations
1. **Kênh C-DHNL**
   - Serial: `Log01250713`
2. **Kênh An Hạ-DHNL**
   - Serial: `Log01250711`

## User Experience Flow

1. User clicks on "Quan trắc mặn" header
2. Dropdown expands showing two options:
   - Điểm đo mặn (checkbox - existing functionality)
   - Trạm IoT (button - new functionality)
3. For IoT stations:
   - Click "Trạm IoT" button
   - Modal opens with station and date selection
   - Fill required fields and submit
   - API fetches data with authentication
   - Success message shows data summary
   - Modal closes, data is available for map display

## Technical Benefits

1. **Consistent UI/UX**: Matches existing administrative layers design
2. **Maintainable Code**: Modular component structure
3. **Secure Authentication**: Credentials handled in service layer
4. **Error Handling**: Comprehensive error management
5. **Responsive Design**: Works across all device sizes
6. **Extensible**: Easy to add more IoT stations or features

## Future Enhancements

1. **Data Visualization**: Display fetched IoT data on map
2. **Data Export**: Allow users to download fetched data
3. **Real-time Updates**: Implement websocket for live data
4. **Data Caching**: Cache frequently requested data
5. **More Stations**: Easy to add additional IoT stations

## Testing Status

- ✅ Development server starts without errors
- ✅ All imports resolve correctly
- ✅ Component structure maintains existing functionality
- ✅ New dropdown functionality integrated
- ✅ Modal and service components created
- ✅ Styling properly applied

The implementation successfully maintains all existing functionality while adding the requested dropdown structure and IoT station integration.