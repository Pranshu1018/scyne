// WebGL 3D Cylindrical Case Study Ring
// Pixel-perfect replica of Velorn Section 07 3D Case Ring

export class CaseRingScene {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.items = options.items || [
      { image: "/images/ws4amg82ncHwc5izuYrR6m7k3c.png", title: "Aether" },
      { image: "/images/Y8CuMjp97ZIPwsYO7FCiwfWCuw.png", title: "Noct" },
      { image: "/images/2qCpz8LhSsfuwNGPFUJWJDsT8A.png", title: "Sora Living" },
      { image: "/images/7hQXtXjg3yy0QIhemR4kqWrrym8.png", title: "Forma" },
      { image: "/images/D1CBoYc3kNJHhe3eu88zsNWxxk.png", title: "Nacre" },
      { image: "/images/sj95tWRAXBuppq5to5qxG4SH2w.png", title: "Arc Finance" }
    ];

    this.settings = {
      radius: options.radius ?? 4.4,
      cardArc: options.cardArc ?? 0.96,
      cardHeight: options.cardHeight ?? 3.06,
      tilt: options.tilt ?? -13.0, // clean downward right tilt matching photo
      scale: options.scale ?? 1.18, // exact natural photo scale from screenshot
      vertical: options.vertical ?? -0.17, // exact vertical placement so motion is half exposed and cards never cut off
      darkness: options.darkness ?? 0.82,
      speed: options.speed ?? 0.18,
      background: options.background || "#070707"
    };

    this.angle = options.initialAngle ?? 0.0;
    this.targetAngle = options.initialAngle ?? 0.0;
    this.mouse = { x: 0, y: 0 };
    this.targetMouse = { x: 0, y: 0 };
    this.isDragging = false;
    this.dragStartX = 0;
    this.lastTime = 0;
    this.isRunning = false;
    this.rafId = null;

