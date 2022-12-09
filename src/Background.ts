import GUI from 'lil-gui';
import {
  Clock,
  Color,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
// @ts-ignore
import fragmentShader from './shaders/fragment.glsl';
// @ts-ignore
import vertexShader2 from './shaders/two-color.glsl';
// @ts-ignore
import vertexShader3 from './shaders/three-color.glsl';
// @ts-ignore
import vertexShader4 from './shaders/four-color.glsl';
// @ts-ignore
import vertexShader5 from './shaders/five-color.glsl';

interface Sizes {
  width: number;
  height: number;
  pixelRatio: number;
}

/**
 * Creates an animated gradient background inside a designated parent element
 */
export default class Background {
  // Properties
  #background!: Mesh;
  #backgroundGeometry!: PlaneGeometry;
  #backgroundMaterial!: ShaderMaterial;
  #camera!: PerspectiveCamera;
  #canvas!: HTMLCanvasElement;
  #controls!: OrbitControls;
  #parentEl!: HTMLElement;
  #renderer!: WebGLRenderer;
  #sizes!: Sizes;

  // Default gradient if no custom one is passed in
  #clock = new Clock();
  #gradient = [0x8a8afc, 0xfa88cd];
  #gradients?: number[][];
  #scene = new Scene();

  // Optional properties
  #animationFrame?: number;
  #debug?: GUI;

  /**
   *
   * @param canvas Canvas element over which the background will be drawn
   * @param gradient An array of hex numbers in the form 0xffffff for the combination of colors to use. Max 5 colors
   */
  constructor(canvas?: HTMLCanvasElement, gradient?: number[] | number[][]) {
    this.#canvas = canvas ? canvas : this.#createCanvas();
    this.#parentEl = this.#canvas.parentElement!;
    this.#sizes = {
      width: this.#parentEl.clientWidth,
      height: this.#parentEl.clientHeight,
      pixelRatio: Math.min(window.devicePixelRatio, 2),
    };

    // Handle gradient
    if (gradient && gradient.length) {
      if (gradient[0] instanceof Array) {
        const filtered = (gradient as number[][]).filter((g) => g.length);
        this.#gradients = filtered.map((g) =>
          g.length === 1 ? [g[0], g[0]] : g
        );
        this.#gradient = this.#gradients[0];
      }

      if (typeof gradient[0] === 'number') {
        const g = gradient as number[];
        this.#gradient = g.length === 1 ? [g[0], g[0]] : g;
      }
    }

    // Debug
    if (window.location.hash === '#debug') {
      this.#debug = new GUI();
    }
  }

  // Getters & Setters
  get gradient(): number[] {
    return this.#gradient;
  }

  set gradient(gradient: number[] | number[][]) {
    if (!gradient.length) return;

    if (typeof this.gradient[0] === 'number') {
      const g = gradient as number[];
      this.#gradient = g.length === 1 ? [g[0], g[0]] : g;
      return;
    } else {
      const filtered = (gradient as number[][]).filter((g) => g.length);
      this.#gradients = filtered.map((g) =>
        g.length === 1 ? [g[0], g[0]] : g
      );
      this.#gradient = this.#gradients[0];
    }

    if (this.#backgroundMaterial) {
      this.#backgroundMaterial.uniforms.uColor.value = this.#gradient.map(
        (color) => new Color(color)
      );
    }
  }

  // Private methods
  #createCanvas(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    document.body.appendChild(c);
    return c;
  }

  #resizeObj(obj: PerspectiveCamera | WebGLRenderer) {
    const w = this.#sizes.width;
    const h = this.#sizes.height;
    if (obj instanceof PerspectiveCamera) {
      obj.aspect = w / h;
      obj.updateProjectionMatrix();
    }
    if (obj instanceof WebGLRenderer) {
      obj.setSize(w, h);
      obj.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
  }

  #setCamera() {
    const fov = 75;
    const aspect = this.#sizes.width / this.#sizes.height;
    const near = 0.01;
    const far = 100;
    this.#camera = new PerspectiveCamera(fov, aspect, near, far);
    this.#camera.position.set(0, 0, 3);
    this.#scene.add(this.#camera);

    // Debug
    if (this.#debug) {
      const cameraGUI = this.#debug.addFolder('camera');

      const position = {
        print: () => console.log(this.#camera.getWorldPosition(new Vector3())),
      };
      cameraGUI.add(position, 'print');
    }
  }

  #setControls() {
    this.#controls = new OrbitControls(this.#camera, this.#canvas);
    this.#controls.enableDamping = true;
  }

  #setRenderer() {
    this.#renderer = new WebGLRenderer({ canvas: this.#canvas });
    this.#renderer.setSize(this.#sizes.width, this.#sizes.height);
    this.#renderer.setPixelRatio(this.#sizes.pixelRatio);
    this.#renderer.render(this.#scene, this.#camera);
  }

  #getVertexShader() {
    switch (this.#gradient.length) {
      case 3:
        return vertexShader3;
      case 4:
        return vertexShader4;
      case 5:
        return vertexShader5;
      default:
        return vertexShader2;
    }
  }

  #setMesh() {
    this.#backgroundGeometry = new PlaneGeometry(1, 1, 128, 128);
    this.#backgroundMaterial = new ShaderMaterial({
      vertexShader: this.#getVertexShader(),
      fragmentShader: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: this.#gradient.map((color) => new Color(color)) },
      },
    });

    this.#background = new Mesh(
      this.#backgroundGeometry,
      this.#backgroundMaterial
    );

    this.#scene.add(this.#background);

    // Debug
    if (this.#debug) {
      this.#debug
        .add(this.#background.rotation, 'x')
        .min(0)
        .max(Math.PI * 2)
        .step(0.01)
        .name('rotationX');
      this.#debug
        .add(this.#background.rotation, 'y')
        .min(0)
        .max(Math.PI * 2)
        .step(0.01)
        .name('rotationY');

      if (this.#gradients) {
        const gradientFolder = this.#debug.addFolder('gradient');

        const gradients = new Map<string, number[]>();
        for (let i = 0; i < this.#gradients.length; i++) {
          const p = `g${i + 1}`;
          gradients.set(p, this.#gradients[i]);
          gradientFolder
            .add(Object.entries(gradients), p)
            .onChange((val: number[]) => {
              this.#backgroundMaterial.uniforms.uColor.value = val.map(
                (color) => new Color(color)
              );
            });
        }
      }
    }
  }

  #resizeListener() {
    this.#resizeObj(this.#camera);
    this.#resizeObj(this.#renderer);
  }

  #handleResize() {
    this.#parentEl.addEventListener('resize', () => {
      this.#sizes.width = this.#parentEl.clientWidth;
      this.#sizes.height = this.#parentEl.clientHeight;
      this.#sizes.pixelRatio = Math.min(devicePixelRatio, 2);

      this.#resizeObj(this.#camera);
      this.#resizeObj(this.#renderer);
    });
  }

  #handleUpdates() {
    const elapsedTime = this.#clock.getElapsedTime();

    // Update background
    this.#backgroundMaterial.uniforms.uTime.value = elapsedTime;

    // Update controls
    this.#controls.update();

    // Update renderer
    this.#renderer.render(this.#scene, this.#camera);

    this.#animationFrame = requestAnimationFrame(() => this.#handleUpdates());
  }

  // Public Methods
  play() {
    this.#setCamera();
    this.#setControls();
    this.#setMesh();
    this.#setRenderer();
    this.#handleResize();
    this.#handleUpdates();
  }

  stop() {
    this.#clock.stop();

    this.#parentEl.removeEventListener('resize', () => this.#resizeListener());

    if (this.#animationFrame) {
      cancelAnimationFrame(this.#animationFrame);
      this.#animationFrame = undefined;
    }

    this.#scene.traverse((child) => {
      if (child instanceof Mesh) {
        child.geometry.dispose();

        for (let value of Object.values(child.material)) {
          // @ts-ignore
          if (value?.dispose && typeof value.dispose === 'function') {
            // @ts-ignore
            value.dispose();
          }
        }
      }
    });

    this.#controls.dispose();
    this.#renderer.dispose();
    this.#debug?.destroy();
  }
}
