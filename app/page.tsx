"use client";

import { useRef, useState, useEffect } from "react";

const DIRECTIONS = ["up", "down", "left", "right", "straight", "closed"];

export default function CalibratePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState(-1); // -1 = not started, 0 = align face, 1+ = capturing
  const [label, setLabel] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [captureCount, setCaptureCount] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStep(0); // start "align face"
    } catch (error) {
      alert("Camera permission needed.");
    }
  }

  /** Capture and upload one frame */
  async function capture(label: string) {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9)
    );

    if (!blob) return;

    const formData = new FormData();
    formData.append("label", label);
    formData.append("image", blob);

    try {
      const response = await fetch("/api/saveFrame", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        console.error("Failed to upload image");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
    }
  }

  /** Cleanup stream on unmount */
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  /** Runs automatically when step changes */
  useEffect(() => {
    if (step >= 1 && step <= DIRECTIONS.length) {
      const currentLabel = DIRECTIONS[step - 1];
      setLabel(currentLabel);
      setCaptureCount(0);

      // Countdown and capture sequence
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setCountdown(1); // Start countdown

      // After countdown, capture 1-3 frames
      setTimeout(async () => {
        const framesToCapture = 2; // Capture 2 frames per direction
        for (let i = 0; i < framesToCapture; i++) {
          await capture(currentLabel);
          setCaptureCount(i + 1);
          // Small delay between captures
          if (i < framesToCapture - 1) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }

        // Move to next direction after a brief pause
        setTimeout(() => {
          setStep(step + 1);
        }, 500);
      }, 1000);
    }
  }, [step]);

  // Start screen
  if (step === -1) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center bg-[#1a1a1a]">
        <h1 className="text-2xl font-semibold mb-4 text-white">
          Gaze Calibration
        </h1>
        <p className="text-lg mb-8 text-gray-300 max-w-md">
          We will take a few pictures of your eyes. These images stay private.
        </p>
        <button
          className="px-8 py-4 text-xl bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors min-h-[60px] min-w-[200px]"
          onClick={startCamera}
        >
          Start Calibration
        </button>
      </div>
    );
  }

  // Face alignment screen
  if (step === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 bg-[#1a1a1a]">
        <div className="w-full max-w-md relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-lg shadow-lg"
            style={{ maxHeight: "60vh", objectFit: "cover" }}
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-blue-500 rounded-full w-48 h-64 opacity-50"></div>
          </div>
        </div>
        <p className="text-xl mt-6 text-center text-white font-medium">
          Center your face in the frame
        </p>
        <button
          onClick={() => setStep(1)}
          className="mt-6 px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors text-lg min-h-[56px]"
        >
          Continue
        </button>
      </div>
    );
  }

  // Completion screen
  if (step > DIRECTIONS.length) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center bg-[#1a1a1a]">
        <div className="text-3xl font-semibold mb-4 text-white">
          Calibration complete!
        </div>
        <p className="text-lg text-gray-300 mb-8">
          Your images have been saved successfully.
        </p>
      </div>
    );
  }

  // Direction capture screen
  return (
    <div className="flex flex-col items-center justify-center h-screen p-6 bg-[#1a1a1a] relative">
      <div className="w-full max-w-md relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full rounded-lg shadow-lg opacity-50"
          style={{ maxHeight: "60vh", objectFit: "cover" }}
        />
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60">
        <div className="bg-gray-800 rounded-lg p-8 max-w-sm mx-4 text-center shadow-xl border border-gray-700">
          <p className="text-3xl font-semibold mb-4 text-white">
            Look {label}
          </p>
          {countdown > 0 && (
            <p className="text-2xl text-blue-400 font-bold mb-2">
              {countdown}
            </p>
          )}
          {countdown === 0 && captureCount > 0 && (
            <p className="text-lg text-gray-300">
              Capturing... ({captureCount}/2)
            </p>
          )}
          {countdown === 0 && captureCount === 0 && (
            <p className="text-lg text-gray-300">Hold still...</p>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
