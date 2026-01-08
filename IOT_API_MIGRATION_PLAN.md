# Kế hoạch Migration: IoT Data từ API bên thứ 3 sang Database nội bộ

## 📋 Tổng quan

Hiện tại frontend đang gọi trực tiếp API của bên thứ 3 (thegreenlab.xyz) để lấy dữ liệu IoT. Kế hoạch mới là:
1. **Backend NodeJS** sẽ định kỳ fetch data từ API bên thứ 3 và lưu vào Database
2. **Frontend** chỉ cần gọi API backend nội bộ để lấy data từ DB

---

## 🏗️ Kiến trúc mới

```
┌─────────────────┐
│  Frontend       │
│  (ReactJS)      │
└────────┬────────┘
         │
         │ GET /api/iot/stations/:serialNumber
         │     ?startDate=...&endDate=...
         ▼
┌─────────────────┐
│  Backend API    │
│  (NodeJS)       │
└────────┬────────┘
         │
         │ Query Database
         ▼
┌─────────────────┐       Cron Job (mỗi 5 phút)
│   Database      │ ◄─────────────────┐
│   (MongoDB/     │                   │
│    PostgreSQL)  │                   │
└─────────────────┘                   │
                                      │
                              ┌───────┴────────┐
                              │  Background    │
                              │  Sync Service  │
                              └───────┬────────┘
                                      │
                                      │ Fetch data
                                      ▼
                              ┌────────────────┐
                              │  External API  │
                              │ thegreenlab.xyz│
                              └────────────────┘
```

---

## 📊 Database Schema

### Collection/Table: `iot_stations`
Lưu thông tin trạm IoT

```javascript
{
  _id: ObjectId,
  serialNumber: String,      // "Log01250713"
  name: String,              // "Kênh C-DHNL"
  location: {
    latitude: Number,
    longitude: Number
  },
  status: String,            // "active", "inactive"
  createdAt: Date,
  updatedAt: Date
}
```

### Collection/Table: `iot_data`
Lưu dữ liệu đo từ cảm biến

```javascript
{
  _id: ObjectId,
  serialNumber: String,      // "Log01250713"
  date: Date,                // ISO Date: "2025-10-20T01:20:00.000Z"
  sensorType: String,        // "Salt", "Distance", "Temp", "Daily Rainfall"
  value: Number,             // 0.39, -74, 27.74, 0
  unit: String,              // "g/L", "cm", "°C", "mm"
  status: String,            // "Normal", "Offline", etc.
  createdAt: Date,           // Thời gian lưu vào DB
  updatedAt: Date
}
```

**Indexes cần tạo:**
```javascript
// MongoDB
db.iot_data.createIndex({ serialNumber: 1, date: -1 });
db.iot_data.createIndex({ serialNumber: 1, sensorType: 1, date: -1 });
db.iot_data.createIndex({ date: -1 });

// PostgreSQL
CREATE INDEX idx_iot_data_serial_date ON iot_data(serialNumber, date DESC);
CREATE INDEX idx_iot_data_serial_sensor_date ON iot_data(serialNumber, sensorType, date DESC);
```

---

## 🔧 Backend Implementation (NodeJS)

### 1. Service để sync data từ API bên thứ 3

**File: `services/iotSyncService.js`**

