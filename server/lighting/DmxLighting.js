const config = require('../config');

class DmxLighting {

    constructor() {
        this.available = false;
        this.backend = null;
        this.animationTimer = null;
        this.targetRgb = { r: 0, g: 0, b: 0 };
        this.currentRgb = { r: 0, g: 0, b: 0 };
        this.duskActive = false;
        this.duskStartTime = 0;
        this.duskStepMs = 8000;
        this.duskColors = [
            { r: 255, g: 20, b: 147 },
            { r: 255, g: 69, b: 0 },
            { r: 0, g: 0, b: 139 },
        ];
        this._testStartTime = 0;
        this._testCycleMs = 10000;

        this._tryUdmx();
        if (!this.available) this._trySerialDmx();
        if (!this.available) {
            if (config.DMX_TEST_MODE) {
                console.error('DMX test mode enabled but no device found.');
            }
            return;
        }

        if (config.DMX_TEST_MODE) {
            this._testStartTime = Date.now();
            console.log('DMX test mode active — cycling through all hues');
        }

        this._startAnimationLoop();
    }

    _tryUdmx() {
        let usb;
        try { usb = require('usb'); } catch (e) { return; }

        try {
            this.backend = new UdmxBackend(usb);
            this.available = true;
            console.log('DMX lighting ready via uDMX (libusb)');
        } catch (err) {
            console.warn('uDMX backend unavailable:', err.message);
        }
    }

    _trySerialDmx() {
        let DMX;
        try { DMX = require('dmx'); } catch (e) { return; }

        try {
            const dmx = new DMX();
            dmx.on('error', () => {});
            const universe = dmx.addUniverse('oddbirdout', config.DMX_DRIVER, config.DMX_DEVICE);
            universe.on('error', () => {});
            this.backend = new SerialDmxBackend(universe);
            this.available = true;
            console.log(`DMX lighting ready via serial (${config.DMX_DRIVER} on ${config.DMX_DEVICE})`);
        } catch (err) {
            console.warn('Serial DMX backend unavailable:', err.message);
        }
    }

    _startAnimationLoop() {
        if (!this.available) return;
        this.animationTimer = setInterval(() => this._animateTick(), 50);
    }

    _animateTick() {
        if (config.DMX_TEST_MODE) {
            this._updateTestHueTarget();
        } else if (this.duskActive) {
            this._updateDuskTarget();
        }
        this._lerpTowardTarget();
        this._write(
            Math.round(this.currentRgb.r),
            Math.round(this.currentRgb.g),
            Math.round(this.currentRgb.b)
        );
    }

    _updateTestHueTarget() {
        const elapsed = Date.now() - this._testStartTime;
        const hue = ((elapsed % this._testCycleMs) / this._testCycleMs) * 360;
        const rgb = hsvToRgb(hue, 1, 1);
        this._setTargetRGB(rgb.r, rgb.g, rgb.b);
    }

    _updateDuskTarget() {
        const elapsed = Date.now() - this.duskStartTime;
        const cycleDuration = this.duskStepMs * this.duskColors.length;
        const progress = (elapsed % cycleDuration) / cycleDuration;
        const scaled = progress * this.duskColors.length;
        const fromIndex = Math.floor(scaled) % this.duskColors.length;
        const toIndex = (fromIndex + 1) % this.duskColors.length;
        const fraction = scaled - Math.floor(scaled);
        const from = this.duskColors[fromIndex];
        const to = this.duskColors[toIndex];
        this._setTargetRGB(
            Math.round(from.r + (to.r - from.r) * fraction),
            Math.round(from.g + (to.g - from.g) * fraction),
            Math.round(from.b + (to.b - from.b) * fraction)
        );
    }

    _lerpTowardTarget() {
        const lerp = (a, b, t) => a + (b - a) * t;
        const speed = 0.08;
        this.currentRgb.r = lerp(this.currentRgb.r, this.targetRgb.r, speed);
        this.currentRgb.g = lerp(this.currentRgb.g, this.targetRgb.g, speed);
        this.currentRgb.b = lerp(this.currentRgb.b, this.targetRgb.b, speed);
    }

    _setTargetRGB(r, g, b) {
        this.targetRgb = { r, g, b };
    }

    _write(r, g, b) {
        try {
            this.backend.writeRGB(r, g, b);
        } catch (err) {
            // silently ignore
        }
    }

