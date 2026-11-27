/* Tài khoản HAKQN lưu trên máy, tách khỏi hồ sơ và tài khoản Google Sheets. */
const setAccount = {status: null, pending: false, message: '', failed: false};
function panelSetAccount() {
  if (!HB?.account) return '<div class="card">Tài khoản đăng nhập khả dụng trong ứng dụng desktop.</div>';
  const status = setAccount.status;
  if (!status) return '<div class="card" role="status">Đang đọc chế độ sử dụng…</div>';
  if (!status.unlocked) return '<div class="card msg err">Không đọc được cấu hình tài khoản.</div>';
  const create = status.mode === 'single';
  return '<div class="card"><h3>Chế độ sử dụng</h3><p>Hiện tại: <b>' +
    (create ? 'Một người sử dụng' : 'Sử dụng tài khoản đăng nhập') + '</b></p>' +
    (create ? '<p class="mut">Ứng dụng mở trực tiếp. Tạo tài khoản nếu muốn yêu cầu đăng nhập khi mở lại.</p>' :
      '<p>Tên đăng nhập: <b>' + esc(status.user) + '</b></p><p class="mut">Nhập tên đăng nhập và mật khẩu hiện tại để chuyển về chế độ một người sử dụng.</p>') +
    '<form id="setAccountForm" class="grid2" data-account-action="' + (create ? 'create' : 'disable') + '">' +
    '<label><span>Tên đăng nhập</span><input name="user" autocomplete="username" maxlength="64" required></label>' +
    '<label><span>Mật khẩu</span><input name="password" type="password" autocomplete="' +
    (create ? 'new-password" minlength="8' : 'current-password') + '" maxlength="256" required></label>' +
    (create ? '<label><span>Nhập lại mật khẩu</span><input name="confirm" type="password" autocomplete="new-password" maxlength="256" required></label>' : '') +
    '<div style="grid-column:1/-1"><button class="btn" type="submit"' + (setAccount.pending ? ' disabled' : '') + '>' +
    (create ? 'Tạo tài khoản và bật đăng nhập' : 'Xác nhận chuyển về một người sử dụng') + '</button></div></form>' +
    '<p id="setAccountFeedback" role="status"' + (setAccount.message ? ' class="msg ' + (setAccount.failed ? 'err' : 'ok') + '"' : ' hidden') + '>' +
    esc(setAccount.message) + '</p></div>';
}

document.addEventListener('submit', async event => {
  const form = event.target;
  if (form.id !== 'setAccountForm') return;
  event.preventDefault();
  if (setAccount.pending) return;
  const action = form.dataset.accountAction;
  setAccount.pending = true;
  form.querySelector('button').disabled = true;
  let result;
  try {
    result = await HB.account[action](Object.fromEntries(new FormData(form)));
  } catch (_) {
    result = {ok: false, error: 'Chưa kết nối được với ứng dụng. Hãy thử lại.'};
  } finally {
    form.reset();
    setAccount.pending = false;
  }
  if (result?.ok) setAccount.status = result;
  setAccount.failed = !result?.ok;
  setAccount.message = result?.ok
    ? (action === 'create' ? 'Đã bật đăng nhập. Dùng tài khoản mới từ lần mở HAKQN tiếp theo.' : 'Đã chuyển về chế độ một người sử dụng.')
    : (result?.error || 'Chưa thay đổi được chế độ sử dụng.');
  if (NAV.view === 'setaccount') {
    render();
    document.getElementById('setAccountFeedback')?.setAttribute('tabindex', '-1');
    document.getElementById('setAccountFeedback')?.focus();
  }
});
