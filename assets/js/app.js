/* ===================================================
   Supabase 설정 - SDK는 index.html에서 초기화
   window.supabaseClient 를 공유해서 사용
=================================================== */
const SUPABASE_URL = 'https://vrvukirozrzyjimawrkl.supabase.co'
const SUPABASE_KEY = 'sb_publishable_Vpyh0sHHSBQP0UIzPut3Yg_kfjnZ4xB'

async function sbFetch(path, opts = {}) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      Prefer: opts.prefer || '',
      ...opts.headers,
    },
    method: opts.method || 'GET',
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const text = await res.text()
  let data = null
  try {
    data = JSON.parse(text)
  } catch (e) {}
  return { ok: res.ok, status: res.status, data }
}

/* 비밀번호 SHA-256 해시 */
async function hashPw(pw) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/* ===================================================
   정규식 규칙
=================================================== */
const RULES = {
  username: /^[a-zA-Z0-9]{4,}$/,
  password: /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/,
  name: /^[가-힣a-zA-Z]{2,}$/,
  phone: /^010-\d{4}-\d{4}$/,
}

/* ===================================================
   입력 에러 표시
=================================================== */
function setInputError(id, isError) {
  const el = document.getElementById(id)
  if (!el) return
  isError ? el.classList.add('is-error') : el.classList.remove('is-error')
}

/* ===================================================
   상태 변수
=================================================== */
const CODES = {}
const VERIFIED = {}
const TIMERS = {}

/* ===================================================
   화면 전환
=================================================== */
function show(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'))
  document.getElementById(id).classList.add('active')
  clearAlerts()
  document.querySelectorAll('input').forEach((el) => el.classList.remove('is-error'))

  if (id === 's-findpw') {
    document.getElementById('fp-newpw-section').style.display = 'none'
    document.getElementById('fp-verify-btn').style.display = 'block'
    VERIFIED['fp'] = false
  }
  if (id === 's-findid') {
    document.getElementById('fi-result').style.display = 'none'
    VERIFIED['fi'] = false
  }
}

/* ===================================================
   알림
=================================================== */
function clearAlerts() {
  document.querySelectorAll('.alert').forEach((a) => {
    a.className = 'alert'
    a.textContent = ''
  })
}

function showAlert(id, msg, type = 'error') {
  const el = document.getElementById(id)
  el.className = `alert alert--${type} show`
  el.textContent = msg
}

function alertId(p) {
  return p === 'su' ? 'signup-alert' : p === 'fp' ? 'findpw-alert' : 'findid-alert'
}

/* ===================================================
   로딩 상태
=================================================== */
function setLoading(btnId, loading, label = '') {
  const btn = document.getElementById(btnId)
  if (!btn) return
  btn.disabled = loading
  btn.innerHTML = loading ? `<span class="spinner"></span>${label || '처리 중...'}` : label
}

/* ===================================================
   UI 유틸
=================================================== */
function togglePw(inputId, btn) {
  const inp = document.getElementById(inputId)
  const hidden = inp.type === 'password'
  inp.type = hidden ? 'text' : 'password'
  btn.innerHTML = hidden ? '<i class="ti ti-eye-off"></i>' : '<i class="ti ti-eye"></i>'
}

function formatPhone(inp) {
  let v = inp.value.replace(/\D/g, '')
  if (v.length > 3 && v.length <= 7) v = v.slice(0, 3) + '-' + v.slice(3)
  else if (v.length > 7) v = v.slice(0, 3) + '-' + v.slice(3, 7) + '-' + v.slice(7, 11)
  inp.value = v
}

/* ===================================================
   핸드폰 인증 (시뮬레이션 - 실서비스는 SMS API 연동)
=================================================== */
function startTimer(p) {
  clearInterval(TIMERS[p])
  let sec = 180
  const el = document.getElementById(p + '-timer')
  el.textContent = '남은 시간: 3:00'
  TIMERS[p] = setInterval(() => {
    sec--
    const m = Math.floor(sec / 60)
    const s = String(sec % 60).padStart(2, '0')
    el.textContent = `남은 시간: ${m}:${s}`
    if (sec <= 0) {
      clearInterval(TIMERS[p])
      el.textContent = '인증 시간이 만료됐습니다. 다시 요청해 주세요.'
      delete CODES[p]
      VERIFIED[p] = false
    }
  }, 1000)
}

