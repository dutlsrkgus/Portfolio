/* 마스코트 — 말랑 유령 ‘북이’ (참고 이미지의 3D 점토 유령).
   둥근 머리에서 아래로 갈수록 가늘어지며 한쪽으로 말려 올라간 꼬리, 짧게 뻗은 두 팔,
   가운데로 모인 작은 점 눈, 몸에서 흩날리는 보라·핑크 글리터. 머리 위에는 노란 후광이 둥실.
   표정 8가지(data-show), 눈 깜빡임(.blinkable)·인사(.arm-wave = 오른팔 흔들기)는 app.js가 제어합니다. */
window.Chara = (function () {
  'use strict';
  let n = 0;
  const EXP = { smile: 0, happy: 3, wink: -4, love: 4, surprised: 0, shy: -6, excited: 3, proud: -3 };
  const L = 106, R = 136, Y = 124;          // 눈 위치: 얼굴 가운데로 모인 작은 점 눈
  const EYE = '#24233a', LINE = '#24233a';

  const eyeOpen = (x, y, big) => `<g class="blinkable">
      <ellipse cx="${x}" cy="${y}" rx="${big ? 6.4 : 5.2}" ry="${big ? 8.4 : 6.8}" fill="${EYE}"/>
      <circle cx="${x - 1.6}" cy="${y - 2.6}" r="${big ? 2 : 1.6}" fill="#fff" opacity=".9"/>
    </g>`;
  const arc = (x, y, up) => `<path d="M${x - 6} ${y + (up ? 2 : -1.5)} Q${x} ${y + (up ? -6 : 4.5)} ${x + 6} ${y + (up ? 2 : -1.5)}" stroke="${EYE}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`;
  const heart = (x, y, s) => `<path d="M${x} ${y + 7 * s} C${x - 11 * s} ${y - s} ${x - 6 * s} ${y - 10 * s} ${x} ${y - 4 * s} C${x + 6 * s} ${y - 10 * s} ${x + 11 * s} ${y - s} ${x} ${y + 7 * s} Z"/>`;
  const star = (x, y, r) => `<path d="M${x} ${y - r} Q${x + r * .18} ${y - r * .18} ${x + r} ${y} Q${x + r * .18} ${y + r * .18} ${x} ${y + r} Q${x - r * .18} ${y + r * .18} ${x - r} ${y} Q${x - r * .18} ${y - r * .18} ${x} ${y - r} Z"/>`;

  /* 글리터: 몸 아래쪽에서 흩날리는 작은 조각들 (위치는 고정, 반짝임은 CSS) */
  const GL = [
    [62, 196, 3.2, '#8f6fdb', 20], [52, 214, 2.6, '#c79bf2', -30], [70, 222, 2.2, '#f39cc3', 45], [44, 232, 3, '#7a5ccc', 10],
    [60, 244, 2.4, '#b48cf0', -15], [36, 250, 2, '#f7b6d2', 60], [50, 262, 2.6, '#8f6fdb', 30], [76, 240, 1.8, '#d9b8ff', -40],
    [84, 210, 2, '#f39cc3', 0], [30, 222, 1.8, '#a98be8', 25], [66, 270, 2, '#c79bf2', -20], [90, 228, 1.6, '#8f6fdb', 50],
    [150, 206, 2.2, '#c79bf2', 15], [160, 222, 1.8, '#f39cc3', -25], [140, 218, 1.6, '#8f6fdb', 35]
  ];
  const glitter = () => GL.map(([x, y, s, c, r], i) => `<rect class="gl g${i % 3}" x="${x - s}" y="${y - s * .6}" width="${s * 2}" height="${s * 1.2}" rx=".6" fill="${c}" transform="rotate(${r} ${x} ${y})"/>`).join('');

  function svg() {
    const id = 'ch' + (++n);
    return `<svg class="chara" viewBox="0 0 240 300" aria-hidden="true" focusable="false" data-exp="smile">
    <defs>
      <radialGradient id="${id}body" cx="36%" cy="26%" r="80%"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#f4f2fb"/><stop offset=".8" stop-color="#dcd8ec"/><stop offset="1" stop-color="#bfb9d6"/></radialGradient>
      <radialGradient id="${id}arm" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#ebe8f5"/><stop offset="1" stop-color="#c9c3de"/></radialGradient>
      <linearGradient id="${id}gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7b0"/><stop offset=".5" stop-color="#ffd84d"/><stop offset="1" stop-color="#d9a400"/></linearGradient>
      <radialGradient id="${id}blush"><stop offset="0" stop-color="#ffb3cc" stop-opacity=".75"/><stop offset="1" stop-color="#ffb3cc" stop-opacity="0"/></radialGradient>
    </defs>
    <ellipse class="shadow" cx="126" cy="286" rx="44" ry="6" fill="#86A9F2" opacity=".4"/>
    <g class="whole">
      <!-- 왼팔 (몸 뒤) -->
      <ellipse cx="54" cy="150" rx="22" ry="14" fill="url(#${id}arm)" transform="rotate(-28 54 150)"/>

      <g class="head">
        <!-- 말랑한 몸: 둥근 머리 → 가늘어지며 오른쪽으로 말린 꼬리 -->
        <path d="M120 44 C166 44 194 80 194 124 C194 162 182 190 168 214 C160 230 164 248 182 252 C192 254 200 248 202 240 C206 262 184 282 160 276 C138 270 130 250 118 236 C104 220 80 214 64 196 C50 180 46 156 46 128 C46 80 74 44 120 44 Z" fill="url(#${id}body)"/>
        <!-- 아래쪽 은은한 그림자와 위쪽 광택 -->
        <path d="M66 196 C84 214 106 220 120 236 C130 248 138 266 160 272 C140 274 126 258 114 244 C100 228 80 222 66 206 Z" fill="#a9a2c8" opacity=".25"/>
        <ellipse cx="88" cy="78" rx="24" ry="12" fill="#fff" opacity=".9" transform="rotate(-30 88 78)"/>
        <ellipse cx="176" cy="150" rx="5" ry="16" fill="#fff" opacity=".5" transform="rotate(8 176 150)"/>

        <!-- 볼 -->
        <g data-show="smile happy wink surprised excited proud"><ellipse cx="92" cy="138" rx="9" ry="5.5" fill="url(#${id}blush)"/><ellipse cx="150" cy="138" rx="9" ry="5.5" fill="url(#${id}blush)"/></g>
        <g data-show="love shy"><ellipse cx="92" cy="138" rx="12" ry="7" fill="url(#${id}blush)"/><ellipse cx="150" cy="138" rx="12" ry="7" fill="url(#${id}blush)"/></g>

        <g class="brows"></g>

        <!-- 눈 -->
        <g data-show="smile">${eyeOpen(L, Y)}${eyeOpen(R, Y)}</g>
        <g data-show="surprised">${eyeOpen(L, Y, true)}${eyeOpen(R, Y, true)}</g>
        <g data-show="happy proud">${arc(L, Y, true)}${arc(R, Y, true)}</g>
        <g data-show="wink">${eyeOpen(L, Y)}${arc(R, Y, true)}</g>
        <g data-show="shy">${arc(L, Y + 2, false)}${arc(R, Y + 2, false)}</g>
        <g data-show="excited"><path d="M${L - 5} ${Y - 6} L${L + 5} ${Y} L${L - 5} ${Y + 6} M${R + 5} ${Y - 6} L${R - 5} ${Y} L${R + 5} ${Y + 6}" stroke="${EYE}" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
        <g data-show="love" fill="#ff6f9f">${heart(L, Y - 1, .95)}${heart(R, Y - 1, .95)}</g>

        <!-- 작은 입 -->
        <path data-show="smile proud" d="M116 138 Q121 142 126 138" stroke="${LINE}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <g data-show="happy love excited"><path d="M115 136 Q121 138 127 136 Q126 145 121 145 Q116 145 115 136 Z" fill="#b5476f"/></g>
        <path data-show="wink" d="M116 138 Q121 142 126 138" stroke="${LINE}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <ellipse data-show="surprised" cx="121" cy="140" rx="3" ry="3.8" fill="#b5476f"/>
        <path data-show="shy" d="M116 140 Q118.5 138 121 140 Q123.5 142 126 140" stroke="${LINE}" stroke-width="1.9" fill="none" stroke-linecap="round"/>
      </g>

      <!-- 흩날리는 글리터 (몸 앞) -->
      <g class="glitter">${glitter()}</g>

      <!-- 오른팔: 인사할 때 흔들어요 -->
      <g class="arm-wave" style="transform-origin:184px 150px">
        <ellipse cx="200" cy="140" rx="22" ry="14" fill="url(#${id}arm)" transform="rotate(-24 200 140)"/>
        <ellipse cx="204" cy="134" rx="8" ry="4" fill="#fff" opacity=".8" transform="rotate(-24 204 134)"/>
      </g>

      <!-- 노란 후광 -->
      <g class="halo">
        <ellipse cx="121" cy="28" rx="34" ry="9" fill="none" stroke="url(#${id}gold)" stroke-width="7"/>
        <ellipse cx="107" cy="23" rx="10" ry="2" fill="#fff" opacity=".85"/>
      </g>

      <g data-show="love" fill="#ff8fb3"><g class="fx">${heart(214, 60, 1)}</g><g class="fx d2">${heart(222, 196, .7)}</g><g class="fx d3">${heart(22, 110, .85)}</g></g>
      <g data-show="happy surprised excited" fill="#FDE3A0"><g class="fx">${star(212, 50, 10)}</g><g class="fx d2">${star(26, 58, 7)}</g><g class="fx d3">${star(224, 210, 6)}</g></g>
      <g data-show="wink proud smile" fill="#ffffff"><g class="fx">${star(214, 86, 7)}</g><g class="fx d2">${star(28, 80, 5)}</g></g>
      <g data-show="shy"><path class="fx" d="M200 58 Q207 70 200 75 Q193 70 200 58 Z" fill="#B9D8FF"/></g>
    </g></svg>`;
  }
  return { svg, EXP };
})();
