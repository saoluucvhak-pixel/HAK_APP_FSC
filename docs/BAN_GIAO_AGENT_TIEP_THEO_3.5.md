# BÀN GIAO CHO AGENT TIẾP NHẬN — HOÀN TẤT PR A, LÀM PR C, PR B, BƯỚC 3, RỒI PHÁT HÀNH 3.5.0

Lập tối 23/11/2026 (giờ Việt Nam, UTC+7). Mọi trao đổi, tài liệu, commit viết **tiếng Việt**, mốc thời gian theo **giờ Việt Nam**.
Kho: `saoluucvhak-pixel/HAK_APP_FSC` (Electron + better-sqlite3, ứng dụng HAKQN Desktop, hồ sơ khai thác và vận chuyển gỗ keo).

> **Prompt giao việc (dán cho agent mới):**
> "Đọc toàn bộ `docs/BAN_GIAO_AGENT_TIEP_THEO_3.5.md` trên nhánh `wip/pr-a-chuc-vu-vi-tri` của kho saoluucvhak-pixel/HAK_APP_FSC, rồi làm theo đúng thứ tự ở mục 4. Bắt đầu bằng mục 5 (kiểm hiện trạng, KHÔNG tin báo cáo cũ). Tuân thủ tuyệt đối mục 1 (quy tắc cứng) và mục 6 (xin phép trước khi gộp, gắn thẻ, phát hành). Báo cáo cho tôi bằng tiếng Việt, nêu lệnh đã chạy và kết quả thật."

---

## 1. QUY TẮC CỨNG (không có ngoại lệ)

