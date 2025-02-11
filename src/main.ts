import './style.css';
import { MeshGradient } from './meshGradient';

const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

new MeshGradient(canvas, { 
  backgroundColor: '#222222',
  colors: ['#1034a6', '#7851a9', '#191970'], 
  density: 10, 
  radius: 1000, 
  blurAmount: 100,
  noiseIntensity: 10,
  speed: 10, 
  morphSpeed: 0.02,
  isStatic: false
});
