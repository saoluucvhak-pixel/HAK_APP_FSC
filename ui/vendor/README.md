# Thư viện dùng chung HAK (bản sao nguyên văn, không sửa)

| Thư mục | Nguồn | Commit |
| --- | --- | --- |
| `hak-design-system/luxe.css`, `components.css` | saoluucvhak-pixel/HAK-Enterprise-Design-System (`tokens/luxe.css`, `design-system/hak-enterprise-components.css`) | 69ac08a |
| `hak-smart-filter/` (`core`, `browser.js`, `index.js`) | saoluucvhak-pixel/HAK_SMART_FILTER v1.0.0 (+ #1: kho bộ lọc hỏng không bị ghi đè) | e99bb7e |

Các file này được ghép vào giao diện khi chạy `npm run build:html`. Cập nhật bằng cách chép lại từ repository nguồn, không sửa trực tiếp ở đây.
Kiểm thử của thư viện nguồn được chạy lại ở `tests/vendor-smart-filter.test.js`.

| `hak-accounting-report-standard/` (`index.js`, `exact-format.js`) | saoluucvhak-pixel/HAK_ACCOUNTING_REPORT_STANDARD V1.0.0 | a5833a9 |

Chuẩn báo cáo chỉ dùng trong kiểm thử (`tests/report-standard.test.js`) để chứng minh định dạng số, căn lề và cấu trúc báo cáo HAKQN khớp chuẩn; không ghép vào giao diện.

Ghi chú: `ui/skins.css` (neutral, champagne) KHÔNG phải bản sao từ repository nguồn mà do HAKQN tự định nghĩa; classic là `:root` của `luxe.css` khi không đặt `data-skin`.

Kiểm tra đồng bộ với repository nguồn (2026-11-13, đầu nhánh mặc định): HAK-Enterprise-Design-System `69ac08a` (đúng bản đã chép); HAK_SMART_FILTER `e99bb7e` (đã cập nhật từ `5181681`: chỉ `core/smart-filter.js` đổi, `browser.js` và `index.js` giống nhau); HAK_ACCOUNTING_REPORT_STANDARD `d324996` (mới hơn `a5833a9` nhưng chỉ đổi `src/moisture-settings.js`, tài liệu và test về độ ẩm — hai file `index.js`, `exact-format.js` đã chép không đổi nên giữ ghim `a5833a9`); HAK_CODE_QUALITY_TEST `b78d9b2` (đúng commit ghim trong workflow `.github/workflows/build-windows.yml`).
