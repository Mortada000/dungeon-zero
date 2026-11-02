class PRNG {
    constructor(seed) { this.seed = seed; }
    next() {
        let t = this.seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
    range(min, max) { return Math.floor(this.next() * (max - min)) + min; }
}

class Room {
    constructor(x, y, w, h, id) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.id = id;
        this.type = 'COMBAT';
        this.state = 'UNVISITED'; // UNVISITED, ACTIVE, CLEARED, CHEST_OPENED, VISITED
        this.discovered = false;
        this.doors = [];
        this.connectedRooms = [];
    }
    get center() {
        return {
            x: Math.floor(this.x + this.w / 2),
            y: Math.floor(this.y + this.h / 2)
        };
    }
}

export class Dungeon {
    constructor(cols, rows, tileSize) {
        this.cols = cols;
        this.rows = rows;
        this.tileSize = tileSize;
        this.grid = [];
        this.rooms = [];
        this.seed = 0;
    }

    generate() {
        this.seed = Math.floor(Math.random() * 999999999);
        const prng = new PRNG(this.seed);

        for (let y = 0; y < this.rows; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.cols; x++) {
                this.grid[y][x] = 0;
            }
        }
        
        this.rooms = [];
        const startX = Math.floor(this.cols / 2) - 6;
        const startY = Math.floor(this.rows / 2) - 6;
        const startRoom = new Room(startX, startY, 12, 12, 0);
        this.rooms.push(startRoom);
        this.carveRoom(startRoom);

        let failedAttempts = 0;
        const maxRooms = 12;

        while (this.rooms.length < maxRooms && failedAttempts < 50) {
            let baseRoom = this.rooms[prng.range(0, this.rooms.length)];
            let w = prng.range(10, 17);
            let h = prng.range(8, 13);
            let dir = prng.range(0, 4); 
            let distance = prng.range(4, 9);
            
            let newX = baseRoom.x;
            let newY = baseRoom.y;

            if (dir === 0) { 
                newX = baseRoom.center.x + prng.range(-Math.floor(w/2), Math.floor(w/2));
                newY = baseRoom.y - distance - h;
            } else if (dir === 1) { 
                newX = baseRoom.center.x + prng.range(-Math.floor(w/2), Math.floor(w/2));
                newY = baseRoom.y + baseRoom.h + distance;
            } else if (dir === 2) { 
                newX = baseRoom.x + baseRoom.w + distance;
                newY = baseRoom.center.y + prng.range(-Math.floor(h/2), Math.floor(h/2));
            } else if (dir === 3) { 
                newX = baseRoom.x - distance - w;
                newY = baseRoom.center.y + prng.range(-Math.floor(h/2), Math.floor(h/2));
            }

            if (newX > 2 && newY > 2 && newX + w < this.cols - 2 && newY + h < this.rows - 2) {
                let newRoom = new Room(newX, newY, w, h, this.rooms.length);
                if (!this.checkOverlap(newRoom, 2)) {
                    this.rooms.push(newRoom);
                    this.carveRoom(newRoom);
                    this.carveCorridor(baseRoom.center, newRoom.center);
                    baseRoom.connectedRooms.push(newRoom);
                    newRoom.connectedRooms.push(baseRoom);
                } else {
                    failedAttempts++;
                }
            } else {
                failedAttempts++;
            }
        }

