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
  const CY = H * 0.35;
  const SCALE = Math.min(W, H) * 0.85;

  const B = (kp: number[]) => ({ x: CX + kp[0] * SCALE, y: CY + kp[1] * SCALE });

  const lSh = B(currentFrame[11]);
  const rSh = B(currentFrame[12]);
  const headCX = (lSh.x + rSh.x) / 2;
  const headCY = (lSh.y + rSh.y) / 2 - SCALE * 0.16;

  ctx.beginPath();
  ctx.moveTo(headCX, headCY + 40);
  ctx.lineTo(headCX, headCY + 60);
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 14;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(headCX, headCY - 5, 45, Math.PI, 2 * Math.PI);
  ctx.fillStyle = "#0F172A";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(headCX - 42, headCY - 8);
  ctx.lineTo(headCX - 48, headCY + 15);
  ctx.lineTo(headCX - 20, headCY - 5);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(headCX + 42, headCY - 8);
  ctx.lineTo(headCX + 48, headCY + 15);
  ctx.lineTo(headCX + 20, headCY - 5);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(headCX, headCY, 42, 0, Math.PI * 2);
  ctx.fillStyle = "#E2E8F0";
  ctx.fill();
  ctx.strokeStyle = "#94A3B8";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#334155";
  ctx.beginPath();
  ctx.ellipse(headCX - 15, headCY - 3, 6, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(headCX + 15, headCY - 3, 6, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FFF";
  ctx.beginPath();
  ctx.arc(headCX - 16, headCY - 5, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(headCX + 14, headCY - 5, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(headCX, headCY + 4);
  ctx.lineTo(headCX - 4, headCY + 14);
  ctx.lineTo(headCX, headCY + 14);
  ctx.strokeStyle = "#94A3B8";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(headCX, headCY + 22, 10, 0.2, Math.PI - 0.2);
  ctx.strokeStyle = "#E07A5F";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const lines = [
    [11, 12],
    [11, 23],
    [12, 24],
    [23, 24],
    [11, 13],
    [13, 15],
    [12, 14],
    [14, 16],
  ] as const;
  lines.forEach(([s, e]) => {
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
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.strokeStyle = handColor;
    ctx.lineWidth = 5;
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
