/* Chapter II: three old pieces (a wedding band, a broken chain, a single earring) melt, run together and
   are formed into one hammered band. Drawn with signed distance fields in one small WebGL shader, so it stays
   sharp at any size and costs almost nothing. Progress 0..1 comes from scroll; it only redraws when needed. */
window.SGMelt = function (canvas) {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'high-performance' });
  if (!gl) return null;

  const vs = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }';
  const fs = `precision highp float;
uniform vec2 uRes; uniform float uP, uT, uS, uPx;
uniform vec2 uC0, uC1, uC2, uCm;
float st(float a, float b, float x){ return smoothstep(a, b, x); }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float smin(float a, float b, float k){ float h = max(k - abs(a - b), 0.) / k; return min(a, b) - h * h * k * .25; }
float seg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h); }
vec2 hash2(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
vec3 blackbody(float t){ t = clamp(t, 0., 1.);
  vec3 c = mix(vec3(.25, .01, 0.), vec3(1., .14, .01), st(0., .3, t));
  c = mix(c, vec3(1., .48, .08), st(.28, .62, t));
  return mix(c, vec3(1., .9, .66), st(.62, 1., t)); }

/* the three old pieces, in their own units (1 = canvas height at scale 1) */
float band(vec2 q){ q.y *= 1.22; return (abs(length(q) - .135) - .017) / 1.1; }
float link(vec2 q, vec2 c, float a, float open){
  vec2 p = rot(a) * (q - c);
  return open > .5 ? abs(seg(p, vec2(-.02, 0.), vec2(.02, 0.)) - .026) - .0085
                   : seg(p, vec2(-.042, 0.), vec2(.042, 0.)) - .0105;
}
float chain(vec2 q){
  float d = link(q, vec2(-.13, .03), .08, 1.);
  d = min(d, link(q, vec2(-.068, .035), .02, 0.));
  d = min(d, link(q, vec2(-.006, .03), -.06, 1.));
  /* broken here: the last two links hang down */
  d = min(d, link(q, vec2(.068, -.035), -1.0, 1.));
  d = min(d, link(q, vec2(.094, -.105), -1.32, 0.));
  return d;
}
float earring(vec2 q){
  float hook = abs(length(q - vec2(.012, .1)) - .03) - .006;
  hook = max(hook, -(q.x - .012));
  float hoop = abs(length(q - vec2(0., .04)) - .036) - .0085;
  float drop = smin(length(q - vec2(0., -.05)) - .034, seg(q, vec2(0., -.05), vec2(0., .004)) - .006, .045);
  return min(hook, smin(hoop, drop, .012));
}

float scene(vec2 p){
  float P = uP;
  float hot = st(.17, .38, P) * (1. - st(.6, .86, P));
  p += vec2(sin(p.y * 46. + uT * 3.1), cos(p.x * 40. - uT * 2.7)) * .0022 * hot * uS;
  float m0 = st(.17, .38, P), m1 = st(.21, .42, P), m2 = st(.25, .45, P);
  float g = st(.34, .56, P);
  float join = st(.5, .62, P);
  float f = st(.6, .84, P);
  /* where each droplet travels: towards the middle, then into one */
  float spread = (1. - join) * .09;
  vec2 c0 = mix(uC0, uCm + vec2(-spread, .0), g);
  vec2 c1 = mix(uC1, uCm + vec2(spread, .012), g);
  vec2 c2 = mix(uC2, uCm + vec2(0., -spread * .7), g);
  vec2 q0 = (p - c0) / uS, q1 = (p - c1) / uS, q2 = (p - c2) / uS;
  float sag0 = .03 * m0, sag1 = .035 * m1, sag2 = .02 * m2;
  float d0 = mix(band(q0), length(q0 + vec2(0., sag0)) - .085, m0 * m0 * (3. - 2. * m0));
  float d1 = mix(chain(q1), length(q1 + vec2(0., sag1)) - .081, m1 * m1 * (3. - 2. * m1));
  float d2 = mix(earring(q2), length(q2 + vec2(0., sag2)) - .062, m2 * m2 * (3. - 2. * m2));
  float k = mix(.002, .08, st(.4, .58, P));
  float blob = smin(smin(d0, d1, k), d2, k);
  vec2 qm = (p - uCm) / uS;
  blob = mix(blob, length(qm + vec2(0., .01)) - .125, join);
  /* the new piece: a wide band with a hand-formed, uneven edge */
  float a = atan(qm.y, qm.x);
  vec2 qe = qm * vec2(1., 1.1);
  float r = .19 + .006 * sin(3. * a + 1.) + .004 * sin(7. * a + .4);
  float th = .046 + .007 * sin(4. * a + 2.) + .004 * sin(9. * a);
  float fin = abs(length(qe) - r) - th;
  float d = mix(blob, fin, f * f * (3. - 2. * f));
  return d * uS;
}

float height(vec2 p, out float d){
  d = scene(p);
  float bev = .024 * uS;
  float x = clamp(-d / bev, 0., 1.);
  float h = sqrt(1. - (1. - x) * (1. - x));
  float dm = st(.74, .97, uP);
  if (dm > 0.){
    vec2 q = (p - uCm) / uS * 30.;
    vec2 i = floor(q), fq = fract(q); float md = 1.;
    for (int y = -1; y <= 1; y++) for (int xx = -1; xx <= 1; xx++){
      vec2 o = vec2(float(xx), float(y)); vec2 rr = o + hash2(i + o) - fq; md = min(md, dot(rr, rr)); }
    h -= dm * .16 * (1. - smoothstep(0., .4, md)) * x;
  }
  return h;
}

void main(){
  vec2 p = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  float d, dx, dy;
  float e = uPx;
  float h = height(p, d);
  if (d > .09 * uS){ gl_FragColor = vec4(0.); return; }
  float hx = height(p + vec2(e, 0.), dx);
  float hy = height(p + vec2(0., e), dy);
  float s = .024 * uS;
  vec3 n = normalize(vec3(-(hx - h) / e * s, -(hy - h) / e * s, 1.));
  vec3 R = reflect(vec3(0., 0., -1.), n);
  float key = pow(max(dot(R, normalize(vec3(-.5, .62, .6))), 0.), 16.);
  float rim = pow(max(dot(R, normalize(vec3(.66, -.32, .68))), 0.), 9.);
  float sky = st(-.35, 1., R.y);
  float env = .08 + .55 * sky + 2.4 * key + .9 * rim + .4 * st(.03, 0., abs(R.y - .12));
  vec3 gold = vec3(1., .74, .36);
  vec3 col = gold * env + vec3(1., .95, .84) * key * .7;
  col += gold * pow(1. - n.z, 3.) * .35;
  float hot = st(.17, .38, uP) * (1. - st(.6, .86, uP));
  vec3 bb = blackbody(hot * (.8 + .3 * h));
  col = mix(col, bb * (1.25 + .5 * h), hot * .9);
  col = 1. - exp(-col * 1.15);
  float aa = smoothstep(uPx * 1.2, -uPx * 1.2, d);
  float glow = exp(-max(d, 0.) / (.035 * uS)) * hot * .6;
  vec3 g = blackbody(.5 + .2 * hot) * glow;
  gl_FragColor = vec4(col * aa + g * (1. - aa), max(aa, glow * (1. - aa)));
}`;
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; } return s; };
  const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return null;
  const pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
  gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ['uRes', 'uP', 'uT', 'uS', 'uPx', 'uC0', 'uC1', 'uC2', 'uCm'].forEach(n => U[n] = gl.getUniformLocation(pr, n));
  gl.clearColor(0, 0, 0, 0);

  const st = { p: 0, w: 1, h: 1, dpr: 1, c: [[0, 0], [0, 0], [0, 0], [0, 0]], s: 1, dirty: true, raf: 0, visible: false };

  function layout() {
    const r = canvas.getBoundingClientRect();
    st.w = Math.max(1, r.width); st.h = Math.max(1, r.height);
    st.dpr = Math.min(1.75, devicePixelRatio || 1);
    canvas.width = Math.round(st.w * st.dpr); canvas.height = Math.round(st.h * st.dpr);
    const a = st.w / st.h;
    if (a >= 1.05 && st.w > 900) {
      /* text on the left, pieces on the right */
      const left = -a / 2 + Math.min(.36 * a, 600 / st.h), xc = (left + a / 2) / 2 + .02;
      const sp = Math.min(.42, (a / 2 - left) / 3.3);
      st.s = Math.min(1.15, sp / .38);
      st.c = [[xc - sp, .07], [xc, .08], [xc + sp, .06], [xc, .06]];
    } else {
      /* phones and narrow windows: pieces in the upper half, text below */
      st.s = Math.min(.95, a * .92);
      const y = .25, half = a / 2;
      st.c = [[-(half - .17 * st.s - .02), y], [half - .15 * st.s - .03, y + .01], [0, y - .3 * st.s], [0, y - .1 * st.s]];
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    st.dirty = true; kick();
  }
  function draw(t) {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uP, st.p); gl.uniform1f(U.uT, t); gl.uniform1f(U.uS, st.s);
    gl.uniform1f(U.uPx, 1 / canvas.height);
    gl.uniform2f(U.uC0, st.c[0][0], st.c[0][1]); gl.uniform2f(U.uC1, st.c[1][0], st.c[1][1]);
    gl.uniform2f(U.uC2, st.c[2][0], st.c[2][1]); gl.uniform2f(U.uCm, st.c[3][0], st.c[3][1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  const isHot = () => st.p > .17 && st.p < .86;
  function loop(now) {
    st.raf = 0;
    if (!st.visible) return;
    draw(now / 1000); st.dirty = false;
    if (isHot()) st.raf = requestAnimationFrame(loop); /* molten metal moves on its own */
  }
  function kick() { if (!st.raf && st.visible) st.raf = requestAnimationFrame(loop); }

  new IntersectionObserver(([e]) => { st.visible = e.isIntersecting; if (st.visible) kick(); }).observe(canvas);
  addEventListener('resize', () => layout());
  layout();

  return {
    set progress(v) { if (Math.abs(v - st.p) > 1e-4) { st.p = v; kick(); } },
    get progress() { return st.p; },
    /* item centres in CSS pixels, for the labels */
    points() { return st.c.map(([x, y]) => ({ x: st.w / 2 + x * st.h, y: st.h / 2 - y * st.h, s: st.s * st.h })); },
    layout
  };
};
