
export const permissionHierarchy = [
	"owner",
	"superadmin",
	"admin",
	"editor",
	"viewer",
	"guest",
];

export const permissionLevels = permissionHierarchy.reduce((acc, permission, index) => {
	acc[permission] = permissionHierarchy.length - index;
	return acc;
}, {});

export function higherPermission(a, b) {
	const aIndex = permissionHierarchy.indexOf(a);
	const bIndex = permissionHierarchy.indexOf(b);
	if (aIndex > bIndex) {
		return a;
	}
	return b;
}