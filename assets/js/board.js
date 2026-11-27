/**
 * Tableros de ajedrez en SVG (sin librerías).
 *  - Portada: el mate del pastor en bucle.
 *  - Sección de Hyper Clock: la Partida de la Ópera sincronizada con el video del teléfono.
 *
 * Solo se animan transform y opacity (WAAPI). Con "reducir movimiento" no hay deslizamientos.
 */
(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const SQ = 45;
  const EASE_MOVE = 'cubic-bezier(0.77, 0, 0.175, 1)'; // movimiento en pantalla: ease-in-out fuerte
  const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const START = ['rnbqkbnr', 'pppppppp', '........', '........', '........', '........', 'PPPPPPPP', 'RNBQKBNR'];
  const SYMBOL = { p: 'p', r: 'r', n: 'n', b: 'bi', q: 'q', k: 'k' };

  const tf = (sq) => `translate(${(sq.charCodeAt(0) - 97) * SQ}px, ${(8 - Number(sq[1])) * SQ}px)`;

  /** Un tablero: piezas, casillas marcadas y movimientos con o sin animación. */
  function createBoard(svg) {
    const layer = svg.querySelector('[data-layer="pieces"]');
    const marks = {
      from: svg.querySelector('[data-mark="from"]'),
      to: svg.querySelector('[data-mark="to"]'),
      check: svg.querySelector('[data-mark="check"]'),
    };
    let board = {};
    const running = new Set();

    function reset() {
      running.forEach((a) => a.cancel());
      running.clear();
      layer.textContent = '';
      board = {};
      START.forEach((row, r) => {
        [...row].forEach((ch, f) => {
          if (ch === '.') return;
          const sq = String.fromCharCode(97 + f) + (8 - r);
          const g = document.createElementNS(NS, 'g');
          g.setAttribute('class', ch === ch.toUpperCase() ? 'pc pc-w' : 'pc pc-b');
          g.style.transform = tf(sq);
          const use = document.createElementNS(NS, 'use');
          use.setAttribute('href', '#pc-' + SYMBOL[ch.toLowerCase()]);
          use.setAttribute('width', SQ);
          use.setAttribute('height', SQ);
          g.appendChild(use);
          layer.appendChild(g);
          board[sq] = g;
        });
      });
      Object.values(marks).forEach((m) => m && (m.style.opacity = '0'));
    }

    function animate(el, keyframes, options) {
      const a = el.animate(keyframes, { fill: 'forwards', ...options });
      running.add(a);
      return a.finished
        .then(() => {
          Object.assign(el.style, keyframes[keyframes.length - 1]);
          a.cancel();
        })
        .catch(() => {})
        .finally(() => running.delete(a));
    }

    function mark(name, sq) {
      const m = marks[name];
      if (!m) return;
      if (!sq) { m.style.opacity = '0'; return; }
      m.style.transform = tf(sq);
      m.style.opacity = '1';
    }

    /** Aplica una jugada {from, to, rook?: [desde, hasta], mate?}. */
    function move(m, { animated = true, duration = 560 } = {}) {
      const piece = board[m.from];
      if (!piece) return Promise.resolve();
      const victim = board[m.to];
      delete board[m.from];
      board[m.to] = piece;
      layer.appendChild(piece); // la que se mueve pasa por encima
      mark('from', m.from);
      mark('to', null);
      const jobs = [];
      const slide = (el, from, to) => {
        if (!animated) { el.style.transform = tf(to); return; }
        jobs.push(animate(el, [{ transform: tf(from) }, { transform: tf(to) }], { duration, easing: EASE_MOVE }));
      };
      slide(piece, m.from, m.to);
      if (m.rook) {
        const rook = board[m.rook[0]];
        delete board[m.rook[0]];
        board[m.rook[1]] = rook;
        slide(rook, m.rook[0], m.rook[1]);
      }
      if (victim) {
        if (animated) {
          jobs.push(animate(victim, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, delay: duration * 0.72, easing: EASE_OUT })
            .then(() => victim.remove()));
        } else victim.remove();
      }
      return Promise.all(jobs).then(() => mark('to', m.to));
    }

    function check(sq) {
      const m = marks.check;
      if (!m) return;
      if (!sq) { m.style.opacity = '0'; return; }
      m.style.transform = tf(sq);
      m.style.opacity = '1';
    }

    function fade(to, duration) {
      return animate(layer, [{ opacity: to ? 0 : 1 }, { opacity: to ? 1 : 0 }], { duration, easing: EASE_OUT });
    }

    function pause(value) { running.forEach((a) => (value ? a.pause() : a.play())); }

    reset();
    return { reset, move, check, fade, pause, mark };
  }

  // Busca el rey negro para el resplandor del mate
  const blackKingSquare = (moves) => {
    let k = 'e8';
    moves.forEach((m) => { if (m.from === k) k = m.to; });
    return k;
  };

  // ── Portada: mate del pastor en bucle ──────────────────
  function heroLoop(svg) {
    const caption = document.getElementById('heroBoardMove');
    const EN = document.documentElement.lang === 'en';
    const L = EN
      ? { title: "Scholar's mate", mate: '4. Qxf7# · Checkmate', moves: ['1. e4', '1… e5', '2. Bc4', '2… Nc6', '3. Qh5', '3… Nf6??', '4. Qxf7# · Checkmate'] }
      : { title: 'Mate del pastor', mate: '4. Dxf7# · Jaque mate', moves: ['1. e4', '1… e5', '2. Ac4', '2… Cc6', '3. Dh5', '3… Cf6??', '4. Dxf7# · Jaque mate'] };
    const MOVES = [
      { from: 'e2', to: 'e4' }, { from: 'e7', to: 'e5' },
      { from: 'f1', to: 'c4' }, { from: 'b8', to: 'c6' },
      { from: 'd1', to: 'h5' }, { from: 'g8', to: 'f6' },
      { from: 'h5', to: 'f7' },
    ].map((m, i) => ({ ...m, text: L.moves[i] }));
    const b = createBoard(svg);
    const say = (t) => caption && (caption.textContent = t);

    if (reduceMotion.matches) {
      MOVES.forEach((m) => b.move(m, { animated: false }));
      b.check('e8');
      say(L.mate);
      return;
    }

    let paused = false;
    let wake = null;
    const setPaused = (v) => {
      if (paused === v) return;
      paused = v;
      b.pause(v);
      if (!v && wake) { const w = wake; wake = null; w(); }
    };
    const wait = (ms) => new Promise((resolve) => {
      let left = ms;
      let last = performance.now();
      const tick = (now) => {
        if (!paused) left -= now - last;
        last = now;
        if (left <= 0) return resolve();
        if (paused) wake = () => { last = performance.now(); requestAnimationFrame(tick); };
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    new IntersectionObserver(([e]) => setPaused(!e.isIntersecting || document.hidden), { threshold: 0.15 }).observe(svg);
    document.addEventListener('visibilitychange', () => setPaused(document.hidden));

    (async function loop() {
      for (;;) {
        say(L.title);
        await wait(900);
        for (const m of MOVES) {
          say(m.text);
          await b.move(m, { duration: 620 });
          await wait(700);
        }
        b.check('e8');
        await wait(3200);
        await b.fade(false, 320);
        b.reset();
        await b.fade(true, 420);
      }
    })();
  }

  // ── Hyper Clock: partida sincronizada con el video ─────
  function syncedGame(root) {
    const svg = root.querySelector('svg');
    const video = root.querySelector('video');
    const data = JSON.parse(root.querySelector('script[type="application/json"]').textContent);
    const moves = data.jugadas;
    const items = [...root.querySelectorAll('[data-ply]')];
    const now = root.querySelector('[data-now]');
    const b = createBoard(svg);
    const kingAtEnd = blackKingSquare(moves);
    let shown = 0; // jugadas aplicadas en el tablero

    function highlight(i) {
      items.forEach((el, k) => el.classList.toggle('is-current', k === i - 1));
      const cur = items[i - 1];
      if (cur) {
        // desplaza la lista sin mover la página
        const list = cur.closest('.game-moves');
        if (list) list.scrollTo({ top: cur.offsetTop - list.clientHeight / 2, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      }
      if (now) now.textContent = i ? `${moves[i - 1].n}${moves[i - 1].side === 'w' ? '.' : '…'} ${moves[i - 1].txt}` : data.lugar;
    }

    function jumpTo(i) {
      b.reset();
      for (let k = 0; k < i; k++) b.move(moves[k], { animated: false });
      b.check(i === moves.length ? kingAtEnd : null);
      shown = i;
      highlight(i);
    }

    function sync() {
      const t = video.currentTime;
      let i = 0;
      while (i < moves.length && moves[i].t <= t) i++;
      if (i === shown) return;
      if (i === shown + 1 && !video.paused && !reduceMotion.matches) {
        const m = moves[shown];
        shown = i;
        highlight(i);
        b.move(m, { duration: 520 }).then(() => { if (i === moves.length) b.check(kingAtEnd); });
      } else {
        jumpTo(i);
      }
    }

    let raf = 0;
    const loop = () => { sync(); raf = requestAnimationFrame(loop); };
    video.addEventListener('play', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); });
    video.addEventListener('pause', () => { cancelAnimationFrame(raf); sync(); });
    video.addEventListener('seeked', () => jumpTo(moves.filter((m) => m.t <= video.currentTime).length));
    video.addEventListener('ended', () => { cancelAnimationFrame(raf); jumpTo(moves.length); });

    // Tocar una jugada lleva el video a ese momento
    items.forEach((el, k) => el.addEventListener('click', () => {
      video.currentTime = Math.max(0, moves[k].t - 0.05);
      jumpTo(k + 1);
    }));

    // Reproduce solo mientras se ve (y nunca con movimiento reducido)
    if (!reduceMotion.matches) {
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting) video.play().catch(() => {});
        else video.pause();
      }, { threshold: 0.35 }).observe(root);
    }
    jumpTo(0);
  }

  const hero = document.getElementById('heroBoard');
  if (hero) heroLoop(hero);
  document.querySelectorAll('[data-synced-game]').forEach(syncedGame);
})();
