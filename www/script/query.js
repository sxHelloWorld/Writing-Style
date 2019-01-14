function getHeadAndGroup() {
	var word = $('#word').val();
	$('#error').text('');
	$('#head').text('');
	$('#group').text('');
	$('#subgroup').text('');
	$('#listword').empty();
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
			}
			else {
				$('#head').text(list[0]);
				$('#group').text(list[1]);
				$('#subgroup').text(list[2]);
				$.ajax({
					url:"/getwordlist",
					method: "GET",
					data: {head: list[0], group: list[1]}
				}).done(function(data) {
					if (data == 'notfound') {
						$('#error').text('Unable to get word list for head and group')
					}
					else {
						list = data.split(',')
						tbody = $('<tbody>')
						for(i = 0; i < list.length; i++) {
							tbody.append($('<tr>').append($('<p>').text(list[i])));
						}
						$('#listword').append(tbody);
					}
				}).fail(function () {
					$('#error').text('Unable to get word list for head and group')
				});
			}
		}).fail(function() {
			$('#error').text('Couldn\'t contact server');
		});
		console.log(word);
	}
}