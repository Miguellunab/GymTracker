/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font-inter)'],
                display: ['var(--font-outfit)'],
            },
            colors: {
                // Custom "OLED" grays if needed
                zinc: {
                    850: '#1f1f22',
                    950: '#09090b', // True black-ish
                }
            }
        },
    },
    plugins: [],
};
