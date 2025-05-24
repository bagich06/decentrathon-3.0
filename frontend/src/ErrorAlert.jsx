import { useEffect } from "react";

export default function ErrorAlert({
  message,
  type = "error",
  onClose,
  duration = 4000,
}) {
  useEffect(() => {
    if (!message) return;
    if (duration === 0) return;
    const timer = setTimeout(() => {
      onClose && onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  let bg = "#e57373",
    color = "#fff",
    border = "#b71c1c";
  if (type === "success") {
    bg = "#b6c48a";
    color = "#181c17";
    border = "#7a8a5a";
  } else if (type === "info") {
    bg = "#7a8a5a";
    color = "#fff";
    border = "#3a4a3a";
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 9999,
        background: bg,
        color,
        border: `2px solid ${border}`,
        borderRadius: 10,
        padding: "16px 28px 16px 18px",
        fontWeight: 600,
        fontSize: 17,
        boxShadow: "0 2px 16px #10140c",
        minWidth: 220,
        maxWidth: 400,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
      role="alert"
    >
      <span style={{ flex: 1 }}>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color,
            fontWeight: 700,
            fontSize: 20,
            cursor: "pointer",
            marginLeft: 8,
            lineHeight: 1,
          }}
          aria-label="Закрыть уведомление"
        >
          ×
        </button>
      )}
    </div>
  );
}