```javascript
const axios = require('axios');
const IotData = require('../models/IotData');
const IotStation = require('../models/IotStation');

class IoTSyncService {
    constructor() {
        this.API_BASE_URL = 'https://thegreenlab.xyz/Datums/DataByDateJson';
        this.credentials = {
            username: 'nguyenduyliem@hcmuaf.edu.vn',
            password: 'DHNL@2345'
        };
    }

    /**
     * Fetch data từ API bên thứ 3
     */
    async fetchFromExternalAPI(serialNumber, startDate, endDate) {
        try {
            const url = `${this.API_BASE_URL}?DeviceSerialNumber=${serialNumber}&StartDate=${startDate}&EndDate=${endDate}`;
            
            const response = await axios.get(url, {
                auth: {
                    username: this.credentials.username,
                    password: this.credentials.password
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error(`Error fetching data for ${serialNumber}:`, error.message);
            throw error;
        }
    }

    /**
     * Lưu data vào database
     */
    async saveToDatabase(serialNumber, data) {
        if (!data || !Array.isArray(data) || data.length === 0) {
            return { inserted: 0, updated: 0 };
        }

        let inserted = 0;
        let updated = 0;

        for (const item of data) {
            try {
                // Sử dụng upsert để tránh duplicate
                const result = await IotData.findOneAndUpdate(
                    {
                        serialNumber: serialNumber,
                        date: new Date(item.Date),
                        sensorType: item.SensorType
                    },
                    {
                        $set: {
                            value: parseFloat(item.Value),
                            unit: item.Unit,
                            status: item.Status,
                            updatedAt: new Date()
                        },
                        $setOnInsert: {
                            createdAt: new Date()
                        }
                    },
                    {
                        upsert: true,
                        new: true
                    }
                );

                if (result) {
                    if (result.createdAt && result.updatedAt && 
                        result.createdAt.getTime() === result.updatedAt.getTime()) {
                        inserted++;
                    } else {
                        updated++;
                    }
                }
            } catch (error) {
                console.error(`Error saving data point:`, error.message);
            }
        }

        return { inserted, updated };
    }

    /**
     * Sync data cho 1 trạm trong khoảng thời gian
     */
    async syncStation(serialNumber, startDate, endDate) {
        try {
            console.log(`Syncing ${serialNumber} from ${startDate} to ${endDate}...`);
            
            // 1. Fetch data từ API bên thứ 3
            const data = await this.fetchFromExternalAPI(serialNumber, startDate, endDate);
            
            // 2. Lưu vào database
            const result = await this.saveToDatabase(serialNumber, data);
            
            console.log(`Sync completed for ${serialNumber}: ${result.inserted} inserted, ${result.updated} updated`);
            
            return {
                success: true,
                serialNumber,
                ...result,
                totalRecords: data.length
            };
        } catch (error) {
            console.error(`Sync failed for ${serialNumber}:`, error.message);
            return {
                success: false,
                serialNumber,
                error: error.message
            };
        }
    }

    /**
     * Sync tất cả các trạm active
     */
    async syncAllStations() {
        try {
            // Lấy danh sách tất cả trạm active
            const stations = await IotStation.find({ status: 'active' });
            
            // Sync data cho 7 ngày gần nhất
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);

            const results = [];
            for (const station of stations) {
                const result = await this.syncStation(
                    station.serialNumber,
                    startDate.toISOString().split('T')[0],
                    endDate.toISOString().split('T')[0]
                );
                results.push(result);
            }

            return results;
        } catch (error) {
            console.error('Error syncing all stations:', error.message);
            throw error;
        }
    }
}

module.exports = new IoTSyncService();
```

---

### 2. Cron Job để sync định kỳ

**File: `jobs/iotSyncCron.js`**

```javascript
const cron = require('node-cron');
const iotSyncService = require('../services/iotSyncService');

/**
 * Chạy sync job mỗi 5 phút
 * Cron expression: */5 * * * *
 * - Minute: */5 (mỗi 5 phút)
 * - Hour: * (mọi giờ)
 * - Day: * (mọi ngày)
 */
function startIoTSyncCron() {
    cron.schedule('*/5 * * * *', async () => {
        console.log(`[${new Date().toISOString()}] Starting IoT data sync...`);
        
        try {
            const results = await iotSyncService.syncAllStations();
            
            const totalInserted = results.reduce((sum, r) => sum + (r.inserted || 0), 0);
            const totalUpdated = results.reduce((sum, r) => sum + (r.updated || 0), 0);
            const failed = results.filter(r => !r.success).length;
            
            console.log(`[${new Date().toISOString()}] Sync completed: ${totalInserted} inserted, ${totalUpdated} updated, ${failed} failed`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Sync failed:`, error.message);
        }
    });

    console.log('IoT sync cron job started (runs every 5 minutes)');
}

