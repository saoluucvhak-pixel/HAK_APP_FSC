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

    store.close();
  } finally {
    try { fs.rmSync(tmpDir, {recursive: true, force: true, maxRetries: 10, retryDelay: 100}); } catch (_) {}
  }
});
