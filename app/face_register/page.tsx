// app/voting/page.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/firebase";
import * as faceapi from "face-api.js";
import { FaCamera, FaMoon, FaSun } from "react-icons/fa";
import toast, { Toaster } from "react-hot-toast";
import SHA256 from "crypto-js/sha256";

/** -----------------------------
 *  Block and Blockchain Classes
 * -----------------------------
 */
interface BlockData {
  userId: string;
  candidateId: string;
  timestamp: string;
}

class Block {
  public index: number;
  public timestamp: string;
  public data: any;
  public previousHash: string;
  public hash: string;
  public nonce: number;

  constructor(
    index: number,
    timestamp: string,
    data: any,
    previousHash = "",
    nonce = 0
  ) {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.nonce = nonce;
    this.hash = this.calculateHash();
  }

  public calculateHash(): string {
    return SHA256(
      this.index +
        this.previousHash +
        this.timestamp +
        JSON.stringify(this.data) +
        this.nonce
    ).toString();
  }
}

class Blockchain {
  public chain: Block[];

  constructor() {
    this.chain = [];
    this.createGenesisBlock();
  }

  private createGenesisBlock() {
    if (this.chain.length === 0) {
      const genesisBlock = new Block(
        0,
        new Date().toISOString(),
        { isGenesis: true },
        "0",
        0
      );
      this.chain.push(genesisBlock);
    }
  }

  public getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  public addBlock(newData: BlockData): void {
    const lastBlock = this.getLatestBlock();
    const newBlock = new Block(
      lastBlock.index + 1,
      new Date().toISOString(),
      newData,
      lastBlock.hash,
      0
    );
    this.chain.push(newBlock);
  }

  public isChainValid(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // Uncomment to enable hash validation
      // const recalculatedHash = currentBlock.calculateHash();
      // if (currentBlock.hash !== recalculatedHash) {
      //   console.error(
      //     `Block #${currentBlock.index} hash mismatch:
      //      Stored:      ${currentBlock.hash}
      //      Recalculated:${recalculatedHash}`
      //   );
      //   return false;
      // }

      if (currentBlock.previousHash !== previousBlock.hash) {
        console.error(
          `Block #${currentBlock.index} previousHash mismatch:
           currentBlock.previousHash: ${currentBlock.previousHash}
           previousBlock.hash:       ${previousBlock.hash}`
        );
        return false;
      }
    }
    return true;
  }
}

/** -----------------------------
 *  Firestore Helpers
 * -----------------------------
 */
const votingBlockchain = new Blockchain();

async function saveBlockchainToFirebase(chain: Blockchain) {
  const chainCol = collection(db, "debugChain");
  for (const block of chain.chain) {
    const docRef = doc(chainCol, block.index.toString());
    await setDoc(docRef, {
      index: block.index,
      timestamp: block.timestamp,
      data: block.data,
      previousHash: block.previousHash,
      hash: block.hash,
      nonce: block.nonce,
    });
  }
}

/** -----------------------------
 *  Admin Register Component
 * -----------------------------
 */
