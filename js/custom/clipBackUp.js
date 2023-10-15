import * as THREE from 'three';
		import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
		import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
		import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
		import Stats from 'three/addons/libs/stats.module.js';
		import { DragControls } from 'three/addons/controls/DragControls.js';
        import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
		import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
        import { TransformControls } from 'three/addons/controls/TransformControls.js';
		import { SUBTRACTION } from 'three-bvh-csg';

		let camera, scene, renderer, stats;
		let planes, planeObjects, planeHelpers;
		let object;
		const loadedModels = [];  // this is for models to clip
		let clock;

		const API = {
			thickness: 1
		};

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
            // exportToObj: saveClippedObjects
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

			// ADD texture- TODO
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
						obj.traverse(function (child) {
							if (child.isMesh) {
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

			//  try and make this invisble by some styling some invisible material
			const geometry = new THREE.TorusKnotGeometry(0.4, 0.15, 220, 60);
			object = new THREE.Group();
			scene.add(object);
			console.log("Name of this object" + object)

			// Set up clip plane rendering
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
			//renderer.localClippingEnabled = true;
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

			gui.add( API, 'thickness', 0, 4 ).onChange( function () {
				// set this for mesh1 as well
                mesh2.material.uniforms.thickness.value = API.thickness;
                render();

            } );

            // gui.add(params, 'exportToObj').name('Export OBJ');

			const controls = new OrbitControls(camera, renderer.domElement);
			controls.minDistance = 2;
			controls.maxDistance = 5;
			controls.addEventListener('change', render);

			window.addEventListener('resize', onWindowResize);

			// Initialize the clock
			clock = new THREE.Clock();

			// Start the animation
			animate();
		}

        function setupAttributes( geometry ) {

            const vectors = [
                new THREE.Vector3( 1, 0, 0 ),
                new THREE.Vector3( 0, 1, 0 ),
                new THREE.Vector3( 0, 0, 1 )
            ];

            const position = geometry.attributes.position;
            const centers = new Float32Array( position.count * 3 );

            for ( let i = 0, l = position.count; i < l; i ++ ) {

                vectors[ i % 3 ].toArray( centers, i * 3 );

            }

            geometry.setAttribute( 'center', new THREE.BufferAttribute( centers, 3 ) );

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
          
			// function exportToObj() {

			// 	const exporter = new OBJExporter();
			// 	const result = exporter.parse( object);
			// 	saveString( result, 'object.obj' );

			// }
			function saveModel(model, filename) {
				const exporter = new OBJExporter();
				const result = exporter.parse(model);
				saveString(result, filename);
			}
			// Add an event listener to the "Save" button
			document.getElementById('saveButton').addEventListener('click', saveClippedObjects);


			function saveClippedObjects() {
				// Create an instance of the OBJExporter
				const exporter = new OBJExporter();
			
				// Create a group to hold the clipped objects
				const clippedObjectsGroup = new THREE.Group();
			
				// Iterate through the loaded models and add the clipped objects to the group
				for (let i = 0; i < loadedModels.length; i++) {
					const model = loadedModels[i].clone(); // Clone the object to avoid modifying the original
					model.updateMatrix(); // Ensure the matrix is updated
					clippedObjectsGroup.add(model);
				}
			
				// Export the group of clipped objects to OBJ format
				const result = exporter.parse(clippedObjectsGroup);
			
				// Save the OBJ content to a file
				saveString(result, 'clipped_objects.obj');
			}
			function clearScene() {
				while (scene.children.length > 0) {
					const object = scene.children[0];
					scene.remove(object);
				}
			}
			
			// Add an event listener to the "Merge" button
document.getElementById('mergeButton').addEventListener('click', mergeClippedObjects);

function mergeClippedObjects() {
    // Get the user-selected objects to merge
    const mergeObjectIndex1 = parseInt(document.getElementById('mergeObject1').value);
    const mergeObjectIndex2 = parseInt(document.getElementById('mergeObject2').value);

    // Create an array to hold the geometries of the selected objects
    const geometries = [];

    // Add the geometries of the selected objects to the array
    const selectedObjects = [loadedModels[mergeObjectIndex1], loadedModels[mergeObjectIndex2]];

    for (let i = 0; i < selectedObjects.length; i++) {
        const model = selectedObjects[i];
        const geometriesArray = model.children
            .filter(child => child.isMesh)
            .map(child => child.geometry.clone());
        geometries.push(...geometriesArray);
    }

    // Clear the scene
    clearScene();

    // Merge the geometries into a single geometry using BufferGeometryUtils
    const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(geometries);

    // Create a mesh from the merged geometry
    const mergedMesh = new THREE.Mesh(mergedGeometry, new THREE.MeshStandardMaterial());

    // Add the merged mesh to the scene
    scene.add(mergedMesh);

    // Render the scene
    render();
}


			
			// function exportToObj() {
			// 	for (let i = 0; i < loadedModels.length; i++) {
			// 		const model = loadedModels[i];
			// 		saveModel(model, `model_${i}.obj`);
			// 	}
			// }  
			
			function showStats (){
				
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

      