// @ts-nocheck — ported from JS; dynamic imports keep three/postprocessing out of SSR bundle
import { useEffect, useRef } from 'react';
import './PixelBlast.css';

// ── pure constants (no THREE references) ─────────────────────────────────────

const SHAPE_MAP = { square: 0, circle: 1, triangle: 2, diamond: 3 };
const MAX_CLICKS = 10;

const VERTEX_SRC = `void main() { gl_Position = vec4(position, 1.0); }`;

const FRAGMENT_SRC = `
precision highp float;
uniform vec3  uColor;
uniform vec2  uResolution;
uniform float uTime;
uniform float uPixelSize;
uniform float uScale;
uniform float uDensity;
uniform float uPixelJitter;
uniform int   uEnableRipples;
uniform float uRippleSpeed;
uniform float uRippleThickness;
uniform float uRippleIntensity;
uniform float uEdgeFade;
uniform int   uShapeType;
const int SHAPE_SQUARE   = 0;
const int SHAPE_CIRCLE   = 1;
const int SHAPE_TRIANGLE = 2;
const int SHAPE_DIAMOND  = 3;
const int MAX_CLICKS = 10;
uniform vec2  uClickPos  [MAX_CLICKS];
uniform float uClickTimes[MAX_CLICKS];
out vec4 fragColor;
float Bayer2(vec2 a) { a = floor(a); return fract(a.x / 2. + a.y * a.y * .75); }
#define Bayer4(a) (Bayer2(.5*(a))*0.25 + Bayer2(a))
#define Bayer8(a) (Bayer4(.5*(a))*0.25 + Bayer2(a))
#define FBM_OCTAVES 5
#define FBM_LACUNARITY 1.25
#define FBM_GAIN 1.0
float hash11(float n){ return fract(sin(n)*43758.5453); }
float vnoise(vec3 p){
  vec3 ip=floor(p);vec3 fp=fract(p);
  float n000=hash11(dot(ip+vec3(0,0,0),vec3(1,57,113)));float n100=hash11(dot(ip+vec3(1,0,0),vec3(1,57,113)));
  float n010=hash11(dot(ip+vec3(0,1,0),vec3(1,57,113)));float n110=hash11(dot(ip+vec3(1,1,0),vec3(1,57,113)));
  float n001=hash11(dot(ip+vec3(0,0,1),vec3(1,57,113)));float n101=hash11(dot(ip+vec3(1,0,1),vec3(1,57,113)));
  float n011=hash11(dot(ip+vec3(0,1,1),vec3(1,57,113)));float n111=hash11(dot(ip+vec3(1,1,1),vec3(1,57,113)));
  vec3 w=fp*fp*fp*(fp*(fp*6.-15.)+10.);
  return mix(mix(mix(n000,n100,w.x),mix(n010,n110,w.x),w.y),mix(mix(n001,n101,w.x),mix(n011,n111,w.x),w.y),w.z)*2.-1.;
}
float fbm2(vec2 uv,float t){
  vec3 p=vec3(uv*uScale,t);float amp=1.;float freq=1.;float sum=1.;
  for(int i=0;i<FBM_OCTAVES;++i){sum+=amp*vnoise(p*freq);freq*=FBM_LACUNARITY;amp*=FBM_GAIN;}
  return sum*0.5+0.5;
}
float maskCircle(vec2 p,float cov){float r=sqrt(cov)*.25;float d=length(p-0.5)-r;float aa=0.5*fwidth(d);return cov*(1.-smoothstep(-aa,aa,d*2.));}
float maskTriangle(vec2 p,vec2 id,float cov){bool flip=mod(id.x+id.y,2.)>0.5;if(flip)p.x=1.-p.x;float r=sqrt(cov);float d=p.y-r*(1.-p.x);float aa=fwidth(d);return cov*clamp(.5-d/aa,0.,1.);}
float maskDiamond(vec2 p,float cov){float r=sqrt(cov)*0.564;return step(abs(p.x-.49)+abs(p.y-.49),r);}
void main(){
  float pixelSize=uPixelSize;
  vec2 fragCoord=gl_FragCoord.xy-uResolution*.5;
  float aspectRatio=uResolution.x/uResolution.y;
  vec2 pixelId=floor(fragCoord/pixelSize);
  vec2 pixelUV=fract(fragCoord/pixelSize);
  float cellPixelSize=8.*pixelSize;
  vec2 cellId=floor(fragCoord/cellPixelSize);
  vec2 cellCoord=cellId*cellPixelSize;
  vec2 uv=cellCoord/uResolution*vec2(aspectRatio,1.);
  float base=fbm2(uv,uTime*0.05);
  base=base*0.5-0.65;
  float feed=base+(uDensity-0.5)*0.3;
  if(uEnableRipples==1){
    for(int i=0;i<MAX_CLICKS;++i){
      vec2 pos=uClickPos[i];if(pos.x<0.)continue;
      float cps=8.*pixelSize;
      vec2 cuv=(((pos-uResolution*.5-cps*.5)/(uResolution)))*vec2(aspectRatio,1.);
      float t=max(uTime-uClickTimes[i],0.);
      float r=distance(uv,cuv);
      float waveR=uRippleSpeed*t;
      float ring=exp(-pow((r-waveR)/uRippleThickness,2.));
      float atten=exp(-1.*t)*exp(-10.*r);
      feed=max(feed,ring*atten*uRippleIntensity);
    }
  }
  float bayer=Bayer8(fragCoord/uPixelSize)-0.5;
  float bw=step(0.5,feed+bayer);
  float h=fract(sin(dot(floor(fragCoord/uPixelSize),vec2(127.1,311.7)))*43758.5453);
  float jitterScale=1.+(h-0.5)*uPixelJitter;
  float coverage=bw*jitterScale;
  float M;
  if(uShapeType==SHAPE_CIRCLE) M=maskCircle(pixelUV,coverage);
  else if(uShapeType==SHAPE_TRIANGLE) M=maskTriangle(pixelUV,pixelId,coverage);
  else if(uShapeType==SHAPE_DIAMOND) M=maskDiamond(pixelUV,coverage);
  else M=coverage;
  if(uEdgeFade>0.){
    vec2 norm=gl_FragCoord.xy/uResolution;
    float edge=min(min(norm.x,norm.y),min(1.-norm.x,1.-norm.y));
    M*=smoothstep(0.,uEdgeFade,edge);
  }
  vec3 color=uColor;
  vec3 srgbColor=mix(color*12.92,1.055*pow(color,vec3(1./2.4))-0.055,step(0.0031308,color));
  fragColor=vec4(srgbColor,M);
}
`;

