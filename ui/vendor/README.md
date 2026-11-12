# Thư viện dùng chung HAK (bản sao nguyên văn, không sửa)

| Thư mục | Nguồn | Commit |
| --- | --- | --- |
| `hak-design-system/luxe.css`, `components.css` | saoluucvhak-pixel/HAK-Enterprise-Design-System (`tokens/luxe.css`, `design-system/hak-enterprise-components.css`) | 69ac08a |
| `hak-smart-filter/` (`core`, `browser.js`, `index.js`) | saoluucvhak-pixel/HAK_SMART_FILTER v1.0.0 | 5181681 |

Các file này được ghép vào giao diện khi chạy `npm run build:html`. Cập nhật bằng cách chép lại từ repository nguồn, không sửa trực tiếp ở đây.
Kiểm thử của thư viện nguồn được chạy lại ở `tests/vendor-smart-filter.test.js`.

| `hak-accounting-report-standard/` (`index.js`, `exact-format.js`) | saoluucvhak-pixel/HAK_ACCOUNTING_REPORT_STANDARD V1.0.0 | a5833a9 |

Chuẩn báo cáo chỉ dùng trong kiểm thử (`tests/report-standard.test.js`) để chứng minh định dạng số, căn lề và cấu trúc báo cáo HAKQN khớp chuẩn; không ghép vào giao diện.

Ghi chú: `ui/skins.css` (neutral, champagne) KHÔNG phải bản sao từ repository nguồn mà do HAKQN tự định nghĩa; classic là `:root` của `luxe.css` khi không đặt `data-skin`.
