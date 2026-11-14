'use strict';
/* Bộ chạy chung cho các kiểm thử đầu-cuối Electron (scripts/e2e*.js). Thay cho chuỗi "node a && node b && ..." trong package.json:
 * - chạy LẦN LƯỢT từng bộ theo SUITES (thứ tự cũ), không dừng ở bộ lỗi đầu tiên (trừ --bail), mỗi bộ có giới hạn thời gian;
 * - đọc dòng "ĐẠT  ..." / "LỖI  ..." của từng bộ, mã thoát 0 = đạt, 1 = có kiểm tra lỗi, 2 = lỗi chạy (ngoại lệ);
 * - in bảng tổng hợp và ghi báo cáo reports/e2e/summary.{json,md} + nhật ký từng bộ reports/e2e/logs/<bộ>.log;
 * - mã thoát 1 nếu có bộ không đạt; báo lỗi nếu có file scripts/e2e-*.js chưa khai báo trong SUITES (tránh quên chạy).
 * Linux không có màn hình (DISPLAY trống) thì tự chạy qua xvfb-run nếu có.
 * Dùng: node scripts/e2e-all.js [tên bộ ...] [--bail] [--list] [--out <thư mục>] [--timeout <giây>]
 *   ví dụ: node scripts/e2e-all.js lorung malo   (chỉ chạy e2e-lorung và e2e-malo) */
const {spawn, spawnSync} = require('child_process');
const fs = require('fs'), path = require('path');

const SUITES = ['e2e', 'e2e-lookup', 'e2e-lookup2', 'e2e-export', 'e2e-reports', 'e2e-skins', 'e2e-hopdong', 'e2e-vanchuyen', 'e2e-congty', 'e2e-lorung',
  'e2e-malo', 'e2e-nangcap', 'e2e-mau', 'e2e-hopdongso', 'e2e-sohd', 'e2e-nangcap2', 'e2e-haidot', 'e2e-inde', 'e2e-inan2', 'e2e-khoan', 'e2e-dinhmuc', 'e2e-keo',
  'e2e-caidat2', 'e2e-bienso', 'e2e-pcmau', 'e2e-bcld', 'e2e-bcloc', 'e2e-quytrinh', 'e2e-chamcong', 'e2e-phieucan', 'e2e-pcgio', 'e2e-luongpc', 'e2e-doichieu',
  'e2e-tongquan', 'e2e-luuvaolo', 'e2e-idtrung', 'e2e-gopdulieu', 'e2e-nguoiky', 'e2e-ngay2culy', 'e2e-dinhdang', 'e2e-tgkhai', 'e2e-dinhbien', 'e2e-nhieudoi',
  'e2e-doisoat', 'e2e-taitoanbo', 'e2e-dongapp', 'e2e-batbien', 'e2e-nhaplieu', 'e2e-caidat', 'e2e-bm08', 'e2e-dulieu', 'e2e-mamau', 'e2e-tentab', 'e2e-bannhap',
  'e2e-manhinh', 'e2e-chuky', 'e2e-tusaoluu'];
const NOT_SUITES = ['e2e-all'];   // file e2e-*.js không phải bộ kiểm thử

