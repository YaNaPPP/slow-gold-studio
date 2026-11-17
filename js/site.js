/* Slow Gold Studio — page choreography.
   Lenis smooth scroll + GSAP ScrollTrigger. The page reads correctly without this file;
   it adds the loader, motion, the chapter bar and the order builder. */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const root = document.documentElement;

  /* ---------- loader: counts up to the 3.2 g of the hero ring, then hands over ---------- */
  (() => {
    const line = $('#loadLine'), g = $('#loadG'); let shown = 0, target = 2.6, done = false;
    const t0 = performance.now();
    const tick = now => {
      if (!root.classList.contains('is-loading')) return;
      const goal = done ? 3.2 : Math.min(target, 2.6 * (1 - Math.exp(-(now - t0) / 900)));
      shown += done ? Math.max(.05, (goal - shown) * .2) : (goal - shown) * .1; shown = Math.min(shown, 3.2);
      g.textContent = shown.toFixed(1); line.style.setProperty('--p', (shown / 3.2).toFixed(3));
      if (done && shown >= 3.2) { g.textContent = '3.2'; line.style.setProperty('--p', 1); setTimeout(() => root.classList.remove('is-loading'), 260); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const finish = () => { done = true; };
    if (window.SGHero && window.SGHero.ready) finish(); else addEventListener('sg:ready', finish, { once: true });
    if (!hasGsap) setTimeout(finish, 600);
  })();

  /* ---------- order builder (works without GSAP too) ---------- */
  const order = initOrder();
  if (!hasGsap) return;
  gsap.registerPlugin(ScrollTrigger, ...(window.SplitText ? [SplitText] : []));

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: .1, wheelMultiplier: 1, touchMultiplier: 1.4 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const barH = () => $('#bar').offsetHeight;
  function goTo(el) {
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

  /* ---------- headline line reveals ---------- */
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
    if (!reduce && window.SplitText) $$('[data-split]').forEach(el => {
      SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
        onSplit: self => gsap.from(self.lines, { yPercent: 108, duration: 1.3, ease: 'expo.out', stagger: .1,
          scrollTrigger: { trigger: el, start: 'top 86%', once: true } }) });
    });
    ScrollTrigger.refresh();
  });

  /* ================= 01 — THE GOLD ================= */
  (() => {
    const lq = window.SGLiquid && $('#liquid') ? window.SGLiquid($('#liquid')) : null;
    if (!lq) $('#liquid').style.background = 'radial-gradient(60% 60% at 65% 45%, #4a3515, #0b0a09)';
    if (!reduce) gsap.to('#liquid', { yPercent: 18, scale: 1.08, ease: 'none', scrollTrigger: { trigger: '.gold-open', start: 'top top', end: 'bottom top', scrub: true } });
    const segs = $$('.share-bar > div'), legend = $$('.share-legend > div');
    if (!reduce) {
      gsap.set(segs, { '--s': 0, opacity: 0 }); gsap.set(legend, { autoAlpha: 0, y: 12 });
      const tl = gsap.timeline({ scrollTrigger: { trigger: '#share', start: 'top 80%', once: true } });
      tl.to(segs, { opacity: 1, duration: .5, stagger: .08 })
        .to(segs[0], { '--s': 1, duration: 1.6, ease: 'expo.out' }, .2)
        .to(legend, { autoAlpha: 1, y: 0, duration: .8, ease: 'power3.out', stagger: .08 }, .3);
    }
  })();

  /* ================= 02 — YOUR GOLD: three pieces become one ================= */
  (() => {
    const sec = $('#remake'), cv = $('#metal');
    const metal = window.SGMelt ? window.SGMelt(cv) : null;
    if (!metal) { sec.classList.add('nometal'); $$('.tag', sec).forEach(t => t.hidden = true); }
    const stages = $$('.melt-stage', sec), tags = [0, 1, 2].map(i => $('#tag' + i));
    const temp = $('#temp'), tempBox = $('#tempBox'), glow = $('.glow', sec), meltBar = $('#meltBar');
    const ring = $('#finalRing'), cap = $('#finalCap');
    let cur = 0;
    const show = i => {
      if (i === cur) return;
      const prev = stages[cur], next = stages[i]; cur = i;
      gsap.killTweensOf([prev, next]);
      gsap.to(prev, { autoAlpha: 0, y: -16, duration: .4, ease: 'power2.in' });
      gsap.fromTo(next, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: .8, delay: .18, ease: 'power3.out' });
      stages.forEach(s => s.classList.toggle('on', s === next));
    };
    const place = p => {
      if (!metal) return;
      const pts = metal.points(), fade = 1 - gsap.utils.clamp(0, 1, (p - .12) / .1);
      tags.forEach((t, i) => gsap.set(t, { x: pts[i].x, y: pts[i].y - pts[i].s * (i === 2 ? .17 : .2), xPercent: -50, yPercent: -100, autoAlpha: fade }));
      /* the molten gold resolves into the finished piece */
      const c = pts[3], H = cv.clientHeight, W = cv.clientWidth;
      const d = Math.min(H * .74, W * (W > 900 && W / H > 1 ? .44 : .9));
      const r = gsap.utils.clamp(0, 1, (p - .6) / .17);
      const ease = 1 - Math.pow(1 - r, 3);
      gsap.set(ring, { x: c.x, y: c.y, '--d': d + 'px', '--m': ease.toFixed(3), opacity: r > 0 ? 1 : 0, scale: 1.1 - .1 * ease });
      cv.style.opacity = (1 - gsap.utils.clamp(0, 1, (p - .66) / .1)).toFixed(3);
      const ca = gsap.utils.clamp(0, 1, (p - .8) / .08);
      gsap.set(cap, { x: c.x, y: c.y + d * .43, opacity: ca });
      glow.style.setProperty('--gx', (c.x / W * 100).toFixed(1) + '%');
    };
    const update = p => {
      if (metal) metal.progress = p;
      const hot = gsap.utils.clamp(0, 1, (p - .17) / .21) * (1 - gsap.utils.clamp(0, 1, (p - .6) / .2));
      temp.textContent = Math.round(21 + hot * 1043).toLocaleString('en') + ' °C';
      tempBox.classList.toggle('hot', hot > .05);
      glow.style.setProperty('--heat', (hot * .55).toFixed(3));
      meltBar.style.setProperty('--p', p.toFixed(3));
      show(p < .2 ? 0 : p < .5 ? 1 : p < .74 ? 2 : 3);
      place(p);
    };
    ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom', scrub: reduce ? true : .8, onUpdate: s => update(s.progress),
      onRefresh: s => { metal && metal.layout(); update(s.progress); } });
    update(0);
  })();

  /* ================= 03 — THE MAKING: a sideways walk through four weeks ================= */
  (() => {
    const track = $('#track'), pin = $('#makingPin'), line = $('#tlLine');
    const passport = $('#passport'), typed = $$('[data-type]', passport), seal = $('.seal', passport);
    const full = typed.map(el => el.textContent);
    let passportDone = false;
    const playPassport = () => {
      if (passportDone || reduce) return; passportDone = true;
      typed.forEach(el => el.textContent = '');
      const tl = gsap.timeline();
      typed.forEach((el, i) => {
        const o = { n: 0 }, txt = full[i];
        tl.to(o, { n: txt.length, duration: Math.min(.8, .2 + txt.length * .02), ease: 'none', onUpdate: () => el.textContent = txt.slice(0, Math.round(o.n)) }, i === 0 ? 0 : '>-0.05');
      });
      tl.fromTo(seal, { scale: 1.8, autoAlpha: 0, rotate: -60 }, { scale: 1, autoAlpha: 1, rotate: 0, duration: .8, ease: 'expo.out' }, '>-0.1');
    };
    const draw = (root, opts) => {
      const els = $$('.draw', root);
      els.forEach(el => { const L = el.getTotalLength ? el.getTotalLength() : 600; el.style.strokeDasharray = L; el.style.strokeDashoffset = reduce ? 0 : L; });
      if (!reduce) gsap.to(els, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut', stagger: .16, scrollTrigger: Object.assign({ once: true }, opts) });
    };
    gsap.matchMedia().add({ wide: '(min-width: 901px)' }, ctx => {
      if (ctx.conditions.wide && !reduce) {
        const dist = () => track.scrollWidth - innerWidth, len = () => Math.min(dist(), innerHeight * 2.5);
        const tween = gsap.to(track, { x: () => -dist(), ease: 'none',
          scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + len(), pin: true, scrub: .8, invalidateOnRefresh: true, anticipatePin: 1,
            onUpdate: s => line.style.setProperty('--p', s.progress.toFixed(3)) } });
        $$('.step', track).forEach(step => {
          gsap.from($$('.step-no, .t-l, .body', step), { y: 40, autoAlpha: 0, stagger: .06, ease: 'none',
            scrollTrigger: { trigger: step, containerAnimation: tween, start: 'left 90%', end: 'left 50%', scrub: true } });
          $$('.plate', step).forEach((pl, k) => {
            gsap.fromTo(pl, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.out',
              scrollTrigger: { trigger: step, containerAnimation: tween, start: `left ${85 - k * 10}%`, end: `left ${35 - k * 10}%`, scrub: true } });
            gsap.fromTo($('img', pl), { scale: 1.25 }, { scale: 1, ease: 'none',
              scrollTrigger: { trigger: step, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
          });
        });
        draw($('.sketch'), { trigger: $('.step[data-step="0"]'), containerAnimation: tween, start: 'left 80%' });
        ScrollTrigger.create({ trigger: $('.step[data-step="3"]'), containerAnimation: tween, start: 'left 65%', once: true, onEnter: playPassport });
      } else {
        $$('.plate', track).forEach(pl => gsap.fromTo(pl, { clipPath: reduce ? 'inset(0%)' : 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'power3.out', scrollTrigger: { trigger: pl, start: 'top 85%', once: true } }));
        draw($('.sketch'), { trigger: $('.sketch'), start: 'top 80%' });
        ScrollTrigger.create({ trigger: passport, start: 'top 75%', once: true, onEnter: playPassport });
      }
    });
  })();

  /* ================= 04 — PIECES ================= */
  (() => {
    const day = $('#daylight');
    if (!reduce) {
      gsap.fromTo(day, { clipPath: 'inset(8% 6% 0% 6%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
        scrollTrigger: { trigger: '#pieces', start: 'top bottom', end: 'top 10%', scrub: true } });
      $$('.tile', day).forEach(t => {
        const m = $('.tile-media', t), img = $('img', m);
        gsap.fromTo(m, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.out', scrollTrigger: { trigger: t, start: 'top 88%', once: true } });
        gsap.fromTo(img, { scale: 1.18, transition: 'none' }, { scale: 1, duration: 2, ease: 'expo.out', clearProps: 'transform,transition', scrollTrigger: { trigger: t, start: 'top 88%', once: true } });
        gsap.from($('.tile-body', t), { autoAlpha: 0, y: 20, duration: 1.1, delay: .25, ease: 'power3.out', scrollTrigger: { trigger: t, start: 'top 88%', once: true } });
        gsap.to(m, { yPercent: -6, ease: 'none', scrollTrigger: { trigger: t, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    }
    /* the visitor's lamp, again: light follows the cursor across each piece */
    $$('.tile-media', day).forEach(m => {
      m.addEventListener('pointermove', e => { const r = m.getBoundingClientRect();
        m.style.setProperty('--mx', (e.clientX - r.left) + 'px'); m.style.setProperty('--my', (e.clientY - r.top) + 'px'); m.style.setProperty('--lamp', 1); });
      m.addEventListener('pointerleave', () => m.style.setProperty('--lamp', 0));
    });
  })();

  /* ================= FAQ: smooth open and close ================= */
  $$('.faq details').forEach(d => {
    const s = $('summary', d), body = $('.ans', d);
    s.addEventListener('click', e => {
      if (reduce) return;
      e.preventDefault();
      if (d.open) gsap.to(body, { height: 0, duration: .5, ease: 'power3.inOut', onComplete: () => { d.open = false; body.style.height = ''; } });
      else { d.open = true; gsap.fromTo(body, { height: 0 }, { height: body.scrollHeight, duration: .6, ease: 'power3.out', onComplete: () => body.style.height = '' }); }
    });
  });

  /* ================= FOOTER: the name is cast too ================= */
  (() => {
    const w = $('#wordmark'); if (!w || reduce) return;
    ScrollTrigger.create({ trigger: w, start: 'top 95%', once: true, onEnter: () => {
      w.classList.add('pouring');
      gsap.timeline()
        .fromTo(w, { '--f': '-12%', '--g': 1 }, { '--f': '125%', duration: 2.2, ease: 'power2.inOut' })
        .add(() => w.classList.remove('pouring'))
        .to(w, { '--g': 0, duration: 1.6, ease: 'power2.out' }, '-=0.6');
    } });
  })();

  /* ---------- chapter bar: created last, so it measures after the pinned chapter adds its length ---------- */
  (() => {
    const bar = $('#bar'), links = $$('.bar-chapters a'), fill = $('.bar-progress i');
    ScrollTrigger.create({ trigger: '#hero', start: 'bottom 80px', onEnter: () => bar.classList.add('show'), onLeaveBack: () => bar.classList.remove('show') });
    $$('[data-chapter]').forEach(sec => ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 55%',
      onToggle: s => { if (s.isActive) links.forEach(a => a.classList.toggle('on', a.dataset.ch === sec.dataset.chapter)); } }));
    ScrollTrigger.create({ trigger: '#daylight', start: 'top 40px', endTrigger: '#begin', end: 'bottom 40px', onToggle: s => bar.classList.toggle('light', s.isActive) });
    ScrollTrigger.create({ trigger: '#gold', start: 'top top', endTrigger: 'body', end: 'bottom bottom', onUpdate: s => gsap.set(fill, { scaleX: s.progress }) });
  })();
  addEventListener('load', () => ScrollTrigger.refresh());

  /* =================================================================== */
  function initOrder() {
    const form = $('#order'); if (!form) return { preset() {} };
    const fss = $$('.fs', form), next = $('#next'), back = $('#back'), lbl = $('#stepLbl'), qBar = $('#qBar');
    const grams = $('#grams'), gVal = $('#gVal'), gNote = $('#gNote'), gHint = $('#gHint'), unknown = $('#unknown'), wLegend = $('#wLegend');
    const sum = { source: $('#sSource'), form: $('#sForm'), weight: $('#sWeight'), price: $('#sPrice') };
    const FORM_ENDPOINT = ''; /* set to a form service URL (e.g. Formspree) to receive requests directly */
    const S = { step: 0, source: '', form: '', grams: 7.8, unknown: false, piece: '' };
    const SRC = { own: 'Your own gold', studio: 'Studio gold', mix: 'Yours and ours' };
    const FORMS = { ring: 'A ring', pendant: 'A pendant', earrings: 'Earrings', bracelet: 'A bracelet', unsure: 'We suggest options' };
    const CRAFT = { ring: 380, pendant: 320, earrings: 290, bracelet: 460 };
    const PIECES = { keeper: { form: 'ring', name: 'The Keeper', price: 420, g: 7.8 }, promise: { form: 'ring', name: 'The Promise', price: 680, g: 5 },
      gathering: { form: 'ring', name: 'The Gathering', price: 290, g: 2.6 }, heirloom: { form: 'pendant', name: 'The Heirloom', price: 320, g: 4.5 },
      idea: { form: 'unsure', name: 'Your own idea' } };
    const arrow = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 8h12M9 3l5 5-5 5"/></svg>';
    const flash = el => { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); };
    function hint() {
      const g = S.grams, f = S.form || 'ring';
      const T = {
        ring: g < 2 ? 'a fine stacking band' : g < 4 ? 'a slim band' : g < 8.5 ? 'a wide band or a signet ring' : 'a statement ring, or two rings',
        pendant: g < 2 ? 'a small charm' : g < 5 ? 'a medallion pendant' : 'a large medallion, or a pendant with its own chain',
        earrings: g < 2 ? 'a pair of studs' : g < 5 ? 'a pair of small hoops' : 'a pair of statement hoops',
        bracelet: g < 6 ? 'a fine bracelet, topped up with studio gold' : g < 12 ? 'a chain bracelet' : 'a solid bangle',
        unsure: g < 3 ? 'a slim ring, a pendant or a pair of studs' : g < 8 ? 'a wide band, a medallion or hoops' : 'a bangle, or several pieces for the family'
      };
      gHint.textContent = S.unknown ? 'No problem. We weigh it for free when it arrives, before anything is decided.' : `Enough for ${T[f]}.`;
      const bands = g / 3.2;
      gNote.textContent = S.unknown ? '' : bands < .9 ? 'less than one wedding band' : bands < 1.3 ? 'about one wedding band' : `about ${Math.round(bands)} wedding bands`;
    }
    function render() {
      fss.forEach((f, i) => f.classList.toggle('on', i === S.step));
      lbl.textContent = `Question ${S.step + 1} of 4`;
      qBar.style.setProperty('--p', ((S.step + 1) / 4).toFixed(2));
      back.hidden = S.step === 0;
      const last = S.step === 3;
      next.innerHTML = (last ? 'Request my sketch ' : 'Continue ') + arrow;
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
    const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const name = $('#name').value.trim(), email = $('#email').value.trim(), story = $('#story').value.trim();
      const okMail = /.+@.+\..+/.test(email);
      $('#nameErr').textContent = name ? '' : 'Please tell us your name.';
      $('#emailErr').textContent = okMail ? '' : 'Please enter an email address we can reply to.';
      if (!name || !okMail) return;
      const what = S.piece ? PIECES[S.piece].name : (FORMS[S.form] || 'a new piece');
      const lines = [`Gold: ${SRC[S.source] || '-'}`, `Becomes: ${what}`, `Weight: ${S.unknown ? 'unknown, please weigh it' : S.grams.toFixed(1) + ' g'}`, '', story || '(no story yet)', '', name, email];
      const sent = $('#sent');
      if (FORM_ENDPOINT) {
        try {
          const r = await fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ name, email, source: S.source, form: S.form, piece: S.piece, grams: S.unknown ? null : S.grams, story }) });
          if (!r.ok) throw new Error(r.status);
          sent.innerHTML = `<h3>Thank you, ${esc(name.split(' ')[0])}.</h3><p>Your request is with us. We reply to ${esc(email)} within two working days with a first idea and a price.</p>`;
        } catch (err) {
          sent.innerHTML = `<h3>That didn’t go through.</h3><p>Please try again, or write to us at <a href="mailto:hello@slowgold.com">hello@slowgold.com</a>.</p>`;
        }
      } else {
        location.href = `mailto:hello@slowgold.com?subject=${encodeURIComponent('Sketch request: ' + what)}&body=${encodeURIComponent(lines.join('\n'))}`;
        sent.innerHTML = `<h3>Almost there, ${esc(name.split(' ')[0])}.</h3><p>Your email app should open with the request written out. Send it, and we reply within two working days. If nothing opened, write to <a href="mailto:hello@slowgold.com">hello@slowgold.com</a>.</p>`;
      }
      sent.classList.add('on');
    });
    render();
    return {
      preset({ piece, source }) {
        if (source) { S.source = source; const r = $(`input[name=source][value="${source}"]`, form); if (r) r.checked = true; }
        if (piece && PIECES[piece]) {
          const P = PIECES[piece]; S.piece = piece; S.form = P.form;
          const r = $(`input[name=form][value="${S.form}"]`, form); if (r) r.checked = true;
          if (P.g) { S.grams = P.g; grams.value = P.g; }
        }
        S.step = !S.source ? 0 : !S.form ? 1 : 2;
        render();
      }
    };
  }
})();
