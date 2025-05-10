/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  // Tu configuración existente de webpack
  webpack: (config, { isServer }) => {
      // Ignorar módulos específicos de Node en el bundle del cliente
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback, // Mantener otros fallbacks si existen
          fs: false,
          net: false,
          tls: false,
          child_process: false,
        };
      }
      // Importante: Devolver la configuración modificada
      return config;
  }, // <-- Asegúrate de poner una coma aquí si añades algo después

  // --- AÑADE ESTA SECCIÓN COMPLETA ---
  images: {
      remotePatterns: [
          {
              protocol: 'https',
              hostname: 'cdn.discordapp.com',
              port: '',
              pathname: '/avatars/**', // O el patrón que necesites
          },
          { // Ejemplo para Cloudinary (ajusta con tu cloud name)
              protocol: 'https',
              hostname: 'res.cloudinary.com',
              port: '',
               // IMPORTANTE: Lee cloud name desde process.env directamente aquí
              pathname: `/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/**`,
          },
           { // Ejemplo para Google
             protocol: 'https',
             hostname: 'lh3.googleusercontent.com',
             port: '',
             pathname: '/a/**',
           },
          // Añade más patrones según necesites...
      ],
  },
  // -----------------------------------

  // Aquí podrían ir otras configuraciones de Next.js como reactStrictMode, etc.
  // reactStrictMode: true,

}; // Fin del objeto config

export default config;