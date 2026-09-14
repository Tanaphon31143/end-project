import assert from 'node:assert/strict';
import test from 'node:test';
import { attachCameraPreview, listVideoCameras, waitForVisibleCameraFrame } from '../src/lib/video-preview.mjs';

function fakeVideo(ready = false) {
  const video = new EventTarget();
  video.readyState = ready ? 2 : 0;
  video.videoWidth = ready ? 640 : 0;
  video.videoHeight = ready ? 480 : 0;
  video.srcObject = null;
  video.play = async () => {};
  return video;
}

test('camera preview attaches a persistent video element and waits for a frame', async () => {
  const video = fakeVideo(), stream = { id: 'camera' };
  const pending = attachCameraPreview(video, stream, 100);
  assert.equal(video.srcObject, stream);
  video.readyState = 2;
  video.videoWidth = 640;
  video.videoHeight = 480;
  video.dispatchEvent(new Event('loadeddata'));
  await pending;
  assert.equal(video.srcObject, stream);
});

test('a missing video or a stream without frames cannot be marked ready', async () => {
  await assert.rejects(attachCameraPreview(null, {}), /ช่องแสดงภาพกล้อง/);
  const video = fakeVideo();
  await assert.rejects(attachCameraPreview(video, {}, 10), /ยังไม่มีภาพ/);
  assert.equal(video.srcObject, null);
});

function fakeCanvas(brightness) {
  return { getContext: () => ({
    drawImage: () => {},
    getImageData: () => ({ data: new Uint8ClampedArray(32 * 24 * 4).map((_, index) => index % 4 === 3 ? 255 : brightness) }),
  }) };
}

test('black camera frames are rejected while visible frames are accepted', async () => {
  const video = fakeVideo(true);
  await waitForVisibleCameraFrame(video, () => fakeCanvas(100), 20);
  await assert.rejects(waitForVisibleCameraFrame(video, () => fakeCanvas(0), 20), /ภาพดำ/);
});

test('available video cameras retain device IDs for manual selection', async () => {
  const devices = await listVideoCameras({ enumerateDevices: async () => [
    { kind: 'audioinput', deviceId: 'mic', label: 'Mic' },
    { kind: 'videoinput', deviceId: 'front', label: 'Front' },
    { kind: 'videoinput', deviceId: 'rear', label: '' },
  ] });
  assert.deepEqual(devices, [
    { deviceId: 'front', label: 'Front' },
    { deviceId: 'rear', label: 'กล้อง 2' },
  ]);
});
