/* Slow Gold Studio — page choreography.
   Lenis smooth scroll + GSAP ScrollTrigger. Everything reads correctly without this file;
   it only adds motion, the chapter bar and the order builder. */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);

  /* ---------- static film grain ---------- */
  (() => {
    const c = document.createElement('canvas'); c.width = c.height = 160; const x = c.getContext('2d');
    const d = x.createImageData(160, 160);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0); $('.grain').style.backgroundImage = `url(${c.toDataURL()})`;
  })();

  /* ---------- order builder (works without GSAP too) ---------- */
  const order = initOrder();

  if (!hasGsap) return;
  gsap.registerPlugin(ScrollTrigger, ...(window.SplitText ? [SplitText] : []));

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: .11, wheelMultiplier: 1, touchMultiplier: 1.4 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const barH = () => $('#bar').offsetHeight;
  function goTo(target) {
    const el = typeof target === 'string' ? $(target) : target; if (!el) return;
    const off = el.id === 'hero' ? 0 : -barH() + 1;
    if (lenis) lenis.scrollTo(el, { offset: off, duration: 1.6, easing: t => 1 - Math.pow(1 - t, 4) });
    else scrollTo({ top: el.getBoundingClientRect().top + scrollY + off, behavior: reduce ? 'auto' : 'smooth' });
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    const id = a.getAttribute('href'); if (id.length < 2) return;
    const el = $(id); if (!el) return;
    e.preventDefault();
    if (a.dataset.piece) order.preset({ piece: a.dataset.piece });
    if (a.dataset.source) order.preset({ source: a.dataset.source });
    goTo(el);
    if (id === '#begin') setTimeout(() => { const f = $('#order .fs.on input, #order .fs.on textarea'); f && f.focus({ preventScroll: true }); }, 1700);
  });

  /* ---------- headline reveals ---------- */
  const ready = document.fonts ? document.fonts.ready : Promise.resolve();
  ready.then(() => {
    $$('[data-split]').forEach(el => {
      if (reduce || !window.SplitText) return;
      SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
        onSplit: self => gsap.from(self.lines, { yPercent: 105, duration: 1.15, ease: 'expo.out', stagger: .09,
          scrollTrigger: { trigger: el, start: 'top 85%', once: true } }) });
    });
    ScrollTrigger.refresh();
  });
  if (!reduce) $$('[data-fade]').forEach(el => gsap.from(el, { autoAlpha: 0, y: 26, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }));

  /* ================= I — THE GOLD: words heat up as you read ================= */
  (() => {
    const m = $('#manifesto'); if (!m) return;
    /* wrap each word, keep the script word as one unit */
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
            else { const s = document.createElement('span'); s.className = 'w'; s.textContent = part; frag.appendChild(s); }
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) n.classList.add('w');
      });
    };
    walk(m);
    const words = $$('.w', m), N = words.length;
    const cream = [255, 251, 211], ember = [255, 162, 74];
    const paint = p => {
      const head = p * (N + 6);
      words.forEach((w, i) => {
        const t = Math.max(0, Math.min(1, (head - i) / 6)); /* 0 cold → 1 cooled; hot in between */
        if (t === w._t) return; w._t = t;
        const heat = Math.sin(Math.PI * Math.min(1, t * 1.15));
        const a = .17 + .83 * Math.min(1, t * 1.4);
        const c = cream.map((v, k) => Math.round(v + (ember[k] - v) * heat * .85));
        w.style.color = `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;
        w.style.textShadow = heat > .05 ? `0 0 ${(heat * 22).toFixed(1)}px rgba(255,120,30,${(heat * .55).toFixed(2)})` : 'none';
      });
    };
    if (reduce) { paint(1); return; }
    paint(0);
    ScrollTrigger.create({ trigger: m, start: 'top 78%', end: 'bottom 38%', scrub: .6, onUpdate: s => paint(s.progress) });
    gsap.to('#gold .au', { yPercent: -18, ease: 'none', scrollTrigger: { trigger: '#gold', start: 'top bottom', end: 'bottom top', scrub: true } });
    /* counters */
    $$('[data-count]').forEach(el => {
      const end = +el.dataset.count, comma = el.dataset.format === 'comma', o = { v: 0 };
      const fmt = v => comma ? Math.round(v).toLocaleString('en') : Math.round(v);
      el.textContent = fmt(0);
      gsap.to(o, { v: end, duration: 2.2, ease: 'power3.out', onUpdate: () => el.textContent = fmt(o.v),
        scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
  })();

  /* ================= II — YOUR GOLD: three pieces become one ================= */
  (() => {
    const sec = $('#remake'), cv = $('#metal');
    const metal = window.SGMelt ? window.SGMelt(cv) : null;
    if (!metal) { sec.classList.add('nometal'); $$('.tag', sec).forEach(t => t.hidden = true); }
    const stages = $$('.melt-stage', sec), tags = [0, 1, 2].map(i => $('#tag' + i));
    const temp = $('#temp'), tempBox = $('#tempBox'), glow = $('.glow', sec), meltBar = $('#meltBar');
    let cur = 0;
    const show = i => {
      if (i === cur) return;
      const prev = stages[cur], next = stages[i]; cur = i;
      gsap.killTweensOf([prev, next]);
      gsap.to(prev, { autoAlpha: 0, y: -18, filter: 'blur(6px)', duration: .45, ease: 'power2.in' });
      gsap.fromTo(next, { autoAlpha: 0, y: 22, filter: 'blur(6px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: .7, delay: .2, ease: 'power3.out' });
      stages.forEach(s => s.classList.toggle('on', s === next));
    };
    const placeTags = p => {
      if (!metal) return;
      const pts = metal.points(), fade = 1 - gsap.utils.clamp(0, 1, (p - .12) / .1);
      tags.forEach((t, i) => {
        const lift = i === 2 ? .17 : .2;
        gsap.set(t, { x: pts[i].x, y: pts[i].y - pts[i].s * lift, xPercent: -50, yPercent: -100, autoAlpha: fade });
      });
    };
    const update = p => {
      if (metal) metal.progress = p;
      const hot = gsap.utils.clamp(0, 1, (p - .17) / .21) * (1 - gsap.utils.clamp(0, 1, (p - .6) / .26));
      temp.textContent = Math.round(21 + hot * 1043).toLocaleString('en') + ' °C';
      tempBox.classList.toggle('hot', hot > .05);
      glow.style.setProperty('--heat', (hot * .55).toFixed(3));
      meltBar.style.setProperty('--p', p.toFixed(3));
      show(p < .2 ? 0 : p < .5 ? 1 : p < .72 ? 2 : 3);
      placeTags(p);
    };
    ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom', scrub: reduce ? true : .8, onUpdate: s => update(s.progress),
      onRefresh: s => { metal && metal.layout(); update(s.progress); } });
    update(0);
  })();

  /* ================= III — THE MAKING: a sideways walk through four weeks ================= */
  (() => {
    const track = $('#track'), pin = $('#makingPin'), line = $('#tlLine');
    const passport = $('#passport'), typed = $$('[data-type]', passport), stamp = $('.stamp', passport);
    const full = typed.map(el => el.textContent);
    let passportDone = false;
    const playPassport = () => {
      if (passportDone || reduce) return; passportDone = true;
      typed.forEach(el => el.textContent = '');
      const tl = gsap.timeline();
      typed.forEach((el, i) => {
        const o = { n: 0 }, txt = full[i];
        tl.to(o, { n: txt.length, duration: Math.min(.9, .25 + txt.length * .022), ease: 'none', onUpdate: () => el.textContent = txt.slice(0, Math.round(o.n)) }, i === 0 ? 0 : '>-0.05');
      });
      tl.fromTo(stamp, { scale: 2.2, autoAlpha: 0, rotate: -40 }, { scale: 1, autoAlpha: 1, rotate: -14, duration: .55, ease: 'back.out(2.2)' }, '>-0.1');
    };
    const drawSketch = (root, trigger, opts) => {
      const els = $$('.draw', root);
      els.forEach(el => { const L = el.getTotalLength ? el.getTotalLength() : 600; el.style.strokeDasharray = L; el.style.strokeDashoffset = reduce ? 0 : L; });
      if (reduce) return;
      gsap.to(els, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', stagger: .18, scrollTrigger: Object.assign({ trigger, once: true }, opts) });
    };

    const mm = gsap.matchMedia();
    mm.add({ wide: '(min-width: 901px)', narrow: '(max-width: 900px)' }, ctx => {
      const { wide } = ctx.conditions;
      if (wide && !reduce) {
        const dist = () => track.scrollWidth - innerWidth;
        const tween = gsap.to(track, { x: () => -dist(), ease: 'none',
          scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: .8, invalidateOnRefresh: true, anticipatePin: 1,
            onUpdate: s => line.style.setProperty('--p', s.progress.toFixed(3)) } });
        $$('.step', track).forEach((step, i) => {
          const no = $('.step-no', step), plates = $$('.plate', step);
          gsap.from(no, { xPercent: 30, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: step, containerAnimation: tween, start: 'left 95%', end: 'left 45%', scrub: true } });
          plates.forEach((pl, k) => {
            gsap.fromTo(pl, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.out',
              scrollTrigger: { trigger: step, containerAnimation: tween, start: `left ${85 - k * 10}%`, end: `left ${35 - k * 10}%`, scrub: true } });
            gsap.fromTo($('img', pl), { scale: 1.25 }, { scale: 1, ease: 'none',
              scrollTrigger: { trigger: step, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
          });
        });
        drawSketch($('.sketch'), $('.step[data-step="0"]'), { containerAnimation: tween, start: 'left 80%' });
        ScrollTrigger.create({ trigger: $('.step[data-step="3"]'), containerAnimation: tween, start: 'left 65%', once: true, onEnter: playPassport });
      } else {
        $$('.plate', track).forEach(pl => gsap.fromTo(pl, { clipPath: reduce ? 'inset(0%)' : 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: pl, start: 'top 85%', once: true } }));
        drawSketch($('.sketch'), $('.sketch'), { start: 'top 80%' });
        ScrollTrigger.create({ trigger: passport, start: 'top 75%', once: true, onEnter: playPassport });
      }
    });
  })();

  /* ================= IV — PIECES: out of the forge into daylight ================= */
  (() => {
    const day = $('#daylight');
    if (!reduce) {
      gsap.fromTo(day, { clipPath: 'inset(9% 7% 0% 7% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
        scrollTrigger: { trigger: '#pieces', start: 'top bottom', end: 'top 15%', scrub: true } });
      $$('.card', day).forEach((c, i) => {
        gsap.from($('.card-media', c), { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.3, ease: 'power3.out', delay: (i % 4) * .08, scrollTrigger: { trigger: c, start: 'top 88%', once: true } });
        gsap.from($('.card-body', c), { autoAlpha: 0, y: 24, duration: 1, ease: 'power3.out', delay: .2 + (i % 4) * .08, scrollTrigger: { trigger: c, start: 'top 88%', once: true } });
      });
      drawSketchOnce($('.card-idea svg'));
    }
    /* the visitor's lamp, again: light follows the cursor across each piece */
    $$('.card-media', day).forEach(m => {
      m.addEventListener('pointermove', e => { const r = m.getBoundingClientRect();
        m.style.setProperty('--mx', (e.clientX - r.left) + 'px'); m.style.setProperty('--my', (e.clientY - r.top) + 'px'); m.style.setProperty('--lamp', 1); });
      m.addEventListener('pointerleave', () => m.style.setProperty('--lamp', 0));
    });
  })();
  function drawSketchOnce(svg) {
    if (!svg) return;
    const els = $$('.draw', svg);
    els.forEach(el => { const L = el.getTotalLength(); el.style.strokeDasharray = L; el.style.strokeDashoffset = L; });
    gsap.to(els, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut', stagger: .2, scrollTrigger: { trigger: svg, start: 'top 85%', once: true } });
  }

  /* ================= FAQ: smooth open and close ================= */
  $$('.faq details').forEach(d => {
    const s = $('summary', d), body = $('.ans', d);
    s.addEventListener('click', e => {
      if (reduce) return;
      e.preventDefault();
      if (d.open) {
        gsap.to(body, { height: 0, duration: .45, ease: 'power3.inOut', onComplete: () => { d.open = false; body.style.height = ''; } });
      } else {
        d.open = true;
        gsap.fromTo(body, { height: 0 }, { height: body.scrollHeight, duration: .55, ease: 'power3.out', onComplete: () => body.style.height = '' });
      }
    });
  });

  /* ================= FOOTER: the name is cast too ================= */
  (() => {
    const w = $('#wordmark'); if (!w || reduce) return;
    ScrollTrigger.create({ trigger: w, start: 'top 92%', once: true, onEnter: () => {
      w.classList.add('pouring');
      gsap.timeline()
        .fromTo(w, { '--f': '-12%', '--g': 1 }, { '--f': '125%', duration: 2.2, ease: 'power2.inOut' })
        .add(() => w.classList.remove('pouring'))
        .to(w, { '--g': 0, duration: 1.6, ease: 'power2.out' }, '-=0.6');
    } });
  })();

    /* ---------- chapter bar (created last, so it measures after the pinned chapter adds its length) ---------- */
    function initBar() {
    const bar = $('#bar'), barLinks = $$('.bar-chapters a'), barFill = $('.bar-progress i');
    ScrollTrigger.create({ trigger: '#hero', start: 'bottom 80px', onEnter: () => bar.classList.add('show'), onLeaveBack: () => bar.classList.remove('show') });
    $$('[data-chapter]').forEach(sec => {
      ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 55%',
        onToggle: s => { if (s.isActive) barLinks.forEach(a => a.classList.toggle('on', a.dataset.ch === sec.dataset.chapter)); } });
    });
    /* daylight runs from the pieces to the end of the order form: the bar turns light with it */
    ScrollTrigger.create({ trigger: '#daylight', start: 'top 40px', endTrigger: '#begin', end: 'bottom 40px',
      onToggle: s => bar.classList.toggle('light', s.isActive) });
    ScrollTrigger.create({ trigger: '#gold', start: 'top top', endTrigger: 'body', end: 'bottom bottom',
      onUpdate: s => gsap.set(barFill, { scaleX: s.progress }) });
  
    }
  initBar();

  /* images and fonts change heights: measure again once they are in */
  addEventListener('load', () => ScrollTrigger.refresh());

  /* =================================================================== */
  function initOrder() {
    const form = $('#order'); if (!form) return { preset() {} };
    const fss = $$('.fs', form), dots = $$('.dots i', form), next = $('#next'), back = $('#back'), lbl = $('#stepLbl');
    const grams = $('#grams'), gVal = $('#gVal'), gNote = $('#gNote'), gHint = $('#gHint'), unknown = $('#unknown'), wLegend = $('#wLegend');
    const sum = { source: $('#sSource'), form: $('#sForm'), weight: $('#sWeight'), price: $('#sPrice') };
    const FORM_ENDPOINT = ''; /* set to a form service URL (e.g. Formspree) to receive requests directly */
    const S = { step: 0, source: '', form: '', grams: 7.8, unknown: false, piece: '' };
    const SRC = { own: 'Your own gold', studio: 'Studio gold, recycled', mix: 'Yours, topped up with ours' };
    const FORMS = { ring: 'A ring', pendant: 'A pendant', earrings: 'Earrings', bracelet: 'A bracelet', unsure: 'We’ll suggest options' };
    const CRAFT = { ring: 380, pendant: 320, earrings: 290, bracelet: 460 };
    const PIECES = { keeper: { form: 'ring', name: 'The Keeper', price: 420 }, promise: { form: 'ring', name: 'The Promise', price: 680 },
      gathering: { form: 'ring', name: 'The Gathering', price: 290 }, idea: { form: 'unsure', name: 'Your own idea' } };

    const flash = el => { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); };
    function hint() {
      const g = S.grams, f = S.form || 'ring';
      const T = {
        ring: g < 2 ? 'a fine stacking band' : g < 4 ? 'a slim band' : g < 8.5 ? 'a wide band or a signet ring' : 'a statement ring, or two rings',
        pendant: g < 2 ? 'a small charm' : g < 5 ? 'a medallion pendant' : 'a large medallion, or a pendant with its own chain links',
        earrings: g < 2 ? 'a pair of studs' : g < 5 ? 'a pair of small hoops' : 'a pair of statement hoops',
        bracelet: g < 6 ? 'a fine bracelet. We would top it up with studio gold' : g < 12 ? 'a chain bracelet' : 'a solid bangle',
        unsure: g < 3 ? 'a slim ring, a pendant or a pair of studs' : g < 8 ? 'a wide band, a medallion or hoops' : 'a bangle, or two or three pieces for the family'
      };
      gHint.textContent = S.unknown ? 'No problem. We weigh it for free when it arrives, before anything is decided.' : `Enough for ${T[f]}.`;
      const bands = g / 3.2;
      gNote.textContent = S.unknown ? '' : bands < .9 ? 'less than one wedding band' : bands < 1.3 ? 'about one wedding band' : `about ${Math.round(bands)} wedding bands`;
    }
    function render() {
      fss.forEach((f, i) => f.classList.toggle('on', i === S.step));
      dots.forEach((d, i) => d.classList.toggle('on', i <= S.step));
      lbl.textContent = `Step ${S.step + 1} of 4`;
      back.hidden = S.step === 0;
      const last = S.step === 3;
      next.innerHTML = last ? 'Request my sketch <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 8h12M9 3l5 5-5 5"/></svg>'
                            : 'Continue <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 8h12M9 3l5 5-5 5"/></svg>';
      next.type = last ? 'submit' : 'button';
      next.disabled = (S.step === 0 && !S.source) || (S.step === 1 && !S.form);
      wLegend.textContent = S.source === 'studio' ? 'How heavy should it be?' : 'How much gold is there?';
      $('.check', form).hidden = S.source === 'studio';
      gVal.textContent = S.unknown ? '?' : S.grams.toFixed(1);
      grams.style.setProperty('--fill', ((S.grams - 1) / 19 * 100).toFixed(1) + '%');
      hint();
      const p = PIECES[S.piece];
      sum.source.textContent = SRC[S.source] || '—';
      sum.form.textContent = p && p.form === S.form ? p.name : (FORMS[S.form] || '—');
      sum.weight.textContent = S.unknown ? 'We weigh it' : S.grams.toFixed(1) + ' g';
      const base = p && p.price && p.form === S.form ? p.price : CRAFT[S.form];
      sum.price.textContent = !S.form ? '—' : base ? `from €${base}${S.source && S.source !== 'own' ? ' + gold' : ''}` : 'after the sketch';
    }
    form.addEventListener('change', e => {
      const t = e.target;
      if (t.name === 'source') { S.source = t.value; flash(sum.source); }
      if (t.name === 'form') { S.form = t.value; if (S.piece && PIECES[S.piece].form !== t.value) S.piece = ''; flash(sum.form); flash(sum.price); }
      if (t.id === 'unknown') { S.unknown = t.checked; grams.disabled = t.checked; flash(sum.weight); }
      render();
    });
    grams.addEventListener('input', () => { S.grams = +grams.value; render(); });
    next.addEventListener('click', e => {
      if (S.step < 3) { e.preventDefault(); S.step++; render(); const f = $('.fs.on input, .fs.on textarea', form); f && f.focus({ preventScroll: true }); }
    });
    back.addEventListener('click', () => { if (S.step > 0) { S.step--; render(); } });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const name = $('#name').value.trim(), email = $('#email').value.trim(), story = $('#story').value.trim();
      $('#nameErr').textContent = name ? '' : 'Please tell us your name.';
      $('#emailErr').textContent = /.+@.+\..+/.test(email) ? '' : 'Please enter an email address we can reply to.';
      if (!name || !/.+@.+\..+/.test(email)) return;
      const lines = [
        `Gold: ${SRC[S.source] || '-'}`,
        `Becomes: ${S.piece ? PIECES[S.piece].name : (FORMS[S.form] || '-')}`,
        `Weight: ${S.unknown ? 'unknown, please weigh it' : S.grams.toFixed(1) + ' g'}`,
        '', story || '(no story yet)', '', `${name}`, `${email}`
      ];
      const sent = $('#sent');
      if (FORM_ENDPOINT) {
        try {
          const r = await fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ name, email, source: S.source, form: S.form, piece: S.piece, grams: S.unknown ? null : S.grams, story }) });
          if (!r.ok) throw new Error(r.status);
          sent.innerHTML = `<h3>Thank you, ${escapeHtml(name.split(' ')[0])}.</h3><p>Your request is with us. We reply to ${escapeHtml(email)} within two working days with a first idea and a price.</p>`;
        } catch (err) {
          sent.innerHTML = `<h3>That didn’t go through.</h3><p>Please try again, or write to us directly at <a href="mailto:hello@slowgold.com">hello@slowgold.com</a>.</p>`;
        }
      } else {
        const href = `mailto:hello@slowgold.com?subject=${encodeURIComponent('Sketch request: ' + (S.piece ? PIECES[S.piece].name : (FORMS[S.form] || 'a new piece')))}&body=${encodeURIComponent(lines.join('\n'))}`;
        location.href = href;
        sent.innerHTML = `<h3>Almost there, ${escapeHtml(name.split(' ')[0])}.</h3><p>Your email app should open with your request written out. Send it, and we reply within two working days. If nothing opened, write to <a href="mailto:hello@slowgold.com">hello@slowgold.com</a>.</p>`;
      }
      sent.classList.add('on');
    });
    const escapeHtml = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    render();
    return {
      preset({ piece, source }) {
        if (source) { S.source = source; const r = $(`input[name=source][value="${source}"]`, form); if (r) r.checked = true; }
        if (piece && PIECES[piece]) {
          S.piece = piece; S.form = PIECES[piece].form;
          const r = $(`input[name=form][value="${S.form}"]`, form); if (r) r.checked = true;
          if (piece === 'gathering') { S.grams = 2.6; grams.value = 2.6; }
          if (piece === 'promise') { S.grams = 5; grams.value = 5; }
        }
        S.step = !S.source ? 0 : !S.form ? 1 : 2;
        render();
      }
    };
  }
})();
