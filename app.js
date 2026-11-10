(function () {
  'use strict';
  if (!window.PORTFOLIO) {
    document.body.insertAdjacentHTML('afterbegin', '<p style="padding:16px">data.js를 불러오지 못했어요. index.html과 같은 폴더에 data.js가 있는지 확인해 주세요.</p>');
    return;
  }
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Number(n).toLocaleString('ko-KR');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const dot = (s) => (s || '').replace(/-/g, '.');
  const span = (a, b) => (!a ? '' : !b || b === a ? dot(a) : `${dot(a)} – ${dot(b)}`);
  const ym = (s) => s.slice(0, 7).split('-').map(Number);
  const months = (a, b) => { if (!a || !b) return 0; const [y1, m1] = ym(a), [y2, m2] = ym(b); return (y2 - y1) * 12 + (m2 - m1) + 1; };
  const byDateDesc = (ka, kb) => (!ka && !kb ? 0 : !ka ? 1 : !kb ? -1 : kb.localeCompare(ka));
  const lines = (t) => String(t || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const pipe = (l) => l.split('|').map((x) => (x || '').trim());
  const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '');
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmtTime = (iso) => { try { return new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (_) { return ''; } };

  /* ═════════ 데이터 ═════════
     DATA가 사이트의 모든 내용입니다. 편집하면 DATA를 바꾸고,
     claude.ai에 올린 사이트에서는 data.js를 새 버전으로 저장(게시)하고,
     내 컴퓨터에서 연 파일에서는 이 브라우저(localStorage)에 저장합니다. */
  const ORIGINAL = clone(window.PORTFOLIO);
  let DATA = clone(window.PORTFOLIO);
  const C = DATA.competencies;
  const COMP_KEYS = Object.keys(C);

  function normProject(p, i) {
    const o = Object.assign({
      id: '', featured: false, comp: COMP_KEYS[0], title: '', summary: '', date: '', org: '', output: '',
      role: '', process: [], results: [], evidence: [], memo: '', private: false, example: false, headline: null,
      background: '', learned: '', team: '', period: '', award: '', details: [], quote: null, video: null
    }, p);
    if (!o.id) o.id = 'p' + Date.now().toString(36) + (i || 0);
    if (!C[o.comp]) o.comp = COMP_KEYS[0];
    ['process', 'results', 'evidence', 'details'].forEach((k) => { if (!Array.isArray(o[k])) o[k] = []; });
    o.featured = !!o.featured; o.private = !!o.private; o.example = !!o.example;
    return o;
  }
  const normCareer = (k) => Object.assign({ type: '', org: '', role: '', start: '', end: '', kw: null, summary: '', did: [], outcome: [], evidence: [] }, k);
  const normCert = (z) => Object.assign({ name: '', issuer: '', date: '', status: '취득', detail: '', evidence: [] }, z);
  const normVol = (v) => Object.assign({ title: '', org: '', field: '', center: '', sessions: [] }, v);
  function normalizeAll(d) {
    d.profile = Object.assign({ facts: [], about: [], keywords: [] }, d.profile);
    d.projects = (d.projects || []).map(normProject);
    d.career = (d.career || []).map(normCareer);
    d.certs = (d.certs || []).map(normCert);
    d.volunteer = (d.volunteer || []).map(normVol).filter((v) => v.sessions.length);
    return d;
  }
  normalizeAll(DATA);
  const validFull = (d) => d && typeof d === 'object' && d.profile && Array.isArray(d.projects) && Array.isArray(d.career) && Array.isArray(d.certs) && Array.isArray(d.volunteer);
  const validList = (list) => Array.isArray(list) && list.every((p) => p && typeof p === 'object' && typeof p.title === 'string' && p.title.trim());

  /* data.js 파일 내용 만들기 (밑줄로 시작하는 계산용 값은 빼고) */
  function dataJS() {
    const body = JSON.stringify(DATA, (k, v) => (k.startsWith('_') ? undefined : v), 2);
    return `/*
  포트폴리오 데이터 — 사이트 편집 화면(주소 끝 #edit)에서 고치면 이 파일이 자동으로 다시 저장됩니다.
  직접 고쳐도 됩니다. 날짜는 "2024-07-22"처럼 적고, 모르면 ""로 비워 두세요.

  증빙자료(evidence) 연결 방법 — 항목마다 셋 중 하나
    1) 파일:   { "kind": "자격증", "title": "독서지도사 1급 사본", "file": "evidence/reading.jpg" }
    2) 링크:   { "kind": "영상", "title": "도서관 홍보 영상", "url": "https://youtu.be/..." }
    3) 요청 시: { "kind": "확인서", "title": "실무수습 확인서", "note": "요청 시 제공" }

  ※ 비공개 항목과 취업 메모는 화면에만 숨겨질 뿐, 이 파일 안에는 그대로 들어 있어요.
*/
window.PORTFOLIO = ${body};
`;
  }
  const comparable = (d) => JSON.stringify(Object.assign({}, d, { updatedAt: null }), (k, v) => (k.startsWith('_') ? undefined : v));

  /* ═════════ 저장 방식 ═════════ */
  const LS_KEY = 'gahyeon-portfolio-data-v2';
  const OLD_KEY = 'gahyeon-portfolio-projects-v1';
  let mode = 'local';        // local: 내 컴퓨터 파일 · site: claude.ai 사이트(저장 가능) · readonly: 사이트(보기 전용)
  let host = null;           // artifact 저장 기능
  let canEdit = null;
  let storageOK = true;
  let lastSaved = DATA.updatedAt || null;
  let saving = false, pending = false, saveError = '';

  function readLocal() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) { const d = JSON.parse(raw); if (validFull(d.data)) return { data: d.data, savedAt: d.savedAt }; }
      const old = localStorage.getItem(OLD_KEY);
      if (old) {
        const d = JSON.parse(old);
        if (d && validList(d.projects)) return { data: Object.assign(clone(DATA), { projects: d.projects }), savedAt: d.savedAt };
      }
    } catch (_) { storageOK = false; }
    return null;
  }
  function writeLocal() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ app: 'gahyeon-portfolio', version: 2, savedAt: DATA.updatedAt, data: DATA }));
      storageOK = true; return true;
    } catch (_) { storageOK = false; return false; }
  }
  function clearLocal() { try { localStorage.removeItem(LS_KEY); localStorage.removeItem(OLD_KEY); } catch (_) {} }

  /* 처음엔 data.js 내용으로 그리고, 사이트인지 확인한 뒤 저장 방식을 정합니다 */
  const hasClaude = !!(window.claude && typeof window.claude.use === 'function');
  let localCopy = readLocal();
  // data.js가 새 버전으로 바뀌었으면, 그 전에 브라우저에 저장된 편집본은 쓰지 않아요 (지운 항목이 되살아나는 문제 방지)
  if (localCopy && (localCopy.data || {}).dataVersion !== window.PORTFOLIO.dataVersion) { clearLocal(); localCopy = null; }
  if (!hasClaude && localCopy) {
    DATA = normalizeAll(clone(localCopy.data)); lastSaved = localCopy.savedAt || lastSaved; localCopy = null;
  }

  /* ═════════ 캐릭터 (대사 없음 — 표정만) ═════════ */
  const EXP = window.Chara.EXP;
  let curExp = 'smile';
  function setExpression(exp) {
    if (!(exp in EXP)) exp = 'smile';
    curExp = exp;
    document.querySelectorAll('svg.chara').forEach((svg) => {
      svg.setAttribute('data-exp', exp);
      svg.querySelectorAll('[data-show]').forEach((g) => {
        g.style.display = g.getAttribute('data-show').split(' ').includes(exp) ? '' : 'none';
      });
      svg.querySelectorAll('.head').forEach((head) => { head.style.transform = `rotate(${EXP[exp]}deg)`; });
    });
  }
  function wave() {
    if (reduceMotion) return;
    document.querySelectorAll('svg.chara').forEach((s) => { s.classList.remove('waving'); void s.getBoundingClientRect(); s.classList.add('waving'); });
    setTimeout(() => document.querySelectorAll('svg.chara').forEach((s) => s.classList.remove('waving')), 1900);
  }
  (function blinkLoop() {
    setTimeout(() => {
      document.querySelectorAll('svg.chara').forEach((s) => s.classList.add('blink'));
      setTimeout(() => document.querySelectorAll('svg.chara').forEach((s) => s.classList.remove('blink')), 140);
      blinkLoop();
    }, 2600 + Math.random() * 2600);
  })();
  const ORDER = ['happy', 'love', 'wink', 'surprised', 'shy', 'excited', 'proud', 'smile'];
  function nextMood() {
    let e; do { e = ORDER[Math.floor(Math.random() * ORDER.length)]; } while (e === curExp);
    setExpression(e);
    if (Math.random() < 0.4) wave();
  }
  window.CharaFx = { mood: (e) => setExpression(e), wave: () => wave() };   // fx.js(인트로)에서 사용
  $('h-btn').innerHTML = window.Chara.svg();
  $('c-btn').innerHTML = window.Chara.svg();
  $('h-btn').addEventListener('click', nextMood);
  $('c-btn').addEventListener('click', nextMood);

  /* ═════════ 계산값 (편집할 때마다 다시 계산) ═════════ */
  let K, V, Z, volHours, volSessions, volYears, practice, typeCount, certDone;
  function derive() {
    K = DATA.career; Z = DATA.certs;
    V = DATA.volunteer.map((v, idx) => {
      const sessions = v.sessions.slice().sort((a, b) => String(a[0]).localeCompare(String(b[0])));
      return Object.assign({}, v, {
        _idx: idx, sessions,
        hours: sessions.reduce((s, x) => s + (Number(x[1]) || 0), 0),
        start: sessions[0][0], end: sessions[sessions.length - 1][0],
        evidence: v.evidence && v.evidence.length ? v.evidence : [{ kind: '봉사실적', title: `1365 자원봉사 실적 · ${v.center || v.org}`, note: '요청 시 제공' }]
      });
    });
    volHours = V.reduce((s, v) => s + v.hours, 0);
    volSessions = V.reduce((s, v) => s + v.sessions.length, 0);
    volYears = V.flatMap((v) => v.sessions.map((x) => String(x[0]).slice(0, 4))).sort();
    practice = K.filter((k) => /실무수습|교생|실습/.test(k.type));
    typeCount = {}; K.forEach((k) => (typeCount[k.type] = (typeCount[k.type] || 0) + 1));
    certDone = Z.filter((z) => z.status === '취득').length;
  }
  const yearSpan = () => (volYears.length ? `${volYears[0]}–${volYears[volYears.length - 1]}` : '');

  /* ═════════ 증빙 레지스트리 (공개 항목만) ═════════ */
  let EV = [];
  const reg = (list, source, group) => (list || []).map((ev) => { EV.push(Object.assign({}, ev, { source, group })); return EV.length - 1; });
  const viewable = (e) => !!(e.file || safeUrl(e.url));
  const evChip = (i) => {
    const e = EV[i];
    return viewable(e)
      ? `<button type="button" class="ev-chip ok" data-ev="${i}">${esc(e.kind)} · ${esc(e.title)} <span aria-hidden="true">↗</span></button>`
      : `<span class="ev-chip">${esc(e.kind)} · ${esc(e.title)}<em>${esc(e.note || '요청 시 제공')}</em></span>`;
  };
  const pub = () => DATA.projects.filter((p) => !p.private);
  const exBadge = (p) => (p.example ? '<span class="badge ex">예시</span>' : '');
  const callNo = (p) => `${C[p.comp].code} · ${p.example ? 'EX' : p.id.toUpperCase().slice(0, 6)}`;

  function rebuildEvidence() {
    EV = [];
    pub().forEach((p) => (p._ev = reg(p.evidence, p.title + (p.example ? ' (예시)' : ''), '프로젝트')));
    K.forEach((k) => (k._ev = reg(k.evidence, k.org, '경력')));
    V.forEach((v) => (v._ev = reg(v.evidence, v.title, '봉사')));
    Z.forEach((z) => (z._ev = reg(z.evidence, z.name, '자격증')));
  }

  /* ═════════ 공개 화면 ═════════ */
  function renderProfile() {
    const PR = DATA.profile;
    document.querySelectorAll('[data-site-name]').forEach((el) => (el.textContent = PR.siteName || '포트폴리오'));
    $('cover-name').textContent = PR.nameEn || PR.name;
    $('cover-sub').textContent = [PR.name, PR.dept, PR.grad].filter(Boolean).join(' · ');
    const yr = String(PR.year || new Date().getFullYear());
    $('year-a').textContent = yr.slice(0, 2);
    $('year-b').textContent = yr.slice(2);
    const IN = PR.intro || {};
    if ($('intro-h')) $('intro-h').textContent = IN.who || '';
    if ($('intro-steps')) $('intro-steps').innerHTML = (IN.steps || []).map((x) => `<li><span class="st-n">${esc(x.label)}</span><b>${esc(x.title)}</b><small>${esc(x.period || '')}</small><p>${esc(x.text)}</p></li>`).join('');
    if ($('hero-eyebrow')) $('hero-eyebrow').textContent = [PR.dept, PR.grad].filter(Boolean).join(' · ');
    if ($('hero-title')) $('hero-title').innerHTML = String(PR.headline || '').split('\n').map((l) => `<span class="ln">${esc(l)}</span>`).join('');
    if ($('hero-lead')) $('hero-lead').textContent = PR.lead || '';
    if ($('hero-lead2')) $('hero-lead2').textContent = PR.lead2 || '';
    $('hero-facts').innerHTML = (PR.facts || []).map(([k, v]) => `<li><b>${esc(k)}</b>${esc(v)}</li>`).join('');
    if ($('quote')) { $('quote').innerHTML = PR.quote ? `<p>“${esc(PR.quote)}”</p><cite>${esc(PR.quoteBy)}</cite>` : ''; $('quote').hidden = !PR.quote; }
    if ($('about')) $('about').innerHTML = (PR.about || []).map((a, i) => `<article class="about-card"><span class="about-n">${String(i + 1).padStart(2, '0')}</span><h3>${esc(a.title)}</h3><p>${esc(a.text)}</p></article>`).join('');
    const KW = PR.keywords || [];
    $('cover-kw').innerHTML = KW.map((k, i) => `<span class="kw kw${i}">#${esc(k.word)}</span>`).join('');
    if ($('hero-kw')) $('hero-kw').innerHTML = KW.map((k, i) => `<li class="kw-arc kw${i}"><small>Keyword ${String(i + 1).padStart(2, '0')}</small><b>${esc(k.word)}</b><span>${esc(k.meaning)}</span></li>`).join('');
    if ($('hero-kw')) $('hero-kw').hidden = !KW.length;
    $('foot-note').textContent = `${PR.name} · ${PR.dept} · 요약 숫자는 공개 기록에서 자동 계산돼요 (예시 항목 제외)`;
  }

  function renderHome() {
    const real = pub().filter((p) => !p.example);
    const yrs = real.map((p) => p.date).filter(Boolean).sort();
    const evOk = EV.filter(viewable).length;
    const planned = Z.filter((z) => z.status !== '취득').map((z) => z.name.replace(/\s*\(.*\)$/, ''));
    $('stats').innerHTML = [
      ['공모전·프로그램', fmt(real.length), '건', `수상 ${real.filter((p) => p.award).length}건${yrs.length ? ` · ${yrs[0].slice(0, 4)}–${yrs[yrs.length - 1].slice(0, 4)}` : ''}`],
      ['현장 실습', fmt(practice.length), '곳', practice.map((k) => k.org.replace('대구대학교 ', '')).join(' · ')],
      ['봉사 시간', fmt(volHours), '시간', `${volSessions}회${yearSpan() ? ' · ' + yearSpan() : ''}`],
      ['경력·활동', fmt(K.length), '개', Object.entries(typeCount).map(([t, n]) => `${t} ${n}`).join(' · ')],
      ['취득 자격증', fmt(certDone), '개', planned.length ? `취득 예정 ${planned.length}개 (${planned.join(' · ')})` : '취득 예정 없음'],
      ['증빙자료', fmt(EV.length), '건', evOk ? `바로 볼 수 있는 자료 ${evOk}건` : '요청 시 원본 제공']
    ].map(([l, v, u, h]) => `<div class="stat"><span class="stat-label"><span class="hl">${l}</span></span><span class="stat-value">${v}<small>${u}</small></span><span class="stat-how">${esc(h)}</span></div>`).join('');
    $('explore').innerHTML = [
      ['projects', '프로젝트', '공모전·학습 프로그램 결과물', `${pub().length}건`],
      ['career', '경력·봉사', '실습·근로·해외인턴과 봉사', `${K.length}개 · ${volHours}시간`],
      ['certs', '자격증', '취득했거나 준비 중인 자격', `${certDone}/${Z.length}개`],
      ['evidence', '증빙자료', '확인서·결과물 모아보기', `${EV.length}건`]
    ].map(([h, t, d, n]) => `<a class="go" href="#${h}"><small>${h}</small><b>${t}</b><span>${d}</span><em>${n}</em><i aria-hidden="true">→</i></a>`).join('');
    renderResume();
    $('n-proj').textContent = pub().length; $('n-career').textContent = K.length + V.length; $('n-cert').textContent = Z.length; $('n-ev').textContent = EV.length;
  }

  /* 이력 — 목차 자리에 두는 한 장짜리 이력서. 항목마다 그 경험에서 얻은 키워드를 붙여요. */
  const COMP_KW = { reading: 0, edu: 1, digital: 1, library: 1, school: 1 };
  /* 이력 — 목차 자리에 두는 한 장짜리 이력서 (세 칸: 나 · Career/Awards · Projects) */
  function renderResume() {
    const PR = DATA.profile, KW = PR.keywords || [];
    const tag = (n) => (n != null && KW[n] ? `<span class="kw kw${n}">${esc(KW[n].word)}</span>` : '');
    const li = (w, title, sub, extra, open) => `<li${open ? ` data-open="${esc(open)}" tabindex="0" role="button"` : ''}><span class="w">${esc(w)}</span><span><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}${extra || ''}</span></li>`;
    $('pf-name').textContent = PR.name || '';
    $('pf-dept').textContent = [PR.dept, PR.grad].filter(Boolean).join(' · ');
    $('pf-career').innerHTML = K.slice().sort((a, b) => byDateDesc(a.start, b.start))
      .map((k) => li(span(k.start.slice(0, 7), (k.end || '').slice(0, 7)), k.org, `${k.type} · ${k.role}`, tag(k.kw))).join('');
    const pubs = pub().filter((p) => !p.example);
    // 수상 내역은 따로 두지 않고 프로젝트에 합쳐서 보여 줘요 (대표 프로젝트 먼저, 나머지는 최근 순)
    const projLi = (p) => `<li data-open="${esc(p.id)}" tabindex="0" role="button"><span class="w">${esc(p.date ? p.date.slice(0, 4) : '')}</span><span><b>${p.award ? `<span class="badge award">${esc(p.award)}</span>` : ''}${esc(p.title)}</b><small>${esc(p.summary.length > 60 ? p.summary.slice(0, 58) + '…' : p.summary)}</small></span></li>`;
    $('pf-projects').innerHTML = pubs.filter((p) => p.featured).concat(pubs.filter((p) => !p.featured).sort((a, b) => byDateDesc(a.date, b.date))).map(projLi).join('');
    $('pf-certs').innerHTML = Z.slice().sort((a, b) => (a.status === b.status ? byDateDesc(a.date, b.date) : a.status === '취득' ? -1 : 1))
      .map((z) => li(z.date ? dot(z.date).slice(0, 7) : '예정', z.name, '', '')).join('');
  }
  document.querySelector('.sheet-profile').addEventListener('keydown', (e) => { const r = e.target.closest('[data-open]'); if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openProject(r.dataset.open); } });

  let filt = 'all';
  try { const f = localStorage.getItem('gahyeon-filter'); if (f === 'all' || f === 'award' || C[f]) filt = f; } catch (_) {}
  function renderProjects() {
    const list0 = pub();
    const feat = list0.filter((p) => p.featured).slice(0, 3);
    $('featured').innerHTML = feat.map((p) => {
      const hv = (p.headline && p.headline.value) || p.output || '결과물', hl = (p.headline && p.headline.label) || p.summary;
      return `<button class="pcard" type="button" data-open="${esc(p.id)}">
        <span class="pcard-top"><span>${callNo(p)}</span><span>${dot(p.date)}</span></span>
        <span class="pcard-body">
          <span class="row"><span class="badge">대표</span>${exBadge(p)}<span class="chip">${esc(C[p.comp].label)}</span></span>
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.summary)}</p>
          <span class="metric">${esc(hv)}<small>${esc(hl)}</small></span>
          <span class="more">역할·과정·결과·증빙 보기 →</span>
        </span>
      </button>`;
    }).join('');
    $('featured-wrap').hidden = feat.length === 0;
    const counts = {}; list0.forEach((p) => (counts[p.comp] = (counts[p.comp] || 0) + 1));
    const awardN = list0.filter((p) => p.award && !p.example).length;
    $('filters').innerHTML = [['all', '전체', list0.length], ['award', '수상작', awardN], ...Object.entries(C).map(([k, c]) => [k, c.label, counts[k] || 0]).filter(([k, , n]) => n > 0 || k === filt)]
      .map(([k, l, n]) => `<button class="filter${k === 'award' ? ' f-award' : ''}" type="button" id="f-${k}" data-f="${k}" aria-pressed="${k === filt}">${esc(l)}<span class="n">${n}</span></button>`).join('');
    const pick = (p) => filt === 'all' || (filt === 'award' ? !!p.award : p.comp === filt);
    const list = list0.filter(pick).sort((a, b) => (a.example - b.example) || byDateDesc(a.date, b.date));
    $('comp-note').textContent = filt === 'all' ? `전체 ${list.length}건 · 수상 ${awardN}건 · 분야별로 묶어 최근 순` : filt === 'award' ? `상을 받은 프로젝트 ${list.length}건 · 최근 순` : `${C[filt].note}  ${list.length}건`;
    const row = (p) => `
      <li><button class="prow" type="button" data-open="${esc(p.id)}">
        <span><span class="chip">${esc(C[p.comp].label)}</span>${exBadge(p)}<span class="code">${callNo(p)}</span></span>
        <span class="t"><b>${p.award ? `<span class="badge award">${esc(p.award)}</span>` : ''}${esc(p.title)}</b><span>${esc(p.summary)}</span></span>
        <span class="m">${p.date ? dot(p.date) : '날짜 미기재'}<br>${esc(p.org)}</span>
      </button></li>`;
    if (filt === 'all') {
      // 분야(KDC)별로 묶고, 묶음 안에서는 최근 순
      $('plist').innerHTML = Object.entries(C).map(([k, c]) => {
        const g = list.filter((p) => p.comp === k);
        if (!g.length) return '';
        const aw = g.filter((p) => p.award).length;
        return `<li class="group-h"><span class="code">${esc(c.code)}</span><b>${esc(c.label)}</b><small>${g.length}건${aw ? ` · 수상 ${aw}건` : ''}</small></li>${g.map(row).join('')}`;
      }).join('') || '<li class="empty-row">공개 프로젝트가 없어요.</li>';
    } else {
      $('plist').innerHTML = list.map(row).join('') || '<li class="empty-row">이 분류의 공개 프로젝트가 없어요.</li>';
    }
  }
  $('filters').addEventListener('click', (e) => {
    const b = e.target.closest('[data-f]'); if (!b) return;
    filt = b.dataset.f; try { localStorage.setItem('gahyeon-filter', filt); } catch (_) {}
    renderProjects(); setExpression('excited');
  });

  function renderCareer() {
    $('career-sum').textContent = `경력·활동 ${K.length}개 · 봉사 ${V.length}곳 ${volHours}시간`;
    $('timeline').innerHTML = K.slice().sort((a, b) => byDateDesc(a.start, b.start)).map((k) => `
      <li class="titem">
        <div class="t-when">${span(k.start, k.end)}${months(k.start, k.end) > 1 ? `<small>${months(k.start, k.end)}개월</small>` : ''}<span class="chip">${esc(k.type)}</span></div>
        <div class="t-main">
          <div class="titem-head"><h3>${esc(k.org)}</h3></div>
          <div class="role">${esc(k.role)}</div>
          ${k.summary ? `<div class="t-sum">${paras(k.summary)}</div>` : ''}
          ${k.did.length || (k.outcome || []).length ? `<button class="acc-btn" type="button" aria-expanded="false"><span>수행 업무${(k.outcome || []).length ? ' · 성과' : ''}</span><small>${k.did.length + (k.outcome || []).length}개</small><i aria-hidden="true"></i></button>
          <div class="acc"><div class="acc-in">
            ${k.did.length ? `<ul class="t-did">${k.did.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
            ${(k.outcome || []).length ? `<div class="t-out"><b>성과 · 배운 점</b><ul>${k.outcome.map((d) => `<li>${esc(d)}</li>`).join('')}</ul></div>` : ''}
          </div></div>` : ''}
          ${k._ev.length ? `<div class="ev-wrap">${k._ev.map(evChip).join('')}</div>` : ''}
        </div>
      </li>`).join('');
    $('vol-sum').textContent = `${volSessions}회 · 총 ${volHours}시간${yearSpan() ? ' · ' + yearSpan() : ''} · 1365 자원봉사 실적 기준`;
    $('vol').innerHTML = V.slice().sort((a, b) => byDateDesc(a.end, b.end)).map((v) => `
      <article class="vcard">
        <div class="vcard-head"><span class="chip">${esc(v.field)}</span><span class="vh">${v.hours}<small>시간</small></span></div>
        <h3>${esc(v.title)}</h3>
        <span class="vorg">${esc(v.org)} · ${span(v.start, v.end)}</span>
        ${v.note ? `<p class="vnote">${esc(v.note)}</p>` : ''}
        <ul class="sessions">${v.sessions.slice().reverse().map(([d, h, t]) => `<li><span class="sd">${dot(d).slice(2)}</span><span>${esc(t)}</span><span class="sh">${esc(h)}h</span></li>`).join('')}</ul>
        <div class="ev-wrap">${v._ev.map(evChip).join('')}</div>
      </article>`).join('');
  }
  function renderCerts() {
    $('cert-sum').textContent = `취득 ${certDone}개 · 취득 예정 ${Z.length - certDone}개`;
    $('certs').innerHTML = Z.slice().sort((a, b) => (a.status === b.status ? byDateDesc(a.date, b.date) : a.status === '취득' ? -1 : 1)).map((z) => `
      <article class="cert">
        <span class="status ${z.status === '취득' ? 'done' : 'plan'}">${esc(z.status)}</span>
        <h3>${esc(z.name)}</h3>
        ${z.issuer ? `<span class="issuer">${esc(z.issuer)}</span>` : ''}
        <span class="date">${z.date ? dot(z.date) + ' 취득' : '졸업과 함께 취득 예정'}</span>
        ${z.detail ? `<p class="detail">${esc(z.detail)}</p>` : ''}
        ${z._ev.length ? `<div class="ev-wrap">${z._ev.map(evChip).join('')}</div>` : ''}
      </article>`).join('');
  }
  let evFilt = '전체';
  function renderEvidence() {
    const evOk = EV.filter(viewable).length;
    $('ev-sum').innerHTML = `<span class="pill lav">전체 ${EV.length}건</span><span class="pill yel">바로 보기 ${evOk}건</span><span class="pill">요청 시 제공 ${EV.length - evOk}건</span>`;
    const groups = ['전체', '프로젝트', '경력', '봉사', '자격증'];
    $('ev-filters').innerHTML = groups.map((g) => `<button class="filter" type="button" id="ef-${g}" data-ef="${g}" aria-pressed="${g === evFilt}">${g}<span class="n">${g === '전체' ? EV.length : EV.filter((e) => e.group === g).length}</span></button>`).join('');
    const list = EV.map((e, i) => [e, i]).filter(([e]) => evFilt === '전체' || e.group === evFilt);
    $('evlist').innerHTML = list.length ? list.map(([e, i]) => `
      <li class="ev-row">
        <span class="ev-kind">${esc(e.kind)}</span>
        <span class="ev-t"><b>${esc(e.title)}</b><span>${esc(e.group)} · ${esc(e.source)}</span></span>
        ${viewable(e) ? `<button type="button" class="btn btn-lav btn-sm" data-ev="${i}">${e.file ? '바로 보기' : '링크 열기'}</button>` : `<span class="ev-note">${esc(e.note || '요청 시 제공')}</span>`}
      </li>`).join('') : '<li class="ev-row"><span class="ev-t"><span>이 분류에는 아직 증빙이 없어요.</span></span></li>';
  }
  $('ev-filters').addEventListener('click', (e) => { const b = e.target.closest('[data-ef]'); if (!b) return; evFilt = b.dataset.ef; renderEvidence(); });

  function renderPublic() { derive(); rebuildEvidence(); renderProfile(); renderHome(); renderProjects(); renderCareer(); renderCerts(); renderEvidence(); }

  /* ═════════ 상세 대화상자 (공개 화면: 메모·비공개 절대 표시 안 함) ═════════ */
  const pdlg = $('pdlg'), edlg = $('edlg'), fdlg = $('fdlg'), gdlg = $('gdlg');
  /* 긴 글 → 읽기 편한 단락: 문장 단위로 나눠 두 문장(또는 약 90자)마다 단락을 바꿔요 */
  function paras(t, cls) {
    const sents = String(t || '').split(/(?<=[.!?。])\s+/).filter(Boolean);
    const out = []; let cur = '';
    sents.forEach((x) => { if (cur && ((cur.match(/[.!?]/g) || []).length >= 2 || (cur + x).length > 90)) { out.push(cur); cur = x; } else cur = cur ? cur + ' ' + x : x; });
    if (cur) out.push(cur);
    return out.map((x) => `<p class="para${cls ? ' ' + cls : ''}">${esc(x)}</p>`).join('');
  }
  /* 프로젝트 7단계 — 01 소개 · 02 개요 · 03 진행한 일 · 04 과정 · 05 결과물 · 06 성장한 점 · 07 나의 역량
     (내용이 없는 단계는 건너뛰고 번호를 이어 붙여요) */
  function steps7(p) {
    const step = (title, sub, body) => ({ title, sub, body });
    const chal = (p.challenge || []).filter((c) => c && c[1]);
    const proc = p.process.map((s) => { const i = s.indexOf('|'); return i < 0 ? `<li>${esc(s)}</li>` : `<li><b>${esc(s.slice(0, i).trim())}</b><span>${esc(s.slice(i + 1).trim())}</span></li>`; }).join('');
    const details = p.details.map((d) => `<div class="d-box"><h4>${esc(d.title)}</h4><ul>${(d.items || []).map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>`).join('');
    const video = p.video && safeUrl(p.video.src) ? `<div class="d-video"><video controls preload="metadata" playsinline src="${esc(safeUrl(p.video.src))}">브라우저에서 영상을 재생할 수 없어요.</video>${safeUrl(p.video.page) ? `<a class="btn btn-line btn-sm" href="${esc(safeUrl(p.video.page))}" target="_blank" rel="noopener">학술정보원 공지에서 보기 ↗</a>` : ''}</div>` : '';
    const quote = p.quote && p.quote.text ? `<blockquote class="d-quote"><p>“${esc(p.quote.text)}”</p><cite>${esc(p.quote.by || '')}</cite></blockquote>` : '';
    const results = p.results.length ? `<div class="results">${p.results.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>` : '';
    const list = [
      p.summary && step('프로젝트 소개', '한 줄 소개', `<p class="d-lead">${esc(p.summary)}</p>`),
      p.background && step('프로젝트 개요', '배경과 목적', paras(p.background)),
      chal.length && step('진행한 일', '배경 · 문제 · 해결', `<dl class="chal">${chal.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`),
      (p.role || proc) && step('과정', '나의 역할과 직접 한 일', `${p.role ? `<div class="role-p">${paras(p.role)}</div>` : ''}${proc ? `<ol class="steps">${proc}</ol>` : ''}`),
      (p.output || details || video) && step('결과물', '최종 결과와 포인트', `${p.output ? `<p class="output">${esc(p.output)}</p>` : ''}${video}${details}`),
      (results || quote) && step('성장한 점', '성과', results + quote),
      p.learned && step('나의 역량', '배운 점과 앞으로', paras(p.learned))
    ].filter(Boolean);
    return `<div class="steps7">${list.map((x, i) => `<section class="s7"><header><span class="n">${String(i + 1).padStart(2, '0')}</span><b>${x.title}</b><small>${x.sub}</small></header><div>${x.body}</div></section>`).join('')}</div>`;
  }
  function openProject(id) {
    const p = pub().find((x) => x.id === id); if (!p) return;
    $('pdlg-body').innerHTML = `
      <div class="d-head">
        <div><div class="eyebrow">${callNo(p)} · ${esc(C[p.comp].label)}</div><h2 id="pdlg-title">${esc(p.title)} ${exBadge(p)}</h2></div>
        <button class="close" type="button" data-close aria-label="닫기">✕</button>
      </div>
      <div class="d-body">
        ${p.example ? '<p class="ex-note">이 항목은 사이트 사용법을 보여 주는 <b>예시</b>예요. 실제 활동이 아니에요.</p>' : ''}
        <div class="d-meta">
          <div><span>${p.period ? '기간' : '날짜'}</span><b>${p.period ? esc(p.period) : p.date ? dot(p.date) : '미기재'}</b></div>
          <div><span>주관</span><b>${esc(p.org || '-')}</b></div>
          <div><span>${p.team ? '팀' : '분야'}</span><b>${esc(p.team || C[p.comp].label)}</b></div>
          <div><span>${p.award ? '수상' : '결과물'}</span><b>${esc(p.award || p.output || '-')}</b></div>
        </div>
        ${steps7(p)}
        <section class="field"><h3>증빙</h3>${p._ev && p._ev.length ? `<div class="ev-wrap">${p._ev.map(evChip).join('')}</div>` : '<p class="d-src">결과물은 요청하시면 보여 드려요.</p>'}</section>
      </div>`;
    if (!pdlg.open) pdlg.showModal();
    pdlg.querySelector('[data-close]').focus();
    setExpression('love');
  }
  function openEvidence(i) {
    const e = EV[i]; if (!e || !viewable(e)) return;
    let body;
    if (e.file && /\.(png|jpe?g|gif|webp|svg)$/i.test(e.file)) body = `<img class="ev-img" src="${esc(e.file)}" alt="${esc(e.title)}">`;
    else if (e.file) body = `<p>PDF·문서 파일이에요. 새 탭에서 열어 주세요.</p><a class="btn btn-lav" href="${esc(e.file)}" target="_blank" rel="noopener">새 탭에서 열기 ↗</a>`;
    else { let h = ''; try { h = new URL(e.url).host; } catch (_) {} body = `<p>외부 사이트${h ? ` (<b>${esc(h)}</b>)` : ''}에 있는 자료예요.</p><a class="btn btn-lav" href="${esc(safeUrl(e.url))}" target="_blank" rel="noopener">링크 열기 ↗</a>`; }
    $('edlg-body').innerHTML = `
      <div class="d-head">
        <div><div class="eyebrow">${esc(e.group)} · ${esc(e.kind)}</div><h2 id="edlg-title">${esc(e.title)}</h2><p class="d-src">${esc(e.source)}</p></div>
        <button class="close" type="button" data-close aria-label="닫기">✕</button>
      </div>
      <div class="d-body">${body}</div>`;
    if (!edlg.open) edlg.showModal();
    edlg.querySelector('[data-close]').focus();
    setExpression('proud');
  }
  [pdlg, edlg, fdlg, gdlg].forEach((d) => {
    d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
  });
  document.addEventListener('click', (e) => {
    if (e.target.closest('#page-edit')) return;
    const ev = e.target.closest('[data-ev]');
    if (ev) { openEvidence(Number(ev.dataset.ev)); return; }
    const op = e.target.closest('[data-open]');
    if (op) openProject(op.dataset.open);
  });

  /* ═════════ 저장 ═════════ */
  let toastT;
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2600); }

  /* 바뀐 내용을 화면에 반영하고 저장합니다 */
  function commit(msg) {
    DATA.updatedAt = new Date().toISOString();
    renderPublic(); renderEditor();
    if (mode === 'site') { writeLocal(); publishNow(msg); return; }
    if (mode === 'readonly') { writeLocal(); toast('보기 전용 화면이라 사이트에는 저장되지 않아요. 이 브라우저에만 임시로 남겨 뒀어요'); return; }
    const ok = writeLocal();
    if (ok) lastSaved = DATA.updatedAt;
    renderSaveState();
    toast(ok ? msg + ' (이 브라우저에 저장)' : '바뀌었지만 저장하지 못했어요. JSON 백업을 받아 두세요');
  }

  async function publishNow(msg, retried) {
    if (saving) { pending = true; return; }
    saving = true; saveError = ''; renderSaveState();
    try {
      await host.publish({ 'data.js': { content: dataJS(), contentType: 'text/javascript' } });
      saving = false; lastSaved = DATA.updatedAt; clearLocal();
      renderSaveState();
      if (!pending) toast((msg || '저장했어요') + ' · 사이트에 반영됐어요');
    } catch (err) {
      saving = false;
      const code = err && err.code;
      if (code === 'conflict') {
        saveError = '다른 창에서 먼저 저장해서 최신 버전으로 다시 불러와요. 방금 고친 내용은 이 브라우저에 남겨 뒀으니, 다시 열리면 ‘사이트에 반영’을 눌러 주세요.';
      } else if (['not_writer', 'not_granted', 'not_declared', 'capability_disabled', 'capability_removed', 'consent_required'].includes(code)) {
        mode = 'readonly';
        saveError = '이 화면에서는 사이트에 저장할 수 없어요 (보기 전용이거나 공개 링크로 열었어요). 고친 내용은 이 브라우저에만 임시로 남아 있어요.';
        renderModeUI();
      } else if (code === 'rate_limited') {
        saveError = '너무 자주 저장하고 있어요. 잠시 뒤 자동으로 다시 저장할게요.';
        pending = false; renderSaveState();
        setTimeout(() => publishNow(msg, true), 8000);
        return;
      } else if (!retried) {
        pending = false;
        setTimeout(() => publishNow(msg, true), 1500 + Math.random() * 1500);
        return;
      } else {
        saveError = '사이트에 저장하지 못했어요. 고친 내용은 이 브라우저에 남겨 뒀어요. 잠시 뒤 아래 ‘지금 다시 저장’을 눌러 주세요.';
      }
      renderSaveState();
      toast('사이트에 저장하지 못했어요');
      return;
    }
    if (pending) { pending = false; publishNow(msg); }
  }

  function renderSaveState() {
    const el = $('save-state'); if (!el) return;
    const t = lastSaved ? fmtTime(lastSaved) : '';
    let cls = 'save-state', text;
    if (saveError) { cls += ' bad'; text = saveError; }
    else if (mode === 'site') {
      if (saving) text = '사이트에 저장하는 중…';
      else { cls += ' ok'; text = `사이트에 저장됨${t ? ' · ' + t : ''} · 고치면 바로 저장돼요. 링크로 보는 사람에게도 같은 내용이 보여요.`; }
    } else if (mode === 'readonly') { cls += ' bad'; text = '보기 전용 화면이에요. 여기서 고친 내용은 사이트에 저장되지 않아요.'; }
    else if (!storageOK) { cls += ' bad'; text = '이 브라우저에는 저장할 수 없어요 (사생활 보호 모드이거나 저장소가 막혀 있어요). 지금 바로 JSON 백업을 받아 두세요.'; }
    else text = `내 컴퓨터에서 연 파일이에요 · 이 브라우저에 저장${t ? ' · ' + t : ''}. 파일에 반영하려면 아래 ‘data.js 내려받기’로 바꿔 넣으세요.`;
    el.className = cls; el.textContent = text;
    const retry = $('save-retry'); if (retry) retry.hidden = !(mode === 'site' && saveError && !saving);
  }
  function renderModeUI() {
    const site = mode === 'site', ro = mode === 'readonly';
    $('ed-note').textContent = site ? '여기서 고치면 사이트(data.js)에 바로 저장되고, 링크로 보는 모든 사람에게 반영돼요.'
      : ro ? '보기 전용 화면이에요. 편집 권한이 있는 계정으로 열어야 저장돼요.'
      : '내 컴퓨터에서 연 파일이라 이 브라우저에만 저장돼요.';
    $('store-info').innerHTML = site ? `
        <div><b>어디에 저장되나요?</b>‘저장’을 누르는 순간 사이트의 data.js가 새 버전으로 저장돼요. 이전 버전은 claude.ai 기록에 남아요.</div>
        <div><b>누구에게 보이나요?</b>이 사이트 링크를 받은 사람 모두에게 바뀐 내용이 보여요. 비공개·예시·취업 메모는 화면에서 숨겨져요.</div>
        <div><b>주의할 점</b><ul><li>비공개 항목과 메모도 data.js 파일 안에는 들어 있어요. 꼭 숨길 내용은 적지 마세요.</li><li>연락처·주소·주민번호는 넣지 마세요.</li></ul></div>`
      : `
        <div><b>어디에 저장되나요?</b>지금 쓰는 브라우저의 저장소(localStorage)에 자동 저장돼요.</div>
        <div><b>다른 기기에서도 보이나요?</b>아니요. 파일에 반영하려면 ‘data.js 내려받기’로 받은 파일을 폴더의 data.js와 바꿔 넣으세요.</div>
        <div><b>언제 지워지나요?</b><ul><li>브라우저의 사이트 데이터 삭제</li><li>시크릿 창을 닫을 때</li><li>‘기본값으로 되돌리기’를 누를 때</li></ul></div>`;
    $('nav-edit').hidden = !(mode === 'local' || (mode === 'site' && canEdit !== false));
    $('bk-reset-wrap').hidden = mode !== 'local';
    renderRestore(); renderSaveState();
  }
  /* 예전에 이 브라우저에만 저장해 둔 편집본이 있으면 사이트에 반영할지 묻기 */
  function renderRestore() {
    const box = $('restore');
    const show = mode === 'site' && localCopy && comparable(normalizeAll(clone(localCopy.data))) !== comparable(DATA);
    box.hidden = !show;
    if (show) $('restore-msg').textContent = `이 브라우저에만 저장된 편집본이 있어요${localCopy.savedAt ? ` (${fmtTime(localCopy.savedAt)})` : ''}. 사이트에 반영할까요?`;
  }
  $('restore-yes').addEventListener('click', () => {
    if (!localCopy) return;
    DATA = normalizeAll(clone(localCopy.data)); localCopy = null;
    $('restore').hidden = true;
    commit('브라우저 편집본을 반영했어요');
  });
  $('restore-no').addEventListener('click', () => { localCopy = null; clearLocal(); $('restore').hidden = true; toast('브라우저 편집본을 지웠어요'); });
  $('save-retry').addEventListener('click', () => { if (mode === 'site') publishNow('다시 저장했어요'); });

  /* ═════════ 편집 화면 · 프로젝트 ═════════ */
  let eq = '', eview = 'all', confirmId = '';
  function renderEditor() {
    const P = DATA.projects;
    const q = eq.trim().toLowerCase();
    const counts = { all: P.length, public: P.filter((p) => !p.private).length, private: P.filter((p) => p.private).length, example: P.filter((p) => p.example).length };
    $('e-views').innerHTML = [['all', '전체'], ['public', '공개'], ['private', '비공개'], ['example', '예시']]
      .map(([k, l]) => `<button class="filter" type="button" id="ev-${k}" data-eview="${k}" aria-pressed="${k === eview}">${l}<span class="n">${counts[k]}</span></button>`).join('');
    const list = P.filter((p) => (eview === 'all' || (eview === 'public' && !p.private) || (eview === 'private' && p.private) || (eview === 'example' && p.example)) &&
      (!q || [p.title, p.summary, p.org, p.memo, p.role, ...p.process].join(' ').toLowerCase().includes(q)))
      .sort((a, b) => byDateDesc(a.date, b.date));
    $('elist').innerHTML = list.map((p) => {
      const key = 'p:' + p.id;
      return `<li class="erow${p.private ? ' is-private' : ''}">
        <div class="erow-main">
          <div class="erow-badges"><span class="chip">${esc(C[p.comp].label)}</span>${p.featured ? '<span class="badge">대표</span>' : ''}${p.example ? '<span class="badge ex">예시</span>' : ''}${p.private ? '<span class="badge priv">비공개</span>' : '<span class="badge pub">공개</span>'}</div>
          <b>${esc(p.title)}</b>
          <span class="erow-meta">${p.date ? dot(p.date) : '날짜 미기재'}${p.org ? ' · ' + esc(p.org) : ''}</span>
          ${p.memo ? `<span class="erow-memo"><i>취업 메모</i>${esc(p.memo)}</span>` : ''}
        </div>
        <div class="erow-acts">${rowActs(key, 'project', p.id)}</div>
      </li>`;
    }).join('') || '<li class="empty-row">조건에 맞는 프로젝트가 없어요.</li>';
    renderOtherLists();
    renderSaveState();
  }
  const rowActs = (key, kind, ref) => (confirmId === key
    ? `<span class="ask">정말 삭제할까요?</span><button class="btn btn-danger btn-sm" type="button" data-del-yes="${esc(key)}">삭제</button><button class="btn btn-line btn-sm" type="button" data-del-no>취소</button>`
    : `<button class="btn btn-yel btn-sm" type="button" data-edit-kind="${kind}" data-ref="${esc(ref)}">수정</button><button class="btn btn-line btn-sm" type="button" data-del="${esc(key)}">삭제</button>`);

  function renderOtherLists() {
    const PR = DATA.profile;
    $('e-profile').innerHTML = `<li class="erow"><div class="erow-main"><b>${esc(PR.name)} · ${esc(PR.siteName)}</b>
      <span class="erow-meta">${esc(PR.dept)} · ${esc(PR.grad)}</span>
      <span class="erow-meta">${esc((PR.headline || '').replace(/\n/g, ' '))}</span></div>
      <div class="erow-acts"><button class="btn btn-yel btn-sm" type="button" data-edit-kind="profile" data-ref="0">수정</button></div></li>`;
    $('e-career').innerHTML = DATA.career.map((k, i) => ({ k, i })).sort((a, b) => byDateDesc(a.k.start, b.k.start)).map(({ k, i }) => `
      <li class="erow"><div class="erow-main"><div class="erow-badges"><span class="chip">${esc(k.type || '경력')}</span></div>
        <b>${esc(k.org)}</b><span class="erow-meta">${esc(k.role)}${k.start ? ' · ' + span(k.start, k.end) : ''}</span></div>
        <div class="erow-acts">${rowActs('career:' + i, 'career', i)}</div></li>`).join('') || '<li class="empty-row">경력이 없어요.</li>';
    $('e-vol').innerHTML = DATA.volunteer.map((v, i) => {
      const h = v.sessions.reduce((s, x) => s + (Number(x[1]) || 0), 0);
      return `<li class="erow"><div class="erow-main"><div class="erow-badges"><span class="chip">${esc(v.field || '봉사')}</span></div>
        <b>${esc(v.title)}</b><span class="erow-meta">${esc(v.org)} · ${v.sessions.length}회 ${h}시간</span></div>
        <div class="erow-acts">${rowActs('vol:' + i, 'vol', i)}</div></li>`;
    }).join('') || '<li class="empty-row">봉사 기록이 없어요.</li>';
    $('e-certs').innerHTML = DATA.certs.map((z, i) => `
      <li class="erow"><div class="erow-main"><div class="erow-badges"><span class="badge ${z.status === '취득' ? 'pub' : 'ex'}">${esc(z.status)}</span></div>
        <b>${esc(z.name)}</b><span class="erow-meta">${z.date ? dot(z.date) : '날짜 미기재'}${z.issuer ? ' · ' + esc(z.issuer) : ''}</span></div>
        <div class="erow-acts">${rowActs('cert:' + i, 'cert', i)}</div></li>`).join('') || '<li class="empty-row">자격증이 없어요.</li>';
  }

  $('eq').addEventListener('input', (e) => { eq = e.target.value; renderEditor(); });
  $('e-views').addEventListener('click', (e) => { const b = e.target.closest('[data-eview]'); if (!b) return; eview = b.dataset.eview; renderEditor(); });
  $('page-edit').addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.editKind) {
      const k = t.dataset.editKind, r = t.dataset.ref;
      if (k === 'project') openForm(r); else openGeneric(k, Number(r));
    } else if (t.dataset.add) {
      if (t.dataset.add === 'project') openForm(''); else openGeneric(t.dataset.add, -1);
    } else if (t.dataset.del) { confirmId = t.dataset.del; renderEditor(); }
    else if (t.hasAttribute('data-del-no')) { confirmId = ''; renderEditor(); }
    else if (t.dataset.delYes) {
      const [kind, ref] = [t.dataset.delYes.slice(0, t.dataset.delYes.indexOf(':')), t.dataset.delYes.slice(t.dataset.delYes.indexOf(':') + 1)];
      if (kind === 'p') DATA.projects = DATA.projects.filter((p) => p.id !== ref);
      if (kind === 'career') DATA.career.splice(Number(ref), 1);
      if (kind === 'vol') DATA.volunteer.splice(Number(ref), 1);
      if (kind === 'cert') DATA.certs.splice(Number(ref), 1);
      confirmId = '';
      commit('삭제했어요');
    }
  });

  /* 증빙 입력: 한 줄에 하나 · 종류 | 제목 | 링크·파일(선택) | 안내(선택) */
  const evToText = (list) => (list || []).map((ev) => [ev.kind, ev.title, ev.url || ev.file || '', ev.note || ''].join(' | ').replace(/( \| )+$/, '')).join('\n');
  const textToEv = (t) => lines(t).map((l) => {
    const [kind, title, link, note] = pipe(l);
    const ev = { kind: title ? kind : '자료', title: title || kind };
    if (link) { if (/^https?:\/\//i.test(link)) ev.url = link; else ev.file = link; }
    if (note) ev.note = note;
    return ev;
  });

  /* 프로젝트 입력 폼 */
  $('f-comp').innerHTML = Object.entries(C).map(([k, c]) => `<option value="${k}">${esc(c.label)} (${c.code})</option>`).join('');
  let editingId = '';
  function openForm(id) {
    editingId = id;
    const p = id ? DATA.projects.find((x) => x.id === id) : normProject({ comp: COMP_KEYS[0] });
    if (!p) return;
    $('fdlg-title').textContent = id ? '프로젝트 수정' : '새 프로젝트';
    $('f-title').value = p.title; $('f-comp').value = p.comp; $('f-date').value = p.date; $('f-org').value = p.org;
    $('f-output').value = p.output; $('f-summary').value = p.summary; $('f-role').value = p.role;
    $('f-team').value = p.team; $('f-period').value = p.period; $('f-award').value = p.award;
    $('f-background').value = p.background; $('f-learned').value = p.learned;
    $('f-process').value = p.process.join('\n');
    $('f-results').value = p.results.map(([v, l]) => (l ? `${v} | ${l}` : v)).join('\n');
    $('f-evidence').value = evToText(p.evidence);
    $('f-featured').checked = p.featured; $('f-example').checked = p.example; $('f-private').checked = p.private;
    $('f-hl-value').value = (p.headline && p.headline.value) || ''; $('f-hl-label').value = (p.headline && p.headline.label) || '';
    $('f-memo').value = p.memo;
    $('f-err').hidden = true;
    fdlg.showModal();
    $('f-title').focus();
  }
  $('fform').addEventListener('submit', (e) => {
    e.preventDefault();
    const err = (m, field) => { $('f-err').textContent = m; $('f-err').hidden = false; if (field) $(field).focus(); };
    const title = $('f-title').value.trim();
    if (!title) return err('제목을 입력해 주세요.', 'f-title');
    const date = $('f-date').value;
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return err('날짜 형식이 올바르지 않아요. 달력에서 골라 주세요.', 'f-date');
    const old = editingId ? DATA.projects.find((x) => x.id === editingId) : null;
    const hv = $('f-hl-value').value.trim(), hl = $('f-hl-label').value.trim();
    const next = normProject(Object.assign({}, old || {}, {
      id: editingId || '',
      team: $('f-team').value.trim(), period: $('f-period').value.trim(), award: $('f-award').value.trim(),
      background: $('f-background').value.trim(), learned: $('f-learned').value.trim(),
      title, comp: $('f-comp').value, date, org: $('f-org').value.trim(), output: $('f-output').value.trim(),
      summary: $('f-summary').value.trim(), role: $('f-role').value.trim(),
      process: lines($('f-process').value),
      results: lines($('f-results').value).map((l) => { const [v, d] = pipe(l); return [v, d || '']; }),
      evidence: textToEv($('f-evidence').value),
      featured: $('f-featured').checked, example: $('f-example').checked, private: $('f-private').checked,
      headline: hv ? { value: hv, label: hl } : null,
      memo: $('f-memo').value.trim()
    }));
    if (old) DATA.projects = DATA.projects.map((x) => (x.id === editingId ? next : x)); else DATA.projects.unshift(next);
    fdlg.close();
    commit(old ? '수정했어요' : '추가했어요');
  });

  /* ═════════ 편집 화면 · 프로필·경력·봉사·자격증 (공통 폼) ═════════ */
  const DATE_RE = /^\d{4}-\d{2}(-\d{2})?$/;
  const SCHEMAS = {
    profile: {
      title: '프로필 수정',
      fields: [
        ['name', '이름', 'text', { req: true }], ['nameEn', '영문 이름', 'text'],
        ['siteName', '사이트 이름', 'text'], ['year', '표지 연도', 'text', { ph: '2026' }],
        ['dept', '소속', 'text'], ['grad', '상태', 'text', { ph: '졸업예정' }],
        ['headline', '첫 화면 큰 제목', 'textarea', { full: true, hint: '줄바꿈 그대로 보여요' }],
        ['lead', '소개 문장 1', 'textarea', { full: true }], ['lead2', '소개 문장 2', 'textarea', { full: true }],
        ['quote', '인용구', 'text', { full: true }], ['quoteBy', '인용구 출처', 'text'],
        ['facts', '한눈에 보기', 'textarea', { full: true, hint: '한 줄에 하나 · 제목 | 내용', get: (v) => (v || []).map((f) => f.join(' | ')).join('\n'), set: (t) => lines(t).map((l) => { const [a, b] = pipe(l); return [a, b || '']; }) }],
        ['about', '소개 카드', 'textarea', { full: true, hint: '한 줄에 하나 · 제목 | 내용', get: (v) => (v || []).map((a) => `${a.title} | ${a.text}`).join('\n'), set: (t) => lines(t).map((l) => { const i = l.indexOf('|'); return i < 0 ? { title: l, text: '' } : { title: l.slice(0, i).trim(), text: l.slice(i + 1).trim() }; }) }]
      ]
    },
    career: {
      title: '경력', list: 'career', blank: normCareer,
      fields: [
        ['org', '기관 (필수)', 'text', { req: true, full: true }],
        ['type', '종류', 'text', { ph: '실무수습 · 근로 · 교생실습' }], ['role', '역할', 'text', { ph: '실무수습생' }],
        ['start', '시작', 'text', { ph: '2024-07 또는 2024-07-22', date: true }], ['end', '끝', 'text', { ph: '비우면 시작일과 같게', date: true }],
        ['summary', '한 줄 요약', 'textarea', { full: true }],
        ['did', '한 일', 'textarea', { full: true, hint: '한 줄에 하나', get: (v) => (v || []).join('\n'), set: lines }],
        ['outcome', '성과 · 배운 점', 'textarea', { full: true, hint: '한 줄에 하나', get: (v) => (v || []).join('\n'), set: lines }],
        ['evidence', '증빙', 'textarea', { full: true, hint: '한 줄에 하나 · 종류 | 제목 | 링크(선택) | 안내(선택)', get: evToText, set: textToEv }]
      ]
    },
    vol: {
      title: '봉사', list: 'volunteer', blank: normVol,
      fields: [
        ['title', '봉사 이름 (필수)', 'text', { req: true, full: true }],
        ['org', '봉사처', 'text'], ['field', '분야', 'text', { ph: '교육 · 생활편의' }],
        ['center', '인증 센터', 'text', { full: true, ph: '대구광역시 동구 자원봉사센터' }],
        ['note', '한 일 · 배운 점', 'textarea', { full: true }],
        ['sessions', '봉사 일정 (필수)', 'textarea', { full: true, req: true, hint: '한 줄에 한 번 · 날짜 | 시간 | 내용  예) 2026-09-20 | 8 | 도서관 안전지도', get: (v) => (v || []).map((s) => s.join(' | ')).join('\n'),
          set: (t) => lines(t).map((l) => { const [d, h, x] = pipe(l); return [d, Number(h) || 0, x || '']; }),
          check: (arr) => (arr.length === 0 ? '봉사 일정을 한 줄 이상 적어 주세요.' : arr.some(([d]) => !/^\d{4}-\d{2}-\d{2}$/.test(d)) ? '날짜는 2026-09-20처럼 적어 주세요.' : arr.some(([, h]) => !(h > 0)) ? '시간은 숫자로 적어 주세요. 예) 2026-09-20 | 8 | 내용' : '') }],
        ['evidence', '증빙', 'textarea', { full: true, hint: '비우면 ‘1365 자원봉사 실적 · 요청 시 제공’으로 표시돼요', get: (v) => evToText(v), set: (t) => { const a = textToEv(t); return a.length ? a : undefined; } }]
      ]
    },
    cert: {
      title: '자격증', list: 'certs', blank: normCert,
      fields: [
        ['name', '자격증 이름 (필수)', 'text', { req: true, full: true }],
        ['issuer', '발급 기관', 'text'], ['status', '상태', 'select', { options: ['취득', '예정'] }],
        ['date', '취득일', 'date'], ['detail', '설명', 'text', { ph: '점수·등급 등 (선택)' }],
        ['evidence', '증빙', 'textarea', { full: true, hint: '한 줄에 하나 · 종류 | 제목 | 링크(선택) | 안내(선택)', get: evToText, set: textToEv }]
      ]
    }
  };
  let gKind = '', gIndex = -1;
  function openGeneric(kind, index) {
    const S = SCHEMAS[kind]; if (!S) return;
    gKind = kind; gIndex = index;
    const item = kind === 'profile' ? DATA.profile : index >= 0 ? DATA[S.list][index] : S.blank({});
    if (!item) return;
    $('gdlg-title').textContent = kind === 'profile' ? S.title : `${S.title} ${index >= 0 ? '수정' : '추가'}`;
    $('g-fields').innerHTML = S.fields.map(([key, label, type, o = {}]) => {
      const id = 'g-' + key, v = o.get ? o.get(item[key]) : (item[key] == null ? '' : item[key]);
      const lab = `<label for="${id}">${esc(label)}${o.hint ? ` <small>${esc(o.hint)}</small>` : ''}</label>`;
      const ph = o.ph ? ` placeholder="${esc(o.ph)}"` : '';
      const input = type === 'textarea' ? `<textarea id="${id}"${ph}>${esc(v)}</textarea>`
        : type === 'select' ? `<select id="${id}">${o.options.map((x) => `<option${x === v ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>`
        : `<input type="${type}" id="${id}" value="${esc(v)}"${ph}>`;
      return `<div class="ff${o.full ? ' full' : ''}">${lab}${input}</div>`;
    }).join('');
    $('g-err').hidden = true;
    gdlg.showModal();
    const first = $('g-fields').querySelector('input,textarea,select'); if (first) first.focus();
  }
  $('gform').addEventListener('submit', (e) => {
    e.preventDefault();
    const S = SCHEMAS[gKind]; if (!S) return;
    const err = (m, key) => { $('g-err').textContent = m; $('g-err').hidden = false; if (key) $('g-' + key).focus(); };
    const base = gKind === 'profile' ? DATA.profile : gIndex >= 0 ? DATA[S.list][gIndex] : S.blank({});
    const next = Object.assign({}, base);
    for (const [key, label, , o = {}] of S.fields) {
      const raw = $('g-' + key).value;
      const val = o.set ? o.set(raw) : raw.trim();
      if (o.req && (val == null || val === '' || (Array.isArray(val) && !val.length))) return err(`${label.replace(/\s*\(필수\)/, '')}을(를) 입력해 주세요.`, key);
      if (o.date && val && !DATE_RE.test(val)) return err('날짜는 2024-07 또는 2024-07-22처럼 적어 주세요.', key);
      if (o.check) { const m = o.check(val); if (m) return err(m, key); }
      if (val === undefined) delete next[key]; else next[key] = val;
    }
    if (gKind === 'cert' && next.status === '취득' && next.date && !/^\d{4}-\d{2}-\d{2}$/.test(next.date)) return err('취득일을 달력에서 골라 주세요.', 'date');
    if (gKind === 'profile') DATA.profile = next;
    else if (gIndex >= 0) DATA[S.list][gIndex] = next;
    else DATA[S.list].unshift(next);
    gdlg.close();
    commit(gKind === 'profile' ? '프로필을 수정했어요' : gIndex >= 0 ? '수정했어요' : '추가했어요');
  });

  /* ═════════ 백업 ═════════ */
  const backupJSON = () => JSON.stringify({ app: 'gahyeon-portfolio', version: 2, exportedAt: new Date().toISOString(), data: DATA }, (k, v) => (k.startsWith('_') ? undefined : v), 2);
  function download(name, text, type) {
    try {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type }));
      a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    } catch (_) {}
  }
  $('bk-export').addEventListener('click', () => {
    const text = backupJSON();
    $('bk-text').value = text;
    download(`gahyeon-portfolio-${new Date().toISOString().slice(0, 10)}.json`, text, 'application/json');
    toast('JSON을 아래 칸에도 꺼냈어요. 파일이 안 받아지면 복사해서 보관하세요');
  });
  $('bk-datajs').addEventListener('click', () => {
    const text = dataJS();
    $('bk-text').value = text;
    download('data.js', text, 'text/javascript');
    toast('data.js를 내려받았어요. 폴더의 data.js와 바꿔 넣으면 돼요 (안 받아지면 아래 칸 내용을 복사하세요)');
  });
  $('bk-copy').addEventListener('click', () => {
    if (!$('bk-text').value) $('bk-text').value = backupJSON();
    const t = $('bk-text').value;
    const fallback = () => { $('bk-text').focus(); $('bk-text').select(); toast('선택된 내용을 Ctrl+C(⌘C)로 복사해 주세요'); };
    try { navigator.clipboard.writeText(t).then(() => toast('복사했어요'), fallback); } catch (_) { fallback(); }
  });
  function importJSON(text) {
    const box = $('bk-err');
    let d;
    try { d = JSON.parse(text); } catch (_) { box.textContent = 'JSON을 읽지 못했어요. 괄호나 쉼표가 빠지지 않았는지 확인해 주세요.'; box.hidden = false; return; }
    let next = null;
    if (d && validFull(d.data)) next = d.data;
    else if (validFull(d)) next = d;
    else { const list = Array.isArray(d) ? d : d && d.projects; if (validList(list)) next = Object.assign(clone(DATA), { projects: list }); }
    if (!next) { box.textContent = '이 사이트에서 내보낸 백업 파일이 아닌 것 같아요 (profile·projects 등을 찾지 못했어요).'; box.hidden = false; return; }
    box.hidden = true;
    next.competencies = next.competencies || DATA.competencies;
    DATA = normalizeAll(clone(next));
    commit('백업을 불러왔어요');
  }
  $('bk-apply').addEventListener('click', () => importJSON($('bk-text').value));
  $('bk-file').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { $('bk-text').value = r.result; importJSON(r.result); };
    r.onerror = () => toast('파일을 읽지 못했어요');
    r.readAsText(f); e.target.value = '';
  });
  function resetBtn() {
    $('bk-reset-wrap').innerHTML = '<button class="btn btn-line" type="button" id="bk-reset">기본값으로 되돌리기</button>';
    $('bk-reset').onclick = () => {
      $('bk-reset-wrap').innerHTML = '<span class="ask">이 브라우저에 저장한 편집 내용이 모두 지워져요. 계속할까요?</span> <button class="btn btn-danger btn-sm" type="button" id="bk-yes">되돌리기</button> <button class="btn btn-line btn-sm" type="button" id="bk-no">취소</button>';
      $('bk-yes').onclick = () => {
        clearLocal();
        DATA = normalizeAll(clone(ORIGINAL)); lastSaved = DATA.updatedAt || null;
        resetBtn(); renderPublic(); renderEditor(); renderSaveState(); toast('data.js 기본값으로 되돌렸어요');
      };
      $('bk-no').onclick = resetBtn;
    };
  }
  resetBtn();

  /* ═════════ 페이지 이동 ═════════ */
  const PAGES = ['home', 'projects', 'career', 'certs', 'evidence', 'edit'];
  const MOOD = { home: 'smile', projects: 'proud', career: 'happy', certs: 'excited', evidence: 'wink', edit: 'smile' };
  function show(page) {
    if (!PAGES.includes(page)) page = 'home';
    const editing = page === 'edit';
    document.body.classList.toggle('editing', editing);
    document.querySelectorAll('.page').forEach((s) => { s.hidden = s.dataset.page !== page; });
    document.querySelectorAll('[data-nav]').forEach((a) => { if (a.dataset.nav === page) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    $('companion').hidden = page === 'home' || editing;
    [pdlg, edlg, fdlg, gdlg].forEach((d) => { if (d.open) d.close(); });
    window.scrollTo(0, 0);
    setExpression(MOOD[page]);
    if (page === 'home') wave();
    if (editing) renderEditor();
  }
  window.addEventListener('hashchange', () => show(location.hash.slice(1)));

  renderPublic();
  renderModeUI();
  show(location.hash.slice(1) || 'home');

  /* claude.ai 사이트에서 열렸다면 ‘사이트에 바로 저장’ 켜기 */
  if (hasClaude) {
    $('save-state').textContent = '저장 방식을 확인하는 중…';
    window.claude.use('artifact').then(async (a) => {
      if (!a) { mode = 'readonly'; renderModeUI(); return; }
      host = a; mode = 'site';
      try { const u = await window.claude.use('user'); if (u) { canEdit = await u.canEdit(); if (canEdit === false) mode = 'readonly'; } } catch (_) {}
      renderModeUI();
    }, () => { mode = 'readonly'; renderModeUI(); });
  }
})();