function sendCode(p) {
  const phone = document.getElementById(p + '-phone').value.replace(/\D/g, '')
  if (phone.length < 10) {
    showAlert(alertId(p), '올바른 핸드폰 번호를 입력하세요.')
    return
  }
  const code = String(Math.floor(100000 + Math.random() * 900000))
  CODES[p] = code
  VERIFIED[p] = false

  document.getElementById(p + '-code-wrap').style.display = 'block'
  document.getElementById(p + '-send-btn').textContent = '재발송'
  startTimer(p)
  showAlert(alertId(p), `인증번호가 발송됐습니다. (테스트 코드: ${code})`, 'info')
}

function verifyCode(p) {
  const code = document.getElementById(p + '-code').value.trim()
  if (!CODES[p]) {
    showAlert(alertId(p), '인증번호를 먼저 요청하세요.')
    return
  }
  if (code === CODES[p]) {
    VERIFIED[p] = true
    clearInterval(TIMERS[p])
    document.getElementById(p + '-timer').textContent = ''
    showAlert(alertId(p), '핸드폰 인증이 완료됐습니다.', 'success')
  } else {
    setInputError(p + '-code', true)
    showAlert(alertId(p), '인증번호가 올바르지 않습니다.')
  }
}

/* ===================================================
   소셜 로그인 - window.supabaseClient 사용
=================================================== */
function socialMsg(type) {
  const provider = type === 'kakao' ? 'kakao' : 'google'
  window.supabaseClient.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: 'https://signup-five-bice.vercel.app',
    },
  })
}

/* ===================================================
   로그인
=================================================== */
async function doLogin() {
  const username = document.getElementById('login-id').value.trim()
  const pw = document.getElementById('login-pw').value
  if (!username || !pw) {
    showAlert('login-alert', '아이디와 비밀번호를 입력하세요.')
    return
  }

  setLoading('login-btn', true, '로그인 중...')
  try {
    const hashed = await hashPw(pw)
    const r = await sbFetch(`users?username=eq.${encodeURIComponent(username)}&select=id,name,password`)
    if (!r.ok || !r.data || r.data.length === 0) {
      setInputError('login-id', true)
      showAlert('login-alert', '존재하지 않는 아이디입니다.')
      return
    }
    const user = r.data[0]
    if (user.password !== hashed) {
      setInputError('login-pw', true)
      showAlert('login-alert', '비밀번호가 올바르지 않습니다.')
      return
    }
    setInputError('login-id', false)
    setInputError('login-pw', false)
    showAlert('login-alert', `${user.name}님, 환영합니다! 로그인 성공`, 'success')
    document.getElementById('login-id').value = ''
    document.getElementById('login-pw').value = ''
  } catch (e) {
    showAlert('login-alert', '서버 연결에 실패했습니다. Supabase 설정을 확인해 주세요.')
  } finally {
    setLoading('login-btn', false, '로그인')
  }
}

