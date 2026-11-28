'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {Store} = require('../src/store');
const KhoSaoLuu = require('../src/khosaoluu');
const Backup = require('../src/backup');

test('Granular Restore: docChiTiet, khoiPhucChuRong, khoiPhucLoRungTuBanSao', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hak-test-gran-'));
  try {
    const dbFile = path.join(tmpDir, 'test.sqlite');
    const bkDir = path.join(tmpDir, 'backups');
    fs.mkdirSync(bkDir, {recursive: true});

    const store = new Store(dbFile, {backupDir: bkDir});
    
    // Initial data: 2 owners, each with 1 forest
    const initData = {
      v: 2,
      rs: {
        o1: {
          id: 'o1',
          info: {ma: 'CR01', ten: 'Chủ Rừng 1', cccd: '001'},
          forests: {
            f1: {id: 'f1', info: {maRung: 'RUNG01', tenRung: 'Rừng 1', dienTich: 5.5}, pc: [{soPhieu: 'P01', klKg: 15000}]}
          }
        },
        o2: {
          id: 'o2',
          info: {ma: 'CR02', ten: 'Chủ Rừng 2', cccd: '002'},
          forests: {
            f2: {id: 'f2', info: {maRung: 'RUNG02', tenRung: 'Rừng 2', dienTich: 3.2}, pc: [{soPhieu: 'P02', klKg: 8000}]}
          }
        }
      }
    };
    store.save(initData);

    // Make backup
    const resBackup = await Backup.backupAll({
      db: store.db,
      data: store.load({kemGoi: true}),
      outDir: bkDir,
      outDirJson: bkDir,
      dbBytes: 100000
    });
    assert.strictEqual(resBackup.ok, true);
    const sqlFile = resBackup.sqlite.file;

    // Test docChiTiet
    const detail = KhoSaoLuu.docChiTiet(sqlFile);
    assert.strictEqual(detail.soChuRong, 2);
    assert.strictEqual(detail.soLoRung, 2);
    assert.strictEqual(detail.owners.length, 2);
    assert.strictEqual(detail.owners[0].forests[0].tongKg, 15000);

    // Now modify the live database: delete o1, and edit o2's forest
    const currentData = store.load();
    delete currentData.rs.o1;
    currentData.rs.o2.forests.f2.info.tenRung = 'Rừng 2 Đã Sửa Hôm Nay';
    store.save(currentData, {allowBulkDelete: true});

    const check1 = store.load();
    assert.strictEqual(check1.rs.o1, undefined, 'o1 should be deleted');
    assert.strictEqual(check1.rs.o2.forests.f2.info.tenRung, 'Rừng 2 Đã Sửa Hôm Nay');

    // Test khoiPhucChuRong: restore ONLY o1 from sqlFile
    const rOwner = KhoSaoLuu.khoiPhucChuRong(store, sqlFile, 'o1');
    assert.strictEqual(rOwner.ten, 'Chủ Rừng 1');

    const check2 = store.load();
    assert.ok(check2.rs.o1, 'o1 must be restored');
    assert.strictEqual(check2.rs.o1.info.ten, 'Chủ Rừng 1');
    assert.strictEqual(check2.rs.o2.forests.f2.info.tenRung, 'Rừng 2 Đã Sửa Hôm Nay', 'o2 must remain untouched!');

    // Test khoiPhucLoRungTuBanSao: restore original f2 into o2
    const rForest = KhoSaoLuu.khoiPhucLoRungTuBanSao(store, sqlFile, 'o2', 'f2');
    assert.strictEqual(rForest.maRung, 'RUNG02');

    const check3 = store.load();
    assert.strictEqual(check3.rs.o2.forests.f2.info.tenRung, 'Rừng 2', 'f2 was restored to original');
    assert.ok(check3.rs.o1, 'o1 is still there');

    // TEST REGRESSION BUG 2: CongTy protection during granular restore
    // Set up live company with updated name
    const liveWithCty = store.load();
    liveWithCty.congTy = {
      cty1: {id: 'cty1', ten: 'Công ty Hiện Hành Của Lô B', diaChi: 'Hà Nội'}
    };
    liveWithCty.rs.o2.forests.f2.info.muaHang = {congTyId: 'cty1'};
    store.save(liveWithCty);

    // Create an old backup using a separate DB that has cty1 with an old name and ctyNewForA
    const dbFile2 = path.join(tmpDir, 'backup-source.sqlite');
    const store2 = new Store(dbFile2, {backupDir: bkDir});
    const oldBackupData = JSON.parse(JSON.stringify(liveWithCty));
    oldBackupData.congTy.cty1.ten = 'Tên Cũ Bị Lỗi';
    oldBackupData.congTy.ctyNewForA = {id: 'ctyNewForA', ten: 'Công ty Mới Của Lô A'};
    oldBackupData.rs.o1.forests.f1.info.muaHang = {congTyId: 'ctyNewForA'};
    store2.save(oldBackupData);

    const resOldBackup = await Backup.backupAll({
      db: store2.db,
      data: store2.load({kemGoi: true}),
      outDir: bkDir,
      outDirJson: bkDir,
      dbBytes: 100000
    });
    assert.strictEqual(resOldBackup.ok, true);
    store2.close();

    // Restore ONLY lot f1 of o1
    KhoSaoLuu.khoiPhucLoRungTuBanSao(store, resOldBackup.sqlite.file, 'o1', 'f1');

    const checkCty = store.load();
    // 1. cty1 MUST NOT be overwritten with 'Tên Cũ Bị Lỗi'
    assert.strictEqual(checkCty.congTy.cty1.ten, 'Công ty Hiện Hành Của Lô B', 'Existing company must NOT be overwritten by granular restore!');
    // 2. ctyNewForA (used by lot f1) was missing, so it should be added
    assert.ok(checkCty.congTy.ctyNewForA, 'Missing company needed by restored lot must be added');
    assert.strictEqual(checkCty.congTy.ctyNewForA.ten, 'Công ty Mới Của Lô A');

    store.close();
  } finally {
    try { fs.rmSync(tmpDir, {recursive: true, force: true, maxRetries: 10, retryDelay: 100}); } catch (_) {}
  }
});