1. **Không** gộp PR, gắn thẻ (tag), tạo Release, chạy workflow phát hành, xóa nhánh, hoặc đẩy lên `main` khi chưa có lệnh rõ của CHỦ cho đúng bước đó. Lệnh "tiếp tục" chung chung KHÔNG phải lệnh gộp/phát hành. Mọi thay đổi vào `main` đi qua PR.
2. **Không sửa kiểm thử để cho qua.** Không xóa, vô hiệu hóa, nới điều kiện kiểm. **Ngoại lệ duy nhất:** khi CHỦ đã quyết đổi hành vi giao diện (mục 3), được đổi *thao tác/chữ chọn* trong e2e cũ cho khớp, điều kiện kiểm kết quả giữ tương đương, và liệt kê từng dòng đã đổi trong PR.
3. **Không đổi lược đồ SQLite.** Trường mới chỉ là trường **tùy chọn, chỉ ghi khi khác rỗng**, để bản ghi/lô cũ cho JSON, băm, delta **y hệt** (cách đã làm với `taiXeId` của xe, `nhiemVu`/`ghiChu` của vị trí).
4. **Bảo toàn bản in:** `node scripts/so-ban-in.js --so a.json b.json` phải ra `Tài liệu: 206 · giống từng byte: 206 · khác: 0`. Không đổi chữ trong bản in `.docx` (ví dụ câu "Đơn giá khoán theo vai trò" trong `src/noidunghopdong.js`). Không đổi giá trị đã lưu hay tên trường lưu (`vaiTro`, `chucDanh`, `viTriId`…).
5. Sau khi sửa `ui/app/*.js`, `ui/app.src.html`, `ui/vendor/**` **hoặc `src/*.js`** (được nhúng vào renderer) phải chạy `env -u NODE_OPTIONS node scripts/build-html.js` và commit `renderer/index.html`. Có xung đột ở `renderer/index.html`: chạy lại build, không sửa tay.
6. Không dữ liệu thật (CCCD, họ tên, địa chỉ, khóa) trong mã, test, PR, log. Dữ liệu thử dùng CCCD dãy `0490000000xx`, tên giả lập.
7. Commit kết thúc bằng hai dòng:
   `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` và `Claude-Session: <đường dẫn phiên của bạn>`. Mô tả PR kết thúc bằng `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
8. Nói "đã chạy/đã đạt" chỉ khi đã chạy; mọi kết luận kèm lệnh và số liệu thật.

## 2. TRẠNG THÁI HIỆN TẠI (đã kiểm tối 23/11/2026; đọc lại `git log` để xác nhận)

**Đã phát hành:** v3.4.0 (thẻ `v3.4.0`, `HAKQN-HoSoKhaiThac-Setup-3.4.0.exe`, SHA-256 `CFBB559D610C07B3DE7E6C7D6EEBDFF9A43B041523D333DB90E6209469A331B4`).

**`main` = `4bf41d7`** (đã gộp PR #87 = v3.4.0 và PR #88). **PR #88 đã gộp vào `main` nhưng CHƯA phát hành** (CI Windows lần chạy #231 xanh). Nội dung #88: Danh mục đối tượng một lớp (nút **+ Thêm cá nhân**, **+ Thêm doanh nghiệp**), Smart Filter cho Danh mục/Vị trí/Phân bổ (FLT-01, 02, 03, 04, 05), UI-05, DATA-02 (`-0`), DATA-04 (`mstTuSo`), BK-01 (sao lưu chép sang ổ thứ hai), BK-04 (cảnh báo dung lượng < 500 MB). Số phiên bản trong `package.json` vẫn **3.4.0**; phát hành kế tiếp đề nghị **3.5.0** (xem mục 6).

**Nhánh dở dang `wip/pr-a-chuc-vu-vi-tri`** (xếp trên `main` `4bf41d7`, **chưa có PR**), 5 commit:

| Commit | Nội dung | Mức xác minh |
|---|---|---|
| `eb02f74` | Thống nhất thuật ngữ: "Vai trò" → **Chức vụ**, cột "Chức danh" của dòng nhân công → **Vị trí**; mẫu Excel mới ghi `Chức vụ`/`Vị trí` nhưng **vẫn đọc tiêu đề cũ** `Vai trò`/`Chức danh`; xóa mã chết `benNhanKhoanTT` (cảnh báo "bên nhận khoán phải là Tổ trưởng") | Unit xanh, 13 kiểm tra e2e mới xanh, nhiều e2e liên quan xanh |
| `44e9cd4` | Danh mục **Vị trí** chi tiết: thêm `nhiemVu`, `ghiChu` (tùy chọn); xóa vị trí đang dùng → "Ngừng sử dụng", chưa dùng → xóa hẳn; gieo sẵn khi danh mục trống | Unit xanh, e2e xanh |
| `0baac0a` | (commit "wip") Định mức: ô vị trí chọn từ danh mục + tự điền Nhiệm vụ; tiêu đề **"1 đội = N người" tính lại khi gõ**; **Định mức chia 4 tab** (BHLĐ, Gỗ keo, Nhân công, Thời gian) | Sau gộp: 17 bộ e2e liên quan **xanh**; chưa chạy đủ 137 bộ |
| `a54e2e3` | Dựng lại `renderer/index.html` | |
| `72bd938` | Sửa `e2e-tgkhai` (mở đúng tab Gỗ keo trước khi điền form) | e2e-tgkhai 28 đạt |

**Kết quả đã chạy trên nhánh này (trước commit `72bd938`):** unit 850/852 (0 lỗi, 2 bỏ qua); so bản in **206/206**; e2e: 17 bộ liên quan 16/17 đạt lúc đầu, bộ còn lại (`e2e-tgkhai`) đã sửa và đạt. **CHƯA chạy toàn bộ e2e (≈137 bộ)** và **CHƯA có CI Windows** cho nhánh này.

Lưu ý bẫy: các nhánh `worktree-agent-*` cục bộ (nếu còn) là bản làm việc của agent trước, **không đẩy lên GitHub**; mọi thứ đáng giữ đã nằm trong `wip/pr-a-chuc-vu-vi-tri`.

## 3. QUYẾT ĐỊNH ĐÃ CHỐT CỦA CHỦ (không bàn lại)

1. **Thể nhân là MỘT người.** Form cá nhân một lớp; dữ liệu lưu giữ cấu trúc cũ (`loai:'thenhan'` + một người). Thể nhân cũ có nhiều hơn một người vẫn hiện đủ bảng con, **không xóa/gộp ai**.
2. **Ký hợp đồng khoán nhân công: AI ký cũng được, không nhất thiết Tổ trưởng.** Ô "Bên nhận khoán" nhận mọi đối tượng có quyền ký Nhân công (đã đúng trong mã). Ký với đội trực tiếp thì **in hồ sơ cả đội**, nên không cần xử lý Tổ trưởng cho trường hợp này: **bỏ DATA-06**.
3. **Ba danh mục chi tiết cho thêm / sửa / xóa / lưu được; ví dụ chỉ là gieo sẵn:**
   - **Chức vụ**: Chủ xe, Tổ trưởng, Công nhân, Tài xế, Khác. Một người có thể nhiều chức vụ.
   - **Vị trí**: Công nhân cưa, Công nhân lột vỏ và bốc xếp, **Quản lý chung**, Khác. Danh mục chi tiết như định mức: **Vị trí | Nhiệm vụ | Ghi chú**. **Tài xế cũng có vị trí** (tùy bạn thêm vào danh mục). Định mức BHLĐ và Định mức nhân công thêm dòng mới thì **chọn vị trí từ danh mục** và tự điền nhiệm vụ.
   - **Ngành nghề**: Vận chuyển, Khai thác gỗ keo. Cá nhân: **suy ra từ chức vụ** (Công nhân/Tổ trưởng → Khai thác gỗ keo; Tài xế/Chủ xe → Vận chuyển); chức vụ **Khác**: bắt chọn ngành. **Doanh nghiệp: chọn tay, được chọn cả hai ngành.**
4. **Doanh nghiệp**: thêm doanh nghiệp thì điền thông tin công ty + ngành nghề. **Cá nhân**: điền thông tin cá nhân; công nhân thêm vị trí, chức vụ; tài xế thêm giấy phép lái xe; chủ xe nhập CCCD như công nhân.
5. **Ký hợp đồng chọn từ danh mục, lọc theo ngành** (xem sơ đồ: https://claude.ai/artifact/E4ViCDWt4K5DAEKQV83aLX — trang riêng tư của CHỦ):
   - Hợp đồng nhân công: Bên nhận khoán = doanh nghiệp (ngành Khai thác) hoặc cá nhân (ngành Khai thác, hiện chức vụ). Đội nhân công (bảng chi tiết): thêm công nhân từ cá nhân ngành Khai thác, hiện chức vụ và vị trí.
   - Hợp đồng vận chuyển: Bên vận chuyển = doanh nghiệp (ngành Vận chuyển) hoặc cá nhân (ngành Vận chuyển). Đội xe: thêm xe từ Danh mục xe (tự điền chủ xe và tài xế thường chạy); tài xế chọn từ cá nhân chức vụ Tài xế, hiện GPLX, vị trí.
6. **Màn Cài đặt chia tab** (xem mục 4, PR C): tab **"Hiển thị" gộp** Hiển thị số và Giao diện.
7. Mục đang dùng thì **không xóa hẳn**, chuyển "Ngừng sử dụng" (đã đề xuất; CHỦ chưa phản đối): tên vị trí là khóa của định biên, định mức, đơn giá.
8. **DATA-01** (đọc số tiền bằng chữ): giữ nguyên. **Chưa làm có chủ ý:** BK-03 (nén `.json.gz`), UI-06 (ModalStackManager).

## 4. VIỆC CÒN LẠI, THEO THỨ TỰ

### 4.1 PR A — hoàn tất rồi mở PR (nhánh `wip/pr-a-chuc-vu-vi-tri`)
1. Kiểm hiện trạng (mục 5), **chạy toàn bộ e2e** ở 1024×768 và `e2e-cai-de` với mã v1.4.33.
2. Việc còn dở / cần xử lý trước khi mở PR:
   - **Chữ cũ ngoài phạm vi chưa đổi:** `ui/reports.js` (~dòng 278, 403, 471: cột "Vai trò"/"Chức danh" của báo cáo Danh sách lao động); `ui/app/13-quy-trinh-ho-so.js:164` (nhãn "đơn giá khoán theo vai trò", giống chữ in nên cân nhắc giữ); `ui/app.src.html:362`, `docs/HUONG_DAN.md` (một vài chỗ "chức danh" nghĩa vị trí); comment mã `kiemtranhieudoi.js:211,319`. **Không** đổi `ui/app/08-in-ho-so-dot-2.js:155` ("Chức danh" bảng in) và mọi chữ in `.docx`.
   - **`src/goidm.js` chưa biết `nhiemVu`/`ghiChu` của vị trí:** gộp gói danh mục giữa các máy có thể mất hai trường này. Thêm mang theo (tùy chọn, ghi khi khác rỗng) + test.
   - **Định mức, nhược điểm đã biết:** sau mỗi lưu, màn vẽ lại cả 4 form nên chữ đang gõ dở ở tab khác mất; hành vi "gieo sẵn" (`gieoSan`) chỉ chạy khi `dmViTri` rỗng và gọi từ `panelSetVt` (không nằm trong `dung()` vì làm hỏng `tests/store.test.js`): cài mới thấy 4 vị trí gieo + 2 vị trí mặc định của định biên.
   - **Danh mục Vị trí:** gõ vào ô tìm Smart Filter vẽ lại màn nên tên đang sửa dở trong bảng bị mất (hạn chế của cơ chế vẽ chung).
   - **Tiêu đề `b_cd` "datalist" và tự điền Nhiệm vụ:** kiểm tay một lượt (agent trước chỉ có e2e).
3. Mở PR vào `main` (tiêu đề tiếng Việt, bảng việc đã làm/đã kiểm/chưa kiểm, danh sách từng dòng e2e đã đổi). Đăng ký theo dõi PR; **chỉ gộp khi CHỦ ra lệnh**.

### 4.2 PR C — màn Cài đặt chia tab (làm sau khi PR A đã gộp; cùng chạm `ui/app/15-du-lieu-cai-dat-sao-luu-lo.js` và `ui/app/29-kho-sao-luu.js`)
Hiện Cài đặt là menu dọc bên trái 7 mục (`SET_TABS`), mục "Sao lưu và khôi phục" dài ≈ 1319 px xếp chồng 7 khối. Làm theo CHỦ: **tab ngang cùng kiểu Danh mục** (`hak-catalog-tabs`):
- **Dữ liệu** (mục "Hệ thống" cũ: cơ sở dữ liệu đang dùng, thư mục dữ liệu).
- **Sao lưu và khôi phục**, chia 3 tab con: *Thao tác* (nút sao lưu/khôi phục, tình trạng, nhắc sao lưu, cảnh báo dung lượng) · *Thư mục và lịch* (SQLite, thư mục thứ hai, JSON, chu kỳ, số bản giữ) · *Các bản sao lưu* (danh sách).
- **Google Sheets**; **Hiển thị** (gộp Hiển thị số và Giao diện); **Hướng dẫn**; **Cần đối chiếu**.
Giữ id và chức năng; thư mục cấu hình trùng ở hai nơi chỉ còn một. e2e liên quan: `e2e-saoluu2`, `e2e-kho-sao-luu`, `e2e-caidat`, `e2e-dulieu`, `e2e-tusaoluu`, `e2e-skins`… (grep `setTab_`, `#navSet`). Chỉ đổi thao tác mở tab. Nếu phải đổi hơn ~8 bộ: dừng và báo CHỦ.

