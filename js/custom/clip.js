import * as THREE from 'three';
		import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
		import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
		import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
		import Stats from 'three/addons/libs/stats.module.js';
		import { DragControls } from 'three/addons/controls/DragControls.js';
        import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
		import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

		let camera, scene, renderer, stats;
		let planes, planeObjects, planeHelpers;
		let object;
		let geometry1, geometry2;
		const loadedModels = [];  // this is for models to clip
		let clock;
		const params = {
			animate: false,
			planeX: {
				constant: 0,
				negated: false,
				displayHelper: false
			},
			planeY: {
				constant: 0,
				negated: false,
				displayHelper: false
			},
			planeZ: {
				constant: 0,
				negated: false,
				displayHelper: false
			},
		};
		init();

		function createPlaneStencilGroup(geometry, plane, renderOrder) {
			const group = new THREE.Group();
			const baseMat = new THREE.MeshBasicMaterial();
			baseMat.depthWrite = false;
			baseMat.depthTest = false;
			baseMat.colorWrite = false;
			baseMat.stencilWrite = true;
			baseMat.stencilFunc = THREE.AlwaysStencilFunc;
			// back faces
			const mat0 = baseMat.clone();
			mat0.side = THREE.BackSide;
			mat0.clippingPlanes = [plane];
			mat0.stencilFail = THREE.IncrementWrapStencilOp;
			mat0.stencilZFail = THREE.IncrementWrapStencilOp;
			mat0.stencilZPass = THREE.IncrementWrapStencilOp;
		
			const mesh0 = new THREE.Mesh(geometry, mat0);
			mesh0.renderOrder = renderOrder;
			group.add(mesh0);
		
			// front faces
			const mat1 = baseMat.clone();
			mat1.side = THREE.FrontSide;
			mat1.clippingPlanes = [plane];
			mat1.stencilFail = THREE.DecrementWrapStencilOp;
			mat1.stencilZFail = THREE.DecrementWrapStencilOp;
			mat1.stencilZPass = THREE.DecrementWrapStencilOp;
		
			const mesh1 = new THREE.Mesh(geometry, mat1);
			mesh1.renderOrder = renderOrder;
		
			group.add(mesh1);
		
			return group;
		}



		function init() {
			camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 20);
			camera.position.z = 2.5;

			// scene
			scene = new THREE.Scene();
			const ambientLight = new THREE.AmbientLight(0xffffff);
			scene.add(ambientLight);

			const pointLight = new THREE.PointLight(0xffffff, 15);
			camera.add(pointLight);
			scene.add(camera);

			planes = [
				new THREE.Plane(new THREE.Vector3(- 1, 0, 0), 0),
				new THREE.Plane(new THREE.Vector3(0, - 1, 0), 0),
				new THREE.Plane(new THREE.Vector3(0, 0, - 1), 0)
			];

			planeHelpers = planes.map(p => new THREE.PlaneHelper(p, 2, 0xffffff));
			planeHelpers.forEach(ph => {

				ph.visible = false;
				scene.add(ph);

			});

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


			// Inside the loadOBJModel function
