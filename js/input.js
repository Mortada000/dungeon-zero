export class Input {
    constructor() {
        this.keys = {};
        this.previousKeys = {};

        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.key) this.keys[e.key.toLowerCase()] = true; 
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            if (e.key) this.keys[e.key.toLowerCase()] = false;
        });
    }

    update() {
        this.previousKeys = { ...this.keys };
    }

    isDown(code) {
        return !!this.keys[code];
    }

    justPressed(code) {
        return !!this.keys[code] && !this.previousKeys[code];
    }

    getDirection() {
        let dx = 0;
        let dy = 0;

        if (this.isDown('KeyW') || this.isDown('w') || this.isDown('ArrowUp')) dy -= 1;
        if (this.isDown('KeyS') || this.isDown('s') || this.isDown('ArrowDown')) dy += 1;
        if (this.isDown('KeyA') || this.isDown('a') || this.isDown('ArrowLeft')) dx -= 1;
        if (this.isDown('KeyD') || this.isDown('d') || this.isDown('ArrowRight')) dx += 1;

        if (dx !== 0 || dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
        }

        return { x: dx, y: dy };
    }
}