### 4.3 PR B — danh mục Ngành nghề và Chức vụ, lọc trong hợp đồng
- Hai danh mục mới (**thêm/sửa/xóa/lưu**, mục đang dùng → "Ngừng sử dụng"): Ngành nghề, Chức vụ. Gieo sẵn theo mục 3. Lưu trong `db` dưới dạng danh mục JSON (như `dmViTri`), trường tùy chọn.
- Doanh nghiệp: thêm trường **ngành nghề** (một hoặc cả hai). Cá nhân: chức vụ (nhiều lựa chọn; hiện là ba ô tích `vaiTro.{nhanCong,taiXe,chuXe}` ở `src/doituong.js`) mở rộng thêm **Tổ trưởng** và **Khác**; ngành suy ra từ chức vụ. **Lưu ý:** "Tổ trưởng" trong lô là chữ ở cột **Chức vụ (cũ "Vai trò")** của dòng nhân công (`isTT = /^tổ trưởng/i.test(r.vaiTro)` ở `src/model.js:20`), không phải cờ trong danh mục; chức vụ trong danh mục chỉ là **giá trị mặc định** khi đưa người vào đội. Đừng đổi cách lô nhận biết Tổ trưởng.
- Bản ghi/đối tượng cũ chưa có ngành: **suy ra từ vai trò hiện có** (Nhân công → Khai thác; Tài xế, Chủ xe → Vận chuyển); không bắt nhập lại; JSON cũ giữ y hệt.
- Lọc theo ngành ở các ô chọn: Bên nhận khoán (`ui/app/31-hop-dong.js` `benNhanKhoanHtml`), chọn nhân công vào đội (`ui/app/20-nhap-tu-danh-muc.js`), Bên vận chuyển, chọn tài xế (`chonTaiXeHtml`). Hiện chức vụ và vị trí cạnh tên.
- Làm trước một **bản thiết kế ngắn + test đỏ trước**; việc này chạm màn hợp đồng và nhiều e2e, nên chia nhiều commit nhỏ.

