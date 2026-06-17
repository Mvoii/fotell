import React from "react";
import Image from "next/image";


export function AuthLeftPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between bg-black p-12 lg:p-16 xl:p-24 relative border-r border-border overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-[url('/panel_background.jpg')] bg-cover bg-center opacity-70 mix-blend-lighten"
      />
      {/* Overlay for readability */}
      <div 
        className="absolute inset-0 z-0 bg-gradient-to-t from-black/95 via-black/40 to-black/20"
      />

      {/* Top Logo */}
      <div className="relative z-10">
        <Image
          src="/logo1.svg"
          alt="FoTell Logo"
          width={160}
          height={50}
          className="object-contain brightness-0 invert opacity-90 drop-shadow-[0_4px_12px_rgba(255,255,255,0.15)]"
          priority
        />
      </div>


      {/* Bottom Text */}
      <div className="relative z-10 max-w-md mt-auto pt-12">
        <h1 className="heading-xl text-white font-extrabold mb-2 text-balance drop-shadow-[0_5px_8px_rgba(0,0,0,0.9)] tracking-tight">
          Predict the Future.<br />
          <span className="text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.6)] brightness-125">Trade on Reality.</span>
        </h1>
      </div>
    </div>
  );
}
