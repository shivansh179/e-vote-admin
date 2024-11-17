"use client";

import React, { useState } from "react";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import * as faceapi from "face-api.js";
import { FaCamera } from "react-icons/fa";

const AdminRegister = () => {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [image, setImage] = useState(null);
  const [useCamera, setUseCamera] = useState(false);

  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  // Load models for face detection and recognition
  const loadModels = async () => {
    setStatus("Loading face detection models...");
    await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
    await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
    await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
    setStatus("Face detection models loaded successfully.");
  };

  const handleImageUpload = (e) => {
    setImage(e.target.files[0]);
  };

  const startCamera = async () => {
    let answer = confirm("This website is accessing your camera. Are you aware ?");
    {answer ? setUseCamera(true):null}
    await loadModels()

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }
  };

  const stopCamera = () => {
    setUseCamera(false);
    const stream = videoRef.current?.srcObject;
    if (stream) {
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
    }
  };

  const detectFaceFromCamera = async () => {
    if (!videoRef.current) return;

    const detections = await faceapi
      .detectSingleFace(videoRef.current)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detections) {
      setStatus("Face not detected. Please adjust your position.");
      return;
    }

    await registerUser(detections.descriptor);
  };

  const detectFaceFromImage = async () => {
    if (!image) {
      setStatus("Please upload an image.");
      return;
    }

    await loadModels();

    const img = await faceapi.bufferToImage(image);
    const detections = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detections) {
      setStatus("Face not detected in the image. Please try again.");
      return;
    }

    await registerUser(detections.descriptor);
  };

  const registerUser = async (embedding) => {
    try {
      if (!name) {
        setStatus("Please enter the user's name.");
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
        setStatus("Duplicate registration detected. This user is already registered.");
        return;
      }

      // Generate a unique ID for the user
      const userId = `user_${Date.now()}`;

      // Store user information and embedding in Firebase
      await addDoc(collection(db, "voters"), {
        user_id: userId,
        name,
        embedding: Array.from(embedding), // Convert Float32Array to regular array
        voted: false, // Initialize voted flag
      });

      setStatus(`User registered successfully! ID: ${userId}`);
      setName("");
      setImage(null);
    } catch (error) {
      setStatus(`Error during registration: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 relative">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Admin: Register User</h1>
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg ">
        {/* Camera Icon */}
        <div
          className={`absolute top-2 right-2 p-2 rounded-full ${
            useCamera ? "bg-green-500 animate-pulse mt-7" : "bg-red-500"
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
    </div>
  );
};

export default AdminRegister;
