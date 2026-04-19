/** Normalized 75×2 keypoint frames from POST /api/text-to-sign (same as Text to Sign page). */
export type MannequinFrame = number[][];

export function isMissingPt(pt: number[]) {
  return Math.abs(pt[0]) < 0.001 && Math.abs(pt[1]) < 0.001;
}

/** True if `frames` from /api/text-to-sign are 75×[x,y] keypoints (not MediaPipe landmark objects). */
export function isMannequinFrameList(frames: unknown[] | null | undefined): frames is MannequinFrame[] {
  if (!frames?.length) return false;
  const f = frames[0];
  if (!Array.isArray(f) || f.length < 33) return false;
  const p0 = f[0];
  return Array.isArray(p0) && p0.length >= 2 && typeof p0[0] === "number" && typeof p0[1] === "number";
}

export type DrawMannequinFrameOptions = {
  /** When true (default), a neutral idle pose is drawn if `frame` is null. Set false to only clear to the grid background (e.g. Text to Sign before any translation). */
  idlePlaceholder?: boolean;
  /**
   * Vertical anchor for the pose (fraction of canvas height). Slightly higher = figure moves up.
   * Default balances the figure in the frame for typical ASL poses.
   */
  verticalAnchor?: number;
};

/** Pro mannequin renderer (shared by Text to Sign and learning Medium/Hard). */
export function drawMannequinFrame(
  frame: MannequinFrame | null,
  canvas: HTMLCanvasElement,
  options?: DrawMannequinFrameOptions,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#0f0f1a";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(139,92,246,0.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i++) {
    ctx.beginPath();
    ctx.moveTo((i * W) / 10, 0);
    ctx.lineTo((i * W) / 10, H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, (i * H) / 10);
    ctx.lineTo(W, (i * H) / 10);
    ctx.stroke();
  }

  const idlePlaceholder = options?.idlePlaceholder !== false;
  if (frame == null && !idlePlaceholder) {
    return;
  }

  const currentFrame =
    frame ||
    (Array.from({ length: 75 }, (_, i) => {
      if (i === 11) return [-0.15, 0];
      if (i === 12) return [0.15, 0];
      return [0, 0];
    }) as MannequinFrame);

  const CX = W * 0.5;
  const anchorY = options?.verticalAnchor ?? 0.43;
  const CY = H * anchorY;
  const SCALE = Math.min(W, H) * 0.94;
  /** Head / face size tracks SCALE so small canvases (e.g. learning) stay proportional to limbs. */
  const HR = SCALE * 0.083;

  const B = (kp: number[]) => ({ x: CX + kp[0] * SCALE, y: CY + kp[1] * SCALE });

  const lSh = B(currentFrame[11]);
  const rSh = B(currentFrame[12]);
  const headCX = (lSh.x + rSh.x) / 2;
  const headCY = (lSh.y + rSh.y) / 2 - SCALE * 0.16;

  const bodyLines = [[11, 12], [11, 23], [12, 24], [23, 24]] as const;
  ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
  ctx.lineWidth = Math.max(5, SCALE * 0.018);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  bodyLines.forEach(([s, e]) => {
    if (isMissingPt(currentFrame[s]) || isMissingPt(currentFrame[e])) return;
    ctx.beginPath();
    ctx.moveTo(B(currentFrame[s]).x, B(currentFrame[s]).y);
    ctx.lineTo(B(currentFrame[e]).x, B(currentFrame[e]).y);
    ctx.stroke();
  });

  const neckTop = headCY + HR * 0.88;
  const neckBot = headCY + HR * 1.42;
  ctx.beginPath();
  ctx.moveTo(headCX, neckTop);
  ctx.lineTo(headCX, neckBot);
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = Math.max(6, SCALE * 0.028);
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(headCX, headCY - HR * 0.12, HR * 1.07, Math.PI, 2 * Math.PI);
  ctx.fillStyle = "#0F172A";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(headCX - HR, headCY - HR * 0.19);
  ctx.lineTo(headCX - HR * 1.14, headCY + HR * 0.36);
  ctx.lineTo(headCX - HR * 0.48, headCY - HR * 0.12);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(headCX + HR, headCY - HR * 0.19);
  ctx.lineTo(headCX + HR * 1.14, headCY + HR * 0.36);
  ctx.lineTo(headCX + HR * 0.48, headCY - HR * 0.12);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(headCX, headCY, HR, 0, Math.PI * 2);
  ctx.fillStyle = "#E2E8F0";
  ctx.fill();
  ctx.strokeStyle = "#94A3B8";
  ctx.lineWidth = Math.max(2, SCALE * 0.006);
  ctx.stroke();

  ctx.fillStyle = "#334155";
  ctx.beginPath();
  ctx.ellipse(headCX - HR * 0.36, headCY - HR * 0.07, HR * 0.14, HR * 0.19, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(headCX + HR * 0.36, headCY - HR * 0.07, HR * 0.14, HR * 0.19, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FFF";
  ctx.beginPath();
  ctx.arc(headCX - HR * 0.38, headCY - HR * 0.12, HR * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(headCX + HR * 0.33, headCY - HR * 0.12, HR * 0.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(headCX, headCY + HR * 0.1);
  ctx.lineTo(headCX - HR * 0.1, headCY + HR * 0.33);
  ctx.lineTo(headCX, headCY + HR * 0.33);
  ctx.strokeStyle = "#94A3B8";
  ctx.lineWidth = Math.max(1.5, SCALE * 0.004);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(headCX, headCY + HR * 0.52, HR * 0.24, 0.2, Math.PI - 0.2);
  ctx.strokeStyle = "#E07A5F";
  ctx.lineWidth = Math.max(2, SCALE * 0.006);
  ctx.stroke();

  const armLines = [[11, 13], [13, 15], [12, 14], [14, 16]] as const;
  ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
  ctx.lineWidth = Math.max(5, SCALE * 0.016);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  armLines.forEach(([s, e]) => {
    if (isMissingPt(currentFrame[s]) || isMissingPt(currentFrame[e])) return;
    ctx.beginPath();
    ctx.moveTo(B(currentFrame[s]).x, B(currentFrame[s]).y);
    ctx.lineTo(B(currentFrame[e]).x, B(currentFrame[e]).y);
    ctx.stroke();
  });

  const fingers = [
    [0, 1, 2, 3, 4],
    [0, 5, 6, 7, 8],
    [0, 9, 10, 11, 12],
    [0, 13, 14, 15, 16],
    [0, 17, 18, 19, 20],
  ];
  const handColor = "#FBBF24";
  const armColor = "rgba(148, 163, 184, 0.8)";

  [
    { offset: 33, wrist: 15 },
    { offset: 54, wrist: 16 },
  ].forEach((hand) => {
    if (isMissingPt(currentFrame[hand.offset]) || isMissingPt(currentFrame[hand.wrist])) return;

    const wristPx = B(currentFrame[hand.wrist]);
    const handBasePx = B(currentFrame[hand.offset]);
    const dx = wristPx.x - handBasePx.x;
    const dy = wristPx.y - handBasePx.y;
    const glued = (index: number) => {
      const pt = B(currentFrame[index]);
      return { x: pt.x + dx, y: pt.y + dy };
    };

    ctx.beginPath();
    ctx.moveTo(wristPx.x, wristPx.y);
    ctx.lineTo(glued(hand.offset).x, glued(hand.offset).y);
    ctx.strokeStyle = armColor;
    ctx.lineWidth = Math.max(4, SCALE * 0.014);
    ctx.stroke();

    ctx.strokeStyle = handColor;
    ctx.lineWidth = Math.max(4, SCALE * 0.012);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    fingers.forEach((finger) => {
      ctx.beginPath();
      ctx.moveTo(glued(hand.offset).x, glued(hand.offset).y);
      for (let j = 1; j < finger.length; j++) {
        if (isMissingPt(currentFrame[hand.offset + finger[j]])) continue;
        ctx.lineTo(glued(hand.offset + finger[j]).x, glued(hand.offset + finger[j]).y);
      }
      ctx.stroke();
    });
  });
}
