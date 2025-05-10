// src/app/layout.tsx
import "~/styles/globals.css";
import "~/styles/SUDEA.css"; // Mantenemos tu CSS personalizado

import React from "react";
// Head y Script ya no son estrictamente necesarios aquí si no cargas otros scripts externos
import { type Metadata } from "next";
import { Audiowide } from "next/font/google";
import { SessionProvider } from "next-auth/react"; // Esencial para useSession
import { TRPCReactProvider } from "~/trpc/react"; // Esencial para tRPC
import Script from "next/script";

const audiowide = Audiowide({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-audiowide'
});

export const metadata: Metadata = {
  title: "SUDEA",
  description: "Monitoreo ambiental con drones e IA",
  icons: [{ rel: "icon", url: "/SUDEAicono.jpg" }],
};


export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${audiowide.className}`}>
      <head>
        {/* Mantenemos los CSS necesarios para el estilo */}
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.5/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-SgOJa3DmI69IUzQ2PVdRZhwQ+dy64/BUtbMJw1MZ8t5HZApcHrRKUc4W0kG879m7" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </head>
      <body>
        {/* Los Providers son clave y deben envolver a children */}
        <SessionProvider>
          <TRPCReactProvider>
            {children}
          </TRPCReactProvider>
        </SessionProvider>
        {/*<Script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.5/dist/js/bootstrap.bundle.min.js"
          integrity="sha384-k6d4wzSIapyDyv1kpU366/PK5hCdSbCRGRCMv+eplOQJWyd1fbcAu9OCUj5zNLiq"
          crossOrigin="anonymous"
          strategy="lazyOnload" // O "afterInteractive"
        />*/}
      </body>
    </html>
  );
}