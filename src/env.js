import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    AUTH_DISCORD_ID: z.string(),
    AUTH_DISCORD_SECRET: z.string(),
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),     
    CLOUDINARY_CLOUD_NAME: z.string().min(1), 
    CLOUDINARY_API_KEY: z.string().min(1),    
    CLOUDINARY_API_SECRET: z.string().min(1),

    /* credenciales de envio de emails */
    EMAIL_HOST: z.string().min(1),
    EMAIL_PORT: z.coerce.number().int().positive(), // Coerce a número
    EMAIL_SECURE: z.coerce.boolean(), // Coerce a booleano
    EMAIL_USER: z.string().min(1),
    EMAIL_PASS: z.string().min(1),
    EMAIL_FROM: z.string().min(1),
    EMAIL_ADMIN_RECEIVER: z.string().email(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_ROBOFLOW_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_ROBOFLOW_MODEL_ID: z.string().min(1),
    NEXT_PUBLIC_ROBOFLOW_VERSION: z.string().min(1),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_DISCORD_ID: process.env.AUTH_DISCORD_ID,
    AUTH_DISCORD_SECRET: process.env.AUTH_DISCORD_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_ROBOFLOW_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_ROBOFLOW_PUBLISHABLE_KEY,
    NEXT_PUBLIC_ROBOFLOW_MODEL_ID: process.env.NEXT_PUBLIC_ROBOFLOW_MODEL_ID,
    NEXT_PUBLIC_ROBOFLOW_VERSION: process.env.NEXT_PUBLIC_ROBOFLOW_VERSION,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

    /*Email*/
    EMAIL_HOST: process.env.EMAIL_HOST,
    EMAIL_PORT: process.env.EMAIL_PORT,
    EMAIL_SECURE: process.env.EMAIL_SECURE,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_ADMIN_RECEIVER: process.env.EMAIL_ADMIN_RECEIVER,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
