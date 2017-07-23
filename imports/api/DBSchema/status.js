import { Mongo } from 'meteor/mongo';

import { SimpleSchema } from 'meteor/aldeed:simple-schema';

const Status = new Mongo.Collection('status');

const Schemas = new SimpleSchema({
	code: {type: Number, unique: true, min: 3, max: 12, label: '狀態編號'},
	desc: {type: String, label: '狀態內容'},
	isActive: {type: Boolean, label: '使用中', defaultValue: true },
})

Status.attachSchema(Schemas);

if (Meteor.isServer) {
	Meteor.publish('status.ALL', function tasksPublication() {
		return Status.find();
	});
}

export const statusList = new ValidatedMethod({
	name: 'status.list',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate() { },
	run() {
		if (Meteor.isServer) {
			try {
				const a= Status.find({isActive: true}, {fields: {"code": 1, "desc": 1}}).fetch();
				return a.map((v) => {return {"code": v.code, "desc": v.code + ' - ' + v.desc }});
			}
			catch(err) { return err }
		}
	}
});

export default Status;
