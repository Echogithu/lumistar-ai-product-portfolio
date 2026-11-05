// Static portfolio: native controls; no service calls or real device execution.

document.querySelectorAll('[role="tablist"]:not([data-slides])').forEach(list => {
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  function select(tab) {
    tabs.forEach(item => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
    });
  }
  tabs.forEach(tab => tab.addEventListener('click', () => select(tab)));
  list.addEventListener('keydown', event => {
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    select(tabs[next]);
    tabs[next].focus({preventScroll:true});
  });
  select(tabs.find(tab => tab.getAttribute('aria-selected') === 'true') || tabs[0]);
});

document.querySelectorAll('table').forEach(table => {
  const headers = [...table.tHead.rows[0].cells].map(cell => cell.textContent.trim());
  table.querySelectorAll('tbody tr').forEach(row => {
    [...row.cells].forEach((cell,index) => {cell.dataset.label = headers[index];});
  });
});

const notes = document.getElementById('research-notes');
let previousFocus;
function openNote(id) {
  if (!notes.open) {
    previousFocus = document.activeElement;
    notes.showModal();
  }
  if (id === 'notes-top') notes.scrollTop = 0;
  else document.getElementById(id).scrollIntoView({block:'start'});
}
document.querySelectorAll('[data-note]').forEach(button => {
  button.addEventListener('click', () => openNote(button.dataset.note));
});
document.querySelector('.close-dialog').addEventListener('click', () => notes.close());
notes.addEventListener('click', event => {
  if (event.target !== notes) return;
  const rect = notes.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right ||
      event.clientY < rect.top || event.clientY > rect.bottom) notes.close();
});
notes.addEventListener('close', () => previousFocus?.focus({preventScroll:true}));
document.querySelectorAll('a[href^="#"]').forEach(link => {
  const target = document.getElementById(link.hash.slice(1));
  if (target && notes.contains(target)) {
    link.addEventListener('click', event => {event.preventDefault();openNote(target.id);});
  }
});

const chapters = [...document.querySelectorAll('[data-chapter]')];
const navLinks = [...document.querySelectorAll('[data-chapter-link]')];
const progress = document.querySelector('.scroll-progress');
const toTop = document.querySelector('.to-top');
let pending = false;
function updateNavigation() {
  pending = false;
  let current = chapters[0].id;
  for (const chapter of chapters) {
    if (chapter.getBoundingClientRect().top <= 180) current = chapter.id;
  }
  navLinks.forEach(link => {
    const active = link.hash === '#' + current;
    link.classList.toggle('active',active);
    if (active) link.setAttribute('aria-current','location');
    else link.removeAttribute('aria-current');
  });
  const range = Math.max(1,document.documentElement.scrollHeight - innerHeight);
  progress.style.transform = 'scaleX(' + Math.min(1,Math.max(0,scrollY/range)) + ')';
  toTop.classList.toggle('is-visible',scrollY > 600);
}
function queueNavigation() {
  if (!pending) {pending = true;requestAnimationFrame(updateNavigation);}
}
addEventListener('scroll',queueNavigation,{passive:true});
addEventListener('resize',queueNavigation);
new ResizeObserver(queueNavigation).observe(document.body);
updateNavigation();

/* Chapter 03: reveal the proposal screens and count up the numbers. */
(() => {
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const items = [...document.querySelectorAll('#loop [data-reveal], #career .career [data-reveal]')];
  const countUp = (el) => {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    if (!Number.isFinite(target)) return;
    if (calm.matches) { el.textContent = target + suffix; return; }
    const began = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - began) / 900);
      el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3))) + suffix;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const reveal = (el) => {
    if (el.classList.contains('is-in')) return;
    el.classList.add('is-in');
    el.querySelectorAll('[data-count]').forEach(countUp);
  };
  if ('IntersectionObserver' in window && !calm.matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { reveal(entry.target); observer.unobserve(entry.target); }
    }), { rootMargin: '0px 0px -12% 0px' });
    items.forEach(el => observer.observe(el));
  } else {
    items.forEach(reveal);
  }
})();


// Print all research, examples and user panels without losing the reader's screen state.
let printState;
addEventListener('beforeprint', () => {
  printState = {
    details:[...document.querySelectorAll('details')].map(el => [el,el.open]),
    panels:[...document.querySelectorAll('[role="tabpanel"]')].map(el => [el,el.hidden])
  };
  printState.details.forEach(([el]) => {el.open = true;});
  printState.panels.forEach(([el]) => {el.hidden = false;});
});
addEventListener('afterprint', () => {
  if (!printState) return;
  printState.details.forEach(([el,open]) => {el.open = open;});
  printState.panels.forEach(([el,hidden]) => {el.hidden = hidden;});
  printState = undefined;
});

