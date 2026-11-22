# THIẾT KẾ DỮ LIỆU — Phân bổ phiếu cân vào rừng, đổi số phiếu cân, khóa hợp đồng, lưu vết nguồn

> Giai đoạn G1 (chỉ thiết kế). Tác giả: `hak-data-architect`. Căn cứ: `PROMPT_V2_NANG_CAP_TRA_CUU_THEO_HOP_DONG.md` (S1, S4, S5, S8), mã tại `/tmp/up` (HEAD `baa866e`, sau PR #84), danh sách kiểm tra từ `hak-data-integrity`, `hak-migration-manager`, `hak-parent-child-data-model`.
> Tài liệu này KHÔNG sửa mã, KHÔNG sửa test. Mọi đoạn mã bên dưới là **giả mã (sketch)**; ví dụ dùng số liệu giả lập, không có dữ liệu thật.
> Quy ước: `tệp:dòng` là vị trí đã đọc ở HEAD nói trên; số dòng có thể xê dịch sau các PR khác.

---

## 0. Tóm tắt điều hành

**Kết luận về migration SQLite**

| Hạng mục | Cần migration? | Lý do ngắn |
|---|---|---|
| Phiếu cân `soCu[]`, nhật ký lô `soLog[]`, `info.nguon`, (tùy chọn) `f.taoLuc`, `_src.hd`/`_src.pb` | **KHÔNG** | Toàn bộ nằm trong JSON `forests.data` (`src/store.js` cột `data`/`hash`). Không thêm cột, bảng, chỉ mục. `MIGRATIONS` giữ nguyên độ dài (hiện 15 phần tử, `user_version` = 15). Đọc theo kiểu "chịu thiếu" (`p.soCu || []`), không điền ngược (no backfill). |
| Phân bổ phiếu vào rừng (kết quả tính, dung sai, ô "Vào rừng") | **KHÔNG** | Là trạng thái giao diện tạm; chỉ kết quả cuối (phiếu nằm trong `f.pc` của lô nào) mới lưu, bằng đường ghi sẵn có. |
| Chuẩn hóa mã hợp đồng của chỉ mục tra cứu (S1, PR-2): `lookup_rows.k_hd` | **CÓ, nhỏ, tùy chọn — v16** | `k_hd` hiện lưu `clean(Mã hợp đồng)` (giữ nguyên hoa/thường, `src/lookup.js:183`). S1 đòi so không phân biệt hoa/thường. Bản tra cứu hiện có trong SQLite mang `k_hd` kiểu cũ nên `build(hd)` mới sẽ hụt cho tới khi nạp lại Sheet. Cách gọn: migration v16 tính lại `k_hd` từ cột `data` (bản chụp là bộ nhớ đệm có thể dựng lại, chạy lại không đổi). Cách thay thế không cần migration: so khớp `upper(k_hd)` lúc truy vấn (mất lợi ích chỉ mục `idx_lr_hd`). **Việc này thuộc PR-2, không thuộc phần phiếu/đổi số.** Xem §2.7. |

**Ba rủi ro lớn nhất** (chi tiết §4): (1) cộng đôi khối lượng khi số phiếu đổi mà khóa A5 "số phiếu + ngày" không còn nhận ra chuyến; (2) trùng tên `src/phanbo.js` (đã tồn tại, là phân bổ khối lượng nhân công theo đội) và nhầm "phân bổ phiếu vào rừng" với "phân bổ khối lượng theo đội"; kèm thứ tự rừng "theo thứ tự nhập" hiện chỉ dựa vào vị trí trong `forests` (ngầm định, dễ lệch sau khôi phục); (3) đường ghi vào lô đã chốt / dấu vân tay: dữ liệu mới nằm trong phần "dữ liệu nghiệp vụ" nên bị khóa và bị băm; `info.nguon.at` mỗi lần áp dụng có thể làm lô "đổi" dù không có thay đổi thật.

---

## 1. Hiện trạng bám mã (đã đọc)

1. **Khóa phiếu.** `HAKBks.khoaPhieu(p) = soPhieu(p.soPhieu) + '|' + ngayKhoa(p.ngay)`, rỗng khi thiếu số hoặc ngày hợp lệ (`src/bks.js:13`); `soPhieu` = viết hoa + bỏ mọi khoảng trắng (`bks.js:10`); BKS khóa `khoa()` bỏ khoảng trắng, `.`, `-`, "(xe cũ)" (`bks.js:9`).
2. **Gộp bản nháp.** `stage.merge` ghép phiếu theo `KEY.pc = BKS.soPhieu(r.soPhieu)` (CHỈ số phiếu, không ngày; `stage.js:18`), rồi `identDiffs` so ngày, BKS, nơi cân, khối lượng (`stage.js:69-72`); khác → `st.pending` "Cần đối chiếu"; giải quyết bằng `resolve(keep|drop|update|other)` (`stage.js:139-159`). `other` đòi số phiếu mới nếu cùng số + cùng ngày (`stage.js:150-157`).
3. **Sửa tay.** `updateRow` đổi `soPhieu` tự do, giữ `_id`, thêm vào `_tay` (`stage.js:161-172`). Chỉ biển số có nhật ký (`bienLog`, `_plateSrc`; `stage.js:192-197`). Số phiếu không có nhật ký.
4. **Nạp từ Sheet.** `lkPhieuRows` (`ui/app/17-d-xem-truoc.js:57-79`) tra phiếu Sheet với `T.pc` (lô đích, bản nháp nếu có) theo `khoaPhieu`, rồi theo số phiếu; không khớp khóa nào → `st='new'` (dòng 65). Đây là chỗ cộng đôi nếu Sheet đổi số.
5. **Ghi vào lô.** `lkApply` (`ui/app/17-e-ghi-vao-ho-so.js:2-65`) đưa phiếu vào BẢN NHÁP bằng `HAKStage.merge`, ghi `f.ref{at,set,hd,cccd,fields}` khi tích "Lưu phần tham chiếu" (dòng 48); `mark()` ghi `f.src[key]` mức trường (dòng 12). Phiếu mang sẵn `_src {tab,row,at,set}` (dòng 39).
6. **Lưu bản nháp.** `stSave` (`ui/app/11-d-luu-ban-nhap.js:5-52`): chặn khi lô chỉ đọc (dòng 6), chặn khi còn `pending` (11-12), kiểm trùng khóa với LÔ KHÁC cho phiếu mới/đổi số/ngày và hỏi `confirm` (22-28), chụp `snap` để hoàn lại khi lỗi (29: gồm `bienLog`), ghi `f.bienLog` từ `commit` (38).
7. **Lưu trữ.** Lô = một dòng `forests`, `data` = `JSON.stringify(f)`, `hash = sha1(data)` (`store.js:171`); ghi delta dùng cùng chuỗi JSON (`src/delta.js:forestJson`) nên hai đường ghi cho cùng băm. `_kiemKhoa` chặn ghi dữ liệu nghiệp vụ của lô `chot`/`dung` (`store.js:380-394`); `KHOA_VONG_DOI = ['chot','luuTru','dung','nhatKy']` (`src/vongdoi.js:110`); mọi khóa khác (kể cả `pc`, `info`, `bienLog`) là dữ liệu nghiệp vụ, vào `bamDuLieu` / `hashDL` lúc chốt (`vongdoi.js:39-47`), gói đóng băng ở bảng `chot_goi` (`store.js:134-143`).
8. **Định danh dòng phiếu.** Mỗi dòng có `_id` (do `stage.create/newId`, được `commit` giữ lại) và `id` dạng `pc<N>` (`src/lienket.js`, ổn định; gắn `xeRowId`, `hdvcId`, `doiId`). Đổi số phải giữ cả hai.
9. **`src/phanbo.js` ĐÃ TỒN TẠI**: "PHÂN BỔ KHỐI LƯỢNG NHÂN CÔNG theo rừng" (chia khối lượng theo đội). Prompt V2 mục 4 ghi `src/phanbo.js (mới)` cho `phanBoPhieu` — **trùng tên**. Đề xuất §3.0.
10. **Sản lượng dự kiến.** `HAKDinhMuc.sanLuongDuKien(db, info) = info.dienTich × dinhMucLo(info).v` (`src/dinhmuc.js:96-101`); thiếu trả `null`. Khối lượng phiếu làm tròn từng phiếu đến kg rồi cộng (`kgPhieu`, `dinhmuc.js:104`). Hàm phân bổ mới PHẢI làm việc bằng kg nguyên, dùng lại `kgPhieu` (một định nghĩa).
11. **Chỉ mục tra cứu.** `lookup_rows(set_id, tab, row_no, data, search, k_cccd, k_hd, k_rung, k_phieu)`; mỗi lần nạp Sheet là một `lookup_sets` mới, bản cũ bị xóa kèm dòng (`lookup.js:446-461`). `build(cccd, hd, rungHint)` hiện ghép theo CCCD **và** hợp đồng (`lookup.js:572-589`); `baseCccd` bỏ hậu tố `_N` (`lookup.js:35`).

---

## 2. (a) Mô hình dữ liệu thay đổi

### 2.1 Trường mới trong dòng phiếu cân (`f.pc[]`)

| Trường | Kiểu | Bắt buộc | Ý nghĩa |
|---|---|---|---|
| `soCu` | mảng `{so, ngay, lyDo, nguon, at, nguoi?}`, tối đa 20 mục, mới nhất ở cuối | không (vắng = chưa từng đổi số) | Số phiếu cũ của CHÍNH chuyến này. |
| `soCu[].so` | chuỗi nguyên văn số cũ (không chuẩn hóa) | có | Số phiếu trước khi đổi. |
| `soCu[].ngay` | `dd/mm/yyyy` | có (nếu phiếu có ngày) | Ngày cân của phiếu LÚC đổi: để bí danh chỉ khớp đúng chuyến cùng ngày, không chặn số cũ được dùng lại cho chuyến khác ngày. |
| `soCu[].lyDo` | chuỗi ≥ 3 ký tự sau `trim` | có | Lý do (thao tác tay: người dùng nhập; từ Sheet: điền sẵn "Google Sheets đổi số, dòng N", người dùng được sửa). |
| `soCu[].nguon` | `{loai:'tay'|'sheet', tab?, row?, set?}` | có | Nguồn của việc đổi. `set` = `loadedAt` của bản tra cứu (không lưu CCCD). |
| `soCu[].at` | ISO 8601 UTC | có | Thời điểm đổi. |
| `soCu[].nguoi` | chuỗi | không | Chỉ ghi nếu ứng dụng đã có khái niệm người thao tác (như `nhatKy[].nguoi`). |
| `_src.hd`, `_src.pb` | chuỗi | không, **đề xuất** | `_src` đã có `{tab,row,at,set}`. Thêm `hd` (mã hợp đồng nguồn) và `pb ∈ {'mot-rung','tu-dong','tay'}` để truy vết "vì sao phiếu này nằm ở rừng này" cho FSC. Có thể bỏ nếu CHỦ muốn tối thiểu. |

Không thêm trường "rừng" vào dòng phiếu: phiếu thuộc rừng nào được xác định bằng việc nó nằm trong `f.pc` của lô nào (và `maRung` đã có từ `normPC`). "Vào rừng" chỉ là lựa chọn tạm trên giao diện (§2.4).

Không dùng tiền tố `_` cho `soCu`. Lý do: `commit` xóa `_plateSrc/_renamedFrom/_nguon/_tay` (`stage.js:194`) và `applyInto` ghi đè mọi trường `_*` không rỗng từ dòng nhập (`stage.js:82`); `soCu` cần bền và không bị file nhập ghi đè. Dòng nhập (Sheet/Excel) không bao giờ mang `soCu`, và `applyInto` chỉ lặp qua khóa của dòng nhập nên `soCu` của dòng đã lưu không bị đụng.

### 2.2 Nhật ký lô `f.soLog[]` (song song `f.bienLog[]`)

```
f.soLog[] = { pid, soCu, soMoi, ngay, kl, lyDo, nguon, at, nguoi? }
  pid   = id ổn định của dòng phiếu ('pc<N>' nếu có, ngược lại _id)
  kl    = khối lượng tấn lúc đổi (như bienLog.kl)
```

- Sinh ở `HAKStage.commit` bằng cách so `st.base.pc` với `st.cur.pc` (dòng đã lưu mà `soCu` dài thêm), giống cách `bienLog` được suy ra (`stage.js:195`). `commit` trả thêm `soLog` (cộng thêm, không phá chữ ký: test hiện có chỉ đọc `lists`, `bienLog`).
- Vì sao cần cả `soCu` (trên dòng) lẫn `soLog` (trên lô): `soCu` là nguồn chính để NHẬN DIỆN (tra khóa, bí danh) và đi theo dòng; `soLog` là nhật ký chỉ-thêm sống SAU KHI dòng phiếu bị xóa (xóa phiếu không làm mất lịch sử đổi số), phục vụ báo cáo/FSC.
- **Không** đặt vào `f.nhatKy` (khóa vòng đời, được sửa sau khi chốt và KHÔNG vào dấu vân tay `hashDL`). `soLog` phải là dữ liệu nghiệp vụ như `bienLog`, để lô chốt không đổi được lịch sử đổi số.
- Chỗ cần sửa ở bản giao diện: `snap` trong `stSave` (11-d dòng 29) phải thêm `soLog`; nhánh `catch` phải `delete f.soLog` khi `snap.soLog` vắng (như `bienLog`, dòng 49).
- Idempotent: mỗi mục có `pid + soCu + at` nên có thể loại trùng nếu `stSave` thử lại.

### 2.3 `info.nguon` (S4) — lưu vết nguồn mức lô

```
f.info.nguon = { hd, maRung, at, set? }
  hd      = mã hợp đồng như trên Sheet (clean), KHÔNG chuẩn hóa hoa/thường để người dùng thấy đúng nguyên văn
  maRung  = Mã rừng trên ToaDoRung; '' nếu hợp đồng chưa có tọa độ
  at      = ISO UTC của lần áp dụng gần nhất CÓ THAY ĐỔI DỮ LIỆU
  set     = (tùy chọn) loadedAt của bản tra cứu; không PII
```

- Không lưu CCCD (CCCD đã có ở chủ rừng). `f.ref{hd,cccd}` giữ như cũ.
- Cách dùng thêm: tra ngược "lô nào thuộc hợp đồng X" độc lập với CCCD: `hopDongCuaLo = info.nguon.hd || o.info.soHopDong || f.ref.hd` (thứ tự ưu tiên). `f.ref` chỉ có khi người dùng tích "Lưu phần tham chiếu" nên không đủ tin cậy.
- Quy tắc ghi: chỉ ghi/đổi `info.nguon` khi lần áp dụng thực sự làm đổi dữ liệu của lô; áp dụng lần hai không đổi gì thì KHÔNG đổi `at` (giữ idempotent theo T8, tránh làm lô "đã sửa" và đổi băm vô ích — xem R7).
- Đọc theo kiểu chịu thiếu: lô cũ không có `nguon` vẫn mở bình thường.
- Chú ý tên: `mark()` ghi `f.src[trường]` ở cấp lô (không phải `info`); `info.nguon` là mới, không trùng.

### 2.4 Trạng thái tạm (KHÔNG lưu)

`lk.sel.rungOf[_lkKey] ∈ {id rừng, ''}` (ô "Vào rừng"; `''` = chưa phân bổ), `lk.dungSai` (0–0,30; mặc định 0,05), kết quả `phanBoPhieu`, bộ lọc/phân trang. Mất khi đóng modal là chấp nhận được. Nếu CHỦ muốn nhớ dung sai giữa các lần mở: đặt ở `localStorage` của giao diện hoặc khóa `meta` (`lk:` đã được dành riêng cho tra cứu; `store.js:331` loại trừ `lk:%` khỏi việc xóa), **không** đưa vào dữ liệu lô.

### 2.5 `f.taoLuc` (tùy chọn, khuyến nghị) — thứ tự nhập của rừng

S5.3 định nghĩa "thứ tự rừng = thứ tự nhập (thứ tự tạo lô)". Hiện KHÔNG có trường nào ghi điều này: thứ tự lấy từ `Object.values(o.forests)` (`ui/app/02-luu-tru-trang-thai.js:198`), mà khi mở app dữ liệu được đọc bằng `SELECT id, owner_id, data FROM forests` **không `ORDER BY`** (`store.js:246`). Thực tế thường theo rowid (= thứ tự chèn) nhưng không được đảm bảo, và có thể xáo sau Khôi phục toàn bộ / chuyển lô giữa chủ rừng.

Đề xuất: `f.taoLuc` = ISO UTC, gán ở mọi đường TẠO lô (`lkApply` chế độ `new`, nút thêm rừng). Không điền ngược cho lô cũ. Sắp xếp xác định: `(taoLuc || '') tăng dần`, rồi vị trí hiện tại trong `o.forests` làm khóa phụ ổn định (lô cũ không có `taoLuc` xếp trước, giữ nguyên vị trí). Không cần migration. Nếu không muốn thêm trường: chấp nhận thứ tự hiện tại và ghi rõ giới hạn trong hướng dẫn (xem câu hỏi mở Q3).

### 2.6 Tác động lên khóa, delta lưu, băm, chốt

| Thành phần | Tác động | Ghi chú |
|---|---|---|
| Khóa A5 "số phiếu + ngày" | **Giữ nguyên làm khóa hiện hành.** Thêm "khóa bí danh" `soCu.so + ngay`. | Hàm mới `HAKBks.khoaTatCa(p)` = `[khoaPhieu(p), …soCu.map(c => khoaPhieu({soPhieu: c.so, ngay: c.ngay || p.ngay}))]` (§3.5). Hai dòng trong một lô không được có khóa (hiện hành hoặc bí danh) trùng nhau nếu cùng ngày. |
| `KEY.pc` trong `stage.js` | Vẫn là số phiếu chuẩn hóa. | `merge` thêm nhánh ghép theo bí danh (§3.4). |
| `stage.sig` / `diff` | Tự phát hiện `soCu` đổi (khóa không bắt đầu bằng `_`). | Dòng chỉ đổi `soCu` được tính "đã đổi" → `dirty` đúng, `stSave` lưu. |
| Delta (`delta.js`) | **Không đổi mã.** | `forestJson = JSON.stringify(f)`; trường mới nằm trong `f` và được thêm CUỐI đối tượng nên chuỗi JSON tất định; delta và `Store.explode` cho cùng băm (bất biến hiện có). Lô chưa từng đổi số không đổi một byte → băm không đổi. |
| `hash` cột `forests` | Chỉ đổi ở lô thực sự gặp tính năng mới. | Không có đợt đổi băm hàng loạt, không có migration. |
| Chốt hồ sơ / `hashDL` | `pc[].soCu`, `soLog`, `info.nguon`, `taoLuc` đều là dữ liệu nghiệp vụ → vào `bamDuLieu`. | Lô đã chốt: bản chụp cũ không có các trường này, vẫn `nguyen-ven` vì dữ liệu hiện tại cũng không có. Ghi vào lô chốt bị `_kiemKhoa` chặn (mã `LOCKED`). Mở khóa → đổi số → chốt lại sinh phiên bản mới (băm mới) — đúng thiết kế. |
| `chot_goi` | Không đổi. | Gói là chuỗi JSON của lô lúc chốt. |
| Sao lưu / khôi phục JSON | Trường lạ đi theo `data` nên giữ nguyên. | Lùi về bản ứng dụng cũ (3.2.0) vẫn mở được dữ liệu (JSON chuyển tiếp trường lạ) nhưng MẤT lớp bảo vệ bí danh → có thể thêm trùng phiếu mang số cũ (R6). |
| `info.nguon` & dấu vân tay | `info` là dữ liệu nghiệp vụ. | Chỉ ghi vào lô chưa khóa (`lkApply` đã chặn lô chốt/dừng ở đầu hàm, dòng 5). |

### 2.7 Migration — xác nhận và phương án phần S1 (chỉ PR-2)

**Phần phiếu/đổi số/nguồn: không migration.** Kiểm theo danh sách `hak-migration-manager`:
1. Lược đồ nguồn/đích: không đổi (`user_version` 15 → 15).
2. Backup trước khi ghi: không phát sinh (không có bước ghi hàng loạt); đường lưu thường đã có sao lưu tự động.
3. Chạy lại không nhân đôi: không có bước chạy.
4. Rollback: bản cũ đọc được JSON mới (R6).
5. Đọc chịu thiếu là bắt buộc và phải có test (§5).

**Phần S1 (khóa hợp đồng): đề xuất `v16` — chỉ khi PR-2 chọn chuẩn hóa `k_hd` lúc nạp.**
- Vấn đề: `lookup_rows.k_hd` hiện = `clean(...)` (`lookup.js:183-185`). Nếu `keysOf` đổi sang `normHd(x) = clean(x).toUpperCase()` (bỏ khoảng trắng thừa, không phân biệt hoa/thường), bản tra cứu ĐANG CÓ trong SQLite vẫn mang `k_hd` kiểu cũ → `build(hd)` mới trả rỗng cho hợp đồng có chữ thường cho tới lần đồng bộ sau (có thể phải chờ mạng).
- Giải pháp: `v16(db)`: với mỗi dòng `lookup_rows`, parse `data`, gọi `keysOf(tab, row)` mới, `UPDATE ... SET k_hd=?`; một giao dịch; chạy sau `snapshotFile` (đường `migrate` đã làm, `store.js:203`). Idempotent vì `normHd(normHd(x)) = normHd(x)`. Không đụng `owners/forests`.
- Thêm kiểm tra chéo (sketch, PR-2): với mỗi hợp đồng `H = normHd`: `cccdRung(H) = {baseCccd→cccdSo của mọi dòng HoSoRung có k_hd=H}`; `|cccdRung(H)| ≥ 2` → `LOI_DU_LIEU` (liệt kê số dòng, chặn cập nhật); dòng HoSoKeo/ToaDoRung có CCCD ≠ CCCD của hợp đồng → `lech[]` (số dòng, không tích sẵn); thiếu CCCD → ghi chú. So CCCD bằng `NL.cccdSo` (chỉ chữ số, **không** bù số 0 — CMND 9 số và CCCD 12 số là hai khóa khác nhau; xem Q8). Chủ rừng trong app có CCCD ≠ CCCD hợp đồng → chặn ghi vào chủ đó.
- Phương án không migration: giữ `keysOf` cũ, truy vấn `WHERE set_id=? AND tab=? AND upper(k_hd)=?`. Chấp nhận quét theo `idx_lr_tab`; bộ dữ liệu Sheet cỡ hàng nghìn–chục nghìn dòng nên vẫn nhanh. Việc chọn thuộc PR-2; thiết kế này khuyến nghị v16 vì giữ được chỉ mục.

---

## 3. (b) Hàm thuần (giả mã)

### 3.0 Nơi đặt và tên (tránh đụng tệp có sẵn)

- `phanBoPhieu` → tệp mới **`src/phanbophieu.js`** (UMD như `bks.js`; xuất `root.HAKPhanBoPhieu`). **Không** dùng `src/phanbo.js` (đã là phân bổ nhân công; hai khái niệm khác nhau, dễ import nhầm). Cần cập nhật PR-3b trong prompt.
- `phatHienDoiSo` → tệp mới **`src/doiso.js`** (UMD, `root.HAKDoiSo`) hoặc hàm trong `bks.js` nếu muốn ít tệp. Thao tác ghi `doiSoPhieu` ở `stage.js` (cần `st`). Cả ba module mới phải vào danh sách dựng `renderer/index.html` (`scripts/build-html.js`) và cổng IPC không đổi (hàm chạy ở giao diện).
- Mọi hàm: thuần (không sửa đầu vào, không đọc giờ/ngẫu nhiên: thời điểm `at` do người gọi truyền), tất định, đơn vị nội bộ **kg nguyên**.

### 3.1 Hàm phụ

```
kgOf(x)      = round(x.klKg) nếu số hữu hạn > 0; ngược lại HAKDinhMuc.kgPhieu(x) (tấn×1000 làm tròn)  // một định nghĩa
ngayKey(s)   = HAKDates.key(s)               // yyyymmdd số, 0 nếu không có thật
soKey(s)     = HAKBks.soPhieu(s)             // HOA, bỏ khoảng trắng
bksKey(s)    = HAKBks.khoa(s)
khoa(p)      = HAKBks.khoaPhieu(p)           // 'SO|key ngày' hoặc ''
soTuNhien(a,b)= so sánh chuỗi tách cụm chữ số: 'PA2' < 'PA10'; bằng nhau thì so chuỗi gốc
duKienKg(r)  = (isFinite(r.ha) && r.ha>0 && isFinite(r.dinhMuc) && r.dinhMuc>0) ? round(r.ha*r.dinhMuc*1000) : null
gioiHanKg(r,dsMil) = floor(duKienKg(r) * (1000+dsMil) / 1000)     // dsMil = round(dungSai*1000), số nguyên 0..300
```
Dùng số nguyên cho `gioiHanKg` để ranh giới "≤" không dính sai số dấu phẩy động (T19). Ví dụ giả lập: dự kiến 61,75 t, dung sai 5 % → 61 750 × 1 050 / 1 000 = 64 837,5 → giới hạn 64 837 kg (phiếu làm tích lũy 64 838 kg là vượt).

### 3.2 `phanBoPhieu(phieu[], rungs[], dungSai, daDung[], opts)`

```
Vào
  phieu[i] = { key,            // HAKBks.khoaPhieu — duy nhất trong lô dữ liệu vào
               ngay, so, kg,   // kg nguyên > 0
               row,            // số dòng Sheet (tie-break hiển thị)
               rungTay?,       // id rừng | '' (người dùng chọn "Chưa phân bổ") | undefined (chưa chọn)
               boQua? }        // 'lech-cccd' | 'loi-du-lieu' | … do người gọi đặt (KHÔNG tự phân bổ)
  rungs[j] = { id, ha, dinhMuc }          // đã sắp THEO THỨ TỰ NHẬP (người gọi sắp: §2.5)
  dungSai  ∈ [0, 0.30]
  daDung[] = [{ rungId, kg }]             // phiếu ĐÃ CÓ trong các lô của hợp đồng (đã lưu + bản nháp)
  opts     = { giuTay: true, nhanDu: true }
         giuTay=false  → bỏ qua rungTay (nút "Phân bổ tự động": tính lại cả hợp đồng)
         nhanDu=false  → rừng cuối KHÔNG nhận phần dư (nút "Phân bổ phần còn lại vào rừng N")

Ra
  { ok, loi?,
    gan:        [{ key, rungId, cach:'mot-rung'|'tu-dong'|'tay', kg }],      // theo thứ tự xử lý
    chuaPhanBo: [{ key, lyDo }],      // lyDo ∈ boQua | trung-nguon | thieu-ngay | thieu-kl | rung-khong-ton-tai
                                      //          | thieu-du-kien | het-du-kien | nguoi-dung-bo | khong-co-rung
    rung:       [{ id, duKienKg|null, gioiHanKg|null, daDungKg, themKg, tongKg, soPhieuThem, canhBao[] }],
    canhBao:    [{ ma, rungId?, ...}] }   // ma ∈ vuot-du-kien(vuotKg) | trong-dung-sai | thieu-du-kien | rung-bo-trong
                                          //      | phieu-lon-hon-gioi-han | chua-phan-bo(n) | da-dung-khong-ro-rung

1. kiểm tra: dungSai ngoài [0,0.30] hoặc không phải số → {ok:false, loi:'dung-sai'}; id rừng trùng → {ok:false, loi:'rung-trung-id'}
   dsMil = round(dungSai*1000)
2. với mỗi rừng r: du[r]=duKienKg(r); gh[r]=du[r]==null ? null : gioiHanKg(r,dsMil)
   dung[r] = Σ kg của daDung có rungId==r ; daDung có rungId lạ → canhBao 'da-dung-khong-ro-rung' (không cộng)
   them[r]=0
3. phân loại đầu vào (mỗi phiếu đúng MỘT nhóm):
   - key đã gặp (giữ phiếu có row nhỏ nhất)            → chuaPhanBo 'trung-nguon'
   - ngayKey(ngay)==0                                  → 'thieu-ngay'
   - !(kg>0)                                           → 'thieu-kl'
   - boQua                                             → chuaPhanBo(boQua)
   - opts.giuTay và rungTay === ''                     → 'nguoi-dung-bo'
   - opts.giuTay và rungTay là id có thật              → gan 'tay'; them[rungTay]+=kg
   - opts.giuTay và rungTay là id lạ                   → 'rung-khong-ton-tai'
   - còn lại                                           → tapTuDong
4. nếu rungs rỗng: mọi phiếu tapTuDong → 'khong-co-rung'; trả.
5. sắp tapTuDong: (ngayKey tăng, soTuNhien tăng, key tăng)   // toàn phần, không phụ thuộc thứ tự vào
6. E = rungs có gh != null   (nếu rungs.length==1 thì E = rungs, KỂ CẢ gh==null: 1 rừng → mặc định rừng đó, S5.2)
   nếu E rỗng: mọi phiếu tapTuDong → 'thieu-du-kien'; trả.
7. cum[r] = dung[r] + them[r]  (phiếu tay đã tính)
   idx = 0
   với mỗi p trong tapTuDong theo thứ tự:
     lặp:
       r = E[idx]; laCuoi = (idx == E.length-1)
       nếu laCuoi và opts.nhanDu:   (hoặc gh[r]==null khi 1 rừng)  → nhận
       nếu gh[r]==null:             → nhận   (chỉ xảy ra khi rungs.length==1)
       nếu cum[r] + p.kg ≤ gh[r]:   → nhận
       ngược lại nếu !laCuoi:       idx++ ; lặp lại
       ngược lại (laCuoi, nhanDu=false): → p và MỌI phiếu sau → 'het-du-kien' ; dừng vòng
     nhận: gan(p → r, cach = rungs.length==1 ? 'mot-rung' : 'tu-dong')
           cum[r]+=p.kg ; them[r]+=p.kg
8. tổng kết từng rừng: tongKg = dung+them
   - gh!=null và tongKg>gh        → 'vuot-du-kien' {vuotKg = tongKg − du}  (đỏ)
   - gh!=null và du<tongKg≤gh     → 'trong-dung-sai'                        (vàng/thông tin)
   - du==null và rungs.length>1   → 'thieu-du-kien'
   - du!=null, them==0, dung==0, có phiếu auto đi qua rừng này → 'rung-bo-trong'
   số chuaPhanBo>0 → canhBao 'chua-phan-bo' {n}
```

**Bất biến (invariants)** — mỗi điều là một khẳng định kiểm thử được:

| # | Bất biến |
|---|---|
| P1 Bảo toàn | Mỗi phiếu đầu vào xuất hiện ĐÚNG MỘT lần, hoặc trong `gan` hoặc trong `chuaPhanBo`; `|gan|+|chuaPhanBo| = |phieu|` (sau khi tính `trung-nguon` là một lần cho khóa trùng thứ hai). |
| P2 Không chia đôi | Mỗi `key` thuộc tối đa một rừng; không có phiếu có `kg` bị tách. |
| P3 Khớp tổng | `Σ rung.themKg = Σ gan.kg`; `rung.tongKg = daDungKg + themKg`; mọi cộng bằng số nguyên kg. |
| P4 Đơn điệu | Với các phiếu `tu-dong` theo thứ tự xử lý, chỉ số rừng trong `E` không giảm (không quay lại rừng trước). |
| P5 Giới hạn | Với rừng không phải rừng cuối của `E` (hoặc khi `nhanDu=false`): nếu `themKg_tu-dong > 0` thì `daDung+them_tay+themKg_tu-dong ≤ gioiHanKg`. Chỉ rừng cuối (khi `nhanDu`) mới được vượt giới hạn. |
| P6 Ranh giới | Phiếu làm tích lũy bằng đúng `gioiHanKg` vẫn vào rừng hiện tại (≤, không <). |
| P7 Tất định, không phụ thuộc thứ tự vào | Hoán vị `phieu` không đổi `gan/chuaPhanBo` (các khóa khác nhau có thứ tự toàn phần ở bước 5). Không sửa đầu vào. |
| P8 Phiếu đã có không bị phân bổ lại | Hàm không thấy phiếu `trung`/`so-cu`/`nghi` (người gọi loại trước; hàm chỉ nhận phiếu cần gán). Sau khi ghi, các phiếu ấy chuyển sang `daDung` và gọi lại với `phieu=[]` cho `gan=[]` (idempotent). |
| P9 Phiếu lệch CCCD / lỗi | Không bao giờ vào `gan` trừ khi `rungTay` hợp lệ do người dùng chọn rõ ràng **và** không có `boQua` (`boQua` thắng `rungTay`). |
| P10 Không tự nhận khi thiếu dự kiến | Rừng có `du==null` không nhận phiếu `tu-dong` khi `rungs.length>1` (chỉ nhận `tay`). |

**Ca biên cần có test:** (1) `phieu=[]`; (2) `rungs=[]`; (3) dung sai 0 và 0,30, ngoài khoảng, `NaN`; (4) phiếu vừa đúng bằng phần còn lại (P6); (5) `61,75 t × 5 %` → 64 837 kg: phiếu đưa tích lũy tới 64 837 vào, 64 838 sang rừng sau; (6) `daDung` ở rừng 1 đã ≥ giới hạn → phiếu đầu nhảy sang rừng 2; (7) rừng giữa thiếu hecta/định mức bị bỏ qua, rừng cuối là rừng cuối **trong E**; (8) rừng cuối thiếu dự kiến; (9) tất cả rừng thiếu dự kiến → mọi phiếu `thieu-du-kien` (T17), phân bổ tay vẫn gán được; (10) một rừng duy nhất: nhận tất cả kể cả thiếu dự kiến, cảnh báo vượt chỉ khi có dự kiến; (11) phiếu lớn hơn `gioiHanKg` của mọi rừng: theo quy tắc nghiêm, trôi sang rừng cuối nhận dư, các rừng trước có thể trống → cảnh báo `rung-bo-trong` (Q4); (12) hai phiếu cùng ngày `PA2`/`PA10` (thứ tự tự nhiên) và `PA01`/`PA1` (cùng khóa chuẩn hóa nếu cùng ngày → `trung-nguon`); (13) khóa trùng trong nguồn; (14) `rungTay` + `giuTay=false` (nút tự động bỏ qua đặt tay; T18) và `giuTay=true`; (15) `rungTay=''`; `rungTay` id lạ; (16) `nhanDu=false` (nút "phần còn lại vào rừng N") dừng tại phiếu đầu không vừa, các phiếu sau → `het-du-kien` (phiếu nhỏ hơn đứng sau vẫn không chen vào: theo thứ tự ngày); (17) `ha` hoặc `dinhMuc` là chuỗi/âm/0/`NaN` → coi thiếu; (18) dung sai `0.05` không sinh `50.00000000000001`; (19) hợp đồng 300 phiếu (T20) thời gian.

**Độ phức tạp:** thời gian `O(P log P + R + D)` (P phiếu, R rừng, D mục `daDung`); bộ nhớ `O(P + R)`. Vòng bước 7 tuyến tính vì `idx` chỉ tăng (mỗi phiếu và mỗi rừng được duyệt không quá một lần ở mỗi bước). P ≤ vài nghìn → không cần tối ưu thêm.

**Ngữ nghĩa cần CHỦ xác nhận** (đã chọn mặc định, xem §6): ranh giới "vượt dự kiến" (so với dự kiến hay với giới hạn có dung sai), phiếu lớn hơn cả giới hạn một rừng trống (Q4), một rừng thiếu dự kiến (Q5).

### 3.3 `phatHienDoiSo(phieuSheet[], phieuLo[], opt)`

```
Vào
  phieuSheet[i] = { idx, row, so, ngay, bks, kg }       // bks = BKS đã xử lý bí danh tên xe (như `bien` ở lkPhieuRows)
  phieuLo[j]    = { id, lo?, so, ngay, bks, kg, soCu?: [{so, ngay?}] }   // bản nháp nếu có, không thì đã lưu; mọi lô của hợp đồng
  opt           = { nguongKg: 1 }
Ra
  { ketQua: [{ idx, tt, loId?, ungVien?: [{id, so, ngay, bks, kg, dKg, lo?}], canhTranh?: bool }], tomTat }
    tt ∈ 'trung' | 'trung-so-cu' | 'nghi-doi-so' | 'moi' | 'khong-xet'   // 'khong-xet': thiếu số/ngày hợp lệ (đã là 'issue' ở giao diện)

1. chỉ mục trên phieuLo:
     byKhoa[khoa(lo)]                        → [lo]        (bỏ lo không có khóa)
     byBiDanh[khoa({so:c.so, ngay:c.ngay||lo.ngay})] → [lo] cho mọi c ∈ lo.soCu
     byNgayBks[ngayKey(lo.ngay)+'|'+bksKey(lo.bks)] → [lo]  (bỏ lo thiếu ngày hoặc BKS)
   daNhan = {}  // id lô đã được một dòng Sheet nhận theo khóa/bí danh
2. Lượt 1 — khớp khóa:
   với mỗi s: k=khoa(s); nếu k=='' → 'khong-xet'
     nếu byKhoa[k]    → tt='trung',        loId=byKhoa[k][0].id ; daNhan += mọi lo trong byKhoa[k]
     nếu byBiDanh[k]  → tt='trung-so-cu',  loId=… (kèm ghi chú: số hiện hành của lô) ; daNhan += …
3. Lượt 2 — nghi đổi số (chỉ các s chưa có tt):
     nếu ngayKey(s.ngay)==0 hoặc bksKey(s.bks)=='' → 'moi'
     ứng viên = byNgayBks[ngay|bks].filter(lo => !daNhan.has(lo.id) && |round(s.kg) − lo.kg| ≤ nguongKg)
     rỗng → 'moi' ; ngược lại 'nghi-doi-so', ungVien sắp theo (|dKg|, so)
4. Tranh chấp: lo.id nào là ứng viên của ≥ 2 dòng Sheet → các dòng đó canhTranh=true
   (không tự phân xử; người dùng chọn một; sau mỗi thao tác Đổi số GỌI LẠI hàm: dòng còn lại tự thành 'moi' hoặc 'nghi' với ứng viên còn lại)
5. tomTat = đếm theo tt (+ số canhTranh)
```

**Bất biến:** N1 mỗi dòng Sheet đúng một `tt`; N2 `nghi-doi-so` ⇒ không dòng Sheet nào có khóa/bí danh trùng với lô ứng viên (khớp khóa luôn thắng); N3 `nghi-doi-so` ⇒ cùng ngày, cùng BKS chuẩn hóa, `|Δkg| ≤ 1`; N4 hàm thuần, không đổi đầu vào, không ghi; N5 `phieuLo=[]` ⇒ mọi `tt='moi'` (hoặc `khong-xet`); N6 kết quả không phụ thuộc thứ tự `phieuSheet` (chỉ thứ tự đầu ra); N7 một lô đã "được nhận" ở lượt 1 không bao giờ là ứng viên ở lượt 2 (ngăn trường hợp Sheet có cả số cũ lẫn số mới của hai chuyến cùng ngày/BKS/KL).

**Ca biên:** `|Δkg|` = 1 (nghi) và = 2 (mới); khối lượng Sheet là số lẻ (làm tròn kg trước khi so); BKS khác kiểu viết nhưng cùng khóa (`77C-123.45` / `77c 12345`); một bên thiếu BKS (không kết luận, `moi`); ngày lệch 1 ngày (cân qua đêm → `moi`, theo quy tắc "cùng ngày"); hai dòng Sheet cùng ứng viên (N7, tranh chấp); lô có `soCu` khớp số Sheet nhưng KHÁC ngày (chuyến khác → `moi`); số phiếu viết hoa/thường/khoảng trắng khác nhau (`pa 1`=`PA1` → `trung`); khóa trùng 2 lô (cùng hợp đồng): `trung` kèm cả hai; Sheet trùng khóa nội bộ (đã có `dupInFile`, không thuộc hàm này); chuỗi đổi số `A→B→C` (`soCu=[A,B]`, Sheet mang `A`, `B` hoặc `C` đều `trung`/`trung-so-cu`); Sheet đổi tiếp sang `D` → `nghi-doi-so` so với lô hiện mang `C`.

**Độ phức tạp:** `O(P + L)` kỳ vọng cho dựng chỉ mục và lượt 1; lượt 2 quét một bucket `ngày|BKS` (thường 1–3 phần tử) → `O(P·k)`, k nhỏ. L = số phiếu của các lô liên quan.

### 3.4 Gộp theo bí danh trong `stage.merge` / `resolve` (sketch thay đổi, PR-3d)

```
aliasKhop(x, r) = x.soCu?.some(c => soKey(c.so) === soKey(r.soPhieu) &&
                                    (!c.ngay || sameDay(c.ngay, r.ngay)))
// merge, kind==='pc':
  matches = list.filter(x => key(x) === k || aliasKhop(x, r)) && !khacNguoi(x)
  // phần còn lại giữ nguyên: identDiffs → 'Cần đối chiếu' hoặc cập nhật.
  // Dòng cập nhật GIỮ số hiện hành: mã sẵn có `if (target[kf] !== '') next[kf] = target[kf]` (stage.js:123) đã làm đúng.
// resolve(... 'other'): ô `trung` kiểm cả bí danh: khoaTatCa(x) ∩ khoaTatCa(r) ≠ ∅  → lỗi "đã có trong lô"
```
Lợi ích phụ: cùng một sửa cho cả đường **Excel** lẫn **Google Sheets** về rủi ro "app đã đổi số, nguồn vẫn mang số cũ" (rủi ro 2 của S8 trong prompt). Rủi ro "NGUỒN đổi số" (số mới lạ) chỉ bắt được khi gọi `phatHienDoiSo`; hiện thiết kế gắn vào xem trước Sheet (`lkPhieuRows`). Nạp Excel vẫn có thể cộng đôi vì lý do này — xem Q1.

### 3.5 `doiSoPhieu` — thao tác Đổi số riêng (`stage.js`, sketch)

```
doiSoPhieu(st, id, soMoi, meta, ctx) → {ok, ma?, error?, canhBao?, entry?}
  meta = { lyDo, nguon:{loai:'tay'|'sheet', tab?, row?, set?}, at, nguoi? }
  ctx  = { loKhoa: bool,               // giao diện: loKhoa(f) (chốt/dừng)
           phieuLoKhac: [{lo, p}],     // mọi phiếu của lô khác (để cảnh báo)
           xacNhanLoKhac: bool }
 1. ctx.loKhoa                          → {ok:false, ma:'LO_KHOA',  error:'Lô đã chốt/dừng: mở khóa trước'}       // chặn
 2. dòng = st.cur.pc.find(_id==id)      → không có: {ok:false, ma:'KHONG_CO'}
 3. soMoi.trim()=='' hoặc lyDo.trim().length<3 → {ok:false, ma:'THIEU'}
 4. soKey(soMoi)==soKey(dòng.soPhieu)   → {ok:false, ma:'KHONG_DOI'}
 5. khoaMoi = khoa({soPhieu:soMoi, ngay:dòng.ngay}) ; thiếu ngày: so theo soKey
    trùng TRONG LÔ (chặn): ∃ x≠dòng trong st.cur.pc : khoaTatCa(x) ∋ khoaMoi
                           hoặc ∃ q ∈ st.pending : khoa(q.incoming) == khoaMoi
 6. trùng Ở LÔ KHÁC: phiếu lô khác có khoaTatCa ∋ khoaMoi → canhBao[]; chưa xác nhận → {ok:false, ma:'CAN_XAC_NHAN', canhBao}
 7. ghi: entry={so:dòng.soPhieu, ngay:dòng.ngay, lyDo, nguon, at, nguoi}
         next = clone(dòng); next.soCu = (dòng.soCu||[]).concat(entry).slice(-20)
         next.soPhieu = soMoi.trim(); next._tay += 'soPhieu'      // giữ _id, _row, id, xeRowId, kl, bienSo…
         st.cur.pc[i] = next ; return {ok:true, entry}
```
- **Thay cho sửa ô tự do:** ở biểu mẫu Sửa phiếu cân, ô "Số phiếu" của dòng ĐÃ LƯU (có trong `st.base.pc`) chuyển thành chỉ đọc + nút "Đổi số phiếu…". Dòng mới trong bản nháp (chưa lưu) vẫn sửa tự do (không có lịch sử để mất). Lưới an toàn ở `updateRow` (nếu một đường khác vẫn đổi `soPhieu` của dòng đã lưu): tự ghi `soCu` với `lyDo='Sửa tay (không có lý do)'` và `nguon.loai='tay'` thay vì từ chối, để không phá test hiện có (`tests/stage.test.js:128`) — hoặc từ chối nếu CHỦ muốn nghiêm (Q9).
- **Đổi số theo Sheet** dùng đúng hàm này với `nguon.loai='sheet'`, `lyDo` điền sẵn, giữ `_id`, lô, khối lượng, BKS (không áp `kl`/`bienSo` của Sheet lên dòng).
- **Khóa A5 ở `stSave`:** lần lưu thấy dòng `changed` có `khoaSo` đổi → hộp xác nhận lô khác (dòng 22-28) vẫn chạy; nên `ctx.xacNhanLoKhac` được truyền vào (`opt.confirmedDup`) để người dùng không bị hỏi hai lần.
- **Điểm ghi nhật ký lô:** `commit` thêm `soLog` (§2.2); `stSave` nối vào `f.soLog` ở dòng sau khi nối `bienLog` (dòng 38).

### 3.6 Đường ống ở màn "Dữ liệu Google Sheets" (thứ tự gọi, không tạo đường ghi mới)

```
1. lô của hợp đồng = lô có info.nguon.hd|soHopDong|ref.hd khớp normHd, xếp theo taoLuc (rồi vị trí); lô chưa có → thứ tự mã rừng trên Sheet
2. phieuLo  = phiếu của mọi lô trên (bản nháp nếu có)           daDung = Σ kg theo lô
3. phatHienDoiSo(phieuSheet, phieuLo)       → trung / trung-so-cu / nghi-doi-so / moi
4. lọc: bỏ trung, trung-so-cu, nghi-doi-so; đặt boQua cho lệch CCCD / issue / alias biển còn thiếu
5. phanBoPhieu(chỉ phiếu 'moi', rungs, dungSai, daDung, {giuTay})
6. người dùng chọn → lkApply (đường ghi hiện có): merge vào bản nháp từng lô (HAKStage.merge); phiếu "Đổi số" gọi doiSoPhieu
7. chưa phân bổ → KHÔNG ghi, hiện số lượng
```
Phần 4 phải khớp P8: phiếu có trong bất kỳ lô nào của hợp đồng (không chỉ lô đích) là "đã có", kể cả ở lô khác; ghi nhận nơi đang nằm.

---

## 4. (c) Phân tích rủi ro

Thang: Cao/Trung bình/Thấp theo (khả năng × hậu quả). "Giảm thiểu" là yêu cầu thiết kế cho PR sau.

| # | Rủi ro | Mức | Cơ chế | Giảm thiểu |
|---|---|---|---|---|
| R1 | **Cộng đôi khối lượng** | Cao | (a) Sheet đổi số chuyến đã có → `lkPhieuRows` thấy `new` (`17-d:65`); (b) app đổi số, Sheet giữ số cũ → số cũ thành `new`; (c) phiếu đã có ở LÔ KHÁC cùng hợp đồng nhưng `lkPhieuRows` chỉ so lô đích; (d) bấm áp dụng hai lần; (e) người dùng tích tay phiếu "Nghi đổi số"; (f) nạp Excel cùng chuyến với số khác; (g) hai chuyến thật cùng ngày/BKS/KL (không phải đổi số) bị cho là nghi. | (a) `phatHienDoiSo`, mặc định không ghi; (b) `soCu` + bí danh ở `merge` và `lkPhieuRows`; (c) `phieuLo` = mọi lô của hợp đồng; (d) `merge` đã idempotent theo khóa; thêm test hai lần; (e) ô tích bị `disabled` cho `nghi-doi-so` cho tới khi chọn "Là chuyến khác"; (f) Q1; (g) luôn hỏi người dùng, không tự gộp, và có nút "Là chuyến khác". Bất biến kiểm tra cuối: sau mỗi lần ghi, `Σ kl` của lô tăng đúng bằng `Σ kl` các phiếu "thêm mới", không bao giờ bằng `kl` của phiếu "Đổi số". |
| R2 | **Khóa A5 "số phiếu + ngày"** | Cao | Đổi số = đổi khóa. `stSave` chỉ cảnh báo trùng LÔ KHÁC (không chặn), và so khóa hiện hành chứ không so bí danh. Phiếu thiếu ngày rơi về khóa chỉ-số-phiếu, nên đổi số có thể va chạm. Số cũ dùng lại cho chuyến khác ngày hợp lệ nhưng phải không bị chặn nhầm. | Khóa vẫn là số+ngày; bí danh cũng gắn ngày (`soCu[].ngay`). `doiSoPhieu` chặn cứng trùng trong lô (kể cả bí danh dòng khác cùng ngày), cảnh báo lô khác có xác nhận; `stSave` bổ sung so bí danh của lô khác. Test: số mới trùng bí danh của dòng khác cùng ngày bị chặn; khác ngày thì không. Đổi ngày cân của dòng có `soCu`: `soCu[].ngay` KHÔNG tự đổi (giữ ngày lúc đổi số — là ngày trên Sheet cũ). |
| R3 | **Sổ phiếu cân / tra cứu / lọc** | Trung bình | Bảng phiếu (`12-d`), `sf` lọc, `lkPcFiltered` (`17-d:40`), tìm toàn cục (`src/timkiem.js:35`) chỉ dùng `soPhieu` hiện hành. Yêu cầu "tra cứu theo số cũ vẫn ra phiếu". | Hiển thị luôn số hiện hành. Thêm `soCu[].so` vào chuỗi tìm của `sf.matchQ`, `lkPcFiltered`, `timkiem`. Chú thích nhỏ "(trước đây: PA1)" ở dòng có `soCu`, không thêm cột (tránh đổi bảng in). Mọi chỗ hiển thị phiếu dùng tên trường rõ ràng; kiểm tra bằng tìm `Object.keys(p)`/`...p` ở mã xuất (đã rà `16-bao-cao.js:39`, ánh xạ trường tường minh). |
| R4 | **Bản in — `so-ban-in` 206/206** | Trung bình | Chỉ an toàn nếu không đầu ra nào đọc trường mới. | Thiết kế KHÔNG đổi đầu ra tài liệu hiện có: `soCu`, `soLog`, `info.nguon`, `taoLuc`, `_src.hd/pb` chỉ dùng cho nhận diện/lưu vết. `scripts/so-ban-in.js` dựng lô cố định (`PC`) nên không chạm tính năng mới; vẫn bắt buộc chạy lại sau mỗi PR (cổng G). Test bổ sung: dựng lô có `soCu` + `soLog` + `info.nguon`, so đầu ra in/xuất với lô không có → bằng nhau từng byte. Báo cáo "Phiếu cân đã đổi số" (nếu làm) là báo cáo MỚI, tách khỏi tài liệu hiện có. |
| R5 | **Lô đã chốt / gói đóng băng / dấu vân tay** | Cao | Mọi trường mới là dữ liệu nghiệp vụ → vào `hashDL`. Lô chốt bị `_kiemKhoa` chặn ghi (đúng). Rủi ro nằm ở: giao diện quên chặn trước, người dùng nhập xong mới bị `LOCKED`; `info.nguon.at` nhảy mỗi lần áp dụng. Mở khóa → đổi số → chốt lại phải ra phiên bản mới. | Chặn sớm ở `doiSoPhieu` (`ctx.loKhoa`) và ở `lkApply` (đã có, dòng 5) với thông báo rõ. Không đặt `soLog` vào `nhatKy` (§2.2). Không ghi `info.nguon` khi không có thay đổi dữ liệu. Test: lô chốt cũ vẫn `nguyen-ven` sau nâng cấp; thử đổi số trên lô chốt → `LOCKED` ở cả giao diện lẫn `Store.save`; lô mở khóa + đổi số + chốt lại → phiên bản mới, `hashDL` khác, gói cũ nguyên. |
| R6 | **Lùi phiên bản / khôi phục / backup** | Thấp–Trung bình | Bản 3.2.0 đọc được JSON mới nhưng không biết `soCu` → có thể thêm lại phiếu mang số cũ; sao lưu giữ `soCu` (nằm trong `data`). | Ghi vào ghi chú phát hành. Không cần mã. Test khôi phục: dữ liệu có `soCu` qua `backup`/`restore` giữ nguyên. |
| R7 | **Idempotent & băm** | Trung bình | Áp dụng hai lần (T8) không được đổi lô; `info.nguon.at` đổi mỗi lần sẽ làm `dirty` và đổi băm. | So sánh trước khi ghi; chỉ đổi `nguon` khi có thay đổi thực. Kiểm: băm lô sau áp dụng lần hai = băm sau lần một. |
| R8 | **Thứ tự rừng "theo thứ tự nhập"** | Trung bình | Không có trường tạo-lúc; thứ tự suy ra từ `Object.values(o.forests)` ← `SELECT` không `ORDER BY` (§2.5). Sai thứ tự = phiếu vào sai rừng ĐẶC BIỆT khi tự động. | `f.taoLuc` (tùy chọn) hoặc ghi nhận giới hạn; luôn HIỂN THỊ thứ tự rừng trong modal và cho người dùng thấy kết quả trước khi ghi; kết quả phân bổ chỉ là đề xuất. Q3. |
| R9 | **Nhầm tên/tệp `phanbo.js`** | Trung bình | PR-3b trong prompt đặt tên `src/phanbo.js (mới)` đang trùng tệp có sẵn. Ghi đè là phá phân bổ nhân công. | Đặt tên `src/phanbophieu.js` (§3.0); sửa prompt V2. |
| R10 | **Làm tròn và đơn vị** | Thấp | Tấn 3 chữ số vs kg; ranh giới ≤ và dung sai nhân dấu phẩy động. | Kg nguyên, `gioiHanKg` bằng số nguyên (§3.1); test P6, ca 18. |
| R11 | **Chuẩn hóa mã hợp đồng / CCCD (S1)** | Trung bình | `k_hd` cũ; CCCD khác kiểu (CMND 9 / CCCD 12; hậu tố `_N`). | §2.7: v16 hoặc truy vấn `upper(k_hd)`; so CCCD qua `cccdSo` sau `baseCccd`. Test T3–T5, T7 (xem §5). |
| R12 | **Phân bổ dựa trên hecta của HỢP ĐỒNG** | Trung bình | `lookup.js:641`: HECTA ở HoSoRung là của cả hợp đồng khi có nhiều rừng. Chia dự kiến theo `ha` của rừng nào? | Dự kiến theo rừng phải lấy `dienTich` của TỪNG rừng (ưu tiên `DienTich_m2` của ToaDoRung / `info.dienTich` của lô); nếu chỉ có HECTA cấp hợp đồng thì coi rừng THIẾU diện tích → không tự phân bổ (P10) và báo rõ. Q6. |
| R13 | **Hiệu năng / bộ nhớ** | Thấp | Hợp đồng vài trăm phiếu. | Độ phức tạp `O(P log P)`; chỉ mục `Map`; không có truy vấn SQL trong vòng lặp (dữ liệu đã nằm trong bộ nhớ giao diện). |

---

## 5. (d) Kế hoạch kiểm thử dữ liệu (ca đơn vị nên có)

Quy ước: viết trước, phải đỏ đúng lý do; dữ liệu giả lập; chạy riêng từng suite; không sửa test để xanh. Tên tệp gợi ý: `tests/phanbophieu.test.js`, `tests/doiso.test.js`, `tests/stage-doiso.test.js`, mở rộng `tests/lookup.test.js` / `tests/store*.test.js`.

### 5.1 `phanBoPhieu` (đơn vị, không IO)

| ID | Ca | Kỳ vọng |
|---|---|---|
| PB-01 | T14: 9 phiếu, rừng 1 dự kiến 61,75 t, dung sai 5 %, rừng 2 có dự kiến | Phiếu theo ngày vào rừng 1 tới khi tích lũy ≤ 64 837 kg; phần còn lại rừng 2; nếu rừng 2 vượt: `canhBao 'vuot-du-kien'` với `vuotKg` đúng; không chặn |
| PB-02 | T15: 1 rừng | Mọi phiếu vào rừng đó; `cach='mot-rung'` |
| PB-03 | T16a: `phieu` chỉ gồm phiếu "mới" (phiếu trùng đã bị loại) | Không phiếu nào bị phân bổ lại; P8 |
| PB-04 | T16b: `daDung` rừng 1 = 50 000 kg, giới hạn 64 837 | Chỉ còn 14 837 kg cho rừng 1; phiếu 15 000 sang rừng 2 |
| PB-05 | T17: rừng thiếu hecta / định mức | Không tự nhận; mọi phiếu `thieu-du-kien` khi không còn rừng đủ dữ liệu; `rungTay` vẫn gán |
| PB-06 | T18: `rungTay` đặt rừng 2, rồi `giuTay=false` | Bỏ đặt tay, tính lại toàn bộ; `giuTay=true` giữ đặt tay và cộng vào tích lũy |
| PB-07 | T18: `rungTay=''` | `chuaPhanBo 'nguoi-dung-bo'`, không bao giờ vào `gan` |
| PB-08 | T19: dung sai 0 và 0,30; phiếu vừa đúng bằng giới hạn | Vào rừng hiện tại (≤); thêm 1 kg thì sang rừng sau |
| PB-09 | Ranh giới số nguyên: 61,75 t × 5 % | giới hạn 64 837 kg (không 64 838) |
| PB-10 | Dung sai ngoài [0, 0,30], `NaN`, chuỗi | `{ok:false, loi:'dung-sai'}` |
| PB-11 | Khóa trùng nội bộ; thiếu ngày; kl ≤ 0; `boQua='lech-cccd'` | Vào `chuaPhanBo` với đúng `lyDo`; P1, P9 |
| PB-12 | Thứ tự: cùng ngày `PA2`/`PA10`; hoán vị đầu vào | Kết quả không đổi (P7); `PA2` trước `PA10` |
| PB-13 | `nhanDu=false` (nút "phần còn lại vào rừng N") | Dừng ở phiếu đầu tiên không vừa; các phiếu sau `het-du-kien` |
| PB-14 | Rừng cuối thiếu dự kiến, rừng giữa thiếu | "Rừng cuối" là rừng cuối trong E |
| PB-15 | Phiếu lớn hơn giới hạn của mọi rừng | Theo Q4 (mặc định: trôi sang rừng cuối) + `rung-bo-trong` |
| PB-16 | Invariants ngẫu nhiên có hạt giống cố định (property-style): P1, P2, P3, P4, P5 | Đúng với 1 000 bộ dữ liệu giả |
| PB-17 | Không sửa đầu vào (đóng băng sâu đối tượng vào) | Không ném lỗi, không đổi |
| PB-18 | Hiệu năng: 300 phiếu × 3 rừng (T20 phần dữ liệu) | < 50 ms |

### 5.2 `phatHienDoiSo`

| ID | Ca | Kỳ vọng |
|---|---|---|
| DS-01 | T25: Sheet khác số, cùng ngày + BKS + KL | `nghi-doi-so`, ứng viên đúng, mặc định không ghi |
| DS-02 | `|Δkg|` = 1 / = 2 | nghi / moi |
| DS-03 | BKS kiểu viết khác, cùng khóa | nghi |
| DS-04 | Một bên thiếu BKS hoặc ngày | `moi` |
| DS-05 | Ngày lệch 1 ngày | `moi` |
| DS-06 | Khớp khóa (kể cả `pa 1` = `PA1`) | `trung`, KHÔNG bao giờ `nghi` (N2) |
| DS-07 | Sheet mang số cũ trong `soCu` cùng ngày | `trung-so-cu` |
| DS-08 | Sheet mang số cũ nhưng KHÁC ngày so với `soCu[].ngay` | `moi` |
| DS-09 | Hai dòng Sheet cùng ứng viên | cả hai `canhTranh`; sau khi "Đổi số" một dòng và gọi lại, dòng kia thành `moi` |
| DS-10 | Sheet có cả số cũ và số mới của hai chuyến cùng ngày/BKS/KL | số cũ `trung`, số mới `moi` (N7) |
| DS-11 | Chuỗi `A→B→C`, Sheet mang A, B, C; rồi mang D | A/B/C `trung(-so-cu)`; D `nghi` |
| DS-12 | `phieuLo=[]` | Mọi dòng `moi` |
| DS-13 | Hoán vị `phieuSheet` | Cùng kết quả (N6) |
| DS-14 | Lô nhiều phiếu cùng khóa trong hai lô | `trung` kèm cả hai |
| DS-15 | Không sửa đầu vào | giữ nguyên |

### 5.3 Stage / `doiSoPhieu` / `commit`

| ID | Ca | Kỳ vọng |
|---|---|---|
| ST-01 | T25: "Đổi số theo Sheet" | Giữ `_id`, `id`, `kl`, `bienSo`, `xeRowId`; thêm `soCu` đủ trường; tổng tấn không đổi |
| ST-02 | T25: "Là chuyến khác" | Thêm dòng mới; tổng tấn tăng đúng bằng `kl` phiếu mới |
| ST-03 | T26: số mới trùng khóa trong lô | `{ok:false, ma:'TRUNG'}`, không ghi |
| ST-04 | Số mới trùng BÍ DANH dòng khác cùng ngày | Chặn; khác ngày thì cho |
| ST-05 | T26: lô chốt/dừng (`ctx.loKhoa`) | `LO_KHOA` |
| ST-06 | Thiếu lý do / số rỗng / số không đổi (chỉ khác hoa-thường) | `THIEU` / `KHONG_DOI` |
| ST-07 | Trùng ở lô khác | `CAN_XAC_NHAN` rồi `ok` sau khi xác nhận |
| ST-08 | T26: `merge` Sheet mang số cũ | Khớp theo bí danh, `rep.add=0`; số hiện hành giữ nguyên; ghi chú |
| ST-09 | `merge` số cũ nhưng KL khác | `pending` "Cần đối chiếu" như cùng số phiếu thông thường |
| ST-10 | `resolve(...'other')` với số trùng bí danh cùng ngày | Báo "đã có trong lô" |
| ST-11 | `commit` | `soLog` đúng số mục, `pid` ổn định, không sinh khi dòng chỉ thêm mới |
| ST-12 | `sig`/`dirty` | Dòng chỉ đổi `soCu` → `dirty` |
| ST-13 | Tương thích ngược | Dòng không có `soCu`: mọi hàm hoạt động như trước; toàn bộ `tests/stage.test.js` hiện có xanh y như trước |
| ST-14 | `soCu` > 20 | Giữ 20 mục mới nhất; `soLog` vẫn đủ |
| ST-15 | Chuỗi đổi số A→B→A | Cho phép; `soCu=[A,B]` |

### 5.4 Lưu trữ / chốt / băm / migration

| ID | Ca | Kỳ vọng |
|---|---|---|
| LT-01 | Đi vòng `Store.save` → `load` | `soCu`, `soLog`, `info.nguon`, `taoLuc` giữ nguyên |
| LT-02 | `saveDelta` vs `save` | Cùng `hash` (bất biến delta) với lô có trường mới |
| LT-03 | Lô cũ (không trường mới) sau nâng cấp | `hash`, `user_version` (=15, không v16 nếu chỉ phần phiếu) không đổi; ảnh chụp JSON cũ không đổi một byte |
| LT-04 | Lô đã chốt cũ | `kiemToanVen` → `nguyen-ven` |
| LT-05 | Ghi `soCu` vào lô chốt qua `Store.save` | Ném `LOCKED` (T10), không ghi gì |
| LT-06 | Mở khóa → đổi số → chốt lại | Phiên bản mới, `hashDL` khác, gói cũ nguyên |
| LT-07 | Khôi phục (`backup`) có `soCu` | Giữ nguyên |
| LT-08 | `snap` trong `stSave` | Lỗi lưu → `soLog` hoàn lại, bản nháp còn (e2e) |
| LT-09 | **Nếu có v16:** chạy v16 hai lần | `k_hd` giống nhau; số dòng/tổng/checksum `data` không đổi; sao lưu trước nâng cấp tồn tại |
| LT-10 | `info.nguon` áp dụng lần 2 không đổi | Băm lô không đổi (R7) |

### 5.5 Tra cứu (S1, phần dữ liệu)

| ID | Ca | Kỳ vọng |
|---|---|---|
| LK-01 | `build(hd)`: `hd-001`, `HD-001 `, `HD-001` | Cùng một hợp đồng |
| LK-02 | T3: một hợp đồng ở HoSoRung có hai CCCD khác nhau | `LOI_DU_LIEU` + số dòng, không cho cập nhật |
| LK-03 | T4: CCCD HoSoKeo ≠ HoSoRung | `lech[]` có số dòng, dòng không tích sẵn, không phân bổ (P9) |
| LK-04 | T5: CCCD chủ rừng app ≠ Sheet | Chặn ghi chủ rừng |
| LK-05 | Hậu tố `_2` ở "Mã KH_CCCD" | So sau `baseCccd` + `cccdSo` |
| LK-06 | CMND 9 số vs CCCD 12 số cùng người | Khác khóa → `lech` (Q8) |
| LK-07 | T7: Sheet cũ đủ cột | Đầu ra bằng v3.2.0 |
| LK-08 | Thiếu CCCD ở một tab | Chỉ ghi chú |

### 5.6 Hồi quy và e2e (T-liên quan)

`scripts/so-ban-in.js` 206/206 trước và sau; e2e T8 (hai lần liên tiếp), T10 (lô khóa), T14–T20, T25–T26; đối chiếu `lkPhieuRows` mới (có trạng thái `nghi`) trên dữ liệu lô cũ trả cùng `st` như bản hiện hành khi không có `soCu`.

---

## 6. (e) Câu hỏi mở (cần CHỦ / STAFF_FSC quyết)

| # | Câu hỏi | Mặc định thiết kế đã chọn |
|---|---|---|
| Q1 | Phát hiện "Nghi đổi số" chỉ ở xem trước Google Sheets (S8) hay cả nạp Excel / `stage.merge`? Excel cùng có rủi ro cộng đôi khi số phiếu đổi. | Chỉ Sheets trong G1; bí danh `soCu` ở `merge` bảo vệ cả hai đường; phát hiện cho Excel để PR sau. |
| Q2 | "Vượt dự kiến X tấn" tính theo sản lượng dự kiến hay theo giới hạn có dung sai? | Cảnh báo ĐỎ khi vượt giới hạn có dung sai, `X = tổng − dự kiến`; trong khoảng (dự kiến, giới hạn] chỉ nhắc vàng "trong dung sai". |
| Q3 | Thêm `f.taoLuc` (không migration) để cố định "thứ tự nhập", hay chấp nhận thứ tự trong `forests` hiện nay? | Thêm `taoLuc`, không điền ngược. |
| Q4 | Phiếu lớn hơn cả giới hạn của một rừng đang trống: nghiêm theo quy tắc (sang rừng sau, rừng này có thể trống) hay "phiếu đầu của rừng trống luôn được nhận"? | Nghiêm theo quy tắc + cảnh báo `rung-bo-trong`. |
| Q5 | Hợp đồng chỉ có 1 rừng nhưng thiếu hecta/định mức: S5.2 ("mặc định rừng đó") hay S5.4 ("không tự phân bổ")? | S5.2 thắng (không có lựa chọn nào khác); chỉ cảnh báo thiếu dự kiến. |
| Q6 | Nhiều rừng: hecta lấy từ đâu? HECTA ở HoSoRung là của cả hợp đồng (`lookup.js:641`). | Ưu tiên diện tích riêng từng rừng (ToaDoRung `DienTich_m2` / `info.dienTich` của lô); chỉ có hecta hợp đồng thì coi thiếu. |
| Q7 | Lý do đổi số khi theo Sheet: điền sẵn có chấp nhận không, hay bắt gõ? | Điền sẵn "Google Sheets đổi số, dòng N", người dùng sửa được; thao tác tay thì bắt gõ. |
| Q8 | CCCD cũ 9 số (CMND) và CCCD 12 số của cùng một người: coi là lệch (theo `cccdSo`) hay có quy tắc cầu nối? | Coi là lệch, người dùng quyết (không tự suy). |
| Q9 | `updateRow` đổi `soPhieu` của dòng đã lưu: tự ghi `soCu` (mặc định) hay từ chối? | Tự ghi với lý do "Sửa tay (không có lý do)"; giao diện chuẩn đi qua Đổi số. |
| Q10 | Giới hạn `soCu` 20 mục và `lyDo` ≥ 3 ký tự có hợp lý? | Có. |
| Q11 | Có thêm `_src.hd`/`_src.pb` (truy vết vì sao phiếu vào rừng) hay giữ tối thiểu `info.nguon`? | Thêm, vì rẻ và hữu ích cho FSC; bỏ được. |
| Q12 | Dung sai nhớ giữa các lần mở (localStorage/meta) hay mặc định 5 % mỗi lần? | Mặc định 5 % mỗi lần mở, không lưu. |
| Q13 | Ngưỡng "cùng ngày" cho nghi đổi số: có cần nới cho cân qua đêm (sau 00:00)? | Không nới (đúng quy tắc đã chốt). |
| Q14 | Chuẩn hóa mã hợp đồng bỏ dấu tiếng Việt hay chỉ hoa/thường? | Chỉ hoa/thường + khoảng trắng (đúng S1). |
| Q15 | PR-2 chọn v16 (tính lại `k_hd`) hay truy vấn `upper(k_hd)`? | v16. |

---

## 7. Phụ lục

### 7.1 Tệp sẽ bị chạm (khi sang giai đoạn mã), theo PR trong prompt

| PR | Tệp | Dữ liệu |
|---|---|---|
| PR-2 | `src/lookup.js` (`keysOf`, `build`, kiểm tra chéo), `src/store.js` (nếu v16) | `k_hd` chuẩn hóa; `LOI_DU_LIEU`/`lech[]` |
| PR-3b | `src/phanbophieu.js` (mới), `ui/app/17-*` | không đổi lược đồ |
| PR-3d | `src/stage.js` (`doiSoPhieu`, bí danh ở `merge`/`resolve`, `commit.soLog`), `src/bks.js` (`khoaTatCa`), `src/doiso.js` (mới), `ui/app/17-d` (`lkPhieuRows` trạng thái `nghi`), `ui/app/11-d` (`snap`, nối `soLog`), `ui/app/12-d` (khóa ô Số phiếu), `src/timkiem.js` | `soCu`, `soLog` |
| PR-4 | `ui/app/17-e` (`info.nguon`, `taoLuc` khi tạo lô, `_src.hd/pb`), tài liệu | `nguon` |

### 7.2 Đối chiếu danh sách kiểm tra kỹ năng

- `hak-data-integrity`: bản đồ khóa (§1, §2.6), dòng mồ côi/trùng khóa (R1, R2, P-bất biến), giao dịch/idempotent (R7, LT-10), khôi phục backup (R6, LT-07), thử migration trên dữ liệu ẩn danh (LT-03, LT-09), báo cáo sai lệch trước khi sửa (tài liệu này).
- `hak-migration-manager`: nguồn/đích/phiên bản (§2.7), backup + kiểm tra trước ghi (v16 chạy sau `snapshotFile`), chạy lại không nhân đôi (idempotent), rollback (R6).
- `hak-parent-child-data-model`: cha = lô/hợp đồng, con = phiếu; khóa ổn định không dùng số thứ tự hiển thị làm khóa (dùng `_id`/`id`); đối chiếu tổng cha = tổng con theo đơn vị kg làm tròn từng phiếu (P3, R10); chính sách xóa: xóa phiếu giữ `soLog`; tách logic dữ liệu khỏi giao diện (hàm thuần ở `src/`).
