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
import droneIconImg from "./assets/drone.svg";
import {
  FaCrosshairs,
  FaMapMarkedAlt,
  FaRoute,
  FaRegSave,
  FaHistory,
  FaEyeSlash,
} from "react-icons/fa";
import { Link } from "react-router-dom";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const WS_URL = "ws://localhost:8080/ws/telemetry";
const DEFAULT_ROUTE_COLOR = "#888";
const ROUTE_COLORS = [
  "#888",
  "#1976d2",
  "#43a047",
  "#e57373",
  "#fbc02d",
  "#8e24aa",
  "#ff9800",
  "#0097a7",
  "#c62828",
];

const droneIcon = new L.Icon({
  iconUrl: droneIconImg,
  iconSize: [48, 48],
  iconAnchor: [24, 24],
  popupAnchor: [0, -24],
});

function MapUpdater({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position]);
  return null;
}

function getRouteLabel(route, idx) {
  const count = route.points?.length || 0;
  const date = route.savedAt ? new Date(route.savedAt).toLocaleString() : "";
  return `Маршрут ${idx + 1} (${count} точек${date ? ", " + date : ""})`;
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

  // Состояния для сохранения маршрута
  const [saveMsg, setSaveMsg] = useState("");
  const [routes, setRoutes] = useState([]); // История маршрутов
  const [showRoutes, setShowRoutes] = useState(false);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [routeColor, setRouteColor] = useState(ROUTE_COLORS[0]);
  const [selectedRoutes, setSelectedRoutes] = useState([]); // индексы выбранных маршрутов

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

  // Сохранить текущий маршрут
  const saveRoute = async () => {
    setSaveMsg("");
    if (positions.length < 2) {
      setSaveMsg("Маршрут слишком короткий");
      return;
    }
    const route = positions.map(([lat, lng], i) => {
      return { lat, lng };
    });
    // Сохраняем цвет и дату вместе с маршрутом
    const routeWithColor = {
      points: route,
      color: routeColor,
      savedAt: new Date().toISOString(),
    };
    try {
      const res = await fetch("http://localhost:8080/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(routeWithColor),
      });
      if (res.ok) {
        setSaveMsg("Маршрут сохранён!");
      } else {
        setSaveMsg("Ошибка сохранения");
      }
    } catch {
      setSaveMsg("Ошибка сохранения");
    }
  };

  // Загрузить историю маршрутов
  const fetchRoutes = async () => {
    setLoadingRoutes(true);
    setShowRoutes(true);
    setSaveMsg("");
    try {
      const res = await fetch("http://localhost:8080/api/routes");
      if (res.ok) {
        const data = await res.json();
        // Приводим к новому формату, если старый (массив точек)
        const normalized = data.map((route) => {
          if (Array.isArray(route)) {
            return { points: route, color: DEFAULT_ROUTE_COLOR };
          }
          return route;
        });
        setRoutes(normalized);
        // По умолчанию ничего не выбрано
        setSelectedRoutes([]);
      } else {
        setSaveMsg("Ошибка загрузки истории");
      }
    } catch {
      setSaveMsg("Ошибка загрузки истории");
    }
    setLoadingRoutes(false);
  };

  // Обработчик выбора маршрута
  const toggleRoute = (idx) => {
    setSelectedRoutes((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  // Обработчик смены цвета маршрута
  const changeRouteColor = (idx, color) => {
    setRoutes((prev) =>
      prev.map((route, i) => (i === idx ? { ...route, color } : route))
    );
  };

  return (
    <div
      style={{
        maxWidth: 1200,
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
        <FaMapMarkedAlt style={{ color: "#7a8a5a", fontSize: 28 }} />
        Карта движения дрона
      </h2>
      <div style={{ marginBottom: 18, marginTop: 8 }}>
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "#232b1a",
            color: "#b6c48a",
            border: "1.5px solid #4a5a3a",
            borderRadius: 8,
            padding: "8px 16px",
            fontWeight: 600,
            fontSize: 16,
            textDecoration: "none",
            boxShadow: "0 2px 8px #10140c",
            transition: "background 0.2s, color 0.2s",
          }}
        >
          <FaCrosshairs style={{ fontSize: 18, color: "#7a8a5a" }} />К панели
          потоков
        </Link>
      </div>
      <form
        onSubmit={sendTelemetry}
        style={{
          marginBottom: 16,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          background: "#232b1a",
          borderRadius: 10,
          padding: 14,
          border: "1.5px solid #3a4a3a",
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
          style={{
            width: 100,
            background: "#232b1a",
            color: "#b6c48a",
            border: "1.5px solid #4a5a3a",
            borderRadius: 6,
            padding: "8px 10px",
            fontSize: 15,
            fontFamily: "inherit",
            outline: "none",
          }}
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
          style={{
            width: 100,
            background: "#232b1a",
            color: "#b6c48a",
            border: "1.5px solid #4a5a3a",
            borderRadius: 6,
            padding: "8px 10px",
            fontSize: 15,
            fontFamily: "inherit",
            outline: "none",
          }}
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
          style={{
            width: 80,
            background: "#232b1a",
            color: "#b6c48a",
            border: "1.5px solid #4a5a3a",
            borderRadius: 6,
            padding: "8px 10px",
            fontSize: 15,
            fontFamily: "inherit",
            outline: "none",
          }}
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
          style={{
            width: 80,
            background: "#232b1a",
            color: "#b6c48a",
            border: "1.5px solid #4a5a3a",
            borderRadius: 6,
            padding: "8px 10px",
            fontSize: 15,
            fontFamily: "inherit",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={sending}
          style={{
            background: sending ? "#4a5a3a" : "#7a8a5a",
            color: "#181c17",
            border: "none",
            borderRadius: 6,
            padding: "10px 20px",
            fontWeight: 700,
            fontSize: 16,
            fontFamily: "inherit",
            boxShadow: "0 2px 8px #10140c",
            cursor: sending ? "not-allowed" : "pointer",
            transition: "background 0.2s, color 0.2s",
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          Отправить точку
        </button>
        {formMsg && (
          <span
            style={{
              color: formMsg.includes("ошибка") ? "#e57373" : "#b6c48a",
              marginLeft: 8,
              fontWeight: 600,
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
          background: "#232b1a",
          padding: 12,
          borderRadius: 8,
          border: "1.5px solid #3a4a3a",
        }}
      >
        <div>
          <b style={{ color: "#b6c48a" }}>Точка A:</b>
          <br />
          <input
            type="number"
            step="any"
            value={pointA.lat}
            onChange={(e) =>
              setPointA((f) => ({ ...f, lat: parseFloat(e.target.value) }))
            }
            placeholder="lat"
            style={{
              width: 90,
              background: "#232b1a",
              color: "#b6c48a",
              border: "1.5px solid #4a5a3a",
              borderRadius: 6,
              padding: "6px 8px",
              fontFamily: "inherit",
              fontSize: 15,
              outline: "none",
            }}
          />
          <input
            type="number"
            step="any"
            value={pointA.lng}
            onChange={(e) =>
              setPointA((f) => ({ ...f, lng: parseFloat(e.target.value) }))
            }
            placeholder="lng"
            style={{
              width: 90,
              marginLeft: 4,
              background: "#232b1a",
              color: "#b6c48a",
              border: "1.5px solid #4a5a3a",
              borderRadius: 6,
              padding: "6px 8px",
              fontFamily: "inherit",
              fontSize: 15,
              outline: "none",
            }}
          />
        </div>
        <div>
          <b style={{ color: "#b6c48a" }}>Точка B:</b>
          <br />
          <input
            type="number"
            step="any"
            value={pointB.lat}
            onChange={(e) =>
              setPointB((f) => ({ ...f, lat: parseFloat(e.target.value) }))
            }
            placeholder="lat"
            style={{
              width: 90,
              background: "#232b1a",
              color: "#b6c48a",
              border: "1.5px solid #4a5a3a",
              borderRadius: 6,
              padding: "6px 8px",
              fontFamily: "inherit",
              fontSize: 15,
              outline: "none",
            }}
          />
          <input
            type="number"
            step="any"
            value={pointB.lng}
            onChange={(e) =>
              setPointB((f) => ({ ...f, lng: parseFloat(e.target.value) }))
            }
            placeholder="lng"
            style={{
              width: 90,
              marginLeft: 4,
              background: "#232b1a",
              color: "#b6c48a",
              border: "1.5px solid #4a5a3a",
              borderRadius: 6,
              padding: "6px 8px",
              fontFamily: "inherit",
              fontSize: 15,
              outline: "none",
            }}
          />
        </div>
        <button
          onClick={emulateFlight}
          disabled={flightRunning}
          style={{
            height: 38,
            marginTop: 16,
            background: flightRunning ? "#4a5a3a" : "#7a8a5a",
            color: "#181c17",
            border: "none",
            borderRadius: 6,
            padding: "10px 20px",
            fontWeight: 700,
            fontSize: 16,
            fontFamily: "inherit",
            boxShadow: "0 2px 8px #10140c",
            cursor: flightRunning ? "not-allowed" : "pointer",
            transition: "background 0.2s, color 0.2s",
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          Эмулировать полёт
        </button>
        {flightMsg && (
          <span
            style={{
              color: flightMsg.includes("завершён") ? "#b6c48a" : "#d2e0c2",
              marginLeft: 8,
              fontWeight: 600,
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
            background: "#3a4a3a",
            color: "#b6c48a",
            border: "none",
            borderRadius: 6,
            padding: "10px 20px",
            fontWeight: 700,
            fontFamily: "inherit",
            fontSize: 16,
            boxShadow: "0 2px 8px #10140c",
            cursor: "pointer",
            marginLeft: 8,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          Очистить маршрут
        </button>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        {/* Выбор цвета маршрута */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#b6c48a", fontWeight: 600 }}>
            Цвет маршрута:
          </span>
          {ROUTE_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setRouteColor(color)}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border:
                  routeColor === color
                    ? "3px solid #fff"
                    : "2px solid transparent",
                background: color,
                cursor: "pointer",
                outline: "none",
                marginRight: 2,
                boxShadow: `0 0 6px 2px ${color}55, 0 2px 8px #10140c`,
                transition: "box-shadow 0.2s, border 0.2s",
              }}
              aria-label={`Выбрать цвет ${color}`}
            />
          ))}
        </div>
        <button
          onClick={saveRoute}
          disabled={positions.length < 2}
          style={{
            background: positions.length < 2 ? "#4a5a3a" : "#7a8a5a",
            color: "#181c17",
            border: "none",
            borderRadius: 6,
            padding: "10px 20px",
            fontWeight: 700,
            fontSize: 16,
            fontFamily: "inherit",
            boxShadow: "0 2px 8px #10140c",
            cursor: positions.length < 2 ? "not-allowed" : "pointer",
            letterSpacing: 1,
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <FaRegSave /> Сохранить маршрут
        </button>
        <button
          onClick={fetchRoutes}
          disabled={loadingRoutes}
          style={{
            background: loadingRoutes ? "#4a5a3a" : "#7a8a5a",
            color: "#181c17",
            border: "none",
            borderRadius: 6,
            padding: "10px 20px",
            fontWeight: 700,
            fontSize: 16,
            fontFamily: "inherit",
            boxShadow: "0 2px 8px #10140c",
            cursor: loadingRoutes ? "not-allowed" : "pointer",
            letterSpacing: 1,
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <FaHistory /> Показать историю маршрутов
        </button>
        {showRoutes && (
          <button
            onClick={() => setShowRoutes(false)}
            style={{
              background: "#3a4a3a",
              color: "#b6c48a",
              border: "none",
              borderRadius: 6,
              padding: "10px 20px",
              fontWeight: 700,
              fontFamily: "inherit",
              fontSize: 16,
              boxShadow: "0 2px 8px #10140c",
              cursor: "pointer",
              letterSpacing: 1,
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <FaEyeSlash /> Скрыть историю маршрутов
          </button>
        )}
        {saveMsg && (
          <span
            style={{
              color: saveMsg.includes("ошибка") ? "#e57373" : "#b6c48a",
              marginLeft: 8,
              fontWeight: 600,
            }}
          >
            {saveMsg}
          </span>
        )}
      </div>
      {/* Выпадающий список истории маршрутов */}
      {showRoutes && routes.length > 0 && (
        <div
          style={{
            background: "#232b1a",
            border: "1.5px solid #3a4a3a",
            borderRadius: 10,
            padding: 18,
            marginBottom: 18,
            maxWidth: 700,
          }}
        >
          <div style={{ fontWeight: 700, color: "#b6c48a", marginBottom: 8 }}>
            История маршрутов (выберите для сравнения):
          </div>
          {routes.map((route, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 6,
              }}
            >
              <input
                type="checkbox"
                checked={selectedRoutes.includes(idx)}
                onChange={() => toggleRoute(idx)}
                style={{ width: 18, height: 18 }}
                id={`route-check-${idx}`}
              />
              <label
                htmlFor={`route-check-${idx}`}
                style={{ flex: 1, color: "#d2e0c2" }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: route.color || DEFAULT_ROUTE_COLOR,
                    border: "2px solid #3a4a3a",
                    marginRight: 8,
                    verticalAlign: "middle",
                  }}
                ></span>
                {getRouteLabel(route, idx)}
              </label>
              {/* Палитра для смены цвета маршрута */}
              {ROUTE_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => changeRouteColor(idx, color)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border:
                      route.color === color
                        ? "3px solid #fff"
                        : "2px solid transparent",
                    background: color,
                    cursor: "pointer",
                    outline: "none",
                    marginRight: 2,
                    boxShadow: `0 0 6px 2px ${color}55, 0 2px 8px #10140c`,
                    transition: "box-shadow 0.2s, border 0.2s",
                  }}
                  aria-label={`Поменять цвет маршрута на ${color}`}
                />
              ))}
            </div>
          ))}
        </div>
      )}
      <MapContainer
        center={last ? [last.lat, last.lng] : [51.1694, 71.4491]}
        zoom={5}
        style={{
          height: 400,
          width: "100%",
          borderRadius: 12,
          border: "1.5px solid #3a4a3a",
          boxShadow: "0 2px 8px #10140c",
          marginBottom: 8,
        }}
      >
        <MapUpdater position={last ? [last.lat, last.lng] : null} />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {/* Исторические маршруты — только выбранные */}
        {showRoutes &&
          selectedRoutes.map((idx) => {
            const route = routes[idx];
            return Array.isArray(route.points) && route.points.length > 0 ? (
              <Polyline
                key={idx}
                positions={route.points.map((pt) => [pt.lat, pt.lng])}
                color={route.color || DEFAULT_ROUTE_COLOR}
                weight={2}
                dashArray="6, 8"
                opacity={0.7}
              />
            ) : null;
          })}
        {/* Текущий маршрут */}
        {positions.length > 0 && (
          <Polyline positions={positions} color={routeColor} />
        )}
        {last && (
          <Marker position={[last.lat, last.lng]} icon={droneIcon}>
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
    </div>
  );
}
