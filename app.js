import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

const i18n = {
    en: {
        dropText: "Drop 3D model or click", loading: "LOADING...",
        wireframe: "Wireframe", textures: "Textures", light: "Light Pos", delete: "Delete Object",
        resetCam: "Reset View", keymapTitle: "Keymap & Navigation", aboutTitle: "About ThreeD",
        aboutText: "ThreeD is a minimalist, ultra-lightweight web application designed for fast and reliable 3D model viewing. Built purely on open-source web technologies and Three.js, it operates entirely client-side without heavy bundlers or unnecessary frameworks. Drop your assets and inspect them instantly.",
        ctrlSelect: "Select Object", ctrlRotate: "Rotate View", 
        ctrlPan: "Pan View", ctrlContext: "Context Menu", ctrlZoomWheel: "Zoom In/Out", 
        ctrlDelete: "Delete Active", close: "Close",
        statFormat: "Format:", statSize: "Size:", statVerts: "Vertices:", statFaces: "Faces:", statTexture: "Textures:", statYes: "Yes", statNo: "No"
    },
    pl: {
        dropText: "Upuść model 3D lub kliknij", loading: "WCZYTYWANIE...",
        wireframe: "Siatka", textures: "Tekstury", light: "Poz. Światła", delete: "Usuń Obiekt",
        resetCam: "Reset Widoku", keymapTitle: "Skróty i Nawigacja", aboutTitle: "O programie ThreeD",
        aboutText: "ThreeD to minimalistyczna, ultralekka aplikacja webowa do szybkiego przeglądania modeli 3D. Zbudowana wyłącznie w oparciu o technologie open-source i Three.js, działa w 100% po stronie przeglądarki, bez zbędnych frameworków. Przeciągnij plik i pracuj natychmiast.",
        ctrlSelect: "Zaznacz obiekt", ctrlRotate: "Obrót widoku", 
        ctrlPan: "Przesunięcie (Pan)", ctrlContext: "Menu Obiektu", ctrlZoomWheel: "Przybliżenie (Scroll)", 
        ctrlDelete: "Usuń zaznaczony", close: "Zamknij",
        statFormat: "Format:", statSize: "Rozmiar pliku:", statVerts: "Wierzchołki:", statFaces: "Trójkąty:", statTexture: "Tekstury:", statYes: "Tak", statNo: "Nie"
    },
    de: {
        dropText: "3D-Modell ablegen oder klicken", loading: "WIRD GELADEN...",
        wireframe: "Drahtmodell", textures: "Texturen", light: "Lichtpos.", delete: "Objekt löschen",
        resetCam: "Ansicht Reset", keymapTitle: "Navigation & Tasten", aboutTitle: "Über ThreeD",
        aboutText: "ThreeD ist eine minimalistische, ultraleichte Webanwendung für die schnelle und zuverlässige Anzeige von 3D-Modellen. Basierend auf Open-Source-Technologien und Three.js funktioniert sie vollständig clientseitig ohne Frameworks.",
        ctrlSelect: "Objekt auswählen", ctrlRotate: "Ansicht drehen", 
        ctrlPan: "Ansicht verschieben", ctrlContext: "Kontextmenü", ctrlZoomWheel: "Zoom (Mausrad)", 
        ctrlDelete: "Auswahl löschen", close: "Schließen",
        statFormat: "Format:", statSize: "Größe:", statVerts: "Ecken:", statFaces: "Flächen:", statTexture: "Texturen:", statYes: "Ja", statNo: "Nein"
    }
};

class ViewerApp {
    constructor() {
        this.lang = 'en';
        this.model = null;
        this.fileInfo = { size: 0, ext: '' };
        this.bboxHelper = null; 
        this.isSelected = false;
        
        this.prefs = { wireframe: false, textures: true };
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.interaction = { rmbStartX: 0, rmbStartY: 0 };
        
        this.initEngine();
        this.initLights();
        this.bindEvents();
        this.startLoop();
    }

    initEngine() {
        const container = document.getElementById('canvas-container');
        this.scene = new THREE.Scene();
        
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 3, 6);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace; 
        container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.mouseButtons = { LEFT: THREE.MOUSE.NONE, MIDDLE: THREE.MOUSE.ROTATE, RIGHT: THREE.MOUSE.PAN };
        this.controls.screenSpacePanning = true;

