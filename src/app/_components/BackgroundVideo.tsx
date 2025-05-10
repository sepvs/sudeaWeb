// src/components/BackgroundVideo.tsx
"use client";

import React from 'react';

export function BackgroundVideo() {
    return (
        <video autoPlay muted loop playsInline id="videoFondo" className="fixed right-0 bottom-0 min-w-full min-h-full -z-10 object-cover">
            {/* Ruta desde /public */}
            <source src="/video_fondo.mp4" type="video/mp4" />
            Tu navegador no soporta videos HTML5.
        </video>
    );
}