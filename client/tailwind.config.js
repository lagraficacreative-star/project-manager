/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'brand': {
                    orange: '#F97316', // Primary accent
                    black: '#18181b', // Strong text/bg
                    gray: '#71717a', // Muted text/borders
                    lightgray: '#f3f4f6', // Backgrounds
                    white: '#ffffff'
                },
                // Keep existing vars just in case, but prefer the 'brand-' ones for the new UI
                'app': '#ffffff',
                'sidebar': '#f9fafb',
                'card': '#ffffff',
                'card-hover': '#f3f4f6',
                'main': '#18181b',
                'muted': '#71717a',
                'border-subtle': '#e5e7eb',
            }
        },
    },
    plugins: [],
}
