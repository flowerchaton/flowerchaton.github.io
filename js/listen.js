{
	let Colors = {
		lightGrey: 0xd7d7d7,
		black: 0x000000,
		white: 0xffffff
	}

	let scene, camera, renderer;
	// scene setting
	scene = new THREE.Scene();
	scene.background = new THREE.Color(Colors.white);

	// camera setting
	camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
	camera.position.z = 4;

	// render setting
	renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setPixelRatio( window.devicePixelRatio );
	document.getElementById('music-room').appendChild(renderer.domElement);

	// music player
	let geometry, material;
	let player = new THREE.Object3D();

	// body
	geometry = new THREE.BoxGeometry(2, 0.4, 2);
	material = new THREE.MeshBasicMaterial({ color: Colors.lightGrey });
	let playerBody = new THREE.Mesh(geometry, material);
	player.add(playerBody);

	// wireframe
	let geo = new THREE.EdgesGeometry(playerBody.geometry); // or WireframeGeometry
	let mat = new THREE.LineBasicMaterial({ color: Colors.white, linewidth: 2 });
	let wireframe = new THREE.LineSegments(geo, mat);
	playerBody.add(wireframe);

	// record
	geometry = new THREE.CircleGeometry(0.6, 16);
	material = new THREE.MeshBasicMaterial({ color: Colors.black, side: THREE.DoubleSide });
	let record = new THREE.Mesh(geometry, material);
	// record cover
	let coverTexture = new THREE.TextureLoader().load('./img/fc.jpg');
	coverTexture.mapping = THREE.UVMapping;
	geometry = new THREE.CircleGeometry(0.3, 16);
	material = new THREE.MeshBasicMaterial({
		color: Colors.white,
		side: THREE.DoubleSide,
		map: coverTexture
	});
	let cover = new THREE.Mesh(geometry, material);
	cover.position.z = 0.01;
	record.add(cover);

	record.position.y = 0.4;
	record.position.z = 0.2;
	record.rotateX(THREE.Math.degToRad(-90));
	player.add(record);



	// arm
	let count = 0;
	var ArmCurve = THREE.Curve.create(
		function (scale = 1) { //custom curve constructor
			this.scale = scale
		},
		function (t) { //getPoint: t is between 0-1
			let tx, ty, tz, curvePoint = 0.85;

			if (t < curvePoint) {
				tx = 0; tz = t; ty = 0;
			} else if (t >= curvePoint) {
				tz = t;

				// tx = -radius + √|(radius)^2-(tz-(1-radius)^2)|
				// use abs() in case NaN is occurred
				tx = Math.sqrt(
					Math.abs(Math.pow(1 - curvePoint, 2)
						- Math.pow(tz - curvePoint, 2))) - (1 - curvePoint);
				ty = 0;
			}
			return new THREE.Vector3(tx, ty, tz).multiplyScalar(this.scale);
		}
	);

	let scale = 0.8;
	let path = new ArmCurve(scale);
	geometry = new THREE.TubeGeometry(path, 20, scale * 0.03, 32, false);
	material = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
	let arm = new THREE.Mesh(geometry, material);


	// gyroscope
	geometry = new THREE.BoxGeometry(0.1, 0.2, 0.1);
	material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
	let gyroscope = new THREE.Mesh(geometry, material);
	arm.add(gyroscope);

	// head
	geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
	material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
	let head = new THREE.Mesh(geometry, material);
	head.position.z = 0.8;
	head.position.x = -0.15;

	// niddle
	geometry = new THREE.ConeGeometry(0.02, 0.2, 16);
	material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
	let headNiddle = new THREE.Mesh(geometry, material);
	headNiddle.rotation.x = THREE.Math.degToRad(180);
	headNiddle.position.y = -0.08;
	headNiddle.position.z = 0.05;
	head.add(headNiddle);

	arm.add(head);
	arm.rotation.y = THREE.Math.degToRad(-10);

	arm.position.x = 0.7,
		arm.position.y = 0.5,
		arm.position.z = -0.4;

	player.add(arm);


	// player setting
	player.rotateX(THREE.Math.degToRad(50));
	scene.add(player);

	let render = function () {
		requestAnimationFrame(render);
		record.rotation.z += 0.01;
		// player.rotation.y += 0.01;
		// player.rotation.x += 0.01;
		renderer.render(scene, camera);
	};

	render();

}

