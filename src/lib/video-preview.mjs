/** Connect a camera stream and wait until its first usable video frame. */
export async function attachCameraPreview(video, stream, timeoutMs = 8000) {
  if (!video) throw new Error('ไม่พบช่องแสดงภาพกล้อง');
  video.srcObject = stream;
  try {
    await video.play();
    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) return;
    await new Promise((resolve, reject) => {
      let timer;
      const finish = (error) => {
        clearTimeout(timer);
        video.removeEventListener('loadeddata', onReady);
        video.removeEventListener('canplay', onReady);
        video.removeEventListener('resize', onReady);
        if (error) reject(error);
        else resolve();
      };
      const onReady = () => {
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) finish();
      };
      video.addEventListener('loadeddata', onReady);
      video.addEventListener('canplay', onReady);
      video.addEventListener('resize', onReady);
      timer = setTimeout(() => finish(new Error('กล้องเปิดแล้วแต่ยังไม่มีภาพ กรุณาเปิดกล้องใหม่')), timeoutMs);
      onReady();
    });
  } catch (error) {
    video.srcObject = null;
    throw error;
  }
}

/** A black preview is not a usable camera frame, even when video metadata is ready. */
export async function waitForVisibleCameraFrame(video, createCanvas, timeoutMs = 4000) {
  const canvas = createCanvas();
  canvas.width = 32;
  canvas.height = 24;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('ไม่สามารถตรวจภาพจากกล้องได้');
  const deadline = Date.now() + timeoutMs;
  do {
    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let visible = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index] + pixels[index + 1] + pixels[index + 2] > 36) visible++;
      }
      if (visible >= 8) return;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  } while (Date.now() < deadline);
  throw new Error('กล้องส่งภาพดำหรือมืดเกินไป กรุณาตรวจฝาปิดเลนส์ แสงสว่าง หรือเลือกกล้องอื่น');
}

export async function listVideoCameras(mediaDevices) {
  if (!mediaDevices.enumerateDevices) return [];
  const devices = await mediaDevices.enumerateDevices();
  return devices.filter(device => device.kind === 'videoinput' && device.deviceId)
    .map((device, index) => ({ deviceId: device.deviceId, label: device.label || `กล้อง ${index + 1}` }));
}
