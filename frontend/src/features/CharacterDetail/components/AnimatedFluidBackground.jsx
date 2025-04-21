// src/features/CharacterDetail/components/AnimatedFluidBackground.jsx
import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ShaderMaterial } from 'three';
import glsl from 'babel-plugin-glsl/macro';

function FluidPlane() {
  const matRef = useRef();

  // Создаём шейдерный материал один раз
  const material = useMemo(() => new ShaderMaterial({
    uniforms: {
      uTime:       { value: 0 },
      uResolution: { value: [window.innerWidth / 2, window.innerHeight / 2] },
    },
    vertexShader: glsl`
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: glsl`
      precision highp float;
      uniform float uTime;
      uniform vec2 uResolution;

      // Базовые функции шума
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123);
      }
      float noise(in vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i + vec2(0.0,0.0));
        float b = hash(i + vec2(1.0,0.0));
        float c = hash(i + vec2(0.0,1.0));
        float d = hash(i + vec2(1.0,1.0));
        vec2 u = f*f*(3.0-2.0*f);
        return mix(a,b,u.x) + (c - a)*u.y*(1.0 - u.x) + (d - b)*u.x*u.y;
      }
      float fbm(vec2 p) {
        float f = 0.0;
        f += 0.5000 * noise(p); p *= 1.32;
        f += 0.2500 * noise(p); p *= 2.03;
        f += 0.1250 * noise(p); p *= 5.01;
        f += 0.0625 * noise(p);
        return f;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / uResolution;

        // Добавляем хаотичный смещающий вектор
        float angle = noise(uv * 3.0 + uTime * 0.1) * 6.2831;
        float radius = 0.05;
        vec2 swirl = vec2(cos(angle), sin(angle)) * radius;

        // Основное движение с хаосом
        vec2 p = uv * 8.0 + vec2(uTime * 0.4, -uTime * 0.6) + swirl;

        float f1 = fbm(p);
        float f2 = fbm(p + vec2(5.2,1.3));
        float flowRaw = mix(f1, f2, 0.5);
        float flow = pow(smoothstep(0.2, 0.7, flowRaw), 1.3);

        vec3 baseCol = vec3(0.227,0.294,0.325);
        vec3 hl1     = vec3(0.424,0.537,0.553);
        vec3 hl2     = vec3(0.480,0.576,0.611);
        vec3 hl3     = vec3(0.353,0.441,0.478);
        vec3 hl      = mix(hl1, hl2, smoothstep(0.4,0.6,f2));
        hl           = mix(hl, hl3, smoothstep(0.6,0.8,f1));
        vec3 col     = mix(baseCol, hl, flow);

        gl_FragColor = vec4(col, 1.0);
      }
    `
  }), []);

  // Обновляем время анимации
  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  // Обработка ресайза
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth / 2;
      const h = window.innerHeight / 2;
      if (matRef.current) {
        matRef.current.uniforms.uResolution.value = [w, h];
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <mesh>
      {/* Чуть больше, чтобы туман выходил за границы */}
      <planeGeometry args={[2.2, 2.2]} />
      <primitive object={material} attach="material" ref={matRef} />
    </mesh>
  );
}

const AnimatedFluidBackground = () => (
  <div style={{
    position: 'absolute', top: 0, left: 0,
    width: '100%', height: '100%',
    borderRadius: '12px', overflow: 'hidden', pointerEvents: 'none'
  }}>
    <Canvas
      style={{
        position: 'absolute', top: '-5%', left: '-5%',
        width: '110%', height: '110%', zIndex: 0,
        filter: 'blur(10px)', opacity: 0.9,
        borderRadius: 'inherit', overflow: 'visible'
      }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, 1], fov: 75, near: 0.1, far: 10 }}
    >
      <FluidPlane />
    </Canvas>
  </div>
);

export default AnimatedFluidBackground;
