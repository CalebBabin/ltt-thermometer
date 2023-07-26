import { Sequelize } from 'sequelize';

const sequelize = new Sequelize({
	dialect: 'sqlite',
	storage: process.cwd() + '/database.sqlite',
	logging: false,
});

export default sequelize;