module.exports = { startIoTSyncCron };
```

---

### 3. API Endpoints cho Frontend

**File: `routes/iotRoutes.js`**

```javascript
const express = require('express');
const router = express.Router();
const IotData = require('../models/IotData');
const IotStation = require('../models/IotStation');

/**
 * GET /api/iot/stations/:serialNumber
 * Lấy dữ liệu IoT từ database
 */
router.get('/stations/:serialNumber', async (req, res) => {
    try {
        const { serialNumber } = req.params;
        const { startDate, endDate } = req.query;

        // Validate
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate và endDate là bắt buộc'
            });
        }

        // Lấy thông tin trạm
        const station = await IotStation.findOne({ serialNumber });
        if (!station) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy trạm IoT'
            });
        }

        // Lấy data từ database
        const data = await IotData.find({
            serialNumber: serialNumber,
            date: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        })
        .sort({ date: 1 })
        .lean();

        // Format dữ liệu giống như API cũ
        const formattedData = data.map(item => ({
            Date: item.date.toISOString(),
            SensorType: item.sensorType,
            Value: item.value,
            Unit: item.unit,
            Status: item.status
        }));

        // Tính toán summary
        const summary = {
            totalRecords: formattedData.length,
            dateRange: formattedData.length > 0
                ? `${new Date(formattedData[0].Date).toLocaleDateString('vi-VN')} - ${new Date(formattedData[formattedData.length - 1].Date).toLocaleDateString('vi-VN')}`
                : 'N/A'
        };

        res.json({
            success: true,
            stationName: station.name,
            serialNumber: station.serialNumber,
            dataPoints: formattedData,
            summary
        });

    } catch (error) {
        console.error('Error fetching IoT data:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy dữ liệu IoT',
            error: error.message
        });
    }
});

/**
 * GET /api/iot/stations
 * Lấy danh sách tất cả các trạm IoT
 */
router.get('/stations', async (req, res) => {
    try {
        const stations = await IotStation.find({ status: 'active' })
            .select('serialNumber name location')
            .lean();

        res.json({
            success: true,
            stations
        });
    } catch (error) {
        console.error('Error fetching stations:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách trạm',
            error: error.message
        });
    }
});

/**
 * POST /api/iot/sync/:serialNumber
 * Trigger manual sync cho 1 trạm (admin only)
 */
router.post('/sync/:serialNumber', async (req, res) => {
    try {
        const { serialNumber } = req.params;
        const { startDate, endDate } = req.body;

        const iotSyncService = require('../services/iotSyncService');
        const result = await iotSyncService.syncStation(serialNumber, startDate, endDate);

        res.json(result);
    } catch (error) {
        console.error('Error syncing station:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi sync dữ liệu',
            error: error.message
        });
    }
});

module.exports = router;
```

---

### 4. Mongoose Models

**File: `models/IotStation.js`**

```javascript
const mongoose = require('mongoose');

