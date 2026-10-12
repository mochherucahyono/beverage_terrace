/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Poppins', 'sans-serif'],
            },
            colors: {
                brand: {
                    bg: '#FBFBF9',
                    card: '#FFFFFF',
                    text: '#262624',
                    accent: '#DA6B4F',
                    hover: '#C25A40',
                    border: '#E5E5E0'
                }
            }
        },
    },
    plugins: [],
}