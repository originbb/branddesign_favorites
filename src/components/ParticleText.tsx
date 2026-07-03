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

  update(mouseX: number, mouseY: number, radius: number, strength: number, t: number) {
    const dx = mouseX - this.x;
    const dy = mouseY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < radius) {
      // 이미지처럼 원형 테두리 모양으로 파티클이 뭉치게 하기 위해 척력 적용.
      // strength는 입력수단별로 다르다(데스크톱=강함, 터치=부드러움).
      const force = (radius - dist) / radius;
      const angle = Math.atan2(dy, dx);
      this.vx -= Math.cos(angle) * force * strength;
      this.vy -= Math.sin(angle) * force * strength;
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

    // 글자 단위로 폰트 분리: 라틴(영문/숫자)은 Bebas Neue, 국문 등은 Black Han Sans(TitleKR).
    // 한 타이틀에 영문·국문이 섞여 있어도 각 글자를 알맞은 폰트로 렌더한다.
    const bebasFamily = bebasNeue.style.fontFamily;
    const KR_FAMILY = '"TitleKR"';
    const familyOf = (latin: boolean) => (latin ? bebasFamily : KR_FAMILY);
    const isLatinChar = (ch: string) => ch.charCodeAt(0) <= 0x7f;
    // 같은 스크립트끼리 묶은 세그먼트 배열 생성 (라틴 세그먼트는 대문자화)
    const segments: { text: string; latin: boolean }[] = [];
    for (const ch of text) {
      const latin = isLatinChar(ch);
      const glyph = latin ? ch.toUpperCase() : ch;
      const last = segments[segments.length - 1];
      if (last && last.latin === latin) last.text += glyph;
      else segments.push({ text: glyph, latin });
    }
    const displayText = segments.map((s) => s.text).join("");
    const isPureLatin = segments.every((s) => s.latin);
    const hasKorean = segments.some((s) => !s.latin);
    const fontWeight = "400"; // Bebas Neue / Black Han Sans 모두 단일 굵기 400
    // 세로 스케일: 순수 영문 타이틀만 Bebas 특유의 길쭉한 비율(1.4), 국문이 섞이면 원본 비율(1.0)
    const stretchY = isPureLatin ? 1.4 : 1.0;
    // 주어진 폰트 크기에서 전체 세그먼트의 가로 폭 합을 측정
    const measureTotal = (fs: number) => {
      let w = 0;
      for (const seg of segments) {
        ctx.font = `${fontWeight} ${fs}px ${familyOf(seg.latin)}`;
        w += ctx.measureText(seg.text).width;
      }
      return w;
    };

    let particles: Particle[] = [];
    let animationFrameId: number;
    let cssW = 0, cssH = 0; // init 시점의 논리 크기(프레임마다 getBoundingClientRect 호출 방지)

    // 모션 최소화 설정 사용자: 애니메이션 없이 정적으로만 표시
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // 마우스 반발(repel) 효과는 hover 가능한 정밀 포인터(데스크톱)에서만 활성화한다.
    // 터치 기기에선 탭 시 에뮬레이트된 mousemove만 발생하고 mouseout이 안 떠서,
    // 파티클이 크게 흩어진 채 원위치로 복원되지 않는 문제가 있어 비활성화한다.
    const canHover =
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;

    // radius=반발 반경, strength=반발 세기. 입력수단에 따라 값을 다르게 설정한다.
    const mouse = { x: -1000, y: -1000, radius: 100, strength: 20 };
    // 데스크톱(마우스): 넓은 반경 + 강한 척력으로 큼직한 원형 공간
    const DESKTOP = { radius: 100, strength: 20 };
    // 모바일(터치): 좁은 반경 + 약한 척력으로 부드럽게 반응
    const TOUCH = { radius: 70, strength: 7 };

    const reset = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.radius = DESKTOP.radius;
      mouse.strength = DESKTOP.strength;
    };

    // 터치: 좌표를 갱신하되 부드러운 값 사용. touchend/cancel에서 반드시 리셋해
    // 파티클이 원위치로 복원되게 한다(모바일에서 흩어진 채 고정되는 문제 해결).
    const handleTouch = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const rect = canvas.getBoundingClientRect();
      mouse.x = touch.clientX - rect.left;
      mouse.y = touch.clientY - rect.top;
      mouse.radius = TOUCH.radius;
      mouse.strength = TOUCH.strength;
    };

    if (!reduceMotion && canHover) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseout", reset);
    }
    // 터치 인터랙션은 모션 사용자면 활성화(리셋으로 복원 보장되므로 안전)
    if (!reduceMotion) {
      window.addEventListener("touchstart", handleTouch, { passive: true });
      window.addEventListener("touchmove", handleTouch, { passive: true });
      window.addEventListener("touchend", reset, { passive: true });
      window.addEventListener("touchcancel", reset, { passive: true });
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

      (ctx as any).letterSpacing = "0px"; // 자간 원복

      // 반응형: 컨테이너 가로폭(94%)을 채우도록 폰트 크기를 잡는다 → 화면이 넓어지면 타이틀도 커진다.
      // 대표 글리프 어센트는 세로 중앙정렬 및 세로 잘림 방지에 사용.
      const refAscentAt = (fs: number) => {
        let a = 0;
        for (const seg of segments) {
          ctx.font = `${fontWeight} ${fs}px ${familyOf(seg.latin)}`;
          const ref = seg.latin ? "H" : "한";
          a = Math.max(a, ctx.measureText(ref).actualBoundingBoxAscent);
        }
        return a;
      };
      // 1) 가로 채우기: 목표 폭(컨테이너 94%)에 맞춰 fontSize 산정
      const maxWidth = rect.width * 0.94;
      const wAt100 = measureTotal(100);
      let fontSize = wAt100 > 0 ? 100 * (maxWidth / wAt100) : 200;
      // 2) 세로 안전: 대표 글리프 높이×stretchY가 컨테이너 88%를 넘으면 그만큼만 축소(잘림 방지 + 여백)
      const maxCapVisual = rect.height * 0.88;
      let capA = refAscentAt(fontSize);
      if (capA * stretchY > maxCapVisual) {
        fontSize *= maxCapVisual / (capA * stretchY);
        capA = refAscentAt(fontSize);
      }
      fontSize = Math.max(fontSize, 40); // 하한선
      capA = refAscentAt(fontSize);
      const totalWidth = measureTotal(fontSize);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic"; // 혼합 폰트가 같은 베이스라인에 앉도록
      ctx.fillStyle = "white";

      ctx.save();
      // 순수 영문은 길쭉하게(1.4), 국문 혼합은 원본 비율(1.0)로 세로 스케일 조정
      ctx.scale(1, stretchY);
      // 세그먼트를 좌→우로 이어 그리되(각자 알맞은 폰트) 전체를 가로 중앙정렬
      let penX = rect.width / 2 - totalWidth / 2;
      // 대표 글리프(cap) 박스를 세로 중앙에 정렬 → 디센더 유무·글자와 무관하게 여백 일정
      const baselineY = rect.height / (2 * stretchY) + capA / 2;
      for (const seg of segments) {
        ctx.font = `${fontWeight} ${fontSize}px ${familyOf(seg.latin)}`;
        ctx.fillText(seg.text, penX, baselineY);
        penX += ctx.measureText(seg.text).width;
      }
      ctx.restore();

      const textData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      ctx.clearRect(0, 0, rect.width, rect.height);

      // 다크모드 여부에 따라 파티클 색상 결정 (next-themes 사용)
      const isDarkMode = resolvedTheme === "dark";
      const color = isDarkMode ? "#8a8a8f" : "#1d1d1f"; // 다크모드 타이틀을 살짝 어둡게(은은하게)
      
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

      // 세로 크기·정렬은 draw 단계에서 cap-height 기준으로 이미 일정하게 맞췄다.
      // 여기서는 아주 긴 이름이 가로 안전폭(글리치/부유 이동 여유)을 넘을 때만 중앙 기준 균일 축소.
      if (particles.length > 0 && maxPx >= minPx) {
        const inkW = maxPx - minPx;
        const targetW = canvas.width * 0.94;
        const scale = Math.min(1, targetW / inkW);
        if (scale < 1) {
          const cx = canvas.width / 2 / dpr;   // 캔버스 중심(논리 좌표)
          const cy = canvas.height / 2 / dpr;
          for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.originX = cx + (p.originX - cx) * scale;
            p.originY = cy + (p.originY - cy) * scale;
            p.x = cx + (p.x - cx) * scale;
            p.y = cy + (p.y - cy) * scale;
          }
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
        p.update(mouse.x, mouse.y, mouse.radius, mouse.strength, t);
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

    // 스크롤 중에는 루프를 멈춰 캔버스를 '정지 텍스처'로 둔다(매 프레임 재드로잉이 스크롤 합성과
    // 경쟁해 버벅이는 것을 방지). 스크롤이 멎으면 잠시 뒤 재개.
    let scrollIdleTimer: ReturnType<typeof setTimeout>;
    const onScrollPause = () => {
      if (!ready || reduceMotion) return;
      if (running) stopLoop();
      clearTimeout(scrollIdleTimer);
      scrollIdleTimer = setTimeout(() => {
        if (onScreen && !document.hidden) startLoop();
      }, 180);
    };
    window.addEventListener("scroll", onScrollPause, { passive: true });

    // 폰트 로드 후 초기화 지연 (글꼴이 안 그려지는 이슈 방지).
    // 캔버스는 폰트를 'DOM 레이아웃'이 아니라 캔버스 전용으로만 쓰기 때문에, 브라우저가
    // 실제 웹폰트를 내려받지 않은 채 document.fonts.ready가 먼저 resolve될 수 있다.
    // 그러면 next/font의 metric-adjusted 폴백(size-adjust 등 CSS 전용 보정이 들어간 face)이
    // 캔버스에 그려져 글자가 겹쳐 깨진다(특히 안드로이드). → 라틴·국문 실제 face를 명시 로드한다.
    const krText = segments.filter((s) => !s.latin).map((s) => s.text).join("");
    const latinText = segments.filter((s) => s.latin).map((s) => s.text).join("");
    const bebasPrimary = bebasFamily.split(",")[0].trim(); // 폴백 말고 실제 Bebas face 지정
    const fontLoads: Promise<unknown>[] = [];
    if (latinText) fontLoads.push(document.fonts.load(`400 100px ${bebasPrimary}`, latinText));
    if (hasKorean) fontLoads.push(document.fonts.load(`400 100px "TitleKR"`, krText));
    const fontReady = Promise.all(fontLoads).then(() => document.fonts.ready);
    // 폰트 로드가 실패해도(네트워크/CDN 문제) 시스템 폰트로 반드시 그려지도록 보장
    fontReady.catch(() => {}).then(() => {
      init();
      ready = true;
      if (reduceMotion) drawStatic();
      else if (onScreen && !document.hidden) startLoop();
    });

    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      // 리사이즈 중엔 캔버스를 컨테이너 크기에 맞춰 즉시 CSS 스케일 → 옛 크기 잔상이 넘쳐 글자가 겹쳐 보이는 것 방지.
      // 잠시 뒤 재계산(init)으로 해당 크기에 맞춰 선명하게 다시 그린다.
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        init();
        if (reduceMotion) drawStatic();
      }, 80);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseout", reset);
      window.removeEventListener("touchstart", handleTouch);
      window.removeEventListener("touchmove", handleTouch);
      window.removeEventListener("touchend", reset);
      window.removeEventListener("touchcancel", reset);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", onScrollPause);
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
      stopLoop();
      clearTimeout(resizeTimer);
      clearTimeout(scrollIdleTimer);
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
