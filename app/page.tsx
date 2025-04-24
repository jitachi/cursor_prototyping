"use client";

import Link from "next/link";
import styles from "./styles/home.module.css";
import { instrumentSans } from "./fonts";
import { useState, useRef, useEffect } from "react";

const INITIAL_SPEED = 3;
const DOG_DISTANCE = 100; // Distance dogs try to maintain from container

// Pixel art dog SVG as a component
const DogSvg = () => (
  <svg className={styles.dog} viewBox="0 0 32 32" fill="currentColor">
    {/* Body */}
    <path d="M6 12h20v8H6z" />
    {/* Head */}
    <path d="M8 8h16v6H8z" />
    {/* Ears */}
    <path d="M6 4h4v6H6zM22 4h4v6h-4z" />
    {/* Legs */}
    <path d="M8 20h4v6H8zM20 20h4v6h-4z" />
    {/* Tail */}
    <path d="M26 14h2v4h-2z" />
    {/* Eyes */}
    <path d="M11 10h2v2h-2zM19 10h2v2h-2z" fill="white" />
    {/* Nose */}
    <path d="M15 12h2v2h-2z" fill="white" />
  </svg>
);

export default function Home() {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [dogs, setDogs] = useState<{ id: number; x: number; y: number }[]>([]);
  const [nextDogId, setNextDogId] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const speedRef = useRef(INITIAL_SPEED);
  const positionRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: INITIAL_SPEED, y: INITIAL_SPEED });
  const [, forceUpdate] = useState<{}>({});
  const dogsRef = useRef<{ id: number; x: number; y: number }[]>([]);

  const centerWindow = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      positionRef.current = {
        x: (window.innerWidth - rect.width) / 2,
        y: Math.max(40, (window.innerHeight - rect.height) / 3),
      };
      if (containerRef.current) {
        containerRef.current.style.transform = `translate(${positionRef.current.x}px, ${positionRef.current.y}px)`;
      }
    }
  };

  useEffect(() => {
    // Center window on first load
    centerWindow();

    const animate = () => {
      if (!containerRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      if (isAnimating && !isHovered) {
        const rect = containerRef.current.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;

        let newX = positionRef.current.x + velocityRef.current.x;
        let newY = positionRef.current.y + velocityRef.current.y;

        // Bounce off edges
        if (newX <= 0 || newX >= maxX) {
          velocityRef.current.x = -velocityRef.current.x;
        }
        if (newY <= 24 || newY >= maxY) {
          velocityRef.current.y = -velocityRef.current.y;
        }

        // Update position
        positionRef.current = {
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(24, Math.min(newY, maxY)),
        };

        // Apply transform
        containerRef.current.style.transform = `translate(${positionRef.current.x}px, ${positionRef.current.y}px)`;
      }

      // Animate dogs
      if (dogsRef.current.length > 0) {
        const containerCenter = {
          x: positionRef.current.x + containerRef.current.offsetWidth / 2,
          y: positionRef.current.y + containerRef.current.offsetHeight / 2,
        };

        const updatedDogs = dogsRef.current.map((dog) => {
          const dx = containerCenter.x - dog.x;
          const dy = containerCenter.y - dog.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Calculate the minimum distance (container diagonal / 2 + 24px margin)
          const containerDiagonal = Math.sqrt(
            Math.pow(containerRef.current?.offsetWidth ?? 0, 2) +
              Math.pow(containerRef.current?.offsetHeight ?? 0, 2)
          );
          const minDistance = containerDiagonal / 2 + 24;

          // If too close, move away from container
          if (distance < minDistance) {
            const angle = Math.atan2(dy, dx);
            return {
              ...dog,
              x: containerCenter.x - Math.cos(angle) * minDistance,
              y: containerCenter.y - Math.sin(angle) * minDistance,
            };
          }

          // Otherwise, move towards container while maintaining distance
          const targetDistance = minDistance + 20; // Add some buffer
          const speed = Math.min(5, Math.abs(distance - targetDistance) / 20);
          const angle = Math.atan2(dy, dx);
          const moveCloser = distance > targetDistance;

          return {
            ...dog,
            x: dog.x + (moveCloser ? 1 : -1) * Math.cos(angle) * speed,
            y: dog.y + (moveCloser ? 1 : -1) * Math.sin(angle) * speed,
          };
        });

        setDogs(updatedDogs);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isAnimating, isHovered]);

  useEffect(() => {
    dogsRef.current = dogs;
  }, [dogs]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(`.${styles.card}`)) return;
    if ((e.target as HTMLElement).closest(`.${styles.toggleButton}`)) return;

    if (isAnimating) {
      // Increase speed on click when animating
      const newSpeed = speedRef.current * 1.2;
      speedRef.current = newSpeed;
      velocityRef.current = {
        x: velocityRef.current.x > 0 ? newSpeed : -newSpeed,
        y: velocityRef.current.y > 0 ? newSpeed : -newSpeed,
      };
    } else {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - positionRef.current.x,
        y: e.clientY - positionRef.current.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    const maxX = window.innerWidth - containerRef.current.offsetWidth;
    const maxY = window.innerHeight - containerRef.current.offsetHeight;

    positionRef.current = {
      x: Math.min(Math.max(0, newX), maxX),
      y: Math.min(Math.max(24, newY), maxY),
    };

    containerRef.current.style.transform = `translate(${positionRef.current.x}px, ${positionRef.current.y}px)`;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const toggleAnimation = () => {
    if (isAnimating) {
      speedRef.current = INITIAL_SPEED;
      velocityRef.current = { x: INITIAL_SPEED, y: INITIAL_SPEED };
      centerWindow();
    }
    setIsAnimating(!isAnimating);
  };

  const addDog = () => {
    const edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
    const x =
      edge === 1
        ? window.innerWidth
        : edge === 3
        ? 0
        : Math.random() * window.innerWidth;
    const y =
      edge === 2
        ? window.innerHeight
        : edge === 0
        ? 0
        : Math.random() * window.innerHeight;

    setDogs((prev) => [...prev, { id: nextDogId, x, y }]);
    setNextDogId((prev) => prev + 1);
  };

  // Add your prototypes to this array
  const prototypes = [
    {
      title: "Getting started",
      description: "How to create a prototype",
      path: "/prototypes/example",
    },
    {
      title: "Confetti button",
      description:
        "An interactive button that creates a colorful confetti explosion",
      path: "/prototypes/confetti-button",
    },
    // Add your new prototypes here like this:
    // {
    //   title: 'Your new prototype',
    //   description: 'A short description of what this prototype does',
    //   path: '/prototypes/my-new-prototype'
    // },
  ];

  return (
    <div
      className={styles.viewport}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseDown={handleMouseDown}
    >
      <div className={styles.menuBar}>
        <div className={styles.menuItems}>
          <span>File</span>
          <span>Edit</span>
          <span>View</span>
          <span>Special</span>
        </div>
      </div>

      {/* Dogs */}
      {dogs.map((dog) => (
        <div
          key={dog.id}
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            transform: `translate(${dog.x}px, ${dog.y}px)`,
            pointerEvents: "none",
          }}
        >
          <DogSvg />
        </div>
      ))}

      <div
        ref={containerRef}
        className={`${styles.container} ${instrumentSans.className} ${
          isDragging ? styles.dragging : ""
        }`}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <header className={styles.header} onMouseDown={handleMouseDown}>
          <h1>Jitachi's prototypes</h1>
        </header>

        <main>
          <section className={styles.grid}>
            {prototypes.map((prototype, index) => (
              <Link key={index} href={prototype.path} className={styles.card}>
                <h3>{prototype.title}</h3>
                <p>{prototype.description}</p>
              </Link>
            ))}
          </section>
        </main>
      </div>

      <div className={styles.buttonContainer}>
        <button className={styles.toggleButton} onClick={toggleAnimation}>
          {isAnimating ? "Stop" : "Bounce"}
        </button>
        <button className={styles.toggleButton} onClick={addDog}>
          Add Dog
        </button>
      </div>
    </div>
  );
}