const root = path.join(__dirname, '..');
function parseArgs(argv) {
  const o = {names: [], bail: false, list: false, out: path.join(root, 'reports', 'e2e'), timeout: 600};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--bail') o.bail = true;
    else if (a === '--list') o.list = true;
    else if (a === '--out') o.out = path.resolve(argv[++i]);
    else if (a === '--timeout') o.timeout = Math.max(10, +argv[++i] || 600);
    else o.names.push(a.replace(/\.js$/, '').replace(/^scripts[\\/]/, ''));
  }
  return o;
}
/* Kết quả một bộ từ nội dung in ra và mã thoát */
function summarize(name, text, code, ms, timedOut) {
  const lines = text.split(/\r?\n/);
  const pass = lines.filter(l => l.startsWith('ĐẠT')).length, failed = lines.filter(l => l.startsWith('LỖI')).map(l => l.replace(/^LỖI\s+/, ''));
  const status = timedOut ? 'quá giờ' : code === 0 && !failed.length ? 'đạt' : code === 2 || (code !== 0 && code !== 1) ? 'lỗi chạy' : 'không đạt';
  return {name, status, ok: status === 'đạt', exitCode: code, pass, fail: failed.length, failed: failed.slice(0, 50), seconds: Math.round(ms / 100) / 10,
    tail: status === 'đạt' ? [] : lines.filter(Boolean).slice(-15)};
}
function unknownSuites() {
  return fs.readdirSync(__dirname).filter(n => /^e2e(-.*)?\.js$/.test(n)).map(n => n.slice(0, -3)).filter(n => !SUITES.includes(n) && !NOT_SUITES.includes(n));
}
function launcher() {
  if (process.platform === 'linux' && !process.env.DISPLAY && spawnSync('sh', ['-c', 'command -v xvfb-run'], {stdio: 'ignore'}).status === 0) return f => ['xvfb-run', ['-a', process.execPath, f]];
  return f => [process.execPath, [f]];
}
function runOne(name, o, logDir, cmd) {
  return new Promise(resolve => {
    const t0 = Date.now(), [bin, args] = cmd(path.join(__dirname, name + '.js'));
    const ch = spawn(bin, args, {cwd: root, env: process.env, stdio: ['ignore', 'pipe', 'pipe']});
    let text = '', timedOut = false;
    ch.stdout.on('data', d => { text += d; }); ch.stderr.on('data', d => { text += d; });
    const timer = setTimeout(() => { timedOut = true; ch.kill('SIGKILL'); }, o.timeout * 1000);
    ch.on('close', code => {
      clearTimeout(timer);
      fs.writeFileSync(path.join(logDir, name + '.log'), text);
      resolve(summarize(name, text, code, Date.now() - t0, timedOut));
    });
    ch.on('error', e => { clearTimeout(timer); text += '\n' + e.message; });
  });
}
function markdown(rep) {
  const t = rep.totals, row = r => '| ' + [r.name, r.ok ? 'đạt' : '**' + r.status + '**', r.pass, r.fail, r.seconds + ' s'].join(' | ') + ' |';
  return ['# Kết quả kiểm thử đầu-cuối (Electron)', '', 'Thời điểm: ' + rep.startedAt + ' · Electron ' + rep.electron + ' · ' + rep.platform, '',
    '**' + t.suitesOk + '/' + t.suites + ' bộ đạt · ' + t.pass + ' kiểm tra đạt · ' + t.fail + ' kiểm tra lỗi · ' + t.seconds + ' s**' + (rep.skipped.length ? ' · bỏ qua (--bail): ' + rep.skipped.length + ' bộ' : ''), '',
    '| Bộ | Kết quả | Đạt | Lỗi | Thời gian |', '| --- | --- | --- | --- | --- |', ...rep.results.map(row), '',
    ...rep.results.filter(r => !r.ok).flatMap(r => ['## ' + r.name + ' — ' + r.status, '', ...r.failed.map(f => '- ' + f), '', '```', ...r.tail, '```', ''])].join('\n');
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const extra = unknownSuites();
  if (extra.length) { console.error('Có file kiểm thử chưa khai báo trong SUITES (scripts/e2e-all.js): ' + extra.join(', ')); process.exit(2); }
  if (o.list) { console.log(SUITES.join('\n')); return; }
  const want = o.names.length ? o.names.map(n => SUITES.includes(n) ? n : SUITES.includes('e2e-' + n) ? 'e2e-' + n : null) : SUITES;
  if (want.includes(null)) { console.error('Không có bộ kiểm thử: ' + o.names.filter((n, i) => want[i] === null).join(', ') + '. Xem danh sách: node scripts/e2e-all.js --list'); process.exit(2); }
  const logDir = path.join(o.out, 'logs'); fs.mkdirSync(logDir, {recursive: true});
  const cmd = launcher(), t0 = Date.now(), results = [], skipped = [];
  let electron = ''; try { electron = require('electron/package.json').version; } catch (e) { /* không rõ */ }
  for (let i = 0; i < want.length; i++) {
    if (o.bail && results.some(r => !r.ok)) { skipped.push(want[i]); continue; }
    const r = await runOne(want[i], o, logDir, cmd); results.push(r);
    console.log((r.ok ? 'ĐẠT ' : 'LỖI ') + ' [' + (i + 1) + '/' + want.length + '] ' + r.name.padEnd(16) + ' ' + String(r.pass).padStart(4) + ' đạt' + (r.fail ? ', ' + r.fail + ' lỗi' : '') + (r.ok ? '' : ' (' + r.status + ', mã thoát ' + r.exitCode + ')') + '  ' + r.seconds + ' s');
    if (!r.ok) { r.failed.slice(0, 10).forEach(f => console.log('       · ' + f)); if (!r.failed.length) r.tail.slice(-5).forEach(l => console.log('       | ' + l)); }
  }
  const sum = k => results.reduce((a, r) => a + r[k], 0);
  const rep = {startedAt: new Date(t0).toISOString(), platform: process.platform + '-' + process.arch, electron, results, skipped,
    totals: {suites: results.length, suitesOk: results.filter(r => r.ok).length, pass: sum('pass'), fail: sum('fail'), seconds: Math.round((Date.now() - t0) / 1000)}};
  fs.writeFileSync(path.join(o.out, 'summary.json'), JSON.stringify(rep, null, 2));
  fs.writeFileSync(path.join(o.out, 'summary.md'), markdown(rep));
  const t = rep.totals;
  console.log('\nTổng: ' + t.suitesOk + '/' + t.suites + ' bộ đạt, ' + t.pass + ' kiểm tra đạt, ' + t.fail + ' kiểm tra lỗi, ' + t.seconds + ' s' + (skipped.length ? ', bỏ qua ' + skipped.length + ' bộ (--bail)' : '') + '. Báo cáo: ' + path.relative(root, path.join(o.out, 'summary.md')));
  process.exit(t.suitesOk === t.suites && !skipped.length ? 0 : 1);
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(2); });
module.exports = {SUITES, parseArgs, summarize, unknownSuites, markdown};
