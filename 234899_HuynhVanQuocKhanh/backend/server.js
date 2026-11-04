require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Định nghĩa Schema & Model (Collection: devices)
const deviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: [true, 'Mã thiết bị là bắt buộc'], unique: true, trim: true },
  name: { type: String, required: [true, 'Tên thiết bị là bắt buộc'], trim: true },
  deviceType: { type: String, required: [true, 'Loại thiết bị là bắt buộc'], trim: true },
  room: { type: String, required: [true, 'Phòng học là bắt buộc'], trim: true },
  brand: { type: String, default: '' },
  model: { type: String, default: '' },
  quantity: { type: Number, required: true, min: [0, 'Số lượng không được âm'], default: 1 },
  status: {
    type: String,
    enum: ['Đang sử dụng', 'Hư hỏng', 'Đang sửa chữa', 'Ngừng sử dụng'],
    default: 'Đang sử dụng'
  },
  purchaseDate: { type: String, default: '' },
  description: { type: String, default: '' }
}, { timestamps: true, collection: 'devices' });

const Device = mongoose.model('Device', deviceSchema);

// Hàm tự động tạo 3 bản ghi mẫu nếu collection trống
const seedInitialData = async () => {
  try {
    const count = await Device.countDocuments();
    if (count === 0) {
      await Device.insertMany([
        {
          deviceId: 'TB001',
          name: 'Máy chiếu Sony VPL-DX221',
          deviceType: 'Máy chiếu',
          room: 'P.A101',
          brand: 'Sony',
          model: 'VPL-DX221',
          quantity: 1,
          status: 'Đang sử dụng',
          purchaseDate: '2024-01-15',
          description: 'Máy chiếu chính phục vụ giảng dạy lý thuyết'
        },
        {
          deviceId: 'TB002',
          name: 'Máy tính để bàn Dell OptiPlex',
          deviceType: 'Máy tính',
          room: 'P.PM02',
          brand: 'Dell',
          model: 'OptiPlex 7090',
          quantity: 35,
          status: 'Đang sử dụng',
          purchaseDate: '2024-03-10',
          description: 'Dàn máy phòng thực hành đám mây'
        },
        {
          deviceId: 'TB003',
          name: 'Hệ thống loa trợ giảng TOA',
          deviceType: 'Thiết bị âm thanh',
          room: 'P.B205',
          brand: 'TOA',
          model: 'WM-5225',
          quantity: 2,
          status: 'Đang sửa chữa',
          purchaseDate: '2023-09-20',
          description: 'Một micro không dây đang bảo hành pin'
        }
      ]);
      console.log('Đã tự động khởi tạo 3 thiết bị mẫu vào collection devices!');
    }
  } catch (err) {
    console.error('Lỗi khởi tạo dữ liệu mẫu:', err.message);
  }
};

// Kết nối MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Kết nối MongoDB Atlas thành công!');
    seedInitialData();
  })
  .catch((err) => console.error('Lỗi kết nối MongoDB:', err.message));

// 2. Endpoint kiểm tra trạng thái hoạt động (/health)
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  res.status(200).json({
    status: 'OK',
    message: 'Backend API đang hoạt động tốt',
    database: dbStatus,
    timestamp: new Date()
  });
});

// 3. GET /api/devices (Lấy danh sách + Tìm kiếm theo từ khóa ?search=...)
app.get('/api/devices', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      query = {
        $or: [
          { deviceId: regex },
          { name: regex },
          { deviceType: regex },
          { room: regex },
          { brand: regex }
        ]
      };
    }
    const devices = await Device.find(query).sort({ createdAt: -1 });
    res.status(200).json(devices);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy danh sách thiết bị', error: err.message });
  }
});

// 4. GET /api/devices/:id (Xem chi tiết 1 thiết bị theo _id hoặc deviceId)
app.get('/api/devices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let device = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      device = await Device.findById(id);
    }
    if (!device) {
      device = await Device.findOne({ deviceId: id });
    }
    if (!device) {
      return res.status(404).json({ message: 'Không tìm thấy thiết bị' });
    }
    res.status(200).json(device);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi lấy thông tin thiết bị', error: err.message });
  }
});

// 5. POST /api/devices (Thêm thiết bị mới)
app.post('/api/devices', async (req, res) => {
  try {
    const { deviceId, name, deviceType, room, brand, model, quantity, status, purchaseDate, description } = req.body;

    if (!deviceId || !name || !deviceType || !room) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ: Mã thiết bị, Tên, Loại thiết bị và Phòng học' });
    }

    const existing = await Device.findOne({ deviceId: deviceId.trim() });
    if (existing) {
      return res.status(400).json({ message: `Mã thiết bị "${deviceId}" đã tồn tại!` });
    }

    const newDevice = new Device({
      deviceId, name, deviceType, room, brand, model,
      quantity: quantity !== undefined ? Number(quantity) : 1,
      status, purchaseDate, description
    });

    const savedDevice = await newDevice.save();
    res.status(201).json(savedDevice);
  } catch (err) {
    res.status(400).json({ message: 'Dữ liệu không hợp lệ', error: err.message });
  }
});

// 6. PUT /api/devices/:id (Cập nhật thiết bị)
app.put('/api/devices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { deviceId, name, deviceType, room } = req.body;

    if (!deviceId || !name || !deviceType || !room) {
      return res.status(400).json({ message: 'Mã thiết bị, Tên, Loại và Phòng học không được để trống' });
    }

    // Kiểm tra trùng deviceId với thiết bị khác
    const duplicate = await Device.findOne({ deviceId: deviceId.trim(), _id: { $ne: id } });
    if (duplicate) {
      return res.status(400).json({ message: `Mã thiết bị "${deviceId}" đã thuộc về thiết bị khác!` });
    }

    const updatedDevice = await Device.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!updatedDevice) {
      return res.status(404).json({ message: 'Không tìm thấy thiết bị để cập nhật' });
    }
    res.status(200).json(updatedDevice);
  } catch (err) {
    res.status(400).json({ message: 'Lỗi cập nhật thiết bị', error: err.message });
  }
});

// 7. DELETE /api/devices/:id (Xóa thiết bị)
app.delete('/api/devices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Device.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Không tìm thấy thiết bị để xóa' });
    }
    res.status(200).json({ message: 'Đã xóa thiết bị thành công', device: deleted });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi xóa thiết bị', error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại cổng ${PORT}`);
});