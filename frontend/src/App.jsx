import { useEffect, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const emptyBook = {
  bookId: "",
  title: "",
  author: "",
  category: "",
  publisher: "",
  publishYear: "",
  isbn: "",
  quantity: "",
  description: "",
};

function App() {
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyBook);
  const [editingId, setEditingId] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchBooks = async (keyword = "") => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/books?search=${encodeURIComponent(keyword)}`
      );

      if (!response.ok) {
        throw new Error("Không thể tải danh sách sách");
      }

      const data = await response.json();
      setBooks(Array.isArray(data) ? data : data.books || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    try {
      const url = editingId
        ? `${API_URL}/api/books/${editingId}`
        : `${API_URL}/api/books`;

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          publishYear: Number(form.publishYear),
          quantity: Number(form.quantity),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Không thể lưu sách");
      }

      setMessage(
        editingId ? "Cập nhật sách thành công!" : "Thêm sách thành công!"
      );

      setForm(emptyBook);
      setEditingId(null);
      await fetchBooks(search);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (book) => {
    setEditingId(book._id);
    setForm({
      bookId: book.bookId || "",
      title: book.title || "",
      author: book.author || "",
      category: book.category || "",
      publisher: book.publisher || "",
      publishYear: book.publishYear ?? "",
      isbn: book.isbn || "",
      quantity: book.quantity ?? "",
      description: book.description || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa sách này?")) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/books/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Không thể xóa sách");
      }

      setMessage("Xóa sách thành công!");

      if (selectedBook?._id === id) {
        setSelectedBook(null);
      }

      await fetchBooks(search);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleView = async (id) => {
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/books/${id}`);

      if (!response.ok) {
        throw new Error("Không thể xem chi tiết sách");
      }

      const data = await response.json();
      setSelectedBook(data);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container">
      <header>
        <h1>📚 HỆ THỐNG QUẢN LÝ SÁCH</h1>
        <p>Ứng dụng quản lý sách trên nền tảng điện toán đám mây</p>
      </header>

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <section className="card">
        <h2>{editingId ? "Cập nhật sách" : "Thêm sách mới"}</h2>

        <form onSubmit={handleSubmit} className="book-form">
          {Object.keys(emptyBook).map((field) => (
            <div className="form-group" key={field}>
              <label>{field}</label>

              {field === "description" ? (
                <textarea
                  name={field}
                  value={form[field]}
                  onChange={handleChange}
                />
              ) : (
                <input
                  name={field}
                  type={
                    field === "publishYear" || field === "quantity"
                      ? "number"
                      : "text"
                  }
                  min={
                    field === "publishYear" || field === "quantity"
                      ? "0"
                      : undefined
                  }
                  value={form[field]}
                  onChange={handleChange}
                  required
                />
              )}
            </div>
          ))}

          <button type="submit" className="btn primary">
            {editingId ? "Lưu cập nhật" : "Thêm sách"}
          </button>

          {editingId && (
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setEditingId(null);
                setForm(emptyBook);
              }}
            >
              Hủy chỉnh sửa
            </button>
          )}
        </form>
      </section>

      <section className="card">
        <h2>Danh sách sách</h2>

        <form
          className="search-box"
          onSubmit={(e) => {
            e.preventDefault();
            fetchBooks(search);
          }}
        >
          <input
            placeholder="Tìm kiếm theo tên sách, tác giả, thể loại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button type="submit" className="btn primary">
            Tìm kiếm
          </button>

          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              setSearch("");
              fetchBooks("");
            }}
          >
            Tất cả
          </button>
        </form>

        {loading ? (
          <p>Đang tải dữ liệu...</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Mã sách</th>
                  <th>Tên sách</th>
                  <th>Tác giả</th>
                  <th>Thể loại</th>
                  <th>Năm XB</th>
                  <th>Số lượng</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {books.map((book) => (
                  <tr key={book._id}>
                    <td>{book.bookId}</td>
                    <td>{book.title}</td>
                    <td>{book.author}</td>
                    <td>{book.category}</td>
                    <td>{book.publishYear}</td>
                    <td>{book.quantity}</td>
                    <td className="actions">
                      <button
                        className="btn info"
                        onClick={() => handleView(book._id)}
                      >
                        Xem
                      </button>

                      <button
                        className="btn warning"
                        onClick={() => handleEdit(book)}
                      >
                        Sửa
                      </button>

                      <button
                        className="btn danger"
                        onClick={() => handleDelete(book._id)}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}

                {books.length === 0 && (
                  <tr>
                    <td colSpan="7" className="empty">
                      Không có sách nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedBook && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Chi tiết sách</h2>

            {Object.entries(selectedBook)
              .filter(([key]) => key !== "__v")
              .map(([key, value]) => (
                <p key={key}>
                  <strong>{key}:</strong> {String(value)}
                </p>
              ))}

            <button
              className="btn secondary"
              onClick={() => setSelectedBook(null)}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;