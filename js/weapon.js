export const WEAPON_TYPES = {
    MELEE: 'MELEE',
    RANGED: 'RANGED',
    AREA: 'AREA'
};

export const WEAPONS = [
    {
        id: 'IRON_BLADE',
        name: 'IRON BLADE',
        type: WEAPON_TYPES.MELEE,
        baseDamage: 25,
        damage: 25,
        cooldown: 0.35,
        range: 60,
        color: '#00ffff',
        level: 1,
        maxLevel: 5
    },
    {
        id: 'ARCANE_BOLT',
        name: 'ARCANE BOLT',
        type: WEAPON_TYPES.RANGED,
        baseDamage: 15,
        damage: 15,
        cooldown: 0.50,
        range: 400,
        projectileSpeed: 500,
        color: '#ff00ff',
        level: 1,
        maxLevel: 5
    },
    {
        id: 'FROST_NOVA',
        name: 'FROST NOVA',
        type: WEAPON_TYPES.AREA,
        baseDamage: 20,
        damage: 20,
        cooldown: 0.90,
        range: 120,
        color: '#0088ff',
        level: 1,
        maxLevel: 5
    },
    {
        id: 'BLOOD_SCYTHE',
        name: 'BLOOD SCYTHE',
        type: 'MELEE',
        baseDamage: 35,
        damage: 35,
        cooldown: 0.55,
        range: 75,
        color: '#8b0000',
        level: 1,
        maxLevel: 5
    }

];