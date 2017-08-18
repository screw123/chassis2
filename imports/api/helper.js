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
			console.log(r, a)
		}
	}
	return a;
}
