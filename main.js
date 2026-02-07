import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import TWEEN from '@tweenjs/tween.js';

// --- KONSTANTA FISIKA ---
const R_EARTH_KM = 6371; 
const GM = 398600; 
const MOON_DIST_KM = 384400;
const MOON_RADIUS_KM = 1737;
const toUnits = (km) => km / R_EARTH_KM;

// --- SETUP SCENE ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x00050a);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(15, 12, 15);

const renderer = new THREE.WebGLRenderer({ antialias: true });
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// State Fokus
let focusedObject = null; // 'satellite', 'moon', atau null (Bumi)

// --- OBJEK ---
const earthGeo = new THREE.SphereGeometry(toUnits(R_EARTH_KM), 64, 64);
const earthMat = new THREE.MeshPhongMaterial({ color: 0x2233ff, emissive: 0x000011, shininess: 15 });
const earth = new THREE.Mesh(earthGeo, earthMat);
scene.add(earth);

const moonGeo = new THREE.SphereGeometry(toUnits(MOON_RADIUS_KM), 32, 32);
const moonMat = new THREE.MeshPhongMaterial({ color: 0xaaaaaa });
const moon = new THREE.Mesh(moonGeo, moonMat);
moon.position.set(toUnits(MOON_DIST_KM), 0, 0);
scene.add(moon);

const satellite = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffff00 })
);
scene.add(satellite);

// Lighting
const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
sunLight.position.set(100, 50, 100);
scene.add(sunLight, new THREE.AmbientLight(0x404040, 0.8));

// --- FUNGSI FOKUS ---
function setFocus(target) {
    focusedObject = target;
    let targetPos = new THREE.Vector3(0, 0, 0);

    if (target === 'satellite') targetPos.copy(satellite.position);
    else if (target === 'moon') targetPos.copy(moon.position);

    // Animasi transisi target kamera
    new TWEEN.Tween(controls.target)
        .to({ x: targetPos.x, y: targetPos.y, z: targetPos.z }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
}

// --- LOGIKA ORBITAL ---
let satState = { altitude: 35786, angle: 0, omega: 0 };

function updateTelemetry(altitude) {
    const r = R_EARTH_KM + altitude;
    const v = Math.sqrt(GM / r);
    satState.omega = v / r;
    
    $('#data-velocity').text(v.toFixed(3));
    $('#data-period').text(((2 * Math.PI * Math.sqrt(Math.pow(r, 3) / GM)) / 60).toFixed(1));
    
    let zone = "Deep Space";
    if (altitude < 100) zone = "Sub-Orbital";
    else if (altitude <= 2000) zone = "LEO";
    else if (altitude < 35786) zone = "MEO";
    else if (altitude <= 35900) zone = "GEO";
    $('#data-zone').text(zone);
}

// --- EVENT LISTENERS ---
$(document).ready(function() {
    const $container = $('#simulation-container');
    renderer.setSize($container.width(), $container.height());
    $container.append(renderer.domElement);

    updateTelemetry(satState.altitude);

    $('#btn-update').click(() => {
        satState.altitude = parseFloat($('#altitude-input').val()) || 0;
        updateTelemetry(satState.altitude);
    });

    // Kontrol Fokus
    $('#focus-earth').click(() => setFocus(null));
    $('#focus-sat').click(() => setFocus('satellite'));
    $('#focus-moon').click(() => setFocus('moon'));

    // Preset Views
    $('#btn-view-top').click(() => {
        setFocus(null);
        camera.position.set(0, 100, 0);
    });
    $('#btn-view-iso').click(() => {
        camera.position.set(15, 12, 15);
    });

    $('#time-scale').on('input', function() {
        $('#time-val').text($(this).val() + 'x');
    });
});

// --- RENDER LOOP ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const tScale = parseFloat($('#time-scale').val()) || 1;
    TWEEN.update();

    // Gerakan Satelit
    satState.angle += satState.omega * delta * tScale;
    const rUnits = toUnits(R_EARTH_KM + satState.altitude);
    satellite.position.set(Math.cos(satState.angle) * rUnits, 0, Math.sin(satState.angle) * rUnits);

    // Tracking Fokus Otomatis
    if (focusedObject === 'satellite') {
        controls.target.copy(satellite.position);
    } else if (focusedObject === 'moon') {
        controls.target.copy(moon.position);
    }

    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
