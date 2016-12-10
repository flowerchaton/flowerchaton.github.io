class RecordPlayer{
	constructor(audioContext) {
		this.context = audioContext;
		this.analyser = this.context.createAnalyser();
		this.analyser.connect(this.context.destination);
		this.nodes = {
			filter: this.context.createBiquadFilter(),
			panner: this.context.createPanner(),
			volume: this.context.createGainNode()
		}
		this.isPlaying = false;
		this.playingSong = null;
	}

	play(song){
		// highpass 
		this.nodes.filter.type = 1;
		song.source.connect(this.nodes.filter);
		this.nodes.filter.connect(this.nodes.panner);
		this.nodes.panner.connect(this.nodes.volume);
		this.nodes.volume.connect(this.analyser);
		song.source.start();
		this.isPlaying = true;
		this.playingSong = song;
	}

	stop(){

	}
}
