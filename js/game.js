const scene = document.querySelector('.scene');
const hero = document.getElementById('hero');
const mobileButtons = document.querySelectorAll('.mobile-controls .control');
const cajaPandora = document.querySelector('.caja-pandora');
const keyIcons = document.querySelectorAll('.key-icon');
const hudDialogue = document.getElementById('hudDialogue');
const zeusIntro = document.getElementById('zeusIntro');
const zeusDialogueBubble = document.getElementById('zeusDialogueBubble');
const zeusDialogueText = document.getElementById('zeusDialogueText');
const gateTrigger = document.getElementById('gateTrigger');
const gateMessage = document.getElementById('gateMessage');
const victoryScreen = document.getElementById('victoryScreen');

const pressedKeys = new Set();
const speed = 220; // px per second
const proximityDistance = 100; // Distance to trigger question
const isHomeScene = document.body.classList.contains('page-home');
const urlParams = new URLSearchParams(window.location.search);
const hasVictoryFlag = urlParams.get('victory') === 'true';

let heroX = 0;
let heroY = 0;
let lastTime = performance.now();
let questionShown = false;
let questionTimer = null;
let timeRemaining = 10;
let gateEntered = false;
let typingIntervalId = null;
let lives = Number(localStorage.getItem('gameVives')) || 3;
let keysCollected = 0;
let zeusX = 0;
let zeusY = 0;
let zeusSpeed = 80; // px per second (slower than hero)
const zeusElement = document.querySelector('.zeus-image');
let keysEarned = {
    'scene-escenario1': false,
    'scene-escenario2': false,
    'scene-escenario3': false,
    'scene-escenario4': false,
    'scene-escenario5': false
};

// Define questions for each scenario
const scenarioQuestions = {
    'scene-escenario1': {
        question: '¿Qué significa la palabra Cardio?',
        options: ['Corazón', 'Amor', 'Tiempo'],
        correct: 0
    },
    'scene-escenario2': {
        question: '¿Qué significa la palabra Crono?',
        options: ['Cine', 'Vista', 'Tiempo'],
        correct: 2
    },
    'scene-escenario3': {
        question: '¿Qué significa la palabra Kilo?',
        options: ['Mil', 'Sonido', 'Tierra'],
        correct: 0
    },
    'scene-escenario4': {
        question: '¿Qué significa la palabra Polis?',
        options: ['Dolor', 'Ciudad', 'Pie'],
        correct: 1
    },
    'scene-escenario5': {
        question: '¿Qué significa la palabra Bio?',
        options: ['Animal', 'Bacteria', 'Vida'],
        correct: 2
    }
};

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

