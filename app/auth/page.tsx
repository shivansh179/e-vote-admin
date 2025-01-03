"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase"; // Adjust import as needed
import { useTheme } from "@/components/ThemeContext";

const AdminLoginPage = () => {
  // Attempt to load credentials from localStorage (if "Remember Me" was previously checked)
  const [email, setEmail] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("adminEmail") || "";
    }
    return "";
  });

  const [password, setPassword] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("adminPassword") || "";
    }
    return "";
  });

  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("adminRememberMe") === "true";
    }
    return false;
  });

  const [error, setError] = useState("");
  const router = useRouter();
  const { theme } = useTheme();

  useEffect(() => {
    // If user toggles "remember me," store or clear credentials in localStorage
    if (rememberMe) {
      localStorage.setItem("adminEmail", email);
      localStorage.setItem("adminPassword", password);
      localStorage.setItem("adminRememberMe", "true");
    } else {
      localStorage.removeItem("adminEmail");
      localStorage.removeItem("adminPassword");
      localStorage.removeItem("adminRememberMe");
    }
  }, [email, password, rememberMe]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/admin"); // Redirect to admin dashboard on successful login
    } catch (error) {
      setError("Invalid email or password. Please try again.");
    }
  };

  // Tailwind classes for light/dark theme handling
  const pageBgStyle =
    theme === "light"
      ? "bg-gradient-to-br from-purple-50 via-indigo-100 to-blue-50 text-gray-700"
      : "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200";

  const cardBgStyle =
    theme === "light" ? "bg-white" : "bg-gray-800 border border-gray-700";

  const inputStyle =
    theme === "light"
      ? "text-gray-900 bg-gray-100"
      : "text-gray-200 bg-gray-700";

  const buttonStyle =
    theme === "light"
      ? "bg-indigo-600 hover:bg-indigo-700 text-white"
      : "bg-indigo-500 hover:bg-indigo-600 text-white";

  return (
    <div className={`min-h-screen flex p-3 items-center justify-center ${pageBgStyle}`}>
      <div className={`w-full max-w-md p-8 rounded-2xl shadow-2xl ${cardBgStyle}`}>
        <h1 className="text-3xl font-bold text-center mb-6">Admin Login</h1>
        
        {/* Decorative divider */}
        <div className="mx-auto w-16 h-1 bg-indigo-500 mb-8 rounded" />

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <p className="text-red-500 text-center font-semibold">{error}</p>
          )}

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`w-full p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 ${inputStyle}`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter your admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`w-full p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 ${inputStyle}`}
            />
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                className="h-4 w-4 rounded focus:ring-indigo-500 accent-indigo-600"
              />
              <span>Remember Me</span>
            </label>
          </div>

          <button
            type="submit"
            className={`w-full p-3 rounded-md font-semibold transition ${buttonStyle}`}
          >
            Log In
          </button>
        </form>

        {/* Subtext or “Forgot Password?” Link */}
        <p className="text-center text-sm mt-4">
          Forgot your password?{" "}
          <span className="text-indigo-400 cursor-pointer hover:text-indigo-300">
            Reset here
          </span>
        </p>
      </div>
    </div>
  );
};

export default AdminLoginPage;
