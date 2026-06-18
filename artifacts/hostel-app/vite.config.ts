import { defineConfig } from "vite";
import path from "path";

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  root: path.resolve(import.meta.dirname, "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(import.meta.dirname, "public/index.html"),
        booking: path.resolve(import.meta.dirname, "public/booking.html"),
        selfcheckin: path.resolve(import.meta.dirname, "public/selfcheckin.html"),
        payment: path.resolve(import.meta.dirname, "public/payment.html"),
        register: path.resolve(import.meta.dirname, "public/register.html"),
        client: path.resolve(import.meta.dirname, "public/client.html"),
        admin: path.resolve(import.meta.dirname, "public/admin.html"),
        staff: path.resolve(import.meta.dirname, "public/staff.html"),
        "login-admin": path.resolve(import.meta.dirname, "public/login-admin.html"),
        "login-staff": path.resolve(import.meta.dirname, "public/login-staff.html"),
        login: path.resolve(import.meta.dirname, "public/login.html"),
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
