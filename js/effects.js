/* =====================================================================
 * bienac — engine hiệu ứng nền WebGL
 * 4 hiệu ứng chính: aurora (cực quang), waves (sóng biển),
 *                   nebula (tinh vân), fireflies (đom đóm ánh sáng)
 * 4 hiện tượng vật lý (chọn qua bong bóng FAB): arc (hồ quang điện),
 *   lightning (sấm sét), polarized (tia phân cực), interference (giao thoa)
 * ===================================================================== */
(function () {
  'use strict';

  const VERTEX_SRC = `
    attribute vec2 a_pos;
    void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
  `;

  // Hàm noise dùng chung cho mọi shader
  const GLSL_COMMON = `
    precision highp float;
    uniform float u_time;
    uniform vec2  u_resolution;
    uniform vec2  u_mouse;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = p * 2.03 + vec2(13.7, 7.1);
        a *= 0.5;
      }
      return v;
    }
    float stars(vec2 frag, float density, float speed) {
      vec2 cell = floor(frag / 2.0);
      float h = hash(cell);
      float twinkle = 0.5 + 0.5 * sin(u_time * speed + h * 60.0);
      return step(density, h) * twinkle;
    }
  `;

  /* ------------------------------------------------ CỰC QUANG ----- */
  const FRAG_AURORA = GLSL_COMMON + `
    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      vec2 p  = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
      p.x += (u_mouse.x - 0.5) * 0.15;

      // Bầu trời đêm
      vec3 col = mix(vec3(0.010, 0.011, 0.016), vec3(0.014, 0.030, 0.036), uv.y);

      // Sao lấp lánh
      col += vec3(1.0, 0.95, 0.84) * stars(gl_FragCoord.xy, 0.997, 2.0) * 0.7 * smoothstep(0.15, 0.8, uv.y);

      // Ba dải cực quang
      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float t  = u_time * (0.10 + fi * 0.025);
        float wav = fbm(vec2(p.x * 1.4 + fi * 7.3 + t, t * 0.6));
        float y   = uv.y - 0.34 - fi * 0.10 - wav * 0.42;
        float band = exp(-abs(y) * (5.2 - wav * 2.5));
        float rays = 0.55 + 0.45 * fbm(vec2(p.x * 7.0 + t * 3.0, uv.y * 2.2 - t));
        vec3 tint = mix(vec3(0.16, 0.95, 0.66), vec3(0.06, 0.62, 0.58), wav);
        tint = mix(tint, vec3(0.86, 0.30, 0.20), fi * 0.30);   // dải trên đỏ son (oxy)
        col += tint * band * rays * 0.52;
      }

      // Ánh phản chiếu nhẹ phía chân trời
      col += vec3(0.20, 0.16, 0.07) * exp(-uv.y * 6.0) * 0.35;
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  /* ------------------------------------------------ SÓNG BIỂN ----- */
  const FRAG_WAVES = GLSL_COMMON + `
    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      vec2 p  = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
      p.x += (u_mouse.x - 0.5) * 0.2;

      // Đại dương về đêm
      vec3 col = mix(vec3(0.006, 0.012, 0.016), vec3(0.012, 0.034, 0.042), uv.y);
      col += vec3(0.9, 0.95, 1.0) * stars(gl_FragCoord.xy, 0.9975, 1.5) * 0.5 * smoothstep(0.5, 0.95, uv.y);

      // Vầng trăng mờ
      float moon = length(p - vec2(0.75, 0.55));
      col += vec3(0.95, 0.82, 0.55) * exp(-moon * 5.5) * 0.25;

      // Các lớp sóng phát sáng
      for (int i = 0; i < 7; i++) {
        float fi = float(i);
        float t  = u_time * (0.35 + fi * 0.07);
        float yy = -0.75 + fi * 0.17;
        float w  = sin(p.x * 2.1 + t + fi * 1.7) * 0.10
                 + sin(p.x * 4.6 - t * 1.25 + fi * 0.8) * 0.05
                 + (fbm(vec2(p.x * 1.6 + fi * 4.0, t * 0.35)) - 0.5) * 0.22;
        float d = abs(p.y - yy - w);
        float glow = 0.014 / (d + 0.014);
        glow *= glow;
        vec3 wc = mix(vec3(0.20, 0.94, 0.80), vec3(0.62, 0.50, 0.24), fi / 6.0);
        col += wc * glow * (0.35 + 0.18 * sin(fi * 2.0 + u_time * 0.4));
      }
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  /* ------------------------------------------------- TINH VÂN ----- */
  const FRAG_NEBULA = GLSL_COMMON + `
    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      vec2 p  = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
      p += (u_mouse - 0.5) * 0.12;
      float t = u_time * 0.045;

      // Domain warping tạo mây tinh vân
      vec2 q = vec2(fbm(p * 1.1 + t), fbm(p * 1.1 + vec2(5.2, 1.3) - t));
      vec2 r = vec2(fbm(p * 1.1 + 3.5 * q + vec2(1.7, 9.2) + t * 0.7),
                    fbm(p * 1.1 + 3.5 * q + vec2(8.3, 2.8) - t * 0.5));
      float f = fbm(p * 1.1 + 3.5 * r);

      vec3 col = mix(vec3(0.010, 0.010, 0.016), vec3(0.04, 0.16, 0.17), clamp(f * f * 1.6, 0.0, 1.0));
      col = mix(col, vec3(0.16, 0.86, 0.74), clamp(q.y * q.y * 0.85, 0.0, 1.0) * f);
      col = mix(col, vec3(0.80, 0.26, 0.16), clamp(r.x * 0.7, 0.0, 1.0) * f * 0.55);
      col += vec3(1.0, 0.86, 0.55) * pow(f, 5.0) * 0.6;

      // Trường sao hai lớp
      col += vec3(0.9, 0.95, 1.0) * stars(gl_FragCoord.xy, 0.9965, 1.8) * 0.8;
      col += vec3(0.7, 0.85, 1.0) * stars(gl_FragCoord.xy + 37.0, 0.998, 0.9) * 1.0;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  /* -------------------------------------------------- ĐOM ĐÓM ----- */
  const FRAG_FIREFLIES = GLSL_COMMON + `
    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      float aspect = u_resolution.x / u_resolution.y;
      vec2 p = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;

      // Khu rừng đêm: gradient + sương mù chuyển động
      vec3 col = mix(vec3(0.006, 0.010, 0.012), vec3(0.012, 0.030, 0.034), uv.y);
      float mist = fbm(vec2(p.x * 1.2 + u_time * 0.05, p.y * 1.5 - u_time * 0.02));
      col += vec3(0.04, 0.09, 0.08) * mist * 0.5;

      // Đàn đom đóm trôi lơ lửng
      for (int i = 0; i < 48; i++) {
        float fi = float(i);
        float h1 = hash(vec2(fi, 1.0));
        float h2 = hash(vec2(fi, 2.0));
        float h3 = hash(vec2(fi, 3.0));
        float spd = 0.018 + h3 * 0.05;
        vec2 pos = vec2(
          (fract(h1 + u_time * spd) * 2.4 - 1.2) * aspect,
          fract(h2 + u_time * spd * 0.6) * 2.4 - 1.2
        );
        pos += vec2(sin(u_time * (0.6 + h3) + fi * 2.1),
                    cos(u_time * (0.4 + h2) + fi * 1.3)) * 0.06;
        pos += (u_mouse - 0.5) * 0.1 * (0.3 + h3);

        float d = length(p - pos);
        float blink = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(u_time * (1.0 + h1 * 2.0) + fi * 7.0), 3.0);
        vec3 fc = mix(vec3(0.20, 0.96, 0.80), vec3(0.95, 0.74, 0.36), h3);
        col += fc * exp(-d * d * (1400.0 - h2 * 800.0)) * blink;      // lõi sáng
        col += fc * exp(-d * 7.0) * 0.035 * blink;                     // quầng sáng
      }
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  /* ------------------------------------------- HỒ QUANG ĐIỆN ------ */
  const FRAG_ARC = GLSL_COMMON + `
    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      vec2 p  = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
      p.x += (u_mouse.x - 0.5) * 0.08;

      vec3 col = mix(vec3(0.008, 0.008, 0.025), vec3(0.025, 0.02, 0.06), uv.y);

      // Khói plasma bốc lên phía trên hồ quang
      float smoke = fbm(vec2(p.x * 1.8, p.y * 1.4 - u_time * 0.12));
      col += vec3(0.10, 0.08, 0.22) * smoke * smoothstep(-0.3, 0.6, p.y) * 0.35;

      vec2 A = vec2(-0.55, -0.28), B = vec2(0.55, -0.28);
      float flickAll = 0.75 + 0.25 * noise(vec2(u_time * 22.0, 1.0));

      // Ba sợi hồ quang nhiễu loạn chồng lên nhau
      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float s = clamp((p.x - A.x) / (B.x - A.x), 0.0, 1.0);
        float env = sin(s * 3.14159);
        float lift = env * (0.34 + fi * 0.045);
        float jit = (fbm(vec2(s * 6.5 + fi * 19.0, u_time * (5.0 + fi * 2.6))) - 0.5)
                  * 0.40 * (0.25 + env);
        float path = A.y + lift + jit;
        float dx = max(max(A.x - p.x, p.x - B.x), 0.0);
        float d = sqrt(dx * dx + (p.y - path) * (p.y - path));
        float flick = 0.55 + 0.45 * noise(vec2(u_time * (18.0 + fi * 7.0), fi * 13.0));
        float core = 0.0045 / (d + 0.0035);
        vec3 tint = mix(vec3(0.55, 0.65, 1.0), vec3(0.85, 0.55, 1.0), fi * 0.5);
        col += tint * core * flick * (1.0 - fi * 0.25);
        col += vec3(1.0) * core * core * 0.12 * flick;
      }

      // Hai đầu điện cực nóng đỏ
      col += vec3(1.0, 0.55, 0.25) * exp(-length(p - A) * 26.0) * 1.2;
      col += vec3(1.0, 0.55, 0.25) * exp(-length(p - B) * 26.0) * 1.2;

      // Ánh sáng hắt ra toàn cảnh, nhấp nháy theo hồ quang
      col += vec3(0.30, 0.38, 0.85) * exp(-length(p - vec2(0.0, 0.05)) * 1.9) * 0.16 * flickAll;
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  /* ------------------------------------------------- SẤM SÉT ------ */
  const FRAG_LIGHTNING = GLSL_COMMON + `
    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      vec2 p  = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
      p.x += (u_mouse.x - 0.5) * 0.1;

      // Bầu trời giông và mây vần vũ
      vec3 col = mix(vec3(0.012, 0.014, 0.035), vec3(0.045, 0.055, 0.10), uv.y);
      float cl = fbm(vec2(p.x * 1.5 + u_time * 0.05, uv.y * 2.6 + u_time * 0.02));
      col = mix(col, vec3(0.06, 0.07, 0.12), cl * smoothstep(0.35, 1.0, uv.y));

      float boltSum = 0.0, flash = 0.0;
      for (int i = 0; i < 2; i++) {
        float fi = float(i);
        float speed = 0.42 + fi * 0.19;
        float cycle = floor(u_time * speed + fi * 0.5);
        float ft    = fract(u_time * speed + fi * 0.5);
        float seed  = hash(vec2(cycle, fi + 3.0));
        float strike = step(0.30, seed);                     // ~70% chu kỳ có sét
        float x0 = (hash(vec2(cycle, fi + 7.0)) - 0.5) * 1.7;
        float prog = smoothstep(0.0, 0.05, ft);              // sét lao xuống cực nhanh
        float vis = strike * step(ft, 0.20)
                  * (0.55 + 0.45 * noise(vec2(u_time * 55.0, fi * 9.0)));
        float xb = x0 + (fbm(vec2(uv.y * 5.5 + seed * 130.0, cycle * 9.1 + fi * 31.0)) - 0.5)
                 * 0.85 * (1.0 - uv.y);
        float d = abs(p.x - xb);
        float reach = step(1.0 - prog * 1.05, uv.y);
        boltSum += (0.009 / (d + 0.007)) * vis * reach;
        // nhánh sét phụ mảnh hơn
        float xb2 = xb + (fbm(vec2(uv.y * 9.0 + seed * 60.0, cycle * 4.7)) - 0.5) * 0.5 * (1.0 - uv.y);
        boltSum += (0.004 / (abs(p.x - xb2) + 0.006)) * vis * reach * 0.5;
        flash += strike * exp(-ft * 8.0);
      }

      col += vec3(0.78, 0.82, 1.0) * boltSum;
      col += vec3(0.32, 0.36, 0.60) * flash * (0.35 + cl * 0.9);   // mây lóe sáng

      // Mưa rơi chéo
      vec2 rc = vec2(p.x * 46.0 + p.y * 9.0, 0.0);
      float colH = hash(vec2(floor(rc.x), 5.0));
      float ry = fract(uv.y * 2.2 + u_time * (1.1 + colH * 0.9) + colH * 17.0);
      float rain = step(0.965, colH * 0.5 + hash(vec2(floor(rc.x), floor(ry * 3.0))) * 0.5)
                 * smoothstep(0.0, 0.12, ry) * (1.0 - smoothstep(0.5, 1.0, ry));
      col += vec3(0.45, 0.55, 0.75) * rain * 0.10;
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  /* -------------------------------------------- TIA PHÂN CỰC ------ */
  const FRAG_POLARIZED = GLSL_COMMON + `
    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      vec2 p  = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
      p += (u_mouse - 0.5) * 0.1;
      float t = u_time * 0.25;
      float r = length(p);
      float a = atan(p.y, p.x);

      vec3 col = vec3(0.012, 0.010, 0.032);
      col += vec3(0.9, 0.95, 1.0) * stars(gl_FragCoord.xy, 0.998, 1.2) * 0.4;

      // Chùm tia quay theo định luật Malus: I = I0·cos²θ
      float beams = pow(abs(cos(a * 2.0 - t * 1.3)), 8.0)
                  + pow(abs(cos(a * 3.0 + t * 0.9 + 1.3)), 16.0) * 0.7;
      float fan = beams * exp(-r * 1.05);

      // Màu quang phổ lưỡng chiết (như tinh thể dưới kính phân cực)
      float ph = fbm(p * 1.8 + t * 0.15) * 2.6 + r * 2.1 - t * 0.8;
      vec3 spectrum = 0.5 + 0.5 * cos(6.28318 * (ph * 0.35 + vec3(0.0, 0.33, 0.67)));
      col += spectrum * fan * 0.9;

      // Vân giao thoa đồng tâm mờ
      float rings = 0.5 + 0.5 * sin(r * 15.0 - t * 2.4);
      col += spectrum * rings * rings * 0.10 * exp(-r * 0.95);

      // Nguồn sáng trung tâm
      col += vec3(0.92, 0.95, 1.0) * exp(-r * 7.0) * (0.55 + 0.2 * sin(t * 3.2));
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  /* ------------------------------------------ GIAO THOA SÓNG ------ */
  const FRAG_INTERFERENCE = GLSL_COMMON + `
    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      vec2 p  = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
      p += (u_mouse - 0.5) * 0.08;
      float t = u_time;

      vec3 col = mix(vec3(0.008, 0.012, 0.035), vec3(0.012, 0.03, 0.07), uv.y);

      // Hai nguồn sóng dao động nhẹ
      vec2 s1 = vec2(-0.48 + 0.05 * sin(t * 0.4), -0.05 + 0.04 * cos(t * 0.33));
      vec2 s2 = vec2( 0.48 + 0.05 * cos(t * 0.36), -0.05 + 0.04 * sin(t * 0.41));
      float d1 = length(p - s1);
      float d2 = length(p - s2);

      float k = 26.0, w = 2.6;
      float amp = 0.5 * (sin(d1 * k - t * w) / (1.0 + d1 * 2.2)
                       + sin(d2 * k - t * w) / (1.0 + d2 * 2.2));
      float inten = amp * amp * 4.0;        // vân sáng nơi hai sóng cùng pha

      vec3 tint = mix(vec3(0.10, 0.90, 0.85), vec3(0.45, 0.35, 1.0), uv.y);
      col += tint * inten * 0.55;
      col += vec3(1.0) * pow(inten, 3.0) * 0.10;

      // Hai nguồn phát sáng nhấp nhô
      float pulse = 0.7 + 0.3 * sin(t * w);
      col += vec3(0.3, 1.0, 0.9) * exp(-d1 * 9.0) * pulse;
      col += vec3(0.55, 0.45, 1.0) * exp(-d2 * 9.0) * (1.4 - pulse);
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const SHADERS = {
    aurora:       FRAG_AURORA,
    waves:        FRAG_WAVES,
    nebula:       FRAG_NEBULA,
    fireflies:    FRAG_FIREFLIES,
    arc:          FRAG_ARC,
    lightning:    FRAG_LIGHTNING,
    polarized:    FRAG_POLARIZED,
    interference: FRAG_INTERFERENCE,
  };

  class FXEngine {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = canvas.getContext('webgl', { antialias: false, alpha: false })
             || canvas.getContext('experimental-webgl');
      if (!this.gl) {
        canvas.style.display = 'none';
        document.body.classList.add('no-webgl');
        return;
      }
      this.programs = {};
      this.current = null;
      this.mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
      this.start = performance.now();
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Giới hạn nhịp vẽ — nền động không cần 60fps, đỡ tốn GPU/pin
      // Máy yếu / điện thoại: 24 khung hình/giây là đủ cho một lớp nền mờ
      this.lite = (matchMedia('(max-width: 760px)').matches || (navigator.connection && navigator.connection.saveData) || (navigator.hardwareConcurrency || 8) <= 4);
      this.frameInterval = 1000 / (this.lite ? 24 : 40);
      this.lastFrame = 0;
      this.rendered = null; // shader đã vẽ gần nhất (cho chế độ giảm chuyển động)

      const gl = this.gl;
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

      this.resize = this.resize.bind(this);
      this.loop = this.loop.bind(this);
      window.addEventListener('resize', this.resize);
      window.addEventListener('pointermove', (e) => {
        this.mouse.tx = e.clientX / window.innerWidth;
        this.mouse.ty = 1 - e.clientY / window.innerHeight;
      }, { passive: true });
      this.resize();
      requestAnimationFrame(this.loop);
    }

    compile(type, src) {
      const gl = this.gl;
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error('Shader error:', gl.getShaderInfoLog(sh));
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    }

    getProgram(name) {
      if (!this.gl || !SHADERS[name]) return null;
      if (this.programs[name]) return this.programs[name];
      const gl = this.gl;
      const vs = this.compile(gl.VERTEX_SHADER, VERTEX_SRC);
      const fs = this.compile(gl.FRAGMENT_SHADER, SHADERS[name]);
      if (!vs || !fs) return null;
      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error('Link error:', gl.getProgramInfoLog(prog));
        return null;
      }
      const entry = {
        prog,
        aPos: gl.getAttribLocation(prog, 'a_pos'),
        uTime: gl.getUniformLocation(prog, 'u_time'),
        uRes: gl.getUniformLocation(prog, 'u_resolution'),
        uMouse: gl.getUniformLocation(prog, 'u_mouse'),
      };
      this.programs[name] = entry;
      return entry;
    }

    setEffect(name) {
      if (!this.gl || !SHADERS[name]) return;
      // Mờ dần rồi đổi shader để chuyển cảnh mượt
      this.canvas.classList.add('fx-fading');
      setTimeout(() => {
        this.current = this.getProgram(name);
        this.canvas.classList.remove('fx-fading');
      }, 350);
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      let w = Math.max(1, Math.floor(window.innerWidth * dpr));
      let h = Math.max(1, Math.floor(window.innerHeight * dpr));
      // Trần số điểm ảnh: shader fbm rất nặng, màn lớn/HiDPI sẽ giật nếu vẽ
      // ở độ phân giải gốc. Canvas được CSS kéo full màn nên hạ nội bộ gần
      // như không thấy khác biệt với một lớp nền mờ chuyển động.
      const MAX_PIXELS = this.lite ? 640 * 360 : 1280 * 720;
      const over = (w * h) / MAX_PIXELS;
      if (over > 1) {
        const s = Math.sqrt(over);
        w = Math.max(1, Math.floor(w / s));
        h = Math.max(1, Math.floor(h / s));
      }
      this.canvas.width = w;
      this.canvas.height = h;
      this.rendered = null; // buộc vẽ lại sau khi đổi kích thước
      if (this.gl) this.gl.viewport(0, 0, w, h);
    }

    loop(now) {
      requestAnimationFrame(this.loop);
      const gl = this.gl;
      if (!gl || !this.current) return;
      if (document.hidden) return; // không vẽ khi tab ẩn

      if (this.reducedMotion) {
        // Giảm chuyển động: chỉ vẽ một khung tĩnh mỗi lần đổi hiệu ứng
        if (this.rendered === this.current) return;
        this.rendered = this.current;
      } else {
        // Giới hạn nhịp khung hình
        if (now - this.lastFrame < this.frameInterval) return;
        this.lastFrame = now;
      }

      // Chuột di chuyển mượt theo quán tính
      this.mouse.x += (this.mouse.tx - this.mouse.x) * 0.05;
      this.mouse.y += (this.mouse.ty - this.mouse.y) * 0.05;

      const t = this.reducedMotion ? 10.0 : (now - this.start) / 1000;
      const e = this.current;
      gl.useProgram(e.prog);
      gl.enableVertexAttribArray(e.aPos);
      gl.vertexAttribPointer(e.aPos, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(e.uTime, t);
      gl.uniform2f(e.uRes, this.canvas.width, this.canvas.height);
      gl.uniform2f(e.uMouse, this.mouse.x, this.mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }

  window.BienacFX = { FXEngine, EFFECTS: Object.keys(SHADERS) };
})();
