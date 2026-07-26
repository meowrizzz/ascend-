/* =========================================================
   Ascend — auth screens (ESM view module)
   Full-screen login / register / confirm / recover / reset,
   rendered into #auth-root in the Ascend design system.
   No password is ever logged or stored by the app.
   ========================================================= */
import { auth } from './auth.js';

const STR = {
  ru: {
    sub: 'Синхронизируй прогресс между устройствами. Вход не обязателен — можно продолжить локально.',
    login: 'Вход', register: 'Создать аккаунт', email: 'Email', password: 'Пароль',
    name: 'Имя', confirmPass: 'Повторите пароль', doLogin: 'Войти', doRegister: 'Создать аккаунт',
    forgot: 'Забыли пароль?', toReg: 'Нет аккаунта? Создать', toLogin: 'Уже есть аккаунт? Войти',
    continueLocal: 'Продолжить без аккаунта', or: 'или',
    show: 'Показать пароль', hide: 'Скрыть пароль',
    needEmail: 'Введите корректный email', needPass: 'Пароль не короче 6 символов',
    needName: 'Имя от 2 до 40 символов', passMismatch: 'Пароли не совпадают',
    recoverTitle: 'Восстановление пароля', recoverSub: 'Введите email — пришлём ссылку для сброса.',
    sendLink: 'Отправить ссылку', recoverSent: 'Если такой аккаунт существует, письмо со ссылкой отправлено.',
    confirmTitle: 'Проверьте почту', confirmSub: 'Мы отправили письмо для подтверждения на',
    confirmHint: 'Перейдите по ссылке из письма, затем вернитесь в приложение.',
    resend: 'Отправить письмо повторно', resendIn: 'Повторно можно через {n} с', resent: 'Письмо отправлено повторно',
    backLogin: 'Вернуться ко входу',
    resetTitle: 'Новый пароль', resetSub: 'Придумайте новый пароль для аккаунта.',
    newPass: 'Новый пароль', savePass: 'Сохранить пароль', passSaved: 'Пароль обновлён',
    offlineTitle: 'Нет соединения', offlineSub: 'Не удалось подключиться к серверу.',
    retry: 'Повторить', notConfigured: 'Синхронизация не настроена',
  },
  en: {
    sub: 'Sync your progress across devices. Signing in is optional — you can continue locally.',
    login: 'Sign in', register: 'Create account', email: 'Email', password: 'Password',
    name: 'Name', confirmPass: 'Repeat password', doLogin: 'Sign in', doRegister: 'Create account',
    forgot: 'Forgot password?', toReg: 'No account? Create one', toLogin: 'Have an account? Sign in',
    continueLocal: 'Continue without an account', or: 'or',
    show: 'Show password', hide: 'Hide password',
    needEmail: 'Enter a valid email', needPass: 'Password must be at least 6 characters',
    needName: 'Name must be 2–40 characters', passMismatch: 'Passwords do not match',
    recoverTitle: 'Reset password', recoverSub: 'Enter your email and we will send a reset link.',
    sendLink: 'Send link', recoverSent: 'If that account exists, a reset link has been sent.',
    confirmTitle: 'Check your email', confirmSub: 'We sent a confirmation email to',
    confirmHint: 'Open the link in the email, then return to the app.',
    resend: 'Resend email', resendIn: 'Resend available in {n}s', resent: 'Email resent',
    backLogin: 'Back to sign in',
    resetTitle: 'New password', resetSub: 'Choose a new password for your account.',
    newPass: 'New password', savePass: 'Save password', passSaved: 'Password updated',
    offlineTitle: 'No connection', offlineSub: 'Could not reach the server.',
    retry: 'Retry', notConfigured: 'Sync is not configured',
  },
};
const T = k => { const l = (window.AscendApp && window.AscendApp.ui.getLang && window.AscendApp.ui.getLang()) || 'ru'; return (STR[l] && STR[l][k]) || STR.ru[k] || k; };
const esc = s => (window.AscendApp ? window.AscendApp.ui.esc(s) : String(s));
const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const shortErr = e => (e && (e.message || e.code || '').toString().slice(0, 120)) || 'error';

export class AuthUI {
  constructor(root, opts = {}) {
    this.root = root; this.onLocal = opts.onLocal || (() => {}); this.onRetry = opts.onRetry || (() => {});
    this.onAuthed = opts.onAuthed || (() => {}); this.mode = 'loading'; this.ctx = {};
  }
  show(mode, ctx = {}) { this.mode = mode; this.ctx = ctx; this.root.classList.remove('hidden'); this.render(); }
  hide() { this.root.classList.add('hidden'); }

