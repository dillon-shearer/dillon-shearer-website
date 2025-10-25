// app/demos/gym-dashboard/ui/BodyDiagram.tsx
'use client'

/**
 * Body Focus 3D — plate-driven highlighting
 * This rev:
 * - Feet: custom extruded rounded-rectangle soles (smooth + wide).
 * - Hips: side-only plates.
 * - Shoulders: bubble-like capsule plates embedded on the OUTSIDE of the upper arms.
 * - Back plate rectangular; calves/hamstrings smaller; glutes color the base.
 * - **BLACK GLASSES restored on the head.**
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, RoundedBox, Environment } from '@react-three/drei'

export type BodyPart =
  | 'biceps' | 'chest' | 'shoulders' | 'back' | 'triceps'
  | 'quads' | 'hamstrings' | 'forearms' | 'core'
  | 'glutes' | 'calves' | 'hips'

type Stats = Partial<Record<BodyPart, { volume: number; sets: number }>>
type Metric = 'sets' | 'volume'

export default function BodyDiagram({
  stats,
  className = '',
  metric = 'sets',
}: {
  stats: Stats
  className?: string
  metric?: Metric
}) {
  const [webglOK, setWebglOK] = useState(true)
  useEffect(() => {
    try {
      const c = document.createElement('canvas')
      const gl = c.getContext('webgl') || c.getContext('experimental-webgl')
      setWebglOK(!!gl)
    } catch {
      setWebglOK(false)
    }
  }, [])

  const ALL_PARTS: BodyPart[] = useMemo(
    () => ['biceps','chest','shoulders','back','triceps','quads','hamstrings','forearms','core','glutes','calves','hips'],
    [],
  )

  const maxVal = useMemo(() => {
    const vals = ALL_PARTS
      .map(p => (metric === 'sets' ? stats?.[p]?.sets : stats?.[p]?.volume))
      .filter((v): v is number => typeof v === 'number' && v > 0)
    return Math.max(1, ...(vals.length ? vals : [1]))
  }, [stats, metric, ALL_PARTS])

  const hasPart = (p: BodyPart) => stats && Object.prototype.hasOwnProperty.call(stats, p)
  const valueFor = (p: BodyPart) => (metric === 'sets' ? (stats?.[p]?.sets ?? 0) : (stats?.[p]?.volume ?? 0))

  const GAMMA = 1.6
  const intensity = (p: BodyPart) => {
    const v = valueFor(p)
    const lin = Math.max(0, Math.min(1, v / maxVal))
    return Math.pow(lin, GAMMA)
  }

  const hslToHex = (h: number, s: number, l: number) => {
    s /= 100; l /= 100
    const k = (n: number) => (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    const toHex = (x: number) => Math.round(255 * x).toString(16).padStart(2, '0')
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
  }

  const colorFor = (i: number) => {
    const hue = 120 * i
    const sat = 64
    const lig = 48 + 6 * i
    return hslToHex(hue, sat, lig)
  }

  const BASE_WHITE = '#f7f9fc'
  const DEEP_RED   = '#b11226'
  const baseMat = <meshStandardMaterial color={BASE_WHITE} roughness={0.85} metalness={0.03} />
  const plateMatFor = (p: BodyPart) => {
    if (!hasPart(p)) {
      return <meshStandardMaterial color={DEEP_RED} roughness={0.55} metalness={0.05} />
    }
    const i = intensity(p)
    const color = valueFor(p) <= 0 ? DEEP_RED : (i < 0.12 ? '#c41a1a' : colorFor(i))
    return <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} />
  }

  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Body Focus</h3>
        <div className="text-[11px] text-gray-400">Red = neglected · Green = worked</div>
      </div>

      <div className="relative flex-1 rounded-lg border border-gray-800 bg-gray-950 aspect-[5/9] min-h-[360px] md:min-h-[440px] lg:min-h-[520px]">
        {webglOK ? (
          <Canvas dpr={[1, 2]} camera={{ position: [0, 1.4, 7], fov: 39 }} style={{ width: '100%', height: '100%' }}>
            <ambientLight intensity={0.7} />
            <directionalLight position={[5, 7, 6]} intensity={1.0} />
            <directionalLight position={[-6, 3, -6]} intensity={0.45} color="#a8c3ff" />
            <Environment preset="city" environmentIntensity={0.3} />

            <AutoSpin>
              <FigurePlatesOnly plate={plateMatFor} base={baseMat} />
            </AutoSpin>

            <OrbitControls
              enableZoom={false}
              enablePan={false}
              minPolarAngle={Math.PI * 0.18}
              maxPolarAngle={Math.PI * 0.82}
              autoRotate
              autoRotateSpeed={0.5}
              target={[0, 0.15, 0]}
            />
          </Canvas>
        ) : (
          <SvgFallback />
        )}
      </div>
    </div>
  )
}

function AutoSpin({ children, paused = false }: { children: React.ReactNode; paused?: boolean }) {
  const ref = useRef<any>(null)
  useFrame((_, d) => { if (!paused && ref.current) ref.current.rotation.y += d * 0.22 })
  return <group ref={ref}>{children}</group>
}

/* ------------------------- helpers: rounded foot ------------------------- */

