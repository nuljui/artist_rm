/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                canvas: '#ffffff',
                ink: {
                    DEFAULT: '#1D1D1F',
                    dim: 'rgba(29, 29, 31, 0.4)',
                },
                accent: '#0088FF',
                secondary: '#D97706',
                stone: {
                    50: '#f9fafb',
                    100: '#f3f4f6',
                    200: '#e5e7eb',
                }
            },
            boxShadow: {
                artifact: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            }
        },
    },
    plugins: [],
}
