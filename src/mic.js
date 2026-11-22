// 마이크 입력: 실시간 음정 추정(자기상관) + 녹음
export async function createMic() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
  });
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  const src = ac.createMediaStreamSource(stream);
  const analyser = ac.createAnalyser();
  analyser.fftSize = 2048;
  src.connect(analyser);
  const buf = new Float32Array(analyser.fftSize);

  let recorder = null;
  const chunks = [];
  if (window.MediaRecorder) {
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.start(1000);
  }

  let stopped = null;
  return {
    /** 현재 음정(MIDI 번호, 소수 포함) 또는 무음이면 null */
    readMidi() {
      analyser.getFloatTimeDomainData(buf);
      const hz = detectPitch(buf, ac.sampleRate);
      return hz ? 69 + 12 * Math.log2(hz / 440) : null;
    },
    setRecording(on) {
      if (!recorder) return;
      if (on && recorder.state === 'paused') recorder.resume();
      if (!on && recorder.state === 'recording') recorder.pause();
    },
    /** 정리 후 녹음 파일 URL 반환 */
    stop() {
      if (stopped) return stopped;
      stopped = new Promise((resolve) => {
        const done = () => {
          stream.getTracks().forEach((t) => t.stop());
          ac.close();
          resolve(chunks.length ? URL.createObjectURL(new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' })) : null);
        };
        if (recorder && recorder.state !== 'inactive') { recorder.onstop = done; recorder.stop(); } else done();
      });
      return stopped;
    },
  };
}

// 자기상관 기반 피치 검출 (80Hz ~ 1000Hz)
function detectPitch(buf, sampleRate) {
  let rms = 0;
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / buf.length);
  if (rms < 0.012) return null;

  const minLag = Math.floor(sampleRate / 1000);
  const maxLag = Math.floor(sampleRate / 80);
  let best = -1, bestCorr = 0;
  const n = buf.length - maxLag;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let c = 0, e1 = 0, e2 = 0;
    for (let i = 0; i < n; i++) { c += buf[i] * buf[i + lag]; e1 += buf[i] * buf[i]; e2 += buf[i + lag] * buf[i + lag]; }
    const norm = c / Math.sqrt(e1 * e2 || 1);
    if (norm > bestCorr) { bestCorr = norm; best = lag; }
  }
  if (bestCorr < 0.85 || best < 0) return null;
  return sampleRate / best;
}
