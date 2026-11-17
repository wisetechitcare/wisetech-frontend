// Liquid Swirl — the sign-in background: slow marbled swirls of the brand colour on a sheen, as on the user's
// reference (uiable "Housiq" sign-in, 2026-11-14). Raw WebGL2, one full-screen pass, no dependency.
// The field is the classic water-caustic turbulence (Shadertoy "Tileable Water Caustic") folded by a slowly
// rotating matrix into marbled ribbons; colour runs sheen → brand → sheen, premultiplied over the page.
// Kit behaviour: the tone is a kit CSS colour resolved at runtime (tenant brands follow), light/dark follow the kit
// theme live, `settled` eases the motion to a stop (then nothing more is drawn), still under reduced motion, paused
// off-screen and in hidden tabs, pixel count capped.
import { useEffect, useRef, useState, type CSSProperties } from 'react'

export interface LiquidSwirlProps {
  /** Any CSS colour, kit tokens included (resolved at runtime). Defaults to the brand, var(--primary). */
  tone?: string
  /** Ease the motion to a stop (~1.2s), then draw nothing more. */
  settled?: boolean
  /** Flow speed (time multiplier). */
  speed?: number
  /** Zoom of the pattern: higher = more, finer swirls. */
  scale?: number
  /** The pattern drifts gently toward the pointer while it moves (not once settled, never under reduced motion). */
  interactive?: boolean
  className?: string
  style?: CSSProperties
}

const PIXEL_BUDGET = 2.4e6
const MAX_RATIO = 1.5
const SETTLE_MS = 1200
const INTRO_S = 1.8

const VERTEX = `#version 300 es
const vec2 corners[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() {
  gl_Position = vec4(corners[gl_VertexID], 0.0, 1.0);
}`

const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uScale;
uniform vec2 uDrift;
uniform vec3 uSheen;
uniform vec3 uTone;
uniform float uPresence;
out vec4 fragColor;

