# PROMPT BỔ SUNG — PR D: AN TOÀN BẢN NHÁP (cơ chế nháp của v3.3.0) VÀ THỬ VỚI DỮ LIỆU GOOGLE SHEETS THẬT

Lập đêm 23/11/2026 (giờ Việt Nam, UTC+7) bởi agent điều phối phiên trước. Tài liệu **bổ sung** cho `docs/BAN_GIAO_AGENT_TIEP_THEO_3.5_PHIEN2.md` và `docs/BAN_GIAO_AGENT_TIEP_THEO_3.5.md` (đọc cả hai trước: quy tắc cứng, cách chạy e2e, bẫy, quy trình gộp/phát hành đều nằm ở đó và **áp dụng nguyên cho việc này**). Tiếng Việt, giờ Việt Nam.
Kho: `saoluucvhak-pixel/HAK_APP_FSC`.

> **Prompt giao việc (dán cho agent mới):**
> "Đọc `docs/BAN_GIAO_AGENT_TIEP_THEO_3.5_PHIEN2.md`, `docs/BAN_GIAO_AGENT_TIEP_THEO_3.5.md` và `docs/BAN_GIAO_BO_SUNG_PR_D_AN_TOAN_BAN_NHAP.md` trên nhánh `wip/pr-a-chuc-vu-vi-tri` của kho saoluucvhak-pixel/HAK_APP_FSC. Việc này là **PR D** — làm SAU khi PR A đã mở và đang chờ CI/lệnh gộp (không chờ được thì làm song song nhưng nhánh riêng, tách từ `main`). Làm theo đúng thứ tự mục 5 của tài liệu này: kiểm hiện trạng, tách logic nháp thành hàm thuần, viết test mô hình ngẫu nhiên đỏ trước, sửa lỗi test tìm ra, rồi lưới an toàn, rồi danh sách kiểm với dữ liệu thật cho CHỦ. Tuân thủ mục 2. Báo cáo bằng tiếng Việt, nêu lệnh đã chạy và kết quả thật."

---

## 1. VÌ SAO CÓ VIỆC NÀY

