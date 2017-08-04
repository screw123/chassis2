import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';

import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';

import { CallPromiseMixin } from 'meteor/didericis:callpromise-mixin';

// This is not a standard Schema/method page, but a dummy page for use together with the admin List/load engine

if (Meteor.isServer) {
	Meteor.publish('user.profile', function a() {
		return Meteor.users.find({}, {
			fields: {_id: 1, emails: 1, profile: 1, status: 1}
		});
	});
	Meteor.publish('user.ALL', function a() {
		return Meteor.users.find({});
	});
}

export const userList = new ValidatedMethod({
	name: 'user.list',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate() { },
	run() {
		if (Meteor.isServer) {
			try {
				const a= Meteor.users.find({isActive: true}, {fields: {"profile.firstName": 1, "profile.lastName": 1}}).fetch();
				return a.map((v) => {return {_id: v._id, userName: v.profile.firstName + ' ' + v.profile.lastName }});
			}
			catch(err) { return err }
		}
	}
});

export default u = '';
