"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import * as faceapi from "face-api.js";
import { FaCamera, FaMoon, FaSun } from "react-icons/fa";
import toast, { Toaster } from "react-hot-toast";

const AdminRegister: React.FC = () => {
  const router = useRouter();

  // Default to dark mode
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Additional states
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [useCamera, setUseCamera] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dialog, setDialog] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error";
  }>( {
    visible: false,
    message: "",
    type: "success",
  });

  // Refs for camera
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // THEME TOGGLING
  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Optionally, you can sync theme with localStorage:
  // useEffect(() => {
  //   const savedTheme = localStorage.getItem("adminRegisterTheme");
  //   if (savedTheme === "dark" || savedTheme === "light") {
  //     setTheme(savedTheme);
  //   }
  // }, []);
  //
  // useEffect(() => {
  //   localStorage.setItem("adminRegisterTheme", theme);
  // }, [theme]);

  // DIALOG / TOAST HELPERS
  const showDialog = (message: string, type: "success" | "error") => {
    setDialog({ visible: true, message, type });
    setTimeout(() => {
      setDialog({ visible: false, message: "", type: "success" });
    }, 3000);
  };

  // LOAD MODELS
  const loadModels = async () => {
    setIsLoading(true);
    setStatus("Loading face detection models...");
    toast("Loading face detection models...");
    try {
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
      ]);
      setStatus("Face detection models loaded successfully.");
      toast("Face detection models loaded successfully.");
    } catch (error) {
      showDialog("Error loading face detection models.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // IMAGE UPLOAD
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImage(e.target.files[0]);
    }
  };

  // CAMERA HANDLERS
  const startCamera = async () => {
    const answer = confirm(
      "This website will access your camera. Do you want to proceed?"
    );
    if (!answer) return;

    setUseCamera(true);
    await loadModels();

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }
  };

  const stopCamera = () => {
    setUseCamera(false);
    const stream = videoRef.current?.srcObject as MediaStream;
    if (stream) {
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
    }
  };

  // FACE DETECTION (from camera)
  const detectFaceFromCamera = async () => {
    // Immediately show spinner
    setIsLoading(true);

    if (!name.trim()) {
      toast.error("Please enter a name before registering.");
      setIsLoading(false);
      return;
    }

    if (!videoRef.current) {
      setIsLoading(false);
      return;
    }

    try {
      const detections = await faceapi
        .detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detections) {
        showDialog("Face not detected. Please adjust your position.", "error");
        toast.error("Face not detected. Please adjust your position.");
        return;
      }

      // Proceed to registration
      await registerUser(detections.descriptor);
    } catch (error) {
      showDialog("Error detecting face from camera.", "error");
    } finally {
      // Always stop spinner
      setIsLoading(false);
    }
  };

  // FACE DETECTION (from image)
  const detectFaceFromImage = async () => {
    // Immediately show spinner
    setIsLoading(true);

    if (!image) {
      showDialog("Please upload an image first.", "error");
      setIsLoading(false);
      return;
    }

    if (!name.trim()) {
      toast.error("Please enter a name before registering.");
      setIsLoading(false);
      return;
    }

    try {
      await loadModels();

      const img = await faceapi.bufferToImage(image);
      const detections = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detections) {
        showDialog("Face not detected in the image. Please try again.", "error");
        return;
      }

      // Proceed to registration
      await registerUser(detections.descriptor);
    } catch (error) {
      showDialog("Error detecting face from image.", "error");
    } finally {
      // Always stop spinner
      setIsLoading(false);
    }
  };

  // REGISTRATION
  const registerUser = async (embedding: Float32Array) => {
    // Show a loading toast while checking for duplicates
    const checkingToastId = toast.loading("Checking for duplicate registration...");

    try {
      const votersSnapshot = await getDocs(collection(db, "voters"));
      let isDuplicate = false;

      votersSnapshot.forEach((doc) => {
        const voterData = doc.data();
        const dbEmbedding = new Float32Array(voterData.embedding);
        const distance = faceapi.euclideanDistance(embedding, dbEmbedding);

        // Threshold of 0.6 indicates likely the same person
        if (distance < 0.6) {
          isDuplicate = true;
        }
      });

      if (isDuplicate) {
        toast.dismiss(checkingToastId);
        toast.error("Duplicate registration detected. This user is already registered.");
        return;
      }

      const userId = `user_${Date.now()}`;
      await addDoc(collection(db, "voters"), {
        user_id: userId,
        name,
        embedding: Array.from(embedding),
        voted: false,
      });

      // Dismiss the "checking" toast and show success
      toast.dismiss(checkingToastId);
      showDialog(`User registered successfully! ID: ${userId}`, "success");

      // Clear inputs
      setName("");
      setImage(null);

      // Update admin progress in localStorage
      localStorage.setItem("adminProgress", "1");
      localStorage.setItem("faceIdAdded", "true");

      // Redirect to /admin after a short delay so user can see success message
      setTimeout(() => {
        router.push("/admin");
      }, 1500);
    } catch (error) {
      toast.dismiss(checkingToastId);
      showDialog(
        `Error during registration: ${(error as Error).message}`,
        "error"
      );
    }
  };

  // THEMED CLASSES
  const containerClass =
    theme === "dark"
      ? "min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 relative px-4"
      : "min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100 text-gray-800 relative px-4";

  const cardClass =
    theme === "dark"
      ? "relative bg-gray-800 w-full max-w-xl p-6 rounded-lg shadow-md text-gray-100"
      : "relative bg-white w-full max-w-xl p-6 rounded-lg shadow-md text-gray-800";

  const labelClass =
    theme === "dark"
      ? "block text-sm font-medium text-gray-300 mb-1"
      : "block text-sm font-medium text-gray-600 mb-1";

  const inputClass =
    theme === "dark"
      ? "w-full p-3 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-700 text-gray-100"
      : "w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";

  // Button for toggling theme
  const ThemeToggleButton = () => (
    <div
      className="absolute top-2 left-2 p-2 rounded-full bg-gray-700 text-white shadow-md cursor-pointer flex items-center justify-center transition-colors hover:bg-gray-600"
      onClick={toggleTheme}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <FaSun size={20} /> : <FaMoon size={20} />}
    </div>
  );

  return (
    <div className={containerClass}>
      {/* Theme Toggle */}
      <ThemeToggleButton />

      {/* Title */}
      <h1 className="text-3xl md:text-4xl font-bold mb-8">
        Admin: Register User
      </h1>

      {/* Registration Card */}
      <div className={cardClass}>
        {/* Camera ON/OFF Indicator */}
        <div
          className={`absolute top-2 right-2 p-2 rounded-full ${
            useCamera ? "bg-green-500 animate-pulse" : "bg-red-500"
          } shadow-md cursor-pointer flex items-center justify-center transition-colors`}
          onClick={useCamera ? stopCamera : startCamera}
          title={useCamera ? "Camera is ON" : "Camera is OFF"}
        >
          <FaCamera size={20} />
        </div>

        {/* Name Input */}
        <div className="mb-6">
          <label htmlFor="name" className={labelClass}>
            User Name
          </label>
          <input
            id="name"
            type="text"
            placeholder="Enter user name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Camera Registration Section */}
        {useCamera && (
          <div className="flex flex-col items-center mb-6">
            <video
              ref={videoRef}
              autoPlay
              muted
              className="border mb-4 rounded-md w-full max-w-sm"
            />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            {/* 
              We show spinner immediately when user clicks this button 
              by calling setIsLoading(true) before detectFaceFromCamera
            */}
            <button
              onClick={detectFaceFromCamera}
              className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 transition"
            >
              Register with Camera
            </button>
          </div>
        )}

        {/* Image Upload Section */}
        <div className="mb-6">
          <label htmlFor="fileInput" className={labelClass}>
            Upload a Photo
          </label>
          <input
            id="fileInput"
            type="file"
            onChange={handleImageUpload}
            accept="image/*"
            className="w-full mb-4 text-sm"
          />
          <button
            onClick={detectFaceFromImage}
            className="w-full bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
          >
            Register with Image
          </button>
        </div>

        {/* Status Text */}
        {status && (
          <p className="text-center mt-2 text-sm">
            {status}
          </p>
        )}
      </div>

      {/* Loading Overlay (Spinner) */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Dialog Overlay */}
      {dialog.visible && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div
            className={`p-6 rounded-lg text-white max-w-sm text-center transition-all ${
              dialog.type === "success" ? "bg-green-500" : "bg-red-500"
            }`}
          >
            <p>{dialog.message}</p>
          </div>
        </div>
      )}

      {/* React Hot Toast Container */}
      <Toaster />
    </div>
  );
};

export default AdminRegister;
