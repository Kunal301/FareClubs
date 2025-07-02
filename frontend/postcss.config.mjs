import tailwindcssPostcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';

/** @type {import('postcss').Config} */
const config = {
  plugins: [
    tailwindcssPostcss(),
    autoprefixer,
  ],
};

export default config;
