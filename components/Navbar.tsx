import Link from "next/link";
import React, { useState } from "react";
import Image from "next/image";
import { useTheme } from "./ThemeContext";

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navClasses =
    theme === "light"
      ? "bg-white text-gray-700"
      : "bg-gray-800 text-gray-200";

  const hoverLinkClasses =
    theme === "light"
      ? "hover:text-indigo-500"
      : "hover:text-indigo-300";

  const buttonHoverClasses =
    theme === "light"
      ? "hover:bg-gray-100"
      : "hover:bg-gray-700";

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  // Close mobile menu
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className={`sticky top-0 z-50 shadow ${navClasses}`}>
      <nav className="flex items-center justify-between px-4 py-3 md:px-8">
        {/* Logo / Brand */}
        <Link href="/" aria-label="Home">
          <div className="flex items-center cursor-pointer">
            <Image
              className="rounded-full"
              src="/vote.png"
              alt="Logo"
              width={40}
              height={40}
              priority
            />
          </div>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center space-x-6">
          <Link href="/auth">
            <p className={`font-medium transition ${hoverLinkClasses}`}>
              Admin
            </p>
          </Link>
          {/* Theme Toggle Button (Desktop) */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-full transition ${buttonHoverClasses}`}
            aria-label="Toggle Theme"
          >
            <Image
              src={theme === "light" ? "/night-mode.png" : "/brightness.png"}
              alt={theme === "light" ? "Moon Icon" : "Sun Icon"}
              width={24}
              height={24}
            />
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button
            onClick={toggleMobileMenu}
            className={`p-2 rounded-full transition ${buttonHoverClasses}`}
            aria-label="Open Menu"
          >
            <Image
              src="/hamburger.png"
              alt="Open Menu"
              width={24}
              height={24}
            />
          </button>
        </div>
      </nav>

      {/* Mobile Menu + Backdrop */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-40"
            onClick={closeMobileMenu}
          ></div>

          {/* Sliding Panel */}
          <div
            className={`fixed top-0 right-0 h-full w-64 ${navClasses} shadow-md p-6 z-50 transform ${
              isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
            } transition-transform duration-200`}
          >
            {/* Close Button */}
            <button
              onClick={closeMobileMenu}
              className={`p-2 rounded-full transition ${buttonHoverClasses} mb-4`}
              aria-label="Close Menu"
            >
              <Image
                src="/close.png"
                alt="Close Menu"
                width={24}
                height={24}
              />
            </button>

            {/* Nav Links (Mobile) */}
            <div className="flex flex-col space-y-4">
              <Link href="/auth" onClick={closeMobileMenu}>
                <p className={`font-medium transition ${hoverLinkClasses}`}>
                  Admin
                </p>
              </Link>
              {/* Theme Toggle Button (Mobile) */}
              <button
                onClick={() => {
                  toggleTheme();
                  closeMobileMenu();
                }}
                className={`p-2 rounded-full w-10 transition ${buttonHoverClasses}`}
                aria-label="Toggle Theme"
              >
                <Image
                  src={theme === "light" ? "/night-mode.png" : "/brightness.png"}
                  alt={theme === "light" ? "Moon Icon" : "Sun Icon"}
                  width={24}
                  height={24}
                />
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
};

export default Navbar;