const AdminRegister: React.FC = () => {
  const router = useRouter();

  // Default to dark mode
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Additional states
  const [voterEmail, setVoterEmail] = useState("");
  const [status, setStatus] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [useCamera, setUseCamera] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dialog, setDialog] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error";
  }>({
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
      toast.success("Face detection models loaded successfully.");
    } catch (error) {
      showDialog("Error loading face detection models.", "error");
      toast.error("Error loading face detection models.");
      console.error(error);
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
    setIsLoading(true); // show spinner immediately

    if (!voterEmail.trim()) {
      toast.error("Please enter an email before registering.");
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
      toast.error("Error detecting face from camera.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // FACE DETECTION (from image)
  const detectFaceFromImage = async () => {
    setIsLoading(true); // show spinner immediately

    if (!image) {
      showDialog("Please upload an image first.", "error");
      setIsLoading(false);
      return;
    }

    if (!voterEmail.trim()) {
      toast.error("Please enter an email before registering.");
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
        toast.error("Face not detected in the image. Please try again.");
        return;
      }

      // Proceed to registration
      await registerUser(detections.descriptor);
    } catch (error) {
      showDialog("Error detecting face from image.", "error");
      toast.error("Error detecting face from image.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * REGISTRATION / UPDATE
   * 1) Check if the `voterEmail` exists in the `users` collection.
   * 2) If found, check if that doc already has an embedding; if yes, show error and stop.
   * 3) Otherwise, check for duplicate face embeddings in `userEmbeddings` collection.
   * 4) If not duplicate, update the found doc with the new face embedding and add to `userEmbeddings`.
   */
  const registerUser = async (embedding: Float32Array) => {
    // Show a loading toast while checking for the user doc
    const checkingToastId = toast.loading(
      "Verifying email & checking for duplicates..."
    );

    try {
      // 1) Get all docs from "users"
      const usersSnapshot = await getDocs(collection(db, "users"));

      // Find the doc with the matching email
      let userDocId: string | null = null;
      let userDocData: any = null;

      usersSnapshot.forEach((docSnap) => {
        const userData = docSnap.data();
        if (userData.email === voterEmail) {
          userDocId = docSnap.id;
          userDocData = userData;
        }
      });

      if (!userDocId) {
        toast.dismiss(checkingToastId);
        toast.error("You are not registered / Your credentials are not present.");
        return;
      }

      // 2) If user doc has an existing embedding, show error & stop
      if (userDocData?.embedding) {
        toast.dismiss(checkingToastId);
        toast.error("Face data already exists for this email. Cannot add another.");
        return;
      }

      // 3) Check for duplicate face embeddings in "userEmbeddings" collection
      const embeddingsSnapshot = await getDocs(collection(db, "userEmbeddings"));
      let isDuplicate = false;

      embeddingsSnapshot.forEach((docSnap) => {
        const embeddingData = docSnap.data();
        if (embeddingData.embedding) {
          const dbEmbedding = new Float32Array(embeddingData.embedding);
          const distance = euclideanDistance(embedding, dbEmbedding);

          // Threshold of 0.6 => likely the same person
          if (distance < 0.6) {
            isDuplicate = true;
          }
        }
      });

      if (isDuplicate) {
        toast.dismiss(checkingToastId);
        toast.error("Duplicate face detected. This user (face) is already registered.");
        return;
      }

      // 4) If not duplicate, update the found doc with the new data and add to "userEmbeddings"
      const userDocRef = doc(db, "users", userDocId);
      await updateDoc(userDocRef, {
        embedding: Array.from(embedding),
        voted: false,
      });

      // Add embedding to "userEmbeddings" collection
      await setDoc(doc(collection(db, "userEmbeddings")), {
        email: voterEmail,
        embedding: Array.from(embedding),
        timestamp: new Date().toISOString(),
      });

      toast.dismiss(checkingToastId);
      showDialog(`Face data saved successfully for: ${voterEmail}`, "success");
      toast.success(`Face data saved successfully for: ${voterEmail}`);

      // Clear inputs
      setVoterEmail("");
      setImage(null);

      // Optionally, store progress in localStorage
      localStorage.setItem("adminProgress", "1");
      localStorage.setItem("faceIdAdded", "true");

      // Redirect to /admin after a short delay so user can see success message
      setTimeout(() => {
        router.push("/admin");
      }, 1500);
    } catch (error) {
      toast.dismiss(checkingToastId);
      showDialog(`Error during registration: ${(error as Error).message}`, "error");
      toast.error(`Error during registration: ${(error as Error).message}`);
      console.error(error);
    }
  };

  /**
   * Helper Function to Calculate Euclidean Distance between two embeddings
   */
  const euclideanDistance = (emb1: Float32Array, emb2: Float32Array): number => {
    let sum = 0;
    for (let i = 0; i < emb1.length; i++) {
      sum += Math.pow(emb1[i] - emb2[i], 2);
    }
    return Math.sqrt(sum);
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

        {/* Email Input */}
        <div className="mb-6">
          <label htmlFor="email" className={labelClass}>
            User Email
          </label>
          <input
            id="email"
            type="text"
            placeholder="Enter user email"
            value={voterEmail}
            onChange={(e) => setVoterEmail(e.target.value)}
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
            <button
              onClick={detectFaceFromCamera}
              className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 transition"
              disabled={isLoading}
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
            disabled={isLoading}
          >
            Register with Image
          </button>
        </div>

        {/* Status Text */}
        {status && <p className="text-center mt-2 text-sm">{status}</p>}
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