/* ===================================================
   회원가입
=================================================== */
async function doSignup() {
  const username = document.getElementById('su-id').value.trim()
  const pw = document.getElementById('su-pw').value
  const pw2 = document.getElementById('su-pw2').value
  const name = document.getElementById('su-name').value.trim()
  const phone = document.getElementById('su-phone').value.trim()

  if (!username || !pw || !pw2 || !name || !phone) {
    showAlert('signup-alert', '모든 항목을 입력하세요.')
    return
  }
  if (username.length < 4 || !/^[a-zA-Z0-9]+$/.test(username)) {
    setInputError('su-id', true)
    showAlert('signup-alert', '아이디는 영문/숫자 조합 4자 이상이어야 합니다.')
    return
  }
  setInputError('su-id', false)

  const pwRegex = /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/
  if (!pwRegex.test(pw)) {
    setInputError('su-pw', true)
    showAlert('signup-alert', '비밀번호는 8자 이상, 영문·숫자·특수문자를 모두 포함해야 합니다.')
    return
  }
  setInputError('su-pw', false)

  if (pw !== pw2) {
    setInputError('su-pw2', true)
    showAlert('signup-alert', '비밀번호가 일치하지 않습니다.')
    return
  }
  setInputError('su-pw2', false)

  if (!RULES.name.test(name)) {
    setInputError('su-name', true)
    showAlert('signup-alert', '올바른 성함을 입력해 주세요.')
    return
  }
  setInputError('su-name', false)

  if (!RULES.phone.test(phone)) {
    setInputError('su-phone', true)
    showAlert('signup-alert', '010-0000-0000 형식으로 입력해 주세요.')
    return
  }
  setInputError('su-phone', false)

  if (!VERIFIED['su']) {
    showAlert('signup-alert', '핸드폰 인증을 완료해 주세요.')
    return
  }

  setLoading('su-btn', true, '가입 처리 중...')
  try {
    const check = await sbFetch(`users?username=eq.${encodeURIComponent(username)}&select=id`)
    if (check.data && check.data.length > 0) {
      setInputError('su-id', true)
      showAlert('signup-alert', '이미 사용 중인 아이디입니다.')
      return
    }
    const hashed = await hashPw(pw)
    const r = await sbFetch('users', {
      method: 'POST',
      prefer: 'return=representation',
      body: { username, password: hashed, name, phone },
    })
    if (r.ok) {
      showAlert('signup-alert', `${name}님, 회원가입이 완료됐습니다! 로그인해 주세요.`, 'success')
      ;['su-id', 'su-pw', 'su-pw2', 'su-name', 'su-phone', 'su-code'].forEach((id) => {
        const el = document.getElementById(id)
        if (el) {
          el.value = ''
          el.classList.remove('is-error')
        }
      })
      document.getElementById('su-code-wrap').style.display = 'none'
      VERIFIED['su'] = false
      setTimeout(() => show('s-login'), 2000)
    } else {
      const msg = r.data && r.data.message ? r.data.message : '가입에 실패했습니다.'
      showAlert('signup-alert', msg.includes('users') || msg.includes('relation') ? 'users 테이블이 없습니다. Supabase SQL Editor에서 테이블을 먼저 생성해 주세요.' : msg)
    }
  } catch (e) {
    showAlert('signup-alert', '서버 연결 오류가 발생했습니다. 네트워크를 확인해 주세요.')
  } finally {
    setLoading('su-btn', false, '가입하기')
  }
}

/* ===================================================
   비밀번호 찾기 - 본인 확인
=================================================== */
async function doFindPw() {
  const username = document.getElementById('fp-id').value.trim()
  const name = document.getElementById('fp-name').value.trim()
  const phone = document.getElementById('fp-phone').value.trim()
  if (!username || !name) {
    showAlert('findpw-alert', '아이디와 성함을 입력하세요.')
    return
  }
  if (!VERIFIED['fp']) {
    showAlert('findpw-alert', '핸드폰 인증을 완료해 주세요.')
    return
  }

  setLoading('fp-verify-btn', true, '확인 중...')
  try {
    const r = await sbFetch(`users?username=eq.${encodeURIComponent(username)}&name=eq.${encodeURIComponent(name)}&phone=eq.${encodeURIComponent(phone)}&select=id`)
    if (!r.ok || !r.data || r.data.length === 0) {
      showAlert('findpw-alert', '입력하신 정보와 일치하는 계정이 없습니다.')
      return
    }
    document.getElementById('fp-newpw-section').style.display = 'block'
    document.getElementById('fp-verify-btn').style.display = 'none'
    showAlert('findpw-alert', '본인 확인 완료. 새 비밀번호를 입력하세요.', 'success')
  } catch (e) {
    showAlert('findpw-alert', '서버 연결 오류가 발생했습니다.')
  } finally {
    setLoading('fp-verify-btn', false, '본인 확인')
  }
}

