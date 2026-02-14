"use client";

import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faTimes } from "@fortawesome/free-solid-svg-icons";
import { motion, AnimatePresence } from "framer-motion";

const Notification = ({ message, type, onClose }) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);


  if (!show) return null;

  const isSuccess = type === "success";

  return (
    <div className="flex justify-center">
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -120 }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
            className={`fixed top-20 z-50 flex items-center gap-4 
               w-[90%] md:w-auto 
              rounded-sm border shadow-lg px-3 py-3
              ${isSuccess ? "bg-green-50 border-green-500" : "bg-red-50 border-red-500"}
            `}
          >
            {/* Icon Circle */}
            <div
              className={`flex items-center justify-center shrink-0 
                w-10 h-10 rounded-full
                ${isSuccess ? "bg-green-600" : "bg-red-600"}
              `}
            >
              <FontAwesomeIcon
                icon={isSuccess ? faCheck : faTimes}
                className="text-white text-lg"
              />
            </div>

            {/* Message */}
            <div className="flex-1 text-sm md:text-base font-medium text-gray-800">
              <span dangerouslySetInnerHTML={{ __html: message }} />
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Notification;
