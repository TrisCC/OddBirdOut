const fs = require('fs');
const path = require('path');

const VOLUME_FILE = path.join(__dirname, '..', 'data', 'volume-settings.json');

const DEFAULTS = {
    lobbyMusic: 0.7,
    gameMusic: 0.7,
    revealMusic: 0.7,
    sfx: 0.7,
};

class VolumeStore {
    constructor() {
        this._volumes = { ...DEFAULTS };
        this._load();
    }

    _load() {
        try {
            const raw = fs.readFileSync(VOLUME_FILE, 'utf-8');
            const saved = JSON.parse(raw);
            this._volumes = { ...DEFAULTS, ...saved };
        } catch (e) {}
    }

    _save() {
        try {
            const dir = path.dirname(VOLUME_FILE);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(VOLUME_FILE, JSON.stringify(this._volumes, null, 2));
        } catch (e) {
            console.error('[VolumeStore] Failed to save volume settings:', e.message);
        }
    }

    getAll() {
        return { ...this._volumes };
    }

    set(key, value) {
        if (!(key in this._volumes)) return false;
        const clamped = Math.max(0, Math.min(1, Number(value) || 0));
        this._volumes[key] = clamped;
        this._save();
        return true;
    }

    setAll(updates) {
        if (!updates || typeof updates !== 'object') return;
        let changed = false;
        for (const [key, value] of Object.entries(updates)) {
            if (key in this._volumes) {
                const clamped = Math.max(0, Math.min(1, Number(value) || 0));
                if (this._volumes[key] !== clamped) {
                    this._volumes[key] = clamped;
                    changed = true;
                }
            }
        }
        if (changed) this._save();
    }
}

module.exports = new VolumeStore();
