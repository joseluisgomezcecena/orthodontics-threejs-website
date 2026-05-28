/**
 * Lancer Orthodontics — Bracket 3D Viewer
 * Three.js r128 + GLTFLoader
 *
 * Espera un archivo en ./bracket.glb (o ajusta data-model)
 * Si no encuentra el GLB, muestra un bracket procedural como fallback
 * para que el hero nunca se vea vacío.
 */

(function () {
  'use strict';

  class BracketViewer {
    constructor(container) {
      this.container = container;
      this.modelPath = container.dataset.model || 'bracket.glb';
      this.autoRotate = container.dataset.autoRotate !== 'false';

      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.mainObject = null;
      this.envMap = null;

      this.isMouseDown = false;
      this.isHovering = false;
      this.mouseX = 0;
      this.mouseY = 0;
      this.targetRotationX = 0.45;
      this.targetRotationY = 0;
      this.autoRotationSpeed = this.autoRotate ? 0.006 : 0;

      this.cameraDistance = 4.2;
      this.minDistance = 1.8;
      this.maxDistance = 6;

      this.init();
    }

    init() {
      if (typeof THREE === 'undefined') {
        console.error('[Lancer] THREE.js no está cargado');
        return;
      }

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(
        45,
        this.container.clientWidth / this.container.clientHeight,
        0.1,
        100
      );
      this.camera.position.set(0, 0, this.cameraDistance);

      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;
      this.renderer.physicallyCorrectLights = true;

      this.container.appendChild(this.renderer.domElement);

      this.envMap = this.createEnvironment();
      this.scene.environment = this.envMap;

      this.setupLights();
      this.setupInteractions();
      this.loadModel();
      this.animate();

      window.addEventListener('resize', () => this.handleResize());
    }

    createEnvironment() {
      // Cubemap procedural — gradiente metálico para reflejos del bracket
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');

      const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 420);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#d8dde6');
      grad.addColorStop(0.6, '#8a95a8');
      grad.addColorStop(0.85, '#4a5878');
      grad.addColorStop(1, '#1f2a44');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);

      const dataURL = canvas.toDataURL();
      const urls = [dataURL, dataURL, dataURL, dataURL, dataURL, dataURL];
      return new THREE.CubeTextureLoader().load(urls);
    }

    setupLights() {
      const ambient = new THREE.AmbientLight(0xffffff, 0.35);
      this.scene.add(ambient);

      const key = new THREE.DirectionalLight(0xffffff, 1.2);
      key.position.set(5, 5, 5);
      this.scene.add(key);

      const fill = new THREE.DirectionalLight(0xc0d4ff, 0.5);
      fill.position.set(-4, 2, -3);
      this.scene.add(fill);

      const rim = new THREE.DirectionalLight(0xffffff, 0.6);
      rim.position.set(0, -5, -4);
      this.scene.add(rim);

      const top = new THREE.DirectionalLight(0xffffff, 0.3);
      top.position.set(0, 10, 0);
      this.scene.add(top);
    }

    setupInteractions() {
      const el = this.renderer.domElement;

      // Mouse
      el.addEventListener('mousedown', (e) => {
        this.isMouseDown = true;
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
      });
      el.addEventListener('mouseenter', () => { this.isHovering = true; });
      el.addEventListener('mouseleave', () => {
        this.isHovering = false;
        this.isMouseDown = false;
      });
      el.addEventListener('mousemove', (e) => {
        if (!this.isMouseDown) return;
        const dx = e.clientX - this.mouseX;
        const dy = e.clientY - this.mouseY;
        this.targetRotationY += dx * 0.005;
        this.targetRotationX += dy * 0.005;
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
      });
      window.addEventListener('mouseup', () => { this.isMouseDown = false; });

      // Wheel zoom
      el.addEventListener('wheel', (e) => {
        e.preventDefault();
        this.cameraDistance += e.deltaY * 0.002;
        this.cameraDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.cameraDistance));
      }, { passive: false });

      // Touch
      el.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          this.isMouseDown = true;
          this.isHovering = true;
          this.mouseX = e.touches[0].clientX;
          this.mouseY = e.touches[0].clientY;
        }
      }, { passive: true });
      el.addEventListener('touchmove', (e) => {
        if (!this.isMouseDown || e.touches.length !== 1) return;
        e.preventDefault();
        const dx = e.touches[0].clientX - this.mouseX;
        const dy = e.touches[0].clientY - this.mouseY;
        this.targetRotationY += dx * 0.005;
        this.targetRotationX += dy * 0.005;
        this.mouseX = e.touches[0].clientX;
        this.mouseY = e.touches[0].clientY;
      }, { passive: false });
      el.addEventListener('touchend', () => {
        this.isMouseDown = false;
        this.isHovering = false;
      });
    }

    loadModel() {
      if (typeof THREE.GLTFLoader === 'undefined') {
        console.warn('[Lancer] GLTFLoader no disponible, usando fallback');
        this.createFallback();
        return;
      }

      const loader = new THREE.GLTFLoader();
      loader.load(
        this.modelPath,
        (gltf) => this.onModelLoaded(gltf),
        (progress) => {
          if (progress.total) {
            const pct = ((progress.loaded / progress.total) * 100).toFixed(0);
            // console.log(`[Lancer] Cargando: ${pct}%`);
          }
        },
        (err) => {
          console.error('[Lancer] Error cargando GLB:', err);
          // Fallback visual para que el hero no se vea vacío
          this.createFallback();
        }
      );
    }

    onModelLoaded(gltf) {
      const model = gltf.scene;

      // Materiales metálicos premium (estilo bracket pulido)
      const materialSettings = {
        color: 0xc8d4ec,        // gris-azul metálico claro
        metalness: 0.95,
        roughness: 0.18,
        envMapIntensity: 1.1
      };

      model.traverse((child) => {
        if (!child.isMesh) return;

        const isDark = child.material?.color &&
          child.material.color.r < 0.05 &&
          child.material.color.g < 0.05 &&
          child.material.color.b < 0.05;

        if (!child.material || isDark) {
          child.material = new THREE.MeshStandardMaterial({
            ...materialSettings,
            envMap: this.envMap
          });
        } else if (child.material.isMeshStandardMaterial || child.material.isMeshPhysicalMaterial) {
          child.material.metalness = materialSettings.metalness;
          child.material.roughness = materialSettings.roughness;
          child.material.envMap = this.envMap;
          child.material.envMapIntensity = materialSettings.envMapIntensity;
        } else {
          const oldColor = child.material.color ? child.material.color.getHex() : materialSettings.color;
          child.material = new THREE.MeshStandardMaterial({
            color: oldColor,
            metalness: materialSettings.metalness,
            roughness: materialSettings.roughness,
            envMap: this.envMap,
            envMapIntensity: materialSettings.envMapIntensity
          });
        }
        child.material.needsUpdate = true;
      });

      // Centrar y escalar
      const group = new THREE.Group();
      group.add(model);

      const box = new THREE.Box3().setFromObject(group);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      model.position.set(-center.x, -center.y, -center.z);
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2.4 / maxDim;
      group.scale.setScalar(scale);

      group.rotation.x = -0.3;

      this.mainObject = group;
      this.scene.add(group);

      this.hideLoader();
    }

    createFallback() {
      // Bracket procedural si no se encuentra el GLB
      // Base estilizada con slot horizontal
      const group = new THREE.Group();

      const mat = new THREE.MeshStandardMaterial({
        color: 0xc8d4ec,
        metalness: 0.95,
        roughness: 0.18,
        envMap: this.envMap,
        envMapIntensity: 1.1
      });

      // Base (cuerpo principal)
      const baseGeo = new THREE.BoxGeometry(1.4, 1.0, 0.45);
      const base = new THREE.Mesh(baseGeo, mat);
      group.add(base);

      // Alas (tie wings) — 4 cilindros en las esquinas
      const wingGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.5, 24);
      const positions = [
        [-0.5, 0.4, 0.25],
        [0.5, 0.4, 0.25],
        [-0.5, -0.4, 0.25],
        [0.5, -0.4, 0.25]
      ];
      positions.forEach(([x, y, z]) => {
        const w = new THREE.Mesh(wingGeo, mat);
        w.position.set(x, y, z);
        w.rotation.x = Math.PI / 2;
        group.add(w);
      });

      // Slot horizontal (ranura simulada con cilindro oscuro)
      const slotGeo = new THREE.BoxGeometry(1.5, 0.12, 0.12);
      const slotMat = new THREE.MeshStandardMaterial({
        color: 0x0a0d18,
        metalness: 0.4,
        roughness: 0.6
      });
      const slot = new THREE.Mesh(slotGeo, slotMat);
      slot.position.set(0, 0, 0.32);
      group.add(slot);

      // V-Slot vertical (referencia Sinterline)
      const vslotGeo = new THREE.BoxGeometry(0.12, 0.8, 0.12);
      const vslot = new THREE.Mesh(vslotGeo, slotMat);
      vslot.position.set(0, 0, 0.32);
      group.add(vslot);

      group.rotation.x = -0.3;
      this.mainObject = group;
      this.scene.add(group);

      this.hideLoader();
    }

    hideLoader() {
      const loader = this.container.querySelector('.bracket-canvas__loader');
      if (loader) {
        loader.classList.add('hidden');
        setTimeout(() => { loader.style.display = 'none'; }, 500);
      }
    }

    animate() {
      const frame = () => {
        requestAnimationFrame(frame);

        if (this.mainObject) {
          if (!this.isMouseDown && !this.isHovering && this.autoRotate) {
            this.targetRotationY += this.autoRotationSpeed;
          }
          // Easing suave
          this.mainObject.rotation.x += (this.targetRotationX - this.mainObject.rotation.x) * 0.06;
          this.mainObject.rotation.y += (this.targetRotationY - this.mainObject.rotation.y) * 0.06;
        }

        // Smooth zoom
        this.camera.position.z += (this.cameraDistance - this.camera.position.z) * 0.08;

        this.renderer.render(this.scene, this.camera);
      };
      frame();
    }

    handleResize() {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }
  }

  // Init
  function start() {
    document.querySelectorAll('.bracket-canvas').forEach((el) => {
      new BracketViewer(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
