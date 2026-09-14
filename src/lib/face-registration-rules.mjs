export const FACE_POSE_TYPES = ["FRONT", "LEFT", "RIGHT", "UP", "DOWN"];

export function validateFacePoseTypes(value, count) {
  if (!Array.isArray(value) || value.length !== count) {
    return { valid: false, reason: "POSE_COUNT_MISMATCH" };
  }
  const poses = value.map((item) =>
    typeof item === "string" ? item.toUpperCase() : "",
  );
  if (poses.some((pose) => !FACE_POSE_TYPES.includes(pose))) {
    return { valid: false, reason: "POSE_REQUIRED" };
  }
  if (new Set(poses).size !== poses.length) {
    return { valid: false, reason: "DUPLICATE_POSE" };
  }
  if (!poses.includes("FRONT")) {
    return { valid: false, reason: "FRONT_REQUIRED" };
  }
  return { valid: true, poses };
}

export function normalizeCoursePage(value, totalItems, pageSize = 20) {
  const safeSize = Math.max(1, Math.min(100, Number(pageSize) || 20));
  const totalPages = Math.max(1, Math.ceil(Math.max(0, Number(totalItems) || 0) / safeSize));
  const requested = Number.parseInt(String(value || "1"), 10);
  const page = Math.min(totalPages, Math.max(1, Number.isFinite(requested) ? requested : 1));
  return { page, pageSize: safeSize, totalPages, offset: (page - 1) * safeSize };
}