function initZeusPosition() {
    if (!zeusElement) return;
    const style = window.getComputedStyle(zeusElement);
    zeusX = parseFloat(style.right) || 0;
    zeusY = parseFloat(style.top) || 0;
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

function getDistance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

function setDialogue(message) {
    if (hudDialogue) {
        hudDialogue.textContent = message;
    }
}

function setZeusSpeakingState(isSpeaking) {
    if (zeusIntro) {
        zeusIntro.classList.toggle('is-speaking', isSpeaking);
    }
    if (zeusDialogueBubble) {
        zeusDialogueBubble.classList.toggle('is-visible', isSpeaking);
    }
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function typeText(element, text, speed = 45) {
    if (!element) return Promise.resolve();
    if (typingIntervalId) {
        clearInterval(typingIntervalId);
        typingIntervalId = null;
    }

    element.textContent = '';

    return new Promise((resolve) => {
        let index = 0;
        typingIntervalId = setInterval(() => {
            element.textContent += text.charAt(index);
            index += 1;

            if (index >= text.length) {
                clearInterval(typingIntervalId);
                typingIntervalId = null;
                resolve();
            }
        }, speed);
    });
}

async function playZeusIntro() {
    if (!isHomeScene || !zeusIntro || !zeusDialogueText || !zeusDialogueBubble) return;

    const lines = [
        'Bienvenida al Olimpo, estás en mi territorio ahora.',
        'Solo encontrando las 5 llaves en cada cofre de cada mundo dentro del Olimpo podrás escapar de aquí.'
    ];

    zeusIntro.classList.remove('is-hidden');
    zeusDialogueBubble.classList.remove('is-hidden');

    await delay(3500);

    zeusIntro.classList.add('is-visible');
    setZeusSpeakingState(true);

    setZeusSpeakingState(true);
    await typeText(zeusDialogueText, lines[0]);
    setDialogue(lines[0]);

    await delay(6000);

    await typeText(zeusDialogueText, lines[1]);
    setDialogue(lines[1]);

    await delay(6000);

    setZeusSpeakingState(false);
    zeusIntro.classList.remove('is-visible');
    zeusDialogueBubble.classList.remove('is-visible');
    await delay(2400);
    zeusIntro.classList.add('is-hidden');
    zeusDialogueBubble.classList.add('is-hidden');
}

function rectanglesOverlap(rectA, rectB) {
    return (
        rectA.left < rectB.right &&
        rectA.right > rectB.left &&
        rectA.top < rectB.bottom &&
        rectA.bottom > rectB.top
    );
}

function checkGateEntry() {
    if (!isHomeScene || hasVictoryFlag || !gateTrigger || gateEntered || !hero) return;

    const heroBounds = hero.getBoundingClientRect();
    const gateBounds = gateTrigger.getBoundingClientRect();

    if (rectanglesOverlap(heroBounds, gateBounds)) {
        gateEntered = true;
        gateTrigger.classList.add('is-active');
        if (gateMessage) {
            gateMessage.textContent = 'Atravesando la puerta...';
        }
        setDialogue('Demuestra tu valor en el primer mundo.');

        setTimeout(() => {
            window.location.href = 'escenario1.html';
        }, 1000);
    }
}

function initVictoryState() {
    if (!hasVictoryFlag) return;

    if (hero) {
        hero.style.display = 'none';
    }
    if (victoryScreen) {
        victoryScreen.style.display = 'flex';
    }
    keyIcons.forEach((icon) => icon.classList.add('is-active'));
    keysCollected = keyIcons.length;
    setDialogue('¡Has escapado del Olimpo!');
}

function showQuestion() {
    if (questionShown || !scene) return;
    
    const sceneClass = Array.from(scene.classList).find(cls => cls.startsWith('scene-'));
    const questionData = scenarioQuestions[sceneClass];
    
    if (!questionData) return;
    
    questionShown = true;
    timeRemaining = 10;
    
    const template = document.getElementById('prompt-template');
    if (!template) return;
    
    const promptElement = template.content.cloneNode(true);
    const promptTitle = promptElement.querySelector('h2');
    const promptText = promptElement.querySelector('.prompt__text');
    const promptChoices = promptElement.querySelector('.prompt__choices');
    const promptTimer = promptElement.querySelector('.prompt__timer');
    
    promptTitle.textContent = 'Pregunta de raíces griegas';
    promptText.textContent = `"${questionData.question}"`;
    promptTimer.textContent = `${timeRemaining}s`;
    
    // Clear existing options
    promptChoices.innerHTML = '';
    
    // Add new options
    questionData.options.forEach((option, index) => {
        const li = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = option;
        button.dataset.index = index;
        li.appendChild(button);
        promptChoices.appendChild(li);
    });
    
    const prompt = promptElement.querySelector('.prompt');
    prompt.classList.add('is-active');
    
    document.body.appendChild(promptElement);
    
    // Add click handlers to buttons after they're in the DOM
    const buttons = document.querySelectorAll('.prompt.is-active .prompt__choices button');
    buttons.forEach((button, index) => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            handleAnswer(index, questionData.correct);
        });
    });
    
    // Start countdown timer
    startQuestionTimer(questionData);
}

