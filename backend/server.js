
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Định nghĩa cấu trúc dữ liệu sách
const bookSchema = new mongoose.Schema({
  bookId: { type: String, required: true, unique: true, trim: true },
  title: { type: String, required: true, trim: true },
  author: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  publisher: { type: String, required: true, trim: true },
  publishYear: { type: Number, required: true, min: 0 },
  isbn: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  description: { type: String, default: "" }
}, { timestamps: true });

const Book = mongoose.model("Book", bookSchema);

// Kiểm tra tình trạng backend
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    database: mongoose.connection.readyState === 1
      ? "connected"
      : "disconnected"
  });
});

// Lấy danh sách và tìm kiếm sách
app.get("/api/books", async (req, res) => {
  try {
    const search = req.query.search?.trim();
    const filter = search
      ? {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { author: { $regex: search, $options: "i" } },
            { category: { $regex: search, $options: "i" } }
          ]
        }
      : {};

    const books = await Book.find(filter).sort({ title: 1 });
    res.json(books);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Không thể lấy danh sách sách" });
  }
});

// Xem chi tiết sách theo MongoDB ObjectId
app.get("/api/books/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "ID sách không hợp lệ" });
    }

    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: "Không tìm thấy sách" });
    }

    res.json(book);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy thông tin sách" });
  }
});

// Thêm sách
app.post("/api/books", async (req, res) => {
  try {
    const book = await Book.create(req.body);
    res.status(201).json(book);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Mã sách đã tồn tại" });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Lỗi khi thêm sách" });
  }
});

// Cập nhật sách
app.put("/api/books/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "ID sách không hợp lệ" });
    }

    const book = await Book.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!book) {
      return res.status(404).json({ message: "Không tìm thấy sách" });
    }

    res.json(book);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Mã sách đã tồn tại" });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Lỗi khi cập nhật sách" });
  }
});

// Xóa sách
app.delete("/api/books/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "ID sách không hợp lệ" });
    }

    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) {
      return res.status(404).json({ message: "Không tìm thấy sách" });
    }

    res.json({ message: "Xóa sách thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi xóa sách" });
  }
});

// Khởi động server và kết nối MongoDB Atlas
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("Chưa cấu hình biến môi trường MONGODB_URI");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Đã kết nối MongoDB Atlas");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Backend đang chạy tại cổng ${PORT}`);
    });
  } catch (error) {
    console.error("Không thể khởi động backend:", error.message);
    process.exit(1);
  }
}

startServer();
