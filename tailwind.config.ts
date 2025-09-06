import type { Config } from "tailwindcss";

export default {
  darkMode: 'media',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Resend-inspired color palette
        primary: {
          DEFAULT: '#000000', // Pure black - main brand color
          light: '#1f2937',   // Gray-800: Soft black
          dark: '#000000',    // Pure black
        },
        accent: {
          DEFAULT: '#000000', // Pure black accent
          light: '#374151',   // Gray-700: Dark gray
          dark: '#000000',    // Pure black
        },
        neutral: {
          DEFAULT: '#ffffff', // Pure white
          50: '#f9fafb',      // Gray-50: Lightest gray
          100: '#f3f4f6',     // Gray-100: Very light gray
          200: '#e5e7eb',     // Gray-200: Light gray
          300: '#d1d5db',     // Gray-300: Medium light gray
          400: '#9ca3af',     // Gray-400: Medium gray
          500: '#6b7280',     // Gray-500: Medium dark gray
          600: '#4b5563',     // Gray-600: Dark gray
          700: '#374151',     // Gray-700: Very dark gray
          800: '#1f2937',     // Gray-800: Almost black
          900: '#111827',     // Gray-900: Near black
        },
        surface: {
          light: '#ffffff',   // Pure white
          dark: '#111827',    // Gray-900: Dark surface
        },
        text: {
          DEFAULT: '#111827', // Gray-900: Main text
          light: '#6b7280',   // Gray-500: Light text
          dark: '#ffffff',    // White text for dark backgrounds
        },
        border: {
          light: '#e5e7eb',   // Gray-200: Light borders
          dark: '#374151',    // Gray-700: Dark borders
        }
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'soft': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'medium': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'large': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'glow': '0 0 0 1px rgba(59, 130, 246, 0.15), 0 0 0 4px rgba(59, 130, 246, 0.1)',
        'glow-hover': '0 0 0 1px rgba(59, 130, 246, 0.3), 0 0 20px rgba(59, 130, 246, 0.2), 0 0 40px rgba(59, 130, 246, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.1)' },
          '100%': { boxShadow: '0 0 30px rgba(59, 130, 246, 0.2), 0 0 40px rgba(59, 130, 246, 0.1)' },
        },
      }
    },
  },
  plugins: [require('daisyui')],
  
  // DaisyUI config
  daisyui: {
    themes: false, // Disable DaisyUI themes to keep our custom black/white design
    darkTheme: false,
    base: false, // Disable base component styles
    styled: true, // Keep component styles
    utils: true, // Keep utility classes
  },
} satisfies Config;
