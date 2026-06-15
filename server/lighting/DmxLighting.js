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

        this._tryUdmx();
        if (!this.available) this._trySerialDmx();
        if (!this.available) return;

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
            this.backend = new SerialDmxBackend(universe, config.DMX_START_CHANNEL);
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
        if (this.duskActive) this._updateDuskTarget();
        this._lerpTowardTarget();
        this._write(
            Math.round(this.currentRgb.r),
            Math.round(this.currentRgb.g),
            Math.round(this.currentRgb.b)
        );
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
    }

    writeRGB(r, g, b) {
        const ch = config.DMX_START_CHANNEL;
        this._setChannel(ch, r);
        this._setChannel(ch + 1, g);
        this._setChannel(ch + 2, b);
    }

    _setChannel(channel, value) {
        this.device.controlTransfer(0x40, 2, channel, value, Buffer.alloc(0), (err) => {
            if (err) { /* silently ignore */ }
        });
    }

    close() {
        try { this.device.close(); } catch (e) {}
    }
}

class SerialDmxBackend {

    constructor(universe, startChannel) {
        this.universe = universe;
        this.startChannel = startChannel;
    }

    writeRGB(r, g, b) {
        const ch = this.startChannel;
        this.universe.update({ [ch]: r, [ch + 1]: g, [ch + 2]: b });
    }

    close() {}
}

module.exports = { DmxLighting };
