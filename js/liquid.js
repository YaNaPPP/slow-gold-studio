/* Chapter 01 opener: a slow, dark surface of liquid gold. One fragment shader, drawn at reduced
   resolution and only while it is on screen. The cursor leaves a soft ripple. */
window.SGLiquid = function (canvas) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const vs = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }';
  const fs = `precision highp float;
uniform vec2 uRes; uniform float uT; uniform vec2 uM; uniform float uMs;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0., a = .5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6); for (int i = 0; i < 4; i++){ s += a * noise(p); p = m * p; a *= .5; } return s; }
float H(vec2 p){
  float t = uT * .06;
  vec2 q = vec2(fbm(p + vec2(0., t)), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + 2.6 * q + vec2(1.7, 9.2) + t * .7), fbm(p + 2.6 * q + vec2(8.3, 2.8) - t * .6));
  float h = fbm(p + 2.2 * r);
  float d = length(p - uM);
  h += uMs * .035 * sin(d * 26. - uT * 3.2) * exp(-d * 3.5);
  return h;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = gl_FragCoord.xy / uRes.y * 1.7;
  float e = 1.6 / uRes.y;
  float h = H(p), hx = H(p + vec2(e, 0.)), hy = H(p + vec2(0., e));
  vec3 n = normalize(vec3(-(hx - h) / e * .05, -(hy - h) / e * .05, 1.));
  vec3 R = reflect(vec3(0., 0., -1.), n);
  float key = pow(max(dot(R, normalize(vec3(.55, .6, .58))), 0.), 7.);
  float fill = pow(max(dot(R, normalize(vec3(-.7, .2, .7))), 0.), 4.);
  float streak = smoothstep(.1, 0., abs(R.y - .32)) * .6;
  vec3 gold = vec3(1., .74, .36);
  vec3 col = gold * (.035 + 1.7 * key + .35 * fill + streak * .5) + vec3(1., .93, .8) * pow(key, 3.) * .9;
  col *= .55 + .45 * smoothstep(.15, .75, h);
  float vig = smoothstep(1.25, .25, length((uv - vec2(.62, .45)) * vec2(1.25, 1.)));
  col *= .25 + .75 * vig;
  col = 1. - exp(-col * 1.1);
  gl_FragColor = vec4(pow(col, vec3(1. / 1.1)), 1.);
}`;
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; } return s; };
  const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return null;
  const pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
  gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ['uRes', 'uT', 'uM', 'uMs'].forEach(n => U[n] = gl.getUniformLocation(pr, n));

  const S = { visible: false, raf: 0, scale: .5, w: 1, h: 1, m: [2, .6], mt: [2, .6], ms: 0, mst: 0 };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function size() {
    const r = canvas.getBoundingClientRect(); S.w = r.width; S.h = r.height;
    const k = Math.min(1, (devicePixelRatio || 1)) * (r.width > 1400 ? .45 : .55);
    canvas.width = Math.max(2, Math.round(r.width * k)); canvas.height = Math.max(2, Math.round(r.height * k));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  function draw(t) {
    S.m[0] += (S.mt[0] - S.m[0]) * .06; S.m[1] += (S.mt[1] - S.m[1]) * .06; S.ms += (S.mst - S.ms) * .04;
    gl.uniform2f(U.uRes, canvas.width, canvas.height); gl.uniform1f(U.uT, t);
    gl.uniform2f(U.uM, S.m[0], S.m[1]); gl.uniform1f(U.uMs, S.ms);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function loop(now) { S.raf = 0; if (!S.visible) return; draw(now / 1000); if (!reduce) S.raf = requestAnimationFrame(loop); }
  new IntersectionObserver(([e]) => { S.visible = e.isIntersecting; if (S.visible && !S.raf) S.raf = requestAnimationFrame(loop); }).observe(canvas);
  canvas.parentElement.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    S.mt = [(e.clientX - r.left) / r.height * 1.7, (r.bottom - e.clientY) / r.height * 1.7]; S.mst = 1;
  });
  canvas.parentElement.addEventListener('pointerleave', () => { S.mst = 0; });
  addEventListener('resize', size); size();
  return { size };
};
