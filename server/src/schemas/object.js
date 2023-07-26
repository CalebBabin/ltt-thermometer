import { DataTypes } from "sequelize";
import sequelize from "../../database.js";

const ObjectModel = sequelize.define("Object", {
	name: { type: DataTypes.TEXT },
	value: { type: DataTypes.JSON },
	type: { type: DataTypes.TEXT },
	_id: {
		type: DataTypes.UUID,
		defaultValue: DataTypes.UUIDV4, // Or DataTypes.UUIDV1
		primaryKey: true,
		allowNull: false,
	}
});

ObjectModel.sync({ alter: true });

export default ObjectModel;