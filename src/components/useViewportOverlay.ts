"use client";
import { useEffect, type RefObject } from "react";

/**
 * 모바일 가상 키보드 대응.
 *
 * iOS Safari는 키보드가 떠도 레이아웃 뷰포트를 줄이지 않아서, 화면 중앙에 뜬
 * `position: fixed` 모달이 키보드에 가려진다. visualViewport(실제 보이는 영역)에
 * 맞춰 오버레이의 크기·위치를 조정하면, 중앙 정렬된 모달이 키보드 위 보이는
 * 영역의 중앙으로 자동으로 올라온다. Android/Chrome은 대개 레이아웃이 줄지만
 * 동일 로직이 무해하게 동작한다.
 *
 * @param ref    조정할 오버레이(전체화면 fixed) 엘리먼트 ref
 * @param active 오버레이가 화면에 떠 있는 동안 true
 */
export function useViewportOverlay(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
) {
  useEffect(() => {
    if (!active) return;
    const vv = window.visualViewport;
    const el = ref.current;
    if (!vv || !el) return;

    const apply = () => {
      // inset:0(top/right/bottom/left=0) 대신 보이는 영역 박스로 덮어쓴다.
      el.style.top = `${vv.offsetTop}px`;
      el.style.left = `${vv.offsetLeft}px`;
      el.style.right = "auto";
      el.style.bottom = "auto";
      el.style.width = `${vv.width}px`;
      el.style.height = `${vv.height}px`;
    };

    apply();
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    return () => {
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
    };
  }, [ref, active]);
}
