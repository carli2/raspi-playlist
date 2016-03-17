var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var child_process = require('child_process');
var formidable = require('formidable');
var bodyParser = require('body-parser')

var express = require('express');
var app = express();


var state = {
	nextID: 2,
	files: {}, // {*: {filename: string}}
	currentPlaylist: 1,
	playlists: { // {*: {name: string, files: [number]}}
		"1": {
			id: 1,
			name: 'Start-Playlist',
			files: []
		}
	},
	drafts: {
	    'Tageslosung': {title: 'Tageslosung', text: 'bitte eingeben', author: 'bitte eingeben'},
	    'Speiseplan': {title: 'Speiseplan', table: [
				    ['Montag', '---'],
				    ['Dienstag', '---'],
				    ['Mittwoch', '---'],
				    ['Donnerstag', '---'],
				    ['Freitag', '---'],
				    ['Samstag', '---'],
				    ['Sonntag', '*Sonntagsbraten*\nenthält Fleisch']
				], subtitle: 'Zusatzstoffe und Allergene sind in der Küche zu erfragen', warning: 'Änderungen vorbehalten!'}
	}
};

// Upload-Ordner
fs.statAsync('files').catch(function () {
	return fs.mkdirAsync('files');
});

// Zustand laden
fs.statAsync('state.json').then(function () {
	// state.json existiert
	return fs.readFileAsync('state.json', 'utf8').then(JSON.parse);
}, function (err) {
	return state;
}).then(function (newState) {
	state = newState;
});

function saveState() {
	return fs.writeFileAsync('state.json', JSON.stringify(state));
}

// Webserver
app.use(express.static('web'));
app.use('/js/angular', express.static('node_modules/angular'));
app.use('/angular-material', express.static('node_modules/angular-material'));
app.use('/angular-animate', express.static('node_modules/angular-animate'));
app.use('/angular-aria', express.static('node_modules/angular-aria'));
app.use('/angular-sortable', express.static('node_modules/ng-sortable/dist'));

app.get('/state', function (req, res) {
	res.json(state);
});

app.post('/state', bodyParser.json(), function (req, res) {
	newState = req.body;
	for (var fileId in state.files) {
		if (!newState.files[fileId]) {
			// Datei nicht mehr vorhanden: Auf Festplatte löschen
			fs.unlink('files/file_' + fileId);
		}
	}
	state = newState;
	saveState();
	res.end();
});

app.get('/layout/png', function (req, res) {
    var url = 'http://localhost:3000/layout/index.html#' + escape(req.query.p);
    var tmpname = '/tmp/hg_' + Math.random() + '.png';
    var phantom = child_process.spawn('phantomjs', ['rasterize.js', url, tmpname, '1920px*1080px']);
    phantom.on('close', function () {
        var fileStream = fs.createReadStream(tmpname);
        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-disposition': 'attachment; filename=bild.png'
            //'Content-Length': state.files[id].size
        });
        fileStream.on('data', function (data) {
            res.write(data);
        });
        fileStream.on('end', function () {
            res.end();
        });
    });
});

app.get('/uploadAnzeige', function (req, res) {
	if (!state.playlists.hasOwnProperty(req.query.playlist)) {
		res.writeHead(404, {'Content-Type': 'text/plain'});
		res.end('404 not found');
		return;
	}
	var fileId = state.nextID++;
	var url = 'http://localhost:3000/layout/index.html#' + escape(req.query.anzeige);
	var tmpname = 'files/hg_' + Math.random() + '.png';
	var phantom = child_process.spawn('phantomjs', ['rasterize.js', url, tmpname, '1920px*1080px']);
	phantom.on('close', function () {
		fs.renameAsync(tmpname, 'files/file_' + fileId).then(function () {
			state.playlists[req.query.playlist].files.push(fileId);
			state.files[fileId] = {
				name: JSON.parse(req.query.anzeige).title + '.png',
				anzeige: JSON.parse(req.query.anzeige),
				type: 'image/png',
				size: fs.statSync('files/file_' + fileId).size
			}
	    }).then(function () {
		saveState();
		res.end('erfolgreich hinzugefügt');
	    });
	});
});

app.get('/playlist/get', function (req, res) {
	var timestamp = Math.round(new Date().getTime() / 1000);
	var anzeigen = [];
	if (state.playlists.hasOwnProperty(state.currentPlaylist)) {
		// Wenn Playlist ausgewählt: Anzeigenliste bauen
		state.playlists[state.currentPlaylist].files.forEach(function (fileId) {
			var file = state.files[fileId];
			anzeigen.push({
				"ID":fileId,
				"Kunde":90,
				"KundeName":"Ich",
				"Startdatum":timestamp-1000,
				"Enddatum":timestamp+356*24*60*60,
				"Startuhrzeit":0,
				"Enduhrzeit":0,
				"Anzeigedauer":0,
				"Position":0,
				"Dateiname":file.name,
				"Notiz":"",
				"LastEdited":1451985663,
				"Aktiv":true,
				"Zukunft":false
			});
		});
	}
	res.json({"standort":
		{
			"Name":"DummyStandort",
			"resX":1920,
			"resY":1080,
			"Anzeigedauer":30,
			"Blendmodus":0
		},
		"now": timestamp,
		"anzeigen": anzeigen
	});
});

app.get('/playlist/public.php', function (req, res) {
	var id = req.query.id || req.query.img;
	if (!state.files.hasOwnProperty(id)) {
		res.writeHead(404, {'Content-Type': 'text/plain'});
		res.end('404 not found');
		console.log('no media for file id ' + id);
		return;
	}
	var fileStream = fs.createReadStream('files/file_' + id);
	res.writeHead(200, {
		'Content-Type': state.files[id].type,
		'Content-disposition': 'attachment; filename=' + state.files[id].name,
		'Content-Length': state.files[id].size
	});
	fileStream.on('data', function (data) {
		res.write(data);
	});
	fileStream.on('end', function () {
		res.end();
	});
});

app.post('/uploadFiles', function (req, res, next) {
	var form = new formidable.IncomingForm();
	form.multiples = true;
	form.uploadDir = 'files';

	form.parse(req, function (err, fields, files) {
		if (files.uploadedImages.constructor != Array) files.uploadedImages = [files.uploadedImages];
		Promise.map(files.uploadedImages, function (file) {
			var fileId = state.nextID++;
			return fs.renameAsync(file.path, 'files/file_' + fileId).then(function () {
				state.playlists[fields.playlist].files.push(fileId);
				state.files[fileId] = {
					name: file.name,
					type: file.type,
					size: file.size
				}
			});
		}).catch(function (err) {
			console.log(err);
		}).then(function () {
			res.end();
			return saveState();
		});
	});
});

app.get('*', function(req, res, next) {
	console.log('404 on ' + req.url);
	next();
});

var server = app.listen(3000);
