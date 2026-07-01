"use client";
import React, { useEffect, useRef } from "react";
import { Bebas_Neue } from "next/font/google";
import styles from "./ParticleText.module.css";

const bebasNeue = Bebas_Neue({ weight: "400", subsets: ["latin"] });

class Particle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number = 0;
  vy: number = 0;
  color: string;
  size: number;
  friction: number = 0.85;
  ease: number = 0.12; // 탄성을 높여서 쫀득하게 반응하게 함

  constructor(x: number, y: number, color: string, size: number) {
    this.originX = x;
    this.originY = y;
    // 처음 로딩될 때 화면 밖/사방에서 날아와 꽂히는 역동적인 효과를 위해 초기 분산값을 극대화
    this.x = x + (Math.random() - 0.5) * 1500;
    this.y = y + (Math.random() - 0.5) * 1500;
    this.color = color;
    this.size = size;
  }

  update(mouseX: number, mouseY: number, radius: number) {
    const dx = mouseX - this.x;
    const dy = mouseY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < radius) {
      // 이미지처럼 원형 테두리 모양으로 파티클이 뭉치게 하기 위해 강력한 척력 적용
      const force = (radius - dist) / radius;
      const angle = Math.atan2(dy, dx);
      this.vx -= Math.cos(angle) * force * 20;
      this.vy -= Math.sin(angle) * force * 20;
    }

    this.vx += (this.originX - this.x) * this.ease;
    this.vy += (this.originY - this.y) * this.ease;
    this.vx *= this.friction;
    this.vy *= this.friction;

    this.x += this.vx;
    this.y += this.vy;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function ParticleText({ text, subtitle }: { text: string; subtitle?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let particles: Particle[] = [];
    let animationFrameId: number;

    const mouse = { x: -1000, y: -1000, radius: 100 }; // 반경을 넓혀서 거대한 원형 공간 확보

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseout", handleMouseLeave);

    const init = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      particles = [];
      ctx.clearRect(0, 0, rect.width, rect.height);

      // 폰트 크기 계산 (화면을 꽉 채울 정도로 극대화)
      const fontSize = Math.min(rect.width / text.length * 2.8, 320);
      
      // Bebas Neue 폰트 적용 (Next.js font 폰트 패밀리 사용)
      ctx.font = `${fontSize}px ${bebasNeue.style.fontFamily}`;
      (ctx as any).letterSpacing = "0px"; // 자간 원복 (Bebas Neue 본연의 좁은 자간 사용)
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "white"; 

      ctx.save();
      // 매우 길쭉하게 스케일 조정 (이미지와 유사하게)
      ctx.scale(1, 1.4);
      // 거대해진 폰트가 잘리지 않도록 중심 좌표 미세 조정
      ctx.fillText(text.toUpperCase(), rect.width / 2, (rect.height / 2) / 1.4);
      ctx.restore();

      const textData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      ctx.clearRect(0, 0, rect.width, rect.height);

      // 다크모드 여부에 따라 파티클 색상 결정
      const isDarkMode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      const color = isDarkMode ? "#ffffff" : "#1d1d1f";
      
      // 픽셀 간격(gap)과 점 크기를 줄여서 훨씬 더 촘촘하고 섬세하게 표현
      const gap = 4 * dpr;
      const size = 1.0 * dpr;

      for (let y = 0; y < textData.height; y += gap) {
        for (let x = 0; x < textData.width; x += gap) {
          const index = (y * textData.width + x) * 4;
          const alpha = textData.data[index + 3];
          if (alpha > 128) {
            // 논리적 픽셀 좌표로 변환하여 저장
            particles.push(new Particle(x / dpr, y / dpr, color, size / dpr));
          }
        }
      }
    };

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      
      for (let i = 0; i < particles.length; i++) {
        particles[i].update(mouse.x, mouse.y, mouse.radius);
        particles[i].draw(ctx);
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    // 폰트 로드 후 초기화 지연 (글꼴이 안 그려지는 이슈 방지)
    document.fonts.ready.then(() => {
      init();
      animate();
    });

    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        init();
      }, 200);
    };
    
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseout", handleMouseLeave);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      clearTimeout(resizeTimer);
    };
  }, [text, subtitle]);

  return (
    <div className={styles.container}>
      <h1 className={styles.srOnly}>{text} {subtitle}</h1>
      <canvas ref={canvasRef} className={styles.canvas} />
      {subtitle && <h2 className={styles.subtitle}>{subtitle}</h2>}
    </div>
  );
}
