/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Azul Vía (Primario) #2563EB
        'via-blue': {
          DEFAULT: '#2563EB',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563EB',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Verde Venta (Éxito / Secundario) #059669
        'venta-green': {
          DEFAULT: '#059669',
          50: '#ecfdf5',
          100: '#d1fae5',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        // Naranja Alerta (Advertencia / Pendiente) #D97706
        'alerta-amber': {
          DEFAULT: '#D97706',
          50: '#fffbeb',
          100: '#fef3c7',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#D97706',
          700: '#b45309',
        },
        // Rojo Inactivo / Cancelado #DC2626
        'danger-red': {
          DEFAULT: '#DC2626',
          50: '#fef2f2',
          400: '#f87171',
          500: '#ef4444',
          600: '#DC2626',
          700: '#b91c1c',
        },
        // Encabezados / Modo Oscuro Admin #0F172A
        'admin-dark': '#0F172A',
        // Fondo Neutro #F8FAFC
        'neutral-bg': '#F8FAFC',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
