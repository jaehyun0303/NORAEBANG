import { SONGS, getSong, searchSongs } from './data/songs.js';
import { createMic } from './mic.js';

const $app = document.getElementById('app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
const artBg = (s) => `background:linear-gradient(135deg, ${s.art[0]}, ${s.art[1]})`;
const go = (path) => { location.hash = path; };

const icon = {
  bell: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
  play: (n = 14) => `<svg width="${n}" height="${n}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg>`,
  pause: '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
  back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  search: (c = 'currentColor') => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>`,
  mic: (n = 20, w = 1.8) => `<svg width="${n}" height="${n}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>`,
  home: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11l8-7 8 7v9H4z"/></svg>',
  note: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V6l11-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>',
  user: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>',
};

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  $app.appendChild(t); setTimeout(() => t.remove(), 2600);
}

let dictation = null;
window.claude?.use?.('dictation').then((d) => { dictation = d; }).catch(() => {});

// 앱 상태 (메모리)
const state = {
  genre: '인기',
  query: '',
  field: 'all',
  selectedId: null,
  lastResult: null, // { songId, total, pitch, rhythm, emotion, audioUrl, duration }
};

function tabbar(active) {
  const featured = SONGS.find((s) => s.featured);
  const t = (key, label, ic, href) =>
    `<a class="tab ${active === key ? 'on' : ''}" href="${href}">${ic}${label}</a>`;
  return `<nav class="tabbar" aria-label="하단 메뉴">
    ${t('home', '홈', icon.home, '#home')}
    ${t('search', '검색', icon.search().replace(/20/g, '22'), '#search')}
    <a class="fab" href="#sing-${featured.id}" aria-label="노래 부르기">${icon.mic(26, 2)}</a>
    ${t('mine', '내 노래', icon.note, '#result')}
    ${t('profile', '프로필', icon.user, '#home')}
  </nav>`;
}

// ---------------------------------------------------------------- 01 홈
function renderHome() {
  const featured = SONGS.find((s) => s.featured);
  const genres = ['인기', '발라드', '댄스', '힙합'];
  const list = state.genre === '인기'
    ? SONGS.filter((s) => s.popular).sort((a, b) => a.popular - b.popular)
    : SONGS.filter((s) => s.genre === state.genre);

  $app.innerHTML = `<section class="screen with-nav">
    <div class="topbar between">
      <div class="logo">hum<span>.</span></div>
      <button class="icon-btn" aria-label="알림">${icon.bell}</button>
    </div>

    <div class="hero">
      <div class="ring" style="right:-50px;top:-50px;width:220px;height:220px"></div>
      <div class="ring" style="right:-10px;top:-10px;width:140px;height:140px"></div>
      <div class="badge">오늘의 추천</div>
      <div>
        <h2>${esc(featured.title)}</h2>
        <p>${esc(featured.artist)} · ${esc(featured.album)}</p>
        <button class="pill-btn" data-sing="${featured.id}">${icon.play()} 바로 부르기</button>
      </div>
    </div>

    <div class="chips" role="tablist">
      ${genres.map((g) => `<button class="chip ${g === state.genre ? 'on' : ''}" data-genre="${g}" role="tab" aria-selected="${g === state.genre}">${g}</button>`).join('')}
    </div>

    <div>
      <div class="section-head"><h3>${state.genre === '인기' ? '실시간 인기 TOP' : esc(state.genre)}</h3><a class="muted" style="font-size:13px" href="#search">전체 보기</a></div>
      ${list.slice(0, 5).map((s, i) => `
        <button class="rank-row" data-sing="${s.id}">
          <div class="rank ${i === 0 ? 'top' : ''}">${i + 1}</div>
          <div class="art" style="width:48px;height:48px;${artBg(s)}"></div>
          <div style="flex:1;min-width:0"><div class="row-title">${esc(s.title)}</div><div class="row-sub">${esc(s.artist)}</div></div>
          <div class="num muted" style="font-size:13px">${esc(s.number)}</div>
        </button>`).join('')}
    </div>
  </section>${tabbar('home')}`;

  $app.querySelectorAll('[data-genre]').forEach((b) => b.onclick = () => { state.genre = b.dataset.genre; renderHome(); });
  $app.querySelectorAll('[data-sing]').forEach((b) => b.onclick = () => go(`sing-${b.dataset.sing}`));
}

