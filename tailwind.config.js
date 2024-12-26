/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./src/**/*.{html,js}",
    ],
    theme: {
        extend: {
            transitionProperty: {
                'transform': 'transform',
            },
            transitionDuration: {
                '200': '200ms',
            },
            transitionTimingFunction: {
                'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
            },
        },
    },
    plugins: [],
} 