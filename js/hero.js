/* Hero: the visitor makes the ring. Hold to melt an old band, hold again to pour it, click to hammer it,
   then it cools onto the ledge and the headline is cast. Runs only while the hero is on screen. */
(() => {
  const hero = document.getElementById('hero');
  const $ = s => hero.querySelector(s), $$ = s => [...hero.querySelectorAll(s)];
  const canvas = $('#gl');
  let inView = true, running = false;
  const api = window.SGHero = { phase: 'intro', skip(){}, inView: () => inView };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SW = 1920, SH = 1080;
  const sub = $('#sub'), prompt = $('#prompt'), capL = $('#capL'), capR = $('#capR');
  const script = $('#script'), serif = $('#serif'), lineSpans = $$('.serif .ln > span');
  const rules = $$('.rule'), topRules = $$('.top .rule'), navLinks = $$('.nav a').map(el => ({ el, p: 1, shown: -1 })), ui = $$('.ui'), cursorEl = $('#cursor'), cfill = $('#cfill');
  const FINAL = { sub: sub.innerHTML, capL: capL.textContent, capR: capR.textContent };

  let vw = 1, vh = 1, heatR = 95;
  lineSpans.forEach(s => { s.innerHTML = [...s.textContent].map(c => c === ' ' ? ' ' : `<span class="ch" aria-hidden="true">${c}</span>`).join(''); });
  const letters = $$('.serif .ch').map(el => ({ el, x: 0, y: 0, h: 0, shown: -1 }));
  function measureLetters(){
    const hr = hero.getBoundingClientRect();
    letters.forEach(l => { const r = l.el.getBoundingClientRect();
      l.x = r.left + r.width / 2 - hr.left; l.y = r.top + r.height * .55 - hr.top; });
    heatR = Math.max(50, parseFloat(getComputedStyle(serif).fontSize) || 95);
  }

  const hasGL = (() => { try { const c = document.createElement('canvas'); return !!(window.THREE && (c.getContext('webgl2') || c.getContext('webgl'))); } catch(e){ return false; } })();
  const ready = () => { api.ready = true; dispatchEvent(new Event('sg:ready')); };
  if (!hasGL || !window.gsap){ hero.classList.add('nogl'); fitStage(); addEventListener('resize', fitStage); setTimeout(ready, 0); return; }
  function fitStage(){
    vw = hero.clientWidth || innerWidth; vh = hero.clientHeight || innerHeight;
    measureLetters();
  }

  /* =================== sound: synthesised, starts on the first press =================== */
  const VOL = .3;
  const A = { ctx: null, master: null, roar: null, noise: null, on: true };
  function audio(){
    if (A.ctx || !A.on) return;
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const master = ac.createGain(); master.gain.value = VOL; master.connect(ac.destination);
      const len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 320; bp.Q.value = .6;
      const roar = ac.createGain(); roar.gain.value = 0;
      src.connect(bp); bp.connect(roar); roar.connect(master); src.start();
      Object.assign(A, { ctx: ac, master, roar, noise: buf, bp });
    } catch(e){ A.ctx = null; }
  }
  function burst(dur, freq, type, gain){
    const ac = A.ctx; if (!ac) return;
    const s = ac.createBufferSource(); s.buffer = A.noise;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ac.createGain(), t = ac.currentTime;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(A.master); s.start(t, Math.random()); s.stop(t + dur + .05);
  }
  function bell(base, partials, amps, decay, gain){
    const ac = A.ctx; if (!ac) return; const t = ac.currentTime;
    partials.forEach((p, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = base * p * (1 + (Math.random() - .5) * .004);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain * amps[i], t + .003);
      g.gain.exponentialRampToValueAtTime(.0001, t + decay / (1 + i * .5));
      o.connect(g); g.connect(A.master); o.start(t); o.stop(t + decay + .1);
    });
  }
  const sfx = {
    clang(){ const b = 330 + Math.random() * 140; bell(b, [1, 2.76, 5.4, 8.93, 13.34], [1, .55, .35, .22, .12], 1.9, .24); bell(b * .25, [1], [1], .22, .4); burst(.06, 2600, 'highpass', .35); },
    clink(){ bell(1650 + Math.random() * 200, [1, 2.42, 3.9], [1, .5, .3], .9, .18); burst(.03, 4000, 'highpass', .2); },
    sizzle(d){ burst(d, 3200, 'highpass', .25); },
    crackle(){ burst(.012 + Math.random() * .02, 1800 + Math.random() * 3000, 'bandpass', .15 + Math.random() * .2); }
  };
  function toggleSound(){
    A.on = !A.on; const b = $('#sound');
    $('#soundLbl').textContent = A.on ? 'Sound on' : 'Sound off'; b.setAttribute('aria-pressed', A.on);
    b.title = A.on ? 'Turn sound off (M)' : 'Turn sound on (M)';
    if (A.ctx) A.master.gain.setTargetAtTime(A.on ? VOL : 0, A.ctx.currentTime, .05); else if (A.on) audio();
  }
  $('#sound').addEventListener('pointerdown', e => e.stopPropagation());
  $('#sound').addEventListener('click', e => { e.stopPropagation(); toggleSound(); });
  addEventListener('keydown', e => { if ((e.key === 'm' || e.key === 'M') && !e.repeat && !e.target.closest('input,textarea')) toggleSound(); });

  /* =================== the 3D scene =================== */
  const T = THREE;
  const renderer = new T.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(1.5, devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.NoToneMapping;
  const scene = new T.Scene();
  scene.background = new T.Color(0x0c0b0a).convertSRGBToLinear();
  scene.fog = new T.Fog(scene.background, 9, 18);
  const camera = new T.PerspectiveCamera(30, 16 / 9, .1, 60);
  const pmrem = new T.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new T.RoomEnvironment(), .04).texture;
  const lin = hex => new T.Color(hex).convertSRGBToLinear();

  /* stone texture, made here */
  function stoneTexture(){
    const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
    const d = x.createImageData(512, 512), p = d.data;
    for (let i = 0; i < p.length; i += 4){ const v = 120 + (Math.random() - .5) * 46; p[i] = v; p[i+1] = v * .97; p[i+2] = v * .93; p[i+3] = 255; }
    x.putImageData(d, 0, 0); x.filter = 'blur(1px)'; x.drawImage(c, 0, 0);
    for (let i = 0; i < 1400; i++){ x.fillStyle = `rgba(${Math.random() < .5 ? '0,0,0' : '255,255,255'},${Math.random() * .05})`;
      const r = 2 + Math.random() * 30; x.beginPath(); x.arc(Math.random() * 512, Math.random() * 512, r, 0, 6.3); x.fill(); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t;
  }
  const stoneMap = stoneTexture();
  const stone = new T.MeshStandardMaterial({ color: lin(0x6b655e), map: stoneMap, roughnessMap: stoneMap, roughness: 1, metalness: 0, envMapIntensity: .12 });
  stoneMap.repeat.set(2, 1);
  const ledge = new T.Mesh(new T.BoxGeometry(9, 4, 3.2), stone);
  ledge.position.set(4.0, -1.1 - 2, -.2); ledge.receiveShadow = true; scene.add(ledge);
  const wall = new T.Mesh(new T.PlaneGeometry(40, 20), stone.clone());
  wall.material.color = lin(0x3a3632); wall.position.set(0, 2, -2.2); wall.receiveShadow = true; scene.add(wall);
  const pillar = new T.Mesh(new T.BoxGeometry(1.2, 12, 4), stone.clone());
  pillar.material.color = lin(0x4a4540); pillar.position.set(-2.6, 1, -1.6); pillar.receiveShadow = true; pillar.castShadow = true; scene.add(pillar);

  /* lights: daylight shaft from the upper right, the fire in the metal, the visitor's lamp */
  scene.add(new T.HemisphereLight(lin(0x403830), lin(0x080706), .25));
  const sun = new T.SpotLight(lin(0xffe0b0), 1.2, 30, .42, .85, 1.2);
  sun.position.set(6.5, 8, 4.5); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -.0004; sun.shadow.radius = 4;
  scene.add(sun); scene.add(sun.target);
  const fire = new T.PointLight(lin(0xff6a1a), 0, 7, 1.6); scene.add(fire);
  const lamp = new T.PointLight(lin(0xffe4bd), 0, 6, 1.4); scene.add(lamp);

  /* light shaft + dust in it */
  const BA = { x: Math.sin(.62), y: Math.cos(.62) }, BC = { x: 4.7, y: 4.9 };
  const beamMat = new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
    uniforms: { uI: { value: .35 }, uT: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `varying vec2 vUv; uniform float uI, uT;
      float h(float n){ return fract(sin(n)*43758.5453); }
      float n1(float x){ float i = floor(x), f = fract(x); return mix(h(i), h(i+1.), f*f*(3.-2.*f)); }
      void main(){
        float edge = smoothstep(0., .35, vUv.x) * smoothstep(1., .65, vUv.x);
        float len = smoothstep(0., .25, vUv.y) * smoothstep(1., .55, vUv.y);
        float streak = .65 + .35 * n1(vUv.x * 18. + uT * .15) * n1(vUv.x * 7. - uT * .1);
        gl_FragColor = vec4(vec3(1., .82, .58) * edge * len * streak * uI * .22, 1.);
      }`
  });
  const beam = new T.Mesh(new T.PlaneGeometry(2.6, 16), beamMat);
  beam.position.set(BC.x, BC.y, .2); beam.rotation.z = -.62; scene.add(beam);
  const DUST = 420, dustPos = new Float32Array(DUST * 3), dustSeed = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++){ const s = Math.random(); dustSeed[i] = Math.random() * 100;
    const along = Math.random() * 11 - 6.5, across = (Math.random() - .5) * 2.2;
    dustPos[i*3] = BC.x + BA.x * along + BA.y * across;
    dustPos[i*3+1] = BC.y + BA.y * along - BA.x * across;
    dustPos[i*3+2] = (Math.random() - .5) * 2.4; }
  const dustGeo = new T.BufferGeometry(); dustGeo.setAttribute('position', new T.BufferAttribute(dustPos, 3)); dustGeo.setAttribute('seed', new T.BufferAttribute(dustSeed, 1));
  const dustMat = new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uI: { value: .35 }, uPR: { value: renderer.getPixelRatio() } },
    vertexShader: `attribute float seed; uniform float uT, uPR; varying float vA;
      void main(){ vec3 p = position; p.x += sin(uT*.13 + seed) * .25; p.y += sin(uT*.09 + seed*1.7) * .3; p.z += cos(uT*.11 + seed) * .2;
        // brightness: distance to the shaft's axis
        vec2 d = p.xy - vec2(4.7, 4.9); vec2 ax = vec2(sin(.62), cos(.62)); float across = abs(d.x*ax.y - d.y*ax.x);
        vA = smoothstep(1.2, .2, across) * (.4 + .6 * fract(seed * 7.13));
        vec4 mv = modelViewMatrix * vec4(p, 1.); gl_PointSize = (1.2 + fract(seed * 3.7) * 2.2) * uPR * (6. / -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uI; varying float vA; void main(){ float r = length(gl_PointCoord - .5); gl_FragColor = vec4(vec3(1., .86, .64) * smoothstep(.5, .0, r) * vA * uI * .9, 1.); }`
  });
  scene.add(new T.Points(dustGeo, dustMat));

  /* =================== the ring: one mesh, three bodies (old band, droplet, new band) =================== */
  const NU = 220, NV = 44, NVERT = NU * NV;
  const Pold = new Float32Array(NVERT * 3), Pnew = new Float32Array(NVERT * 3), Pdrop = new Float32Array(NVERT * 3);
  const yOld = new Float32Array(NVERT), yNew = new Float32Array(NVERT), vNoise = new Float32Array(NVERT);
  const dent = new Float32Array(NVERT * 3), heatL = new Float32Array(NVERT);
  const periodic = (amps) => { const ph = amps.map(() => Math.random() * 6.283); return th => amps.reduce((s, a, k) => s + a * Math.sin((k + 2) * th + ph[k]), 0); };
  const wN = periodic([.035, .028, .02, .014, .01, .008]), rN = periodic([.012, .009, .006]), tN = periodic([.01, .008, .006, .004]);
  const sgnpow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
  for (let i = 0; i < NU; i++){
    const th = i / NU * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
    for (let j = 0; j < NV; j++){
      const k = i * NV + j, a = j / NV * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      // old: a thin, even wedding band
      let px = sgnpow(ca, 2 / 6) * .038, pz = sgnpow(sa, 2 / 6) * .1, R = .98;
      Pold.set([(R + px) * c, (R + px) * s, pz], k * 3); yOld[k] = (R + px) * s;
      // new: a wide, hand-formed band with an uneven edge
      const w = .31 + wN(th), t = .058 + tN(th); R = 1.02 + rN(th);
      px = sgnpow(ca, 2 / 3.2) * t; pz = sgnpow(sa, 2 / 3.2) * w;
      Pnew.set([(R + px) * c, (R + px) * s, pz], k * 3); yNew[k] = (R + px) * s;
      // droplet: the same vertices wrapped onto a sagging drop under the ring's centre
      const phi = (j / NV - .5) * Math.PI;
      const dx = Math.cos(phi) * c, dy = Math.cos(phi) * s, dz = Math.sin(phi);
      Pdrop.set([dx * .5, -.5 + dy * .44 - (dy < 0 ? dy * dy * .05 : 0), dz * .5], k * 3);
      vNoise[k] = Math.random();
    }
  }
  const idx = [];
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++){
    const a = i * NV + j, b = ((i + 1) % NU) * NV + j, c = ((i + 1) % NU) * NV + (j + 1) % NV, d = i * NV + (j + 1) % NV;
    idx.push(a, b, d, b, c, d);
  }
  const ringGeo = new T.BufferGeometry();
  const posAttr = new T.BufferAttribute(new Float32Array(Pold), 3); posAttr.setUsage(T.DynamicDrawUsage);
  const heatAttr = new T.BufferAttribute(new Float32Array(NVERT), 1); heatAttr.setUsage(T.DynamicDrawUsage);
  ringGeo.setAttribute('position', posAttr); ringGeo.setAttribute('aHeat', heatAttr); ringGeo.setIndex(idx); ringGeo.computeVertexNormals();
  const gold = new T.MeshStandardMaterial({ color: lin(0xe9bd73), metalness: 1, roughness: .34, envMapIntensity: 1.0 });
  gold.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aHeat; varying float vHeat;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHeat = aHeat;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying float vHeat;
      vec3 blackbody(float t){ t = clamp(t, 0., 1.);
        vec3 c = mix(vec3(.25,.01,0.), vec3(1.,.14,.01), smoothstep(0., .3, t));
        c = mix(c, vec3(1.,.48,.08), smoothstep(.28, .62, t));
        return mix(c, vec3(1.,.88,.62), smoothstep(.62, 1., t)); }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float hh = clamp(vHeat, 0., 1.3);
        totalEmissiveRadiance += blackbody(hh) * pow(hh, 2.2) * 2.4;
        diffuseColor.rgb *= 1. - .55 * smoothstep(.25, .9, hh);`);
  };
  const ring = new T.Mesh(ringGeo, gold); ring.castShadow = true; ring.frustumCulled = false;
  const ringGroup = new T.Group(); ringGroup.add(ring); scene.add(ringGroup);
  const halo = new T.Sprite(new T.SpriteMaterial({ color: lin(0xff7a28), transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false,
    map: (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
      const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c); })() }));
  halo.scale.set(4.6, 4.6, 1); ringGroup.add(halo);

  /* sparks */
  const SP = 900, spPos = new Float32Array(SP * 3), spVel = new Float32Array(SP * 3), spLife = new Float32Array(SP), spMax = new Float32Array(SP).fill(1);
  spLife.fill(9);
  const spGeo = new T.BufferGeometry(); spGeo.setAttribute('position', new T.BufferAttribute(spPos, 3)); spGeo.setAttribute('life', new T.BufferAttribute(new Float32Array(SP), 1));
  spGeo.attributes.position.setUsage(T.DynamicDrawUsage); spGeo.attributes.life.setUsage(T.DynamicDrawUsage);
  const spMat = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: { uPR: { value: renderer.getPixelRatio() } },
    vertexShader: `attribute float life; uniform float uPR; varying float vL; void main(){ vL = life; vec4 mv = modelViewMatrix * vec4(position,1.);
      gl_PointSize = (life > 0. ? (1.5 + 3.5 * life) : 0.) * uPR * (7. / -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vL; void main(){ float r = length(gl_PointCoord - .5); if (vL <= 0.) discard;
      vec3 c = mix(vec3(1.,.25,.02), vec3(1.,.9,.6), smoothstep(.3, 1., vL)) * (2.5 + 5. * vL);
      gl_FragColor = vec4(c * smoothstep(.5, .05, r), 1.); }`
  });
  const sparksPts = new T.Points(spGeo, spMat); sparksPts.frustumCulled = false; scene.add(sparksPts);
  let spCursor = 0;
  function emit(x, y, z, vx, vy, vz, life){
    const i = spCursor = (spCursor + 1) % SP;
    spPos[i*3] = x; spPos[i*3+1] = y; spPos[i*3+2] = z; spVel[i*3] = vx; spVel[i*3+1] = vy; spVel[i*3+2] = vz; spLife[i] = 0; spMax[i] = life;
  }
  function stepSparks(dt){
    const L = spGeo.attributes.life.array;
    for (let i = 0; i < SP; i++){
      if (spLife[i] >= spMax[i]){ L[i] = 0; continue; }
      spLife[i] += dt; spVel[i*3+1] -= 9.8 * dt;
      spVel[i*3] *= .99; spVel[i*3+2] *= .99;
      spPos[i*3] += spVel[i*3] * dt; spPos[i*3+1] += spVel[i*3+1] * dt; spPos[i*3+2] += spVel[i*3+2] * dt;
      if (spPos[i*3+1] < -1.1 && spVel[i*3+1] < 0 && spPos[i*3] > -.5){ spPos[i*3+1] = -1.1; spVel[i*3+1] *= -.35; spVel[i*3] *= .6; }
      L[i] = 1 - spLife[i] / spMax[i];
    }
    spGeo.attributes.position.needsUpdate = true; spGeo.attributes.life.needsUpdate = true;
  }

  /* post: bloom, then tone mapping, grain, vignette and a strike's chromatic shudder */
  const rt = new T.WebGLRenderTarget(2, 2, { type: T.HalfFloatType, samples: 4 });
  const composer = new T.EffectComposer(renderer, rt);
  composer.addPass(new T.RenderPass(scene, camera));
  const bloom = new T.UnrealBloomPass(new T.Vector2(512, 512), .9, .55, .82); composer.addPass(bloom);
  const finalPass = new T.ShaderPass({
    uniforms: { tDiffuse: { value: null }, uT: { value: 0 }, uAb: { value: 0 }, uExp: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uT, uAb, uExp; varying vec2 vUv;
      vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14), 0., 1.); }
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uT * 7.) * 43758.5453); }
      void main(){
        vec2 c = vUv - .5; vec2 o = c * uAb * .012;
        vec3 col = vec3(texture2D(tDiffuse, vUv + o).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - o).b);
        col = aces(col * uExp);
        col = pow(col, vec3(1. / 2.2));
        col *= 1. - .55 * smoothstep(.35, .95, length(c * vec2(1.2, 1.)));
        col += (h(vUv * 913.) - .5) * .055;
        gl_FragColor = vec4(col, 1.);
      }`
  });
  composer.addPass(finalPass);

  /* =================== layout: ring centre for the story, right third for the hero =================== */
  const CAM = { z: 8.2, y: .35 };
  const hold = { shakeX: 0, shakeY: 0 };
  let heroX = 1.9, storyShift = 0, heroAt = 0;
  function resize(){
    fitStage();
    const w = vw, h = vh; renderer.setSize(w, h, false); composer.setSize(w, h);
    camera.aspect = w / h; CAM.z = Math.max(8.2, 6.84 / Math.max(.4, camera.aspect)); camera.updateProjectionMatrix();
    const halfW = Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * CAM.z * 1.35 * camera.aspect;
    heroX = camera.aspect < .9 ? 0 : halfW * (camera.aspect < 1.3 ? .58 : .64);
    const halfS = Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * CAM.z * camera.aspect;
    storyShift = camera.aspect < .9 ? 0 : halfS * .2;
  }
  addEventListener('resize', resize);

  /* =================== story state =================== */
  const S = { phase: 'intro', heat: 0, melt: 0, form: 0, rough: .34, sun: 1.2, lampI: 0, shake: 0, flash: 0, exp: 1, strikes: 0 };
  const NEED = 7;
  const P = { x: 0, y: 0, sx: 0, sy: 0, down: false, downX: 0, downY: 0, moved: 0, inside: false, last: -1e9, touch: false };
  const G = { rotY: .3, rotX: .25, x: 0, y: .38, spin: .35, yawDrag: 0 };
  let holding = false, holdStart = 0;

  function say(el, html){
    gsap.timeline()
      .to(el, { opacity: 0, filter: 'blur(4px)', duration: .3, ease: 'power2.in' })
      .add(() => { el.innerHTML = html; })
      .to(el, { opacity: 1, filter: 'blur(0px)', duration: .55, ease: 'power2.out' });
  }
  const showPrompt = (txt, pulse = true) => { prompt.classList.toggle('pulse', pulse); if (prompt.textContent !== txt) say(prompt, txt); };
  const showTemp = () => { capR.textContent = Math.round(21 + S.heat * 1080).toLocaleString('en') + ' °C'; };

  function enterIntro(){
    sub.innerHTML = '<span>A wedding band, worn for forty years.</span><span>3.2 g of gold.</span>';
    capL.textContent = '3.2 g'; capR.classList.add('hot'); showTemp();
    gsap.set(rules, { scaleX: 0 }); navLinks.forEach(n => n.p = 0); gsap.set(script, { '--w': '-14%' }); gsap.set(ui, { opacity: 0, y: 8 });
    gsap.set(lineSpans, { '--f': '-12%' }); hero.classList.add('pouring', 'ready', 'story'); 
    gsap.fromTo([sub, capL, capR], { opacity: 0 }, { opacity: 1, duration: 1.2, stagger: .15, delay: .6 });
    gsap.delayedCall(1.6, () => showPrompt(P.touch ? 'Press and hold to melt it' : 'Press and hold to melt it · or hold Space'));
  }

  function strikeAt(local, worldPt, normal){
    const r = .17, depth = .028 + Math.random() * .02;
    const pos = posAttr.array, nrm = ringGeo.attributes.normal.array;
    for (let k = 0; k < NVERT; k++){
      const dx = Pnew[k*3] + dent[k*3] - local.x, dy = Pnew[k*3+1] + dent[k*3+1] - local.y, dz = Pnew[k*3+2] + dent[k*3+2] - local.z;
      const d2 = dx * dx + dy * dy + dz * dz; if (d2 > r * r) continue;
      const w = Math.pow(1 - d2 / (r * r), 2) * (1 + (Math.random() - .5) * .25);
      dent[k*3] -= nrm[k*3] * depth * w; dent[k*3+1] -= nrm[k*3+1] * depth * w; dent[k*3+2] -= nrm[k*3+2] * depth * w;
      const l = Math.hypot(dent[k*3], dent[k*3+1], dent[k*3+2]); if (l > .07){ const f = .07 / l; dent[k*3] *= f; dent[k*3+1] *= f; dent[k*3+2] *= f; }
      heatL[k] = Math.min(1.25, heatL[k] + .7 * w);
    }
    for (let i = 0; i < 70; i++){
      const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 5.5;
      emit(worldPt.x, worldPt.y, worldPt.z,
        normal.x * sp * .7 + Math.cos(a) * sp * .6, Math.abs(normal.y) * sp * .4 + Math.random() * sp * .9, normal.z * sp * .7 + Math.sin(a) * sp * .6, .35 + Math.random() * .8);
    }
    S.shake = .09; S.flash = 1; gsap.to(S, { shake: 0, flash: 0, duration: .55, ease: 'power3.out', overwrite: 'auto' });
    S.heat = Math.min(1, S.heat + .06);
    sfx.clang();
    S.strikes++;
    showPrompt(S.strikes < NEED ? `Click the ring to hammer it · ${S.strikes} / ${NEED}` : 'Done.', S.strikes < NEED);
    if (S.strikes === 3) gsap.to('#cool', { autoAlpha: 1, duration: .6 });
    if (S.strikes >= NEED) gsap.delayedCall(.7, startCooling);
  }

  function startCooling(){
    if (S.phase === 'cooling' || S.phase === 'hero') return;
    S.phase = 'cooling'; hero.classList.remove('ready'); cursorEl.style.opacity = 0;
    gsap.to('#cool', { autoAlpha: 0, duration: .3 });
    say(sub, '<span>Then left to cool.</span><span>Nothing lost. Not a gram.</span>'); showPrompt('', false);
    sfx.sizzle(2.6);
    const tl = gsap.timeline();
    tl.to(S, { heat: 0, duration: 3.2, ease: 'power2.inOut', onUpdate: showTemp }, 0)
      .to(S, { sun: 2.6, rough: .3, duration: 3.6, ease: 'power2.inOut' }, .2)
      .to(G, { rotY: -.62, rotX: .12, duration: 2.6, ease: 'power3.inOut' }, .6)
      .to(G, { x: () => heroX, duration: 2.4, ease: 'power3.inOut' }, 1.4)
      // drop onto the ledge
      .to(G, { y: () => restY(), duration: .7, ease: 'power2.in' }, 3.1)
      .add(() => { sfx.clink(); S.shake = .035; gsap.to(S, { shake: 0, duration: .4 }); puff(); }, 3.8)
      .to(G, { y: () => restY() + .06, duration: .14, ease: 'power2.out' }, 3.8)
      .to(G, { y: () => restY(), duration: .18, ease: 'power2.in' }, 3.94)
      .add(() => sfx.clink(), 4.12)
      .add(enterHero, 3.6);
  }
  function restY(){
    // lowest point of the ring at the hero pose → rest it on the ledge top (y = -1.1)
    const save = [ringGroup.position.y, ringGroup.rotation.x, ringGroup.rotation.y];
    ringGroup.position.y = 0; ringGroup.rotation.set(.12, -.62, 0); ringGroup.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(ring);
    ringGroup.position.y = save[0]; ringGroup.rotation.x = save[1]; ringGroup.rotation.y = save[2];
    return -1.1 - box.min.y + .004;
  }
  function puff(){
    const p = ring.localToWorld(new T.Vector3(0, -1.05, 0));
    for (let i = 0; i < 26; i++){ const a = Math.random() * 6.28; emit(p.x, -1.09, p.z, Math.cos(a) * 1.4, .4 + Math.random(), Math.sin(a) * 1.4, .25 + Math.random() * .3); }
  }

  function enterHero(){
    S.phase = 'hero'; heroAt = performance.now(); gsap.delayedCall(.32, () => hero.classList.remove('story'));
    say(sub, FINAL.sub); say(capL, FINAL.capL); say(capR, FINAL.capR); capR.classList.remove('hot');
    gsap.delayedCall(2.2, () => showPrompt('Every dent in it is one you made', false));
    gsap.delayedCall(7, () => { if (inView) showPrompt('Scroll for the story of your gold  ↓', false); });
    $('#skip').hidden = true; api.phase = 'hero';
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .add(() => hero.classList.add('pouring'), 0)
      .set(lineSpans, { '--f': '-12%', '--g': 1 }, 0)
      .to(rules, { scaleX: 1, duration: 1.5, ease: 'expo.inOut', stagger: .06 }, 0)
      .to(script, { '--w': '114%', duration: 2.3, ease: 'power2.inOut' }, .3)
      .to(lineSpans, { '--f': '125%', duration: 1.5, ease: 'power2.inOut', stagger: .3 }, .7)
      .add(() => hero.classList.remove('pouring'), 2.55)
      .to(lineSpans, { '--g': 0, duration: 2.2, ease: 'power2.out', stagger: .3 }, 1.9)
      .to(ui, { opacity: 1, y: 0, duration: .9, stagger: .05 }, 1.6)
      .to(S, { lampI: 1, duration: 1.6, ease: 'power2.inOut' }, 2.0)
      .add(() => { measureLetters(); lettersLive = true; }, 2.6);
  }

  function skipToSite(){
    if (S.phase === 'hero') return;
    gsap.killTweensOf([S, G, sub, prompt, capL, capR]);
    S.melt = 1; S.form = 1; S.heat = 0; S.sun = 2.6; S.rough = .3; heatL.fill(0);
    // a few dents so the piece still looks hand-made
    S.phase = 'hammer'; rebuild(0); ringGroup.updateMatrixWorld(true);
    for (let i = 0; i < 9; i++){
      const k = Math.floor(Math.random() * NVERT), nrm = ringGeo.attributes.normal.array;
      if (nrm[k*3+2] < .2 && Math.random() < .6) continue;
      const loc = new T.Vector3(Pnew[k*3], Pnew[k*3+1], Pnew[k*3+2]), r = .17;
      for (let q = 0; q < NVERT; q++){ const dx = Pnew[q*3] - loc.x, dy = Pnew[q*3+1] - loc.y, dz = Pnew[q*3+2] - loc.z, d2 = dx*dx + dy*dy + dz*dz;
        if (d2 < r * r){ const w = Math.pow(1 - d2 / (r * r), 2) * .035; dent[q*3] -= nrm[q*3] * w; dent[q*3+1] -= nrm[q*3+1] * w; dent[q*3+2] -= nrm[q*3+2] * w; } }
    }
    heatL.fill(0); spLife.fill(9);
    G.rotY = -.62; G.rotX = .12; G.x = heroX; G.y = restY(); camZ = CAM.z * 1.35; look.set(heroX * .12, camera.aspect < .9 ? G.y - 1.05 : -.05, 0);
    hero.classList.remove('ready'); cursorEl.style.opacity = 0; gsap.set('#cool', { autoAlpha: 0 });
    showPrompt('', false); geoDirty = true; enterHero();
  }
  $('#skip').addEventListener('click', e => { e.stopPropagation(); skipToSite(); });
  $('#coolBtn').addEventListener('click', e => { e.stopPropagation(); startCooling(); });

  /* =================== input =================== */
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  function toStage(e){ const r = hero.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  hero.addEventListener('pointermove', e => {
    const p = toStage(e); P.x = p.x; P.y = p.y; P.inside = true; P.last = performance.now(); P.touch = e.pointerType === 'touch';
    if (P.down){ P.moved += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0); if (S.phase === 'hammer' && P.moved > 8) G.yawDrag += (e.movementX || 0) * .006; }
  });
  hero.addEventListener('pointerleave', () => { P.inside = false; });
  hero.addEventListener('pointerdown', e => {
    if (e.target.closest('a,button')) return;
    audio(); if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume();
    const p = toStage(e); P.x = p.x; P.y = p.y; P.down = true; P.moved = 0; P.downX = p.x; P.downY = p.y; P.touch = e.pointerType === 'touch'; P.last = performance.now();
    if (S.phase === 'intro' || S.phase === 'melting' || S.phase === 'melted' || S.phase === 'pouring'){ holding = true; holdStart = performance.now(); }
  });
  const up = () => {
    if (!P.down) return; P.down = false; holding = false;
    if (S.phase === 'hammer' && P.moved < 8) tryStrike(P.downX, P.downY);
  };
  addEventListener('pointerup', up); addEventListener('pointercancel', () => { P.down = false; holding = false; });
  addEventListener('keydown', e => {
    if (!inView || e.target.closest('input,textarea,select,button,a')) return;
    if (e.key === ' ' && !e.repeat && S.phase !== 'hero' && S.phase !== 'hammer' && S.phase !== 'cooling'){ e.preventDefault(); audio(); holding = true; }
    if ((e.key === 'Enter' || e.key === ' ') && S.phase === 'hammer' && !e.repeat){ e.preventDefault(); strikeRandom(); }
    if (e.key === 'Escape') skipToSite();
  });
  addEventListener('keyup', e => { if (e.key === ' ') holding = false; });

  function tryStrike(x, y){
    ndc.set(x / vw * 2 - 1, -(y / vh) * 2 + 1); ray.setFromCamera(ndc, camera);
    ringGeo.computeBoundingSphere();
    const hit = ray.intersectObject(ring, false)[0];
    if (!hit){ showPrompt('Aim for the ring', true); gsap.delayedCall(1.2, () => S.phase === 'hammer' && showPrompt(`Click the ring to hammer it · ${S.strikes} / ${NEED}`)); return; }
    const local = ring.worldToLocal(hit.point.clone());
    const n = hit.face.normal.clone().transformDirection(ring.matrixWorld);
    strikeAt(local, hit.point, n);
  }
  function strikeRandom(){
    // keyboard: strike a point on the front of the band
    const v = new T.Vector3(); camera.getWorldPosition(v);
    for (let tries = 0; tries < 40; tries++){
      const k = Math.floor(Math.random() * NVERT);
      const p = ring.localToWorld(new T.Vector3(posAttr.array[k*3], posAttr.array[k*3+1], posAttr.array[k*3+2]));
      const sp = p.clone().project(camera);
      tryStrike((sp.x + 1) / 2 * vw, (1 - sp.y) / 2 * vh); return;
    }
  }

  /* =================== per-frame geometry =================== */
  const ease = t => t * t * (3 - 2 * t);
  function rebuild(t){
    const pos = posAttr.array, H = heatAttr.array;
    const m = S.melt, f = S.form;
    const wob = S.phase === 'melted' || S.phase === 'pouring' || (S.phase === 'melting' && m > .3);
    for (let k = 0; k < NVERT; k++){
      const i3 = k * 3;
      let x, y, z, heat = S.heat;
      if (f <= 0){
        const mi = ease(Math.min(1, Math.max(0, m * 1.6 - ((yOld[k] + 1) / 2) * .6 - vNoise[k] * .05)));
        let dx = Pdrop[i3], dy = Pdrop[i3+1], dz = Pdrop[i3+2];
        if (wob){ const wv = .025 * Math.sin(t * 3.1 + vNoise[k] * 2 + dy * 9) + .015 * Math.sin(t * 5.3 + dx * 11); dx += dx * wv * 2; dy += (dy + .5) * wv * 2; dz += dz * wv * 2; }
        x = Pold[i3] + (dx - Pold[i3]) * mi; y = Pold[i3+1] + (dy - Pold[i3+1]) * mi; z = Pold[i3+2] + (dz - Pold[i3+2]) * mi;
        heat = S.heat * (.85 + .3 * mi);
      } else {
        const fi = ease(Math.min(1, Math.max(0, f * 1.45 - ((yNew[k] + 1.1) / 2.2) * .45 - vNoise[k] * .06)));
        const shrink = Math.sqrt(Math.max(0, 1 - f * .85));
        let dx = Pdrop[i3] * shrink, dy = -.5 + (Pdrop[i3+1] + .5) * shrink - (1 - shrink) * .48, dz = Pdrop[i3+2] * shrink;
        if (fi < 1 && wob){ const wv = .02 * Math.sin(t * 3.4 + vNoise[k] * 3); dx *= 1 + wv; dz *= 1 + wv; }
        x = dx + (Pnew[i3] + dent[i3] - dx) * fi; y = dy + (Pnew[i3+1] + dent[i3+1] - dy) * fi; z = dz + (Pnew[i3+2] + dent[i3+2] - dz) * fi;
        heat = S.heat + (fi > 0 && fi < 1 ? .35 : 0) + heatL[k];
      }
      pos[i3] = x; pos[i3+1] = y; pos[i3+2] = z; H[k] = heat;
    }
    posAttr.needsUpdate = true; heatAttr.needsUpdate = true; ringGeo.computeVertexNormals();
  }
  let geoDirty = true;

  /* =================== loop =================== */
  let lettersLive = false, prev = performance.now(), crackleT = 0;
  const lampTarget = new T.Vector3(), camShake = new T.Vector3(), look = new T.Vector3(0, .2, 0), lookT = new T.Vector3();
  let camZ = 8.2;
  function frame(now){
    if (!inView){ running = false; if (A.ctx) A.roar.gain.setTargetAtTime(0, A.ctx.currentTime, .05); return; }
    const t = now / 1000, dt = Math.min(.05, (now - prev) / 1000); prev = now;
    api.phase = S.phase;

    // --- story logic driven by holding ---
    if (S.phase === 'intro' && holding){ S.phase = 'melting'; showPrompt('Keep holding', true); }
    if (S.phase === 'melting'){
      if (holding){ S.heat = Math.min(1, S.heat + dt * .42); if (S.heat > .5) S.melt = Math.min(1, S.melt + dt * .38); }
      else { S.heat = Math.max(S.melt > 0 ? .55 : 0, S.heat - dt * .18); if (S.heat === 0){ S.phase = 'intro'; showPrompt('Press and hold to melt it'); } }
      showTemp(); geoDirty = true;
      if (S.melt >= 1){ S.phase = 'melted'; holding = false; say(sub, '<span>Melted down at 1,064 °C.</span><span>Still 3.2 g.</span>'); showPrompt('Hold again to pour it'); }
    }
    if (S.phase === 'melted'){ geoDirty = true; if (holding){ S.phase = 'pouring'; showPrompt('Pouring', true); } }
    if (S.phase === 'pouring'){
      if (holding) S.form = Math.min(1, S.form + dt * .42);
      geoDirty = true;
      if (S.form >= 1){
        S.phase = 'hammer'; holding = false; S.heat = .5;
        say(sub, '<span>Now it is yours to shape.</span><span>Drag to turn it.</span>');
        showPrompt(P.touch ? `Tap the ring to hammer it · 0 / ${NEED}` : `Click the ring to hammer it · 0 / ${NEED}`);
      }
    }
    if (S.phase === 'hammer'){ S.heat = Math.max(.42, S.heat - dt * .02); }
    if (S.phase === 'hammer' || S.phase === 'cooling'){ for (let k = 0; k < NVERT; k++) if (heatL[k] > 0) heatL[k] = Math.max(0, heatL[k] - dt * .5); geoDirty = true; }
    if (S.phase === 'intro' && S.melt === 0 && S.heat > 0){ S.heat = Math.max(0, S.heat - dt * .2); geoDirty = true; }

    if (S.phase !== 'hero' && S.phase !== 'intro') showTemp();
    // --- sparks from molten metal ---
    if ((S.phase === 'melting' && S.heat > .6) || S.phase === 'melted' || (S.phase === 'pouring' && holding)){
      const rate = S.phase === 'pouring' ? 3 : 2;
      for (let i = 0; i < rate; i++){ const p = ring.localToWorld(new T.Vector3((Math.random() - .5) * .8, -.5 + (Math.random() - .3) * .5, (Math.random() - .5) * .6));
        emit(p.x, p.y, p.z, (Math.random() - .5) * 2.2, 1.5 + Math.random() * 3.8, (Math.random() - .5) * 2.2, .5 + Math.random() * .9); }
    }
    stepSparks(dt);

    // --- sound follows heat ---
    if (A.ctx && A.on){
      const roarT = S.phase === 'hero' ? 0 : S.heat * (holding ? .32 : .18);
      A.roar.gain.setTargetAtTime(roarT, A.ctx.currentTime, .15); A.bp.frequency.setTargetAtTime(220 + S.heat * 380, A.ctx.currentTime, .2);
      crackleT -= dt; if (S.heat > .35 && crackleT < 0 && S.phase !== 'hero'){ sfx.crackle(); crackleT = .03 + Math.random() * (.35 - S.heat * .25); }
    }

    // --- ring pose ---
    if (S.phase === 'intro' || S.phase === 'melting'){ G.rotY += dt * G.spin * (1 - S.melt); }
    if (S.phase === 'hammer'){ G.rotY += (G.yawDrag) * .2; G.yawDrag *= .8; }
    const bob = (S.phase === 'hero' || S.phase === 'cooling') ? 0 : Math.sin(t * .9) * .04;
    ringGroup.position.set(G.x, G.y + bob, 0); ringGroup.rotation.set(G.rotX, G.rotY, 0);
    halo.material.opacity = Math.min(.2, S.heat * .2); halo.position.set(0, S.form > 0 || S.melt > .5 ? -.25 : 0, .2);
    halo.material.rotation = t * .1;
    if (geoDirty){ rebuild(t); geoDirty = S.phase === 'melted' || S.phase === 'pouring' || S.phase === 'melting'; }
    gold.roughness = S.melt > 0 && S.phase !== 'hero' ? .16 + (1 - S.heat) * .1 : S.rough;

    // --- lights ---
    const rp = ring.getWorldPosition(new T.Vector3());
    fire.position.set(rp.x, rp.y - .2, rp.z + .8); fire.intensity = Math.pow(S.heat, 1.4) * 3.2;
    sun.intensity = S.sun; sun.target.position.copy(rp);
    beamMat.uniforms.uI.value = .35 + (S.sun - 1.2) * .45; beamMat.uniforms.uT.value = t; dustMat.uniforms.uT.value = t; dustMat.uniforms.uI.value = beamMat.uniforms.uI.value;
    // lamp: cursor in 3D, a little in front of the ring; drifts by itself when idle
    if (P.inside && now - P.last < 3000){
      ndc.set(P.x / vw * 2 - 1, -(P.y / vh) * 2 + 1); ray.setFromCamera(ndc, camera);
      const tz = (1.4 - ray.ray.origin.z) / ray.ray.direction.z; lampTarget.copy(ray.ray.origin).addScaledVector(ray.ray.direction, tz);
    } else lampTarget.set(rp.x + Math.cos(t * .5) * 1.4, rp.y + .3 + Math.sin(t * .7) * .8, 1.4);
    lamp.position.lerp(lampTarget, .1); lamp.intensity = S.lampI * 3.2;

    // --- camera ---
    const sx = (P.inside ? (P.x / vw - .5) : 0), sy = (P.inside ? (P.y / vh - .5) : 0);
    hold.shakeX += (sx - hold.shakeX) * .04; hold.shakeY += (sy - hold.shakeY) * .04;
    camShake.set((Math.random() - .5) * S.shake, (Math.random() - .5) * S.shake, 0);
    const settled = S.phase === 'hero' || S.phase === 'cooling';
    const tall = camera.aspect < .9;
    lookT.set(settled ? rp.x * .12 : rp.x * .8 - storyShift, settled ? (tall ? rp.y - 1.05 : -.05) : (tall ? rp.y - .9 : rp.y - .45), 0); look.lerp(lookT, .04);
    camZ += ((settled ? CAM.z * 1.35 : CAM.z - (S.phase === 'hammer' ? 1.3 : 0)) - camZ) * .03;
    camera.position.set(look.x + hold.shakeX * -.45 + camShake.x, CAM.y + hold.shakeY * .25 + camShake.y + (settled ? -.1 : 0), camZ);
    camera.lookAt(look);
    scene.fog.near = camZ + 1; scene.fog.far = camZ + 11;
    finalPass.uniforms.uT.value = t; finalPass.uniforms.uAb.value = S.flash * 1.4 + S.shake * 8;
    bloom.strength = .5 + S.heat * .45 + S.flash * .8;

    // --- cursor ring ---
    if (!P.touch && (S.phase === 'intro' || S.phase === 'melting' || S.phase === 'melted' || S.phase === 'pouring' || S.phase === 'hammer')){
      cursorEl.style.opacity = P.inside ? 1 : 0; cursorEl.style.transform = `translate(${P.x}px, ${P.y}px) scale(${P.down ? .85 : 1})`;
      const prog = S.phase === 'melting' || S.phase === 'intro' ? S.melt * .7 + Math.min(1, S.heat / .5) * .3 : S.phase === 'pouring' || S.phase === 'melted' ? S.form : 0;
      cfill.setAttribute('stroke-dashoffset', (1 - prog).toFixed(3));
    }

    // --- the menu assembles with the work: one item per milestone, rules fill like a progress line ---
    if (S.phase !== 'hero'){
      const prog = Math.min(1, .3 * S.melt + .3 * S.form + .4 * Math.min(1, S.strikes / NEED));
      gsap.set(topRules, { scaleX: prog });
      const marks = [S.melt >= 1, S.form >= 1, S.strikes >= 2, S.strikes >= 4, S.strikes >= 6];
      navLinks.forEach((n, i) => { n.target = marks[i] ? .38 : 0; });
    } else navLinks.forEach((n, i) => { n.target = now - heroAt > 1500 + i * 110 ? 1 : n.target; });
    for (const n of navLinks){
      if (n.target === undefined) continue;
      n.p += (n.target - n.p) * (1 - Math.exp(-dt * 5));
      if (Math.abs(n.p - n.shown) > .003){ n.shown = n.p; const k = n.p;
        const done = k > .995, st = n.el.style;
        st.opacity = done ? '' : k.toFixed(3);
        st.transform = done ? '' : `translateY(${((1 - k) * -10).toFixed(1)}px) scale(${(.7 + .3 * k).toFixed(3)})`;
        st.filter = done ? '' : `blur(${((1 - k) * 5).toFixed(1)}px)`;
        st.letterSpacing = done ? '' : `${(-.04 + (1 - k) * .25).toFixed(3)}em`; }
    }

    composer.render(dt);

    // letters warm near the cursor and cool slowly, like metal
    if (lettersLive){
      const near = P.inside && now - P.last < 3000;
      const lx = P.x, ly = P.y;
      for (const l of letters){
        const dx = lx - l.x, dy = ly - l.y, tgt = near ? Math.exp(-(dx * dx + dy * dy) / (2 * heatR * heatR)) : 0;
        l.h += (tgt - l.h) * (tgt > l.h ? .18 : .025);
        if (Math.abs(l.h - l.shown) > .004){ l.shown = l.h; l.el.style.setProperty('--h', l.h.toFixed(3)); }
      }
    }
    requestAnimationFrame(frame);
  }
  function start(){ if (running || !inView) return; running = true; prev = performance.now(); requestAnimationFrame(frame); }

  /* pause the whole scene when it is off screen; finish the piece if the visitor scrolls on mid-way */
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (inView) start(); }, { threshold: 0.02 }).observe(hero);
  addEventListener('scroll', () => {
    if (scrollY > innerHeight * .45 && S.phase !== 'hero' && S.phase !== 'cooling') skipToSite();
  }, { passive: true });
  api.skip = () => skipToSite();
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  resize();
  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
  Promise.race([fonts, new Promise(r => setTimeout(r, 2500))]).then(() => {
    measureLetters();
    gsap.set(G, { x: 0, y: .38 });
    enterIntro();
    if (reduce) skipToSite();
    start();
    requestAnimationFrame(() => requestAnimationFrame(ready));
  });
})();
