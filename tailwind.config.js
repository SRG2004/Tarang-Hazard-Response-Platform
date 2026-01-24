/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        }
      },
      animation: {
        'fade-in': 'fadeIn 1.5s ease-in-out',
        'fade-out': 'fadeOut 0.8s ease-in-out',
        'slide-in-right': 'slideInRight 1.5s ease-out',
        'slide-in-left': 'slideInLeft 1.5s ease-out',
        'slide-in-up': 'slideInUp 1.5s ease-out',
        'slide-in-down': 'slideInDown 1.5s ease-out',
        'scale-in': 'scaleIn 1.2s ease-out',
        'scale-out': 'scaleOut 0.5s ease-in',
        'bounce-subtle': 'bounceSubtle 0.6s ease-in-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'wave': 'wave 15s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wave-slow': 'wave 20s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wave-fast': 'wave 10s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ripple': 'ripple 8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'beach-wave': 'beachWave 12s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'twinkle': 'twinkle 2s ease-in-out infinite',
        'star-float': 'starFloat 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        scaleOut: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)' },
        },
        wave: {
          '0%, 100%': { 
            transform: 'translateX(0) translateY(0) scaleY(1)',
            opacity: '0.85'
          },
          '25%': { 
            transform: 'translateX(1.5%) translateY(-0.4%) scaleY(1.01)',
            opacity: '0.87'
          },
          '50%': { 
            transform: 'translateX(0) translateY(-0.8%) scaleY(1.02)',
            opacity: '0.9'
          },
          '75%': { 
            transform: 'translateX(-1.5%) translateY(-0.4%) scaleY(1.01)',
            opacity: '0.87'
          },
        },
        ripple: {
          '0%': { 
            transform: 'scale(1)',
            opacity: '0.5'
          },
          '50%': { 
            transform: 'scale(1.05)',
            opacity: '0.25'
          },
          '100%': { 
            transform: 'scale(1.1)',
            opacity: '0'
          },
        },
        beachWave: {
          '0%, 100%': { 
            transform: 'translateX(0) translateY(0)',
            opacity: '0.7'
          },
          '25%': { 
            transform: 'translateX(2%) translateY(-1%)',
            opacity: '0.8'
          },
          '50%': { 
            transform: 'translateX(0) translateY(-2%)',
            opacity: '0.9'
          },
          '75%': { 
            transform: 'translateX(-2%) translateY(-1%)',
            opacity: '0.8'
          },
        },
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },
      transitionDuration: {
        '400': '400ms',
        '500': '500ms',
        '600': '600ms',
        '700': '700ms',
        '800': '800ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'smoother': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
    }
  },
  plugins: [require("tailwindcss-animate")],
}
