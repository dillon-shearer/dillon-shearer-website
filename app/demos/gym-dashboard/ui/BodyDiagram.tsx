// app/demos/gym-dashboard/ui/BodyDiagram.tsx
'use client'

/**
 * Body Focus 3D — Split-aware thresholds (per-body-part, matches your PPL map)
 *
 * Thresholds scale by how many times the *relevant split* (Push/Pull/Legs)
 * happened in the current window.
 *
 * Example with greenAt=8, yellowAt=5:
 *  - If there was 1 Push day in-range → targets: green=8, yellow=5
 *  - If there were 2 Push days in-range → targets: green=16, yellow=10
 *  This applies per split and therefore per body part, using your mapping:
 *    Push: chest, biceps, shoulders
 *    Pull: back, triceps, core, forearms
 *    Legs: quads, hamstrings, glutes, calves, hips
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
type SplitKey = 'Push' | 'Pull' | 'Legs'

export default function BodyDiagram({
  stats,
  className = '',
  greenAt = 5,
  yellowAt = 3,
  splitFactor = 1,
  splitCounts,
}: {
  stats: Stats
  className?: string
  greenAt?: number
  yellowAt?: number
  splitFactor?: number
  splitCounts?: Partial<Record<SplitKey, number>>
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

  // ---- PPL bucket map (MATCHES your server defaults) -----------------------
  const splitBucketFor = (p: BodyPart): SplitKey => {
    if (p === 'chest' || p === 'biceps' || p === 'shoulders') return 'Push'
    if (p === 'back' || p === 'triceps' || p === 'core' || p === 'forearms') return 'Pull'
    return 'Legs'
  }

  const splitsForPart = (p: BodyPart) => {
    const bucket = splitBucketFor(p)
    const base = Math.max(1, Number(splitCounts?.[bucket] ?? 1))
    const sf = Number.isFinite(splitFactor) && splitFactor > 0 ? splitFactor : 1
    return base * sf
  }

  const rawSets = (p: BodyPart) => (stats?.[p]?.sets ?? 0)

  const GREEN = '#22c55e'
  const YELLOW = '#eab308'
  const RED = '#ef4444'
  const BASE_WHITE = '#f7f9fc'

  const colorFor = (p: BodyPart) => {
    const s = rawSets(p)
    if (s <= 0) return RED
    const k = splitsForPart(p)
    const targetGreen = greenAt * k
    const targetYellow = yellowAt * k
    if (s > targetGreen) return GREEN
    if (s >= targetYellow) return YELLOW
    return RED
  }

  const baseMat = <meshStandardMaterial color={BASE_WHITE} roughness={0.85} metalness={0.03} />
  const badgeMatFor = (p: BodyPart) => <meshStandardMaterial color={colorFor(p)} roughness={0.55} metalness={0.05} />

  return (
    <div className={`bg-white/[0.02] border border-white/10 rounded-xl p-5 flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-4 gap-2">
        <h3 className="text-base sm:text-lg font-bold tracking-tight">Body Focus</h3>
        <InfoTooltip>
          <div className="max-w-[320px] space-y-2">
            <div className="text-[11px] uppercase tracking-wide text-gray-300">Color Formula</div>

            <div className="text-xs text-gray-200">
              <div className="font-semibold mb-0.5">Gym bro version</div>
              <div>
                More days working a split = the target moves up for those body parts. You need to beat{' '}
                <span className="font-semibold">greenAt × splitDays</span> to go green, hit at least{' '}
                <span className="font-semibold">yellowAt × splitDays</span> to be yellow; otherwise you’re red.
              </div>
            </div>

            <div className="text-xs text-gray-300/90">
              <div className="font-semibold mb-0.5">Technical version</div>
              <div className="space-y-1.5">
                <div>
                  For each body part <code>p</code>, let <code>splitDays(p)</code> be the count of days in-range whose
                  majority tag matches <code>p</code>’s split (Push/Pull/Legs). Let{' '}
                  <code>k = splitDays(p) × splitFactor</code> (with <code>splitFactor</code> ≥ 1 by default).
                </div>
                <div>
                  Targets: <code>greenTarget = greenAt × k</code>, <code>yellowTarget = yellowAt × k</code>.
                </div>
                <div>
                  Coloring: if <code>sets(p) &gt; greenTarget</code> → <span style={{color: GREEN}}>green</span>; else if{' '}
                  <code>sets(p) ≥ yellowTarget</code> → <span style={{color: YELLOW}}>yellow</span>; else{' '}
                  <span style={{color: RED}}>red</span>. Zero sets is always red.
                </div>
              </div>
            </div>

            <div className="text-[11px] text-gray-400/90">
              Current params: <code>greenAt={greenAt}</code>, <code>yellowAt={yellowAt}</code>,{' '}
              <code>splitFactor={splitFactor}</code>; splitDays = Push:{splitCounts?.Push ?? 0} /
              Pull:{splitCounts?.Pull ?? 0} / Legs:{splitCounts?.Legs ?? 0}
            </div>
          </div>
        </InfoTooltip>
      </div>

      <div className="relative flex-1 rounded-lg border border-white/5 bg-black/40 aspect-[5/9] min-h-[360px] md:min-h-[440px] lg:min-h-[520px]">
        {webglOK ? (
          <Canvas dpr={[1, 2]} camera={{ position: [0, 1.4, 7], fov: 39 }} style={{ width: '100%', height: '100%' }}>
            <ambientLight intensity={0.7} />
            <directionalLight position={[5, 7, 6]} intensity={1.0} />
            <directionalLight position={[-6, 3, -6]} intensity={0.45} color="#a8c3ff" />
            <Environment preset="city" environmentIntensity={0.3} />

            <AutoSpin>
              <FigureSolidEmbedded badge={badgeMatFor} base={baseMat} />
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
  const w = 0.3, l = 0.55, t = 0.18, r = 0.14
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
    geom.rotateX(Math.PI / 2)
    geom.center()
    return geom
  }, [])
}

/* --------------------------------- Figure --------------------------------- */
function FigureSolidEmbedded({
  badge,
  base,
}: {
  badge: (p: BodyPart) => JSX.Element
  base: JSX.Element
}) {
  const Z_TORSO = 0.18
  const footGeom = useFootGeometry()

  return (
    <group position={[0, 0, 0]} scale={0.98}>
      {/* HEAD / NECK + GLASSES */}
      <group position={[0, 1.78, 0]}>
        <RoundedBox args={[0.44, 0.44, 0.44]} radius={0.1} smoothness={6} castShadow receiveShadow>
          {base}
        </RoundedBox>
        <group position={[0, -0.02, 0.26]}>
          <RoundedBox args={[0.16, 0.10, 0.02]} radius={0.05} position={[-0.12, 0, 0]}>
            <meshStandardMaterial color="#000000" roughness={0.15} metalness={0.1} opacity={0.95} transparent />
          </RoundedBox>
          <RoundedBox args={[0.16, 0.10, 0.02]} radius={0.05} position={[0.12, 0, 0]}>
            <meshStandardMaterial color="#000000" roughness={0.15} metalness={0.1} opacity={0.95} transparent />
          </RoundedBox>
          <RoundedBox args={[0.06, 0.02, 0.02]} radius={0.01}>
            <meshStandardMaterial color="#000000" />
          </RoundedBox>
          <RoundedBox args={[0.02, 0.02, 0.08]} radius={0.01} position={[-0.20, 0, -0.01]}>
            <meshStandardMaterial color="#000000" />
          </RoundedBox>
          <RoundedBox args={[0.02, 0.02, 0.08]} radius={0.01} position={[0.20, 0, -0.01]}>
            <meshStandardMaterial color="#000000" />
          </RoundedBox>
        </group>
      </group>

      {/* COLLAR */}
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
        <group position={[-0.25, 0.22, Z_TORSO]}>
          <RoundedBox args={[0.47, 0.30, 0.30]} radius={0.12} smoothness={6} castShadow receiveShadow>
            {badge('chest')}
          </RoundedBox>
        </group>
        <group position={[0.25, 0.22, Z_TORSO]}>
          <RoundedBox args={[0.47, 0.30, 0.30]} radius={0.12} smoothness={6} castShadow receiveShadow>
            {badge('chest')}
          </RoundedBox>
        </group>

        {/* CORE */}
        <group position={[0, -0.16, Z_TORSO]}>
          <RoundedBox args={[0.46, 0.53, 0.30]} radius={0.12} smoothness={6} castShadow receiveShadow>
            {badge('core')}
          </RoundedBox>
        </group>

        {/* BACK */}
        <group position={[0, 0.02, -Z_TORSO]}>
          <RoundedBox args={[0.92, 0.62, 0.30]} radius={0.12} smoothness={6} castShadow receiveShadow>
            {badge('back')}
          </RoundedBox>
        </group>
      </group>

      {/* SHOULDERS — base caps */}
      <group position={[-0.70, 1.28, 0]}>
        <RoundedBox args={[0.30, 0.24, 0.40]} radius={0.10} smoothness={7} castShadow receiveShadow>{base}</RoundedBox>
      </group>
      <group position={[0.70, 1.28, 0]}>
        <RoundedBox args={[0.30, 0.24, 0.40]} radius={0.10} smoothness={7} castShadow receiveShadow>{base}</RoundedBox>
      </group>

      {/* UPPER ARMS — badges */}
      <group position={[-0.98, 1.0, 0]}>
        <RoundedBox args={[0.36, 0.82, 0.36]} radius={0.12} smoothness={6} castShadow receiveShadow>{base}</RoundedBox>
        <group position={[-0.185, 0.20, 0]}>
          <mesh scale={[1, 1, 0.72]} castShadow receiveShadow>
            <capsuleGeometry args={[0.125, 0.125, 25, 22]} />
            {badge('shoulders')}
          </mesh>
        </group>
        <group position={[0, 0.00, 0.16]}>
          <RoundedBox args={[0.26, 0.46, 0.26]} radius={0.12} smoothness={6} castShadow receiveShadow>
            {badge('biceps')}
          </RoundedBox>
        </group>
        <group position={[0, 0.04, -0.16]}>
          <RoundedBox args={[0.26, 0.56, 0.26]} radius={0.12} smoothness={6} castShadow receiveShadow>
            {badge('triceps')}
          </RoundedBox>
        </group>
      </group>
      <group position={[0.98, 1.0, 0]}>
        <RoundedBox args={[0.36, 0.82, 0.36]} radius={0.12} smoothness={6} castShadow receiveShadow>{base}</RoundedBox>
        <group position={[0.185, 0.20, 0]}>
          <mesh scale={[1, 1, 0.72]} castShadow receiveShadow>
            <capsuleGeometry args={[0.125, 0.125, 25, 22]} />
            {badge('shoulders')}
          </mesh>
        </group>
        <group position={[0, 0.00, 0.16]}>
          <RoundedBox args={[0.26, 0.46, 0.26]} radius={0.12} smoothness={6} castShadow receiveShadow>
            {badge('biceps')}
          </RoundedBox>
        </group>
        <group position={[0, 0.04, -0.16]}>
          <RoundedBox args={[0.26, 0.56, 0.26]} radius={0.12} smoothness={6} castShadow receiveShadow>
            {badge('triceps')}
          </RoundedBox>
        </group>
      </group>

      {/* FOREARMS / HANDS */}
      <group position={[-0.98, 0.42, 0]}>
        <RoundedBox args={[0.32, 0.72, 0.32]} radius={0.12} smoothness={6} castShadow receiveShadow>{base}</RoundedBox>
      </group>
      <group position={[0.98, 0.42, 0]}>
        <RoundedBox args={[0.32, 0.72, 0.32]} radius={0.12} smoothness={6} castShadow receiveShadow>{base}</RoundedBox>
      </group>
      <group position={[-0.98, -0.02, 0]}>
        <RoundedBox args={[0.34, 0.22, 0.34]} radius={0.10} castShadow receiveShadow>{base}</RoundedBox>
      </group>
      <group position={[0.98, -0.02, 0]}>
        <RoundedBox args={[0.34, 0.22, 0.34]} radius={0.10} castShadow receiveShadow>{base}</RoundedBox>
      </group>

      {/* HIPS */}
      <group position={[0, 0.52, 0]}>
        <RoundedBox args={[1.06, 0.30, 0.50]} radius={0.12} smoothness={7} castShadow receiveShadow>{base}</RoundedBox>
        <group position={[-0.55, 0.10, 0]}>
          <RoundedBox args={[0.26, 0.26, 0.40]} radius={0.12} smoothness={6} castShadow receiveShadow>
            {badge('hips')}
          </RoundedBox>
        </group>
        <group position={[0.55, 0.10, 0]}>
          <RoundedBox args={[0.26, 0.26, 0.40]} radius={0.12} smoothness={6} castShadow receiveShadow>
            {badge('hips')}
          </RoundedBox>
        </group>
      </group>

      {/* THIGHS */}
      <group position={[-0.40, 0.02, 0]}>
        <RoundedBox args={[0.46, 1.12, 0.46]} radius={0.14} smoothness={7} castShadow receiveShadow>{base}</RoundedBox>
        <group position={[0, -0.06, 0.18]}>
          <RoundedBox args={[0.36, 0.96, 0.28]} radius={0.14} smoothness={6} castShadow receiveShadow>
            {badge('quads')}
          </RoundedBox>
        </group>
        <group position={[0, 0.00, -0.18]}>
          <RoundedBox args={[0.30, 0.74, 0.28]} radius={0.14} smoothness={6} castShadow receiveShadow>
            {badge('hamstrings')}
          </RoundedBox>
        </group>
      </group>
      <group position={[0.40, 0.02, 0]}>
        <RoundedBox args={[0.46, 1.12, 0.46]} radius={0.14} smoothness={7} castShadow receiveShadow>{base}</RoundedBox>
        <group position={[0, -0.06, 0.18]}>
          <RoundedBox args={[0.36, 0.96, 0.28]} radius={0.14} smoothness={6} castShadow receiveShadow>
            {badge('quads')}
          </RoundedBox>
        </group>
        <group position={[0, 0.00, -0.18]}>
          <RoundedBox args={[0.30, 0.74, 0.28]} radius={0.14} smoothness={6} castShadow receiveShadow>
            {badge('hamstrings')}
          </RoundedBox>
        </group>
      </group>

      {/* CALVES */}
      <group position={[-0.40, -0.86, 0]}>
        <RoundedBox args={[0.38, 0.92, 0.38]} radius={0.14} smoothness={7} castShadow receiveShadow>{base}</RoundedBox>
        <group position={[0, 0, -0.15]}>
          <RoundedBox args={[0.28, 0.70, 0.32]} radius={0.14} smoothness={6} castShadow receiveShadow>
            {badge('calves')}
          </RoundedBox>
        </group>
      </group>
      <group position={[0.40, -0.86, 0]}>
        <RoundedBox args={[0.38, 0.92, 0.38]} radius={0.14} smoothness={7} castShadow receiveShadow>{base}</RoundedBox>
        <group position={[0, 0, -0.15]}>
          <RoundedBox args={[0.28, 0.70, 0.32]} radius={0.14} smoothness={6} castShadow receiveShadow>
            {badge('calves')}
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

/* ------------------------------ Popover Tooltip (anchored, left-first) ------------------------------ */
function InfoTooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState<{ left: number; top: number } | null>(null)
  const [side, setSide] = useState<'left' | 'right'>('left')
  const anchorRef = useRef<HTMLSpanElement | null>(null)
  const tipRef = useRef<HTMLDivElement | null>(null)

  const GAP = 12
  const PADDING = 8 // viewport padding to avoid clipping

  function positionPopover(sidePref: 'left' | 'right' = 'left') {
    const anchor = anchorRef.current
    const tip = tipRef.current
    if (!anchor || !tip) return

    const rect = anchor.getBoundingClientRect()
    const tipRect = tip.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    let sideFinal: 'left' | 'right' = sidePref

    // Try preferred side; if it overflows, flip.
    if (sidePref === 'left' && rect.left - GAP - tipRect.width < PADDING) {
      sideFinal = 'right'
    } else if (sidePref === 'right' && rect.right + GAP + tipRect.width > vw - PADDING) {
      sideFinal = 'left'
    }

    let left =
      sideFinal === 'left'
        ? rect.left - tipRect.width - GAP
        : rect.right + GAP

    // Clamp within viewport horizontally
    left = Math.max(PADDING, Math.min(left, vw - tipRect.width - PADDING))

    // Vertically center on the icon, then clamp
    let top = rect.top + rect.height / 2 - tipRect.height / 2
    top = Math.max(PADDING, Math.min(top, vh - tipRect.height - PADDING))

    setSide(sideFinal)
    setStyle({ left, top })
  }

  return (
    <>
      <span
        ref={anchorRef}
        className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-gray-600 text-[10px] leading-none text-gray-200 cursor-default select-none"
        aria-label="Info"
        onMouseEnter={() => {
          setOpen(true)
          // Wait a tick so the tooltip exists, then measure and position.
          requestAnimationFrame(() => positionPopover('left'))
        }}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => {
          setOpen(true)
          requestAnimationFrame(() => positionPopover('left'))
        }}
        onBlur={() => setOpen(false)}
        role="button"
        tabIndex={0}
      >
        i
      </span>

      {open && (
        <div
          ref={tipRef}
          className={`fixed z-50 pointer-events-none ${side === 'left' ? 'origin-right' : 'origin-left'} transition-transform`}
          style={{
            left: style?.left ?? -9999,
            top: style?.top ?? -9999,
          }}
          onMouseEnter={() => setOpen(true)}
        >
          <div className="rounded-md border shadow-lg px-3 py-2 text-xs bg-[#1f2937] border-[#374151] text-white max-w-[320px]">
            {children}
          </div>
        </div>
      )}
    </>
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
        <rect x="50" y="78" width="100" height="84" rx="14" fill="#ef4444" />
        <text x="100" y="300" textAnchor="middle" fontSize="10" fill="#9ca3af">WebGL unavailable – static body</text>
      </svg>
    </div>
  )
}
