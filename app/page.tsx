"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import { useTheme } from "@/components/ThemeContext";
import { useRouter } from "next/navigation";

const LandingPage = () => {
  const { theme } = useTheme(); // Access the current theme
  const router = useRouter();

  const handleScrollToSection = (sectionId: string) => {
    const sectionElement = document.getElementById(sectionId);
    if (sectionElement) {
      sectionElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <Navbar />
      <div
        className={`min-h-screen transition-colors duration-500 ${
          theme === "light" ? "bg-gray-100 text-gray-900" : "bg-gray-900 text-gray-200"
        }`}
      >
        {/* Hero Section */}
        <section
          className={`text-center py-20 ${
            theme === "light"
              ? "bg-gradient-to-r from-indigo-400 to-indigo-600"
              : "bg-gradient-to-r from-gray-700 via-gray-800 to-black"
          }`}
        >
          <h1 className="text-5xl font-extrabold mb-4 tracking-tight leading-tight">
            Welcome to India's Election App 
          </h1>
          <p className="text-xl mb-6 font-medium">
            Empowering Democracy with Secure Digital Voting
          </p>
          <div className="flex justify-center items-center gap-4">
            <button
              className="bg-white text-indigo-600 px-8 py-3 rounded-full text-lg font-semibold shadow-lg hover:bg-gray-100 hover:scale-105 transform transition"
              onClick={() => handleScrollToSection("about")}
            >
              Learn More
            </button>
          </div>
        </section>

        {/* About Section */}
        <section
          id="about"
          className={`py-16 px-8 transition-colors ${
            theme === "light" ? "bg-white text-gray-900" : "bg-gray-800 text-gray-300"
          }`}
        >
          <h2 className="text-4xl font-bold text-center mb-12">
            Why Digital Voting Matters
          </h2>
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <img
              src="/vote.jpg"
              alt="Digital Voting Illustration"
              className="rounded-lg shadow-lg w-full h-auto hover:scale-105 transition transform duration-300"
            />
            <div className="space-y-6">
              <p>
                Elections are the cornerstone of any democracy. They provide citizens the power to choose their leaders,
                shaping the future of the nation. However, traditional voting processes can be cumbersome and time-consuming.
              </p>
              <p>
                Our digital voting app streamlines this process with a secure, accessible, and efficient platform. It ensures
                transparency, accuracy, and inclusivity for all.
              </p>
              <p>
                Join us in revolutionizing India's election system. Together, we can create a more inclusive and efficient
                democratic process.
              </p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section
          className={`py-16 px-8 transition-colors ${
            theme === "light" ? "bg-gray-50 text-gray-900" : "bg-gray-700 text-gray-200"
          }`}
        >
          <h2 className="text-4xl font-bold text-center mb-12">Key Features</h2>
          <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Secure Voting",
                description: "Ensure every vote is securely stored and accurately counted.",
              },
              {
                title: "Easy Access",
                description: "Vote from anywhere using mobile, tablet, or desktop devices.",
              },
              {
                title: "Instant Results",
                description: "Track real-time election results as votes are counted.",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className={`p-6 rounded-lg shadow-lg border ${
                  theme === "light"
                    ? "bg-white border-gray-200 hover:bg-gray-100"
                    : "bg-gray-800 border-gray-700 hover:bg-gray-700"
                } transition transform hover:scale-105 duration-300`}
              >
                <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Call to Action Section */}
        <section
          className={`text-center py-20 transition-colors ${
            theme === "light"
              ? "bg-gradient-to-r from-indigo-400 to-indigo-600 text-gray-100"
              : "bg-gradient-to-r from-gray-700 via-gray-800 to-black text-gray-300"
          }`}
        >
          <h2 className="text-4xl font-bold mb-6">Be a Part of the Change</h2>
          <p className="text-lg font-medium mb-8">
            Join thousands of citizens embracing secure and efficient digital voting.
          </p>
          <button
            className="bg-blue-600 text-white px-10 py-4 rounded-full text-lg font-bold shadow-lg hover:bg-blue-700 hover:scale-105 transform transition"
            onClick={() => router.push("/auth")}
          >
            Admin Section
          </button>
        </section>

        {/* Footer Section */}
        <footer
          className={`py-6 text-center transition-colors ${
            theme === "light" ? "bg-gray-800 text-white" : "bg-gray-900 text-gray-300"
          }`}
        >
          <p className="text-sm">
            &copy; 2024 ElectionApp | All Rights Reserved
          </p>
          <p className="text-sm">
            <span>Follow us:</span>
            <a href="https://www.facebook.com/ECI" className="mx-2 hover:underline">
              Facebook
            </a>
            <a href="https://x.com/ECISVEEP" className="mx-2 hover:underline">
              Twitter
            </a>
            <a href="https://www.instagram.com/ecisveep" className="mx-2 hover:underline">
              Instagram
            </a>
          </p>
        </footer>
      </div>
    </>
  );
};

export default LandingPage;