Từ v3.3.0 (PR #86), nút **"Cập nhật vào hồ sơ"** ở màn Dữ liệu Google Sheets ghi **toàn bộ** (chủ rừng, lô, rừng, tọa độ, giấy tờ, ánh xạ biển số, phiếu cân, xe) vào **bản nháp**; chỉ khi bấm "Lưu dữ liệu vào lô" mới xuống đĩa (quyết định QĐ7 của CHỦ, 23/11/2026). Bản nháp hoạt động bằng cách **chặn ghi** ở cửa ghi chung `dbGhi()`:

- Dữ liệu nháp nằm trong `db` ở bộ nhớ như dữ liệu thật.
- `dbGhi()` bỏ phần "chưa lưu" khi ghi, dựa vào ảnh chụp bản đã lưu `savedSnap` và ba sổ: `loMoi` (lô mới), `chuNhap` (chủ rừng mới hoặc đang sửa nháp), `aliasNhap` (ánh xạ biển số mới/đổi).
- Mọi đường có thể sửa dữ liệu phải nhớ cập nhật đúng ba sổ này: lưu lô, lưu chủ rừng, xóa lô/rừng, áp hợp đồng, khôi phục, tự lưu tạm sau đóng đột ngột, đóng ứng dụng.

**Yếu điểm:** quên một đường là nháp rò xuống đĩa hoặc lô đã lưu bị bỏ nhầm. Bằng chứng: soát độc lập tìm **4 lỗi P1 + 3 lỗi P2** ở lần đầu (Lưu và đóng mất nháp lô khác; khôi phục bỏ lô mới của chủ rừng đã có; bản trình duyệt không chốt `savedSnap`; xóa lô/rừng không dọn sổ…), rồi **thêm 2 lỗi P2 do chính bản sửa gây ra** ở lần hai (hoàn sổ ghi đè mục mới; ánh xạ biển số của `lkApply`). Số lỗi giảm dần nhưng đó là hội tụ, không phải bằng chứng đúng. Cái thiếu là một cách kiểm **toàn diện**, không phải thêm người soát.

Hiện còn 3 điểm **chưa có test tái hiện chạy ra đỏ trước khi sửa**: nhánh `localStorage` (không có tiến trình chính; e2e chạy Electron nên không phủ), race giữa lần lưu hẹn giờ và lưu tay, ánh xạ biển số của `lkApply` (P2-2).

## 2. QUY TẮC CỨNG (kế thừa; nhắc các điều dễ vi phạm ở việc này)

1. **Không đổi hành vi nhìn thấy được của người dùng** (QĐ7, thêm xe theo ô tích mặc định tích, Lưu và đóng lưu mọi lô nháp…) trừ khi sửa một lỗi đã chứng minh bằng test đỏ. Tách mã thành hàm thuần phải cho **kết quả y hệt**; e2e `e2e-sheets-nhap-nhap`, `e2e-sheets-hop-dong`, `e2e-nhap-tam`, `e2e-luuvaolo`, `e2e-tusaoluu`, `e2e-kho-sao-luu`, `e2e-luudelta`, `e2e-chot-ho-so`, `e2e-bannhap`, `e2e-idtrung` phải giữ xanh **không sửa**.
2. **Không đổi lược đồ SQLite**, không đổi tên/giá trị trường lưu; **JSON, băm, delta của dữ liệu lô cũ phải y hệt**. Không đổi chữ/giá trị bản in (`so-ban-in` 206/206, mốc dựng cùng ngày).
3. **Không sửa test cũ cho xanh.** Test mới đỏ trước, sửa mã tối thiểu cho xanh.
4. Không dữ liệu thật trong mã, test, PR, log (CCCD dãy `0490000000xx`, tên có chữ "giả lập"). Chức năng báo cáo chất lượng Sheet (mục 4.3) **chỉ xuất số đếm**, tuyệt đối không xuất CCCD/tên/địa chỉ/số hợp đồng/số phiếu.
5. Không gộp, gắn thẻ, phát hành, xóa nhánh khi CHỦ chưa ra lệnh đúng bước. Mỗi việc một PR riêng vào `main`; chia commit nhỏ, xanh unit mỗi commit.
6. Sau khi sửa `ui/app/*.js` hoặc `src/*.js`: `env -u NODE_OPTIONS node scripts/build-html.js` và commit `renderer/index.html`. Commit kết thúc bằng hai dòng `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` và `Claude-Session: <đường dẫn phiên của bạn>`.
7. Đừng tin báo cáo của agent con; tự chạy lại unit, e2e, bản in. Không chạy hai Electron cùng lúc; đừng sửa mã trong thư mục đang chạy e2e.

## 3. BẢN ĐỒ MÃ CỦA CƠ CHẾ NHÁP (đã có trên `main` từ v3.3.0; tên hàm là thật, số dòng chỉ gần đúng — grep lại)

| Nơi | Vai trò |
|---|---|
| `ui/app/02-luu-tru-trang-thai.js` | Lõi: `savedSnap` (~66, 82, 196, 219, 239), `loMoi`/`chuNhap`/`aliasNhap` (~95), `dbGhi()` (~97), `nhapChotSo()` (~117), `chuChot(oid)` (~124), `nhapKhoiPhuc()` (~127) và `nhapChup()`, `aliasHoan(fid)` (~129), `loVeBanDaLuu(fid)` (~132), `persist()` (nhánh có HB và nhánh `localStorage` ~219), `saveOnce`, cổng kiểm thử `CONG_KT.nhapTest` (chỉ khi chạy không đóng gói với `--hakqn-test-hooks`) |
| `ui/app/11-d-luu-ban-nhap.js` | `stSave`, `stSaveAll` (lưu mọi lô nháp; dùng khi "Lưu và đóng"), `stDiscard`, `stDirtyList` |
| `ui/app/11-b-ban-nhap.js` | `luuLoTT` |
| `ui/app/17-h-hop-dong-cap-nhat.js` | `gsApply`: ghi vào nháp (chụp ảnh khôi phục trước khi ghi), `gsMoLo`, hộp xác nhận kèm ô "Thêm xe vào lô" |
| `ui/app/17-e-ghi-vao-ho-so.js` | `lkApply` (luồng cũ; vẫn lưu thẳng, nay phải gộp/xóa mục `aliasNhap` tương ứng) |
| `ui/app/14-thao-tac.js` | `delForest`, `delRs`, `saveInfo` (phải dọn/gộp ba sổ) |
| `ui/app/20-nhap-tu-danh-muc.js` | `nhapTamGhi`/`nhapTamKhoiPhuc`/`nhapTamXoa`: tự lưu tạm bản nháp vào `localStorage` và khôi phục sau mở lại |
| `ui/app/15-…js`, `ui/app/29-kho-sao-luu.js` | `dbThayToanBo`, khôi phục toàn bộ: xóa cả ba sổ |
| `src/main.js` | đóng cửa sổ khi còn nháp (`HAKQN_CLOSE=save|discard|back`), gọi `window.__stSaveAll`, hạn chờ `min(120000, 15000 + 10000·n)` ms, không đóng và không xóa bản tạm khi chưa lưu xong |
| `scripts/e2e-sheets-nhap-nhap.js` | e2e riêng của cơ chế nháp (Lưu và đóng, khôi phục lô mới của chủ rừng đã có, sửa tay chủ rừng, xóa lô nháp…) |

**Bất biến cần giữ (dùng làm đặc tả cho test mô hình):**
- **I1.** Cái ghi xuống đĩa = bản đã lưu + đúng những gì người dùng đã bấm lưu (lô nào bấm lưu thì lô đó; chủ rừng mới đi cùng lô đầu tiên được lưu; chủ rừng đã có mà sửa nháp thì xuống đĩa cùng lần lưu lô liên quan đầu tiên).
- **I2.** "Bỏ thay đổi" đưa phần liên quan về **đúng** bản đã lưu (lô mới bị xóa hẳn; chủ rừng mới bị xóa nếu hết lô; thông tin chủ rừng/ánh xạ trả về bản đã lưu).
- **I3.** Khôi phục sau đóng đột ngột dựng lại **đúng** bản nháp, không tạo trùng, không ghi đè dữ liệu đã lưu; lô chốt/dừng không bao giờ bị ghi.
- **I4.** Lô/chủ rừng/ánh xạ đã lưu **không bao giờ** bị `dbGhi` bỏ ra khỏi bản ghi.
- **I5.** Lỗi giữa chừng (lưu lỗi) hoàn đúng phần đã bỏ, **không xóa** mục mới thêm trong lúc chờ.
- **I6.** Dữ liệu lô cũ chưa dùng tính năng nháp: JSON/băm/delta y hệt trước.

## 4. NHIỆM VỤ

### 4.1 Bước 1 — tách logic nháp thành hàm thuần + test mô hình ngẫu nhiên (**việc chính, làm trước**)
1. Rút phần quyết định "ghi gì xuống đĩa" và "hoàn gì khi bỏ/lỗi" thành module thuần, ví dụ `src/nhap.js` (nhúng vào renderer bằng cơ chế `/*@@SRC:nhap@@*/` trong `ui/app.src.html` như `doiso`/`phanbophieu`; nhớ build). Hàm nhận trạng thái tường minh (`db`, `savedSnap`, `loDirty`, ba sổ) và **trả** bản sẽ ghi / bản đã hoàn; **không đọc biến toàn cục**. Lớp giao diện ở `02-…js` chỉ còn là lớp nối mỏng gọi hàm thuần.
2. Viết `tests/nhap-mo-hinh.test.js`: **test mô hình** (model-based/property-based, tự viết bộ sinh ngẫu nhiên có hạt giống cố định in ra khi đỏ để tái hiện; không thêm thư viện ngoài, hoặc nếu muốn dùng thư viện thì phải xin phép CHỦ và chạy offline). Sinh chuỗi 20–60 thao tác ngẫu nhiên: áp hợp đồng (lô mới / lô đã có / chủ rừng mới / chủ rừng đã có / ánh xạ biển số mới), lưu lô A/B/C, bỏ thay đổi, xóa lô, xóa rừng, sửa tay chủ rừng, lưu lỗi (chèn lỗi giả), `lkApply` luồng cũ, "đóng đột ngột + khôi phục", khôi phục toàn bộ, lô chốt. Chạy song song với **mô hình tham chiếu rất đơn giản** (hai bản: "đã lưu" và "nháp", không ba sổ) và kiểm I1–I6 sau **mỗi** thao tác. Chạy ≥ 5.000 chuỗi trong vài giây; seed cố định trong CI.
3. **Đỏ trước:** chạy test trên mã hiện tại (sau khi tách thuần y hệt hành vi). Mọi vi phạm bất biến là lỗi thật hoặc lỗi mô hình — phân loại từng cái: lỗi mã → sửa mã tối thiểu (commit riêng kèm test cố định tái hiện từ seed); mô hình sai → sửa mô hình và ghi lý do. **Đặc biệt kiểm 3 điểm chưa có test tái hiện:** nhánh `localStorage`, race lưu hẹn giờ × lưu tay (mô phỏng bằng hai bước lưu xen kẽ có chèn lỗi), ánh xạ biển số `lkApply`.
4. e2e liệt kê ở mục 2.1 vẫn xanh nguyên. `node scripts/test.js` xanh; `so-ban-in` 206/206.

### 4.2 Bước 2 — lưới an toàn cho người dùng (PR D, cùng nhánh hoặc commit sau)
1. **Sao lưu tự động ngay trước lần "Lưu dữ liệu vào lô" đầu tiên có sinh từ Cập nhật Sheets** (nếu ứng dụng chưa làm; kiểm cơ chế sao lưu hiện có `truoc-…` trước, tái dùng, không tạo cơ chế mới). Sai thì khôi phục được.
2. **Hiện rõ trạng thái nháp:** thanh trạng thái/"Chưa lưu" nêu *"Chưa lưu: N lô, X chủ rừng mới, Y ánh xạ biển số"* (kiểm thanh hiện có `stDirtyList` trước, mở rộng chữ, không thêm màn mới).
3. **Hộp thoại khi đóng còn nháp:** liệt kê **cụ thể** những gì sẽ lưu hay mất (tên lô, chủ rừng mới, số phiếu mới), không chỉ hỏi chung. Giữ nguyên ba lựa chọn Lưu và đóng / Bỏ thay đổi và đóng / Quay lại chỉnh sửa. e2e chạy với `HAKQN_CLOSE` không bị ảnh hưởng.
4. Mỗi mục kèm e2e (thêm vào `scripts/e2e-sheets-nhap-nhap.js` hoặc bộ mới đăng ký trong `SUITES` của `scripts/e2e-all.js`) và không sửa e2e cũ.

### 4.3 Bước 3 — báo cáo chất lượng Google Sheet, **chỉ số đếm** (cần CHỦ đồng ý trước khi làm; hỏi CHỦ ở đầu việc)
Chức năng **chỉ đọc** ở màn Dữ liệu Google Sheets (hoặc Cài đặt → Google Sheets): bấm một nút, hiện và cho sao chép/xuất **bảng số đếm không chứa thông tin cá nhân**, để CHỦ gửi lại cho agent biết dữ liệu thật khác dữ liệu giả lập ở đâu: số hợp đồng; số hợp đồng theo trạng thái Đủ / Cần xem / Lỗi dữ liệu; số hợp đồng nhiều CCCD; số rừng; số rừng thiếu mã rừng; số rừng ghép tạm; số phiếu; số phiếu ngày không đọc được; số phiếu thiếu biển số; số phiếu nghi đổi số; số cặp trùng khóa; thời gian tổng hợp (ms); số dòng mỗi tab. **Tuyệt đối không xuất** CCCD, họ tên, địa chỉ, số hợp đồng, số phiếu, biển số, mã rừng, địa chỉ Sheet, khóa. Có test đơn vị kiểm bảng xuất không chứa chuỗi giả lập đã đưa vào (CCCD `0490000000xx`, tên "giả lập", mã hợp đồng) — **đây là test bảo mật bắt buộc**. Hàm thuần ở `src/` (dùng `lookup.js` hiện có, cùng cách tính `summaryHd`), IPC mới chỉ nhận không tham số hoặc tham số kiểm kiểu chặt, và qua cơ chế `wrap()` hiện có.

### 4.4 Bước 4 — danh sách kiểm với dữ liệu thật cho CHỦ (viết thành tài liệu `docs/KIEM_TAY_BAN_NHAP_DU_LIEU_THAT.md`)
Agent **không** xem được dữ liệu thật và **không** nên xin. Viết tài liệu để CHỦ tự làm, từng thao tác cụ thể, trên **bản sao**:
1. Sao lưu rồi khôi phục vào một thư mục dữ liệu riêng (ứng dụng cho đổi thư mục dữ liệu); **không dùng dữ liệu đang chạy**.
2. Đọc Google Sheet thật (chỉ đọc) trên bản sao; bấm báo cáo chất lượng (4.3), chụp màn hoặc gửi lại các con số.
3. Các ca bắt buộc: hợp đồng 1 rừng; hợp đồng nhiều rừng; mã hợp đồng nhiều CCCD (hộp 2 bước); nghi đổi số; hợp đồng thiếu mã rừng (gõ tay mã); xe chưa có trong danh sách (ô "Thêm xe vào lô"); chủ rừng đã có và chủ rừng mới.
4. **Ca đóng giữa chừng (quan trọng nhất):** áp hợp đồng rồi (a) "Lưu và đóng", (b) "Bỏ thay đổi và đóng", (c) tắt tiến trình đột ngột (Quản lý tác vụ → Kết thúc), mở lại: kiểm bản nháp khôi phục đúng, không có chủ rừng/lô trùng, dữ liệu đã lưu trước đó nguyên.
5. Kiểm quy mô: hợp đồng nhiều trăm phiếu thao tác được; bảng toàn bộ hợp đồng mở ≤ ~2 giây; màn 150%.
6. Cách báo lỗi: ảnh chụp màn, các bước, số đếm của báo cáo chất lượng (không gửi CCCD/tên thật).

## 5. THỨ TỰ LÀM
1. Kiểm hiện trạng (mục 4 của bản PHIEN2; nhánh làm việc mới từ `main` mới nhất, tên rõ như `pr-d-an-toan-ban-nhap`). Dựng lại mốc bản in cùng ngày. Xác nhận mã cơ chế nháp trên `main` còn đúng như mục 3.
2. Bước 1 (tách thuần; commit riêng "refactor không đổi hành vi" xanh e2e liệt kê) → test mô hình đỏ → sửa lỗi → xanh.
3. Cho một agent khác **soát độc lập (chỉ đọc)** toàn diff (trọng tâm: hàm thuần có đúng I1–I6; lớp nối có bỏ sót đường ghi nào; hành vi nhìn thấy được có đổi không).
4. Chạy toàn bộ e2e ở 1024×768 + `e2e-cai-de` với mã v1.4.33; unit; `so-ban-in` 206/206; mở PR; CI Windows xanh; **hỏi CHỦ** trước khi gộp.
5. Bước 2 (lưới an toàn) và Bước 3 (báo cáo chất lượng, sau khi CHỦ đồng ý) có thể tách thành PR riêng để PR sửa lõi nhỏ và dễ soát. Bước 4 (tài liệu) đi cùng PR nào cũng được.
6. Phát hành: gộp vào kế hoạch 3.5.0 hoặc bản vá 3.5.1 **theo lệnh CHỦ**; không tự quyết.

## 6. ĐIỀU KIỆN HOÀN THÀNH
- Test mô hình ngẫu nhiên chạy ≥ 5.000 chuỗi, 0 vi phạm I1–I6; mọi lỗi tìm ra có test cố định (seed) tái hiện đỏ→xanh.
- Unit 0 lỗi; bản in 206/206; toàn bộ e2e xanh (kể cả cai-de); CI Windows xanh; không sửa e2e cũ; JSON/băm/delta lô cũ y hệt.
- Có soát độc lập (chỉ đọc) không còn P0/P1.
- Báo cáo chất lượng Sheet (nếu CHỦ đồng ý) có test bảo mật không rò dữ liệu cá nhân.
- Tài liệu kiểm tay với dữ liệu thật giao cho CHỦ.
- Mô tả PR nêu thật đã/chưa kiểm; không gộp khi CHỦ chưa ra lệnh.

## 7. Ý TƯỞNG DÀI HẠN (CHƯA LÀM; chỉ làm khi CHỦ ra lệnh)
Chuyển sang thiết kế **lớp phủ (copy-on-write)**: nháp là một bản sao riêng của phần đang sửa, chỉ gộp vào `db` khi bấm Lưu. Tách nháp khỏi đĩa **theo cấu trúc** thay vì theo thao tác nên không còn loại lỗi "quên một đường". Sửa lớn, chạm nhiều màn; chỉ cân nhắc cho bản 3.6 nếu Bước 1 vẫn tìm ra lỗi lõi liên tục.
