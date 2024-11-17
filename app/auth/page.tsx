"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase"; // Adjust the import based on your firebase config
import { useTheme } from "@/components/ThemeContext";

const AdminLoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const { theme } = useTheme();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/admin"); // Redirect to the admin page on successful login
    } catch (error) {
      setError("Invalid email or password. Please try again.");
    }
  };

  const inputStyle = theme === "light" 
    ? "text-gray-900 bg-white" 
    : "text-white bg-gray-700";

  return (
    <div className={`min-h-screen flex items-center justify-center ${theme === "light" ? "bg-gray-100" : "bg-gray-900 text-gray-200"}`}>
      <div className={`w-full max-w-md p-8 rounded-lg shadow-lg ${theme === "light" ? "bg-white" : "bg-gray-800"}`}>
        <h1 className="text-2xl font-semibold text-center mb-6">Admin Login</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          {error && <p className="text-red-500 text-center">{error}</p>}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={`w-full p-3 border rounded-md focus:outline-none focus:border-blue-500 ${inputStyle}`}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={`w-full p-3 border rounded-md focus:outline-none focus:border-blue-500 ${inputStyle}`}
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 transition"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginPage;
