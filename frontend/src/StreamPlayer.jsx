import Hls from "hls.js";
import { useEffect, useRef } from "react";

export default function StreamPlayer({ streamKey }) {
  const videoRef = useRef();

  useEffect(() => {
    if (!streamKey) return;
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(`http://localhost:8888/${streamKey}/index.m3u8`);
      hls.attachMedia(videoRef.current);
      return () => hls.destroy();
    } else if (
      videoRef.current &&
      videoRef.current.canPlayType("application/vnd.apple.mpegurl")
    ) {
      videoRef.current.src = `http://localhost:8888/${streamKey}/index.m3u8`;
    }
  }, [streamKey]);

  return (
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
  );
}