// ---------------------------------------------------------------- 02 검색
function highlight(text, q) {
  const raw = esc(text);
  const query = q.trim();
  if (!query) return raw;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0) return raw;
  return esc(text.slice(0, i)) + `<span class="hl">${esc(text.slice(i, i + query.length))}</span>` + esc(text.slice(i + query.length));
}

function renderSearch() {
  $app.innerHTML = `<section class="screen" style="gap:18px;padding-bottom:110px">
    <div class="topbar">
      <a class="icon-btn" href="#home" aria-label="뒤로">${icon.back}</a>
      <div style="font-size:20px;font-weight:700">곡 검색</div>
    </div>
    <div class="search-box">
      ${icon.search('var(--accent)')}
      <label for="q" class="sr-only">곡명, 가수, 번호 검색</label>
      <input id="q" value="${esc(state.query)}" placeholder="곡명, 가수, 번호" autocomplete="off" enterkeyhint="search">
      <button class="icon-btn" style="border:none;background:transparent;color:var(--muted)" aria-label="음성으로 검색" id="voice">${icon.mic()}</button>
    </div>
    <div class="chips">
      ${[['all', '전체'], ['title', '곡명'], ['artist', '가수'], ['number', '번호']].map(([k, l]) => `<button class="chip light ${state.field === k ? 'on' : ''}" data-field="${k}">${l}</button>`).join('')}
    </div>
    <div id="results"></div>
  </section><div id="mini"></div>`;

  const $q = $app.querySelector('#q');
  $q.oninput = () => { state.query = $q.value; drawResults(); };
  $app.querySelectorAll('[data-field]').forEach((b) => b.onclick = () => {
    state.field = b.dataset.field;
    $app.querySelectorAll('[data-field]').forEach((x) => x.classList.toggle('on', x === b));
    drawResults();
  });
  $app.querySelector('#voice').onclick = startVoiceSearch;
  if (!state.query) $q.focus();
  drawResults();
}

