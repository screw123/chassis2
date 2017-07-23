import { Mongo } from 'meteor/mongo';

import { SimpleSchema } from 'meteor/aldeed:simple-schema';

const Project = new Mongo.Collection('project');

const Schemas = new SimpleSchema({
	code: {type: String, unique: true, min: 3, max: 12, label: '項目編號'},
	desc: {type: String, label: '項目內容'},
	isActive: {type: Boolean, label: '使用中', defaultValue: true },
	createAt: {type: Date, label: '創建日期', autoValue: function() {
		const isActive = this.field('isActive');
		if (this.isInsert || this.isUpsert || (isActive.isSet & (isActive.value == true) )) {
			return new Date();
		} else {
			this.unset();
		}
	}},
	inactiveAt: {type: Date, label: '停用日期'}
})

Project.attachSchema(Schemas);

if (Meteor.isServer) {
	Meteor.publish('project.ALL', function tasksPublication() {
		return Project.find();
	});
}

export const projectList = new ValidatedMethod({
	name: 'project.list',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate() { },
	run() {
		if (Meteor.isServer) {
			try {
				return Project.find({isActive: true}, {fields: {"code": 1}}).fetch()
			}
			catch(err) { return err }
		}
	}
});


export default Project;
