"use client";

import { useRef, useState, useEffect, useCallback } from "react";

const DIRECTIONS = ["up", "down", "left", "right", "straight", "closed"];

export default function CalibratePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState(-1); // -1 = not started, 0 = align face, 1+ = capturing
  const [label, setLabel] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [captureCount, setCaptureCount] = useState(0);
  const [showRedFlash, setShowRedFlash] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Ensure video plays
        videoRef.current.play().catch(console.error);
      }
      setStep(0); // start "align face"
    } catch (error) {
      alert("Camera permission needed.");
    }
  }

  // Ensure video plays when stream is set
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.error);
    }
  }, [step]);

  /** Detect and crop eye region from video */
  const getEyeRegion = useCallback((videoWidth: number, videoHeight: number) => {
    // Focus on upper center portion where eyes typically are
    // Crop to show approximately 40% width centered, and upper 50% height
    const cropWidth = videoWidth * 0.4;
    const cropHeight = videoHeight * 0.5;
    const cropX = (videoWidth - cropWidth) / 2;
    const cropY = videoHeight * 0.1; // Start from 10% down (above eyes)
    
    return {
      sourceX: cropX,
      sourceY: cropY,
      sourceWidth: cropWidth,
      sourceHeight: cropHeight,
      destWidth: videoWidth,
      destHeight: videoHeight,
    };
  }, []);

  /** Capture and upload one frame with eye focus */
  const capture = useCallback(async (label: string) => {
    if (!videoRef.current || !canvasRef.current) {
      console.error("Video or canvas not available");
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;

    // Wait for video to be ready
    if (video.readyState < 2) {
      await new Promise((resolve) => {
        video.addEventListener("loadeddata", resolve, { once: true });
      });
    }

    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;
    
    // Set canvas to full size for upload
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("Could not get canvas context");
      return;
    }

    // Get eye region and draw cropped/zoomed version
    const eyeRegion = getEyeRegion(videoWidth, videoHeight);
    
    // Draw the cropped eye region, scaled up to fill canvas
    ctx.drawImage(
      video,
      eyeRegion.sourceX,
      eyeRegion.sourceY,
      eyeRegion.sourceWidth,
      eyeRegion.sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9)
    );

    if (!blob) {
      console.error("Failed to create blob from canvas");
      return;
    }

    const formData = new FormData();
    formData.append("label", label);
    formData.append("image", blob, `image-${Date.now()}.jpg`);

    try {
      const response = await fetch("/api/saveFrame", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error("Failed to upload image:", data);
        // Show error to user
        if (data.error) {
          alert(`Upload failed: ${data.error}`);
        }
      } else {
        console.log("Image uploaded successfully:", data.filename);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert(`Upload error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }, [getEyeRegion]);

  /** Cleanup stream on unmount */
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  /** Animate eye-focused video display */
  useEffect(() => {
    if (step >= 1 && step <= DIRECTIONS.length && videoRef.current && displayCanvasRef.current) {
      const video = videoRef.current;
      const canvas = displayCanvasRef.current;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) return;

      // Set canvas size based on container
      const updateCanvasSize = () => {
        const container = canvas.parentElement;
        if (container) {
          const rect = container.getBoundingClientRect();
          canvas.width = rect.width;
          canvas.height = Math.min(rect.height, window.innerHeight * 0.6);
        }
      };

      updateCanvasSize();
      window.addEventListener("resize", updateCanvasSize);

      const animate = () => {
        if (video.readyState >= 2 && video.videoWidth > 0 && canvas.width > 0) {
          const videoWidth = video.videoWidth;
          const videoHeight = video.videoHeight;
          const eyeRegion = getEyeRegion(videoWidth, videoHeight);
          
          // Draw cropped and zoomed eye region
          ctx.drawImage(
            video,
            eyeRegion.sourceX,
            eyeRegion.sourceY,
            eyeRegion.sourceWidth,
            eyeRegion.sourceHeight,
            0,
            0,
            canvas.width,
            canvas.height
          );
        }
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      
      animate();
      
      return () => {
        window.removeEventListener("resize", updateCanvasSize);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [step, getEyeRegion]);

  /** Runs automatically when step changes */
  useEffect(() => {
    if (step >= 1 && step <= DIRECTIONS.length) {
      const currentLabel = DIRECTIONS[step - 1];
      setLabel(currentLabel);
      setCaptureCount(0);
      setShowRedFlash(false);

      // Countdown and capture sequence
      let countdownInterval: NodeJS.Timeout;
      
      setCountdown(3); // Start countdown at 3 seconds

      countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // After countdown, capture 5 frames
      setTimeout(async () => {
        const framesToCapture = 5; // Capture 5 frames per direction
        for (let i = 0; i < framesToCapture; i++) {
          await capture(currentLabel);
          setCaptureCount(i + 1);
          // Small delay between captures
          if (i < framesToCapture - 1) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }

        // Show red flash before changing directions
        setShowRedFlash(true);
        
        // Move to next direction after red flash (3 seconds)
        setTimeout(() => {
          setShowRedFlash(false);
          setStep(step + 1);
        }, 3000);
      }, 3000); // Wait 3 seconds for countdown
    }
  }, [step, capture]);

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
        <button
          onClick={() => {
            setStep(1);
            setCaptureCount(0);
            setCountdown(0);
          }}
          className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-lg min-h-[56px]"
        >
          Retake Pictures
        </button>
      </div>
    );
  }

  // Direction capture screen
  return (
    <div className="flex flex-col items-center justify-center h-screen p-6 bg-[#1a1a1a] relative">
      <div className="w-full max-w-md relative">
        {/* Hidden video for processing */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="hidden"
        />
        {/* Canvas showing zoomed eye region */}
        <canvas
          ref={displayCanvasRef}
          className="w-full rounded-lg shadow-lg"
          style={{ maxHeight: "60vh", objectFit: "cover" }}
        />
      </div>

      {/* Red flash overlay */}
      {showRedFlash && (
        <div 
          className="absolute inset-0 bg-red-600 z-50" 
          style={{ 
            animation: "redFlash 200ms ease-in-out infinite",
            opacity: 0.95
          }} 
        />
      )}

      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60">
        <div className="bg-gray-800 rounded-lg p-8 max-w-sm mx-4 text-center shadow-xl border border-gray-700">
          <p className="text-3xl font-semibold mb-4 text-white">
            {label === "closed" ? "Close your eyes and Count to 5" : `Look ${label}`}
          </p>
          {countdown > 0 && (
            <p className="text-2xl text-blue-400 font-bold mb-2">
              {countdown}
            </p>
          )}
          {countdown === 0 && captureCount > 0 && (
            <p className="text-lg text-gray-300">
              Capturing... ({captureCount}/5)
            </p>
          )}
          {countdown === 0 && captureCount === 0 && !showRedFlash && (
            <p className="text-lg text-gray-300">Hold still...</p>
          )}
          {showRedFlash && (
            <p className="text-2xl text-white font-bold">Changing direction...</p>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
