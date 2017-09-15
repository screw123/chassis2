export const cleanObject = (obj) => {
	let a = Object.assign({}, obj);
	Object.entries(a).forEach(([key, val]) => {
		if (val && typeof val === 'object') cleanObject(val)
		else if ((val === null)||(val === undefined)) delete a[key]
	});
	return a;
};

export const userRole2Str = (r) => {
	let a = '';
	for (v in r) { //v is org name
		for (x of r[v]) { //x is role name
			a = a + x + "@" + v + "; "
		}
	}
	return a;
}

export const roundDollar = (num, decimalPlaces) => {
    var d = decimalPlaces || 4;
    var m = Math.pow(10, d);
    var n = +(d ? num * m : num).toFixed(8); // Avoid rounding errors
    var i = Math.floor(n), f = n - i;
    var e = 1e-8; // Allow for rounding errors in f
    var r = (f > 0.5 - e && f < 0.5 + e) ?
                ((i % 2 == 0) ? i : i + 1) : Math.round(n);
    return d ? r / m : r;
}
