# Raspberry Pi Server Setup

## Prerequisites

- Raspberry Pi 2 Model B (or newer)
- 8GB+ microSD card
- Ethernet or Wi-Fi network

## 1. Flash Raspberry Pi OS

1. Download [Raspberry Pi OS Lite (32-bit)](https://www.raspberrypi.com/software/operating-systems/)
2. Install [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
3. Select **Raspberry Pi OS Lite (32-bit)** as the OS and your SD card as storage
4. Click the gear icon and configure:
   - **Hostname**: `oddbirdout.local`
   - **Enable SSH** (password auth or import your public key)
   - **Set username/password** (e.g. `tristan` / your password)
   - **Configure wireless LAN** if using Wi-Fi (SSID + password)
5. Write the image, insert the SD card, and power on the Pi

## 2. Connect via SSH

```bash
ssh tristan@oddbirdout.local
```

If mDNS doesn't work on your network, find the Pi's IP from your router and use:

```bash
ssh tristan@<pi-ip-address>
```

## 3. Install Node.js

NodeSource no longer supports 32-bit ARM (armhf). Use the official prebuilt binary instead:

```bash
wget https://nodejs.org/dist/v20.18.1/node-v20.18.1-linux-armv7l.tar.xz
tar -xf node-v20.18.1-linux-armv7l.tar.xz
sudo cp -r node-v20.18.1-linux-armv7l/* /usr/local/
rm -rf node-v20.18.1-linux-armv7l node-v20.18.1-linux-armv7l.tar.xz
node --version
```

## 4. Transfer Project Files

From your main machine, copy both the server and the frontend:

```bash
scp -r server/ tristan@oddbirdout.local:/home/tristan/OddBirdOut/server
scp -r OddBirdOut/ tristan@oddbirdout.local:/home/tristan/OddBirdOut/OddBirdOut
```

## 5. Install Dependencies

```bash
cd /home/tristan/OddBirdOut/server
npm install
```

## 6. Auto-Start with systemd

Create the service file:

```bash
sudo nano /etc/systemd/system/oddbirdout.service
```

Contents:

```ini
[Unit]
Description=Odd Bird Out Server
After=network.target

[Service]
ExecStart=/usr/local/bin/node /home/tristan/OddBirdOut/server/index.js
WorkingDirectory=/home/tristan/OddBirdOut/server
Restart=always
User=tristan

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now oddbirdout
```

## 7. Verify

```bash
sudo systemctl status oddbirdout
```

The server is now running at port 3000. From any device on the same network, visit:

```
http://<pi-ip>:3000/?player=A
```

## Static IP (Recommended)

Set a static IP on your router's DHCP reservation page so the Pi's address doesn't change between sessions. Tablets can then use a fixed URL like `http://192.168.1.50:3000/?player=A`.

## Useful Commands

```bash
sudo systemctl restart oddbirdout   # Restart the server
sudo systemctl stop oddbirdout      # Stop the server
journalctl -u oddbirdout -f         # Follow server logs
```
