#!/bin/bash

# Fix all import paths from github.com/whatsapp-chat/backend-go to backend-go

find . -name "*.go" -type f -exec sed -i '' 's|github.com/whatsapp-chat/backend-go|backend-go|g' {} \;