const iotStationSchema = new mongoose.Schema({
    serialNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    location: {
        latitude: Number,
        longitude: Number
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('IotStation', iotStationSchema);
```

**File: `models/IotData.js`**

```javascript
const mongoose = require('mongoose');

const iotDataSchema = new mongoose.Schema({
    serialNumber: {
        type: String,
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    sensorType: {
        type: String,
        required: true,
        enum: ['Salt', 'Distance', 'Temp', 'Daily Rainfall']
    },
    value: {
        type: Number,
        required: true
    },
    unit: {
        type: String,
        required: true
    },
    status: {
        type: String,
        default: 'Normal'
    }
}, {
    timestamps: true
});

// Compound index để query nhanh hơn
iotDataSchema.index({ serialNumber: 1, date: -1 });
iotDataSchema.index({ serialNumber: 1, sensorType: 1, date: -1 });

// Unique constraint để tránh duplicate
iotDataSchema.index({ serialNumber: 1, date: 1, sensorType: 1 }, { unique: true });

module.exports = mongoose.model('IotData', iotDataSchema);
```

---

### 5. Setup trong `app.js` hoặc `server.js`

```javascript
const express = require('express');
const mongoose = require('mongoose');
const iotRoutes = require('./routes/iotRoutes');
const { startIoTSyncCron } = require('./jobs/iotSyncCron');

const app = express();

// Middleware
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('Connected to MongoDB');
    
    // Start cron job sau khi connect DB thành công
    startIoTSyncCron();
})
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/iot', iotRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

---

## 🎨 Frontend Update

### Cập nhật `iotService.js`

**File: `src/services/iotService.js`**

```javascript
// Backend API URL (thay đổi theo môi trường)
const IOT_API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3000/api/iot';

export class IoTService {
    /**
     * Fetch dữ liệu IoT từ backend API (đã lưu trong DB)
     */
    static async fetchStationData(serialNumber, startDate, endDate) {
        try {
            const url = `${IOT_API_BASE_URL}/stations/${serialNumber}?startDate=${startDate}&endDate=${endDate}`;
            
            console.log('Fetching from backend:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    // Thêm token nếu cần authentication
                    // 'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                return {
                    success: false,
                    message: errorData.message || `Lỗi server: ${response.status}`,
                    data: []
                };
            }

            const result = await response.json();
            
            if (!result.success) {
                return {
                    success: false,
                    message: result.message || "Không có dữ liệu",
                    data: []
                };
            }

            return {
                success: true,
                message: `Tìm thấy ${result.dataPoints.length} bản ghi`,
                data: result.dataPoints,
                stationName: result.stationName,
                summary: result.summary
            };

        } catch (error) {
            console.error('Error fetching IoT station data:', error);
            
            return {
                success: false,
                message: error.message || 'Có lỗi xảy ra khi lấy dữ liệu',
                data: []
            };
        }
    }

    /**
     * Format data để hiển thị (giữ nguyên logic cũ)
     */
    static formatDataForDisplay(data, stationInfo) {
        if (!data || !Array.isArray(data)) {
            return {
                stationName: stationInfo.name,
                serialNumber: stationInfo.serial,
                dataPoints: [],
                summary: {
                    totalRecords: 0,
                    dateRange: 'N/A'
                }
            };
        }

        return {
            stationName: stationInfo.name,
            serialNumber: stationInfo.serial,
            dataPoints: data,
            summary: {
                totalRecords: data.length,
                dateRange: data.length > 0 ? 
                    `${new Date(data[0].Date).toLocaleDateString("vi-VN")} - ${new Date(data[data.length - 1].Date).toLocaleDateString("vi-VN")}` : 
                    'N/A'
            }
        };
    }

    // Các method khác giữ nguyên...
}

export default IoTService;
```

---

## 📦 Dependencies cần cài đặt

### Backend
```bash
npm install express mongoose axios node-cron dotenv
npm install --save-dev nodemon
```

### Frontend (không thay đổi)
```bash
# Không cần thêm gì, chỉ cập nhật iotService.js
```

---

## 🔐 Environment Variables

**File: `.env` (Backend)**

```env
# Database
MONGODB_URI=mongodb://localhost:27017/xamnhapman
# hoặc
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/xamnhapman

# Server
PORT=3000
NODE_ENV=production

# External API (optional, có thể hardcode trong service)
EXTERNAL_IOT_API_URL=https://thegreenlab.xyz/Datums/DataByDateJson
EXTERNAL_IOT_USERNAME=nguyenduyliem@hcmuaf.edu.vn
EXTERNAL_IOT_PASSWORD=DHNL@2345
```

**File: `.env` (Frontend)**

```env
VITE_BACKEND_API_URL=http://localhost:3000/api/iot
# Production:
# VITE_BACKEND_API_URL=https://your-backend-domain.com/api/iot
```

---

## 🚀 Deployment Steps

### 1. Setup Database
```bash
# MongoDB
mongosh
use xamnhapman
db.createCollection('iotstations')
db.createCollection('iotdata')

# Tạo indexes
db.iotdata.createIndex({ serialNumber: 1, date: -1 })
db.iotdata.createIndex({ serialNumber: 1, sensorType: 1, date: -1 })
db.iotdata.createIndex({ serialNumber: 1, date: 1, sensorType: 1 }, { unique: true })
```

### 2. Seed initial station data
```javascript
// Script: seeds/iotStations.js
const mongoose = require('mongoose');
const IotStation = require('../models/IotStation');

async function seedStations() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const stations = [
        {
            serialNumber: 'Log01250713',
            name: 'Kênh C-DHNL',
            location: { latitude: 10.8231, longitude: 106.6297 },
            status: 'active'
        }
        // Thêm các trạm khác...
    ];

    await IotStation.insertMany(stations);
    console.log('Stations seeded successfully');
    process.exit(0);
}

seedStations();
```

### 3. Initial data sync
```bash
# Chạy lần đầu để sync data 30 ngày gần nhất
node scripts/initialSync.js
```

### 4. Start backend server
```bash
npm start
# hoặc với nodemon
npm run dev
```

### 5. Update frontend environment và deploy
```bash
# Frontend
npm run build
```

---

## 📊 Monitoring & Maintenance

### 1. Log sync status
Tạo collection `sync_logs` để track quá trình sync:

```javascript
{
  _id: ObjectId,
  serialNumber: String,
  startDate: Date,
  endDate: Date,
  recordsSynced: Number,
  status: String, // "success", "failed"
  error: String,
  syncedAt: Date
}
```

### 2. Alert khi sync fail
Sử dụng service như Sentry, hoặc gửi email/Slack notification khi sync fail nhiều lần.

### 3. Data cleanup
Tạo cron job để xóa data cũ (>6 tháng) để tiết kiệm storage:

```javascript
cron.schedule('0 2 * * 0', async () => {
    // Chạy vào 2h sáng chủ nhật hàng tuần
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const result = await IotData.deleteMany({
        date: { $lt: sixMonthsAgo }
    });
    
    console.log(`Deleted ${result.deletedCount} old records`);
});
```

---

## ✅ Testing Checklist

- [ ] Backend API hoạt động đúng (`GET /api/iot/stations/:serialNumber`)
- [ ] Cron job chạy định kỳ và sync data thành công
- [ ] Frontend lấy được data từ backend API
- [ ] Data hiển thị đúng trên chart (4 loại cảm biến)
- [ ] Performance: Query database nhanh (<500ms)
- [ ] Error handling: Xử lý đúng khi API fail hoặc DB down
- [ ] Data consistency: Không duplicate data khi sync nhiều lần

---

## 🎯 Benefits

1. **Performance**: Frontend không còn phụ thuộc vào tốc độ API bên thứ 3
2. **Reliability**: Data được cache trong DB, không bị mất khi API bên thứ 3 down
3. **Scalability**: Dễ mở rộng thêm trạm mới
4. **Analytics**: Có thể chạy query phân tích trên DB
5. **Security**: Credentials API bên thứ 3 chỉ lưu ở backend

---

## 📝 Notes

- Nếu dùng PostgreSQL thay vì MongoDB, cần sửa lại models và queries
- Có thể dùng Redis để cache data tạm thời (5 phút) để giảm tải DB
- Nên implement rate limiting cho API để tránh abuse
- Backup database định kỳ