### 4.4 Bước 3 — hộp thoại trong app thay `confirm()` khi thêm người/xe mới vào danh mục (PR riêng)
- Bản vá làm sẵn: `docs/ban-giao/buoc3-hop-them-danh-muc.patch` (206 dòng: `ui/app/20-nhap-tu-danh-muc.js` mở hộp trong `#dlgBox` liệt kê từng người/xe có ô tích, nút "Thêm vào danh mục (N)" và "Chỉ lưu trong lô", Esc = chỉ lưu; xử lý ở `ui/app/18-su-kien.js`; đổi một dòng ở `tests/danh-muc-chong-trung.test.js`; bộ e2e mới `e2e-hop-them-danh-muc`). Áp bằng `git apply --3way` rồi build; **mã nguồn hiện đã đổi nhiều so với lúc tạo vá, kiểm kỹ.**
- **Rủi ro lớn:** luồng `confirm()` đi qua **ít nhất 11 bộ e2e** (đã quét 28/50): `e2e-bienso`, `e2e-danhmuc-hopdong`, `e2e-dm-tu-lo`, `e2e-doikt`, `e2e-excel-bangcon`, `e2e-export`, `e2e-hopdong`, `e2e-luongpc`, `e2e-luuvaolo`, `e2e-mamau`, `e2e-mau`, và còn khoảng 22 bộ chưa quét (từ `e2e-motcachluu` trở đi). Hầu hết dùng `w.on('dialog', d => d.accept())`, tức lâu nay tự "đồng ý thêm vào danh mục"; hộp mới là lớp phủ (#dlgBox z-index 70) chặn chuột và **không còn tự thêm vào danh mục**. Cách sửa gọn: thêm vào `scripts/lib-stage.js` hàm `saveStage` bước "nếu thấy `#dmHopDlg` thì bấm `[data-act=dmHopThem]`"; các bộ bấm `stSave` trực tiếp phải sửa riêng. Đây là việc đổi hành vi theo quyết định của CHỦ nên được phép đổi thao tác e2e (liệt kê từng dòng).
- Hạn chế cần giải quyết: hộp bất đồng bộ làm đảo thứ tự thông báo (`dmGhiTuLo` buộc trả `null` ngay; người gọi ở `ui/app/11-d-luu-ban-nhap.js`).

### 4.5 Việc hoãn có chủ ý (đừng làm khi chưa có lệnh CHỦ)
BK-03 (nén `.json.gz`: đổi định dạng sao lưu, rủi ro tương thích khôi phục), UI-06 (ModalStackManager: sửa lớn, dễ làm đỏ nhiều e2e), UI-07 (nút thu gọn khung danh sách), DATA-01 (số tiền bằng chữ: cách đọc hiện tại đúng, đổi làm đổi bản in), DATA-06 (đã **bỏ**, CHỦ nói in cả đội nên không ảnh hưởng; ghi chú: chỉ nới `teamErrors` mà không sửa `kiemtranhieudoi.js:100`/`doiTuongMinh` thì đội không có Tổ trưởng mất hồ sơ mà không báo lỗi).

## 5. KIỂM HIỆN TRẠNG TRƯỚC KHI LÀM (làm ngay đầu phiên)

```bash
git fetch origin
git log --oneline -8 origin/main                 # kỳ vọng đầu: 4bf41d7 (#88)
git checkout -B wip/pr-a-chuc-vu-vi-tri origin/wip/pr-a-chuc-vu-vi-tri
npm ci --ignore-scripts && node node_modules/electron/install.js
env -u NODE_OPTIONS node scripts/build-html.js && git status --short   # kỳ vọng sạch
env -u NODE_OPTIONS node scripts/test.js         # kỳ vọng ≈ 850/852, 0 lỗi, 2 bỏ qua
```

**Dựng mốc bản in (a.json):** mã v3.3.0 (`6eb81ad`), cùng bộ lô thử:
```bash
git worktree add /tmp/goc 6eb81ad && ln -s "$PWD/node_modules" /tmp/goc/node_modules
env -u NODE_OPTIONS xvfb-run -a node scripts/so-ban-in.js --root /tmp/goc --out /tmp/a.json     # "Đã ghi 206 tài liệu"
env -u NODE_OPTIONS xvfb-run -a node scripts/so-ban-in.js --root . --out /tmp/b.json
node scripts/so-ban-in.js --so /tmp/a.json /tmp/b.json   # kỳ vọng: 206 · giống từng byte: 206 · khác: 0
```

**e2e (luôn ở 1024×768, mỗi lần MỘT Electron):**
```bash
flock -w 900 /tmp/hak-e2e.lock env -u NODE_OPTIONS HAKQN_CLOSE=discard xvfb-run -a -s "-screen 0 1024x768x24" \
  node scripts/e2e-all.js <tên-bộ ...> --out <thư-mục>        # không có tên: chạy cả ≈137 bộ, ≈ 30 phút
# bộ nâng cấp từ v1.4.33 cần mã nguồn cũ:
git worktree add /tmp/v1433 v1.4.33 && (cd /tmp/v1433 && npm ci --ignore-scripts && node node_modules/electron/install.js && npm run postinstall && npm run build:html)
HAKQN_ROOT_CU=/tmp/v1433 env -u NODE_OPTIONS HAKQN_CLOSE=discard xvfb-run -a -s "-screen 0 1024x768x24" node scripts/e2e-all.js cai-de --no-skip --out <thư-mục>
```

## 6. QUY TRÌNH GỘP VÀ PHÁT HÀNH (chỉ khi CHỦ ra lệnh từng bước)

1. PR xanh CI Windows (lần chạy `build-windows.yml`, ≈ 30 phút; commit mới đẩy lên làm lần chạy cũ bị hủy).
2. **Hỏi CHỦ**: gộp? (merge commit như các PR trước) — chờ lệnh.
3. Phát hành **3.5.0** gộp #88 + PR A (+ PR C nếu xong): trên nhánh PR nâng `package.json` và `package-lock.json` (`npm version 3.5.0 --no-git-tag-version`), thêm mục đầu `CHANGELOG.md` (`## 3.5.0 — …`), tạo `docs/GHI_CHU_PHAT_HANH_3.5.0.md` theo mẫu `docs/GHI_CHU_PHAT_HANH_3.4.0.md` (có `HAKQN Desktop 3.5.0`, tên bộ cài, nhắc `v2.2.0`) — bài `tests/phien-ban.test.js` bắt buộc đồng bộ; CI xanh lại; **hỏi CHỦ** rồi gộp; sau đó **hỏi CHỦ** rồi chạy workflow phát hành: Actions → "Build Windows installer" → `workflow_dispatch` trên `main` với `release_tag=v3.5.0`. Workflow tự tạo Release kèm `.exe`, `BUILD_INFO.txt` (commit, kích thước, SHA-256); đối chiếu commit và SHA-256 rồi báo CHỦ.
4. Bộ cài **chưa ký số** (SmartScreen: More info → Run anyway).

## 7. CÁCH LÀM ĐÃ CHẠY TỐT (và các bẫy đã gặp)

**Cách làm:** chia việc cho agent chuyên biệt trong worktree riêng (`isolation: worktree`), mỗi agent một vai (coder + tester: test **đỏ trước**, sửa tối thiểu cho xanh; reviewer: soát độc lập, chỉ đọc), phạm vi tệp độc quyền, không chồng nhau; một agent soát độc lập trên toàn diff trước khi mở PR (lần vừa rồi tìm ra 2 lỗi P2 thật: mất dấu cách khi gõ tìm nhanh sau debounce, và báo giả "còn thay đổi chưa lưu"). **Đừng tin báo cáo agent**: tự chạy lại unit, e2e, bản in trước khi cam kết.

**Bẫy:**
- **Khóa e2e `/tmp/hak-e2e.lock` bị tiến trình `Xvfb` thừa giữ** (thừa hưởng descriptor của `flock`): triệu chứng `flock` treo hàng chục phút. Kiểm `fuser -v /tmp/hak-e2e.lock`; chỉ kill `Xvfb` thừa khi chắc không còn e2e nào chạy.
- `flock -w 600 env -u ...` viết **thiếu đường dẫn khóa** sẽ tạo tệp rỗng tên `env` ở thư mục hiện tại (và làm hook "tệp chưa theo dõi" báo). Luôn `flock -w N /tmp/hak-e2e.lock env -u NODE_OPTIONS ...`.
- Hook cuối lượt báo "có tệp chưa theo dõi": thư mục `.claude/worktrees/` là của agent; loại bằng `echo ".claude/worktrees/" >> .git/info/exclude` (chỉ máy này), **không** commit nó.
- Agent tạo worktree tách từ `main`, không phải nhánh hiện tại: tự kiểm `git log` và đưa nhánh về đúng nền trước khi làm.
- `git checkout -- <tệp>` trên thay đổi chưa commit bị chặn (nguy hiểm); dùng bản sao lưu tệp rồi chép lại.
- `e2e-all` có bài `tests/e2e-all.test.js` bắt buộc mọi `scripts/e2e-*.js` đều khai báo trong `SUITES`; mỗi bộ e2e mới phải thêm tên vào đó (dễ xung đột khi gộp nhánh: gộp theo hợp hai danh sách).
- `normTab`/tab hiện đang mở được nhớ trong phiên, e2e phải **luôn click tab** trước khi dùng form; `innerText('#main')` bỏ qua pane `hidden`; seed danh mục vị trí lưu nền nên e2e chờ ≈ 800 ms.
- Test dựng `backupAll` cần cơ sở dữ liệu đúng lược đồ HAKQN: dùng `new Store(path)` và `s.save({...})` như `tests/backup-o-thu-hai.test.js`.
- Số liệu nền hiện có: unit 850/852 (0 lỗi, 2 bỏ qua); 137 bộ e2e (136 + `e2e-cai-de`); bản in 206.

## 8. THAM CHIẾU

- Sơ đồ danh mục (CHỦ xem): https://claude.ai/artifact/E4ViCDWt4K5DAEKQV83aLX
- PR #86 (v3.3.0 Google Sheets), #87 (v3.4.0), #88 (Danh mục một lớp, bộ lọc, sao lưu): https://github.com/saoluucvhak-pixel/HAK_APP_FSC/pulls?q=is%3Apr+is%3Amerged
- Release v3.4.0: https://github.com/saoluucvhak-pixel/HAK_APP_FSC/releases/tag/v3.4.0
- Tài liệu nền: `docs/NGHIEM_THU_DU_LIEU_GOOGLE_SHEETS.md`, `docs/BAN_GIAO_AGENT_TIEP_THEO.md` (bàn giao cũ cho v3.3.0), `docs/GHI_CHU_PHAT_HANH_3.4.0.md`.