function makeRoundedRectShape(w: number, h: number, r: number) {
  const shape = new THREE.Shape()
  const rr = Math.min(r, w / 2, h / 2)
  const x = -w / 2
  const y = -h / 2
  shape.moveTo(x + rr, y)
  shape.lineTo(x + w - rr, y)
  shape.quadraticCurveTo(x + w, y, x + w, y + rr)
  shape.lineTo(x + w, y + h - rr)
  shape.quadraticCurveTo(x + w, y + h, x + w - rr, y + h)
  shape.lineTo(x + rr, y + h)
  shape.quadraticCurveTo(x, y + h, x, y + h - rr)
  shape.lineTo(x, y + rr)
  shape.quadraticCurveTo(x, y, x + rr, y)
  return shape
}

function useFootGeometry() {
  // Width (X) x Length (Z) x Thickness (Y)
  const w = 0.3
  const l = 0.55
  const t = 0.18
  const r = 0.14
  return useMemo(() => {
    const shape = makeRoundedRectShape(w, l, r)
    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: t,
      bevelEnabled: true,
      bevelThickness: Math.min(0.06, t * 0.35),
      bevelSize: 0.06,
      bevelSegments: 4,
      curveSegments: 24,
    })
    geom.rotateX(Math.PI / 2) // thickness along Y, length along Z
    geom.center()
    return geom
  }, [])
}

/* --------------------------------- Figure --------------------------------- */

