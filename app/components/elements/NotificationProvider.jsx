"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import Notification from "./Notification";

const NotificationContext = createContext({
  showNotification: (message, type) => {},
});

export function NotificationProvider({ children }) {
  const [notification, setNotification] = useState({ message: "", type: "success", visible: false });

  const showNotification = useCallback((message, type = "success") => {
    setNotification({ message, type, visible: true });
  }, []);

  const handleClose = useCallback(() => {
    setNotification({ message: "", type: "success", visible: false });
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {notification.visible && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={handleClose}
        />
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotification must be used within NotificationProvider");
  return ctx;
}

export default NotificationProvider;