function loadOBJModel(fileInputId) {
    const fileInput = document.getElementById(fileInputId);
    const file = fileInput.files[0];

    if (file) {
        const loader = new OBJLoader(manager);
        loader.load(URL.createObjectURL(file), function (obj) {
            // Apply clipping materials to the loaded model
            obj.traverse(function (child) {
                if (child.isMesh) {
                    // Load and assign the texture to the model's material
                    const textureLoader = new THREE.TextureLoader();
                    const texture = textureLoader.load('https://threejs.org/examples/models/gltf/LeePerrySmith/Map-COL.jpg'); // Load your texture
                    child.material.map = texture;

                    // Configure other material properties as needed
                    child.material.clippingPlanes = planes;
                    child.material.clipShadows = true;
                    child.material.shadowSide = THREE.DoubleSide;

                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            obj.position.y = -0.95;
            obj.scale.setScalar(0.1);
            objectGroup.add(obj);
            loadedModels.push(obj);
            scene.add(objectGroup);
            if (loadedModels.length >= 2) {
                const subtractedModel = Csg.subtract(
                    loadedModels[0],
                    loadedModels[1]
                );
                const resultMesh = CsgMesh.fromCSG(subtractedModel);
                scene.add(resultMesh);

                scene.remove(loadedModels[0]);
                scene.remove(loadedModels[1]);
                loadedModels.length = 0; // Clear the array
                resultMesh.material.clippingPlanes = planes;
                resultMesh.material.clipShadows = true;
                resultMesh.material.shadowSide = THREE.DoubleSide;
            }

            render();
        }, onProgress, onError);
    }
}

			geometry1=document.getElementById('model1').addEventListener('change', () => {
				loadOBJModel('model1');
				console.log(" uploaded model 1, called:"+ geometry1)
			});

			geometry2=document.getElementById('model2').addEventListener('change', () => {
				loadOBJModel('model2');
				console.log(" uploaded model 2, called" + geometry2)
			});

			const geometry = geometry1 ;
			object = new THREE.Group();
			scene.add(object);
			console.log("Name of this object" + object)

			planeObjects = [];
			const planeGeom = new THREE.PlaneGeometry(4, 4);

		
			for (let i = 0; i < 3; i++) {

				const poGroup = new THREE.Group();
				const plane = planes[i];
				const stencilGroup = createPlaneStencilGroup(geometry, plane, i + 1);

				// plane is clipped by the other clipping planes
				const planeMat =
					new THREE.MeshStandardMaterial({

						color: 0xE91E63,
						metalness: 0.1,
						roughness: 0.75,
						clippingPlanes: planes.filter(p => p !== plane),

						stencilWrite: true,
						stencilRef: 0,
						stencilFunc: THREE.NotEqualStencilFunc,
						stencilFail: THREE.ReplaceStencilOp,
						stencilZFail: THREE.ReplaceStencilOp,
						stencilZPass: THREE.ReplaceStencilOp,

					});
				const po = new THREE.Mesh(planeGeom, planeMat);
				po.onAfterRender = function (renderer) {

					renderer.clearStencil();

				};

				po.renderOrder = i + 1.1;

				object.add(stencilGroup);
				poGroup.add(po);
				planeObjects.push(po);
				scene.add(poGroup);

			}

			const material = new THREE.MeshStandardMaterial({

				color: 0xFFC107,
				metalness: 0.1,
				roughness: 0.75,
				clippingPlanes: planes,
				clipShadows: true,
				shadowSide: THREE.DoubleSide,

			});

			// add the color
			const clippedColorFront = new THREE.Mesh(geometry, material);
			clippedColorFront.castShadow = true;
			clippedColorFront.renderOrder = 6;
			object.add(clippedColorFront);
			// Stats
			stats = new Stats();
			document.body.appendChild(stats.dom);

			// Renderer
			renderer = new THREE.WebGLRenderer({ antialias: true });
			renderer.shadowMap.enabled = true;
			renderer.setPixelRatio(window.devicePixelRatio);
			renderer.setSize(window.innerWidth, window.innerHeight);
			renderer.setClearColor(0x263238);
			renderer.localClippingEnabled = true;
			window.addEventListener('resize', onWindowResize);
			document.body.appendChild(renderer.domElement);

			renderer.localClippingEnabled = true;

			// GUI
			const gui = new GUI();
			gui.add(params, 'animate');
           

			const planeX = gui.addFolder('planeX');
			planeX.add(params.planeX, 'displayHelper').onChange(v => planeHelpers[0].visible = v);
			planeX.add(params.planeX, 'constant').min(- 1).max(1).onChange(d => planes[0].constant = d);
			planeX.add(params.planeX, 'negated').onChange(() => {

				planes[0].negate();
				params.planeX.constant = planes[0].constant;

			});
			planeX.open();

			const planeY = gui.addFolder('planeY');
			planeY.add(params.planeY, 'displayHelper').onChange(v => planeHelpers[1].visible = v);
			planeY.add(params.planeY, 'constant').min(- 1).max(1).onChange(d => planes[1].constant = d);
			planeY.add(params.planeY, 'negated').onChange(() => {

				planes[1].negate();
				params.planeY.constant = planes[1].constant;

			});
			planeY.open();

			const planeZ = gui.addFolder('planeZ');
			planeZ.add(params.planeZ, 'displayHelper').onChange(v => planeHelpers[2].visible = v);
			planeZ.add(params.planeZ, 'constant').min(- 1).max(1).onChange(d => planes[2].constant = d);
			planeZ.add(params.planeZ, 'negated').onChange(() => {

				planes[2].negate();
				params.planeZ.constant = planes[2].constant;

			});
			planeZ.open();

			const controls = new OrbitControls(camera, renderer.domElement);
			controls.minDistance = 2;
			controls.maxDistance = 5;
			controls.addEventListener('change', render);
			window.addEventListener('resize', onWindowResize);
			clock = new THREE.Clock();
			animate();
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

        function saveString(text, filename) {
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
          
			document.getElementById('saveButton').addEventListener('click', saveClippedObjects);
			document.getElementById('saveClipped1').addEventListener('click', saveClippedObject1);
			document.getElementById('saveClipped2').addEventListener('click', saveClippedObject2);

			function saveClippedObjects() {
				const exporter = new OBJExporter();
				const clippedObjectsGroup = new THREE.Group();
				for (let i = 0; i < loadedModels.length; i++) {
					const model = loadedModels[i].clone(); // Clone the object to avoid modifying the original
					model.updateMatrix(); // Ensure the matrix is updated
					clippedObjectsGroup.add(model);
				}
				const result = exporter.parse(clippedObjectsGroup);
				saveString(result, 'clipped_objects.obj');
			}

			function saveClippedObject1(){
				console.log("clipped 1 saved")

			}


			function saveClippedObject2(){
				console.log("clipped  2 saved")
			}
			function clearScene() {
				while (scene.children.length > 0) {
					const object = scene.children[0];
					scene.remove(object);
				}
			}
		
document.getElementById('mergeButton').addEventListener('click', mergeClippedObjects);

function mergeClippedObjects() {
    const mergeObjectIndex1 = parseInt(document.getElementById('mergeObject1').value);
    const mergeObjectIndex2 = parseInt(document.getElementById('mergeObject2').value);

    const geometries = [];
    const selectedObjects = [loadedModels[mergeObjectIndex1], loadedModels[mergeObjectIndex2]];

    for (let i = 0; i < selectedObjects.length; i++) {
        const model = selectedObjects[i];
        const geometriesArray = model.children
            .filter(child => child.isMesh)
            .map(child => child.geometry.clone());
        geometries.push(...geometriesArray);
    }

    clearScene();

    const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
    const mergedMesh = new THREE.Mesh(mergedGeometry, new THREE.MeshStandardMaterial());
    scene.add(mergedMesh);
    render();
}

		function animate() {
			const delta = clock.getDelta();
			requestAnimationFrame(animate);
			if (params.animate) {
				object.rotation.x += delta * 0.5;
				object.rotation.y += delta * 0.2;
			}
			for (let i = 0; i < planeObjects.length; i++) {
				const plane = planes[i];
				const po = planeObjects[i];
				plane.coplanarPoint(po.position);
				po.lookAt(
					po.position.x - plane.normal.x,
					po.position.y - plane.normal.y,
					po.position.z - plane.normal.z,
				);
			}
			render(); 
		}

      