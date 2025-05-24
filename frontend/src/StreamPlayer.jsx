import Hls from "hls.js";
import { useEffect, useRef, useState } from "react";
import ErrorAlert from "./ErrorAlert";

export default function StreamPlayer({ streamKey }) {
  const videoRef = useRef();
  const [error, setError] = useState("");

  useEffect(() => {
    setError(""); // сбрасываем ошибку при смене потока
    if (!streamKey) return;
    let hls;
    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(`http://localhost:8888/${streamKey}/index.m3u8`);
      hls.attachMedia(videoRef.current);
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (
          data?.response?.code === 404 ||
          data?.details === "manifestLoadError"
        ) {
          setError("Поток не найден или не запущен.");
        } else if (data.fatal) {
          setError("Ошибка воспроизведения потока.");
        }
      });
      return () => hls.destroy();
    } else if (
      videoRef.current &&
      videoRef.current.canPlayType("application/vnd.apple.mpegurl")
    ) {
      videoRef.current.src = `http://localhost:8888/${streamKey}/index.m3u8`;
      videoRef.current.onerror = () =>
        setError("Поток не найден или не запущен.");
    }
  }, [streamKey]);

  return (
    <>
      <ErrorAlert
        message={error}
        type="error"
        onClose={() => setError("")}
        duration={5000}
      />
      <video
        ref={videoRef}
        controls
        style={{
          width: "100%",
          background: "#000",
          borderRadius: 8,
          marginTop: 16,
        }}
        autoPlay
        muted
      />
    </>
  );
}
