// Include app dependency on ngMaterial 

var app = angular.module( 'HausGertrud', ['ngMaterial', 'as.sortable']);


app.controller("MainController", function ($scope, state, dateFilter) {
	$scope.state = state;
	$scope.editor = {
		activeList: undefined,
		newName: 'Playlist of ' + dateFilter(new Date(), 'dd.MM.yy')
	}

	$scope.createPlaylist = function (name) {
		var newId = state.data.nextID++;
		state.data.playlists[newId] = {
			id: newId,
			name: name,
			files: []
		}
		state.save();
		$scope.editor.activeList = newId;
		$scope.editor.newName = 'Playlist of ' + dateFilter(new Date(), 'dd.MM.yy')
	}
});

app.directive('listView', function (state, $http) {
	return {
		restrict: 'E',
		templateUrl: 'listview.html',
		scope: { ngModel: '=' },
		controller: function ($scope, $mdDialog) {
			$scope.state = state;
			$scope.removeFromPlaylist = function (index, ev) {
				$mdDialog.show(
				$mdDialog.confirm().title('Delete file from playlist?')
				.textContent('Do you really want to delete this item from the playlist?')
				.ok('Yes, delete').cancel('No').targetEvent(ev).clickOutsideToClose(true))
				.then(function () {
					$scope.ngModel.files = $scope.ngModel.files.filter(function (id) {
						return id != index;
					});
					state.garbageCollect();
					return state.save();
				});
			}

			$scope.removePlaylist = function (ev) {
				$mdDialog.show(
				$mdDialog.confirm().title('Remove playlist completely?')
				.textContent('Do you really want to delete the playlist? All containing files are removed.')
				.ok('Yes, delete').cancel('No').targetEvent(ev).clickOutsideToClose(true))
				.then(function () {
					delete state.data.playlists[$scope.ngModel.id];
					state.garbageCollect();
					return state.save();
				});
			}

			$scope.activatePlaylist = function (ev) {
				state.data.currentPlaylist = $scope.ngModel.id;
				state.save();
				ev.stopPropagation();
			}

			$scope.neu_anzeige = {title: 'Information'};

			$scope.addAnzeige = function (anzeige) {
				$http.get('/uploadAnzeige?playlist=' + encodeURIComponent($scope.ngModel.id) + '&anzeige=' + encodeURIComponent(JSON.stringify(anzeige))).then(function () {
					    state.refresh();
				});
			}
		}
	}
});

app.directive('anzeigeEditor', function ($sce) {
	return {
		restrict: 'E',
		templateUrl: 'anzeige-editor.html',
		scope: { ngModel: '=', add: '&', drafts: '=', save: '&' },
		controller: function ($scope) {
			$scope.url = $sce.trustAsResourceUrl('layout/index.html');
			$scope.update = function () {
				$scope.url = $sce.trustAsResourceUrl('layout/index.html#' + escape(angular.toJson($scope.ngModel)));
			};
			$scope.getJSON = function () {
				return $sce.trustAsResourceUrl('layout/png?p=' + encodeURIComponent(angular.toJson($scope.ngModel)));
			}
			$scope.vorlage = function (data, remove) {
				if (data) {
					// Vorlage gegeben
					if (!remove) {
						// laden
						$scope.ngModel = angular.copy(data);
						$scope.update();
					} else {
						// entfernen!
						for (var x in $scope.drafts) {
							if ($scope.drafts[x] == data && confirm('Vorlage ' + x + ' wirklich löschen?')) {
								delete $scope.drafts[x];
								$scope.xdraft = undefined;
							}
						}
					}
				} else {
					// sonst: Vorlage speichern
					var name = prompt('How do you want to title the draft? (equal names are overwritten)', '');
					if (!name) return;
					$scope.drafts[name] = angular.copy($scope.ngModel);
					$scope.xdraft = $scope.drafts[name];
				}
				if ($scope.save) $scope.save();
			}
		}
	};
});

app.service('state', function ($http) {
	var state = {
		data: {}
	};

	$http.get('/state').then(function (get) {
		state.data = get.data;
	});

	window.uploadDone = function () {
		state.refresh();
	}

	state.refresh = function () {
		$http.get('/state').then(function (get) {
			state.data = get.data;
		});
	}

	state.save = function () {
		return $http.post('/state', state.data);
	}

	state.garbageCollect = function () {
		var usedFiles = {}
		// Testen, ob Datei entfernt werden kann
		for (var playlistId in state.data.playlists) {
			state.data.playlists[playlistId].files.forEach(function (id) {
				usedFiles[id] = true;
			});
		}
		// aufräumen
		for (var fileId in state.data.files) {
			if (!usedFiles.hasOwnProperty(fileId)) {
				delete state.data.files[fileId];
			}
		}
	}

	return state;
});

app.config(function($mdThemingProvider) {
	$mdThemingProvider.theme('default')
	.primaryPalette('blue');
});
