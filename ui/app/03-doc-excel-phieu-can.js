/* ========== Đọc Excel và phiếu cân ==========
 * Logic nằm ở src/docphieucan.js (có kiểm thử đơn vị). Giao diện cấp ctx: getter đọc giá trị HIỆN TẠI của cơ sở dữ liệu đang mở,
 * tiện ích và các module khác ngay lúc gọi (không chụp lại lúc khởi tạo), rồi lấy lại các tên cũ để module khác dùng như trước. */
const KT_DOCPHIEUCAN = HAKDocPhieuCan.create({
  get HAKCheoLo() { return HAKCheoLo; },
  get HAKDates() { return HAKDates; },
  get HAKGiayTo() { return HAKGiayTo; },
  get HAKModel() { return HAKModel; },
  get HAKMoney() { return HAKMoney; },
  get HAKPhieuCan() { return HAKPhieuCan; },
  get H_LEGACY() { return H_LEGACY; },
  get cheoCtx() { return cheoCtx; },
  get curForest() { return curForest; },
  get dataVer() { return dataVer; },
  get db() { return db; },
  get fmt() { return fmt; },
  get fmtRaw() { return fmtRaw; },
  get groupsDX() { return groupsDX; },
  get nhanHdId() { return nhanHdId; },
  get normCccd() { return normCccd; },
  get normDate() { return normDate; },
  get normNK() { return normNK; },
  get numSwap() { return numSwap; },
  get pad2() { return pad2; },
  get phieuSaiHd() { return phieuSaiHd; },
  get toDec() { return toDec; },
  get trim() { return trim; },
  get volumeOf() { return volumeOf; }
});
const {PC_NGUONG_MAC_DINH, VN_D, bienKey, checkPC, dateKey, doiChieuPcVanChuyen, doiXeOfPc, doiXeTen, doiXeThieuKy, fmtT, groupsPC, hanLoiOf, hdTenKhop, keyName, khoaXe, moneyCell, moneyWords, nhoTheoPc, noneVal, normDX, normDX0, normNC, normPC, parseSheet, payVC, pcKhopXeVC, pcNgoaiPhamViVC,
pcSapNho, pcSapTheoNgay, pcTheoDoiNho, pcThuocNhom, timeCell, totalKg, tripsOf, words3} = KT_DOCPHIEUCAN;