void main() {
  float time = uTime;
  vec2 p = uScale * (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y - 0.5 + uDrift;

  // A slowly turning fold: it swirls the caustic field into marbled ribbons.
  float r = length(p + vec2(sin(time), sin(time * 0.3 + 5.0)) * 0.5);
  float turn = length(p) + time + p.x * 0.75;
  mat2 fold = mat2(cos(turn - sin(time * 0.2)), sin(turn), -sin(cos(turn) - time), cos(turn)) * -0.31;

  // Caustic turbulence: each pass bends the point and adds a thin bright vein where the waves cross.
  vec2 q = p;
  float veins = 0.0;
  for (int n = 0; n < 5; n++) {
    p *= fold;
    float t = r - time / (float(n) + 3.0);
    q -= p + vec2(cos(t - q.x - r) + sin(t + q.y), sin(t - q.y) + cos(t + q.x) + r);
    veins += 0.27 / length(vec2(sin(q.x + t), cos(q.y + t)));
  }
  veins /= 6.0;

  float g = clamp((veins - 0.14) * 1.3, 0.0, 1.0) * uPresence;
  vec3 color = mix(uSheen, uTone, smoothstep(0.0, 0.5, g));
  color = mix(color, uSheen, smoothstep(0.5, 1.0, g));
  fragColor = vec4(color * g, g);
}`

const compile = (gl: WebGL2RenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

const link = (gl: WebGL2RenderingContext) => {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX)
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT)
  const program = vertex && fragment ? gl.createProgram() : null
  if (!vertex || !fragment || !program) {
    if (vertex) gl.deleteShader(vertex)
    if (fragment) gl.deleteShader(fragment)
    return null
  }
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
  }
  const at = (name: string) => gl.getUniformLocation(program, name)
  return {
    program,
    u: {
      resolution: at('uResolution'),
      time: at('uTime'),
      scale: at('uScale'),
      drift: at('uDrift'),
      sheen: at('uSheen'),
      tone: at('uTone'),
      presence: at('uPresence'),
    },
  }
}

/** A kit CSS colour (e.g. var(--primary), oklch(...)) as sRGB 0..1, read through the computed style. */
const resolveColor = (host: HTMLElement, value: string): [number, number, number] => {
  const probe = document.createElement('span')
  probe.style.color = value
  host.appendChild(probe)
  const computed = getComputedStyle(probe).color
  probe.remove()
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return [1, 1, 1]
  ctx.fillStyle = computed
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return [r / 255, g / 255, b / 255]
}

interface Colors {
  tone: [number, number, number]
  sheen: [number, number, number]
}

/**
 * The sign-in background: marbled swirls in the brand colour. For moments only; put a veil of the page colour over
 * it behind content (Auth Layout uses bg-background/90). Decorative — the wrapper should be aria-hidden.
 */
export function LiquidSwirl({
  tone = 'var(--primary)',
  settled = false,
  speed = 0.45,
  scale = 7.3,
  interactive = true,
  className = '',
  style,
}: LiquidSwirlProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wakeRef = useRef<(() => void) | null>(null)
  const [generation, setGeneration] = useState(0)
  const [colors, setColors] = useState<Colors>({ tone: [0.12, 0.23, 0.54], sheen: [1, 1, 1] })

  const settledAtRef = useRef<number | null>(null)
  if (settled && settledAtRef.current === null) settledAtRef.current = performance.now()
  if (!settled) settledAtRef.current = null

  const settingsRef = useRef({ colors, speed, scale, interactive })
  settingsRef.current = { colors, speed: Math.max(0, speed), scale: Math.max(0.5, scale), interactive }

  // Re-draw (and resume if needed) whenever a prop changes.
  useEffect(() => {
    wakeRef.current?.()
  })

  // The tone, and the sheen (the page's lightest surface in light mode, its ink in dark mode — near-white in both,
  // as the reference), follow the kit theme: .dark / tenant brand on <html>.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const read = () => {
      const dark = Boolean(container.closest('.dark'))
      setColors({
        tone: resolveColor(container, tone),
        sheen: resolveColor(container, dark ? 'var(--foreground)' : 'var(--card)'),
      })
    }
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] })
    return () => observer.disconnect()
  }, [tone])

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
    })
    const swirl = gl ? link(gl) : null
    if (!gl || !swirl) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const vao = gl.createVertexArray()
    let time = Math.random() * 40
    let presence = reduced || generation > 0 ? 1 : 0
    const pointer = { x: 0.5, y: 0.5 }
    const drift = { x: 0.5, y: 0.5 }
    let raf = 0
    let last = 0
    let visible = true
    let pageVisible = document.visibilityState !== 'hidden'
    let lost = false

    const resize = () => {
      const rect = container.getBoundingClientRect()
      const w = Math.max(1, rect.width)
      const h = Math.max(1, rect.height)
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_RATIO, Math.sqrt(PIXEL_BUDGET / (w * h)))
      const width = Math.max(1, Math.round(w * ratio))
      const height = Math.max(1, Math.round(h * ratio))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
    }

    const render = () => {
      const s = settingsRef.current
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(swirl.program)
      gl.bindVertexArray(vao)
      gl.uniform2f(swirl.u.resolution, canvas.width, canvas.height)
      gl.uniform1f(swirl.u.time, time)
      gl.uniform1f(swirl.u.scale, s.scale)
      gl.uniform2f(swirl.u.drift, (drift.x - 0.5) * 2, (drift.y - 0.5) * 2)
      gl.uniform3fv(swirl.u.sheen, s.colors.sheen)
      gl.uniform3fv(swirl.u.tone, s.colors.tone)
      gl.uniform1f(swirl.u.presence, 1 - Math.pow(1 - presence, 3))
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const frame = (now: number) => {
      raf = 0
      if (lost) return
      const s = settingsRef.current
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
      last = now
      // Settled: the speed eases to zero over SETTLE_MS (ease-out), after which no more frames are drawn.
      const settledAt = settledAtRef.current
      const ease = settledAt === null ? 1 : Math.pow(Math.max(0, 1 - (now - settledAt) / SETTLE_MS), 2)
      const speedNow = reduced ? 0 : s.speed * ease
      time += dt * speedNow
      presence = Math.min(1, presence + dt / INTRO_S)
      // The drift follows the pointer gently (the reference's 5% per frame).
      drift.x += (pointer.x - drift.x) * 0.05
      drift.y += (pointer.y - drift.y) * 0.05
      render()
      const drifting = Math.abs(pointer.x - drift.x) + Math.abs(pointer.y - drift.y) > 1e-3
      if ((speedNow > 0 || presence < 1 || drifting) && visible && pageVisible) raf = requestAnimationFrame(frame)
    }

    const wake = () => {
      if (raf || lost || !visible || !pageVisible) return
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
    wakeRef.current = () => {
      resize()
      render()
      wake()
    }

    const onPointerMove = (event: PointerEvent) => {
      if (reduced || !settingsRef.current.interactive || settledAtRef.current !== null) return
      const rect = container.getBoundingClientRect()
      pointer.x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
      pointer.y = Math.min(1, Math.max(0, 1 - (event.clientY - rect.top) / rect.height))
      wake()
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })

    const onLost = (event: Event) => {
      event.preventDefault()
      lost = true
      cancelAnimationFrame(raf)
      raf = 0
    }
    const onRestored = () => setGeneration((value) => value + 1)
    canvas.addEventListener('webglcontextlost', onLost)
    canvas.addEventListener('webglcontextrestored', onRestored)

    const resizeObserver = new ResizeObserver(() => {
      resize()
      render()
      wake()
    })
    resizeObserver.observe(container)
    const intersection = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting)
      wake()
    })
    intersection.observe(container)
    const onVisibility = () => {
      pageVisible = document.visibilityState !== 'hidden'
      wake()
    }
    document.addEventListener('visibilitychange', onVisibility)

    resize()
    render()
    wake()

    return () => {
      cancelAnimationFrame(raf)
      wakeRef.current = null
      window.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
      resizeObserver.disconnect()
      intersection.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      if (!gl.isContextLost()) {
        gl.deleteVertexArray(vao)
        gl.deleteProgram(swirl.program)
      }
    }
  }, [generation])

  return (
    <div
      ref={containerRef}
      data-slot="liquid-swirl"
      data-settled={settled || undefined}
      className={`relative h-full w-full overflow-hidden ${className}`.trim()}
      style={style}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" aria-hidden="true" />
    </div>
  )
}
