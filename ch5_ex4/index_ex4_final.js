import * as THREE from './modules/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/loaders/FBXLoader.js';

let renderer, camera, scene, controls, player, mixer, action;
let textureLoader = new THREE.TextureLoader();
let walls = [];
let boxes = [];
let goals = [];
let currentBox;
let wallMaterial, boxMaterial, goalMaterial;
let level;
let playerSize = 1;

// Audio Context und Buffer
let audioContext = new AudioContext();
let backgroundSource;
let soundBuffer;

// Texturen laden
let boxTexture = textureLoader.load('textures/crate.jpg');
let wallTexture = textureLoader.load('textures/brick2.jpg');
let goalTexture = textureLoader.load('textures/goal.jpg');

// Spielerstartposition
let playerStart = { x: 0, z: 0 };

function main() {
    loadBackgroundSound('sounds/gameMusik.mp3');
    let canvas = document.querySelector("#c");

    // Renderer initialisieren
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    // Kamera initialisieren
    camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 8, 8);
    camera.lookAt(0, 0, 0);

    // Steuerungen hinzufügen
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
    controls.maxPolarAngle = Math.PI / 2;
    controls.minPolarAngle = 0;
    controls.enablePan = false;
    controls.update();

    // Szene initialisieren
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0.3, 0.5, 0.8);

    // Spielfläche hinzufügen
    addFloor();

    // Lichter hinzufügen
    addLights();

    // Erstes Level initialisieren
    level = [
        '###########',
        '#         #',
        '#         #',
        '#  $      #',
        '#      $  #',
        '#     *   #',
        '#  $      #',
        '#*   *    #',
        '###########'
    ];
    initializeLevel(level);
}

// Spielfläche hinzufügen
function addFloor() {
    let planeSize = 20;
    let planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize);
    let planeTexture = textureLoader.load('textures/wood.jpg');
    planeTexture.wrapS = THREE.RepeatWrapping;
    planeTexture.wrapT = THREE.RepeatWrapping;
    planeTexture.magFilter = THREE.NearestFilter;
    planeTexture.minFilter = THREE.NearestFilter;
    planeTexture.repeat.set(4, 4);
    let planeMaterial = new THREE.MeshStandardMaterial({ map: planeTexture });

    let plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    scene.add(plane);
}

// Lichter zur Szene hinzufügen
function addLights() {
    let directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 2);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    let ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
}

// Level initialisieren
function initializeLevel(levelData) {
    level = levelData;

    wallMaterial = new THREE.MeshStandardMaterial({ map: wallTexture });
    boxMaterial = new THREE.MeshStandardMaterial({ map: boxTexture });
    goalMaterial = new THREE.MeshStandardMaterial({ map: goalTexture });

    createGameObjects();

    loadPlayerModel(() => {
        playerStart = findPlayerStart(level);
        if (playerStart) {
            player.position.set(playerStart.x - 3, 0.5, playerStart.z - 3);
        }
    });

    document.addEventListener('keydown', (event) => {
        let dx = 0, dz = 0;
        if (event.key === 'ArrowUp') dz = -1;
        if (event.key === 'ArrowDown') dz = 1;
        if (event.key === 'ArrowLeft') dx = -1;
        if (event.key === 'ArrowRight') dx = 1;

        movePlayer(dx, dz);
        checkLevelCompletion();
    });

    animate();
}

// Spielermodell laden
function loadPlayerModel(callback) {
    let loader = new FBXLoader();
    loader.load('3DMODELS/Pushing.fbx', (object) => {
        player = object;
        player.scale.set(0.01, 0.01, 0.01);
        player.traverse(function (child) {
            if (child.isMesh) {
                child.castShadow = true;
            }
            if (child.isBone && child.name.includes('Arm')) {
                child.rotation.set(Math.PI / 3, 0, 0);
            }
        });
        scene.add(player);

        mixer = new THREE.AnimationMixer(player);
        action = mixer.clipAction(object.animations[0]);

        if (callback) callback();
    });
}

// Spielobjekte erstellen
function createGameObjects() {
    walls = [];
    boxes = [];
    goals = [];

    level.forEach((row, z) => {
        [...row].forEach((cell, x) => {
            let posX = x - 3;
            let posZ = z - 3;

            if (cell === '#') {
                createWall(posX, posZ);
            } else if (cell === '$') {
                createBox(posX, posZ);
            } else if (cell === '*') {
                createGoal(posX, posZ);
            }
        });
    });
}

// Wand erstellen
function createWall(x, z) {
    let wall = new THREE.Mesh(new THREE.BoxGeometry(playerSize, 1.8, playerSize), wallMaterial);
    wall.position.set(x, 0.5, z);
    wall.castShadow = true;
    scene.add(wall);
    walls.push(wall);
}

