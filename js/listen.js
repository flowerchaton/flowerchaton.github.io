{
	let playingX = $('.playing-record').offset().left;
	let playingY = $('.playing-record').offset().top;

    let Record = {
        template: '#record-template',
        props: ['data'],
        methods: {
            playRecord() {
				let el = $(this.$el),
					playingRecord = $('.playing-record');

				let x = el.offset().left,
					 y =el.offset().top;
				console.log(`x= ${x} , y=${y}`);
				playingRecord.css('left', x+'px');
				playingRecord.css('top', y+'px');
				el.css('opacity', '0');
				playingRecord.animate({
					left: playingX,
					top: playingY
				}, 500);
            }
        }
    }	
    let app = new Vue({
        el: '#app',

        data: {
            records: [
                { name: 'a', url: 'a' },
                { name: 'b', url: 'a' },
                { name: 'c', url: 'a' }
            ]
        },

        components: {
            'record': Record
        }
    });
}