'use strict';
const form = document.getElementById('accountForm');
const title = document.getElementById('accountTitle');
const feedback = document.getElementById('accountFeedback');
const password = form.elements.password;
const submit = form.querySelector('button');

async function displayAccount() {
  const status = await window.hak.account.status();
  if (status.mode !== 'setup' && status.mode !== 'account') {
    feedback.textContent = 'Không mở được cấu hình tài khoản. Kiểm tra quyền truy cập hoặc liên hệ quản trị viên.';
    return;
  }
  const setup = status.mode === 'setup';
  title.textContent = setup ? 'Tạo tài khoản đăng nhập' : 'Đăng nhập HAKQN';
  submit.textContent = setup ? 'Tạo tài khoản và mở HAKQN' : 'Đăng nhập';
  document.getElementById('accountConfirmRow').hidden = !setup;
  form.elements.confirm.required = setup;
  password.autocomplete = setup ? 'new-password' : 'current-password';
  if (setup) password.minLength = 8;
  form.hidden = false;
  form.elements.user.focus();
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submit.disabled) return;
    submit.disabled = true;
    feedback.textContent = '';
    try {
      const credentials = Object.fromEntries(new FormData(form));
      const result = await window.hak.account[setup ? 'create' : 'login'](credentials);
      form.elements.password.value = '';
      form.elements.confirm.value = '';
      if (result?.ok) return;
      feedback.textContent = result?.error || 'Chưa xử lý được. Hãy thử lại.';
    } catch (_) {
      feedback.textContent = 'Chưa kết nối được với ứng dụng. Hãy thử lại.';
    }
    submit.disabled = false;
    password.focus();
  });
}
displayAccount().catch(() => { feedback.textContent = 'Không mở được cấu hình tài khoản.'; });
