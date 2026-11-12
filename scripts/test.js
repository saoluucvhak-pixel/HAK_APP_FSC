'use strict';
/* Chạy kiểm thử đơn vị bằng chính Node của Electron để dùng đúng bản better-sqlite3 đã build cho Electron */
const {spawnSync} = require('child_process');
const path = require('path'), fs = require('fs');
const files = fs.readdirSync(path.join(__dirname, '..', 'tests')).filter(f => f.endsWith('.test.js')).map(f => path.join('tests', f));
const r = spawnSync(require('electron'), ['--test', ...files], {stdio: 'inherit', env: {...process.env, ELECTRON_RUN_AS_NODE: '1'}, cwd: path.join(__dirname, '..')});
process.exit(r.status === null ? 1 : r.status);
