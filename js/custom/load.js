import * as THREE from 'three';
		import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
		import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
		import { DragControls } from 'three/addons/controls/DragControls.js';


		let camera, scene, renderer, stats;
		let object;
		const loadedModels = [];  // this is for models to clip
		let clock;
		init();


		function init() {
            // Create and configure the renderer
renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Optionally, you can set the background color and other properties
renderer.setClearColor(0x000000); // Set background color to black

// Call the render function initially
render();

			camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 20);
			camera.position.z = 2.5;

			// scene
			scene = new THREE.Scene();
			const ambientLight = new THREE.AmbientLight(0xffffff);
			scene.add(ambientLight);

			const pointLight = new THREE.PointLight(0xffffff, 15);
			camera.add(pointLight);
			scene.add(camera);

			// orbit controls:
			const objectGroup = new THREE.Object3D();
			scene.add(objectGroup);

			const raycaster = new THREE.Raycaster();
			const mouse = new THREE.Vector2();
			let selectedObject = null;

			function onMouseDown(event) {
				// Calculate mouse position in normalized device coordinates
				mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
				mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

				// Raycast to check for intersections
				raycaster.setFromCamera(mouse, camera);
				const intersects = raycaster.intersectObjects(scene.children, true);

				if (intersects.length > 0) {
					// Select the first object that was clicked on
					selectedObject = intersects[0].object;
				} else {
					// If no object was clicked, clear the selection
					selectedObject = null;
				}
			}

			function onMouseMove(event) {
				if (selectedObject) {
					// Rotate the selected object when the mouse moves
					const rotationSpeed = 0.01;
					selectedObject.rotation.x += rotationSpeed;
					selectedObject.rotation.y += rotationSpeed;
				}
			}

			function onMouseUp() {
				// Clear the selection when the mouse is released
				selectedObject = null;
			}

			// Add event listeners for mouse interactions
			window.addEventListener('mousedown', onMouseDown);
			window.addEventListener('mousemove', onMouseMove);
			window.addEventListener('mouseup', onMouseUp);

			// manager
			function loadModel() {
				object.traverse(function (child) {
					if (child.isMesh) child.material.map = texture;
				});
				object.position.y = - 0.95;
				object.scale.setScalar(0.09);
				scene.add(object);
				render();
			}

			const manager = new THREE.LoadingManager(loadModel);

			// texture
			const textureLoader = new THREE.TextureLoader(manager);
			const texture = textureLoader.load('textures/uv_grid_opengl.jpg', render);
			texture.colorSpace = THREE.SRGBColorSpace;

			// function to load OBJ model
			function loadOBJModel(fileInputId) {
				const fileInput = document.getElementById(fileInputId);
				const file = fileInput.files[0];

				if (file) {
					const loader = new OBJLoader(manager);
					loader.load(URL.createObjectURL(file), function (obj) {
						obj.position.y = -0.95;
						obj.scale.setScalar(0.1);
						objectGroup.add(obj);

					 // Add the loaded model to the array
					 loadedModels.push(obj);
					 console.log(loadedModels)

					 // Add the newly loaded model to the scene
					 scene.add(objectGroup);
					 const dragControls = new DragControls([obj], camera, renderer.domElement);
					 dragControls.addEventListener('drag', render);
				 }, onProgress, onError);
				}
			}

			document.getElementById('model1').addEventListener('change', () => {
				loadOBJModel('model1');
				console.log(" uploaded model 1")
			});

			document.getElementById('model2').addEventListener('change', () => {
				loadOBJModel('model2');
				console.log(" uploaded model 2")
			});
        }

		function onWindowResize() {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
		}

		function onProgress(xhr) {
			if (xhr.lengthComputable) {
				const percentComplete = xhr.loaded / xhr.total * 100;
				console.log('model ' + percentComplete.toFixed(2) + '% downloaded');
			}
		}

		function onError() { }
		function render() {
			renderer.render(scene, camera);
			stats.update(); // Update the stats
		}


