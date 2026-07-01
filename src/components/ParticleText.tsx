"use client";
import React, { useEffect, useRef } from "react";
import { Bebas_Neue } from "next/font/google";
import { useTheme } from "next-themes";
import styles from "./ParticleText.module.css";

const bebasNeue = Bebas_Neue({ weight: "400", subsets: ["latin"] });

// 디지털 글리치 설정 — 일부 사각 구간이 순간적으로 좌우로 어긋났다 되돌아오는 효과
type Glitch = { xMin: number; xMax: number; yMin: number; yMax: number; dx: number; start: number; life: number };

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
  // 마우스가 없어도 은은하게 떠다니도록 위상/진폭 부여
  phase: number = 0;
  driftAmp: number = 0.7;

  constructor(x: number, y: number, color: string, size: number) {
    this.originX = x;
    this.originY = y;
    // 위치 기반 위상: 이웃한 점들이 거의 함께 움직여 '물결/숨쉬기'처럼 보이게 함
    // (점마다 완전히 제각각 움직이면 벌레가 꿈틀거리는 느낌이 들 수 있어 방지)
    this.phase = (x + y) * 0.012 + Math.random() * 0.3;
    this.driftAmp = 0.55 + Math.random() * 0.35;
    // 처음 로딩될 때 화면 밖/사방에서 날아와 꽂히는 역동적인 효과를 위해 초기 분산값을 극대화
    this.x = x + (Math.random() - 0.5) * 1500;
    this.y = y + (Math.random() - 0.5) * 1500;
    this.color = color;
    this.size = size;
  }

  update(mouseX: number, mouseY: number, radius: number, t: number) {
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

    // 상시 미세 부유: 목표 지점을 원점 주변에서 천천히 흔들어 살아있는 느낌을 줌
    const driftX = Math.sin(t * 0.0016 + this.phase) * this.driftAmp;
    const driftY = Math.cos(t * 0.0013 + this.phase) * this.driftAmp;

    this.vx += (this.originX + driftX - this.x) * this.ease;
    this.vy += (this.originY + driftY - this.y) * this.ease;
    this.vx *= this.friction;
    this.vy *= this.friction;

    this.x += this.vx;
    this.y += this.vy;
  }

  draw(ctx: CanvasRenderingContext2D, offsetX: number = 0) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x + offsetX, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function ParticleText({ text, subtitle }: { text: string; subtitle?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // 라틴(ASCII)만이면 Bebas Neue, 그 외(국문 등)는 Pretendard로 렌더
    const isLatin = /^[\x00-\x7F]*$/.test(text);
    const displayText = isLatin ? text.toUpperCase() : text;
    const fontFamily = isLatin ? bebasNeue.style.fontFamily : '"TitleKR"';
    const fontWeight = "400"; // Bebas Neue / Black Han Sans 모두 단일 굵기 400
    const stretchY = isLatin ? 1.4 : 1.0; // Bebas는 길쭉하게, 국문은 원본 비율 유지

    let particles: Particle[] = [];
    let animationFrameId: number;
    let cssW = 0, cssH = 0; // init 시점의 논리 크기(프레임마다 getBoundingClientRect 호출 방지)

    // 모션 최소화 설정 사용자: 애니메이션 없이 정적으로만 표시
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

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

    // 모션 최소화 시엔 마우스 인터랙션도 비활성화(정적 유지)
    if (!reduceMotion) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseout", handleMouseLeave);
    }

    const init = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      cssW = rect.width;
      cssH = rect.height;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      particles = [];
      ctx.clearRect(0, 0, rect.width, rect.height);

      // 폰트 크기 계산 (화면을 꽉 채울 정도로 극대화)
      let fontSize = Math.min(rect.width / displayText.length * 2.8, 320);

      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      (ctx as any).letterSpacing = "0px"; // 자간 원복

      // 실제 텍스트 폭을 측정해, 넘칠 때만 가로폭(98%)에 맞춰 축소.
      // 배포본과 동일하게 거의 꽉 차게 유지하되, 아주 긴 이름만 잘리지 않도록 방지.
      const maxWidth = rect.width * 0.98;
      const measured = ctx.measureText(displayText).width;
      if (measured > maxWidth) fontSize *= maxWidth / measured;
      fontSize = Math.max(fontSize, 40); // 너무 작아지지 않도록 하한선
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "white"; 

      ctx.save();
      // 라틴은 길쭉하게(1.4), 국문은 원본 비율(1.0)로 세로 스케일 조정
      ctx.scale(1, stretchY);
      // 거대해진 폰트가 잘리지 않도록 중심 좌표 미세 조정
      ctx.fillText(displayText, rect.width / 2, (rect.height / 2) / stretchY);
      ctx.restore();

      const textData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      ctx.clearRect(0, 0, rect.width, rect.height);

      // 다크모드 여부에 따라 파티클 색상 결정 (next-themes 사용)
      const isDarkMode = resolvedTheme === "dark";
      const color = isDarkMode ? "#ffffff" : "#1d1d1f";
      
      // 픽셀 간격(gap)과 점 크기를 줄여서 훨씬 더 촘촘하고 섬세하게 표현
      const gap = 4 * dpr;
      const size = 1.35 * dpr; // 점을 살짝 키워 점 사이 구멍(집합체 공포 요인)을 메움

      // 글자 잉크의 실제 바운딩박스(디바이스 픽셀 기준)
      let minPx = Infinity, maxPx = -Infinity, minPy = Infinity, maxPy = -Infinity;
      for (let y = 0; y < textData.height; y += gap) {
        for (let x = 0; x < textData.width; x += gap) {
          const index = (y * textData.width + x) * 4;
          const alpha = textData.data[index + 3];
          if (alpha > 128) {
            if (x < minPx) minPx = x;
            if (x > maxPx) maxPx = x;
            if (y < minPy) minPy = y;
            if (y > maxPy) maxPy = y;
            // 논리적 픽셀 좌표로 변환하여 저장
            particles.push(new Particle(x / dpr, y / dpr, color, size / dpr));
          }
        }
      }

      // 언어·길이와 무관하게 잘리지 않도록: 실제 잉크 크기가 안전 영역을 넘으면
      // 캔버스 중앙 기준으로 전체를 균일 축소(절대 확대하지 않음)한 뒤 세로 중앙정렬.
      if (particles.length > 0 && maxPy >= minPy && maxPx >= minPx) {
        const inkW = maxPx - minPx;
        const inkH = maxPy - minPy;
        // 가로는 글리치/부유 이동분(≈수십px)을 감안해 여유, 세로는 상하 여백 확보
        const targetW = canvas.width * 0.94;
        const targetH = canvas.height * 0.9;
        const scale = Math.min(1, targetW / inkW, targetH / inkH);
        const cx = canvas.width / 2 / dpr;   // 캔버스 중심(논리 좌표)
        const cy = canvas.height / 2 / dpr;
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.originX = cx + (p.originX - cx) * scale;
          p.originY = cy + (p.originY - cy) * scale;
          p.x = cx + (p.x - cx) * scale;
          p.y = cy + (p.y - cy) * scale;
        }
        // 축소 후 남은 세로 치우침 보정
        const scaledMidY = cy + ((minPy + maxPy) / 2 / dpr - cy) * scale;
        const shiftY = cy - scaledMidY;
        for (let i = 0; i < particles.length; i++) {
          particles[i].originY += shiftY;
          particles[i].y += shiftY;
        }
      }
    };

    let t = 0;
    let glitches: Glitch[] = [];
    let nextGlitch = 1500 + Math.random() * 2000; // 첫 글리치까지 대기
    let running = false;

    // 정적 1프레임(모션 최소화 사용자용): 원점에 그대로 그림
    const drawStatic = () => {
      ctx.clearRect(0, 0, cssW, cssH);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x = p.originX;
        p.y = p.originY;
        p.draw(ctx, 0);
      }
    };

    const animate = () => {
      if (!running) return;
      ctx.clearRect(0, 0, cssW, cssH); // 캐시한 논리 크기 사용(프레임당 레이아웃 계산 제거)

      t += 16; // 프레임당 약 16ms 경과로 가정 (부유 애니메이션 시간축)

      // 디지털 글리치: 일부 사각 구간을 잠깐 좌우로 어긋냈다 되돌림.
      // 한 번에 여러 조각이 서로 다른 위치·크기로 나타나되, 작은 것이 더 흔하게.
      if (t >= nextGlitch) {
        const count = 1 + Math.floor(Math.random() * 3); // 1~3조각 동시
        for (let k = 0; k < count; k++) {
          const r = Math.random() * Math.random();       // 0에 몰리는 분포 → 작은 값이 많음
          const yc = Math.random() * cssH;
          const half = 2.5 + r * 15;                      // 세로 두께 (얇은 게 많음)
          const segW = cssW * (0.08 + Math.random() * 0.5); // 가로 길이: 폭의 8~58%만
          const xc = Math.random() * cssW;
          const dx = (Math.random() < 0.5 ? -1 : 1) * (1.5 + r * 12); // 어긋나는 양
          glitches.push({
            xMin: xc - segW / 2, xMax: xc + segW / 2,
            yMin: yc - half, yMax: yc + half,
            dx, start: t, life: 60 + Math.random() * 130,
          });
        }
        nextGlitch = t + 1200 + Math.random() * 2400;    // 다음 글리치까지 간격
      }
      if (glitches.length > 0) {
        glitches = glitches.filter((g) => t - g.start <= g.life);
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.update(mouse.x, mouse.y, mouse.radius, t);
        // 이 점이 속한 글리치 사각 구간의 가로 오프셋 합산
        let gdx = 0;
        for (let g = 0; g < glitches.length; g++) {
          const gl = glitches[g];
          if (p.originX >= gl.xMin && p.originX <= gl.xMax &&
              p.originY >= gl.yMin && p.originY <= gl.yMax) gdx += gl.dx;
        }
        p.draw(ctx, gdx);
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    // 화면에 보이고 탭이 활성일 때만 루프를 돌린다(CPU·배터리 절약)
    let onScreen = true;
    const startLoop = () => {
      if (running || reduceMotion) return;
      running = true;
      animationFrameId = requestAnimationFrame(animate);
    };
    const stopLoop = () => {
      running = false;
      cancelAnimationFrame(animationFrameId);
    };

    let ready = false; // init 완료 여부
    const io = new IntersectionObserver((entries) => {
      onScreen = entries[0]?.isIntersecting ?? true;
      if (!ready) return;
      if (onScreen && !document.hidden) startLoop();
      else stopLoop();
    }, { threshold: 0 });
    io.observe(canvas.parentElement ?? canvas);

    const onVisibility = () => {
      if (!ready) return;
      if (document.hidden) stopLoop();
      else if (onScreen) startLoop();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // 폰트 로드 후 초기화 지연 (글꼴이 안 그려지는 이슈 방지).
    // 국문일 땐 웹폰트가 실제로 로드된 뒤 그려야 캔버스에 반영됨.
    const fontReady = isLatin
      ? document.fonts.ready
      : document.fonts
          .load(`400 100px "TitleKR"`, displayText)
          .then(() => document.fonts.ready);
    // 폰트 로드가 실패해도(네트워크/CDN 문제) 시스템 폰트로 반드시 그려지도록 보장
    fontReady.catch(() => {}).then(() => {
      init();
      ready = true;
      if (reduceMotion) drawStatic();
      else if (onScreen && !document.hidden) startLoop();
    });

    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        init();
        if (reduceMotion) drawStatic();
      }, 200);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseout", handleMouseLeave);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
      stopLoop();
      clearTimeout(resizeTimer);
    };
  }, [text, subtitle, resolvedTheme]);

  return (
    <div className={styles.container}>
      <h1 className={styles.srOnly}>{text} {subtitle}</h1>
      <canvas ref={canvasRef} className={styles.canvas} />
      {subtitle && <h2 className={styles.subtitle}>{subtitle}</h2>}
    </div>
  );
}