  card(inner) {
    return `<div class="auth-screen"><div class="auth-card"><div class="auth-logo">⛰️</div><div class="auth-title">Ascend</div>${inner}</div></div>`;
  }
  passField(id, label, autocomplete) {
    return `<div class="field"><label for="${id}">${esc(label)}</label>
      <div class="auth-pass"><input class="input" id="${id}" type="password" autocomplete="${autocomplete}">
      <button type="button" class="auth-pass__toggle" data-toggle="${id}" aria-label="${esc(T('show'))}">👁</button></div></div>`;
  }
  wireToggles() {
    this.root.querySelectorAll('[data-toggle]').forEach(b => b.onclick = () => {
      const inp = this.root.querySelector('#' + b.dataset.toggle); if (!inp) return;
      inp.type = inp.type === 'password' ? 'text' : 'password';
      b.setAttribute('aria-label', inp.type === 'password' ? T('show') : T('hide'));
    });
  }
  msg(text, cls = '') { const m = this.root.querySelector('#auth-msg'); if (m) { m.textContent = text || ''; m.className = 'auth-msg ' + cls; } }
  busy(on) { const b = this.root.querySelector('#auth-submit'); if (b) { b.disabled = on; b.style.opacity = on ? '.6' : ''; } }

  render() {
    const m = this.mode;
    if (m === 'loading') { this.root.innerHTML = this.card(`<div class="auth-spinner" aria-label="…"></div>`); return; }
    if (m === 'login') return this.renderLogin();
    if (m === 'register') return this.renderRegister();
    if (m === 'confirm') return this.renderConfirm();
    if (m === 'recover') return this.renderRecover();
    if (m === 'reset') return this.renderReset();
    if (m === 'offline') return this.renderOffline();
  }

  renderLogin() {
    this.root.innerHTML = this.card(`
      <div class="auth-sub">${esc(T('sub'))}</div>
      <form class="auth-form" id="auth-form" novalidate>
        <div class="field"><label for="au-email">${esc(T('email'))}</label><input class="input" id="au-email" type="email" autocomplete="email" inputmode="email"></div>
        ${this.passField('au-pass', T('password'), 'current-password')}
        <div class="auth-msg" id="auth-msg"></div>
        <button class="btn btn--primary btn--block mt8" id="auth-submit" type="submit">${esc(T('doLogin'))}</button>
      </form>
      <div class="auth-links">
        <button class="auth-link" data-go="recover">${esc(T('forgot'))}</button>
        <button class="auth-link" data-go="register">${esc(T('toReg'))}</button>
      </div>
      <div class="auth-divider">${esc(T('or'))}</div>
      <button class="btn btn--ghost btn--block" id="auth-local">${esc(T('continueLocal'))}</button>`);
    this.wireToggles(); this.wireNav();
    this.root.querySelector('#auth-local').onclick = () => this.onLocal();
    this.root.querySelector('#auth-form').onsubmit = async (e) => {
      e.preventDefault();
      const email = this.val('au-email'), pass = this.raw('au-pass');
      if (!validEmail(email)) return this.msg(T('needEmail'), 'err');
      if (!pass) return this.msg(T('needPass'), 'err');
      this.busy(true); this.msg('');
      try { const { error } = await auth.signIn(email, pass); if (error) this.msg(shortErr(error), 'err'); /* success → gate SIGNED_IN */ }
      catch (err) { this.msg(shortErr(err), 'err'); }
      finally { this.busy(false); }
    };
  }

  renderRegister() {
    this.root.innerHTML = this.card(`
      <div class="auth-sub">${esc(T('register'))}</div>
      <form class="auth-form" id="auth-form" novalidate>
        <div class="field"><label for="au-name">${esc(T('name'))}</label><input class="input" id="au-name" type="text" autocomplete="name" maxlength="40"></div>
        <div class="field"><label for="au-email">${esc(T('email'))}</label><input class="input" id="au-email" type="email" autocomplete="email" inputmode="email"></div>
        ${this.passField('au-pass', T('password'), 'new-password')}
        ${this.passField('au-pass2', T('confirmPass'), 'new-password')}
        <div class="auth-msg" id="auth-msg"></div>
        <button class="btn btn--primary btn--block mt8" id="auth-submit" type="submit">${esc(T('doRegister'))}</button>
      </form>
      <div class="auth-links"><button class="auth-link" data-go="login">${esc(T('toLogin'))}</button></div>
      <div class="auth-divider">${esc(T('or'))}</div>
      <button class="btn btn--ghost btn--block" id="auth-local">${esc(T('continueLocal'))}</button>`);
    this.wireToggles(); this.wireNav();
    this.root.querySelector('#auth-local').onclick = () => this.onLocal();
    this.root.querySelector('#auth-form').onsubmit = async (e) => {
      e.preventDefault();
      const name = this.val('au-name'), email = this.val('au-email'), pass = this.raw('au-pass'), pass2 = this.raw('au-pass2');
      if (name.length < 2 || name.length > 40) return this.msg(T('needName'), 'err');
      if (!validEmail(email)) return this.msg(T('needEmail'), 'err');
      if (!pass || pass.length < 6) return this.msg(T('needPass'), 'err');
      if (pass !== pass2) return this.msg(T('passMismatch'), 'err');
      this.busy(true); this.msg('');
      try {
        const { data, error } = await auth.signUp(email, pass, name);   // display_name → user_metadata
        if (error) this.msg(shortErr(error), 'err');
        else if (!data.session) this.show('confirm', { email });          // confirmation required
        /* else: session present → gate SIGNED_IN enters app */
      } catch (err) { this.msg(shortErr(err), 'err'); }
      finally { this.busy(false); }
    };
  }

