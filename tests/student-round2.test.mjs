import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCoursePage, validateFacePoseTypes } from "../src/lib/face-registration-rules.mjs";

test("face registration requires unique real poses and a front image", () => {
  assert.deepEqual(validateFacePoseTypes(["FRONT", "LEFT", "RIGHT"], 3), {
    valid: true,
    poses: ["FRONT", "LEFT", "RIGHT"],
  });
  assert.equal(validateFacePoseTypes(["FRONT", "LEFT", null], 3).reason, "POSE_REQUIRED");
  assert.equal(validateFacePoseTypes(["FRONT", "LEFT", "LEFT"], 3).reason, "DUPLICATE_POSE");
  assert.equal(validateFacePoseTypes(["LEFT", "RIGHT", "UP"], 3).reason, "FRONT_REQUIRED");
});

test("legacy face samples remain unassigned instead of guessing a pose", () => {
  assert.equal(validateFacePoseTypes([null, null, null], 3).valid, false);
});

test("course attendance pagination uses 20 rows and clamps invalid pages", () => {
  assert.deepEqual(normalizeCoursePage("2", 45, 20), {
    page: 2,
    pageSize: 20,
    totalPages: 3,
    offset: 20,
  });
  assert.equal(normalizeCoursePage("999", 45).page, 3);
  assert.equal(normalizeCoursePage("bad", 0).page, 1);
});
