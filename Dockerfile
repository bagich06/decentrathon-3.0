# syntax=docker/dockerfile:1
FROM golang:1.24-alpine as builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o rtmp2rtsp main.go

FROM alpine:latest
WORKDIR /app
RUN apk add --no-cache ffmpeg
COPY --from=builder /app/rtmp2rtsp ./
EXPOSE 8080
CMD ["./rtmp2rtsp"] 