function startQuestionTimer(questionData) {
    if (questionTimer) clearInterval(questionTimer);
    
    questionTimer = setInterval(() => {
        timeRemaining--;
        const promptElement = document.querySelector('.prompt.is-active');
        const timerDisplay = promptElement?.querySelector('.prompt__timer');
        if (timerDisplay) {
            timerDisplay.textContent = `${timeRemaining}s`;
        }
        
        if (timeRemaining <= 0) {
            clearInterval(questionTimer);
            questionTimer = null;
            // Time's up, repeat the question
            const prompt = document.querySelector('.prompt.is-active');
            if (prompt) prompt.remove();
            questionShown = false;
            // Wait a moment before showing the question again
            setTimeout(() => {
                showQuestion();
            }, 500);
        }
    }, 1000);
}

function handleAnswer(selectedIndex, correctIndex) {
    // Clear the timer
    if (questionTimer) {
        clearInterval(questionTimer);
        questionTimer = null;
    }
    
    const promptElement = document.querySelector('.prompt.is-active');
    if (!promptElement) return;
    
    const buttons = promptElement.querySelectorAll('.prompt__choices button');
    
    if (selectedIndex === correctIndex) {
        // Correct answer - show correct and award key
        buttons[selectedIndex].classList.add('correct');
        awardKey();
        
        setTimeout(() => {
            promptElement.remove();
            questionShown = false;
        }, 1500);
    } else {
        // Incorrect answer - lose a life
        buttons[selectedIndex].classList.add('incorrect');
        lives--;
        updateLivesDisplay();
        
        setTimeout(() => {
            promptElement.remove();
            questionShown = false;
            
            if (lives <= 0) {
                // Game Over - return to index.html
                gameOver();
            } else {
                // Navigate to previous scenario
                navigateToPreviousScenario();
            }
        }, 1500);
    }
}

function updateLivesDisplay() {
    // The lives display is now handled by updateZeusAlert in the main loop
    // Save lives to localStorage
    localStorage.setItem('gameVives', lives);
    console.log(`Vida perdida. Vidas restantes: ${lives}`);
}

function gameOver() {
    // Reset lives for next attempt
    lives = 3;
    localStorage.setItem('gameVives', 3);
    console.log('¡Game Over! Regresando a index.html');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 500);
}

function navigateToPreviousScenario() {
    const sceneClass = Array.from(scene.classList).find(cls => cls.startsWith('scene-'));
    console.log('Current scene class:', sceneClass);
    
    // Use setTimeout to allow the UI to update
    setTimeout(() => {
        switch(sceneClass) {
            case 'scene-escenario1':
                console.log('Navigating from escenario1 to index.html');
                window.location.href = 'index.html';
                break;
            case 'scene-escenario2':
                console.log('Navigating from escenario2 to escenario1');
                window.location.href = 'escenario1.html';
                break;
            case 'scene-escenario3':
                console.log('Navigating from escenario3 to escenario2');
                window.location.href = 'escenario2.html';
                break;
            case 'scene-escenario4':
                console.log('Navigating from escenario4 to escenario3');
                window.location.href = 'escenario3.html';
                break;
            case 'scene-escenario5':
                console.log('Navigating from escenario5 to escenario4');
                window.location.href = 'escenario4.html';
                break;
            default:
                console.log('Scene class not recognized:', sceneClass);
        }
    }, 500);
}

function awardKey() {
    const sceneClass = Array.from(scene.classList).find(cls => cls.startsWith('scene-'));
    
    // Check if already earned in this scenario
    if (keysEarned[sceneClass]) {
        return;
    }
    
    // Mark as earned in this scenario
    keysEarned[sceneClass] = true;
    keysCollected++;
    
    const nextIcon = keyIcons[keysCollected - 1];
    if (nextIcon) {
        nextIcon.classList.add('is-active');
    }
    
    console.log(`¡Llave obtenida! Total: ${keysCollected}/5`);
    
    // Navigate to next scenario
    navigateToNextScenario(sceneClass);
}

