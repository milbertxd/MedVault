import { useEffect, useRef, useCallback } from "react";
import jsQR from "jsqr";

export default function useQrScanner({
  active,
  videoRef,
  onDetected,
  onError,
  stopOnDetected = false,
  scanIntervalMs = 600,
}) {
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const canvasRef = useRef(null);
  const detectorRef = useRef(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    const start = async () => {
      if (!active) {
        stop();
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        onError?.("Camera access is not supported on this browser.");
        return;
      }

      onError?.("");

      try {
        if (typeof window.BarcodeDetector !== "undefined") {
          detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });
        } else {
          detectorRef.current = null;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        streamRef.current = stream;

        const videoEl = videoRef.current;
        if (!videoEl) {
          stop();
          onError?.("Camera preview is not ready yet. Please try again.");
          return;
        }

        videoEl.srcObject = stream;
        videoEl.setAttribute("playsinline", "true");
        await videoEl.play();

        intervalRef.current = setInterval(async () => {
          const video = videoRef.current;
          if (!video || video.readyState < 2) return;

          let decoded = "";

          if (detectorRef.current) {
            try {
              const codes = await detectorRef.current.detect(video);
              if (codes?.length && codes[0]?.rawValue) {
                decoded = codes[0].rawValue;
              }
            } catch {
              // Ignore per-frame detector failures.
            }
          } else {
            try {
              if (!canvasRef.current) {
                canvasRef.current = document.createElement("canvas");
              }

              const canvas = canvasRef.current;
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              const ctx = canvas.getContext("2d", { willReadFrequently: true });
              if (!ctx) return;

              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const result = jsQR(image.data, image.width, image.height, {
                inversionAttempts: "dontInvert",
              });

              if (result?.data) {
                decoded = result.data;
              }
            } catch {
              // Ignore per-frame decode failures.
            }
          }

          if (decoded) {
            onDetected?.(decoded.trim().toUpperCase());
            if (stopOnDetected) {
              stop();
            }
          }
        }, scanIntervalMs);
      } catch {
        onError?.("Unable to access camera. Check permissions and try again.");
      }
    };

    start();

    return () => {
      stop();
    };
  }, [active, videoRef, onDetected, onError, stopOnDetected, scanIntervalMs, stop]);

  return { stop };
}