    this.textures = [];
    this.aspectRatios = [];
    this.ready = [];
    this.initGL();
  }

  hexToVec3(hex) {
    if (hex.startsWith("#")) {
      const c = parseInt(hex.slice(1), 16);
      return [(c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255];
    }
    return [0.03, 0.03, 0.03];
  }

  initGL() {
    const gl = this.canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false
    });
    if (!gl) return;
    this.gl = gl;

    const vsSource = `
      precision highp float;
      attribute vec3 a;
      uniform float angle, radius, cardArc, cardHeight, aspect, mx, my, tiltAngle, zoom, yOffset;
      varying vec2 uv;
      varying float facing;

      void main() {
        uv = vec2(a.x, 1.0 - a.y);
        float t = angle + (a.x - 0.5) * cardArc;
        vec3 q = vec3(
          sin(t) * (radius + a.z),
          (a.y - 0.5) * cardHeight,
          cos(t) * (radius + a.z) - radius
        );
        float tilt = tiltAngle + mx * 0.055;
        float x = q.x * cos(tilt) - q.y * sin(tilt);
        q.y = q.x * sin(tilt) + q.y * cos(tilt);
        q.x = x;
        q.y += my * 0.12;

        float cam = 8.6 / zoom;
        float z = cam - q.z;
        float f = 2.40;
        gl_Position = vec4(
          q.x * f / aspect,
          q.y * f + yOffset * z,
          (30.1 / 29.9) * z - 6.0 / 29.9,
          z
        );
        facing = max(0.0, cos(t));
      }
    `;

    const fsSource = `
      precision mediump float;
      uniform sampler2D image;
      uniform float surface, fogAmount, hasBorder;
      uniform vec3 fogColor, borderColor;
      varying vec2 uv;
      varying float facing;

      void main() {
        // Soft rounded corner clipping
        vec2 q = abs(uv - 0.5) - vec2(0.488, 0.485);
        if (length(max(q, 0.0)) > 0.012) discard;

        if (surface < 0.5) {
          if (hasBorder > 0.5) {
            gl_FragColor = vec4(borderColor, 1.0);
          } else {
            gl_FragColor = vec4(vec3(0.09 + 0.12 * facing), 1.0);
          }
          return;
        }

        vec3 color = texture2D(image, uv).rgb;
        float light = 0.82 + 0.18 * facing;
        float edge = smoothstep(0.0, 0.012, min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)));
        if (hasBorder > 0.5 && edge < 0.99) {
          color = mix(borderColor, color, edge);
        } else {
          color = color * light + vec3(0.06) * (1.0 - edge);
        }

        float visibility = mix(1.0, pow(clamp(facing, 0.0, 1.0), 3.0), fogAmount);
        gl_FragColor = vec4(mix(fogColor, color, visibility), 1.0);
      }
    `;

    const createShader = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const prog = gl.createProgram();
    gl.attachShader(prog, createShader(gl.VERTEX_SHADER, vsSource));
    gl.attachShader(prog, createShader(gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(prog);
    this.prog = prog;
    gl.useProgram(prog);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    this.uniforms = {
      angle: gl.getUniformLocation(prog, "angle"),
      radius: gl.getUniformLocation(prog, "radius"),
      cardArc: gl.getUniformLocation(prog, "cardArc"),
      cardHeight: gl.getUniformLocation(prog, "cardHeight"),
      aspect: gl.getUniformLocation(prog, "aspect"),
      mx: gl.getUniformLocation(prog, "mx"),
      my: gl.getUniformLocation(prog, "my"),
      tiltAngle: gl.getUniformLocation(prog, "tiltAngle"),
      zoom: gl.getUniformLocation(prog, "zoom"),
      yOffset: gl.getUniformLocation(prog, "yOffset"),
      image: gl.getUniformLocation(prog, "image"),
      surface: gl.getUniformLocation(prog, "surface"),
      hasBorder: gl.getUniformLocation(prog, "hasBorder"),
      borderColor: gl.getUniformLocation(prog, "borderColor"),
      fogAmount: gl.getUniformLocation(prog, "fogAmount"),
      fogColor: gl.getUniformLocation(prog, "fogColor")
    };

    gl.uniform1i(this.uniforms.image, 0);
    gl.uniform1f(this.uniforms.radius, this.settings.radius);
    gl.uniform1f(this.uniforms.cardArc, this.settings.cardArc);
    gl.uniform1f(this.uniforms.cardHeight, this.settings.cardHeight);
    gl.uniform1f(this.uniforms.tiltAngle, (this.settings.tilt * Math.PI) / 180);
    gl.uniform1f(this.uniforms.zoom, this.settings.scale);
    gl.uniform1f(this.uniforms.yOffset, this.settings.vertical);
    gl.uniform1f(this.uniforms.fogAmount, this.settings.darkness);
    gl.uniform3fv(this.uniforms.fogColor, this.hexToVec3(this.settings.background));

    // Front surface mesh: 24 curved subdivisions along horizontal arc
    const frontVerts = [];
    for (let i = 0; i < 24; i++) {
      const t0 = i / 24;
      const t1 = (i + 1) / 24;
      frontVerts.push(
        t0, 0, 0, t1, 0, 0, t0, 1, 0,
        t1, 0, 0, t1, 1, 0, t0, 1, 0
      );
    }
    this.frontCount = frontVerts.length / 3;

    // Perimeter rim buffer ONLY around outer border (top, bottom, left, right)
    const rimVerts = [];
    const addQuad = (p0, p1, p2, p3) => rimVerts.push(...p0, ...p1, ...p2, ...p1, ...p3, ...p2);
    for (let i = 0; i < 24; i++) {
      const t0 = i / 24;
      const t1 = (i + 1) / 24;
      // Bottom edge
      addQuad([t0, 0, 0], [t1, 0, 0], [t0, 0, -0.04], [t1, 0, -0.04]);
      // Top edge
      addQuad([t0, 1, 0], [t0, 1, -0.04], [t1, 1, 0], [t1, 1, -0.04]);
    }
    // Left edge
    addQuad([0, 0, 0], [0, 1, 0], [0, 0, -0.04], [0, 1, -0.04]);
    // Right edge
    addQuad([1, 0, 0], [1, 0, -0.04], [1, 1, 0], [1, 1, -0.04]);
    this.rimCount = rimVerts.length / 3;

    this.frontBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.frontBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(frontVerts), gl.STATIC_DRAW);

    this.rimBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.rimBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rimVerts), gl.STATIC_DRAW);

    this.aLoc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(this.aLoc);

    this.loadTextures();
    this.initEvents();
    this.resize();
    this.start();
  }

  loadTextures() {
    const gl = this.gl;
    this.ready = this.items.map(() => false);
    this.aspectRatios = this.items.map(() => 1.5);

    this.textures = this.items.map((item, idx) => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([20, 20, 20, 255]));

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this.aspectRatios[idx] = (img.naturalWidth || 1536) / (img.naturalHeight || 1024);
        this.ready[idx] = true;
      };
      img.src = item.image;
      return tex;
    });
  }

  initEvents() {
    window.addEventListener("resize", () => this.resize());

    this.canvas.addEventListener("pointerdown", (e) => {
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.canvas.style.cursor = "grabbing";
    });

    window.addEventListener("pointermove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.targetMouse.x = (e.clientX - rect.left) / rect.width - 0.5;
      this.targetMouse.y = (e.clientY - rect.top) / rect.height - 0.5;

      if (this.isDragging) {
        const dx = e.clientX - this.dragStartX;
        this.targetAngle += dx * 0.005;
        this.dragStartX = e.clientX;
      }
    }, { passive: true });

    const endDrag = () => {
      this.isDragging = false;
      this.canvas.style.cursor = "grab";
    };
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
  }

  resize() {
    if (!this.gl) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.gl.viewport(0, 0, width, height);
      this.gl.uniform1f(this.uniforms.aspect, rect.width / rect.height);
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
    if (!this.gl) return;
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    if (!this.isDragging) {
      this.targetAngle += dt * this.settings.speed;
    }

    this.angle += (this.targetAngle - this.angle) * (1.0 - Math.exp(-8.0 * dt));
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * (1.0 - Math.exp(-4.0 * dt));
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * (1.0 - Math.exp(-4.0 * dt));

    const gl = this.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniform1f(this.uniforms.mx, this.mouse.x);
    gl.uniform1f(this.uniforms.my, this.mouse.y);

    const count = this.items.length;
    const step = (Math.PI * 2) / count;

    for (let i = 0; i < count; i++) {
      if (!this.ready[i]) continue;

      let r = (((i * step) + this.angle + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      if (Math.abs(r) > 2.1) continue; // cull back half

      // Natural card height matching exact photo proportions in screenshot
      const aspect = this.aspectRatios[i] ? Math.max(1.35, Math.min(1.48, this.aspectRatios[i])) : 1.38;
      const cardH = (this.settings.radius * this.settings.cardArc) / aspect;
      gl.uniform1f(this.uniforms.angle, r);
      gl.uniform1f(this.uniforms.cardHeight, cardH);

      const isForma = (this.items[i].title === "Forma");
      gl.uniform1f(this.uniforms.hasBorder, isForma ? 1.0 : 0.0);
      gl.uniform3f(this.uniforms.borderColor, 0.98, 0.28, 0.12);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);

      // 1. Draw Rim / Border (surface = 0)
      gl.uniform1f(this.uniforms.surface, 0.0);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.rimBuf);
      gl.vertexAttribPointer(this.aLoc, 3, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, this.rimCount);

      // 2. Draw Front Image Surface (surface = 1)
      gl.uniform1f(this.uniforms.surface, 1.0);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.frontBuf);
      gl.vertexAttribPointer(this.aLoc, 3, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, this.frontCount);
    }
  }
}
