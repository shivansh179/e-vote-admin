import Link from 'next/link';
import React, { useState } from 'react';
import Image from 'next/image';
import { useTheme } from './ThemeContext';

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Toggle mobile menu visibility
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Close mobile menu
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="flex items-center justify-between p-4 bg-white shadow-md dark:bg-gray-800">
      {/* Logo */}
      <div className="flex-shrink-0">
        <Link href="/" aria-label="Home">
          <div className="w-10 h-10">
            <Image
              className="rounded-full"
              src="/vote.png"
              alt="Logo"
              width={40}
              height={40}
              layout="fixed"
              priority
            />
          </div>
        </Link>
      </div>

          {/* Desktop Navigation Links */}
          <div className='flex gap-5'>
            <button
          onClick={toggleTheme}
          className="p-2 rounded-md hidden md:block hover:bg-indigo-200 dark:hover:bg-indigo-600 transition-all duration-300"
        >
          <Image
            src={theme === 'light' ? '/moon-icon.png' : '/sun-icon.png'}
            alt={theme === 'light' ? 'Sun Icon' : 'Moon Icon'}
            width={24}
            height={24}
            className="transition-all duration-300"
          />
        </button>
      <div className="flex items-center gap-10">
        <div className="hidden md:flex space-x-8">
          <Link href="/auth">
            <p className="text-gray-700 font-semibold hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 rounded dark:text-white">
              Admin
            </p>
          </Link>
         
                  </div>
                  </div>

        {/* Theme Toggle Button with Sun and Moon Icons */}
      
      </div>

      {/* Mobile Menu Button */}
      <div className="md:hidden">
        <button
          aria-label="Open Menu"
          onClick={toggleMobileMenu}
          className="text-gray-700 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 rounded dark:text-white"
        >
          ☰
        </button>
      </div>

      {/* Mobile Menu with Backdrop */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-40"
            onClick={closeMobileMenu}
          ></div>

          {/* Sidebar */}
          <div className="fixed top-0 right-0 left-44 h-full w-64 bg-white dark:bg-gray-800 shadow-lg p-6 z-50 transform translate-x-0 transition-transform duration-300">
            {/* Close Button */}
            <button
              aria-label="Close Menu"
              onClick={closeMobileMenu}
              className="text-gray-700 dark:text-white hover:text-blue-600 focus:outline-none"
            >
              ✕
            </button>

            <div className="mt-8 space-y-6">
              {/* Navigation Links */}
              <Link href="/auth" onClick={closeMobileMenu}>
                <p className="text-gray-700 font-semibold hover:text-blue-600 dark:text-white">
                  Admin
                </p>
              </Link>
              <Link href="/user" onClick={closeMobileMenu}>
                <p className="text-gray-700 font-semibold hover:text-blue-600 dark:text-white">
                  User
                </p>
              </Link>
            </div>

            {/* Theme Toggle Button */}
            <div className="mt-8">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-600 transition-all duration-300"
              >
                <Image
                  src={theme === 'light' ? '/moon-icon.png' : '/sun-icon.png'}
                  alt={theme === 'light' ? 'Sun Icon' : 'Moon Icon'}
                  width={24}
                  height={24}
                  className="transition-all duration-300"
                />
              </button>
            </div>
          </div>
        </>
      )}
    </nav>
  );
};

export default Navbar;