  renderConfirm() {
    const email = this.ctx.email || '';
    this.root.innerHTML = this.card(`
      <div class="auth-sub" style="margin-top:14px"><b>${esc(T('confirmTitle'))}</b><br>${esc(T('confirmSub'))}<br><b>${esc(email)}</b></div>
      <div class="data-hint" style="margin-top:12px">${esc(T('confirmHint'))}</div>
      <div class="auth-msg" id="auth-msg"></div>
      <button class="btn btn--primary btn--block mt16" id="au-resend" type="button">${esc(T('resend'))}</button>
      <button class="btn btn--ghost btn--block mt12 auth-back" data-go="login" type="button">${esc(T('backLogin'))}</button>`);
    this.wireNav();
    const rb = this.root.querySelector('#au-resend');
    const startCooldown = (secs) => {
      let n = secs; rb.disabled = true; rb.textContent = T('resendIn').replace('{n}', n);
      const iv = setInterval(() => { n--; if (n <= 0) { clearInterval(iv); rb.disabled = false; rb.textContent = T('resend'); } else rb.textContent = T('resendIn').replace('{n}', n); }, 1000);
    };
    rb.onclick = async () => {
      startCooldown(30);
      try { const { error } = await auth.resendConfirmation(email); this.msg(error ? shortErr(error) : T('resent'), error ? 'err' : 'ok'); }
      catch (err) { this.msg(shortErr(err), 'err'); }
    };
  }

  renderRecover() {
    this.root.innerHTML = this.card(`
      <div class="auth-sub" style="margin-top:14px"><b>${esc(T('recoverTitle'))}</b><br>${esc(T('recoverSub'))}</div>
      <form class="auth-form" id="auth-form" novalidate>
        <div class="field"><label for="au-email">${esc(T('email'))}</label><input class="input" id="au-email" type="email" autocomplete="email" inputmode="email"></div>
        <div class="auth-msg" id="auth-msg"></div>
        <button class="btn btn--primary btn--block mt8" id="auth-submit" type="submit">${esc(T('sendLink'))}</button>
      </form>
      <div class="auth-links"><button class="auth-link" data-go="login">${esc(T('backLogin'))}</button></div>`);
    this.wireNav();
    this.root.querySelector('#auth-form').onsubmit = async (e) => {
      e.preventDefault();
      const email = this.val('au-email');
      if (!validEmail(email)) return this.msg(T('needEmail'), 'err');
      this.busy(true);
      try { await auth.resetPassword(email); this.msg(T('recoverSent'), 'ok'); }   // neutral: never reveals existence
      catch (err) { this.msg(shortErr(err), 'err'); }
      finally { this.busy(false); }
    };
  }

  renderReset() {
    this.root.innerHTML = this.card(`
      <div class="auth-sub" style="margin-top:14px"><b>${esc(T('resetTitle'))}</b><br>${esc(T('resetSub'))}</div>
      <form class="auth-form" id="auth-form" novalidate>
        ${this.passField('au-pass', T('newPass'), 'new-password')}
        ${this.passField('au-pass2', T('confirmPass'), 'new-password')}
        <div class="auth-msg" id="auth-msg"></div>
        <button class="btn btn--primary btn--block mt8" id="auth-submit" type="submit">${esc(T('savePass'))}</button>
      </form>`);
    this.wireToggles();
    this.root.querySelector('#auth-form').onsubmit = async (e) => {
      e.preventDefault();
      const pass = this.raw('au-pass'), pass2 = this.raw('au-pass2');
      if (!pass || pass.length < 6) return this.msg(T('needPass'), 'err');
      if (pass !== pass2) return this.msg(T('passMismatch'), 'err');
      this.busy(true);
      try { const { error } = await auth.updatePassword(pass); if (error) this.msg(shortErr(error), 'err'); else { this.msg(T('passSaved'), 'ok'); setTimeout(() => this.onAuthed(), 700); } }
      catch (err) { this.msg(shortErr(err), 'err'); }
      finally { this.busy(false); }
    };
  }

  renderOffline() {
    this.root.innerHTML = this.card(`
      <div class="auth-sub" style="margin-top:14px"><b>${esc(T('offlineTitle'))}</b><br>${esc(T('offlineSub'))}</div>
      <button class="btn btn--primary btn--block mt16" id="au-retry" type="button">${esc(T('retry'))}</button>
      <div class="auth-divider">${esc(T('or'))}</div>
      <button class="btn btn--ghost btn--block" id="auth-local" type="button">${esc(T('continueLocal'))}</button>`);
    this.root.querySelector('#au-retry').onclick = () => this.onRetry();
    this.root.querySelector('#auth-local').onclick = () => this.onLocal();
  }

  wireNav() { this.root.querySelectorAll('[data-go]').forEach(b => b.onclick = () => this.show(b.dataset.go)); }
  val(id) { const e = this.root.querySelector('#' + id); return (e ? e.value : '').trim(); }
  raw(id) { const e = this.root.querySelector('#' + id); return e ? e.value : ''; }   // passwords: never trimmed/logged
}
