
let Colors = {
    lightGrey: 0xd7d7d7,
    deepGrey: 0x727272,
    black: 0x000000,
    white: 0xffffff,
    green: 0x00ff7f,
    lightblue: 0xf0f8ff
}

class RecordPlayer {
    constructor(audioContext) {
        this.context = audioContext;
        this.analyser = this.context.createAnalyser();
        this.analyser.connect(this.context.destination);
        this.nodes = {
            filter: this.context.createBiquadFilter(),
            panner: this.context.createPanner(),
            volume: this.context.createGainNode()
        };
        this.isPlaying = false;
        this.playingSong = null;
        this.graph = {
            scene: new THREE.Scene(),
            camera: new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000),
            renderer: new THREE.WebGLRenderer()
        };
        this.requestId = null;
    }

    play(song) {
        let playerThis = this;
        let {scene, camera, renderer} = this.graph;
        let record = scene.getObjectByName('record'),
            arm = scene.getObjectByName('arm');
        //highpass 
        if (this.isPlaying) { this.stop() }
        this.nodes.filter.type = 1;
        song.source.connect(this.nodes.filter);
        this.nodes.filter.connect(this.nodes.panner);
        this.nodes.panner.connect(this.nodes.volume);
        this.nodes.volume.connect(this.analyser);


        _animateArm();

        function _animateArm() {
            playerThis.requestId = requestAnimationFrame(_animateArm);
            if (arm.rotation.y > THREE.Math.degToRad(-10)) {
                arm.rotation.y -= 0.005;
                renderer.render(scene, camera);
            } else {
                // stop arm animation
                cancelAnimationFrame(playerThis.requestId);
                playerThis.requestId = null;
                // start record animation and play some music
                song.source.start();
                playerThis.isPlaying = true;
                playerThis.playingSong = song;
                _animateRecord();
            }

        }
        function _animateRecord() {
            playerThis.requestId = requestAnimationFrame(_animateRecord);
            record.rotation.y -= 0.01;
            renderer.render(scene, camera);
        }
    }

    stop() {
        //this.playingSong.source.stop();
        window.cancelAnimationFrame(this.requestId);
        this.isPlaying = false;
        this.playingSong = null;
    }

    render() {
        let playerThis = this;
        let {scene, camera, renderer} = this.graph;
        scene.background = new THREE.Color(Colors.lightblue);
        camera.position.z = 4;
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        document.querySelector('main').appendChild(renderer.domElement);

        let player = _createPlayerModel();
        player.rotateX(THREE.Math.degToRad(50));
        scene.add(player);

        renderer.render(scene, camera);


        function _createPlayerModel() {
            let player = new THREE.Object3D(),
                record = _createRecord(),
                arm = _createArm(),
                body = _createBody();

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

        function _createBody() {
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

        function _createRecord() {
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
                playerThis.graph.renderer.render(playerThis.graph.scene, playerThis.graph.camera);
            });

            cover.rotateX(THREE.Math.degToRad(90));
            cover.position.y = 0.02;
            record.add(cover);
            record.name = 'record';
            return record;
        }

        function _createArm() {
            let ArmCurve = THREE.Curve.create(
                function(scale = 1) { //custom curve constructor
                    this.scale = scale
                },
                function(t) { //getPoint: t is between 0-1
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
            _addWireFrame(arm, Colors.white);

            // gyroscope
            geometry = new THREE.CylinderGeometry(0.15, 0.15, 0.4, 32);
            let gyroscope = new THREE.Mesh(geometry, material);
            gyroscope.position.y = -0.1;
            _addWireFrame(gyroscope, Colors.white);

            // head
            geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            let head = new THREE.Mesh(geometry, material);
            head.position.z = 0.8;
            head.position.x = -0.15;
            _addWireFrame(head, Colors.white);
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

        function _addWireFrame(mesh, color) {
            let edge = new THREE.EdgesGeometry(mesh.geometry, 40); // the second parameter solves your problem ;)
            let line = new THREE.LineSegments(edge, new THREE.LineBasicMaterial({ color: color }));
            mesh.add(line);
        }
    }

}
