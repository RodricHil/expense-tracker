// src/components/elements/ScrollToTopButton.jsx
"use client";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronUp } from '@fortawesome/free-solid-svg-icons';

export default function ScrollToTopButton() {

  const [isVisible, setIsVisible] = useState(false);

  const handleScroll = () => {
    const scrollY = window.scrollY;
    const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = (scrollY / documentHeight) * 100;

    // Show button if scrolled past 30% of the page
    setIsVisible(scrollPercent >= 30);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    isVisible && (
      <button
        className="fixed bottom-8 right-10 sm:bottom-10 p-1 flex items-center cursor-pointer bg-white text-black border text-xl shadow-xl transition-opacity duration-300 ease-in-out"
        aria-label="scroll up"
        onClick={scrollToTop}
      >
        <FontAwesomeIcon icon={faChevronUp} />
      </button>
    )
  );
}