function navigateToNextScenario(currentScene) {
    // Use setTimeout to allow the UI to update and question to close
    setTimeout(() => {
        switch(currentScene) {
            case 'scene-escenario1':
                window.location.href = 'escenario2.html';
                break;
            case 'scene-escenario2':
                window.location.href = 'escenario3.html';
                break;
            case 'scene-escenario3':
                window.location.href = 'escenario4.html';
                break;
            case 'scene-escenario4':
                window.location.href = 'escenario5.html';
                break;
            case 'scene-escenario5':
                // All keys collected, go to victory screen
                window.location.href = 'index.html?victory=true';
                break;
        }
    }, 2000);
}

function checkProximityToCaja() {
    if (!cajaPandora || !hero || questionShown) return;
    
    const heroBounds = hero.getBoundingClientRect();
    const cajaBounds = cajaPandora.getBoundingClientRect();
    
    const heroCenter = {
        x: heroBounds.left + heroBounds.width / 2,
        y: heroBounds.top + heroBounds.height / 2
    };
    
    const cajaCenter = {
        x: cajaBounds.left + cajaBounds.width / 2,
        y: cajaBounds.top + cajaBounds.height / 2
    };
    
    const distance = getDistance(heroCenter.x, heroCenter.y, cajaCenter.x, cajaCenter.y);
    
    if (distance < proximityDistance) {
        showQuestion();
    }
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
    
    checkProximityToCaja();
    updateZeus(delta);
    checkZeusCollision();
}

function updateZeus(delta) {
    if (!zeusElement || !hero || !scene || questionShown) return;
    
    const bounds = scene.getBoundingClientRect();
    const heroBounds = hero.getBoundingClientRect();
    const zeusBounds = zeusElement.getBoundingClientRect();
    
    // Calculate direction from Zeus to Hero
    const heroCenterX = heroBounds.left + heroBounds.width / 2;
    const herosCenterY = heroBounds.top + heroBounds.height / 2;
    const zeusCenterX = zeusBounds.left + zeusBounds.width / 2;
    const zeusCenterY = zeusBounds.top + zeusBounds.height / 2;
    
    const dx = heroCenterX - zeusCenterX;
    const dy = herosCenterY - zeusCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
        const dirX = dx / distance;
        const dirY = dy / distance;
        
        // Update Zeus position
        zeusX += dirX * zeusSpeed * delta;
        zeusY += dirY * zeusSpeed * delta;
        
        // Apply bounds
        zeusX = clamp(zeusX, 0, bounds.width - zeusBounds.width);
        zeusY = clamp(zeusY, 0, bounds.height - zeusBounds.height);
        
        // Determine which position property to use based on current scenario
        const sceneClass = Array.from(scene.classList).find(cls => cls.startsWith('scene-'));
        if (sceneClass === 'scene-escenario1') {
            // Escenario 1: Zeus on right
            zeusElement.style.right = `${zeusX}px`;
            zeusElement.style.left = 'auto';
        } else {
            // Escenarios 2-5: Zeus on left
            zeusElement.style.left = `${zeusX}px`;
            zeusElement.style.right = 'auto';
        }
        zeusElement.style.top = `${zeusY}px`;
    }
}

function checkZeusCollision() {
    if (!zeusElement || !hero || questionShown) return;
    
    const heroBounds = hero.getBoundingClientRect();
    const zeusBounds = zeusElement.getBoundingClientRect();
    
    // Simple AABB collision
    if (rectanglesOverlap(heroBounds, zeusBounds)) {
        // Game Over - caught by Zeus
        console.log('¡Zeus te atrapó! Regresando a index.html');
        lives = 3;
        localStorage.setItem('gameVives', 3);
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
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
    checkGateEntry();

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
    // Initialize lives display
    updateLivesDisplay();
    
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
        initZeusPosition();
    });

    initHeroPosition();
    initZeusPosition();
    if (hasVictoryFlag) {
        initVictoryState();
    } else if (isHomeScene) {
        playZeusIntro();
    }
    requestAnimationFrame(loop);
}
