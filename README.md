# MG Fitness

Gym management app (React + Vite + Express).

## Open the app on your phone

1. **Same Wi‑Fi**  
   Connect your phone and your computer to the same Wi‑Fi network.

2. **Start the backend** (on your computer):
   ```bash
   cd server && node index.js
   ```
   Leave this terminal open.

3. **Start the frontend** (on your computer, in a new terminal):
   ```bash
   cd mg-fitness && npm run dev
   ```
   Leave this running.

4. **Find your computer’s IP**
   - **Linux:** `hostname -I` or `ip addr`
   - **macOS:** System Settings → Network, or run `ipconfig getifaddr en0`
   - **Windows:** `ipconfig` (look for IPv4, e.g. `192.168.1.5`)

5. **On your phone**  
   Open the browser and go to:
   ```text
   http://<YOUR_IP>:8080
   ```
   Example: if your IP is `192.168.1.5`, open **http://192.168.1.5:8080**

API requests from the app are sent to the same address (port 8080) and proxied to the backend on your computer, so no extra setup is needed.
