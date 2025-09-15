"use client";

import React, { useState } from "react";
import { ArrowRight, ArrowLeft, ArrowUpRight } from "lucide-react";

const testimonials = [
  {
    id: 1,
    text: "AnoGhost provides true privacy for crypto communities. No emails, no phone numbers, just wallet-based authentication.",
  },
  {
    id: 2,
    text: "The self-destructing messages and NFT-gated rooms make this perfect for sharing alpha with trusted communities.",
  },
  {
    id: 3,
    text: "Privacy-first approach and zero tracking make this the ideal solution for DAOs and early-stage communities.",
  },
];

const HomeTestimonials = () => {
  const [activeSlide, setActiveSlide] = useState(1);

  const nextSlide = () => {
    setActiveSlide((prev) => (prev === 3 ? 1 : prev + 1));
  };

  const prevSlide = () => {
    setActiveSlide((prev) => (prev === 1 ? 3 : prev - 1));
  };

  return (
    <div className="max-w-7xl mx-auto px-6 pb-20 max-[750px]:pb-10">
      <div className="grid grid-cols-3 gap-6 max-[750px]:block">
        <div className="border border-[#333333] rounded-xl p-6 flex items-center max-[750px]:hidden">
          <div className="flex space-x-4">
            {[1, 2, 3].map((num) => (
              <button
                key={num}
                onClick={() => setActiveSlide(num)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  activeSlide === num
                    ? "bg-[#FF4D00] text-black"
                    : "border border-[#333333] text-white hover:border-[#FF4D00] hover:text-[#FF4D00]"
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#FF4D00] text-black rounded-xl p-6 col-span-2 flex justify-between items-center max-[600px]:flex-col max-[600px]:items-start max-[600px]:gap-4">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((num) => (
              <button
                key={num}
                onClick={() => setActiveSlide(num)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  activeSlide === num
                    ? "bg-black text-[#FF4D00]"
                    : "border border-black/20 text-black hover:bg-black/10"
                }`}
              >
                {num}
              </button>
            ))}
          </div>
          <p className="flex-1 mx-6 font-medium max-[600px]:mx-0">
            {testimonials.find((t) => t.id === activeSlide)?.text}
          </p>
          <button className="w-12 h-12 rounded-full border border-black/20 flex items-center justify-center hover:bg-black/10 transition-colors max-[600px]:hidden">
            <ArrowUpRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeTestimonials;
