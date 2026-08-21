import path from "path";

export default {
  plugins: {
    tailwindcss: { config: path.resolve(process.cwd(), "client/tailwind.config.ts") },
    autoprefixer: {},
  },
}
