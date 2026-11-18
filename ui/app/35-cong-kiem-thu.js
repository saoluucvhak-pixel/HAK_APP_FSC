/* ========== Cổng kiểm thử duy nhất: window.__hak ==========
 * Các móc chỉ để kiểm thử (đọc, điều hướng) do từng module đăng ký vào CONG_KT được mở ra ở đây thành MỘT đối tượng window.__hak,
 * và CHỈ khi chạy từ mã nguồn: tiến trình chính truyền cờ --hakqn-test-hooks khi ứng dụng chưa đóng gói, preload đặt window.hak.testHooks.
 * Bản cài đặt thật KHÔNG có window.__hak (CI kiểm trên bộ cài thật).
 * Không thuộc cổng này, luôn có: cầu nối của bản cài thật với tiến trình chính — window.__stDirty, __stSaveCurrent, __nhapTamXoa
 * (src/main.js dùng khi đóng ứng dụng để hỏi lưu bản nháp). */
if (window.hak && window.hak.testHooks) {
  CONG_KT.nav = () => Object.assign({}, NAV);   // đọc trạng thái điều hướng hiện tại (bản sao)
  window.__hak = Object.freeze(Object.assign({}, CONG_KT));
}
