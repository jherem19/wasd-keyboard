"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

const keyNames = {
  KeyW: "KeyW_Baked",
  KeyA: "KeyA_Baked",
  KeyS: "KeyS_Baked",
  KeyD: "KeyD_Baked",
} as const

type KeyCode = keyof typeof keyNames
type ActiveKeys = React.MutableRefObject<Set<KeyCode>>
type PreparedKey = {
  object: THREE.Object3D
  restY: number
  materials: Array<{ material: THREE.MeshStandardMaterial; restEmissive: number }>
}

let audioContext: AudioContext | undefined

function playKeySound(code: KeyCode) {
  const AudioContextClass = window.AudioContext
  if (!AudioContextClass) return
  audioContext ??= new AudioContextClass()
  if (audioContext.state === "suspended") void audioContext.resume()

  const now = audioContext.currentTime
  const pitch = { KeyW: 118, KeyA: 106, KeyS: 111, KeyD: 114 }[code]
  const body = audioContext.createOscillator()
  const bodyGain = audioContext.createGain()
  body.type = "triangle"
  body.frequency.setValueAtTime(pitch, now)
  body.frequency.exponentialRampToValueAtTime(62, now + 0.045)
  bodyGain.gain.setValueAtTime(0.075, now)
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06)
  body.connect(bodyGain).connect(audioContext.destination)
  body.start(now)
  body.stop(now + 0.065)

  const frames = Math.floor(audioContext.sampleRate * 0.025)
  const buffer = audioContext.createBuffer(1, frames, audioContext.sampleRate)
  const samples = buffer.getChannelData(0)
  for (let i = 0; i < frames; i++) {
    samples[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / frames, 3)
  }
  const click = audioContext.createBufferSource()
  const filter = audioContext.createBiquadFilter()
  const clickGain = audioContext.createGain()
  click.buffer = buffer
  filter.type = "bandpass"
  filter.frequency.value = 1700
  filter.Q.value = 0.8
  clickGain.gain.value = 0.032
  click.connect(filter).connect(clickGain).connect(audioContext.destination)
  click.start(now)
}

function CameraFromBlender() {
  const { camera } = useThree()
  useEffect(() => {
    const perspectiveCamera = camera as THREE.PerspectiveCamera
    perspectiveCamera.filmGauge = 36
    perspectiveCamera.setFocalLength(50)
    perspectiveCamera.position.set(0, 0.91966, 0.36218)
    perspectiveCamera.lookAt(0, 0, -0.063)
    perspectiveCamera.near = 0.01
    perspectiveCamera.far = 20
    perspectiveCamera.updateProjectionMatrix()
  }, [camera])
  return null
}

function KeyboardModel({ activeKeys, onReady }: { activeKeys: ActiveKeys; onReady: () => void }) {
  const gltf = useLoader(GLTFLoader, "/keyboard-WASD.glb", loader => {
    const draco = new DRACOLoader()
    draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/")
    loader.setDRACOLoader(draco)
  })

  const prepared = useMemo(() => {
    const scene = gltf.scene.clone(true)
    const keys = {} as Partial<Record<KeyCode, PreparedKey>>
    for (const [code, name] of Object.entries(keyNames) as Array<[KeyCode, string]>) {
      const object = scene.getObjectByName(name)
      if (!object) continue
      const materials: PreparedKey["materials"] = []
      object.traverse(child => {
        if (!(child instanceof THREE.Mesh)) return
        const originals = Array.isArray(child.material) ? child.material : [child.material]
        const clones = originals.map(original => {
          const material = original.clone() as THREE.MeshStandardMaterial
          materials.push({ material, restEmissive: material.emissiveIntensity ?? 1 })
          return material
        })
        child.material = Array.isArray(child.material) ? clones : clones[0]
      })
      keys[code] = { object, restY: object.position.y, materials }
    }
    return { scene, keys }
  }, [gltf.scene])

  useEffect(onReady, [onReady])

  useFrame((_, delta) => {
    for (const [code, item] of Object.entries(prepared.keys) as Array<[KeyCode, PreparedKey]>) {
      const pressed = activeKeys.current.has(code)
      const target = item.restY - (pressed ? 0.012 : 0)
      item.object.position.y = THREE.MathUtils.damp(item.object.position.y, target, 24, delta)
      for (const entry of item.materials) {
        entry.material.emissiveIntensity = THREE.MathUtils.damp(
          entry.material.emissiveIntensity,
          entry.restEmissive * (pressed ? 0.48 : 1),
          28,
          delta,
        )
      }
    }
  })

  return (
    <group scale={0.72} position={[0, 0.004, 0]}>
      <primitive object={prepared.scene} />
    </group>
  )
}

function Scene({ onReady, onStatus }: { onReady: () => void; onStatus: (status: string) => void }) {
  const activeKeys = useRef(new Set<KeyCode>())

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (!(event.code in keyNames) || event.repeat) return
      event.preventDefault()
      const code = event.code as KeyCode
      activeKeys.current.add(code)
      playKeySound(code)
      onStatus(`${code.slice(-1)} pressed`)
    }
    const up = (event: KeyboardEvent) => {
      if (!(event.code in keyNames)) return
      const code = event.code as KeyCode
      activeKeys.current.delete(code)
      onStatus(`${code.slice(-1)} released`)
    }
    const blur = () => activeKeys.current.clear()
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    window.addEventListener("blur", blur)
    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
      window.removeEventListener("blur", blur)
    }
  }, [onStatus])

  return (
    <>
      <CameraFromBlender />
      <Suspense fallback={null}>
        <KeyboardModel activeKeys={activeKeys} onReady={onReady} />
      </Suspense>
    </>
  )
}

export function KeyboardExperience() {
  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState("Ready. Press W, A, S, or D")

  return (
    <main className="relative min-h-svh w-full overflow-hidden bg-black">
      <header className="pointer-events-none absolute left-0 top-[clamp(52px,11.5vh,96px)] z-20 w-full px-5 text-center">
        <h1 className="m-0 text-[clamp(38px,4.35vw,58px)] font-normal leading-[1.05] tracking-[-0.04em] text-neutral-100">
          The WASD Keyboard
        </h1>
        <p className="mt-5 text-[clamp(15px,1.55vw,21px)] font-normal tracking-[-0.02em] text-neutral-600">
          Made for the True Professionals
        </p>
      </header>

      <section className="absolute inset-x-0 bottom-[clamp(58px,8vh,78px)] top-[clamp(188px,25vh,220px)] z-10 overflow-hidden bg-[radial-gradient(ellipse_42%_54%_at_50%_55%,#323232_0%,#191919_38%,#000_76%)]" aria-label="Interactive 3D WASD keyboard">
        {!ready && <Skeleton className="absolute inset-0 z-20 rounded-none bg-black" />}
        <Canvas
          camera={{ near: 0.01, far: 20 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = 1.15
            gl.setClearColor(0x000000, 0)
          }}
        >
          <Scene onReady={() => setReady(true)} onStatus={setStatus} />
        </Canvas>
        <Badge className="sr-only" variant="outline" aria-live="polite">{status}</Badge>
      </section>

      <footer className="pointer-events-none absolute bottom-[clamp(52px,9.5vh,78px)] left-0 z-20 w-full text-center font-mono text-[10px] font-medium uppercase leading-none tracking-[0.12em] text-neutral-800">
        Made by Jherem
      </footer>
    </main>
  )
}
