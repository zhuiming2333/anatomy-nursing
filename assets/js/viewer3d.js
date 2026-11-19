/* 3D 解剖模型查看器（three.js）*/
(function () {
  var THREE = window.THREE;

  function decode(g) {
    var raw = atob(g.b);
    var buf = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
    var nv = g.nv, ni = g.ni;
    var pos = new Float32Array(nv * 3);
    var dv = new DataView(buf.buffer, 0, nv * 6);
    for (var v = 0; v < nv; v++) {
      for (var k = 0; k < 3; k++) {
        var u = dv.getUint16(v * 6 + k * 2, true);
        pos[v * 3 + k] = (u - 32768) * g.sc[k] + g.lo[k];
      }
    }
    var idx = new Uint16Array(ni);
    var dv2 = new DataView(buf.buffer, nv * 6, ni * 2);
    for (var t = 0; t < ni; t++) idx[t] = dv2.getUint16(t * 2, true);
    return { pos: pos, idx: idx };
  }

  var DEFAULT_HIDE = { heart: ['心室壁'] };
  var PALETTE = ['#3f8fb0', '#4a6fa8', '#4f9a86', '#7a6fa8', '#c25a45', '#5f9ec9', '#8d7a44', '#3f8f9e'];

  function Viewer(host, opts) {
    this.host = host;
    this.opts = opts || {};
    this.parts = [];
    this.selected = -1;
    this.isolated = false;
    this._init();
  }

  Viewer.prototype._init = function () {
    var host = this.host;
    var W = host.clientWidth || 360, H = host.clientHeight || 340;
    var r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.setSize(W, H);
    host.appendChild(r.domElement);
    this.scene = new THREE.Scene();
    var cam = this.camera = new THREE.PerspectiveCamera(38, W / H, 1, 6000);
    cam.position.set(0, 0, 900);
    this.group = new THREE.Group();
    this.group.rotation.x = -Math.PI / 2;   /* BodyParts3D 是 Z 向上 */
    this.scene.add(this.group);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x6a6055, 1.15));
    var d1 = new THREE.DirectionalLight(0xffffff, 1.5); d1.position.set(220, 460, 520);
    var d2 = new THREE.DirectionalLight(0xfff2e2, .7); d2.position.set(-320, -180, -260);
    this.scene.add(d1); this.scene.add(d2);

    this._bind();
    this._loop();
  };

  Viewer.prototype._loop = function () {
    var self = this;
    this._raf = requestAnimationFrame(function () { self._loop(); });
    /* 没被拖动时缓慢自转，让静止的模型也有生命 */
    if (this._spin) {
      this.orbit.theta -= 0.0022;
      if (this._applyOrbit) this._applyOrbit();
    }
    this.renderer.render(this.scene, this.camera);
  };

  /* 用户一上手就停，2.5 秒不动再继续 */
  Viewer.prototype._touchSpin = function () {
    var self = this;
    this._spin = false;
    clearTimeout(this._spinT);
    this._spinT = setTimeout(function () { if (!self._dragging) self._spin = true; }, 2500);
  };

  Viewer.prototype._bind = function () {
    var self = this, el = this.renderer.domElement;
    var down = false, moved = 0, px = 0, py = 0, rotX = 0, rotY = 0, touches = 0;
    var theta = 0.6, phi = 1.15, dist = 1, target = new THREE.Vector3();
    this.orbit = { theta: theta, phi: phi, dist: dist, target: target };
    this._applyOrbit = function () {
      var o = self.orbit, r = o.dist;
      self.camera.position.set(
        o.target.x + r * Math.sin(o.phi) * Math.sin(o.theta),
        o.target.y + r * Math.cos(o.phi),
        o.target.z + r * Math.sin(o.phi) * Math.cos(o.theta));
      self.camera.lookAt(o.target);
    };

    function tapTest(e) {
      var rect = el.getBoundingClientRect();
      var nd = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1);
      var ray = new THREE.Raycaster();
      ray.setFromCamera(nd, self.camera);
      var hits = ray.intersectObjects(self.group.children, false);
      if (hits.length) self.select(hits[0].object.userData.idx);
    }

    el.addEventListener('pointerdown', function (e) {
      down = true; self._dragging = true; self._spin = false; clearTimeout(self._spinT); moved = 0; px = e.clientX; py = e.clientY;
      if (e.pointerId !== undefined && el.setPointerCapture) { try { el.setPointerCapture(e.pointerId); } catch (x) {} }
    });
    el.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - px, dy = e.clientY - py;
      px = e.clientX; py = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      self.orbit.theta -= dx * 0.008;
      self.orbit.phi = Math.max(0.12, Math.min(Math.PI - 0.12, self.orbit.phi - dy * 0.008));
      self._applyOrbit();
    });
    el.addEventListener('pointerup', function (e) {
      down = false;
      self._dragging = false; self._touchSpin();
      if (moved < 8) tapTest(e);
    });
    el.addEventListener('pointercancel', function () { down = false; self._dragging = false; self._touchSpin(); });
    el.addEventListener('wheel', function (e) {
      e.preventDefault();
      self.orbit.dist *= (1 + (e.deltaY > 0 ? 0.12 : -0.12));
      self._applyOrbit();
    }, { passive: false });

    var pinch = 0, pinchDist0 = 0;
    el.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) {
        pinch = 1;
        pinchDist0 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY);
      }
    }, { passive: true });
    el.addEventListener('touchmove', function (e) {
      if (pinch && e.touches.length === 2) {
        var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY);
        if (pinchDist0 > 0) { self.orbit.dist *= pinchDist0 / d; self._applyOrbit(); }
        pinchDist0 = d;
      }
    }, { passive: true });
    el.addEventListener('touchend', function () { pinch = 0; });

    this.resize = function () {
      var w = self.host.clientWidth || 360, h = self.host.clientHeight || 340;
      self.renderer.setSize(w, h);
      self.camera.aspect = w / h;
      self.camera.updateProjectionMatrix();
    };
  };

  Viewer.prototype.load = function (scene, onPick) {
    var self = this;
    this.onPick = onPick;
    while (this.group.children.length) {
      var c = this.group.children.pop();
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
    this.parts = [];
    var colorOf = {}, colorSeq = 0;
    var box = new THREE.Box3();
    scene.parts.forEach(function (p, i) {
      var g = window.ANAT.m3d.geoms[p.g];
      if (!g) return;
      var d = decode(g);
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(d.pos, 3));
      geo.setIndex(new THREE.BufferAttribute(d.idx, 1));
      geo.computeVertexNormals();
      // 心脏让四腔各显其色（左右成对同色在心脏上反而看不出四个腔）
      var key = (scene.id === 'heart') ? p.n : p.n.replace(/^(左|右)/, '');
      if (!colorOf[key]) colorOf[key] = PALETTE[colorSeq++ % PALETTE.length];
      var mat = new THREE.MeshPhongMaterial({
        color: new THREE.Color(colorOf[key]),
        shininess: 18, specular: 0x2a2a2a, flatShading: false, side: THREE.FrontSide
      });
      var mesh = new THREE.Mesh(geo, mat);
      mesh.userData.idx = i;
      mesh.userData.name = p.n;
      self.group.add(mesh);
      self.parts.push(mesh);
      var hd = DEFAULT_HIDE[scene.id] || [];
      if (hd.indexOf(p.n) >= 0) mesh.visible = false;
      geo.computeBoundingBox();
      box.union(geo.boundingBox);
    });
    if (box.isEmpty()) return;
    var center = new THREE.Vector3(); box.getCenter(center);
    var size = new THREE.Vector3(); box.getSize(size);
    /* 转到 Y 向上之后的中心（Z-up -> Y-up：x, z, -y）*/
    this.orbit.target.set(center.x, center.z, -center.y);
    var rad = 0.5 * Math.sqrt(size.x * size.x + size.z * size.z + size.y * size.y);
    var halfV = (this.camera.fov * Math.PI / 180) / 2;
    var halfH = Math.atan(Math.tan(halfV) * this.camera.aspect);
    var dV = (size.z / 2) / Math.tan(halfV);
    var dH = (size.x / 2) / Math.tan(halfH);
    this.orbit.dist = Math.max(dV, dH, rad * 0.55) * 1.14 + rad * 0.12;
    this._applyOrbit();
    this.baseDist = this.orbit.dist;
    this.selected = -1;
    this.isolated = false;
    this._hide = (DEFAULT_HIDE[scene.id] || []).slice();
    this.reset();
    this._spin = true;
  };

  Viewer.prototype.select = function (i) {
    this.selected = i;
    for (var k = 0; k < this.parts.length; k++) {
      var m = this.parts[k];
      m.material.emissive = new THREE.Color(0x000000);
      m.material.opacity = 1;
      m.material.transparent = false;
      m.visible = !(this._hide && this._hide.indexOf(m.userData.name) >= 0);
    }
    if (i >= 0 && this.parts[i]) {
      this.parts[i].material.emissive = new THREE.Color(0x4a2c10);
      if (this.isolated) {
        for (var j = 0; j < this.parts.length; j++) if (j !== i) this.parts[j].visible = false;
      }
    }
    if (this.onPick) this.onPick(i);
  };

  /* 按名字显隐某一块（如心脏外壁） */
  Viewer.prototype.setVisible = function (name, on) {
    for (var k = 0; k < this.parts.length; k++) {
      if (this.parts[k].userData.name === name) {
        this.parts[k].visible = !!on;
        var x = (this._hide || []).indexOf(name);
        if (on && x >= 0) this._hide.splice(x, 1);
        if (!on && x < 0) (this._hide = this._hide || []).push(name);
      }
    }
  };
  Viewer.prototype.isHidden = function (name) {
    for (var k = 0; k < this.parts.length; k++) {
      if (this.parts[k].userData.name === name) return !this.parts[k].visible;
    }
    return false;
  };
  Viewer.prototype.isolate = function (v) {
    this.isolated = v;
    this.select(this.selected);
  };

  Viewer.prototype.reset = function () {
    this.orbit.theta = 0.6; this.orbit.phi = 1.15;
    this.orbit.dist = this.baseDist || 900;
    this.isolated = false;
    this.select(-1);
    this.renderer.domElement.style.transform = '';
    this._applyOrbit();
  };

  Viewer.prototype.rotateBy = function (d) {
    this.orbit.theta += d;
    this._applyOrbit();
  };

  Viewer.prototype.destroy = function () {
    cancelAnimationFrame(this._raf);
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  };

  window.M3D = {
    scenes: function () {
      var m = window.ANAT.m3d;
      return m ? m.scenes : [];
    },
    scene: function (id) {
      var m = window.ANAT.m3d, i;
      if (!m) return null;
      for (i = 0; i < m.scenes.length; i++) if (m.scenes[i].id === id) return m.scenes[i];
      return null;
    },
    create: function (host, opts) { return new Viewer(host, opts); }
  };
})();