        this.assignRoomTypes(prng);
        this.findDoors();
        this.generateCover(prng); // توليد العوائق البيئية
    }

    // --- الدالة الجديدة (أضفها هنا مباشرة بعد generate) ---
    generateCover(prng) {
        for (let r of this.rooms) {
            // إضافة Cover للغرف العادية والحدث فقط
            if (!['COMBAT', 'EVENT'].includes(r.type)) continue;
            
            let numCovers = prng.range(2, 6); // 2 إلى 5 قطع لكل غرفة
            
            for (let i = 0; i < numCovers; i++) {
                let cx = r.x + prng.range(2, r.w - 2);
                let cy = r.y + prng.range(2, r.h - 2);
                
                // تجنب المركز لمنع سد نقاط السباون أو الأحداث
                if (Math.abs(cx - r.center.x) <= 2 && Math.abs(cy - r.center.y) <= 2) continue;
                
                // تجنب الأبواب لمنع إغلاق الممرات
                let nearDoor = false;
                for (let d of r.doors) {
                    if (Math.abs(cx - d.x) <= 2 && Math.abs(cy - d.y) <= 2) {
                        nearDoor = true;
                        break;
                    }
                }
                if (nearDoor) continue;

                this.grid[cy][cx] = 2; // تعيين الكود 2 للـ Cover
            }
        }
    }

    checkOverlap(room, padding) {
        for (let r of this.rooms) {
            if (room.x - padding <= r.x + r.w && room.x + room.w + padding >= r.x &&
                room.y - padding <= r.y + r.h && room.y + room.h + padding >= r.y) {
                return true;
            }
        }
        return false;
    }

    carveRoom(room) {
        for (let y = room.y; y < room.y + room.h; y++) {
            for (let x = room.x; x < room.x + room.w; x++) {
                this.grid[y][x] = 1;
            }
        }
    }

    carveCorridor(p1, p2) {
        let x = p1.x;
        let y = p1.y;

        while (x !== p2.x) {
            this.grid[y][x] = 1;
            this.grid[y + 1][x] = 1;
            x += Math.sign(p2.x - x);
        }
        while (y !== p2.y) {
            this.grid[y][x] = 1;
            this.grid[y][x + 1] = 1;
            y += Math.sign(p2.y - y);
        }
    }

    assignRoomTypes(prng) {
        this.rooms[0].type = 'START';
        
        const startCenter = this.rooms[0].center;
        let sortedRooms = [...this.rooms].map(r => {
            const dx = r.center.x - startCenter.x;
            const dy = r.center.y - startCenter.y;
            return { room: r, dist: dx*dx + dy*dy };
        });
        
        sortedRooms.sort((a, b) => b.dist - a.dist); 
        
        if (sortedRooms.length > 1) {
            sortedRooms[0].room.type = 'BOSS_PLACEHOLDER';
        }
        
        let available = sortedRooms.slice(1).map(item => item.room).filter(r => r.type === 'COMBAT');
        
        for (let i = available.length - 1; i > 0; i--) {
            const j = prng.range(0, i + 1);
            [available[i], available[j]] = [available[j], available[i]];
        }
        
        if (available.length > 0) available[0].type = 'TREASURE';
        if (available.length > 1) available[1].type = 'SHOP';
        if (available.length > 2) available[2].type = 'EVENT';
    }

    findDoors() {
        for (let r of this.rooms) {
            r.doors = [];
            for (let x = r.x; x < r.x + r.w; x++) {
                if (this.grid[r.y - 1] && this.grid[r.y - 1][x] === 1) r.doors.push({x, y: r.y - 1, dir: 'H'});
                if (this.grid[r.y + r.h] && this.grid[r.y + r.h][x] === 1) r.doors.push({x, y: r.y + r.h, dir: 'H'});
            }
            for (let y = r.y; y < r.y + r.h; y++) {
                if (this.grid[y][r.x - 1] === 1) r.doors.push({x: r.x - 1, y, dir: 'V'});
                if (this.grid[y][r.x + r.w] === 1) r.doors.push({x: r.x + r.w, y, dir: 'V'});
            }
        }
    }

    getRoomAt(pixelX, pixelY) {
        let tx = Math.floor(pixelX / this.tileSize);
        let ty = Math.floor(pixelY / this.tileSize);

        for (let r of this.rooms) {
            if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) {
                return r;
            }
        }
        return null;
    }

    isWallAt(pixelX, pixelY) {
        if (pixelX < 0 || pixelY < 0 || 
            pixelX >= this.cols * this.tileSize || 
            pixelY >= this.rows * this.tileSize) {
            return true;
        }
        const tileX = Math.floor(pixelX / this.tileSize);
        const tileY = Math.floor(pixelY / this.tileSize);
        // 0 هو الجدار الخارجي/الفراغ، و 2 هو الـ Cover داخل الغرف
        return this.grid[tileY][tileX] === 0 || this.grid[tileY][tileX] === 2;
    }

    // إضافة currentFloor للوسائط (بشكل افتراضي 1)
    render(ctx, camera, viewWidth, viewHeight, currentFloor = 1) {
        const startCol = Math.max(0, Math.floor((camera.x - viewWidth / 2) / this.tileSize));
        const endCol = Math.min(this.cols - 1, Math.ceil((camera.x + viewWidth / 2) / this.tileSize));
        const startRow = Math.max(0, Math.floor((camera.y - viewHeight / 2) / this.tileSize));
        const endRow = Math.min(this.rows - 1, Math.ceil((camera.y + viewHeight / 2) / this.tileSize));

        for (let y = startRow; y <= endRow; y++) {
            for (let x = startCol; x <= endCol; x++) {
                const px = x * this.tileSize;
                const py = y * this.tileSize;
                const ts = this.tileSize; 
                
                const hash = (x * 37 + y * 19) % 100;

                // --- إعداد الألوان الأساسية ---
                let wallFill, wallStroke, floorFill;
                
                if (currentFloor === 1) { 
                    wallFill = '#1a1614'; wallStroke = '#2a221f'; floorFill = '#0a0808'; 
                } else if (currentFloor === 2) { 
                    // Floor 2 Base: Dark Brown / Dark Gray with slight green
                    wallFill = '#1c1a17'; wallStroke = '#2a2922'; floorFill = '#0e100c'; 
                } else { 
                    // Floor 3 Base: Abyssal Blue-Black
                    wallFill = '#090a10'; wallStroke = '#141522'; floorFill = '#030306'; 
                }

                if (this.grid[y][x] === 1) { 
                    // -----------------------------
                    // رسم الجدران (Walls)
                    // -----------------------------
                    
                    if (currentFloor === 1) {
                        // --- Floor 1: Forgotten Catacombs (ممنوع التعديل) ---
                        const shade = hash % 3 === 0 ? '#1f1b19' : (hash % 2 === 0 ? '#151211' : '#1a1614');
                        ctx.fillStyle = shade;
                        ctx.fillRect(px, py, ts, ts);
                        
                        ctx.strokeStyle = '#0a0808';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(px, py + ts/2); ctx.lineTo(px + ts, py + ts/2); 
                        ctx.moveTo(px + ts/2, py); ctx.lineTo(px + ts/2, py + ts/2); 
                        ctx.moveTo(px + ts/4, py + ts/2); ctx.lineTo(px + ts/4, py + ts); 
                        ctx.moveTo(px + ts*0.75, py + ts/2); ctx.lineTo(px + ts*0.75, py + ts); 
                        ctx.stroke();

                        if (hash < 25) {
                            ctx.strokeStyle = '#050404';
                            ctx.beginPath();
                            ctx.moveTo(px + 10, py + 10);
                            ctx.lineTo(px + 20, py + 25);
                            ctx.lineTo(px + 15, py + 40);
                            ctx.stroke();
                        }
                        
                    } else if (currentFloor === 2) {
                        // --- Floor 2: Cursed Wilds ---
                        // صخور قديمة غير منتظمة
                        ctx.fillStyle = (hash % 2 === 0) ? '#181714' : '#1c1a17';
                        ctx.fillRect(px, py, ts, ts);
                        
                        // طحالب واضحة على الحواف (Dark Green Moss)
                        if (hash % 3 === 0 || hash > 70) {
                            ctx.fillStyle = '#172614';
                            ctx.beginPath();
                            ctx.moveTo(px, py);
                            ctx.quadraticCurveTo(px + 20, py + 10, px + ts/2, py);
                            ctx.lineTo(px, py);
                            ctx.fill();
                            
                            ctx.beginPath();
                            ctx.moveTo(px + ts, py + ts);
                            ctx.quadraticCurveTo(px + ts - 20, py + ts - 15, px + ts, py + ts/2);
                            ctx.fill();
                        }

                        // جذور متفرعة واضحة
                        if (hash < 40) {
                            ctx.strokeStyle = '#2b1a10';
                            ctx.lineWidth = 4;
                            ctx.lineCap = 'round';
                            ctx.lineJoin = 'round';
                            ctx.beginPath();
                            ctx.moveTo(px + 5, py);
                            ctx.quadraticCurveTo(px + 30, py + 30, px + 20, py + ts);
                            // تفرع فرعي للجذر
                            ctx.moveTo(px + 22, py + 22);
                            ctx.quadraticCurveTo(px + ts, py + 40, px + ts - 5, py + ts);
                            ctx.stroke();
                        }
                        
                        // أغصان صغيرة في الزوايا
                        if (hash > 80) {
                            ctx.strokeStyle = '#1f130b';
                            ctx.lineWidth = 3;
                            ctx.beginPath();
                            ctx.moveTo(px + ts, py);
                            ctx.lineTo(px + ts - 15, py + 15);
                            ctx.stroke();
                        }
                        
                    } else {
                        // --- Floor 3: Abyssal Depths ---
                        ctx.fillStyle = floorFill;
                        ctx.fillRect(px, py, ts, ts);
                        
                        // إضافة نسيج صخري داكن جداً وهادئ لكسر فراغ الأرضية بدون أي تشتيت بصري
                        if (hash < 25) { 
                            ctx.fillStyle = '#1a1515'; 
                            ctx.fillRect(px + 10, py + 15, ts - 20, ts - 30);
                        } else if (hash > 75) {
                            ctx.fillStyle = 'rgb(21, 18, 18)'; 
                            ctx.fillRect(px + 15, py + 10, ts - 30, ts - 20);
                        }
                    }
                    
                    // رسم الإطار العام للجدار
                    ctx.strokeStyle = wallStroke;
                    ctx.lineWidth = 1;
                    ctx.strokeRect(px, py, ts, ts);
                    
                } else if (this.grid[y][x] === 2) {
                    // -----------------------------
                    // رسم العوائق البيئية (Cover)
                    // -----------------------------
                    
                    // 1. رسم الأرضية السفلية لمنع ظهور فراغ أسود تحت العائق
                    ctx.fillStyle = floorFill;
                    ctx.fillRect(px, py, ts, ts);

                    // 2. رسم العائق بناءً على الطابق
                    if (currentFloor === 1) {
                        // Floor 1: أعمدة وصخور وأطلال
                        if (hash % 2 === 0) { // عمود حجري (Pillar)
                            ctx.fillStyle = '#111';
                            ctx.beginPath(); ctx.arc(px + ts/2, py + ts/2, 18, 0, Math.PI*2); ctx.fill();
                            ctx.fillStyle = '#2a221f';
                            ctx.beginPath(); ctx.arc(px + ts/2, py + ts/2 - 6, 14, 0, Math.PI*2); ctx.fill();
                        } else { // جدار مكسور (Broken Wall)
                            ctx.fillStyle = '#0a0808';
                            ctx.fillRect(px + 10, py + 20, ts - 20, ts - 40);
                            ctx.fillStyle = '#2a221f';
                            ctx.fillRect(px + 10, py + 14, ts - 20, ts - 40);
                        }
                    } else if (currentFloor === 2) {
                        // Floor 2: صخور مغطاة بالطحالب وجذور عملاقة
                        if (hash % 2 === 0) { // صخرة طحلبية (Mossy Rock)
                            ctx.fillStyle = '#181714';
                            ctx.beginPath(); ctx.arc(px + ts/2, py + ts/2 + 5, 20, 0, Math.PI*2); ctx.fill();
                            ctx.fillStyle = '#172614'; // الطحلب
                            ctx.beginPath(); ctx.arc(px + ts/2 - 4, py + ts/2 - 4, 12, 0, Math.PI*2); ctx.fill();
                        } else { // جذر عملاق (Giant Root)
                            ctx.strokeStyle = '#1a100a';
                            ctx.lineWidth = 14;
                            ctx.lineCap = 'round';
                            ctx.beginPath(); 
                            ctx.moveTo(px+10, py+ts-10); 
                            ctx.quadraticCurveTo(px+ts/2, py+10, px+ts-10, py+ts/2); 
                            ctx.stroke();
                        }
                    } else {
                        // Floor 3: صخور أبسالية سوداء وشقوق متوهجة
                        ctx.fillStyle = '#06070c';
                        ctx.beginPath(); 
                        ctx.moveTo(px+10, py+ts-10); 
                        ctx.lineTo(px+ts/2, py+10); 
                        ctx.lineTo(px+ts-10, py+ts-10); 
                        ctx.fill();
                        ctx.strokeStyle = '#141522'; 
                        ctx.lineWidth = 3; 
                        ctx.stroke();
                        
                        // توهج الشقوق داخل الصخرة
                        const glowColor = (hash % 3 === 0) ? '#ff0033' : '#00ccff';
                        ctx.save();
                        ctx.shadowBlur = 12; ctx.shadowColor = glowColor;
                        ctx.strokeStyle = glowColor; ctx.lineWidth = 2;
                        ctx.beginPath(); 
                        ctx.moveTo(px+ts/2, py+20); 
                        ctx.lineTo(px+ts/2 - 5, py+ts/2); 
                        ctx.lineTo(px+ts/2 + 5, py+ts-15); 
                        ctx.stroke();
                        ctx.restore();
                    }

                } else { 
                    // -----------------------------
                    // رسم الأرضيات القابلة للمشي (Floors)
                    // -----------------------------
                    
                    if (currentFloor === 1) {
                        // --- Floor 1 (ممنوع التعديل) ---
                        ctx.fillStyle = floorFill;
                        ctx.fillRect(px, py, ts, ts);
                        if (hash > 70) { 
                            ctx.fillStyle = '#110d0a';
                            ctx.fillRect(px + 10, py + 10, 15, 10);
                            ctx.fillRect(px + 40, py + 30, 8, 8);
                        }
                    } else if (currentFloor === 2) {
                        // --- Floor 2: Cursed Wilds ---
                        ctx.fillStyle = floorFill;
                        ctx.fillRect(px, py, ts, ts);
                        
                        // أحجار صغيرة متفاوتة
                        if (hash % 4 === 0) {
                            ctx.fillStyle = '#1c1d1a';
                            ctx.beginPath();
                            ctx.arc(px + 15, py + 20, 4, 0, Math.PI * 2);
                            ctx.arc(px + 45, py + 45, 6, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        
                        // أوراق أو عشب خفيف
                        if (hash > 60) {
                            ctx.fillStyle = '#142b14';
                            ctx.beginPath();
                            ctx.moveTo(px + 30, py + 30);
                            ctx.lineTo(px + 35, py + 25);
                            ctx.lineTo(px + 38, py + 32);
                            ctx.fill();
                            
                            if (hash > 80) {
                                ctx.beginPath();
                                ctx.moveTo(px + 10, py + 50);
                                ctx.lineTo(px + 18, py + 45);
                                ctx.lineTo(px + 15, py + 55);
                                ctx.fill();
                            }
                        }
                    } else {
                        // --- Floor 3: Abyssal Depths ---
                        ctx.fillStyle = floorFill;
                        ctx.fillRect(px, py, ts, ts);
                        
                        // إنشاء قيمة Hash إضافية بمعاملات مختلفة لكسر أي تكرار قطري
                        const hash2 = (x * 73 + y * 41 + hash * 13) % 100;

                        // 1. إضافة Texture داكنة جداً (تضاريس صخرية باهتة لكسر الفراغ)
                        if (hash2 > 60) {
                            ctx.fillStyle = '#0f0f1c';
                            ctx.fillRect(px + 10, py + 10, 20, 15);
                            if (hash2 > 80) {
                                ctx.fillStyle = '#06060b';
                                ctx.fillRect(px + 35, py + 30, 15, 20);
                            }
                        }

                        // 2. شقوق طاقة نادرة جداً، متعرجة، وبدون توهج مبالغ فيه
                        if (hash2 < 30) { 
                            const isRed = (hash % 2 === 0);
                            const crackColor = isRed ? '#880011' : '#003388'; // لون طاقة داكن
                            const glowColor = isRed ? '#cc0022' : '#0055cc';
                            
                            ctx.save();
                            ctx.strokeStyle = crackColor;
                            ctx.lineWidth = 1.5;
                            ctx.globalAlpha = 0.6; // توهج خافت
                            ctx.shadowBlur = 4; // إزالة النيون القوي
                            ctx.shadowColor = glowColor;
                            
                            // رسم كسر صخري متعرج
                            ctx.beginPath();
                            ctx.moveTo(px + 8, py + 12);
                            ctx.lineTo(px + 16, py + 18);
                            ctx.lineTo(px + 14, py + 30);
                            ctx.lineTo(px + 24, py + 42);
                            ctx.lineTo(px + 18, py + 52);
                            ctx.stroke();
                            ctx.restore();
                        }
                    }
                }
            }
        }
        for (let r of this.rooms) {
            if (!r.discovered) continue;
            
            if (r.x * this.tileSize > camera.x + viewWidth / 2 || (r.x + r.w) * this.tileSize < camera.x - viewWidth / 2 ||
                r.y * this.tileSize > camera.y + viewHeight / 2 || (r.y + r.h) * this.tileSize < camera.y - viewHeight / 2) {
                continue; 
            }

            const rx = r.x * this.tileSize;
            const ry = r.y * this.tileSize;
            const rw = r.w * this.tileSize;
            const rh = r.h * this.tileSize;

            ctx.save();
            let doorColor = '#00ffff';
            
            if (r.type === 'START') {
                ctx.fillStyle = 'rgba(0, 200, 255, 0.05)';
                doorColor = '#00aaff';
            } else if (r.type === 'COMBAT') {
                ctx.fillStyle = r.state === 'CLEARED' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 0, 0, 0.05)';
                doorColor = '#ff3366';
            } else if (r.type === 'TREASURE') {
                ctx.fillStyle = 'rgba(255, 215, 0, 0.05)';
                doorColor = '#ffd700';
            } else if (r.type === 'SHOP') {
                ctx.fillStyle = 'rgba(255, 200, 0, 0.06)';
                doorColor = '#ffaa00';
            } else if (r.type === 'EVENT') {
                ctx.fillStyle = 'rgba(170, 85, 255, 0.06)';
                doorColor = '#aa55ff';
            } else if (r.type === 'BOSS_PLACEHOLDER') {
                ctx.fillStyle = r.state === 'ACTIVE' ? 'rgba(50, 0, 0, 0.15)' : 'rgba(255, 0, 0, 0.05)';
                doorColor = '#ff0000';
            }

            // إلغاء لون الغرفة في الطابق 3 لإظهار تفاصيل الأرضية الداكنة
            if (currentFloor === 3 && r.type !== 'BOSS_PLACEHOLDER') {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.0)';
            }

            ctx.fillRect(rx, ry, rw, rh);

            // STAGE 9: Visual Door Locking if Boss is Active
            const isBossLocked = (r.type === 'BOSS_PLACEHOLDER' && r.state === 'ACTIVE');
            
            ctx.fillStyle = doorColor;
            ctx.shadowBlur = isBossLocked ? 20 : 10;
            ctx.shadowColor = doorColor;
            
            for (let d of r.doors) {
                if (d.dir === 'H') {
                    if (isBossLocked) {
                        // Solid laser barrier
                        ctx.fillStyle = '#ff1a1a';
                        ctx.fillRect(d.x * this.tileSize, d.y * this.tileSize, this.tileSize, this.tileSize);
                    } else {
                        ctx.fillRect(d.x * this.tileSize, d.y * this.tileSize + this.tileSize/2 - 4, this.tileSize, 8);
                    }
                } else {
                    if (isBossLocked) {
                        ctx.fillStyle = '#ff1a1a';
                        ctx.fillRect(d.x * this.tileSize, d.y * this.tileSize, this.tileSize, this.tileSize);
                    } else {
                        ctx.fillRect(d.x * this.tileSize + this.tileSize/2 - 4, d.y * this.tileSize, 8, this.tileSize);
                    }
                }
            }
            ctx.shadowBlur = 0;

            const cx = r.center.x * this.tileSize;
            const cy = r.center.y * this.tileSize;

            if (r.type === 'TREASURE') {
                ctx.fillStyle = '#fff';
                ctx.font = '12px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('TREASURE', cx, cy - 35);
            } 
            else if (r.type === 'SHOP') {
                ctx.fillStyle = '#332211';
                ctx.fillRect(cx - 50, cy - 10, 30, 20);
                ctx.fillStyle = '#ff3366'; 
                ctx.beginPath(); ctx.arc(cx - 35, cy - 10, 5, 0, Math.PI*2); ctx.fill();
                
                ctx.fillStyle = '#332211';
                ctx.fillRect(cx + 20, cy - 10, 30, 20);
                ctx.fillStyle = '#00ffff'; 
                ctx.beginPath(); ctx.arc(cx + 35, cy - 10, 5, 0, Math.PI*2); ctx.fill();

                ctx.fillStyle = '#111'; 
                ctx.beginPath();
                ctx.arc(cx, cy - 5, 16, Math.PI, 0); 
                ctx.lineTo(cx + 18, cy + 18);
                ctx.lineTo(cx - 18, cy + 18);
                ctx.fill();
                
                ctx.fillStyle = '#ffd700';
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#ffd700';
                ctx.beginPath();
                ctx.arc(cx - 5, cy - 5, 2, 0, Math.PI*2);
                ctx.arc(cx + 5, cy - 5, 2, 0, Math.PI*2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
            else if (r.type === 'BOSS_PLACEHOLDER') {
                ctx.strokeStyle = r.state === 'ACTIVE' ? '#ff1a1a' : '#550000';
                ctx.lineWidth = 4;
                ctx.shadowBlur = r.state === 'ACTIVE' ? 20 : 0;
                ctx.shadowColor = '#ff0000';
                ctx.beginPath();
                ctx.arc(cx, cy, 150, 0, Math.PI * 2);
                ctx.stroke();
                
                if (r.state === 'UNVISITED') {
                    ctx.fillStyle = '#ff0000';
                    ctx.font = 'bold 24px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText('BOSS', cx, cy);
                }
                ctx.shadowBlur = 0;
            }

            ctx.restore();
        }
    }
}