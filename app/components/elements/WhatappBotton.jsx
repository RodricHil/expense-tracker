import { FaWhatsapp } from "react-icons/fa";

export default function WhatsAppButton() {
  return (
    <div className="fixed bottom-0.5 sm:bottom-2 left-0 sm:left-4 z-[1000] flex flex-col items-center justify-center w-[100px] h-[100px]">
      <a
        href="https://wa.me/918967277734"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="whatsapp icon"
        className="text-white no-underline"
      >
       
        <span className="absolute inline-flex h-[50px] w-[50px] rounded-full bg-[#42db87] opacity-75 animate-ping"></span>

        {/* WhatsApp icon (stays sharp) */}
        <div className="relative bg-[#42db87] text-white w-[50px] h-[50px] text-[30px] rounded-full shadow-md flex items-center justify-center z-10">
          <FaWhatsapp />
        </div>
      </a>
      {/* <p className="mt-2 text-[#232222] font-medium text-sm">Talk to us?</p> */}
    </div>
  );
}
