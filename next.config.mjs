import withPWAInit from "@ducanh2912/next-pwa";

const isWindows = process.platform === "win32";
const disablePWA = process.env.NODE_ENV === "development" || isWindows;

const withPWA = withPWAInit({
    dest: "public",
    disable: disablePWA,
    register: true,
    skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    /* config options here */
};

// En Windows no envolvemos la config para evitar el error de build local
// En Vercel (Linux) sí se envolverá para generar la PWA
export default disablePWA ? nextConfig : withPWA(nextConfig);
