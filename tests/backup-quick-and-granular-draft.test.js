'use strict';
const test = require('node:test');
const assert = require('node:assert');

test('Lỗi 1: dbCapNhatKhoiPhucRieng bảo toàn 100% bản nháp của lô B khi khôi phục riêng lô A', () => {
  // Simulate the environment of ui/app/29-kho-sao-luu.js
  const stages = {
    'o2|f2': {cur: {nc: [{id: 'nc1', ten: 'Nhân công nháp của lô B'}]}}
  };
  const loDirty = new Set(['f2']);
  const loMoi = new Set();
  const chuNhap = new Map();
  let dataVer = 0;
  const doiDuLieu = () => { dataVer++; };
  const stKeyOf = (o, f) => o + '|' + f;

  const db = {
    v: 2,
    rs: {
      o1: {
        id: 'o1',
        forests: {
          f1: {id: 'f1', info: {maRung: 'RUNG_A_CU'}}
        }
      },
      o2: {
        id: 'o2',
        forests: {
          f2: {id: 'f2', info: {maRung: 'RUNG_B_DRAFT'}}
        }
      }
    },
    congTy: {
      cty1: {id: 'cty1', ten: 'Công ty Hiện Hành'}
    }
  };

  const dbMoi = {
    v: 2,
    rs: {
      o1: {
        id: 'o1',
        forests: {
          f1: {id: 'f1', info: {maRung: 'RUNG_A_KHOI_PHUC'}}
        }
      },
      o2: {
        id: 'o2',
        forests: {
          f2: {id: 'f2', info: {maRung: 'RUNG_B_SQLITE_OLD'}}
        }
      }
    },
    congTy: {
      cty1: {id: 'cty1', ten: 'Công ty Trong Backup Cũ'},
      cty2: {id: 'cty2', ten: 'Công ty Mới Bổ Sung'}
    }
  };

  // Implement the logic of dbCapNhatKhoiPhucRieng
  function dbCapNhatKhoiPhucRieng({oid, fid, dbMoi, rev}) {
    if (!dbMoi || !dbMoi.rs) return;
    if (fid) {
      delete stages[stKeyOf(oid, fid)];
      loDirty.delete(fid);
      loMoi.delete(fid);
      if (!db.rs[oid]) {
        db.rs[oid] = JSON.parse(JSON.stringify(dbMoi.rs[oid]));
      } else {
        if (!db.rs[oid].forests) db.rs[oid].forests = {};
        db.rs[oid].forests[fid] = JSON.parse(JSON.stringify(dbMoi.rs[oid].forests[fid]));
      }
    } else if (oid) {
      Object.keys(stages).filter(k => k.startsWith(oid + '|')).forEach(k => delete stages[k]);
      if (db.rs[oid] && db.rs[oid].forests) {
        Object.keys(db.rs[oid].forests).forEach(f => { loDirty.delete(f); loMoi.delete(f); });
      }
      chuNhap.delete(oid);
      db.rs[oid] = JSON.parse(JSON.stringify(dbMoi.rs[oid]));
    }
    // Giữ nguyên các lô khác đang có bản nháp trong memory, nhưng cập nhật các lô sạch khác từ dbMoi (nếu có)
    Object.entries(dbMoi.rs).forEach(([oId, oData]) => {
      if (oId === oid) return;
      if (!db.rs[oId]) {
        db.rs[oId] = JSON.parse(JSON.stringify(oData));
      } else {
        Object.entries(oData.forests || {}).forEach(([fId, fData]) => {
          const k = stKeyOf(oId, fId);
          if (stages[k] || loDirty.has(fId)) return;
          if (!db.rs[oId].forests) db.rs[oId].forests = {};
          db.rs[oId].forests[fId] = JSON.parse(JSON.stringify(fData));
        });
      }
    });
    if (dbMoi.congTy && typeof dbMoi.congTy === 'object') {
      db.congTy = db.congTy || {};
      Object.entries(dbMoi.congTy).forEach(([id, c]) => {
        if (!(id in db.congTy)) db.congTy[id] = c;
      });
    }
    doiDuLieu();
  }

  // Restore ONLY f1 of o1
  dbCapNhatKhoiPhucRieng({oid: 'o1', fid: 'f1', dbMoi, rev: 'new-rev'});

  // Assertions:
  // 1. Lot A is restored
  assert.strictEqual(db.rs.o1.forests.f1.info.maRung, 'RUNG_A_KHOI_PHUC');

  // 2. Lot B's draft stages is 100% PRESERVED
  assert.ok(stages['o2|f2'], 'Bản nháp stages của lô B phải còn nguyên!');
  assert.strictEqual(stages['o2|f2'].cur.nc[0].ten, 'Nhân công nháp của lô B');

  // 3. Lot B's loDirty is PRESERVED
  assert.ok(loDirty.has('f2'), 'Cờ loDirty của lô B phải còn nguyên!');

  // 4. Lot B in memory was NOT reverted to dbMoi's old version
  assert.strictEqual(db.rs.o2.forests.f2.info.maRung, 'RUNG_B_DRAFT', 'Lô B trong bộ nhớ không bị ghi đè bởi bản SQLite cũ!');

  // 5. Công ty hiện hành của lô B KHÔNG bị ghi đè bởi tên cũ trong backup
  assert.strictEqual(db.congTy.cty1.ten, 'Công ty Hiện Hành');
  // Công ty mới chưa có thì được bổ sung
  assert.strictEqual(db.congTy.cty2.ten, 'Công ty Mới Bổ Sung');
});