        this.gridHelper = new THREE.GridHelper(12, 24, 0x999999, 0x555555);
        this.gridHelper.material.opacity = 0.7;
        this.gridHelper.material.transparent = true;
        this.scene.add(this.gridHelper);
    }

    initLights() {
        this.ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        this.scene.add(this.ambientLight);
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 2);
        this.updateLightPosition(180);
        this.scene.add(this.directionalLight);
    }

    updateLightPosition(degrees) {
        const rad = (degrees - 180) * (Math.PI / 180);
        this.directionalLight.position.set(Math.sin(rad) * 8, 5, Math.cos(rad) * 8);
    }

    bindEvents() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        document.getElementById('theme-toggle').addEventListener('click', () => {
            const isDark = document.body.getAttribute('data-theme') === 'dark';
            document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
            this.gridHelper.material.color.setHex(isDark ? 0xcccccc : 0x999999);
        });

        // Language Dropdown
        const langCurrent = document.getElementById('lang-current');
        const langOptions = document.getElementById('lang-options');
        langCurrent.addEventListener('click', (e) => { e.stopPropagation(); langOptions.classList.toggle('hidden'); });
        langOptions.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const lang = e.target.getAttribute('data-value');
                this.setLanguage(lang);
                langCurrent.textContent = lang.toUpperCase();
                langOptions.classList.add('hidden');
                langOptions.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        window.addEventListener('click', () => langOptions.classList.add('hidden'));

        // Modals
        const setupModal = (btnId, modalId, closeId) => {
            const modal = document.getElementById(modalId);
            document.getElementById(btnId).addEventListener('click', () => modal.classList.remove('hidden'));
            document.getElementById(closeId).addEventListener('click', () => modal.classList.add('hidden'));
            modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
        };
        setupModal('about-btn', 'about-modal', 'close-about');
        setupModal('keymap-btn', 'keymap-modal', 'close-keymap');

        this.setupFileDrop();
        this.setupTools();
        this.setupInteractions();
    }

    setupFileDrop() {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');

        document.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
        document.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); });
        document.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) this.loadFile(e.dataTransfer.files[0]);
        });

        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) this.loadFile(e.target.files[0]);
        });
    }

    setupTools() {
        document.getElementById('wireframe-toggle').addEventListener('click', (e) => {
            this.prefs.wireframe = !this.prefs.wireframe;
            e.target.classList.toggle('active', this.prefs.wireframe);
            this.refreshMaterials();
        });

        document.getElementById('texture-toggle').addEventListener('click', (e) => {
            this.prefs.textures = !this.prefs.textures;
            e.target.classList.toggle('active', this.prefs.textures);
            this.refreshMaterials();
        });

        document.getElementById('reset-cam-btn').addEventListener('click', () => {
            this.camera.position.set(0, 3, 6);
            this.controls.target.set(0, 0, 0);
            this.controls.update();
        });

        document.getElementById('light-slider').addEventListener('input', (e) => {
            this.updateLightPosition(e.target.value);
        });
    }

    setupInteractions() {
        window.addEventListener('mousedown', (e) => {
            if (e.button === 2) {
                this.interaction.rmbStartX = e.clientX;
                this.interaction.rmbStartY = e.clientY;
            }
        });

        window.addEventListener('click', (e) => {
            if (e.target.closest('#ui-container') || e.target.closest('#context-menu') || e.target.closest('.modal-content') || e.target.closest('#right-actions')) return;
            this.closeContextMenu();
            this.castRay(e.clientX, e.clientY);
        });

        window.addEventListener('keydown', (e) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && this.isSelected) this.removeModel();
        });

        const ctxMenu = document.getElementById('context-menu');
        window.addEventListener('contextmenu', (e) => {
            if (e.target.closest('#ui-container') || e.target.closest('.modal-content') || e.target.closest('#right-actions')) return; 
            e.preventDefault();

            const movedX = Math.abs(e.clientX - this.interaction.rmbStartX);
            const movedY = Math.abs(e.clientY - this.interaction.rmbStartY);
            if (movedX > 5 || movedY > 5) {
                this.closeContextMenu();
                return;
            }

            if (this.castRay(e.clientX, e.clientY)) {
                let x = e.clientX, y = e.clientY;
                if (x + 160 > window.innerWidth) x -= 160;
                if (y + 100 > window.innerHeight) y -= 100;
                ctxMenu.style.top = `${y}px`;
                ctxMenu.style.left = `${x}px`;
                ctxMenu.style.display = 'block';
            } else {
                this.closeContextMenu();
            }
        });

        document.getElementById('ctx-delete').addEventListener('click', () => {
            this.removeModel();
            this.closeContextMenu();
        });
    }

    castRay(x, y) {
        this.mouse.x = (x / window.innerWidth) * 2 - 1;
        this.mouse.y = -(y / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);

        if (this.model) {
            const hits = this.raycaster.intersectObject(this.model, true);
            if (hits.length > 0) {
                this.selectObject();
                return true;
            }
        }
        this.deselectObject();
        return false;
    }

    formatSize(bytes) {
        if (!+bytes) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${['B', 'KB', 'MB', 'GB'][i]}`;
    }

    updateStats() {
        let verts = 0, faces = 0, hasTex = false;

        this.model.traverse((child) => {
            if (child.isMesh && child.geometry) {
                if (child.geometry.attributes.position) verts += child.geometry.attributes.position.count;
                if (child.geometry.index) faces += child.geometry.index.count / 3;
                else if (child.geometry.attributes.position) faces += child.geometry.attributes.position.count / 3;
                
                if (child.material) {
                    const check = m => { if (m.map || m.normalMap || m.roughnessMap) hasTex = true; };
                    Array.isArray(child.material) ? child.material.forEach(check) : check(child.material);
                }
            }
        });

        document.getElementById('stat-format').textContent = this.fileInfo.ext;
        document.getElementById('stat-size').textContent = this.formatSize(this.fileInfo.size);
        document.getElementById('stat-verts').textContent = verts.toLocaleString();
        document.getElementById('stat-faces').textContent = Math.round(faces).toLocaleString();
        
        const texKey = hasTex ? 'statYes' : 'statNo';
        document.getElementById('stat-texture').textContent = i18n[this.lang][texKey];
        document.getElementById('stat-texture').setAttribute('data-i18n', texKey);
        document.getElementById('stats-panel').classList.remove('hidden');
    }

    selectObject() {
        if (!this.model || this.isSelected) return;
        this.isSelected = true;
        const color = document.body.getAttribute('data-theme') === 'dark' ? 0xff9f0a : 0x007aff;
        this.bboxHelper = new THREE.BoxHelper(this.model, color);
        this.scene.add(this.bboxHelper);
    }

    deselectObject() {
        this.isSelected = false;
        if (this.bboxHelper) {
            this.scene.remove(this.bboxHelper);
            this.bboxHelper = null;
        }
    }

    removeModel() {
        if (this.model) {
            this.deselectObject();
            this.scene.remove(this.model);
            this.model = null;
            document.getElementById('stats-panel').classList.add('hidden');
            this.setLanguage(this.lang); 
        }
    }

    closeContextMenu() {
        document.getElementById('context-menu').style.display = 'none';
    }

    setLanguage(lang) {
        this.lang = lang;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (i18n[lang][key]) el.textContent = i18n[lang][key];
        });
    }

    onLoadProgress = (xhr) => {
        const span = document.querySelector('#drop-zone span');
        if (xhr.lengthComputable) {
            span.textContent = `${i18n[this.lang].loading} ${Math.round((xhr.loaded / xhr.total) * 100)}%`;
        } else {
            span.textContent = i18n[this.lang].loading;
        }
    }

    loadFile(file) {
        const url = URL.createObjectURL(file);
        const ext = file.name.split('.').pop().toLowerCase();
        
        this.fileInfo = { size: file.size, ext: ext.toUpperCase() };
        this.removeModel();
        document.querySelector('#drop-zone span').textContent = `${i18n[this.lang].loading} 0%`;

        const loaders = {
            'glb': () => new GLTFLoader().load(url, res => this.attachModel(res.scene), this.onLoadProgress, this.onLoadError),
            'gltf': () => new GLTFLoader().load(url, res => this.attachModel(res.scene), this.onLoadProgress, this.onLoadError),
            'obj': () => new OBJLoader().load(url, res => this.attachModel(res), this.onLoadProgress, this.onLoadError),
            'fbx': () => new FBXLoader().load(url, res => this.attachModel(res), this.onLoadProgress, this.onLoadError),
            'stl': () => new STLLoader().load(url, geo => {
                const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x999999 }));
                mesh.rotation.x = -Math.PI / 2;
                this.attachModel(mesh);
            }, this.onLoadProgress, this.onLoadError)
        };

        if (loaders[ext]) loaders[ext]();
        else {
            alert('Unsupported format.');
            this.setLanguage(this.lang);
        }
    }

    attachModel(object) {
        this.model = object;
        
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const scale = 3.5 / Math.max(size.x, size.y, size.z);
        
        object.scale.setScalar(scale);
        object.position.set(-center.x * scale, -center.y * scale + (size.y * scale) / 2, -center.z * scale);

        object.traverse((child) => {
            if (child.isMesh) child.userData.origMat = child.material.clone();
        });

        this.scene.add(object);
        this.refreshMaterials();
        this.updateStats();
        this.setLanguage(this.lang);
    }

    refreshMaterials() {
        if (!this.model) return;
        this.model.traverse((child) => {
            if (child.isMesh) {
                child.material.wireframe = this.prefs.wireframe;
                if (!this.prefs.textures) {
                    child.material = new THREE.MeshStandardMaterial({ color: 0x666666, wireframe: this.prefs.wireframe });
                } else if (child.userData.origMat) {
                    const mat = child.userData.origMat.clone();
                    mat.wireframe = this.prefs.wireframe;
                    child.material = mat;
                }
            }
        });
    }

    onLoadError = (err) => {
        console.error('ThreeD Load Error:', err);
        this.setLanguage(this.lang);
    }

    startLoop() {
        requestAnimationFrame(this.startLoop.bind(this));
        this.controls.update();
        if (this.bboxHelper && this.isSelected) this.bboxHelper.update();
        this.renderer.render(this.scene, this.camera);
    }
}

document.addEventListener('DOMContentLoaded', () => new ViewerApp());