function drawResults() {
  const $r = $app.querySelector('#results');
  const results = state.query ? searchSongs(state.query, state.field) : SONGS;
  $r.innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px" class="muted">
      <span>${state.query ? `검색 결과 ${results.length}곡` : `전체 ${results.length}곡`}</span><span>정확도순</span>
    </div>
    ${results.length ? results.map((s) => `
      <button class="result-row ${s.id === state.selectedId ? 'sel' : ''}" data-id="${s.id}">
        <div class="art" style="width:52px;height:52px;${artBg(s)}"></div>
        <div style="flex:1;min-width:0">
          <div class="row-title">${highlight(s.title, state.query)}</div>
          <div class="row-sub" style="margin-top:3px">${highlight(s.artist, state.query)} · ${fmt(s.durationSec)}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px">
          <div class="num" style="font-size:14px;font-weight:500">${esc(s.number)}</div>
          <div class="muted" style="font-size:11px">노래방 번호</div>
        </div>
      </button>`).join('') : `<div class="empty">'${esc(state.query)}' 검색 결과가 없어요</div>`}`;
  $r.querySelectorAll('[data-id]').forEach((b) => b.onclick = () => { state.selectedId = b.dataset.id; drawResults(); });
  drawMini();
}

function drawMini() {
  const s = getSong(state.selectedId);
  const $m = $app.querySelector('#mini');
  if (!s) { $m.innerHTML = ''; return; }
  $m.innerHTML = `<div class="mini-player">
    <div class="art" style="width:48px;height:48px;border-radius:24px;${artBg(s)}"></div>
    <div style="flex:1;min-width:0"><div class="row-title" style="font-size:14px">${esc(s.title)}</div><div class="muted" style="font-size:12px">${esc(s.artist)} · ${fmt(s.durationSec)}</div></div>
    <a class="accent-btn" href="#sing-${s.id}">부르기</a>
  </div>`;
}

function startVoiceSearch() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  // claude.ai 아티팩트 안에서는 dictation 기능을 우선 사용
  if (dictation) {
    dictation.onFinal(({ text }) => { state.query = text.trim(); renderSearch(); });
    dictation.start().catch(() => toast('음성 검색을 쓸 수 없어요. 직접 입력해 주세요.'));
    return;
  }
  if (!SR) { toast('이 브라우저는 음성 검색을 지원하지 않아요.'); return; }
  const r = new SR();
  r.lang = 'ko-KR';
  r.onresult = (e) => { state.query = e.results[0][0].transcript; renderSearch(); };
  r.start();
}

// ---------------------------------------------------------------- 03 노래 부르기
let session = null; // 현재 부르기 세션 (화면 이탈 시 정리)

function renderSing(id) {
  const song = getSong(id) || SONGS[0];
  $app.innerHTML = `<section class="screen sing">
    <div class="glow" style="left:-90px;top:-120px;width:380px;height:380px;background:radial-gradient(circle, rgba(139,124,255,.35), rgba(139,124,255,0) 70%)"></div>
    <div class="glow" style="right:-120px;top:260px;width:340px;height:340px;background:radial-gradient(circle, rgba(255,92,138,.22), rgba(255,92,138,0) 70%)"></div>

    <div class="sing-top">
      <a class="icon-btn glass" href="#home" aria-label="닫기">${icon.close}</a>
      <div style="flex:1;min-width:0;text-align:center">
        <div class="row-title" style="font-weight:700">${esc(song.title)}</div>
        <div style="font-size:12px;color:var(--muted-sing)">${esc(song.artist)} · ${esc(song.number)}</div>
      </div>
      <div class="score-pill glass" id="live-score" aria-label="실시간 점수">0.0</div>
    </div>

    <div class="pitch-card">
      <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:12px;color:var(--muted-sing)">
        <span id="mic-status">실시간 음정</span><span class="num" id="note">—</span>
      </div>
      <canvas id="pitch" height="64"></canvas>
    </div>

    <div class="lyrics" id="lyrics" aria-live="polite"></div>
    ${song.lyricsLicensed === false ? '<p class="notice">가사 라이선스 확보 전이라 소절 자리표시자로 표시됩니다</p>' : ''}

    <div class="progress">
      <div class="bar"><div id="prog"></div></div>
      <div class="times"><span id="cur">0:00</span><span>${fmt(song.durationSec)}</span></div>
    </div>

    <div class="controls">
      <div class="ctl-col">
        <div style="display:flex;gap:6px">
          <button class="key-btn glass" id="key-down" aria-label="키 내리기">−</button>
          <button class="key-btn glass" id="key-up" aria-label="키 올리기">+</button>
        </div>
        <span id="key-lbl">키 0</span>
      </div>
      <button class="play-btn" id="toggle" aria-label="일시정지">${icon.pause}</button>
      <div class="ctl-col">
        <button class="end-btn glass" id="end">종료하기</button>
        <span>점수 확인</span>
      </div>
    </div>
  </section>`;

  startSession(song);
}

// 목표 음정(시각화용 가이드). 실제 멜로디 데이터가 생기면 song.melody 로 교체.
function guideMidi(song, line, i) {
  const base = 57 + ((i * 7) % 5) - 2;
  return base + Math.round(Math.sin(i * 1.3) * 2);
}

function startSession(song) {
  const ly = song.lyrics;
  const s = {
    song, t: 0, playing: true, key: 0, last: performance.now(), raf: 0,
    samples: [], // { t, midi|null, target|null }
    mic: null, history: [],
  };
  session = s;

  const $ = (sel) => $app.querySelector(sel);
  const $lyrics = $('#lyrics'), $prog = $('#prog'), $cur = $('#cur'), $score = $('#live-score');
  const $note = $('#note'), $status = $('#mic-status'), canvas = $('#pitch');
  const ctx = canvas.getContext('2d');

  // 마이크 + 녹음
  createMic().then((mic) => {
    if (session !== s) { mic.stop(); return; }
    s.mic = mic;
    $status.textContent = '실시간 음정 · 마이크 켜짐';
  }).catch(() => { $status.textContent = '실시간 음정 · 마이크 꺼짐 (데모 모드)'; });

  const lineAt = (t) => {
    let idx = -1;
    for (let i = 0; i < ly.length; i++) if (ly[i].t <= t) idx = i;
    return idx;
  };

  let lastIdx = -2;
  function drawLyrics(t) {
    const idx = lineAt(t);
    const active = idx >= 0 && t < ly[idx].t + ly[idx].d;
    const curIdx = idx < 0 ? -1 : idx;
    const p = active ? Math.min(100, ((t - ly[idx].t) / ly[idx].d) * 100) : (idx >= 0 ? 100 : 0);
    if (curIdx !== lastIdx) {
      lastIdx = curIdx;
      const get = (k) => (ly[k] ? esc(ly[k].text) : '');
      const curText = curIdx < 0 ? (t < (ly[0]?.t ?? 0) ? '♪ 전주 중 ♪' : '') : get(curIdx);
      $lyrics.innerHTML = `
        <div class="ly prev">${get(curIdx - 1)}</div>
        <div class="ly cur" id="ly-cur">${curText}</div>
        <div class="ly next">${get(curIdx + 1)}</div>
        <div class="ly next2">${get(curIdx + 2)}</div>`;
    }
    const $c = $lyrics.querySelector('#ly-cur');
    if ($c) $c.style.setProperty('--p', `${curIdx < 0 ? 0 : p}%`);
    return active ? idx : -1;
  }

  function drawPitch(target, midi) {
    const w = canvas.clientWidth, h = 64, dpr = devicePixelRatio || 1;
    if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const y = (m) => h - 8 - ((m - 48) / 24) * (h - 16); // C3..C5
    // 가이드 바 (앞으로 4초)
    const px = w / 6; // 1초당 픽셀
    const nowX = w * 0.35;
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    ly.forEach((l, i) => {
      const x0 = nowX + (l.t - s.t) * px, x1 = x0 + l.d * px - 6;
      if (x1 < 0 || x0 > w) return;
      roundRect(ctx, x0, y(guideMidi(s.song, l, i) + s.key) - 4, x1 - x0, 8);
    });
    // 내 음정 궤적
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent');
    for (const smp of s.history) {
      if (smp.midi == null) continue;
      const x = nowX + (smp.t - s.t) * px;
      if (x < 0) continue;
      roundRect(ctx, x - 2, y(smp.midi) - 4, 4, 8);
    }
    // 현재 위치
    ctx.fillStyle = 'rgba(244,241,234,.5)';
    ctx.fillRect(nowX, 0, 1, h);
    if (midi != null) { ctx.fillStyle = '#F4F1EA'; roundRect(ctx, nowX - 8, y(midi) - 10, 16, 20, 10); }
  }

  function tick(now) {
    const dt = (now - s.last) / 1000;
    s.last = now;
    if (s.playing) s.t = Math.min(s.song.durationSec, s.t + dt);

    const activeIdx = drawLyrics(s.t);
    const target = activeIdx >= 0 ? guideMidi(s.song, ly[activeIdx], activeIdx) + s.key : null;
    let midi = s.mic ? s.mic.readMidi() : null;
    if (!s.mic && s.playing && target != null) midi = target + Math.sin(now / 300) * 0.8 + (Math.random() - 0.5) * 1.4; // 데모

    if (s.playing) {
      s.samples.push({ midi, target });
      s.history.push({ t: s.t, midi });
      while (s.history.length && s.history[0].t < s.t - 3) s.history.shift();
    }
    $note.textContent = midi != null ? midiName(midi) : '—';
    $score.textContent = computeScore(s.samples).total.toFixed(1);
    $prog.style.width = `${(s.t / s.song.durationSec) * 100}%`;
    $cur.textContent = fmt(s.t);
    drawPitch(target, midi);

    if (s.t >= s.song.durationSec) return finish();
    s.raf = requestAnimationFrame(tick);
  }
  s.raf = requestAnimationFrame((n) => { s.last = n; tick(n); });

  const $toggle = $('#toggle');
  $toggle.onclick = () => {
    s.playing = !s.playing;
    $toggle.innerHTML = s.playing ? icon.pause : icon.play(28);
    $toggle.setAttribute('aria-label', s.playing ? '일시정지' : '재생');
    s.mic?.setRecording(s.playing);
  };
  const setKey = (d) => { s.key = Math.max(-6, Math.min(6, s.key + d)); $('#key-lbl').textContent = `키 ${s.key > 0 ? '+' : ''}${s.key}`; };
  $('#key-down').onclick = () => setKey(-1);
  $('#key-up').onclick = () => setKey(1);
  $('#end').onclick = finish;

  async function finish() {
    cancelAnimationFrame(s.raf);
    const sc = computeScore(s.samples);
    const audioUrl = s.mic ? await s.mic.stop() : null;
    session = null;
    state.lastResult = { songId: s.song.id, ...sc, audioUrl, duration: s.t, demo: !s.mic };
    go('result');
  }
}

function roundRect(ctx, x, y, w, h, r = 4) {
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, Math.max(w, 0), h, r) : ctx.rect(x, y, w, h);
  ctx.fill();
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const midiName = (m) => { const r = Math.round(m); return NOTES[((r % 12) + 12) % 12] + (Math.floor(r / 12) - 1); };

// 점수: 음정 = 목표와의 반음 오차(옥타브 무시), 박자 = 소절 중 발성 비율, 감정 = 음정 변화의 자연스러움
function computeScore(samples) {
  const during = samples.filter((x) => x.target != null);
  if (during.length < 10) return { total: 0, pitch: 0, rhythm: 0, emotion: 0 };
  const voiced = during.filter((x) => x.midi != null);
  const rhythm = (voiced.length / during.length) * 100;
  const errs = voiced.map((x) => { let d = Math.abs(x.midi - x.target) % 12; return Math.min(d, 12 - d); });
  const pitch = errs.length ? Math.max(0, 100 - (errs.reduce((a, b) => a + b, 0) / errs.length) * 25) : 0;
  let jitter = 0;
  for (let i = 1; i < voiced.length; i++) jitter += Math.min(3, Math.abs(voiced[i].midi - voiced[i - 1].midi));
  const meanJ = voiced.length > 1 ? jitter / (voiced.length - 1) : 3;
  const emotion = Math.max(0, Math.min(100, 100 - Math.abs(meanJ - 0.3) * 30)) * (rhythm / 100) ** 0.3;
  const total = pitch * 0.5 + rhythm * 0.3 + emotion * 0.2;
  return { total, pitch, rhythm, emotion };
}

// ---------------------------------------------------------------- 04 결과
function grade(score) {
  if (score >= 90) return ['S', '거의 원곡 가수 같았어요'];
  if (score >= 80) return ['A', '노래방 에이스 등극!'];
  if (score >= 65) return ['B', '좋아요, 조금만 더!'];
  if (score >= 40) return ['C', '흥은 충분했어요'];
  return ['D', '다음엔 더 크게 불러봐요'];
}

function renderResult() {
  const r = state.lastResult;
  if (!r) {
    $app.innerHTML = `<section class="screen with-nav">
      <div class="topbar"><div style="font-size:20px;font-weight:700">내 노래</div></div>
      <div class="empty">아직 부른 노래가 없어요.<br><br><a class="accent-btn" style="display:inline-flex" href="#search">곡 고르러 가기</a></div>
    </section>${tabbar('mine')}`;
    return;
  }
  const song = getSong(r.songId);
  const total = Math.round(r.total);
  const [g, msg] = grade(total);
  const C = 2 * Math.PI * 96;
  const bars = Array.from({ length: 40 }, (_, i) => 8 + Math.abs(Math.sin(i * 1.7) * 20));

  $app.innerHTML = `<section class="screen result">
    <div class="topbar between">
      <a class="icon-btn" href="#home" aria-label="닫기">${icon.close}</a>
      <div class="row-title" style="font-weight:700">${esc(song.title)}</div>
      <div style="width:44px"></div>
    </div>

    <div style="display:flex;flex-direction:column;align-items:center;gap:16px">
      <div class="ring-wrap">
        <svg width="220" height="220" viewBox="0 0 220 220" style="transform:rotate(-90deg)" aria-hidden="true">
          <circle cx="110" cy="110" r="96" fill="none" stroke="#1E1D27" stroke-width="12"/>
          <circle class="val" id="ring" cx="110" cy="110" r="96" fill="none" stroke="var(--accent)" stroke-width="12" stroke-linecap="round" stroke-dasharray="0 ${C}"/>
        </svg>
        <div class="ring-center"><div class="big-score">${total}</div><div class="muted" style="font-size:13px;margin-top:6px">/ 100점</div></div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
        <div class="grade">${g} 등급</div>
        <div style="font-size:18px;font-weight:700">${msg}</div>
        ${r.demo ? '<div class="muted" style="font-size:12px">마이크 없이 데모 모드로 채점됐어요</div>' : ''}
      </div>
    </div>

    <div class="card">
      ${[['음정', r.pitch], ['박자', r.rhythm], ['감정 표현', r.emotion]].map(([l, v]) => `
        <div class="metric"><div class="lbl"><span>${l}</span><span class="num" style="font-weight:700">${Math.round(v)}</span></div>
        <div class="track"><div data-w="${Math.round(v)}" style="width:0"></div></div></div>`).join('')}
    </div>

    <div class="wave-bar">
      <button class="icon-btn" id="rec-play" style="border:none;background:var(--text);color:var(--bg)" aria-label="내 녹음 재생" ${r.audioUrl ? '' : 'disabled'}>${icon.play(16)}</button>
      <div class="wave" id="wave">${bars.map((h) => `<i style="height:${h}px"></i>`).join('')}</div>
      <div class="num muted" style="font-size:12px">${fmt(r.duration)}</div>
    </div>

    <div class="btn-row">
      <a class="btn-ghost" href="#sing-${song.id}">다시 부르기</a>
      <button class="btn-accent" id="share" ${r.audioUrl ? '' : 'disabled'}>녹음 공유하기</button>
    </div>
  </section>`;

  requestAnimationFrame(() => {
    $app.querySelector('#ring').setAttribute('stroke-dasharray', `${(total / 100) * C} ${C}`);
    $app.querySelectorAll('[data-w]').forEach((d) => d.style.width = `${d.dataset.w}%`);
  });

  if (r.audioUrl) {
    const audio = new Audio(r.audioUrl);
    const $bars = [...$app.querySelectorAll('#wave i')];
    audio.ontimeupdate = () => {
      const p = audio.currentTime / (audio.duration || r.duration || 1);
      $bars.forEach((b, i) => b.classList.toggle('on', i / $bars.length < p));
    };
    $app.querySelector('#rec-play').onclick = () => (audio.paused ? audio.play() : audio.pause());
    $app.querySelector('#share').onclick = async () => {
      const blob = await fetch(r.audioUrl).then((x) => x.blob());
      const file = new File([blob], `hum-${song.title}.webm`, { type: blob.type });
      if (navigator.canShare?.({ files: [file] })) navigator.share({ files: [file], title: `${song.title} — ${total}점` });
      else { const a = document.createElement('a'); a.href = r.audioUrl; a.download = file.name; a.click(); }
    };
  }
}

// ---------------------------------------------------------------- 라우터
function route() {
  if (session) { cancelAnimationFrame(session.raf); session.mic?.stop(); session = null; }
  const h = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (h === 'search') renderSearch();
  else if (h.startsWith('sing-')) renderSing(h.slice(5));
  else if (h === 'result') renderResult();
  else renderHome();
}
window.addEventListener('hashchange', route);
route();
