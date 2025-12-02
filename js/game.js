const scene = document.querySelector('.scene');
const hero = document.getElementById('hero');
const mobileButtons = document.querySelectorAll('.mobile-controls .control');
const zeusAlertText = document.querySelector('.zeus-alert__text');

const pressedKeys = new Set();
const speed = 220; // px per second

let heroX = 0;
let heroY = 0;
let lastTime = performance.now();

function initHeroPosition() {
    if (!hero) return;
    const style = window.getComputedStyle(hero);
    heroX = parseFloat(style.left) || 0;
    heroY = parseFloat(style.bottom) || 0;
    hero.style.left = `${heroX}px`;
    hero.style.bottom = `${heroY}px`;
    if (!hero.dataset.facing) {
        hero.dataset.facing = 'right';
    }
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function getDirection() {
    let dirX = 0;
    let dirY = 0;

    const leftActive = pressedKeys.has('ArrowLeft') || pressedKeys.has('a') || pressedKeys.has('left');
    const rightActive = pressedKeys.has('ArrowRight') || pressedKeys.has('d') || pressedKeys.has('right');
    const upActive = pressedKeys.has('ArrowUp') || pressedKeys.has('w') || pressedKeys.has('up');
    const downActive = pressedKeys.has('ArrowDown') || pressedKeys.has('s') || pressedKeys.has('down');

    if (leftActive) dirX -= 1;
    if (rightActive) dirX += 1;
    if (upActive) dirY += 1;
    if (downActive) dirY -= 1;

    if (dirX !== 0 && dirY !== 0) {
        const inv = 1 / Math.sqrt(2);
        dirX *= inv;
        dirY *= inv;
    }

    return { dirX, dirY };
}

function updateHero(delta) {
    if (!scene || !hero) return;
    const bounds = scene.getBoundingClientRect();
    const heroBounds = hero.getBoundingClientRect();
    const { dirX, dirY } = getDirection();

    heroX += dirX * speed * delta;
    heroY += dirY * speed * delta;

    const maxX = bounds.width - heroBounds.width - 20;
    const maxY = bounds.height - heroBounds.height - 120;

    heroX = clamp(heroX, 20, maxX);
    heroY = clamp(heroY, 10, maxY);

    hero.style.left = `${heroX}px`;
    hero.style.bottom = `${heroY}px`;

    hero.classList.toggle('is-moving', dirX !== 0 || dirY !== 0);
    if (dirX < 0) {
        hero.dataset.facing = 'left';
    } else if (dirX > 0) {
        hero.dataset.facing = 'right';
    }
}

function updateZeusAlert(delta) {
    const intensity = pressedKeys.size > 0 ? 'Atento...' : 'Observando...';
    if (zeusAlertText && zeusAlertText.textContent !== intensity) {
        zeusAlertText.textContent = intensity;
    }
}

function loop(now) {
    const delta = (now - lastTime) / 1000;
    lastTime = now;

    updateHero(delta);
    updateZeusAlert(delta);

    requestAnimationFrame(loop);
}

function handleKeyDown(event) {
    const key = event.key.toLowerCase();
    if ([ 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's' ].includes(event.key.toLowerCase())) {
        event.preventDefault();
    }
    pressedKeys.add(event.key);
    pressedKeys.add(key);
}

function handleKeyUp(event) {
    pressedKeys.delete(event.key);
    pressedKeys.delete(event.key.toLowerCase());
}

function handleTouchStart(event) {
    event.preventDefault();
    const dir = event.currentTarget.dataset.dir;
    pressedKeys.add(dir);
    event.currentTarget.classList.add('is-active');
}

function handleTouchEnd(event) {
    event.preventDefault();
    const dir = event.currentTarget.dataset.dir;
    pressedKeys.delete(dir);
    event.currentTarget.classList.remove('is-active');
}

if (scene && hero) {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    mobileButtons.forEach((btn) => {
        btn.addEventListener('pointerdown', handleTouchStart);
        btn.addEventListener('pointerup', handleTouchEnd);
        btn.addEventListener('pointerleave', handleTouchEnd);
        btn.addEventListener('pointercancel', handleTouchEnd);
    });

    window.addEventListener('resize', () => {
        initHeroPosition();
    });

    initHeroPosition();
    requestAnimationFrame(loop);
}
