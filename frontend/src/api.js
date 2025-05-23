import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8080",
});

export const startStream = (rtmp_url, stream_key) =>
  api.post("/streams/start", { rtmp_url, stream_key });

export const stopStream = (stream_key) =>
  api.post("/streams/stop", { stream_key });

export const getStreams = () => api.get("/streams/status");

export default api;
