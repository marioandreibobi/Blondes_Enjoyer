/**
 * Voice mood analyzer — uses Web Audio API to detect emotional tone
 * from microphone audio by analyzing pitch and energy.
 */

export type VoiceMood = "neutral" | "excited" | "calm" | "frustrated" | "happy";

interface AudioFeatures {
  avgPitch: number;    // Hz (0 = undetectable)
  avgEnergy: number;   // RMS energy 0–1
  pitchVariance: number;
  energyVariance: number;
  duration: number;    // seconds
}

/** Start recording audio features from a MediaStream. Returns a stop function. */
export function createMoodAnalyzer(stream: MediaStream): {
  stop: () => VoiceMood;
} {
  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);

  const bufferLength = analyser.fftSize;
  const dataArray = new Float32Array(bufferLength);

  const pitchSamples: number[] = [];
  const energySamples: number[] = [];
  const startTime = Date.now();
  let stopped = false;

  function sample(): void {
    if (stopped) return;
    analyser.getFloatTimeDomainData(dataArray);

    const energy = computeRMS(dataArray);
    energySamples.push(energy);

    // Only compute pitch when there's enough signal
    if (energy > 0.01) {
      const pitch = detectPitch(dataArray, audioCtx.sampleRate);
      if (pitch > 0) pitchSamples.push(pitch);
    }

    requestAnimationFrame(sample);
  }

  sample();

  return {
    stop(): VoiceMood {
      stopped = true;
      source.disconnect();
      void audioCtx.close();

      const duration = (Date.now() - startTime) / 1000;
      const features = extractFeatures(pitchSamples, energySamples, duration);
      return classifyMood(features);
    },
  };
}

function computeRMS(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

/** Autocorrelation-based pitch detection */
function detectPitch(buffer: Float32Array, sampleRate: number): number {
  const size = buffer.length;
  const correlation = new Float32Array(size);

  // Autocorrelation
  for (let lag = 0; lag < size; lag++) {
    let sum = 0;
    for (let i = 0; i < size - lag; i++) {
      sum += buffer[i] * buffer[i + lag];
    }
    correlation[lag] = sum;
  }

  // Find the first peak after the initial decline
  let foundFirstDip = false;
  let bestLag = 0;
  let bestVal = 0;

  // Start from lag = minLag (corresponding to ~500Hz max pitch)
  const minLag = Math.floor(sampleRate / 500);
  const maxLag = Math.floor(sampleRate / 50); // ~50Hz min pitch

  for (let lag = minLag; lag < Math.min(maxLag, size); lag++) {
    if (!foundFirstDip && correlation[lag] < correlation[lag - 1]) {
      foundFirstDip = true;
    }
    if (foundFirstDip && correlation[lag] > bestVal) {
      bestVal = correlation[lag];
      bestLag = lag;
    }
  }

  if (bestLag === 0 || bestVal < 0.01) return 0;
  return sampleRate / bestLag;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / arr.length;
}

function extractFeatures(
  pitchSamples: number[],
  energySamples: number[],
  duration: number
): AudioFeatures {
  return {
    avgPitch: mean(pitchSamples),
    avgEnergy: mean(energySamples),
    pitchVariance: variance(pitchSamples),
    energyVariance: variance(energySamples),
    duration,
  };
}

/**
 * Simple rule-based mood classification from audio features.
 *
 * Pitch & energy baselines (speech norms):
 *  - Average male pitch: ~120Hz, female: ~210Hz, overall ~165Hz
 *  - "high pitch" > 200Hz, "low pitch" < 130Hz
 *  - High energy > 0.08 RMS, low energy < 0.03 RMS
 */
function classifyMood(f: AudioFeatures): VoiceMood {
  // Not enough data
  if (f.duration < 0.5 || (f.avgPitch === 0 && f.avgEnergy < 0.005)) {
    return "neutral";
  }

  const highPitch = f.avgPitch > 200;
  const lowPitch = f.avgPitch > 0 && f.avgPitch < 130;
  const highEnergy = f.avgEnergy > 0.08;
  const lowEnergy = f.avgEnergy < 0.03;
  const highPitchVariance = f.pitchVariance > 2000;

  // High pitch + high energy + high variation → excited/happy
  if (highPitch && highEnergy && highPitchVariance) return "excited";
  if (highPitch && highEnergy) return "happy";

  // High energy + moderate/low pitch + high variance → frustrated
  if (highEnergy && !highPitch && highPitchVariance) return "frustrated";

  // Low pitch + low energy → calm
  if (lowPitch && lowEnergy) return "calm";
  if (lowEnergy) return "calm";

  // High pitch alone → happy tendency
  if (highPitch) return "happy";

  return "neutral";
}
