# AWS EC2 / Lightsail Deployment Guide for Aero MAGE (Nginx + Node.js + PM2 + PostgreSQL)

This guide walks you through hosting **Aero MAGE** on AWS EC2 or AWS Lightsail using **Nginx** as a production reverse proxy and static web server.

---

## 1. AWS Security Group Inbound Rules
When creating your AWS EC2 instance (Ubuntu 22.04 LTS recommended), ensure your **Security Group** allows the following inbound ports:

| Type | Protocol | Port Range | Source | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **SSH** | TCP | `22` | My IP | Secure SSH Terminal Access |
| **HTTP** | TCP | `80` | `0.0.0.0/0` | Web Traffic & Certbot SSL Validation |
| **HTTPS** | TCP | `443` | `0.0.0.0/0` | Encrypted SSL/TLS Web Traffic |

---

## 2. Server Prerequisites Installation (Run on Ubuntu Server)

SSH into your AWS instance and run:

```bash
# Update Ubuntu system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx postgresql postgresql-contrib certbot python3-certbot-nginx

# Install PM2 globally to run backend continuously in background
sudo npm install -g pm2
```

---

## 3. Clone Repository & Install Dependencies

```bash
# Create application directory
sudo mkdir -p /var/www/aeromage
sudo chown -R $USER:$USER /var/www/aeromage

# Upload your project files or clone repo into /var/www/aeromage
cd /var/www/aeromage

# Install Backend Dependencies & Push Database Schema
cd backend
npm install
npx prisma generate
npx prisma db push
npm run build # Compiles TypeScript to dist/

# Install Frontend Dependencies & Create Production Build
cd ../frontend
npm install
npm run build # Creates production bundle in frontend/dist/
```

---

## 4. Run Backend with PM2 Process Manager

```bash
cd /var/www/aeromage/backend

# Start backend using PM2
pm2 start dist/server.js --name "aeromage-backend"

# Save PM2 state & enable startup on server reboot
pm2 save
pm2 startup
```

---

## 5. Configure Nginx Reverse Proxy

Copy the provided `nginx.conf` file to Nginx site configuration:

```bash
# Copy nginx.conf to Nginx sites-available
sudo cp /var/www/aeromage/nginx.conf /etc/nginx/sites-available/aeromage

# Enable the site configuration
sudo ln -s /etc/nginx/sites-available/aeromage /etc/nginx/sites-enabled/

# Remove default Nginx site if active
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx syntax
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## 6. Obtain Free SSL Certificate (Certbot Let's Encrypt)

```bash
# Run Certbot to automatically configure HTTPS SSL certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Why Nginx is Essential for Aero MAGE on AWS:

1. **Real Client IP Geolocation**: Nginx forwards `X-Forwarded-For` and `X-Real-IP` headers so your **MNC-Grade Geolocation Audit Engine** (`geo.ts`) records real global client locations instead of `127.0.0.1`.
2. **WebSocket Support for Live Quizzes**: Nginx handles `Upgrade` and `Connection` HTTP headers required for **Socket.IO** real-time multiplayer lobbies.
3. **High-Performance Static Asset Delivery**: Nginx serves React SPA frontend static assets (`dist`) directly with Gzip compression and long-term caching.
4. **SSL/TLS Offloading**: Handles HTTPS encryption natively, reducing CPU overhead on the Node.js process.