function FigurePlatesOnly({
  plate,
  base,
}: {
  plate: (p: BodyPart) => JSX.Element
  base: JSX.Element
}) {
  // Plate offsets
  const Z_TORSO   = 0.281
  const Z_ARM_F   = 0.191
  const Z_ARM_B   = -0.191
  const Z_THIGH_F = 0.241
  const Z_THIGH_B = -0.241
  const Z_SHIN_B  = -0.205 // calves moved to back

  const footGeom = useFootGeometry()

  return (
    <group position={[0, 0, 0]} scale={0.98}>
      {/* HEAD / NECK */}
      <group position={[0, 1.78, 0]}>
        <RoundedBox args={[0.44, 0.44, 0.44]} radius={0.1} smoothness={6} castShadow receiveShadow>
          {base}
        </RoundedBox>

        {/* ==== BLACK GLASSES ==== */}
        <group position={[0, -0.02, 0.26]}>
          {/* left lens */}
          <RoundedBox args={[0.16, 0.10, 0.02]} radius={0.05} position={[-0.12, 0, 0]}>
            <meshStandardMaterial color="#000000" roughness={0.15} metalness={0.1} opacity={0.95} transparent />
          </RoundedBox>
          {/* right lens */}
          <RoundedBox args={[0.16, 0.10, 0.02]} radius={0.05} position={[0.12, 0, 0]}>
            <meshStandardMaterial color="#000000" roughness={0.15} metalness={0.1} opacity={0.95} transparent />
          </RoundedBox>
          {/* bridge */}
          <RoundedBox args={[0.06, 0.02, 0.02]} radius={0.01}>
            <meshStandardMaterial color="#000000" />
          </RoundedBox>
          {/* temples */}
          <RoundedBox args={[0.02, 0.02, 0.08]} radius={0.01} position={[-0.20, 0, -0.01]}>
            <meshStandardMaterial color="#000000" />
          </RoundedBox>
          <RoundedBox args={[0.02, 0.02, 0.08]} radius={0.01} position={[0.20, 0, -0.01]}>
            <meshStandardMaterial color="#000000" />
          </RoundedBox>
        </group>
        {/* ======================= */}
      </group>

      <group position={[0, 1.53, 0]}>
        <RoundedBox args={[0.22, 0.18, 0.22]} radius={0.06} castShadow receiveShadow>
          {base}
        </RoundedBox>
      </group>

      {/* TORSO (base) */}
      <group position={[0, 1.05, 0]}>
        <RoundedBox args={[1.12, 0.92, 0.54]} radius={0.14} smoothness={7} castShadow receiveShadow>
          {base}
        </RoundedBox>

        {/* CHEST */}
        <group position={[-0.26, 0.17, Z_TORSO]}>
          <RoundedBox args={[0.56, 0.34, 0.06]} radius={0.08} smoothness={6} castShadow receiveShadow>
            {plate('chest')}
          </RoundedBox>
        </group>
        <group position={[0.26, 0.17, Z_TORSO]}>
          <RoundedBox args={[0.56, 0.34, 0.06]} radius={0.08} smoothness={6} castShadow receiveShadow>
            {plate('chest')}
          </RoundedBox>
        </group>

        {/* CORE */}
        <group position={[0, -0.18, Z_TORSO]}>
          <RoundedBox args={[0.50, 0.42, 0.06]} radius={0.08} smoothness={6} castShadow receiveShadow>
            {plate('core')}
          </RoundedBox>
        </group>

        {/* BACK — rectangular plate */}
        <group position={[0, 0.0, -Z_TORSO]}>
          <RoundedBox args={[1.02, 0.72, 0.06]} radius={0.08} smoothness={6} castShadow receiveShadow>
            {plate('back')}
          </RoundedBox>
        </group>
      </group>

      {/* SHOULDERS — white caps ONLY */}
      <group position={[-0.70, 1.28, 0]}>
        <RoundedBox args={[0.30, 0.24, 0.40]} radius={0.10} smoothness={7} castShadow receiveShadow>{base}</RoundedBox>
      </group>
      <group position={[0.70, 1.28, 0]}>
        <RoundedBox args={[0.30, 0.24, 0.40]} radius={0.10} smoothness={7} castShadow receiveShadow>{base}</RoundedBox>
      </group>

      {/* UPPER ARMS with plates */}
      {/* LEFT */}
      <group position={[-0.98, 1.0, 0]}>
        <RoundedBox args={[0.36, 0.82, 0.36]} radius={0.12} smoothness={6} castShadow receiveShadow>{base}</RoundedBox>

        {/* Bubble shoulder plate on OUTSIDE of upper arm (lateral delt) */}
        <group position={[-0.185, 0.22, 0]}>
          <mesh scale={[1, 1, 0.72]} castShadow receiveShadow>
            <capsuleGeometry args={[0.125, 0.125, 25, 22]} />
            {plate('shoulders')}
          </mesh>
        </group>

        {/* Biceps mid-front */}
        <group position={[0, 0.00, Z_ARM_F]}>
          <RoundedBox args={[0.28, 0.46, 0.05]} radius={0.08} smoothness={5} castShadow receiveShadow>
            {plate('biceps')}
          </RoundedBox>
        </group>
        {/* Triceps rear */}
        <group position={[0, 0.04, Z_ARM_B]}>
          <RoundedBox args={[0.28, 0.56, 0.05]} radius={0.08} smoothness={5} castShadow receiveShadow>
            {plate('triceps')}
          </RoundedBox>
        </group>
      </group>

      {/* RIGHT */}
      <group position={[0.98, 1.0, 0]}>
        <RoundedBox args={[0.36, 0.82, 0.36]} radius={0.12} smoothness={6} castShadow receiveShadow>{base}</RoundedBox>

        {/* Bubble shoulder plate on OUTSIDE of upper arm (lateral delt) */}
        <group position={[0.185, 0.22, 0]}>
          <mesh scale={[1, 1, 0.72]} castShadow receiveShadow>
            <capsuleGeometry args={[0.125, 0.125, 25, 22]} />
            {plate('shoulders')}
          </mesh>
        </group>

        <group position={[0, 0.00, Z_ARM_F]}>
          <RoundedBox args={[0.28, 0.46, 0.05]} radius={0.08} smoothness={5} castShadow receiveShadow>
            {plate('biceps')}
          </RoundedBox>
        </group>
        <group position={[0, 0.04, Z_ARM_B]}>
          <RoundedBox args={[0.28, 0.56, 0.05]} radius={0.08} smoothness={5} castShadow receiveShadow>
            {plate('triceps')}
          </RoundedBox>
        </group>
      </group>

      {/* FOREARMS — base only */}
      <group position={[-0.98, 0.42, 0]}>
        <RoundedBox args={[0.32, 0.72, 0.32]} radius={0.12} smoothness={6} castShadow receiveShadow>{base}</RoundedBox>
      </group>
      <group position={[0.98, 0.42, 0]}>
        <RoundedBox args={[0.32, 0.72, 0.32]} radius={0.12} smoothness={6} castShadow receiveShadow>{base}</RoundedBox>
      </group>

      {/* HANDS */}
      <group position={[-0.98, -0.02, 0]}>
        <RoundedBox args={[0.34, 0.22, 0.34]} radius={0.10} castShadow receiveShadow>{base}</RoundedBox>
      </group>
      <group position={[0.98, -0.02, 0]}>
        <RoundedBox args={[0.34, 0.22, 0.34]} radius={0.10} castShadow receiveShadow>{base}</RoundedBox>
      </group>

      {/* HIPS — side-only plates */}
      <group position={[0, 0.52, 0]}>
        <RoundedBox args={[1.06, 0.30, 0.50]} radius={0.12} smoothness={7} castShadow receiveShadow>{base}</RoundedBox>

        {/* Left side */}
        <group position={[-0.62, 0.12, 0]} rotation={[0, Math.PI / 2, 0]}>
          <RoundedBox args={[0.60, 0.22, 0.05]} radius={0.09} smoothness={6} castShadow receiveShadow>
            {plate('hips')}
          </RoundedBox>
        </group>
        {/* Right side */}
        <group position={[0.62, 0.12, 0]} rotation={[0, Math.PI / 2, 0]}>
          <RoundedBox args={[0.60, 0.22, 0.05]} radius={0.09} smoothness={6} castShadow receiveShadow>
            {plate('hips')}
          </RoundedBox>
        </group>
      </group>

      {/* GLUTES */}
      <group position={[-0.28, 0.24, -0.26]}>
        <RoundedBox args={[0.44, 0.34, 0.30]} radius={0.14} smoothness={6} castShadow receiveShadow>
          {plate('glutes')}
        </RoundedBox>
      </group>
      <group position={[0.28, 0.24, -0.26]}>
        <RoundedBox args={[0.44, 0.34, 0.30]} radius={0.14} smoothness={6} castShadow receiveShadow>
          {plate('glutes')}
        </RoundedBox>
      </group>

      {/* THIGHS */}
      <group position={[-0.40, 0.02, 0]}>
        <RoundedBox args={[0.46, 1.12, 0.46]} radius={0.14} smoothness={7} castShadow receiveShadow>{base}</RoundedBox>
        <group position={[0, -0.06, Z_THIGH_F]}>
          <RoundedBox args={[0.42, 1.00, 0.06]} radius={0.10} smoothness={6} castShadow receiveShadow>
            {plate('quads')}
          </RoundedBox>
        </group>
        <group position={[0, 0, Z_THIGH_B]}>
          <RoundedBox args={[0.294, 0.756, 0.06]} radius={0.10} smoothness={6} castShadow receiveShadow>
            {plate('hamstrings')}
          </RoundedBox>
        </group>
      </group>
      <group position={[0.40, 0.02, 0]}>
        <RoundedBox args={[0.46, 1.12, 0.46]} radius={0.14} smoothness={7} castShadow receiveShadow>{base}</RoundedBox>
        <group position={[0, -0.06, Z_THIGH_F]}>
          <RoundedBox args={[0.42, 1.00, 0.06]} radius={0.10} smoothness={6} castShadow receiveShadow>
            {plate('quads')}
          </RoundedBox>
        </group>
        <group position={[0, 0, Z_THIGH_B]}>
          <RoundedBox args={[0.294, 0.756, 0.06]} radius={0.10} smoothness={6} castShadow receiveShadow>
            {plate('hamstrings')}
          </RoundedBox>
        </group>
      </group>

      {/* CALVES — back plates */}
      <group position={[-0.40, -0.86, 0]}>
        <RoundedBox args={[0.38, 0.92, 0.38]} radius={0.14} smoothness={7} castShadow receiveShadow>{base}</RoundedBox>
        <group position={[0, 0, Z_SHIN_B]}>
          <RoundedBox args={[0.238, 0.602, 0.04]} radius={0.10} smoothness={6} castShadow receiveShadow>
            {plate('calves')}
          </RoundedBox>
        </group>
      </group>
      <group position={[0.40, -0.86, 0]}>
        <RoundedBox args={[0.38, 0.92, 0.38]} radius={0.14} smoothness={7} castShadow receiveShadow>{base}</RoundedBox>
        <group position={[0, 0, Z_SHIN_B]}>
          <RoundedBox args={[0.238, 0.602, 0.04]} radius={0.10} smoothness={6} castShadow receiveShadow>
            {plate('calves')}
          </RoundedBox>
        </group>
      </group>

      {/* FEET */}
      <group position={[-0.42, -1.46, 0.08]}>
        <mesh geometry={footGeom} castShadow receiveShadow>
          {base}
        </mesh>
      </group>
      <group position={[0.42, -1.46, 0.08]}>
        <mesh geometry={footGeom} castShadow receiveShadow>
          {base}
        </mesh>
      </group>
    </group>
  )
}

/* ------------------------------ Fallback ------------------------------ */

function SvgFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <svg viewBox="0 0 200 320" className="w-[62%] drop-shadow-lg">
        <defs>
          <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#122033" />
            <stop offset="100%" stopColor="#0b1220" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="200" height="320" fill="url(#g)" rx="16" />
        <rect x="78" y="26" width="44" height="44" rx="10" fill="#f7f9fc" />
        <rect x="50" y="78" width="100" height="84" rx="14" fill="#b11226" />
        <text x="100" y="300" textAnchor="middle" fontSize="10" fill="#9ca3af">WebGL unavailable – static body</text>
      </svg>
    </div>
  )
}
