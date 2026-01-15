/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Mapping CSS variables to Tailwind colors so 'bg-app' works
                'app': 'var(--bg-app)',
                'sidebar': 'var(--bg-sidebar)',
                'card': 'var(--bg-card)',
                'card-hover': 'var(--bg-card-hover)',
                'main': 'var(--text-main)',
                'muted': 'var(--text-muted)',
                'border-subtle': 'var(--border-subtle)',
            }
        },
    },
    plugins: [],
}
