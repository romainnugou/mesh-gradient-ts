export class MeshGradient {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly offscreenCanvas: OffscreenCanvas;
  private readonly offscreenCtx: OffscreenCanvasRenderingContext2D;
  
  private backgroundColor: string;
  private colors: string[];
  private readonly points: {
    x: number;
    y: number;
    dx: number;
    dy: number;
    color: string;
  }[];
  private radius: number;
  private blurAmount: number;
  private noiseIntensity: number;

  private animationFrame: number | null = null;
  private lastFrameTime = performance.now();
  private speed: number;
  private morphSpeed: number;

  private readonly isStatic: boolean;
  private isPaused: boolean = false;

  constructor(canvas: HTMLCanvasElement, options: { 
    backgroundColor?: string,
    colors?: string[], 
    density?: number, 
    radius?: number, 
    blurAmount?: number,
    noiseIntensity?: number,
    speed?: number, 
    morphSpeed?: number,
    isStatic?: boolean
  } = {}) {
    // Canvas
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.offscreenCanvas = new OffscreenCanvas(window.innerWidth, window.innerHeight);
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;

    // Points, colors and effects
    this.backgroundColor = options.backgroundColor ?? '#222222';
    this.colors = options.colors ?? ["#1034a6", "#7851a9", "#191970"];
    this.points = [];
    this.radius = options.radius ?? 1000;
    this.blurAmount = options.blurAmount ?? 100;
    this.noiseIntensity = options.noiseIntensity ?? 10;// max 255

    // Animation params
    this.speed = options.speed ?? 10;
    this.morphSpeed = options.morphSpeed ?? 0.02;

    // Static param
    this.isStatic = options.isStatic ?? false;

    // Init canvas
    this.init(options.density ?? 10);

    // Render (static or animated)
    if (!this.isStatic) {
      requestAnimationFrame(() => this.animate());
    } else {
      this.renderStaticImage();
    }

    // Resize event listener
    window.addEventListener("resize", () => this.resize());
  }

  /**
   * Initialize the canvas and points
   * @param density 
   */
  private init(density: number) {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.offscreenCanvas.width = this.canvas.width;
    this.offscreenCanvas.height = this.canvas.height;
    
    for (let i = 0; i < density; i++) {
      this.points.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        dx: (Math.random() - 0.5) * this.speed,
        dy: (Math.random() - 0.5) * this.speed,
        color: this.colors[i % this.colors.length],
      });
    }
  }

  /**
   * Animate the points
   */
  private animate() {
    // Skip if paused
    if (this.isPaused) return;

    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;

    // Limit FPS if needed
    if (deltaTime < 16) {
      this.animationFrame = requestAnimationFrame(() => this.animate());
      return;
    }
    this.lastFrameTime = now;

    // Update points if needed
    let hasMoved = this.updatePoints();
    if (hasMoved) {
      this.morphColors();

      this.offscreenCtx.fillStyle = this.backgroundColor;
      this.offscreenCtx.fillRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
      this.offscreenCtx.filter = `blur(${this.blurAmount}px)`;

      this.drawGradients();
      this.offscreenCtx.filter = "none";

      // Add noise if needed
      if(this.noiseIntensity > 0) { 
        this.addNoise();
      }

      // Draw the image on the main canvas
      this.ctx.drawImage(this.offscreenCanvas, 0, 0);
    }

    this.animationFrame = requestAnimationFrame(() => this.animate());
  }

  /**
   * Render the static image
   */
  private renderStaticImage() {
    this.offscreenCtx.fillStyle = this.backgroundColor;
    this.offscreenCtx.fillRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
    this.offscreenCtx.filter = `blur(${this.blurAmount}px)`;
  
    this.drawGradients();
    this.offscreenCtx.filter = "none";
  
    // Add noise if needed
    if (this.noiseIntensity > 0) { 
      this.addNoise();
    }
  
    // Draw the image on the main canvas
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
  }

  /**
   * Draw the gradients
   */
  private drawGradients() {
    this.points.forEach((point) => {
      const gradient = this.offscreenCtx.createRadialGradient(
        point.x, point.y, 0, point.x, point.y, this.radius
      );

      gradient.addColorStop(0, point.color);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      this.offscreenCtx.fillStyle = gradient;
      this.offscreenCtx.beginPath();
      this.offscreenCtx.arc(point.x, point.y, this.radius, 0, Math.PI * 2);
      this.offscreenCtx.fill();
    });
  }

  /**
   * Update the points
   * @returns true if the points have moved
   */
  private updatePoints(): boolean {
    let hasMoved = false;

    this.points.forEach((point) => {
      const prevX = point.x;
      const prevY = point.y;

      point.x += point.dx;
      point.y += point.dy;

      if (point.x !== prevX || point.y !== prevY) {
        hasMoved = true;
      }

      if (point.x <= 0 || point.x >= this.canvas.width) point.dx *= -1;
      if (point.y <= 0 || point.y >= this.canvas.height) point.dy *= -1;
    });

    return hasMoved;
  }

  /**
   * Morph the colors
   */
  private morphColors() {
    this.points.forEach((point) => {
      const colorIndex = Math.floor(Math.random() * this.colors.length);
      point.color = this.interpolateColor(point.color, this.colors[colorIndex], this.morphSpeed);
    });
  }

  /**
   * Interpolate the colors
   * @param color1 
   * @param color2 
   * @param factor 
   * @returns the interpolated color
   */
  private interpolateColor(color1: string, color2: string, factor: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
  
    if (!c1 || !c2) return color1;
  
    const r = Math.round(c1.r + (c2.r - c1.r) * factor);
    const g = Math.round(c1.g + (c2.g - c1.g) * factor);
    const b = Math.round(c1.b + (c2.b - c1.b) * factor);
  
    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Convert a hex color to an RGB object
   * @param hex 
   * @returns the RGB object
   */
  private hexToRgb(hex: string) {
    let normalizedHex = hex.replace(/^#/, "");
    if (normalizedHex.length === 3) {
      normalizedHex = normalizedHex.split("").map(c => c + c).join("");
    }
    const match = /^([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(normalizedHex);
    return match ? { r: parseInt(match[1], 16), g: parseInt(match[2], 16), b: parseInt(match[3], 16) } : null;
  }

  /**
   * Add noise to the image
   */
  private addNoise() {
    const imageData = this.offscreenCtx.getImageData(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
    const pixels = imageData.data;
  
    for (let i = 0; i < pixels.length; i += 4) {
      const rand = (Math.random() - 0.5) * this.noiseIntensity;
      pixels[i] += rand;      // Red
      pixels[i + 1] += rand;  // Green
      pixels[i + 2] += rand;  // Blue
    }
  
    this.offscreenCtx.putImageData(imageData, 0, 0);
  }

  /**
   * Resize the canvas
   */
  private resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /**
   * Pause the animation
   */
  public pause() {
    if (this.isStatic) return;
    this.isPaused = true;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  /**
   * Resume the animation
   */
  public resume() {
    if (this.isStatic) return;
    if (!this.isPaused) return;
    this.isPaused = false;
    this.animate();
  }

  /**
   * Update the background color
   * @param color New background color (hex format)
   */
  public setBackgroundColor(color: string) {
    if (!/^#([0-9A-F]{3}){1,2}$/i.test(color)) {
      console.warn("Invalid background color. Must be a hex value.");
      return;
    }
    this.backgroundColor = color;
  }

  /**
   * Set the colors
   * @param newColors 
   */
  public setColors(newColors: string[]) {
    // Filter invalid colors
    const validColors = newColors.map(c => c.trim()).filter(c => /^#([0-9A-F]{3}){1,2}$/i.test(c));
    
    if (validColors.length === 0) {
      console.warn("No valid colors provided. Colors remain unchanged.");
      return;
    }
  
    this.colors = validColors;
  
    // Reassign the colors to the existing points
    this.points.forEach((point, i) => {
      point.color = this.colors[i % this.colors.length];
    });
  }

  /**
   * Update the density (number of gradient points)
   * @param density New density value (positive integer)
   */
  public setDensity(density: number) {
    if (density <= 0 || !Number.isInteger(density)) {
      console.warn("Density must be a positive integer.");
      return;
    }
    this.init(density);
  }

  /**
   * Update the radius of gradient points
   * @param radius New radius value (positive number)
   */
  public setRadius(radius: number) {
    if (radius < 0) {
      console.warn("Radius must be a positive number.");
      return;
    }
    this.radius = radius;
  }

  /**
   * Update the blur effect amount
   * @param blurAmount New blur amount (positive number)
   */
  public setBlurAmount(blurAmount: number) {
    if (blurAmount < 0) {
      console.warn("Blur amount must be a positive number.");
      return;
    }
    this.blurAmount = blurAmount;
  }

  /**
   * Update the speed of gradient points movement
   * @param speed New speed value (positive number)
   */
  public setSpeed(speed: number) {
    if (speed < 0) {
      console.warn("Speed must be a positive number.");
      return;
    }
    this.speed = speed;
    this.points.forEach(point => {
      point.dx = (Math.random() - 0.5) * this.speed;
      point.dy = (Math.random() - 0.5) * this.speed;
    });
  }

  /**
   * Update the noise intensity
   * @param noiseIntensity New noise intensity value (0-255)
   */
  public setNoiseIntensity(noiseIntensity: number) {
    if (noiseIntensity < 0 || noiseIntensity > 255) {
      console.warn("Noise intensity must be between 0 and 255.");
      return;
    }
    this.noiseIntensity = noiseIntensity;
  }

  /**
   * Set the morph speed
   * @param speed 
   */
  public setMorphSpeed(speed: number) {
    this.morphSpeed = Math.max(0, Math.min(1, speed)); // Clamp between 0 and 1
  }
  
  /**
   * Export the image
   * @param format 
   * @param quality 
   * @param width 
   * @param height 
   */
  public exportImage(format: "png" | "jpeg" = "png", quality: number = 1, width?: number, height?: number) {
    if (!["png", "jpeg"].includes(format)) {
      console.warn("Invalid format. Only 'png' or 'jpeg' are supported.");
    }
  
    // Export width and height
    const exportWidth = width ?? this.canvas.width;
    const exportHeight = height ?? this.canvas.height;
  
    // Create a temporary canvas for the export
    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = exportWidth;
    offscreenCanvas.height = exportHeight;
    const ctx = offscreenCanvas.getContext("2d")!;
  
    // Apply the background color
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, exportWidth, exportHeight);
  
    // Draw the gradients on the temporary canvas
    this.points.forEach((point) => {
      const scaleX = exportWidth / this.canvas.width;
      const scaleY = exportHeight / this.canvas.height;
  
      const gradient = ctx.createRadialGradient(
        point.x * scaleX, point.y * scaleY, 0,
        point.x * scaleX, point.y * scaleY, this.radius * scaleX
      );
  
      gradient.addColorStop(0, point.color);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(point.x * scaleX, point.y * scaleY, this.radius * scaleX, 0, Math.PI * 2);
      ctx.fill();
    });
  
    // Convert to Data URL and download the image
    const dataUrl = offscreenCanvas.toDataURL(`image/${format}`, quality);
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `mesh-gradient-${exportWidth}x${exportHeight}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
