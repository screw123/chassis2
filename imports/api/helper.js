export const cleanObject = (obj) => {
	let a = Object.assign({}, obj);
	Object.entries(a).forEach(([key, val]) => {
		if (val && typeof val === 'object') cleanObject(val)
		else if ((val === null)||(val === undefined)) delete a[key]
	});
	return a;
};
