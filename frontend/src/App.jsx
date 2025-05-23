import { useEffect, useState } from "react";
import { startStream, stopStream, getStreams } from "./api";

function App() {
  const [rtmpUrl, setRtmpUrl] = useState("");
  const [streamKey, setStreamKey] = useState("");
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchStreams = async () => {
    try {
      const res = await getStreams();
      setStreams(res.data);
    } catch (e) {
      setError("Ошибка загрузки статуса потоков");
    }
  };

  useEffect(() => {
    fetchStreams();
    const interval = setInterval(fetchStreams, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await startStream(rtmpUrl, streamKey);
      setSuccess("Поток запущен!");
      setRtmpUrl("");
      setStreamKey("");
      fetchStreams();
    } catch (e) {
      setError(e.response?.data?.error || "Ошибка запуска потока");
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async (key) => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await stopStream(key);
      setSuccess("Поток остановлен!");
      fetchStreams();
    } catch (e) {
      setError(e.response?.data?.error || "Ошибка остановки потока");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (url) => {
    navigator.clipboard.writeText(url);
    setSuccess("RTSP-ссылка скопирована!");
  };

  return (
    <div
      style={{ maxWidth: 600, margin: "40px auto", fontFamily: "sans-serif" }}
    >
      <h2>RTMP → RTSP Конвертер</h2>
      <form onSubmit={handleStart} style={{ marginBottom: 24 }}>
        <input
          type="text"
          placeholder="RTMP URL"
          value={rtmpUrl}
          onChange={(e) => setRtmpUrl(e.target.value)}
          required
          style={{ width: "60%", marginRight: 8 }}
        />
        <input
          type="text"
          placeholder="Stream Key"
          value={streamKey}
          onChange={(e) => setStreamKey(e.target.value)}
          required
          style={{ width: "25%", marginRight: 8 }}
        />
        <button type="submit" disabled={loading}>
          Старт
        </button>
      </form>
      {error && <div style={{ color: "red", marginBottom: 8 }}>{error}</div>}
      {success && (
        <div style={{ color: "green", marginBottom: 8 }}>{success}</div>
      )}
      <h3>Активные потоки</h3>
      <table
        width="100%"
        border={1}
        cellPadding={6}
        style={{ borderCollapse: "collapse" }}
      >
        <thead>
          <tr>
            <th>Stream Key</th>
            <th>RTMP URL</th>
            <th>RTSP URL</th>
            <th>Статус</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {streams.length === 0 && (
            <tr>
              <td colSpan={5} align="center">
                Нет активных потоков
              </td>
            </tr>
          )}
          {streams.map((s) => (
            <tr key={s.stream_key}>
              <td>{s.stream_key}</td>
              <td style={{ maxWidth: 120, wordBreak: "break-all" }}>
                {s.rtmp_url}
              </td>
              <td>
                <input
                  type="text"
                  value={s.rtsp_url}
                  readOnly
                  style={{ width: 180 }}
                  onFocus={(e) => e.target.select()}
                />
                <button
                  onClick={() => handleCopy(s.rtsp_url)}
                  style={{ marginLeft: 4 }}
                >
                  Копировать
                </button>
              </td>
              <td>
                {s.status === "running" ? "🟢" : "🔴"} {s.status}
              </td>
              <td>
                <button
                  onClick={() => handleStop(s.stream_key)}
                  disabled={loading}
                >
                  Стоп
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 24, fontSize: 14, color: "#555" }}>
        Для просмотра RTSP-потока используйте VLC или ffplay.
        <br />
        Пример: <code>ffplay rtsp://localhost:8554/stream_key</code>
      </div>
    </div>
  );
}

export default App;
