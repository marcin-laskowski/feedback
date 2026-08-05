"use client";

/**
 * Drag-to-reposition for the trigger.
 *
 * The trigger sits over somebody else's page, so wherever it defaults to, it
 * will eventually cover the one thing a reporter wants to point at. Being able
 * to move it out of the way is what stops the widget from becoming the bug.
 *
 * Position is remembered in localStorage per origin and re-clamped whenever the
 * viewport or the trigger itself changes size — a trigger dragged to the far
 * right of a wide monitor must not end up off screen on a laptop, and the label
 * swaps between "Zgłoś uwagę" and "Zamknij", which changes its width.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { readJSON, writeJSON } from "./storage";

const POS_KEY = "fb.pos";
const EDGE = 16;
/** Below this, a pointer movement is a click with a shaky hand, not a drag. */
const DRAG_THRESHOLD = 4;
/** Used until the element has been measured. Roughly the closed pill. */
const FALLBACK_SIZE = { w: 140, h: 40 };

export type Point = { x: number; y: number };
export type Size = { w: number; h: number };

export function useDraggable(ref: RefObject<HTMLElement | null>) {
  const [pos, setPos] = useState<Point | null>(null);
  const [size, setSize] = useState<Size>(FALLBACK_SIZE);
  const [dragging, setDragging] = useState(false);

  const posRef = useRef<Point | null>(null);
  const sizeRef = useRef<Size>(FALLBACK_SIZE);
  const origin = useRef<{ px: number; py: number; start: Point } | null>(null);
  /** True once the pointer travelled far enough that the release is not a click. */
  const moved = useRef(false);

  const clamp = useCallback((point: Point): Point => {
    const { w, h } = sizeRef.current;
    const maxX = Math.max(EDGE, window.innerWidth - w - EDGE);
    const maxY = Math.max(EDGE, window.innerHeight - h - EDGE);
    return {
      x: Math.min(Math.max(point.x, EDGE), maxX),
      y: Math.min(Math.max(point.y, EDGE), maxY),
    };
  }, []);

  /** Bottom centre: reachable with either thumb, and clear of the right-hand
   *  rail most sites put their own controls in. */
  const defaultPoint = useCallback((): Point => {
    const { w, h } = sizeRef.current;
    return clamp({ x: (window.innerWidth - w) / 2, y: window.innerHeight - h - EDGE });
  }, [clamp]);

  const apply = useCallback((point: Point) => {
    posRef.current = point;
    setPos(point);
  }, []);

  // Measure before the first paint, then place. Measuring first matters: the
  // default position is derived from the width, and a pill is not a square.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () => {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      sizeRef.current = { w: rect.width, h: rect.height };
      setSize(sizeRef.current);
      if (posRef.current) apply(clamp(posRef.current));
    };

    measure();

    const stored = readJSON<Point>("local", POS_KEY);
    apply(
      stored && Number.isFinite(stored.x) && Number.isFinite(stored.y)
        ? clamp(stored)
        : defaultPoint()
    );

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, apply, clamp, defaultPoint]);

  useEffect(() => {
    const onResize = () => {
      if (posRef.current) apply(clamp(posRef.current));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [apply, clamp]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      origin.current = {
        px: event.clientX,
        py: event.clientY,
        start: posRef.current ?? defaultPoint(),
      };
      moved.current = false;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [defaultPoint]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const start = origin.current;
      if (!start) return;

      const dx = event.clientX - start.px;
      const dy = event.clientY - start.py;
      if (!moved.current && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;

      moved.current = true;
      apply(clamp({ x: start.start.x + dx, y: start.start.y + dy }));
    },
    [apply, clamp]
  );

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (!origin.current) return;
    origin.current = null;
    setDragging(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // The capture is already gone (pointercancel). Nothing to release.
    }
    if (moved.current && posRef.current) writeJSON("local", POS_KEY, posRef.current);
  }, []);

  /** Call from onClick: true when the release ended a drag, not a click. */
  const consumedByDrag = useCallback(() => moved.current, []);

  return { pos, size, dragging, onPointerDown, onPointerMove, onPointerUp, consumedByDrag };
}