// Box erstellen
function createBox(x, z) {
    let box = new THREE.Mesh(new THREE.BoxGeometry(playerSize, 1.8, playerSize), boxMaterial);
    box.position.set(x, 0.5, z);
    box.castShadow = true;
    scene.add(box);
    boxes.push(box);
}

// Ziel erstellen
function createGoal(x, z) {
    let goalGeometry = new THREE.PlaneGeometry(playerSize, playerSize);
    let goal = new THREE.Mesh(goalGeometry, goalMaterial);
    goal.position.set(x, 0.5, z);
    goal.rotation.x = -Math.PI / 2;
    goal.castShadow = true;
    scene.add(goal);
    goals.push(goal);
}

// Spieler und ggf. Boxen bewegen
function movePlayer(dx, dz) {
    let newX = player.position.x + dx;
    let newZ = player.position.z + dz;

    if (isWall(newX, newZ)) return;

    let box = getBox(newX, newZ);
    if (box) {
        let boxNewX = box.position.x + dx;
        let boxNewZ = box.position.z + dz;
        if (isWall(boxNewX, boxNewZ) || getBox(boxNewX, boxNewZ)) return;
        box.position.set(boxNewX, 0.5, boxNewZ);
        currentBox = box;

        // Sound abspielen, wenn Box bewegt wird
        playSound('sounds/push-Box.wav');

        // Spieler in die richtige Richtung drehen
        rotatePlayer(dx, dz);
    } else {
        player.position.set(newX, 0.5, newZ);

        // Spieler in die richtige Richtung drehen
        rotatePlayer(dx, dz);
    }

    if (action) {
        action.play();
    }

    if (currentBox) {
        let targetPosition = currentBox.position.clone().add(new THREE.Vector3(0, 5, 5));
        camera.position.lerp(targetPosition, 0.2);
        camera.lookAt(currentBox.position);
    }
}

// Spieler in die richtige Richtung drehen
function rotatePlayer(dx, dz) {
    if (dx === 1) {
        player.rotation.y = Math.PI / 2;
    } else if (dx === -1) {
        player.rotation.y = -Math.PI / 2;
    } else if (dz === -1) {
        player.rotation.y = Math.PI;
    } else if (dz === 1) {
        player.rotation.y = 0;
    }
}

// Überprüfen, ob Position eine Wand ist
function isWall(x, z) {
    return walls.some(wall => wall.position.x === x && wall.position.z === z);
}

// Überprüfen, ob Position eine Box ist
function getBox(x, z) {
    return boxes.find(box => box.position.x === x && box.position.z === z);
}

// Überprüfen, ob Position ein Ziel ist
function isGoal(x, z) {
    return goals.some(goal => goal.position.x === x && goal.position.z === z);
}

// Levelabschluss überprüfen
function checkLevelCompletion() {
    let allBoxesOnGoals = boxes.every(box => isGoal(box.position.x, box.position.z));
    if (allBoxesOnGoals) {
        console.log("Level completed! Moving to the next level...");
        resetLevel();

        level = [
            '###########',
            '#         #',
            '#  @      #',
            '#         #',
            '#      $  #',
            '#     *   #',
            '#  $      #',
            '#*   *    #',
            '###########'
        ];

        scene.remove(player);
        initializeLevel(level);
    }
}

// Level zurücksetzen
function resetLevel() {
    boxes.forEach(box => scene.remove(box));
    walls = [];
    boxes = [];
    goals = [];
}

// Renderergröße anpassen
function resizeRendererToDisplaySize(renderer) {
    let canvas = renderer.domElement;
    let width = canvas.clientWidth;
    let height = canvas.clientHeight;
    let needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }
    return needResize;
}

// Hintergrundsound laden und abspielen
function loadBackgroundSound(url) {
    fetch(url)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(decodedData => {
            if (!backgroundSource) {
                backgroundSource = audioContext.createBufferSource();
                backgroundSource.buffer = decodedData;
                backgroundSource.connect(audioContext.destination);
                backgroundSource.loop = true;
                backgroundSource.start(0);
            }
        })
        .catch(error => {
            console.error('Error loading background sound:', error);
        });
}

// Sound abspielen
function playSound(url) {
    fetch(url)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(decodedData => {
            let soundSource = audioContext.createBufferSource();
            soundSource.buffer = decodedData;
            soundSource.connect(audioContext.destination);
            soundSource.start(0);
        })
        .catch(error => {
            console.error('Error playing sound:', error);
        });
}

// Animationsschleife
function animate() {
    requestAnimationFrame(animate);
    resizeRendererToDisplaySize(renderer);
    if (mixer) {
        mixer.update(0.01);
    }
    renderer.render(scene, camera);
}

// Hauptprogramm starten
main();
