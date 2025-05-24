import { useEffect, useState } from "react";
import { startStream, stopStream, getStreams } from "./api";
import DroneMap from "./DroneMap";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { FaMapMarkedAlt, FaCrosshairs, FaCopy } from "react-icons/fa";
import StreamPlayer from "./StreamPlayer";

function StreamsPage() {
  const [rtmpUrl, setRtmpUrl] = useState("");
  const [streamKey, setStreamKey] = useState("");
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedStream, setSelectedStream] = useState("");

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
      style={{
        maxWidth: 700,
        margin: "40px auto",
        fontFamily: "'Share Tech Mono', 'Roboto Mono', 'Consolas', monospace",
        background: "#181c17",
        color: "#d2e0c2",
        borderRadius: 18,
        boxShadow: "0 0 24px #0a0c08",
        padding: 32,
        border: "2px solid #3a4a3a",
        position: "relative",
      }}
    >
      <h2
        style={{
          fontWeight: 700,
          fontSize: 32,
          letterSpacing: 2,
          color: "#b6c48a",
          display: "flex",
          alignItems: "center",
          gap: 12,
          textShadow: "0 2px 8px #232b1a",
        }}
      >
        <FaCrosshairs style={{ color: "#7a8a5a", fontSize: 28 }} />
        RTMP → RTSP Конвертер
      </h2>
      <div style={{ marginBottom: 24, marginTop: 8 }}>
        <Link
          to="/map"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "#232b1a",
            color: "#b6c48a",
            border: "1.5px solid #4a5a3a",
            borderRadius: 8,
            padding: "10px 18px",
            fontWeight: 600,
            fontSize: 18,
            textDecoration: "none",
            boxShadow: "0 2px 8px #10140c",
            transition: "background 0.2s, color 0.2s",
          }}
        >
          <FaMapMarkedAlt style={{ fontSize: 22, color: "#7a8a5a" }} />
          Карта отслеживания БПЛА
        </Link>
      </div>
      <form
        onSubmit={handleStart}
        style={{
          marginBottom: 32,
          display: "flex",
          gap: 12,
          background: "#232b1a",
          borderRadius: 10,
          padding: 18,
          alignItems: "center",
          border: "1.5px solid #3a4a3a",
        }}
      >
        <input
          type="text"
          placeholder="RTMP URL"
          value={rtmpUrl}
          onChange={(e) => setRtmpUrl(e.target.value)}
          required
          style={{
            width: "44%",
            background: "#232b1a",
            color: "#b6c48a",
            border: "1.5px solid #4a5a3a",
            borderRadius: 6,
            padding: "10px 12px",
            fontSize: 16,
            fontFamily: "inherit",
            outline: "none",
          }}
        />
        <input
          type="text"
          placeholder="Stream Key"
          value={streamKey}
          onChange={(e) => setStreamKey(e.target.value)}
          required
          style={{
            width: "28%",
            background: "#232b1a",
            color: "#b6c48a",
            border: "1.5px solid #4a5a3a",
            borderRadius: 6,
            padding: "10px 12px",
            fontSize: 16,
            fontFamily: "inherit",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            background: loading ? "#4a5a3a" : "#7a8a5a",
            color: "#181c17",
            border: "none",
            borderRadius: 6,
            padding: "12px 24px",
            fontWeight: 700,
            fontSize: 18,
            fontFamily: "inherit",
            boxShadow: "0 2px 8px #10140c",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.2s, color 0.2s",
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          Старт
        </button>
      </form>
      {error && (
        <div style={{ color: "#e57373", marginBottom: 8, fontWeight: 600 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ color: "#b6c48a", marginBottom: 8, fontWeight: 600 }}>
          {success}
        </div>
      )}
      <h3
        style={{
          color: "#b6c48a",
          fontWeight: 700,
          fontSize: 22,
          letterSpacing: 1,
          marginBottom: 12,
          marginTop: 0,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <FaCrosshairs style={{ color: "#7a8a5a", fontSize: 18 }} /> Активные
        потоки
      </h3>
      <div style={{ marginBottom: 18 }}>
        <label style={{ color: "#b6c48a", fontWeight: 600, marginRight: 8 }}>
          Воспроизвести поток:
        </label>
        <select
          value={selectedStream}
          onChange={(e) => setSelectedStream(e.target.value)}
          style={{
            background: "#232b1a",
            color: "#b6c48a",
            border: "1.5px solid #4a5a3a",
            borderRadius: 6,
            padding: "8px 12px",
            fontSize: 16,
            fontFamily: "inherit",
            outline: "none",
            marginRight: 12,
          }}
        >
          <option value="">Выберите поток</option>
          {streams.map((s) => (
            <option key={s.stream_key} value={s.stream_key}>
              {s.stream_key}
            </option>
          ))}
        </select>
        {selectedStream && <StreamPlayer streamKey={selectedStream} />}
      </div>
      <div
        style={{
          background: "#232b1a",
          borderRadius: 10,
          border: "1.5px solid #3a4a3a",
          padding: 0,
          overflow: "hidden",
          marginBottom: 18,
        }}
      >
        <table
          width="100%"
          style={{
            borderCollapse: "collapse",
            fontFamily: "inherit",
            fontSize: 15,
            color: "#d2e0c2",
            background: "none",
          }}
        >
          <thead style={{ background: "#232b1a", color: "#b6c48a" }}>
            <tr style={{ borderBottom: "2px solid #3a4a3a" }}>
              <th style={{ padding: 10, fontWeight: 700, letterSpacing: 1 }}>
                Stream Key
              </th>
              <th style={{ padding: 10, fontWeight: 700, letterSpacing: 1 }}>
                RTMP URL
              </th>
              <th style={{ padding: 10, fontWeight: 700, letterSpacing: 1 }}>
                RTSP URL
              </th>
              <th style={{ padding: 10, fontWeight: 700, letterSpacing: 1 }}>
                Статус
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {streams.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  align="center"
                  style={{ color: "#7a8a5a", padding: 18 }}
                >
                  Нет активных потоков
                </td>
              </tr>
            )}
            {streams.map((s) => (
              <tr
                key={s.stream_key}
                style={{ borderBottom: "1px solid #3a4a3a" }}
              >
                <td style={{ padding: 10 }}>{s.stream_key}</td>
                <td
                  style={{ maxWidth: 120, wordBreak: "break-all", padding: 10 }}
                >
                  {s.rtmp_url}
                </td>
                <td style={{ padding: 10 }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <input
                      type="text"
                      value={s.rtsp_url}
                      readOnly
                      style={{
                        width: 180,
                        background: "#232b1a",
                        color: "#b6c48a",
                        border: "1.5px solid #4a5a3a",
                        borderRadius: 4,
                        padding: "6px 8px",
                        fontFamily: "inherit",
                        fontSize: 15,
                        outline: "none",
                      }}
                      onFocus={(e) => e.target.select()}
                    />
                    <button
                      onClick={() => handleCopy(s.rtsp_url)}
                      style={{
                        background: "#232b1a",
                        color: "#b6c48a",
                        border: "1.5px solid #4a5a3a",
                        borderRadius: 4,
                        padding: "6px 10px",
                        cursor: "pointer",
                        fontSize: 15,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                      title="Скопировать RTSP-ссылку"
                    >
                      <FaCopy style={{ fontSize: 15 }} />
                    </button>
                  </div>
                </td>
                <td style={{ padding: 10 }}>
                  {s.status === "running" ? (
                    <span style={{ color: "#b6c48a", fontWeight: 700 }}>
                      🟢 Активен
                    </span>
                  ) : (
                    <span style={{ color: "#e57373", fontWeight: 700 }}>
                      🔴 Остановлен
                    </span>
                  )}
                </td>
                <td style={{ padding: 10 }}>
                  <button
                    onClick={() => handleStop(s.stream_key)}
                    disabled={loading}
                    style={{
                      background: "#3a4a3a",
                      color: "#b6c48a",
                      border: "none",
                      borderRadius: 4,
                      padding: "7px 14px",
                      fontWeight: 700,
                      fontFamily: "inherit",
                      fontSize: 15,
                      cursor: loading ? "not-allowed" : "pointer",
                      letterSpacing: 1,
                    }}
                  >
                    Стоп
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#181a18",
      }}
    >
      <Router>
        <Routes>
          <Route path="/" element={<StreamsPage />} />
          <Route path="/map" element={<DroneMap />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
