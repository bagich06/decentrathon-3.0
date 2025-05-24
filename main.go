package main

import (
	"net/http"

	"os/exec"
	"sync"

	"encoding/json"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

type StreamInfo struct {
	RTMPUrl   string
	StreamKey string
	Cmd       *exec.Cmd
}

// TelemetryData описывает структуру телеметрии дрона
type TelemetryData struct {
	Lat       float64 `json:"lat"`
	Lng       float64 `json:"lng"`
	Alt       float64 `json:"alt"`
	Speed     float64 `json:"speed"`
	Timestamp int64   `json:"timestamp"`
}

var (
	streams   = make(map[string]*StreamInfo) 
	streamsMu sync.Mutex
	logger    *zap.Logger
	telemetryClients   = make(map[*websocket.Conn]bool)
	telemetryClientsMu sync.Mutex
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func main() {
	var err error
	logger, err = zap.NewProduction()
	if err != nil {
		panic(err)
	}
	defer logger.Sync()

	r := gin.Default()
	r.Use(cors.Default())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	r.POST("/streams/start", startStreamHandler)
	r.POST("/streams/stop", stopStreamHandler)
	r.GET("/streams/status", statusStreamHandler)
	r.GET("/ws/telemetry", handleTelemetryWS)
	r.POST("/api/telemetry", handleTelemetryPOST)

	logger.Info("Starting RTMP->RTSP converter API", zap.String("addr", ":8080"))
	r.Run(":8080")
}

func startStreamHandler(c *gin.Context) {
	type reqBody struct {
		RTMPUrl   string `json:"rtmp_url" binding:"required"`
		StreamKey string `json:"stream_key" binding:"required"`
	}
	var req reqBody
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Warn("Invalid start request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	streamsMu.Lock()
	if _, exists := streams[req.StreamKey]; exists {
		streamsMu.Unlock()
		logger.Warn("Stream already running", zap.String("stream_key", req.StreamKey))
		c.JSON(http.StatusConflict, gin.H{"error": "stream already running"})
		return
	}
	streamsMu.Unlock()

	// RTSP адрес для публикации в MediaMTX
	rtspUrl := "rtsp://localhost:8554/" + req.StreamKey

	cmd := exec.Command(
		"ffmpeg",
		"-i", req.RTMPUrl,
		"-c:v", "copy",
		"-c:a", "aac",
		"-f", "rtsp",
		"-rtsp_transport", "tcp",
		rtspUrl,
	)

	if err := cmd.Start(); err != nil {
		logger.Error("Failed to start ffmpeg", zap.Error(err), zap.String("stream_key", req.StreamKey))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	streamsMu.Lock()
	streams[req.StreamKey] = &StreamInfo{
		RTMPUrl:   req.RTMPUrl,
		StreamKey: req.StreamKey,
		Cmd:       cmd,
	}
	streamsMu.Unlock()

	logger.Info("Stream started", zap.String("stream_key", req.StreamKey), zap.String("rtmp_url", req.RTMPUrl), zap.String("rtsp_url", rtspUrl))
	c.JSON(http.StatusOK, gin.H{
		"message":  "stream started",
		"rtsp_url": rtspUrl,
	})
}

func stopStreamHandler(c *gin.Context) {
	type reqBody struct {
		StreamKey string `json:"stream_key" binding:"required"`
	}
	var req reqBody
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Warn("Invalid stop request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	streamsMu.Lock()
	stream, exists := streams[req.StreamKey]
	streamsMu.Unlock()
	if !exists {
		logger.Warn("Stream not found for stop", zap.String("stream_key", req.StreamKey))
		c.JSON(http.StatusNotFound, gin.H{"error": "stream not found"})
		return
	}

	if stream.Cmd.Process != nil {
		err := stream.Cmd.Process.Kill()
		if err != nil {
			logger.Error("Failed to stop ffmpeg", zap.Error(err), zap.String("stream_key", req.StreamKey))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to stop process: " + err.Error()})
			return
		}
	}

	streamsMu.Lock()
	delete(streams, req.StreamKey)
	streamsMu.Unlock()

	logger.Info("Stream stopped", zap.String("stream_key", req.StreamKey))
	c.JSON(http.StatusOK, gin.H{"message": "stream stopped"})
}

func statusStreamHandler(c *gin.Context) {
	streamsMu.Lock()
	defer streamsMu.Unlock()
	result := make([]gin.H, 0, len(streams))
	for key, info := range streams {
		status := "unknown"
		if info.Cmd.ProcessState != nil && info.Cmd.ProcessState.Exited() {
			status = "stopped"
		} else {
			status = "running"
		}
		result = append(result, gin.H{
			"stream_key": key,
			"rtmp_url":   info.RTMPUrl,
			"rtsp_url":   "rtsp://localhost:8554/" + key,
			"status":     status,
		})
	}
	logger.Info("Status requested", zap.Int("streams_count", len(result)))
	c.JSON(http.StatusOK, result)
}

// handleTelemetryWS отправляет телеметрию всем подключённым клиентам
func handleTelemetryWS(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		logger.Error("WebSocket upgrade failed", zap.Error(err))
		return
	}
	telemetryClientsMu.Lock()
	telemetryClients[conn] = true
	telemetryClientsMu.Unlock()
	defer func() {
		telemetryClientsMu.Lock()
		delete(telemetryClients, conn)
		telemetryClientsMu.Unlock()
		conn.Close()
	}()
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

// sendTelemetry рассылает телеметрию всем клиентам
func sendTelemetry(data TelemetryData) {
	msg, _ := json.Marshal(data)
	telemetryClientsMu.Lock()
	for conn := range telemetryClients {
		_ = conn.WriteMessage(websocket.TextMessage, msg)
	}
	telemetryClientsMu.Unlock()
}

// handleTelemetryPOST принимает телеметрию через REST и рассылает по WebSocket
func handleTelemetryPOST(c *gin.Context) {
	var data TelemetryData
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	sendTelemetry(data)
	c.JSON(http.StatusOK, gin.H{"status": "telemetry sent"})
} 