/* 비밀번호 변경 */
async function doResetPw() {
  const username = document.getElementById('fp-id').value.trim()
  const pw = document.getElementById('fp-newpw').value
  const pw2 = document.getElementById('fp-newpw2').value

  const pwRegex = /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/
  if (!pwRegex.test(pw)) {
    setInputError('fp-newpw', true)
    showAlert('findpw-alert', '비밀번호는 8자 이상, 영문·숫자·특수문자를 모두 포함해야 합니다.')
    return
  }
  setInputError('fp-newpw', false)

  if (pw !== pw2) {
    setInputError('fp-newpw2', true)
    showAlert('findpw-alert', '비밀번호가 일치하지 않습니다.')
    return
  }
  setInputError('fp-newpw2', false)

  setLoading('fp-reset-btn', true, '변경 중...')
  try {
    const hashed = await hashPw(pw)
    const r = await sbFetch(`users?username=eq.${encodeURIComponent(username)}`, {
      method: 'PATCH',
      body: { password: hashed },
    })
    if (r.ok) {
      showAlert('findpw-alert', '비밀번호가 변경됐습니다. 로그인해 주세요.', 'success')
      setTimeout(() => show('s-login'), 2000)
    } else {
      showAlert('findpw-alert', '비밀번호 변경에 실패했습니다.')
    }
  } catch (e) {
    showAlert('findpw-alert', '서버 연결 오류가 발생했습니다.')
  } finally {
    setLoading('fp-reset-btn', false, '비밀번호 변경')
  }
}

/* ===================================================
   아이디 찾기
=================================================== */
async function doFindId() {
  const name = document.getElementById('fi-name').value.trim()
  const phone = document.getElementById('fi-phone').value.trim()
  if (!name || !phone) {
    showAlert('findid-alert', '성함과 핸드폰번호를 입력하세요.')
    return
  }
  if (!VERIFIED['fi']) {
    showAlert('findid-alert', '핸드폰 인증을 완료해 주세요.')
    return
  }

  setLoading('fi-btn', true, '조회 중...')
  try {
    const r = await sbFetch(`users?name=eq.${encodeURIComponent(name)}&phone=eq.${encodeURIComponent(phone)}&select=username`)
    if (!r.ok || !r.data || r.data.length === 0) {
      showAlert('findid-alert', '입력하신 정보와 일치하는 계정이 없습니다.')
      return
    }
    document.getElementById('fi-result-val').textContent = r.data[0].username
    document.getElementById('fi-result').style.display = 'block'
    document.getElementById('findid-alert').className = 'alert'
  } catch (e) {
    showAlert('findid-alert', '서버 연결 오류가 발생했습니다.')
  } finally {
    setLoading('fi-btn', false, '아이디 찾기')
  }
}

/* ===================================================
   blur 시 실시간 유효성 검사
=================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const rules = [
    ['su-id', 'username'],
    ['su-pw', 'password'],
    ['su-name', 'name'],
    ['su-phone', 'phone'],
    ['fp-id', 'username'],
    ['fp-name', 'name'],
    ['fp-phone', 'phone'],
    ['fp-newpw', 'password'],
    ['fi-name', 'name'],
    ['fi-phone', 'phone'],
  ]
  rules.forEach(([id, rule]) => {
    document.getElementById(id)?.addEventListener('blur', () => {
      const el = document.getElementById(id)
      if (el?.value) setInputError(id, !RULES[rule].test(el.value))
    })
  })
  // 비밀번호 확인 별도 처리
  ;['su-pw2', 'fp-newpw2'].forEach((id) => {
    document.getElementById(id)?.addEventListener('blur', () => {
      const pwId = id === 'su-pw2' ? 'su-pw' : 'fp-newpw'
      const pw = document.getElementById(pwId)?.value
      const pw2 = document.getElementById(id)?.value
      if (pw2) setInputError(id, pw !== pw2)
    })
  })
})

/* ===================================================
   Enter 키 지원
=================================================== */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return
  const active = document.querySelector('.screen.active')
  if (!active) return
  const id = active.id
  if (id === 's-login') doLogin()
  if (id === 's-signup') doSignup()
  if (id === 's-findpw') {
    document.getElementById('fp-verify-btn').style.display !== 'none' ? doFindPw() : doResetPw()
  }
  if (id === 's-findid') doFindId()
})
