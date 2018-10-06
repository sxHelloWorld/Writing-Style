all:
	mkdir -p www/style
	mkdir -p www/script

	cp style/* www/style/
	cp script/* www/script/

	pypugjs -c jinja templates/index.pug www/index.html

clean:
	rm www/*