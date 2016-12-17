
let Colors = {
	lightGrey: 0xd7d7d7,
	deepGrey: 0x727272,
	black: 0x000000,
	white: 0xffffff,
	green: 0x00ff7f,
	lightblue: 0xf0f8ff
}
let Status = {
	START: 0,
	READY: 1,
	PLAYING: 2,
	END: 3,
	STOP: 4
}

class RecordPlayer {

	constructor(audioContext) {
		this.context = audioContext;
		this.analyser = this.context.createAnalyser();
		this.nodes = {
			filter: this.context.createBiquadFilter(),
			panner: this.context.createPanner(),
			volume: this.context.createGainNode()
		};
		this.status = Status.STOP;
		this.playingSong = null;
		this.graph = {
			scene: new THREE.Scene(),
			camera: new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000),
			renderer: new THREE.WebGLRenderer(),
			body: this._createBody(),
			record: this._createRecord(),
			arm: this._createArm()
		};
		this.requestId = null;
		this.animation = {
			arm: {
				tuneon: function (scope, end) {
					scope.status = Status.START;
					dynamics.animate(scope.graph.arm.rotation,
						{ y: THREE.Math.degToRad(-8) },
						{
							duration: 1000,
							complete: end
						});
				},
				tuneoff: function (scope) {
					dynamics.animate(scope.graph.arm.rotation,
						{ y: THREE.Math.degToRad(0) },
						{
							type: dynamics.spring,
							frequency: 200,
							friction: 400,
							duration: 2000
						});
				}
			},

			record: {
				start: function (scope) {
					loop();
					function loop() {
						scope.graph.record.rotation.y -= 0.01;
						scope.requestId = requestAnimationFrame(loop);
					}
				},
				stop: function (scope) {
					cancelAnimationFrame(scope.requestId);
				}
			}
		}
	}

	play(song) {
		this._initAudio(song);
		this.animation.arm.tuneon(this, () => {
			this.animation.record.start(this);
			this.playingSong = song;
			song.source.start();
		});
	}

	stop() {
		this.animation.arm.tuneoff(this);
		this.animation.record.stop(this);
		this.playingSong.source.stop();
	}

	_initAudio(song) {
		song.source.connect(this.nodes.filter);
		this.analyser.connect(this.context.destination);
		this.analyser.fftSize = 256;
		this.analyser.smoothingTimeConstant = 0.85;
		this.nodes.filter.type = 1;
		this.nodes.filter.connect(this.nodes.panner);
		this.nodes.panner.connect(this.nodes.volume);
		this.nodes.volume.connect(this.analyser);
	}

	render() {
		let playerThis = this;
		let {scene, camera, renderer} = this.graph;
		scene.background = new THREE.Color(Colors.lightblue);
		camera.position.z = 4;
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setPixelRatio(window.devicePixelRatio);
		document.querySelector('main').appendChild(renderer.domElement);

		let player = this._createPlayerModel();
		player.rotateX(THREE.Math.degToRad(50));
		scene.add(player);
		_renderFrame();

		function _renderFrame() {
			renderer.render(scene, camera);
			requestAnimationFrame(_renderFrame);
		}
	}

	_createPlayerModel() {
		let player = new THREE.Object3D();
		let {body, record, arm} = this.graph;

		record.position.y = 0.3;
		record.position.z = 0.2;

		// arm.rotation.y = THREE.Math.degToRad(-10);
		arm.position.x = 0.7,
			arm.position.y = 0.45,
			arm.position.z = -0.4;
		player.add(...[body, record, arm]);
		player.name = 'player';
		return player;
	}

	_createBody() {
		let geometry = new THREE.BoxGeometry(2, 0.4, 2);
		let material = new THREE.MeshBasicMaterial({
			color: Colors.lightGrey,
			transparent: true,
			opacity: 0.5

		});
		let body = new THREE.Mesh(geometry, material);

		// wireframe
		let geo = new THREE.EdgesGeometry(body.geometry);
		let mat = new THREE.LineBasicMaterial({ color: Colors.white, linewidth: 10 });
		let wireframe = new THREE.LineSegments(geo, mat);
		body.add(wireframe);
		body.name = 'body';
		return body;
	}

	_createRecord() {
		let geometry = new THREE.CylinderGeometry(0.6, 0.6, 0.02, 16);
		let material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
		for (var i = 0; i < Object.keys(geometry.faces).length; i++) {
			if (geometry.faces[i].normal.y == 0) {
				geometry.faces[i].color.setHex(Colors.deepGrey);
			} else {
				geometry.faces[i].color.setHex(Colors.black);
			}
		}
		material.vertexColors = THREE.FaceColors;

		let record = new THREE.Mesh(geometry, material);

		// record cover

		let geo = new THREE.CircleGeometry(0.3, 16);
		let mat = new THREE.MeshBasicMaterial({
			color: Colors.white,
			side: THREE.DoubleSide
		});
		let cover = new THREE.Mesh(geo, mat);

		let loader = new THREE.TextureLoader();
		loader.load('./img/fc.jpg', (texture) => {
			texture.mapping = THREE.UVMapping;
			mat.map = texture;
			cover.material.needsUpdate = true;
			this.graph.renderer.render(this.graph.scene, this.graph.camera);
		});

		cover.rotateX(THREE.Math.degToRad(90));
		cover.position.y = 0.02;
		record.add(cover);
		record.name = 'record';
		return record;
	}

	_createArm() {
		let ArmCurve = THREE.Curve.create(
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
		let scale = 0.8,
			path = new ArmCurve(scale),
			geometry = new THREE.TubeGeometry(path, 20, scale * 0.03, 32, false),
			material = new THREE.MeshBasicMaterial({
				color: Colors.green
			});
		let arm = new THREE.Mesh(geometry, material);
		this._addWireFrame(arm, Colors.white);

		// gyroscope
		geometry = new THREE.CylinderGeometry(0.15, 0.15, 0.4, 32);
		let gyroscope = new THREE.Mesh(geometry, material);
		gyroscope.position.y = -0.1;
		this._addWireFrame(gyroscope, Colors.white);

		// head
		geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
		let head = new THREE.Mesh(geometry, material);
		head.position.z = 0.8;
		head.position.x = -0.15;
		this._addWireFrame(head, Colors.white);
		// niddle
		geometry = new THREE.ConeGeometry(0.02, 0.2, 16);
		let headNiddle = new THREE.Mesh(geometry, material);
		headNiddle.rotation.x = THREE.Math.degToRad(180);
		headNiddle.position.y = -0.08;
		headNiddle.position.z = 0.01;

		head.add(headNiddle);
		arm.add(gyroscope);
		arm.add(head);


		arm.name = 'arm';
		return arm;

	}

	_addWireFrame(mesh, color) {
		let edge = new THREE.EdgesGeometry(mesh.geometry, 40); // the second parameter solves your problem ;)
		let line = new THREE.LineSegments(edge, new THREE.LineBasicMaterial({ color: color }));
		mesh.add(line);
	}
}
