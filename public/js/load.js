$app.AppVarAttribute = 'data-var';
$app.Precision = 1000000;

window.addEventListener ('keypress', function (event) {
	if (event.keyCode == 13) {
		$app.update (event);
	}
});

// Auto-connect to current host (supports any domain/port)
var socket = io.connect();

jQuery ('#gt-date').datetimepicker ({
	value: (new Date ()).dateFormat ('d.m.Y H:i:s'),
	mask: true,
	format: 'd.m.Y H:i:s'
});

jQuery ('#gu-date').datetimepicker ({
	mask: true,
	format: 'd.m.Y H:i:s'
});

socket.on ('swisseph result', function (result) {
    console.log (result);
	$copy ($app, result);
	$app.setVar ();
});

socket.on ('amap result', function (result) {
    console.log ('AMap result:', result);
    if (result.error) {
        alert('高德地图API错误: ' + result.error);
    } else {
        // 处理成功的结果
        $copy ($app, result);
        $app.setVar ();
    }
});

$app.update = function (event) {
	var dateVar;

	$app.varElements = $app.findNodesByAttr (document, $app.AppVarAttribute);

	$app.getVar ();

	if (event) {
		dateVar = event.target.getAttribute ($app.AppVarAttribute);
	} else {
		dateVar = '$app.date.gregorian.terrestrial';
	}

	$app.getGroupVar ('$app.date', dateVar);

    socket.emit ('swisseph', [{
    	func: 'calc',
    	args: [{
			date: $app.date,
			observer: $app.observer,
			body: $app.body
		}]
	}]);
};

// 高德地图地理编码（地址转经纬度）
$app.amapGeocode = function () {
    var address = document.getElementById('amap-address').value;
    if (!address) {
        alert('请输入地址');
        return;
    }

    socket.emit ('amap', [{
        func: 'geocode',
        args: [address]
    }]);
};

// 高德地图逆地理编码（经纬度转地址）
$app.amapReverseGeocode = function () {
    var coords = document.getElementById('amap-coords').value;
    if (!coords) {
        alert('请输入经纬度，格式：经度,纬度');
        return;
    }

    var parts = coords.split(',');
    if (parts.length !== 2) {
        alert('经纬度格式错误，请使用：经度,纬度');
        return;
    }

    var lng = parseFloat(parts[0].trim());
    var lat = parseFloat(parts[1].trim());

    if (isNaN(lng) || isNaN(lat)) {
        alert('经纬度必须为数字');
        return;
    }

    socket.emit ('amap', [{
        func: 'reverseGeocode',
        args: [lat, lng]
    }]);
};

$app.getGroupVar = function (varGroup, varName) {
	try {
		if (varName.indexOf (varGroup) == 0) {
			eval ('$app.varValue = ' + varName + '');
			eval ('delete ' + varGroup);
			$make (varName);
			eval ('' + varName + ' = $app.varValue');
		}
	} catch (exception) {
	}
};

$app.getVar = function () {
	for (var i = 0; i < $app.varElements.length; i ++) {
		var element = $app.varElements [i];
		var varName = element.getAttribute ($app.AppVarAttribute);
		try {
			$make (varName);
			if (
				element.tagName == 'INPUT' || element.tagName == 'SELECT'
			) {
				eval ('' + varName + ' = "' + element.value + '"');
			} else {
				eval ('delete ' + varName + '');
			}
		} catch (exception) {
		}
		element.setAttribute ('onchange', '$app.update (event)');
	}

	$app.date.gregorian.terrestrial = $app.parseDate ($app.date.gregorian.terrestrial);
	$app.date.gregorian.universal = $app.parseDate ($app.date.gregorian.universal);

	$app.date.julian.terrestrial = parseFloat ($app.date.julian.terrestrial);
	$app.date.julian.universal = parseFloat ($app.date.julian.universal);

	$app.observer.geographic.longitude = parseFloat ($app.observer.geographic.longitude);
	$app.observer.geographic.latitude = parseFloat ($app.observer.geographic.latitude);
	$app.observer.geographic.height = parseFloat ($app.observer.geographic.height);
};

$app.setVar = function () {
	$app.date.gregorian.terrestrial = $app.formatDate ($app.date.gregorian.terrestrial);
	$app.date.gregorian.universal = $app.formatDate ($app.date.gregorian.universal);

	$app.body.position.longitude.degreeMinuteSecond = $app.formatDegreeMinuteSecond ($app.body.position.longitude.decimalDegree);
	$app.body.position.latitude.degreeMinuteSecond = $app.formatDegreeMinuteSecond ($app.body.position.latitude.decimalDegree);

	for (var i = 0; i < $app.varElements.length; i ++) {
		var element = $app.varElements [i];
		try {
			if (element.tagName == 'INPUT') {
				element.value = eval ('(' + element.getAttribute ($app.AppVarAttribute) + ')');
			} else if (element.tagName != 'SELECT') {
				value = eval ('(' + element.getAttribute ($app.AppVarAttribute) + ')');
				if (typeof (value) == 'number') {
					value = Math.floor (value * $app.Precision) / $app.Precision;
				};
				element.innerHTML = value;
			}
		} catch (exception) {
		}
	}
};
