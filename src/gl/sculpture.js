// High-performance WebGL Raymarched 3D Metallic Sculpture
// Direct mathematical reproduction of the Scyne 3D raymarching engine

export class SculptureScene {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.svgUrl = options.svgUrl || "/images/YwaEu83bwCHpgz1o29HBxX43MNc.svg";
    this.metal = options.metal || "#10131a";
    this.light = options.light || "#c8d2e2";
    this.accent = options.accent || "#fc201f"; // Scyne vibrant red accent
    this.specular = options.specular || "#fefefe";
    this.bg = options.bg || "#070707";
    this.shine = options.shine ?? 1.5;
    this.depth = options.depth ?? 0.12;
    this.bevel = options.bevel ?? 0.012;
    this.size = options.size ?? 1.02; // Scaled up to match Scyne's hero sculpture
    this.speed = options.speed ?? 0.9;
    this.horizontalPosition = options.horizontalPosition ?? (window.innerWidth > 900 ? 73 : 50); // percentage
    this.dragEnabled = options.dragEnabled ?? true;

    this.drag = { x: 0, y: 0 };
    this.targetDrag = { x: 0, y: 0 };
    this.mouse = { x: 0, y: 0 };
    this.targetMouse = { x: 0, y: 0 };
    this.scrollProgress = 0;
    this.time = 0;
    this.lastTime = 0;
    this.isDragging = false;
    this.pointerId = null;
    this.dragStart = { x: 0, y: 0 };
    this.hasTexture = false;
    this.isRunning = false;
    this.rafId = null;

