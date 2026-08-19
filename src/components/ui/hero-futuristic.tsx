import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import { useAspect, useTexture } from '@react-three/drei';
import { useMemo, useRef, useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import * as THREE from 'three/webgpu';
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js';
import type { Mesh } from 'three';

import {
  abs,
  blendScreen,
  float,
  mod,
  mx_cell_noise_float,
  oneMinus,
  smoothstep,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
  pass,
  mix,
  add,
} from 'three/tsl';

const TEXTUREMAP = { src: 'https://i.postimg.cc/XYwvXN8D/img-4.png' };
const DEPTHMAP = { src: 'https://i.postimg.cc/2SHKQh2q/raw-4.webp' };

extend(THREE as any);

const PostProcessing = ({
  strength = 1,
  threshold = 1,
  fullScreenEffect = true,
}: {
  strength?: number;
  threshold?: number;
  fullScreenEffect?: boolean;
}) => {
  const { gl, scene, camera } = useThree();
  const progressRef = useRef({ value: 0 });

  const render = useMemo(() => {
    const postProcessing = new THREE.PostProcessing(gl as any);
    const scenePass = pass(scene, camera);
    const scenePassColor = scenePass.getTextureNode('output');
    const bloomPass = bloom(scenePassColor, strength, 0.5, threshold);

    const uScanProgress = uniform(0);
    progressRef.current = uScanProgress;

    const scanPos = float(uScanProgress.value);
    const uvY = uv().y;
    const scanWidth = float(0.05);
    const scanLine = smoothstep(0, scanWidth, abs(uvY.sub(scanPos)));
    const redOverlay = vec3(1, 0, 0).mul(oneMinus(scanLine)).mul(0.4);

    const withScanEffect = mix(
      scenePassColor,
      add(scenePassColor, redOverlay),
      fullScreenEffect ? smoothstep(0.9, 1.0, oneMinus(scanLine)) : 1.0
    );

    const final = withScanEffect.add(bloomPass);
    postProcessing.outputNode = final;

    return postProcessing;
  }, [camera, gl, scene, strength, threshold, fullScreenEffect]);

  useFrame(({ clock }) => {
    progressRef.current.value = Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5;
    render.renderAsync();
  }, 1);

  return null;
};

const WIDTH = 300;
const HEIGHT = 300;

const Scene = () => {
  const [rawMap, depthMap] = useTexture([TEXTUREMAP.src, DEPTHMAP.src]);
  const meshRef = useRef<Mesh>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (rawMap && depthMap) setVisible(true);
  }, [rawMap, depthMap]);

  const { material, uniforms } = useMemo(() => {
    const uPointer = uniform(new THREE.Vector2(0));
    const uProgress = uniform(0);
    const strength = 0.01;

    const tDepthMap = texture(depthMap);
    const tMap = texture(rawMap, uv().add(tDepthMap.r.mul(uPointer).mul(strength)));

    const aspect = float(WIDTH).div(HEIGHT);
    const tUv = vec2(uv().x.mul(aspect), uv().y);
    const tiling = vec2(120.0);
    const tiledUv = mod(tUv.mul(tiling), 2.0).sub(1.0);
    const brightness = mx_cell_noise_float(tUv.mul(tiling).div(2));
    const dist = float(tiledUv.length());
    const dot = float(smoothstep(0.5, 0.49, dist)).mul(brightness);
    const depth = tDepthMap;
    const flow = oneMinus(smoothstep(0, 0.02, abs(depth.sub(uProgress))));
    const mask = dot.mul(flow).mul(vec3(10, 0, 0));
    const final = blendScreen(tMap, mask);

    const material = new THREE.MeshBasicNodeMaterial({
      colorNode: final,
      transparent: true,
      opacity: 0,
    });

    return { material, uniforms: { uPointer, uProgress } };
  }, [rawMap, depthMap]);

  const [w, h] = useAspect(WIDTH, HEIGHT);

  useFrame(({ clock }) => {
    uniforms.uProgress.value = Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5;
    if (meshRef.current?.material) {
      const mat = meshRef.current.material as any;
      if ('opacity' in mat) {
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, visible ? 1 : 0, 0.07);
      }
    }
  });

  useFrame(({ pointer }) => {
    uniforms.uPointer.value = pointer;
  });

  return (
    <mesh ref={meshRef} scale={[w * 0.4, h * 0.4, 1]} material={material}>
      <planeGeometry />
    </mesh>
  );
};

const TITLE_WORDS = ['Timed', 'assignments.', 'Zero', 'tampering.'];
const SUBTITLE =
  'One encrypted link per candidate. The clock starts server-side the moment they open it — and closes itself exactly on time.';

function CanvasScene() {
  return (
    <Canvas
      flat
      gl={async (props) => {
        const renderer = new THREE.WebGPURenderer(props as any);
        await renderer.init();
        return renderer;
      }}
    >
      <PostProcessing fullScreenEffect={true} />
      <Scene />
    </Canvas>
  );
}

export function HeroFuturistic() {
  const [mounted, setMounted] = useState(false);
  const [visibleWords, setVisibleWords] = useState(0);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [delays, setDelays] = useState<number[]>([]);

  useEffect(() => {
    setMounted(true);
    setDelays(TITLE_WORDS.map(() => Math.random() * 0.07));
  }, []);

  useEffect(() => {
    if (visibleWords < TITLE_WORDS.length) {
      const t = setTimeout(() => setVisibleWords((v) => v + 1), 480);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setSubtitleVisible(true), 600);
    return () => clearTimeout(t);
  }, [visibleWords]);

  return (
    <div className="relative h-svh overflow-hidden bg-black">
      {/* Title — upper area, above the 3D model */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center pt-28 px-10 sm:pt-32">
        <h1
          className="text-center text-4xl font-extrabold uppercase tracking-tight text-white sm:text-6xl xl:text-7xl"
          style={{ textShadow: '0 2px 40px rgba(0,0,0,0.8)' }}
        >
          <span className="flex flex-wrap justify-center gap-x-3 leading-tight lg:gap-x-5">
            {TITLE_WORDS.map((word, i) => (
              <span
                key={i}
                className={i < visibleWords ? 'hero-fade-in' : ''}
                style={{
                  animationDelay: `${i * 0.12 + (delays[i] ?? 0)}s`,
                  opacity: i < visibleWords ? undefined : 0,
                  display: 'inline-block',
                }}
              >
                {word}
              </span>
            ))}
          </span>
        </h1>
      </div>

      {/* Subtitle + CTA — bottom area, below the 3D model */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center pb-16 px-10">
        <p
          className={`max-w-sm text-center text-sm font-medium leading-relaxed normal-case sm:text-base ${subtitleVisible ? 'hero-fade-in-sub' : ''}`}
          style={{
            opacity: subtitleVisible ? undefined : 0,
            color: 'rgba(255,255,255,0.8)',
            textShadow: '0 2px 20px rgba(0,0,0,1), 0 0 60px rgba(0,0,0,0.9)',
          }}
        >
          {SUBTITLE}
        </p>

        <div className="pointer-events-auto mt-6">
          <Link
            to="/auth"
            className={`cta-glow inline-flex px-6 py-2.5 text-sm font-medium normal-case ${subtitleVisible ? 'hero-fade-in-sub' : ''}`}
            style={{
              opacity: subtitleVisible ? undefined : 0,
              animationDelay: '0.25s',
            }}
          >
            Open admin console
          </Link>
        </div>
      </div>

      {/* WebGPU canvas — client-only */}
      {mounted && <CanvasScene />}
    </div>
  );
}

export default HeroFuturistic;
