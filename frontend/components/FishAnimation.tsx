"use client"

import { useEffect, useRef } from "react"

interface Fish {
    x: number
    y: number
    size: number
    baseSpeed: number
    speed: number
    vx: number
    vy: number
    direction: number
    wobble: number
    wobbleSpeed: number
    opacity: number
    type: 'small' | 'medium' | 'large'
}

interface Bubble {
    x: number
    y: number
    size: number
    speed: number
    opacity: number
}

export function FishAnimation() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const mouseRef = useRef({ x: 0, y: 0 })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        // Set canvas size
        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        resize()
        window.addEventListener("resize", resize)

        // Mouse tracking
        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current = { x: e.clientX, y: e.clientY }
        }
        window.addEventListener("mousemove", handleMouseMove)

        // --- Create Fish ---
        const fishes: Fish[] = []
        const fishCount = Math.min(20, Math.floor(canvas.width / 80)) // Increased density

        for (let i = 0; i < fishCount; i++) {
            const typeRand = Math.random()
            const type: 'small' | 'medium' | 'large' =
                typeRand < 0.6 ? 'small' : typeRand < 0.9 ? 'medium' : 'large'

            const baseSpeed = (type === 'small' ? 0.8 : type === 'medium' ? 0.5 : 0.3) * (Math.random() * 0.5 + 0.8)

            fishes.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: type === 'small' ? 8 : type === 'medium' ? 15 : 25,
                baseSpeed: baseSpeed,
                speed: baseSpeed,
                vx: 0,
                vy: 0,
                direction: Math.random() < 0.5 ? 1 : -1,
                wobble: Math.random() * Math.PI * 2,
                wobbleSpeed: Math.random() * 0.02 + 0.01,
                opacity: Math.random() * 0.4 + 0.3,
                type,
            })
        }

        // --- Create Bubbles ---
        const bubbles: Bubble[] = []
        const bubbleCount = 30
        for (let i = 0; i < bubbleCount; i++) {
            bubbles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 3 + 1,
                speed: Math.random() * 0.5 + 0.2,
                opacity: Math.random() * 0.3 + 0.1
            })
        }

        let animationId: number

        const drawFish = (fish: Fish) => {
            ctx.save()
            ctx.globalAlpha = fish.opacity
            ctx.translate(fish.x, fish.y)

            // Calculate rotation based on velocity (vx, vy) if moving effectively
            // Or just keep the simple flip for now, but smooth turning is better.
            // For simplicity and style match, we stick to direction flip but maybe tilt slightly

            const tilt = fish.vy * 0.2 // Slight vertical tilt

            const facingLeft = fish.direction < 0
            ctx.scale(facingLeft ? -1 : 1, 1)
            ctx.rotate(tilt * (facingLeft ? -1 : 1))

            // Fish body gradient
            const gradient = ctx.createLinearGradient(-fish.size, 0, fish.size, 0)
            gradient.addColorStop(0, "rgba(6, 182, 212, 0.6)") // Cyan
            gradient.addColorStop(0.5, "rgba(59, 130, 246, 0.8)") // Blue
            gradient.addColorStop(1, "rgba(6, 182, 212, 0.4)")

            ctx.fillStyle = gradient

            // Body 
            ctx.beginPath()
            ctx.ellipse(0, 0, fish.size, fish.size * 0.5, 0, 0, Math.PI * 2)
            ctx.fill()

            // Tail 
            ctx.beginPath()
            ctx.moveTo(-fish.size * 0.8, 0)
            ctx.lineTo(-fish.size * 1.5, -fish.size * 0.4)
            ctx.lineTo(-fish.size * 1.5, fish.size * 0.4)
            ctx.closePath()
            ctx.fill()

            // Eye 
            if (fish.size > 10) {
                ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
                ctx.beginPath()
                ctx.arc(fish.size * 0.5, -fish.size * 0.15, fish.size * 0.1, 0, Math.PI * 2)
                ctx.fill()
            }

            ctx.restore()
        }

        const drawBubble = (bubble: Bubble) => {
            ctx.save()
            ctx.globalAlpha = bubble.opacity
            ctx.fillStyle = "rgba(255, 255, 255, 0.6)"
            ctx.beginPath()
            ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            // Animate Bubbles
            bubbles.forEach(bubble => {
                bubble.y -= bubble.speed
                // Wiggle effect
                bubble.x += Math.sin(bubble.y * 0.05) * 0.2

                // Reset if top reached
                if (bubble.y < -10) {
                    bubble.y = canvas.height + 10
                    bubble.x = Math.random() * canvas.width
                }
                drawBubble(bubble)
            })

            // Animate Fish
            fishes.forEach((fish) => {
                // --- Mouse Avoidance Logic ---
                const dx = fish.x - mouseRef.current.x
                const dy = fish.y - mouseRef.current.y
                const distance = Math.sqrt(dx * dx + dy * dy)
                const avoidanceRadius = 150

                let targetVx = fish.baseSpeed * fish.direction
                let targetVy = 0

                if (distance < avoidanceRadius) {
                    // Move away from mouse
                    const force = (avoidanceRadius - distance) / avoidanceRadius
                    const angle = Math.atan2(dy, dx)

                    // Add repulsion force
                    targetVx += Math.cos(angle) * force * 5
                    targetVy += Math.sin(angle) * force * 5

                    // Speed up when scared
                    fish.speed = fish.baseSpeed * 2
                } else {
                    // Return to normal speed slowly
                    fish.speed = fish.baseSpeed
                }

                // Smooth velocity transition (inertia)
                fish.vx += (targetVx - fish.vx) * 0.1
                fish.vy += (targetVy - fish.vy) * 0.1

                // Update Position
                fish.x += fish.vx
                fish.y += fish.vy

                // Wobble
                fish.wobble += fish.wobbleSpeed
                fish.y += Math.sin(fish.wobble) * 0.5

                // Determine direction based on velocity
                if (fish.vx > 0.1) fish.direction = 1
                if (fish.vx < -0.1) fish.direction = -1

                // Wrap around screen
                if (fish.x > canvas.width + fish.size * 2) {
                    fish.x = -fish.size * 2
                    fish.y = Math.random() * canvas.height
                } else if (fish.x < -fish.size * 2) {
                    fish.x = canvas.width + fish.size * 2
                    fish.y = Math.random() * canvas.height
                }

                // Vertical Bounds
                if (fish.y < fish.size) fish.y = fish.size
                if (fish.y > canvas.height - fish.size) fish.y = canvas.height - fish.size

                drawFish(fish)
            })

            animationId = requestAnimationFrame(animate)
        }

        animate()

        return () => {
            window.removeEventListener("resize", resize)
            window.removeEventListener("mousemove", handleMouseMove)
            cancelAnimationFrame(animationId)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none z-0 mix-blend-screen opacity-60"
        />
    )
}
