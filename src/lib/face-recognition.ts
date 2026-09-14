"use client";

import type HumanType from "@human-browser";

let enginePromise: Promise<HumanType> | null = null;

export function getFaceEngine() {
  if (!enginePromise)
    enginePromise = (async () => {
      const { default: Human } = await import("@human-browser");
      const config = {
        modelBasePath: "/models/human/",
        cacheModels: true,
        filter: { enabled: true, equalization: true },
        face: {
          enabled: true,
          detector: {
            rotation: true,
            maxDetected: 2,
            minConfidence: 0.65,
            return: false,
          },
          mesh: { enabled: true },
          description: { enabled: true },
          iris: { enabled: false },
          emotion: { enabled: false },
          antispoof: { enabled: true },
          liveness: { enabled: true },
        },
        body: { enabled: false },
        hand: { enabled: false },
        object: { enabled: false },
        gesture: { enabled: true },
        segmentation: { enabled: false },
      } as const;
      try {
        const human = new Human({ ...config, backend: 'webgl' });
        await human.load();
        return human;
      } catch {
        const human = new Human({ ...config, backend: 'cpu' });
        await human.load();
        return human;
      }
    })().catch(error => { enginePromise = null; throw error; });
  return enginePromise;
}

export function resetFaceEngine() {
  enginePromise = null;
}

async function analyze(source: HTMLCanvasElement | HTMLImageElement, requireLiveness = false) {
  const human = await getFaceEngine(),
    result = await human.detect(source);
  if (!result.face.length) throw new Error("ไม่พบใบหน้าในภาพ");
  if (result.face.length > 1) throw new Error("ภาพต้องมีใบหน้าเพียง 1 คน");
  const face = result.face[0],
    embedding = face.embedding;
  if (!embedding || embedding.length < 128)
    throw new Error("ไม่สามารถสร้างข้อมูลจดจำใบหน้าจากภาพนี้ได้");
  const sourceWidth =
    source instanceof HTMLCanvasElement ? source.width : source.naturalWidth;
  const faceRatio = face.box[2] / Math.max(1, sourceWidth);
  if (faceRatio < 0.18)
    throw new Error("ใบหน้าอยู่ไกลเกินไป กรุณาเข้าใกล้กล้อง");
  const sourceHeight = source instanceof HTMLCanvasElement ? source.height : source.naturalHeight;
  const centerX = (face.box[0] + face.box[2] / 2) / sourceWidth;
  const centerY = (face.box[1] + face.box[3] / 2) / sourceHeight;
  if (centerX < 0.2 || centerX > 0.8 || centerY < 0.15 || centerY > 0.85)
    throw new Error("กรุณาวางใบหน้าไว้กลางกรอบกล้องแล้วถ่ายใหม่");
  const quality = Math.min(
    1,
    Math.max(0, (face.boxScore + face.faceScore) / 2),
  );
  if (quality < 0.55)
    throw new Error("ภาพใบหน้าไม่ชัด กรุณาถ่ายใหม่ในที่มีแสงเพียงพอ");
  const real = typeof face.real === "number" ? face.real : 0;
  const live = typeof face.live === "number" ? face.live : 0;
  const liveness = Math.min(real, live);
  if (requireLiveness && (real < 0.65 || live < 0.55))
    throw new Error("ไม่ผ่านการตรวจจับบุคคลจริง กรุณากะพริบตาหรือขยับใบหน้าเล็กน้อยและสแกนใหม่");
  const gestures = result.gesture
    .filter((item) => "face" in item && item.face === 0)
    .map((item) => item.gesture);
  return { embedding: [...embedding], quality, liveness, real, live, gestures };
}

function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("ไม่สามารถประมวลผลรูปภาพได้")),
      "image/jpeg",
      0.88,
    ),
  );
}
function fitSize(width: number, height: number, max = 960) {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function analyzeImageFile(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP");
  if (file.size > 8 * 1024 * 1024)
    throw new Error("ไฟล์ต้นฉบับต้องมีขนาดไม่เกิน 8 MB");
  const url = URL.createObjectURL(file),
    image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("ไม่สามารถเปิดไฟล์รูปภาพได้"));
      image.src = url;
    });
    const size = fitSize(image.naturalWidth, image.naturalHeight),
      canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    canvas.getContext("2d")?.drawImage(image, 0, 0, size.width, size.height);
    const analysis = await analyze(canvas),
      blob = await canvasBlob(canvas);
    return { ...analysis, blob, preview: canvas.toDataURL("image/jpeg", 0.78) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function analyzeVideoFrame(video: HTMLVideoElement) {
  if (!video.videoWidth || !video.videoHeight)
    throw new Error("กล้องยังไม่พร้อม กรุณารอสักครู่");
  const size = fitSize(video.videoWidth, video.videoHeight),
    canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("อุปกรณ์ไม่รองรับการประมวลผลรูปภาพ");
  context.drawImage(video, 0, 0, size.width, size.height);
  const analysis = await analyze(canvas, true),
    blob = await canvasBlob(canvas);
  return { ...analysis, blob, preview: canvas.toDataURL("image/jpeg", 0.78) };
}

export function matchesEnrollmentPose(pose: 'FRONT' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN', gestures: string[]) {
  const required: Record<typeof pose, string> = {
    FRONT: 'facing center', LEFT: 'facing left', RIGHT: 'facing right', UP: 'head up', DOWN: 'head down',
  };
  if (!gestures.includes(required[pose])) return false;
  if (pose === 'UP' || pose === 'DOWN') return gestures.includes('facing center');
  return true;
}

export async function analyzeVideoObservation(video: HTMLVideoElement) {
  if (!video.videoWidth || !video.videoHeight)
    throw new Error("กล้องยังไม่พร้อม กรุณารอสักครู่");
  const size = fitSize(video.videoWidth, video.videoHeight, 640);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("อุปกรณ์ไม่รองรับการประมวลผลรูปภาพ");
  context.drawImage(video, 0, 0, size.width, size.height);
  return analyze(canvas);
}