// ── component ─────────────────────────────────────────────────────────────────

export interface PixelBlastProps {
  variant?: 'square' | 'circle' | 'triangle' | 'diamond';
  pixelSize?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  antialias?: boolean;
  patternScale?: number;
  patternDensity?: number;
  liquid?: boolean;
  liquidStrength?: number;
  liquidRadius?: number;
  pixelSizeJitter?: number;
  enableRipples?: boolean;
  rippleIntensityScale?: number;
  rippleThickness?: number;
  rippleSpeed?: number;
  liquidWobbleSpeed?: number;
  autoPauseOffscreen?: boolean;
  speed?: number;
  transparent?: boolean;
  edgeFade?: number;
  noiseAmount?: number;
}

const PixelBlast = ({
  variant = 'square',
  pixelSize = 3,
  color = '#B497CF',
  className,
  style,
  antialias = true,
  patternScale = 2,
  patternDensity = 1,
  liquid = false,
  liquidStrength = 0.1,
  liquidRadius = 1,
  pixelSizeJitter = 0,
  enableRipples = true,
  rippleIntensityScale = 1,
  rippleThickness = 0.1,
  rippleSpeed = 0.3,
  liquidWobbleSpeed = 4.5,
  autoPauseOffscreen = true,
  speed = 0.5,
  transparent = true,
  edgeFade = 0.5,
  noiseAmount = 0,
}: PixelBlastProps) => {
  const containerRef = useRef(null);
  const speedRef = useRef(speed);
  const threeRef = useRef(null);
  const prevConfigRef = useRef(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    speedRef.current = speed;

    const reinitKeys = ['antialias', 'liquid', 'noiseAmount'];
    const cfg = { antialias, liquid, noiseAmount };
    const mustReinit = !threeRef.current || reinitKeys.some(k => prevConfigRef.current?.[k] !== cfg[k]);

    // ── props-only update (no THREE needed) ───────────────────────────────────
    if (!mustReinit) {
      const t = threeRef.current;
      t.uniforms['uShapeType'].value = SHAPE_MAP[variant] ?? 0;
      t.uniforms['uPixelSize'].value = pixelSize * t.renderer.getPixelRatio();
      t.uniforms['uColor'].value.set(color);
      t.uniforms['uScale'].value = patternScale;
      t.uniforms['uDensity'].value = patternDensity;
      t.uniforms['uPixelJitter'].value = pixelSizeJitter;
      t.uniforms['uEnableRipples'].value = enableRipples ? 1 : 0;
      t.uniforms['uRippleIntensity'].value = rippleIntensityScale;
      t.uniforms['uRippleThickness'].value = rippleThickness;
      t.uniforms['uRippleSpeed'].value = rippleSpeed;
      t.uniforms['uEdgeFade'].value = edgeFade;
      if (transparent) t.renderer.setClearAlpha(0); else t.renderer.setClearColor(0x000000, 1);
      if (t.touch) t.touch.radiusScale = liquidRadius;
      prevConfigRef.current = cfg;
      return;
    }

    // ── full reinit: dynamic-import THREE + postprocessing ────────────────────
    cancelRef.current = false;

    // Tear down previous instance before async init
    if (threeRef.current) {
      const t = threeRef.current;
      t.resizeObserver?.disconnect();
      cancelAnimationFrame(t.raf);
      t.quad?.geometry.dispose();
      t.material?.dispose();
      t.composer?.dispose();
      t.renderer?.dispose();
      t.renderer?.forceContextLoss();
      if (t.renderer?.domElement?.parentElement === container) container.removeChild(t.renderer.domElement);
      threeRef.current = null;
    }

    prevConfigRef.current = cfg;

    // Dynamic imports — Vite/Nitro won't trace these into the server bundle
    Promise.all([
      import('three'),
      import('postprocessing'),
    ]).then(([THREE, { Effect, EffectComposer, EffectPass, RenderPass }]) => {
      if (cancelRef.current) return;

      // ── touch texture (liquid) ──────────────────────────────────────────────
      const createTouchTexture = () => {
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, size, size);
        const texture = new THREE.Texture(canvas);
        texture.minFilter = texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        const trail = [];
        let last = null;
        const maxAge = 64;
        let radius = 0.1 * size;
        const spd = 1 / maxAge;
        const clear = () => { ctx.fillStyle = 'black'; ctx.fillRect(0, 0, size, size); };
        const drawPoint = p => {
          const pos = { x: p.x * size, y: (1 - p.y) * size };
          const easeOutSine = t => Math.sin((t * Math.PI) / 2);
          const easeOutQuad = t => -t * (t - 2);
          let intensity = p.age < maxAge * 0.3
            ? easeOutSine(p.age / (maxAge * 0.3))
            : easeOutQuad(1 - (p.age - maxAge * 0.3) / (maxAge * 0.7)) || 0;
          intensity *= p.force;
          const clr = `${((p.vx + 1) / 2) * 255},${((p.vy + 1) / 2) * 255},${intensity * 255}`;
          const offset = size * 5;
          ctx.shadowOffsetX = ctx.shadowOffsetY = offset;
          ctx.shadowBlur = radius;
          ctx.shadowColor = `rgba(${clr},${0.22 * intensity})`;
          ctx.beginPath();
          ctx.fillStyle = 'rgba(255,0,0,1)';
          ctx.arc(pos.x - offset, pos.y - offset, radius, 0, Math.PI * 2);
          ctx.fill();
        };
        const addTouch = norm => {
          let force = 0, vx = 0, vy = 0;
          if (last) {
            const dx = norm.x - last.x, dy = norm.y - last.y;
            if (dx === 0 && dy === 0) return;
            const d = Math.sqrt(dx * dx + dy * dy);
            vx = dx / (d || 1); vy = dy / (d || 1);
            force = Math.min((dx * dx + dy * dy) * 10000, 1);
          }
          last = { x: norm.x, y: norm.y };
          trail.push({ x: norm.x, y: norm.y, age: 0, force, vx, vy });
        };
        const update = () => {
          clear();
          for (let i = trail.length - 1; i >= 0; i--) {
            const pt = trail[i];
            const f = pt.force * spd * (1 - pt.age / maxAge);
            pt.x += pt.vx * f; pt.y += pt.vy * f; pt.age++;
            if (pt.age > maxAge) trail.splice(i, 1);
          }
          trail.forEach(drawPoint);
          texture.needsUpdate = true;
        };
        return {
          canvas, texture, addTouch, update,
          set radiusScale(v) { radius = 0.1 * size * v; },
          get radiusScale() { return radius / (0.1 * size); },
          size,
        };
      };

      // ── liquid effect ───────────────────────────────────────────────────────
      const createLiquidEffect = (tex, opts) => new Effect('LiquidEffect', `
        uniform sampler2D uTexture;uniform float uStrength;uniform float uTime;uniform float uFreq;
        void mainUv(inout vec2 uv){
          vec4 t=texture2D(uTexture,uv);float vx=t.r*2.-1.;float vy=t.g*2.-1.;float intensity=t.b;
          float wave=0.5+0.5*sin(uTime*uFreq+intensity*6.2831853);
          uv+=vec2(vx,vy)*uStrength*intensity*wave;
        }`, {
        uniforms: new Map([
          ['uTexture', new THREE.Uniform(tex)],
          ['uStrength', new THREE.Uniform(opts?.strength ?? 0.025)],
          ['uTime', new THREE.Uniform(0)],
          ['uFreq', new THREE.Uniform(opts?.freq ?? 4.5)],
        ]),
      });

      // ── renderer + scene ────────────────────────────────────────────────────
      const renderer = new THREE.WebGLRenderer({
        canvas: document.createElement('canvas'),
        antialias, alpha: true, powerPreference: 'high-performance',
      });
      renderer.domElement.style.cssText = 'width:100%;height:100%';
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      container.appendChild(renderer.domElement);
      if (transparent) renderer.setClearAlpha(0); else renderer.setClearColor(0x000000, 1);

      const uniforms = {
        uResolution: { value: new THREE.Vector2(0, 0) },
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uClickPos: { value: Array.from({ length: MAX_CLICKS }, () => new THREE.Vector2(-1, -1)) },
        uClickTimes: { value: new Float32Array(MAX_CLICKS) },
        uShapeType: { value: SHAPE_MAP[variant] ?? 0 },
        uPixelSize: { value: pixelSize * renderer.getPixelRatio() },
        uScale: { value: patternScale },
        uDensity: { value: patternDensity },
        uPixelJitter: { value: pixelSizeJitter },
        uEnableRipples: { value: enableRipples ? 1 : 0 },
        uRippleSpeed: { value: rippleSpeed },
        uRippleThickness: { value: rippleThickness },
        uRippleIntensity: { value: rippleIntensityScale },
        uEdgeFade: { value: edgeFade },
      };

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const material = new THREE.ShaderMaterial({
        vertexShader: VERTEX_SRC, fragmentShader: FRAGMENT_SRC,
        uniforms, transparent: true, depthTest: false, depthWrite: false,
        glslVersion: THREE.GLSL3,
      });
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
      scene.add(quad);
      const clock = new THREE.Clock();

      const setSize = () => {
        const w = container.clientWidth || 1, h = container.clientHeight || 1;
        renderer.setSize(w, h, false);
        uniforms['uResolution'].value.set(renderer.domElement.width, renderer.domElement.height);
        uniforms['uPixelSize'].value = pixelSize * renderer.getPixelRatio();
        threeRef.current?.composer?.setSize(renderer.domElement.width, renderer.domElement.height);
      };
      setSize();
      const ro = new ResizeObserver(setSize);
      ro.observe(container);

      const timeOffset = (window.crypto?.getRandomValues
        ? (() => { const u = new Uint32Array(1); window.crypto.getRandomValues(u); return u[0] / 0xffffffff; })()
        : Math.random()) * 1000;

      let composer, touch, liquidEffect;
      if (liquid) {
        touch = createTouchTexture();
        touch.radiusScale = liquidRadius;
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        liquidEffect = createLiquidEffect(touch.texture, { strength: liquidStrength, freq: liquidWobbleSpeed });
        const ep = new EffectPass(camera, liquidEffect);
        ep.renderToScreen = true;
        composer.addPass(ep);
      }
      if (noiseAmount > 0) {
        if (!composer) { composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera)); }
        const noiseEff = new Effect('NoiseEffect',
          `uniform float uTime;uniform float uAmount;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void mainUv(inout vec2 uv){}void mainImage(const in vec4 inputColor,const in vec2 uv,out vec4 outputColor){float n=hash(floor(uv*vec2(1920.,1080.))+floor(uTime*60.));outputColor=inputColor+vec4(vec3((n-.5)*uAmount),0.);}`,
          { uniforms: new Map([['uTime', new THREE.Uniform(0)], ['uAmount', new THREE.Uniform(noiseAmount)]]) });
        const np = new EffectPass(camera, noiseEff);
        np.renderToScreen = true;
        composer.passes.forEach(p => (p.renderToScreen = false));
        composer.addPass(np);
      }
      if (composer) composer.setSize(renderer.domElement.width, renderer.domElement.height);

      const mapPx = e => {
        const rect = renderer.domElement.getBoundingClientRect();
        return {
          fx: (e.clientX - rect.left) * (renderer.domElement.width / rect.width),
          fy: (rect.height - (e.clientY - rect.top)) * (renderer.domElement.height / rect.height),
          w: renderer.domElement.width, h: renderer.domElement.height,
        };
      };
      let clickIx = 0;
      const onPointerDown = e => {
        const { fx, fy } = mapPx(e);
        uniforms['uClickPos'].value[clickIx].set(fx, fy);
        uniforms['uClickTimes'].value[clickIx] = uniforms['uTime'].value;
        clickIx = (clickIx + 1) % MAX_CLICKS;
      };
      const onPointerMove = e => {
        if (!touch) return;
        const { fx, fy, w, h } = mapPx(e);
        touch.addTouch({ x: fx / w, y: fy / h });
      };
      renderer.domElement.addEventListener('pointerdown', onPointerDown, { passive: true });
      renderer.domElement.addEventListener('pointermove', onPointerMove, { passive: true });

      let raf = 0;
      const animate = () => {
        uniforms['uTime'].value = timeOffset + clock.getElapsedTime() * speedRef.current;
        if (liquidEffect) liquidEffect.uniforms.get('uTime').value = uniforms['uTime'].value;
        if (composer) { if (touch) touch.update(); composer.render(); }
        else renderer.render(scene, camera);
        raf = requestAnimationFrame(animate);
      };
      raf = requestAnimationFrame(animate);

      threeRef.current = { renderer, scene, camera, material, clock, uniforms, resizeObserver: ro, raf, quad, composer, touch, liquidEffect };
    });

    return () => {
      cancelRef.current = true;
      const t = threeRef.current;
      if (!t) return;
      t.resizeObserver?.disconnect();
      cancelAnimationFrame(t.raf);
      t.quad?.geometry.dispose();
      t.material?.dispose();
      t.composer?.dispose();
      t.renderer?.dispose();
      t.renderer?.forceContextLoss();
      if (t.renderer?.domElement?.parentElement === container) container.removeChild(t.renderer.domElement);
      threeRef.current = null;
    };
  }, [antialias, liquid, noiseAmount, pixelSize, patternScale, patternDensity, enableRipples,
      rippleIntensityScale, rippleThickness, rippleSpeed, pixelSizeJitter, edgeFade, transparent,
      liquidStrength, liquidRadius, liquidWobbleSpeed, autoPauseOffscreen, variant, color, speed]);

  return (
    <div
      ref={containerRef}
      className={`pixel-blast-container ${className ?? ''}`}
      style={style}
      aria-hidden="true"
    />
  );
};

export default PixelBlast;
