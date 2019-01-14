function getHeadAndGroup() {
	$('#error').text('');
	var word = $('#word').val();
	if (word != '') {
		$.ajax({
			url: "/getheadlist",
			method: "GET",
			data: {data: word}
		}).done(function(data) {
			console.log(data)
			list = data.split(',');
			if (list.length == 1) {
				$('#error').text('Word not found in database');
				$('#head').text('');
				$('#group').text('');
				$('#subgroup').text('');
			}
			else {
				$('#head').text(list[0]);
				$('#group').text(list[1]);
				$('#subgroup').text(list[2]);
			}
		}).fail(function() {
			$('#error').text('Couldn\'t contact server');
			$('#head').text('');
			$('#group').text('');
			$('#subgroup').text('');
		});
		console.log(word);
	}
}