/* Chapter 02: expand the timeline inline. */
(() => {
  const toggle = document.getElementById('history-toggle');
  const panel = document.getElementById('history');
  if (!toggle || !panel) return;
  toggle.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? '发展历程 －' : '发展历程 ＋';
  });
})();

/* 01.2: keep the arrow centred between the two figures. */
(() => {
  const row = document.querySelector('#career-value .case-comparison');
  if (!row) return;
  const nums = [...row.querySelectorAll('strong')];
  const arrow = row.querySelector('.comparison-arrow');
  if (nums.length < 2 || !arrow) return;
  const place = () => {
    const box = row.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(nums[0]);
    const a = range.getBoundingClientRect();
    range.selectNodeContents(nums[1]);
    const b = range.getBoundingClientRect();
    arrow.style.left = ((a.right + b.left) / 2 - box.left) + 'px';
    arrow.style.top = ((a.top + a.bottom) / 2 - box.top) + 'px';
  };
  place();
  addEventListener('resize', place);
  addEventListener('load', place);
  addEventListener('beforeprint', place);
  if (document.fonts) document.fonts.ready.then(place);
  if ('ResizeObserver' in window) new ResizeObserver(place).observe(row);
})();

/* 产品矩阵：滚轮、标签、指示器共用切换状态，保留自动轮播。 */
(() => {
  const wrap = document.getElementById('product-slides');
  if (!wrap) return;
  const stage = wrap.querySelector('.product-stage');
  const header = document.querySelector('.header');
  const panels = [...wrap.querySelectorAll('.product-panel')];
  const tabs = [...wrap.querySelectorAll('[role="tab"]')];
  const cues = [...wrap.querySelectorAll('.product-slide-cue button')];
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const stacked = () => innerWidth <= 760;
  let index = 0, timer = null, inView = false;
  let wheelDelta = 0, wheelTime = 0, lastSwitch = -Infinity;

  function paint(i) {
    index = i;
    const flat = stacked();
    panels.forEach((p, k) => { p.classList.toggle('is-active', k === i); p.setAttribute('aria-hidden', String(!flat && k !== i)); });
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
    cues.forEach((d, k) => { d.classList.toggle('is-on', k === i); d.setAttribute('aria-pressed', String(k === i)); });
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  function play() {
    stop();
    if (stacked() || calm.matches || !inView || document.hidden || wrap.matches(':hover, :focus-within')) return;
    timer = setInterval(() => paint((index + 1) % panels.length), 5000);
  }
  function pick(i) {
    wheelDelta = 0;
    lastSwitch = performance.now();
    paint(i);
    play();
  }

  tabs.forEach((t, i) => t.addEventListener('click', () => pick(i)));
  cues.forEach((d, i) => d.addEventListener('click', () => pick(i)));
  wrap.querySelector('[role="tablist"]').addEventListener('keydown', event => {
    const current = tabs.indexOf(document.activeElement);
    if (current < 0) return;
    let next;
    if (event.key === 'ArrowRight') next = (current + 1) % panels.length;
    if (event.key === 'ArrowLeft') next = (current + panels.length - 1) % panels.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = panels.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    pick(next);
    tabs[next].focus({ preventScroll: true });
  });

  wrap.addEventListener('wheel', event => {
    if (stacked() || event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    const rect = stage.getBoundingClientRect();
    // 完整展示时才接管滚轮，首尾向外滚动始终交还页面。
    if (rect.top < header.getBoundingClientRect().bottom || rect.bottom > innerHeight) return;
    const direction = Math.sign(event.deltaY);
    const next = index + direction;
    if (next < 0 || next >= panels.length) { wheelDelta = 0; return; }
    event.preventDefault();
    const now = performance.now();
    if (now - lastSwitch < 650) { wheelTime = now; return; }
    if (now - wheelTime > 180 || Math.sign(wheelDelta) !== direction) wheelDelta = 0;
    wheelTime = now;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientHeight : 1;
    wheelDelta += event.deltaY * unit;
    if (Math.abs(wheelDelta) >= 50) pick(next);
  }, { passive: false });

  wrap.addEventListener('pointerenter', stop);
  wrap.addEventListener('pointerleave', play);
  wrap.addEventListener('focusin', stop);
  wrap.addEventListener('focusout', () => requestAnimationFrame(play));
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else play(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => entries.forEach(entry => {
      inView = entry.isIntersecting && entry.intersectionRatio >= .35;
      if (inView) play(); else stop();
    }), { threshold: .35 }).observe(wrap);
  } else {
    inView = true;
  }
  addEventListener('resize', () => { wheelDelta = 0; paint(index); play(); });
  calm.addEventListener('change', () => { paint(index); play(); });
  paint(0);
  play();
})();

/* Product film: 96 official frames, revealed only when the demo is expanded. */
(() => {
  const host = document.getElementById('product-reveal');
  if (!host) return;
  const stage = host.querySelector('.reveal-stage');
  const canvas = host.querySelector('#reveal-canvas');
  if (!stage || !canvas) return;
  const ctx = canvas.getContext('2d');
  const callouts = [...host.querySelectorAll('[data-callout]')];
  const dots = [...host.querySelectorAll('.sequence-dots i')];
  const frames = new Array(96);
  const poster = new Image();
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  let top = 0, range = 1, w = 1, h = 1;
  let loaded = false, drawn = null, pending = false, shown = false;
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = stage.clientWidth; h = stage.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function draw(img) {
    if (!img.complete || !img.naturalWidth || !w) return;
    const scale = w < 760 ? Math.max(w / img.naturalWidth, h / img.naturalHeight) : Math.min(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    drawn = img; stage.classList.add('is-drawn');
  }
  function measure() {
    const r = host.getBoundingClientRect();
    top = r.top + scrollY; range = Math.max(1, r.height - innerHeight);
    size(); if (drawn) draw(drawn); request();
  }
  function load() {
    if (loaded) return; loaded = true;
    let next = 0;
    function step() {
      if (next >= 96) return;
      const k = next++, img = new Image(); frames[k] = img;
      img.onload = img.onerror = () => { step(); request(); };
      img.src = 'assets/frames/frame-' + String(k).padStart(4, '0') + '.webp';
    }
    for (let i = 0; i < 6; i++) step();
  }
  function render() {
    pending = false;
    if (!shown || !w) return;
    const p = Math.min(1, Math.max(0, (scrollY - top) / range));
    const idx = Math.min(95, Math.floor(p * 95));
    if (frames[idx] && frames[idx].complete && frames[idx].naturalWidth) draw(frames[idx]);
    const step = Math.min(2, Math.floor(p * 3));
    callouts.forEach((el, i) => { el.classList.toggle('active', i === step); el.setAttribute('aria-hidden', String(i !== step)); });
    dots.forEach((d, i) => d.classList.toggle('active', i === step));
  }
  function request() { if (!pending) { pending = true; requestAnimationFrame(render); } }
  new IntersectionObserver(entries => entries.forEach(e => {
    shown = e.isIntersecting;
    if (shown) { load(); if (!poster.src) { poster.onload = () => { if (!drawn) draw(poster); }; poster.src = 'assets/frames/poster.webp'; } request(); }
  }), { rootMargin: '20% 0px' }).observe(host);
  host.addEventListener('toggle', () => { if (host.open) { measure(); request(); } });
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', measure);
  addEventListener('load', measure);
  if (calm.matches) { load(); callouts.forEach(el => el.classList.add('active')); }
  measure(); request();
})();

/* Scroll reveal: only applied when motion is allowed, so content stays visible without JS. */
(() => {
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const targets = [...document.querySelectorAll('.scene, .rivals, .journey, .case-feature, .case-pair > article, .contact-section')].filter(el => !el.closest('#loop'));
  if (calm.matches || !('IntersectionObserver' in window)) return;
  targets.forEach(el => el.classList.add('reveal-on'));
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('is-in'); observer.unobserve(entry.target); }
  }), { rootMargin: '0px 0px -10% 0px' });
  targets.forEach(el => observer.observe(el));
})();

/* 章节序号入场：滚动帧判断，锚点跳转与直接定位都能放行。无 JS 时序号始终可见。 */
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const nums = [...document.querySelectorAll('.chapter-heading > span')];
  if (!nums.length) return;
  nums.forEach(n => n.classList.add('num-pre'));
  let queued = false;
  const pass = () => {
    queued = false;
    let left = 0;
    for (const n of nums) {
      if (!n.classList.contains('num-pre')) continue;
      if (n.getBoundingClientRect().top < innerHeight * 0.92) {
        n.classList.remove('num-pre');
        n.classList.add('num-in');
      } else left++;
    }
    if (!left) {
      removeEventListener('scroll', queue);
      removeEventListener('resize', queue);
      removeEventListener('hashchange', queue);
    }
  };
  const queue = () => { if (queued) return; queued = true; requestAnimationFrame(pass); };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  addEventListener('hashchange', queue);
  queue();
})();