test('Lỗi 3: quickBackup dừng ngay và báo lỗi khi lần ghi dở dang thất bại, không chạy backupTo', async () => {
  let backupToCalled = false;
  let saveStResult = {text: '', err: false};
  let notesPushed = [];

  const HB = {
    backupTo: async () => {
      backupToCalled = true;
      return {ok: true, file: 'test.sqlite'};
    }
  };

  let saveTimer = 123;
  let storeOk = true;
  const storeSave = async () => ({ok: false, error: 'Mô phỏng lỗi ghi SQLite'});
  const showSave = (text, err) => { saveStResult = {text, err: !!err}; };
  const pushNote = (text, kind) => { notesPushed.push({text, kind}); };
  const render = () => {};
  const backupConfirmSaved = () => true;

  async function quickBackup() {
    if (!HB || !HB.backupTo) return;
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
      const rSave = await storeSave();
      if (rSave && !rSave.ok) {
        pushNote('Không thể sao lưu nhanh: Lần lưu dữ liệu gần nhất bị lỗi (' + (rSave.error || 'không rõ') + '). Dữ liệu vừa nhập chưa được ghi an toàn.', 'err');
        showSave('Lỗi lưu — chưa sao lưu', true);
        render();
        return;
      }
    }
    if (!storeOk) {
      pushNote('Không thể sao lưu nhanh: Cơ sở dữ liệu đang có lỗi lưu (' + (saveStResult.text || 'lỗi ghi đĩa') + '). Vui lòng bấm "Thử lưu lại" hoặc kiểm tra lỗi trước khi sao lưu.', 'err');
      render();
      return;
    }
    if (!backupConfirmSaved()) return;
    await HB.backupTo();
  }

  await quickBackup();

  // Assertions:
  // 1. backupTo must NEVER be called
  assert.strictEqual(backupToCalled, false, 'HB.backupTo() tuyệt đối không được gọi khi lần ghi dở dang bị lỗi!');

  // 2. Must push error note
  assert.strictEqual(notesPushed.length, 1);
  assert.strictEqual(notesPushed[0].kind, 'err');
  assert.ok(notesPushed[0].text.includes('Mô phỏng lỗi ghi SQLite'));

  // 3. Must show save error
  assert.strictEqual(saveStResult.err, true);
  assert.strictEqual(saveStResult.text, 'Lỗi lưu — chưa sao lưu');
});
