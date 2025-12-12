package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"backend-go/internal/infrastructure/http/middleware"
	"backend-go/internal/shared/logger"
)

// FileHandler handles file upload and download requests
type FileHandler struct {
	uploadPath string
	maxSize    int64
	logger     *logger.Logger
}

// NewFileHandler creates a new file handler
func NewFileHandler(uploadPath string, maxSize int64, logger *logger.Logger) *FileHandler {
	// Create upload directory if it doesn't exist
	if err := os.MkdirAll(uploadPath, 0755); err != nil {
		logger.WithError(err).Error("Failed to create upload directory")
	}

	return &FileHandler{
		uploadPath: uploadPath,
		maxSize:    maxSize,
		logger:     logger,
	}
}

// UploadFile handles file upload
func (h *FileHandler) UploadFile(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "user not authenticated",
		})
		return
	}

	// Parse multipart form
	if err := c.Request.ParseMultipartForm(h.maxSize); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "file too large or invalid form",
		})
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "no file provided",
		})
		return
	}
	defer file.Close()

	// Validate file size
	if header.Size > h.maxSize {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("file size exceeds maximum allowed size of %d bytes", h.maxSize),
		})
		return
	}

	// Validate file type
	if !h.isAllowedFileType(header.Filename) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "file type not allowed",
		})
		return
	}

	// Generate unique filename
	fileID := uuid.New().String()
	ext := filepath.Ext(header.Filename)
	filename := fileID + ext
	filePath := filepath.Join(h.uploadPath, filename)

	// Create destination file
	dst, err := os.Create(filePath)
	if err != nil {
		h.logger.WithError(err).Error("Failed to create destination file")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to save file",
		})
		return
	}
	defer dst.Close()

	// Copy file content
	if _, err := io.Copy(dst, file); err != nil {
		h.logger.WithError(err).Error("Failed to copy file content")
		os.Remove(filePath) // Clean up on error
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to save file",
		})
		return
	}

	h.logger.LogUserAction(userID, "upload_file", map[string]interface{}{
		"file_id":       fileID,
		"filename":      header.Filename,
		"size":          header.Size,
		"content_type":  header.Header.Get("Content-Type"),
	})

	c.JSON(http.StatusOK, gin.H{
		"file_id":      fileID,
		"filename":     header.Filename,
		"size":         header.Size,
		"content_type": header.Header.Get("Content-Type"),
		"upload_url":   fmt.Sprintf("/api/v1/files/%s", fileID),
		"uploaded_at":  time.Now(),
	})
}

// DownloadFile handles file download
func (h *FileHandler) DownloadFile(c *gin.Context) {
	fileID := c.Param("id")
	if fileID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "file ID is required",
		})
		return
	}

	// Find file with any extension
	files, err := filepath.Glob(filepath.Join(h.uploadPath, fileID+".*"))
	if err != nil || len(files) == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "file not found",
		})
		return
	}

	filePath := files[0]
	filename := filepath.Base(filePath)

	// Get file info
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "file not found",
		})
		return
	}

	// Set headers
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Header("Content-Type", h.getContentType(filename))
	c.Header("Content-Length", fmt.Sprintf("%d", fileInfo.Size()))

	// Serve file
	c.File(filePath)
}

// GetFileInfo handles getting file information
func (h *FileHandler) GetFileInfo(c *gin.Context) {
	fileID := c.Param("id")
	if fileID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "file ID is required",
		})
		return
	}

	// Find file with any extension
	files, err := filepath.Glob(filepath.Join(h.uploadPath, fileID+".*"))
	if err != nil || len(files) == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "file not found",
		})
		return
	}

	filePath := files[0]
	filename := filepath.Base(filePath)

	// Get file info
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "file not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"file_id":      fileID,
		"filename":     filename,
		"size":         fileInfo.Size(),
		"content_type": h.getContentType(filename),
		"modified_at":  fileInfo.ModTime(),
		"download_url": fmt.Sprintf("/api/v1/files/%s", fileID),
	})
}

// DeleteFile handles file deletion
func (h *FileHandler) DeleteFile(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "user not authenticated",
		})
		return
	}

	fileID := c.Param("id")
	if fileID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "file ID is required",
		})
		return
	}

	// Find file with any extension
	files, err := filepath.Glob(filepath.Join(h.uploadPath, fileID+".*"))
	if err != nil || len(files) == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "file not found",
		})
		return
	}

	filePath := files[0]

	// Delete file
	if err := os.Remove(filePath); err != nil {
		h.logger.WithError(err).Error("Failed to delete file")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to delete file",
		})
		return
	}

	h.logger.LogUserAction(userID, "delete_file", map[string]interface{}{
		"file_id": fileID,
	})

	c.JSON(http.StatusOK, gin.H{
		"message": "file deleted successfully",
	})
}

// isAllowedFileType checks if the file type is allowed
func (h *FileHandler) isAllowedFileType(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	
	allowedTypes := map[string]bool{
		// Images
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".gif":  true,
		".webp": true,
		".svg":  true,
		
		// Documents
		".pdf":  true,
		".doc":  true,
		".docx": true,
		".xls":  true,
		".xlsx": true,
		".ppt":  true,
		".pptx": true,
		".txt":  true,
		".rtf":  true,
		
		// Archives
		".zip":  true,
		".rar":  true,
		".7z":   true,
		".tar":  true,
		".gz":   true,
		
		// Audio
		".mp3":  true,
		".wav":  true,
		".ogg":  true,
		".m4a":  true,
		
		// Video
		".mp4":  true,
		".avi":  true,
		".mov":  true,
		".wmv":  true,
		".flv":  true,
		".webm": true,
	}

	return allowedTypes[ext]
}

// getContentType returns the content type based on file extension
func (h *FileHandler) getContentType(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	
	contentTypes := map[string]string{
		// Images
		".jpg":  "image/jpeg",
		".jpeg": "image/jpeg",
		".png":  "image/png",
		".gif":  "image/gif",
		".webp": "image/webp",
		".svg":  "image/svg+xml",
		
		// Documents
		".pdf":  "application/pdf",
		".doc":  "application/msword",
		".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		".xls":  "application/vnd.ms-excel",
		".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		".ppt":  "application/vnd.ms-powerpoint",
		".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
		".txt":  "text/plain",
		".rtf":  "application/rtf",
		
		// Archives
		".zip":  "application/zip",
		".rar":  "application/x-rar-compressed",
		".7z":   "application/x-7z-compressed",
		".tar":  "application/x-tar",
		".gz":   "application/gzip",
		
		// Audio
		".mp3":  "audio/mpeg",
		".wav":  "audio/wav",
		".ogg":  "audio/ogg",
		".m4a":  "audio/mp4",
		
		// Video
		".mp4":  "video/mp4",
		".avi":  "video/x-msvideo",
		".mov":  "video/quicktime",
		".wmv":  "video/x-ms-wmv",
		".flv":  "video/x-flv",
		".webm": "video/webm",
	}

	if contentType, exists := contentTypes[ext]; exists {
		return contentType
	}

	return "application/octet-stream"
}