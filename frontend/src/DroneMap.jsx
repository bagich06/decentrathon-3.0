import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const WS_URL = "ws://localhost:8080/ws/telemetry";

function MapUpdater({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position]);
  return null;
}

export default function DroneMap() {
  const [positions, setPositions] = useState([]);
  const [last, setLast] = useState(null);
  const wsRef = useRef(null);

  // Состояния для ручной отправки одной точки
  const [form, setForm] = useState({
    lat: 51.1694,
    lng: 71.4491,
    alt: 120,
    speed: 15,
    timestamp: Math.floor(Date.now() / 1000),
  });
  const [sending, setSending] = useState(false);
  const [formMsg, setFormMsg] = useState("");

  // Состояния для эмуляции полёта
  const [pointA, setPointA] = useState({
    lat: 51.1694,
    lng: 71.4491,
    alt: 120,
    speed: 15,
  });
  const [pointB, setPointB] = useState({
    lat: 43.238949,
    lng: 76.889709,
    alt: 120,
    speed: 15,
  });
  const [flightMsg, setFlightMsg] = useState("");
  const [flightRunning, setFlightRunning] = useState(false);

  useEffect(() => {
    wsRef.current = new window.WebSocket(WS_URL);
    wsRef.current.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setPositions((pos) => [...pos, [data.lat, data.lng]]);
        setLast(data);
      } catch {}
    };
    return () => wsRef.current && wsRef.current.close();
  }, []);

  // Функция отправки одной точки
  const sendTelemetry = async (e) => {
    e.preventDefault();
    setSending(true);
    setFormMsg("");
    try {
      const res = await fetch("http://localhost:8080/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setFormMsg("Точка отправлена!");
        setForm((f) => ({ ...f, timestamp: Math.floor(Date.now() / 1000) }));
      } else {
        setFormMsg("Ошибка отправки");
      }
    } catch {
      setFormMsg("Ошибка отправки");
    }
    setSending(false);
  };

  // Функция эмуляции полёта между двумя точками
  const emulateFlight = async () => {
    setFlightRunning(true);
    setFlightMsg("Эмуляция полёта...");
    const steps = 20;
    const delay = 500; // мс
    for (let i = 0; i <= steps; i++) {
      const lat = pointA.lat + (pointB.lat - pointA.lat) * (i / steps);
      const lng = pointA.lng + (pointB.lng - pointA.lng) * (i / steps);
      const alt = pointA.alt + (pointB.alt - pointA.alt) * (i / steps);
      const speed = pointA.speed + (pointB.speed - pointA.speed) * (i / steps);
      const timestamp = Math.floor(Date.now() / 1000) + i;
      const body = { lat, lng, alt, speed, timestamp };
      await fetch("http://localhost:8080/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await new Promise((res) => setTimeout(res, delay));
    }
    setFlightMsg("Полёт завершён!");
    setFlightRunning(false);
  };

  return (
    <div
      style={{ height: 500, width: "100%", margin: "40px auto", maxWidth: 800 }}
    >
      <h2>Карта движения дрона</h2>
      <form
        onSubmit={sendTelemetry}
        style={{
          marginBottom: 16,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          type="number"
          step="any"
          value={form.lat}
          onChange={(e) =>
            setForm((f) => ({ ...f, lat: parseFloat(e.target.value) }))
          }
          placeholder="lat"
          required
          style={{ width: 100 }}
        />
        <input
          type="number"
          step="any"
          value={form.lng}
          onChange={(e) =>
            setForm((f) => ({ ...f, lng: parseFloat(e.target.value) }))
          }
          placeholder="lng"
          required
          style={{ width: 100 }}
        />
        <input
          type="number"
          step="any"
          value={form.alt}
          onChange={(e) =>
            setForm((f) => ({ ...f, alt: parseFloat(e.target.value) }))
          }
          placeholder="alt"
          required
          style={{ width: 80 }}
        />
        <input
          type="number"
          step="any"
          value={form.speed}
          onChange={(e) =>
            setForm((f) => ({ ...f, speed: parseFloat(e.target.value) }))
          }
          placeholder="speed"
          required
          style={{ width: 80 }}
        />
        <button type="submit" disabled={sending}>
          Отправить точку
        </button>
        {formMsg && (
          <span
            style={{
              color: formMsg.includes("ошибка") ? "red" : "green",
              marginLeft: 8,
            }}
          >
            {formMsg}
          </span>
        )}
      </form>
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
          background: "#f7f7f7",
          padding: 12,
          borderRadius: 8,
        }}
      >
        <div>
          <b>Точка A:</b>
          <br />
          <input
            type="number"
            step="any"
            value={pointA.lat}
            onChange={(e) =>
              setPointA((f) => ({ ...f, lat: parseFloat(e.target.value) }))
            }
            placeholder="lat"
            style={{ width: 90 }}
          />
          <input
            type="number"
            step="any"
            value={pointA.lng}
            onChange={(e) =>
              setPointA((f) => ({ ...f, lng: parseFloat(e.target.value) }))
            }
            placeholder="lng"
            style={{ width: 90, marginLeft: 4 }}
          />
        </div>
        <div>
          <b>Точка B:</b>
          <br />
          <input
            type="number"
            step="any"
            value={pointB.lat}
            onChange={(e) =>
              setPointB((f) => ({ ...f, lat: parseFloat(e.target.value) }))
            }
            placeholder="lat"
            style={{ width: 90 }}
          />
          <input
            type="number"
            step="any"
            value={pointB.lng}
            onChange={(e) =>
              setPointB((f) => ({ ...f, lng: parseFloat(e.target.value) }))
            }
            placeholder="lng"
            style={{ width: 90, marginLeft: 4 }}
          />
        </div>
        <button
          onClick={emulateFlight}
          disabled={flightRunning}
          style={{ height: 38, marginTop: 16 }}
        >
          Эмулировать полёт
        </button>
        {flightMsg && (
          <span
            style={{
              color: flightMsg.includes("завершён") ? "green" : "#333",
              marginLeft: 8,
            }}
          >
            {flightMsg}
          </span>
        )}
        <button
          onClick={() => {
            setPositions([]);
            setLast(null);
          }}
          style={{
            height: 38,
            marginTop: 16,
            background: "#eee",
            color: "#333",
            border: "1px solid #ccc",
            marginLeft: 8,
          }}
        >
          Очистить маршрут
        </button>
      </div>
      <MapContainer
        center={last ? [last.lat, last.lng] : [51.1694, 71.4491]}
        zoom={5}
        style={{ height: 400, width: "100%" }}
      >
        <MapUpdater position={last ? [last.lat, last.lng] : null} />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {positions.length > 0 && (
          <Polyline positions={positions} color="blue" />
        )}
        {last && (
          <Marker position={[last.lat, last.lng]}>
            <Popup>
              <div>
                <b>Координаты:</b> {last.lat.toFixed(5)}, {last.lng.toFixed(5)}
                <br />
                <b>Высота:</b> {last.alt} м<br />
                <b>Скорость:</b> {last.speed} м/с
                <br />
                <b>Время:</b>{" "}
                {new Date(last.timestamp * 1000).toLocaleTimeString()}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
      <div style={{ marginTop: 16, color: "#555" }}>
        Для эмуляции движения отправьте POST-запрос на{" "}
        <code>/api/telemetry</code> с координатами.
        <br />
        Или используйте форму выше.
        <br />
        Пример:
        <pre>{`
POST http://localhost:8080/api/telemetry
{
  "lat": 51.1694,
  "lng": 71.4491,
  "alt": 120,
  "speed": 15,
  "timestamp": 1716480000
}`}</pre>
      </div>
    </div>
  );
}