test('khôi phục riêng JSON và SQLite ánh xạ ID đích, giữ lịch sử chốt trong đúng phạm vi', async () => {
  const V = require('../src/vongdoi');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hak-test-gran-id-'));
  const src = new Store(path.join(dir, 'src.sqlite'));
  const lo = (id, maRung, tenRung) => ({id, info: {maRung, tenRung}, nc: [], dx: [], pc: [], exp: {}});
  const db = (oid, aid, tenRung) => ({v: 2, rs: {[oid]: {id: oid, info: {ma: 'CR01', cccd: '049000000001'},
    forests: {[aid]: lo(aid, 'A', tenRung), b: lo('b', 'B', 'Lô B')}}}});
  const at = '2026-11-26T12:00:00.000Z';
  try {
    src.save(db('chuTep', 'aTep', 'Lô từ sao lưu'));
    const first = src.load(), f = first.rs.chuTep.forests;
    assert.ok(V.chot(f.aTep, 'Người kiểm', at).ok);
    assert.ok(V.chot(f.b, 'Người kiểm', at).ok);
    src.save(first);
    assert.ok(V.moKhoa(f.aTep, 'Sửa thông tin', 'Người kiểm', at).ok);
    src.save(first);
    assert.ok(V.chot(f.aTep, 'Người kiểm', at).ok);
    src.save(first);
    const files = await Backup.backupAll({db: src.db, data: {...src.load({kemGoi: true}), goiLichSu: src.goiTatCa()}, outDir: dir});
    assert.ok(files.ok, files.message);

    for (const kind of ['json', 'sqlite']) {
      const dst = new Store(path.join(dir, kind + '.sqlite'));
      try {
        dst.save(db('chuMay', 'aMay', 'Lô hiện tại'));
        const result = KhoSaoLuu.khoiPhucLoRungTuBanSao(dst, files[kind].file, 'chuTep', 'aTep');
        assert.deepEqual(result.dich, {ownerId: 'chuMay', forestIds: ['aMay']});
        const aa = dst.load().rs.chuMay.forests;
        assert.equal(aa.aMay.info.tenRung, 'Lô từ sao lưu');
        assert.equal(aa.aTep, undefined);
        assert.equal(aa.b.info.tenRung, 'Lô B');
        assert.deepEqual(dst.dsGoi('b'), []);
        assert.deepEqual(dst.dsGoi('aTep'), []);
        const lich = dst.lichSuGoi('aMay');
        assert.deepEqual(lich.map(x => [x.phienBan, x.ok]), [[1, true], [2, true]]);
        assert.equal(V.kiemToanVen(aa.aMay, null, dst.kiemGoi('aMay')).ok, true);
      } finally { dst.close(); }
    }
    assert.equal(src.kiemGoi('aTep').ok, true);
  } finally {
    src.close();
    fs.rmSync(dir, {force: true, recursive: true});
  }
});
