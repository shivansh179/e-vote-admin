"use client";

import React, { useState } from "react";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import * as faceapi from "face-api.js";
import { FaCamera } from "react-icons/fa";

const AdminRegister: React.FC = () => {
  const [name, setName] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [image, setImage] = useState<File | null>(null);
  const [useCamera, setUseCamera] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dialog, setDialog] = useState<{ visible: boolean; message: string; type: string }>({
    visible: false,
    message: "",
    type: "",
  });

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const loadModels = async (): Promise<void> => {
    setStatus("Loading face detection models...");
    await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
    await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
    await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
    setStatus("Face detection models loaded successfully.");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files.length > 0) {
      setImage(e.target.files[0]);
    }
  };

  const startCamera = async (): Promise<void> => {
    const answer = confirm("This website is accessing your camera. Are you aware?");
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

  const stopCamera = (): void => {
    setUseCamera(false);
    const stream = videoRef.current?.srcObject as MediaStream;
    if (stream) {
      const tracks = stream.getTracks();
      tracks.forEach((track: MediaStreamTrack) => track.stop());
    }
  };

  const detectFaceFromCamera = async (): Promise<void> => {
    if (!videoRef.current) return;

    setIsLoading(true);
    const detections = await faceapi
      .detectSingleFace(videoRef.current)
      .withFaceLandmarks()
      .withFaceDescriptor();

    setIsLoading(false);

    if (!detections) {
      showDialog("Face not detected. Please adjust your position.", "error");
      return;
    }

    await registerUser(detections.descriptor);
  };

  const detectFaceFromImage = async (): Promise<void> => {
    if (!image) {
      showDialog("Please upload an image.", "error");
      return;
    }

    setIsLoading(true);
    await loadModels();

    const img = await faceapi.bufferToImage(image);
    const detections = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();

    setIsLoading(false);

    if (!detections) {
      showDialog("Face not detected in the image. Please try again.", "error");
      return;
    }

    await registerUser(detections.descriptor);
  };

  const registerUser = async (embedding: Float32Array): Promise<void> => {
    try {
      if (!name) {
        showDialog("Please enter the user's name.", "error");
        return;
      }

      setStatus("Checking for duplicate registration...");
      const votersSnapshot = await getDocs(collection(db, "voters"));
      let isDuplicate = false;

      votersSnapshot.forEach((doc) => {
        const voterData = doc.data();
        const dbEmbedding = new Float32Array(voterData.embedding);
        const distance = faceapi.euclideanDistance(embedding, dbEmbedding);

        if (distance < 0.6) {
          isDuplicate = true;
        }
      });

      if (isDuplicate) {
        showDialog("Duplicate registration detected. This user is already registered.", "error");
        return;
      }

      const userId = `user_${Date.now()}`;
      await addDoc(collection(db, "voters"), {
        user_id: userId,
        name,
        embedding: Array.from(embedding),
        voted: false,
      });

      showDialog(`User registered successfully! ID: ${userId}`, "success");
      setName("");
      setImage(null);
    } catch (error) {
      showDialog(`Error during registration: ${(error as Error).message}`, "error");
    }
  };

  const showDialog = (message: string, type: "success" | "error"): void => {
    setDialog({ visible: true, message, type });
    setTimeout(() => {
      setDialog({ visible: false, message: "", type: "" });
    }, 3000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 relative">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Admin: Register User</h1>
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg relative">
        <div
          className={`absolute top-2 right-2 p-2 rounded-full ${
            useCamera ? "bg-green-500 animate-pulse" : "bg-red-500"
          } text-white shadow-lg cursor-pointer`}
          onClick={useCamera ? stopCamera : startCamera}
          title={useCamera ? "Camera is ON" : "Camera is OFF"}
        >
          <FaCamera size={24} />
        </div>
        <input
          type="text"
          placeholder="Enter user name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex flex-col items-center mb-6">
          {useCamera && (
            <div className="w-full flex flex-col items-center">
              <video ref={videoRef} autoPlay muted className="border mb-4 rounded-lg" />
              <canvas ref={canvasRef} style={{ display: "none" }} />
              <button
                onClick={detectFaceFromCamera}
                className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600"
              >
                Register with Camera
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-col items-center mb-6">
          <input
            type="file"
            onChange={handleImageUpload}
            accept="image/*"
            className="w-full mb-4"
          />
          <button
            onClick={detectFaceFromImage}
            className="w-full bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600"
          >
            Register with Image
          </button>
        </div>
        {status && <p className="text-center text-gray-700 mt-4">{status}</p>}
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {dialog.visible && (
        <div
          className={`absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center`}
        >
          <div
            className={`p-6 rounded-lg text-white ${
              dialog.type === "success" ? "bg-green-500" : "bg-red-500"
            }`}
          >
            <p>{dialog.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRegister;