    this.initGL();
  }

  hexToVec3(hex) {
    if (hex.startsWith("#")) {
      const c = parseInt(hex.slice(1), 16);
      return [(c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255];
    }
    return [0.07, 0.07, 0.07];
  }

  initGL() {
    const gl = this.canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false
    });
    if (!gl) {
      console.warn("WebGL not supported for sculpture");
      return;
    }
    this.gl = gl;

    const vsSource = `
      attribute vec2 p;
      void main() {
        gl_Position = vec4(p, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision highp float;
      uniform vec2 res;
      uniform float time, depth, bevel, size, progress, shine, horizontalPosition;
      uniform vec2 mouse, drag;
      uniform sampler2D sdf;
      uniform vec3 metal, light, accent, specular, bg;

      mat3 rot(float x, float y, float z) {
        return mat3(cos(z), -sin(z), 0., sin(z), cos(z), 0., 0., 0., 1.) *
               mat3(cos(y), 0., sin(y), 0., 1., 0., -sin(y), 0., cos(y)) *
               mat3(1., 0., 0., 0., cos(x), -sin(x), 0., sin(x), cos(x));
      }

      mat3 R;

      float shape(vec3 p) {
        p = R * p;
        vec2 uv = p.xy * 0.5 + 0.5;
        float edge = max(abs(p.x), abs(p.y)) - 1.0;
        float d = (dot(texture2D(sdf, clamp(uv, 0.0, 1.0)).rg, vec2(256.0, 1.0)) / 257.0 - 0.5) * 2.0;
        d = max(d, edge);
        vec2 q = vec2(d, abs(p.z) - depth);
        return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - bevel;
      }

      vec3 norm(vec3 p) {
        vec2 e = vec2(0.006, 0.0);
        return normalize(vec3(
          shape(p + e.xyy) - shape(p - e.xyy),
          shape(p + e.yxy) - shape(p - e.yxy),
          shape(p + e.yyx) - shape(p - e.yyx)
        ));
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * res) / res.y;
        float mobile = step(res.x / res.y, 1.0);
        float journey = progress * progress * (3.0 - 2.0 * progress);
        float renderScale = size * mix(1.0, 0.65, mobile) * (1.0 - journey * 0.12);

        // Rotation combining drag, continuous time, mouse parallax, and scroll progression
        R = rot(
          -0.18 + drag.y + mouse.y * 0.12 + sin(journey * 3.14159) * 0.35,
          -0.48 + drag.x + time * 0.14 + mouse.x * 0.14 + journey * 2.0,
          -0.12 + journey * 0.45
        );

        float halfWidth = (0.875 * (abs(R[0].x) + abs(R[0].y)) + depth * abs(R[0].z) + bevel) * renderScale / 4.4;
        float horizontalRange = max(0.0, res.x / res.y * 0.5 - halfWidth);
        uv.x -= (horizontalPosition * 2.0 - 1.0) * horizontalRange;
        uv /= renderScale;

        vec3 ro = vec3(uv * 4.4, 4.0);
        vec3 rd = vec3(0.0, 0.0, -1.0);
        float t = 0.0;
        bool hit = false;
        vec3 p;

        for (int i = 0; i < 120; i++) {
          p = ro + rd * t;
          float d = shape(p);
          if (d < 0.0008) {
            hit = true;
            break;
          }
          t += max(d * 0.72, 0.0004);
          if (t > 7.0) break;
        }

        vec3 col = bg;
        if (hit) {
          vec3 n = norm(p);
          vec3 v = -rd;
          vec3 r = reflect(rd, n);
          float nv = max(dot(n, v), 0.0);
          float fres = 0.06 + 0.94 * pow(1.0 - nv, 5.0);

          vec3 studio = light;
          float strip = exp(-pow((r.x * 0.86 + r.y * 0.22 - 0.12) * 11.0, 2.0)) * smoothstep(-0.35, 0.8, r.z);
          float top = pow(max(dot(r, normalize(vec3(-0.6, 1.7, 1.9))), 0.0), 45.0);
          float edge = pow(1.0 - nv, 2.4);
          float red = pow(max(dot(r, normalize(vec3(1.35, -0.6, 1.7))), 0.0), 28.0);
          float hot = pow(max(dot(r, normalize(vec3(1.35, -0.6, 1.7))), 0.0), 150.0);

          vec3 refr = refract(rd, n, 0.67);
          float caustic = exp(-pow((refr.x + refr.y * 0.35 + 0.17) * 8.0, 2.0));

          col = metal * (0.32 + 0.68 * nv) + specular * 0.009;
          float studioStrength = clamp(strip * (0.3 + fres * 1.4) + top + edge * 0.26 + fres * 0.09, 0.0, 1.0);
          col = mix(col, studio, studioStrength);

          float flare = pow(max(dot(r, normalize(vec3(-0.45, 0.3, 2.0))), 0.0), 42.0);
          vec2 highlightOffset = p.xy - vec2(0.76, -0.74);
          float highlightRadius2 = dot(highlightOffset, highlightOffset);
          float centre = exp(-highlightRadius2 * 6.25);
          float centreCore = exp(-highlightRadius2 * 30.25);

          float accentStrength = 1.0 - exp(-(red * 0.75 + flare * 0.3 + caustic * 0.08 + edge * 0.04 + centre * 1.8 + centreCore * 3.2 + hot * 1.6));
          col = mix(col, accent, accentStrength);

          float reflection = strip * (0.12 + fres * 0.95) + top * 0.8 + edge * 0.3;
          float reflectionAlpha = 1.0 - exp(-reflection * shine * 1.8);
          col = mix(col, specular, reflectionAlpha);

          float pin = pow(centreCore, 1.6) * 3.6 + hot * 2.1;
          col = mix(col, specular, 1.0 - exp(-pin * shine));
          col = clamp(col, 0.0, 1.0);
        }

        gl_FragColor = vec4(col, hit ? 1.0 : 0.0);
      }
    `;

    const createShader = (type, source) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
      }
      return s;
    };

    const vs = createShader(gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl.FRAGMENT_SHADER, fsSource);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return;
    }
    this.prog = prog;
    gl.useProgram(prog);

    // Quad geometry
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    const pLoc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(pLoc);
    gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);

    // Texture
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.texture = tex;

    // Cache uniforms
    this.uniforms = {
      res: gl.getUniformLocation(prog, "res"),
      time: gl.getUniformLocation(prog, "time"),
      depth: gl.getUniformLocation(prog, "depth"),
      bevel: gl.getUniformLocation(prog, "bevel"),
      size: gl.getUniformLocation(prog, "size"),
      progress: gl.getUniformLocation(prog, "progress"),
      shine: gl.getUniformLocation(prog, "shine"),
      horizontalPosition: gl.getUniformLocation(prog, "horizontalPosition"),
      mouse: gl.getUniformLocation(prog, "mouse"),
      drag: gl.getUniformLocation(prog, "drag"),
      sdf: gl.getUniformLocation(prog, "sdf"),
      metal: gl.getUniformLocation(prog, "metal"),
      light: gl.getUniformLocation(prog, "light"),
      accent: gl.getUniformLocation(prog, "accent"),
      specular: gl.getUniformLocation(prog, "specular"),
      bg: gl.getUniformLocation(prog, "bg")
    };

    // Set static uniforms
    gl.uniform1f(this.uniforms.depth, this.depth);
    gl.uniform1f(this.uniforms.bevel, this.bevel);
    gl.uniform1f(this.uniforms.size, this.size);
    gl.uniform1f(this.uniforms.shine, this.shine);
    gl.uniform1f(this.uniforms.horizontalPosition, Math.max(0, Math.min(100, this.horizontalPosition)) / 100);
    gl.uniform1i(this.uniforms.sdf, 0);

    gl.uniform3fv(this.uniforms.metal, this.hexToVec3(this.metal));
    gl.uniform3fv(this.uniforms.light, this.hexToVec3(this.light));
    gl.uniform3fv(this.uniforms.accent, this.hexToVec3(this.accent));
    gl.uniform3fv(this.uniforms.specular, this.hexToVec3(this.specular));
    gl.uniform3fv(this.uniforms.bg, this.hexToVec3(this.bg));

    this.loadSVG();
    this.initEvents();
    this.resize();
    this.start();
  }

  loadSVG() {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      this.computeSDF(img);
    };
    img.src = this.svgUrl;
  }

  computeSDF(img) {
    const gl = this.gl;
    const size = 1024;
    const offCanvas = document.createElement("canvas");
    offCanvas.width = offCanvas.height = size;
    const ctx = offCanvas.getContext("2d");

    const scale = 896 / Math.max(img.width || 256, img.height || 256);
    const drawW = (img.width || 256) * scale;
    const drawH = (img.height || 256) * scale;
    ctx.drawImage(img, (size - drawW) / 2, (size - drawH) / 2, drawW, drawH);

    const imgData = ctx.getImageData(0, 0, size, size).data;

    // 1D parabolic distance transform
    const edt1d = (f, n) => {
      const d = new Float32Array(n);
      const v = new Int32Array(n);
      const z = new Float32Array(n + 1);
      let k = 0;
      v[0] = 0;
      z[0] = -1e12;
      z[1] = 1e12;
      for (let q = 1; q < n; q++) {
        let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        while (s <= z[k]) {
          k--;
          s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        }
        k++;
        v[k] = q;
        z[k] = s;
        z[k + 1] = 1e12;
      }
      k = 0;
      for (let q = 0; q < n; q++) {
        while (z[k + 1] < q) k++;
        d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
      }
      return d;
    };

    // 2D distance transform
    const edt2d = (inside) => {
      const f = new Float32Array(size * size);
      for (let y = 0; y < size; y++) {
        const row = new Float32Array(size);
        for (let x = 0; x < size; x++) {
          const alpha = imgData[(y * size + x) * 4 + 3];
          const isFilled = alpha > 127;
          row[x] = isFilled === inside ? 0 : 1e6;
        }
        f.set(edt1d(row, size), y * size);
      }
      const dist = new Float32Array(size * size);
      for (let x = 0; x < size; x++) {
        const col = new Float32Array(size);
        for (let y = 0; y < size; y++) {
          col[y] = f[y * size + x];
        }
        const res = edt1d(col, size);
        for (let y = 0; y < size; y++) {
          dist[y * size + x] = Math.sqrt(res[y]);
        }
      }
      return dist;
    };

    const dIn = edt2d(true);
    const dOut = edt2d(false);
    let sdf = new Float32Array(size * size);
    for (let i = 0; i < sdf.length; i++) {
      sdf[i] = dIn[i] - dOut[i];
    }

    // 16 passes of smoothing
    for (let p = 0; p < 16; p++) {
      const temp = new Float32Array(sdf);
      for (let y = 1; y < size - 1; y++) {
        for (let x = 1; x < size - 1; x++) {
          const idx = y * size + x;
          temp[idx] = (
            sdf[idx] * 4 +
            (sdf[idx - 1] + sdf[idx + 1] + sdf[idx - size] + sdf[idx + size]) * 2 +
            sdf[idx - size - 1] + sdf[idx - size + 1] + sdf[idx + size - 1] + sdf[idx + size + 1]
          ) / 16;
        }
      }
      sdf = temp;
    }

    const rgba = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const sIdx = y * size + x;
        const dIdx = ((size - 1 - y) * size + x) * 4;
        const val = Math.max(0, Math.min(65535, Math.round(32767.5 + (sdf[sIdx] * 65535) / size)));
        rgba[dIdx] = Math.floor(val / 256);
        rgba[dIdx + 1] = val % 256;
        rgba[dIdx + 2] = 0;
        rgba[dIdx + 3] = 255;
      }
    }

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
    this.hasTexture = true;
  }

  initEvents() {
    window.addEventListener("resize", () => this.resize());

    window.addEventListener("pointermove", (e) => {
      this.targetMouse.x = e.clientX / window.innerWidth - 0.5;
      this.targetMouse.y = e.clientY / window.innerHeight - 0.5;

      if (this.isDragging && this.dragEnabled) {
        const deltaX = e.clientX - this.dragStart.x;
        const deltaY = e.clientY - this.dragStart.y;
        const factor = (Math.PI * 2) / Math.max(320, Math.min(window.innerWidth, window.innerHeight));
        this.targetDrag.x += deltaX * factor;
        this.targetDrag.y += deltaY * factor;
        this.dragStart.x = e.clientX;
        this.dragStart.y = e.clientY;
      }
    }, { passive: true });

    if (this.dragEnabled) {
      window.addEventListener("pointerdown", (e) => {
        // Allow drag interaction everywhere in hero
        if (e.button === 0) {
          this.isDragging = true;
          this.dragStart.x = e.clientX;
          this.dragStart.y = e.clientY;
          document.body.style.cursor = "grabbing";
        }
      });

      const endDrag = () => {
        this.isDragging = false;
        document.body.style.cursor = "";
      };

      window.addEventListener("pointerup", endDrag);
      window.addEventListener("pointercancel", endDrag);
    }
  }

  setProgress(progress) {
    this.scrollProgress = Math.max(0, Math.min(1, progress));
  }

  resize() {
    if (!this.gl) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.gl.viewport(0, 0, width, height);
      this.gl.uniform2f(this.uniforms.res, width, height);
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    const loop = (now) => {
      if (!this.isRunning) return;
      this.render(now);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    this.isRunning = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  render(now) {
    if (!this.gl || !this.hasTexture) return;

    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    // Smooth inertia
    const dragInertia = 1.0 - Math.exp(-12.0 * dt);
    const mouseInertia = 1.0 - Math.exp(-2.5 * dt);

    this.drag.x += (this.targetDrag.x - this.drag.x) * dragInertia;
    this.drag.y += (this.targetDrag.y - this.drag.y) * dragInertia;
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * mouseInertia;
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * mouseInertia;

    if (!this.isDragging) {
      this.time += dt * 0.5 * this.speed;
    }

    const gl = this.gl;
    gl.uniform1f(this.uniforms.time, this.time);
    gl.uniform1f(this.uniforms.progress, this.scrollProgress);
    gl.uniform2f(this.uniforms.mouse, this.mouse.x, this.mouse.y);
    gl.uniform2f(this.uniforms.drag, this.drag.x, this.drag.y);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}
