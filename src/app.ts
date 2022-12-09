// import Experience from './THREE/Experience';
import Background from './Background';
import WebGL from './utils/WebGL';

const canvas = document.querySelector('.three') as HTMLCanvasElement;

const gradients = [
  [0xf72585, 0x7209b7, 0x48cae4, 0xf9c74f, 0xa7c957],
  [0xf94144, 0xf3722c, 0xf8961e, 0xf9c74f, 0x90be6d],
];

const background = new Background(canvas, gradients);

// Check for browser support
if (WebGL.isWebGLAvailable()) {
  background.play();
} else {
  const warning = WebGL.getWebGLErrorMessage();
  console.error(warning);
}
