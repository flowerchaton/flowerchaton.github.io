
const Colors = {
	lightGrey: 0xd7d7d7,
	deepGrey: 0x727272,
	black: 0x000000,
	white: 0xffffff,
	green: 0x00ff7f,
	lightblue: 0xf0f8ff,
	lightPink: 0xffe0f0

}

const Status = {
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
			volume: this.context.createGain()
		};
		this.status = Status.STOP;
		this.playingSong = null;
		
		this.graph = {
			scene: new THREE.Scene(),
			camera: new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000),
			renderer: new THREE.WebGLRenderer(),
			body: this._createBody(),
			record: this._createRecord(),
			arm: this._createArm(),
			barGroup: this._createFreqBarGroup()
		};
		this.requestId = { record: null, freqBar: null };
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
						{ y: THREE.Math.degToRad(5) },
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
						scope.requestId.record = requestAnimationFrame(loop);
					}
				},
				stop: function (scope) {
					cancelAnimationFrame(scope.requestId.record);
				}
			},

			freqBar: {
				show: function (scope) {
					let barGroup = scope.graph.barGroup;
					let bufferLength = scope.analyser.frequencyBinCount,
						dataArray = new Float32Array(bufferLength);

					loop();
					function loop() {
						scope.analyser.getFloatFrequencyData(dataArray);
						scope.requestId.freqBar = requestAnimationFrame(loop);
						barGroup.children.forEach((child, index) => {
							child.scale.y = -dataArray[index] / 60;
						});
					}
				},
				vanish: function (scope) {
					scope.graph.barGroup.children.forEach((child, index) => {
						child.scale.y = 0;
					});
					cancelAnimationFrame(scope.requestId.freqBar);
				}
			}
		}
	}

	play(song) {
		this.playingSong = song;
		this._initAudioConfig();
		this.animation.arm.tuneon(this, () => {
			this.animation.freqBar.show(this);
			this.animation.record.start(this);
			song.source.start();
		});
	}

	stop() {
		this.animation.arm.tuneoff(this);
		this.animation.record.stop(this);
		this.animation.freqBar.vanish(this);
		this.playingSong.source.stop();
	}

	_initAudioConfig() {

		this.playingSong.source.connect(this.nodes.filter);
		this.analyser.connect(this.context.destination);
		this.analyser.fftSize = 256;
		this.analyser.smoothingTimeConstant = 0.85;
		this.nodes.filter.type = 'highpass';
		this.nodes.filter.connect(this.nodes.panner);
		this.nodes.panner.connect(this.nodes.volume);
		this.nodes.volume.connect(this.analyser);
		this.playingSong.source.onended = () => {
			this.stop();
		}
	}

	render() {
		let playerThis = this;
		const {scene, camera, renderer, barGroup} = this.graph;
		scene.background = new THREE.Color(Colors.lightblue);
		camera.position.z = 4;
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setPixelRatio(window.devicePixelRatio);
		document.querySelector('main').appendChild(renderer.domElement);
		const controls = new THREE.OrbitControls(camera, renderer.domElement);


		let player = this._createPlayerModel();
		player.rotateX(THREE.Math.degToRad(50));
		scene.add(player);

		_renderFrame();
		function _renderFrame() {
			renderer.render(scene, camera);
			requestAnimationFrame(_renderFrame);
		}
	}

	_loadRecord() {
		let albumCover, barColors = [];
		albumCover = new Image(200, 200);
		albumCover.src = './img/fc.jpg';
		albumCover.onload = () => {
			let colorThief = new ColorThief();
			let palette = colorThief.getPalette(albumCover, 11);
			palette.forEach((rgb, index) => {
				barColors.push(new THREE.Color(`rgb(${rgb[0]},${rgb[1]},${rgb[2]})`));
			});

			this.graph.barGroup.children.forEach((child, index) => {
				child.children.forEach((mesh) => {
					mesh.material.color.set(barColors[index]);
					mesh.material.needsUpdate = true;
				})
			});
		}
	}

	_createPlayerModel() {
		let player = new THREE.Object3D();
		let {body, record, arm, barGroup} = this.graph;

		record.position.y = 0.3;
		record.position.z = 0.2;
		arm.rotation.y = THREE.Math.degToRad(5);
		arm.position.x = 0.7,
			arm.position.y = 0.45,
			arm.position.z = -0.4;

		barGroup.position.x = -1.2;
		player.add(...[body, record, arm, barGroup]);
		player.name = 'player';
		return player;
	}

	_createBody() {
		let geometry = new THREE.BoxBufferGeometry(2, 0.4, 2);
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
		let geometry = new THREE.CylinderGeometry(0.6, 0.6, 0.02, 32);
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

		let geo = new THREE.CircleBufferGeometry(0.3, 16);
		let mat = new THREE.MeshBasicMaterial({
			color: Colors.white,
			side: THREE.DoubleSide
		});
		let cover = new THREE.Mesh(geo, mat);
		cover.name = 'cover';
		let loader = new THREE.TextureLoader();
		loader.load('./img/fc.jpg', (texture) => {
			texture.mapping = THREE.UVMapping;
			mat.map = texture;
			this._loadRecord()
			cover.material.needsUpdate = true;
		});

		cover.rotateX(THREE.Math.degToRad(90));
		cover.position.y = 0.02;
		record.add(cover);
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
			geometry = new THREE.TubeBufferGeometry(path, 20, scale * 0.03, 32, false),
			material = new THREE.MeshBasicMaterial({
				color: Colors.green
			});
		let arm = new THREE.Mesh(geometry, material);
		this._addWireFrame(arm, Colors.white);

		// gyroscope
		geometry = new THREE.CylinderBufferGeometry(0.15, 0.15, 0.4, 32);
		let gyroscope = new THREE.Mesh(geometry, material);
		gyroscope.position.y = -0.1;
		this._addWireFrame(gyroscope, Colors.white);

		// head
		geometry = new THREE.BoxBufferGeometry(0.1, 0.1, 0.1);
		let head = new THREE.Mesh(geometry, material);
		head.position.z = 0.8;
		head.position.x = -0.15;
		this._addWireFrame(head, Colors.white);
		// niddle
		geometry = new THREE.ConeBufferGeometry(0.02, 0.2, 16);
		let headNiddle = new THREE.Mesh(geometry, material);
		headNiddle.rotation.x = THREE.Math.degToRad(180);
		headNiddle.position.y = -0.08;
		headNiddle.position.z = 0.01;

		head.add(headNiddle);
		arm.add(gyroscope);
		arm.add(head);
		return arm;

	}

	_createFreqBarGroup() {
		let barNum = 10,
			radius = 0.05,
			height = 1,
			group = new THREE.Object3D();
		for (let i = 0; i < barNum; i++) {
			let bar = new THREE.Object3D();
			let material = new THREE.MeshBasicMaterial({
				color: Colors.lightPink,
				transparent: true,
				opacity: 0.9,
				side: THREE.DoubleSide
			});

			let cylinder = new THREE.CylinderBufferGeometry(radius, radius, height, 32),
				sphere = new THREE.SphereBufferGeometry(radius, 32, 32, 0, 6.3, 1.5, 3.1);
			let cylinderMesh = new THREE.Mesh(cylinder, material),
				sphereMesh = new THREE.Mesh(sphere, material);
			bar.add(...[cylinderMesh, sphereMesh]);
			cylinderMesh.position.y = height / 2;
			sphereMesh.rotation.x = THREE.Math.degToRad(180);
			sphereMesh.position.y = height;
			bar.position.z = (1 - radius) - i * 2 / barNum;
			bar.scale.y = 0;
			group.add(bar);

		}
		return group;
	}

	_addWireFrame(mesh, color) {
		let edge = new THREE.EdgesGeometry(mesh.geometry, 20); // the second parameter solves your problem ;)
		let line = new THREE.LineSegments(edge, new THREE.LineBasicMaterial({ color: color }));
		mesh.add(line);
	}
}