    setNighttime() {
        this.duskActive = false;
        this._setTargetRGB(0, 0, 255);
    }

    setDaytime(progress) {
        this.duskActive = false;
        const p = Math.max(0, Math.min(1, progress));
        this._setTargetRGB(255, Math.round(255 - 127 * p), 0);
    }

    startDusk() {
        this.duskActive = true;
        this.duskStartTime = Date.now();
    }

    shutdown() {
        this.duskActive = false;
        if (this.animationTimer) {
            clearInterval(this.animationTimer);
            this.animationTimer = null;
        }
        this.targetRgb = { r: 0, g: 0, b: 0 };
        this.currentRgb = { r: 0, g: 0, b: 0 };
        if (this.backend) {
            try { this.backend.close(); } catch (e) {}
            this.backend = null;
        }
        this.available = false;
    }

    getState() {
        if (!this.available) return { available: false };

        let mode = 'game';
        if (config.DMX_TEST_MODE) mode = 'test';
        else if (this.duskActive) mode = 'dusk';

        return {
            available: true,
            mode,
            target: { ...this.targetRgb },
            current: {
                r: Math.round(this.currentRgb.r),
                g: Math.round(this.currentRgb.g),
                b: Math.round(this.currentRgb.b),
            },
            channels: {
                r: config.DMX_CHANNEL_R,
                g: config.DMX_CHANNEL_G,
                b: config.DMX_CHANNEL_B,
                mode: config.DMX_CHANNEL_MODE,
                modeValue: config.DMX_MODE_VALUE,
            },
        };
    }
}

class UdmxBackend {

    constructor(usb) {
        this.usb = usb;
        this.device = usb.findByIds(config.DMX_UDMX_VID, config.DMX_UDMX_PID);
        if (!this.device) throw new Error('uDMX device not found');

        try { this.device.open(); } catch (e) {
            throw new Error(`Cannot open uDMX device. Check udev rules: ${e.message}`);
        }

        const iface = this.device.interfaces[0];
        if (iface.isKernelDriverActive()) iface.detachKernelDriver();
        iface.claim();

        this.buffer = Buffer.alloc(512, 0);
        this._sendModeChannel();
    }

    writeRGB(r, g, b) {
        this.buffer[config.DMX_CHANNEL_R - 1] = r;
        this.buffer[config.DMX_CHANNEL_G - 1] = g;
        this.buffer[config.DMX_CHANNEL_B - 1] = b;
        this._flush();
    }

    _flush() {
        this.device.controlTransfer(0x40, 1, 0, 0, this.buffer, (err) => {
            if (err) { /* silently ignore */ }
        });
    }

    _sendModeChannel() {
        if (!config.DMX_CHANNEL_MODE || config.DMX_CHANNEL_MODE <= 0) return;
        this.buffer[config.DMX_CHANNEL_MODE - 1] = config.DMX_MODE_VALUE;
    }

    close() {
        try { this.device.close(); } catch (e) {}
    }
}

class SerialDmxBackend {

    constructor(universe) {
        this.universe = universe;
        this._sendModeChannel();
    }

    writeRGB(r, g, b) {
        this.universe.update({
            [config.DMX_CHANNEL_R]: r,
            [config.DMX_CHANNEL_G]: g,
            [config.DMX_CHANNEL_B]: b,
        });
    }

    _sendModeChannel() {
        if (!config.DMX_CHANNEL_MODE || config.DMX_CHANNEL_MODE <= 0) return;
        this.universe.update({
            [config.DMX_CHANNEL_MODE]: config.DMX_MODE_VALUE,
        });
    }

    close() {}
}

function hsvToRgb(h, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;
    let rp, gp, bp;
    if (h < 60) { rp = c; gp = x; bp = 0; }
    else if (h < 120) { rp = x; gp = c; bp = 0; }
    else if (h < 180) { rp = 0; gp = c; bp = x; }
    else if (h < 240) { rp = 0; gp = x; bp = c; }
    else if (h < 300) { rp = x; gp = 0; bp = c; }
    else { rp = c; gp = 0; bp = x; }
    return {
        r: Math.round((rp + m) * 255),
        g: Math.round((gp + m) * 255),
        b: Math.round((bp + m) * 255),
    };
}

module.exports = { DmxLighting };
