# 🌌 STARZ NEXUS - Enterprise Cosmic Intelligence Platform

> The world's most advanced astronomical AI platform combining cutting-edge 3D visualization, quantum-inspired UI, and real-time cosmic intelligence.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ & npm
- MongoDB 6.0+
- Redis 7.0+
- Ollama (for Llama3)
- Docker & Docker Compose (optional)

### Installation

#### Option 1: Docker (Recommended)
```bash
# Clone the repository
git clone https://github.com/yourusername/starz-nexus-backend.git
cd starz-nexus-backend

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Start with Docker Compose
docker-compose up -d

# Setup Ollama (pull Llama3 model)
docker exec starz-nexus-ollama ollama pull llama3

# Seed database with sample data
docker exec starz-nexus-backend npm run db:seed