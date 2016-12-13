
class Playlist {
	constructor(audioContext, songInfos) {
		this.context = audioContext;
		this.songs = songInfos;
		this.seletedIndex = null;
	}

	buffer(audioData, song, success) {
		let buffer = this.context.decodeAudioData(audioData,
			(decodedData) => {
				let source = this.context.createBufferSource();
				source.buffer = decodedData;
				song.source = source;
				success();
			
			});
	}

	load(song, success) {
		if (!song.hasOwnProperty('source')) {
			let request = new XMLHttpRequest();
			request.open('GET', song.url, false);
			request.responseType = 'arraybuffer';
			request.onload = (event) => {
				let audioData = event.target.response;
				this.buffer(audioData, song, success);
			}
			request.send();
		} else {
			console.log('the song is load');
		}
	}

	select(index, success) {
		this.seletedIndex = index;
		this.load(this.songs[index], success);
	}

	get selectedSong() {
		if (this.seletedIndex != null) {
			let song = this.songs[this.seletedIndex];
			if (song.source != null) {
				return song;
			} else {
				console.log('the song is not buffered yet');
			}
		} else {
			console.log('no song is selected');
		}
	}

	get nextSong() {
		if (this.seletedIndex < this.songs.length - 1) {
			this.seletedIndex += 1;
			this.select(this.seletedIndex);
			return this.selectedSong;
		} else {
			console.log('run out of song');
		}
	}
}

