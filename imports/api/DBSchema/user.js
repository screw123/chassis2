import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base'

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

export const updateProfile = new ValidatedMethod({
	name: 'user.updateProfile',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkRoles: {
		roles: ['system.admin'],
		rolesError: { error: 'accessDenied', message: '用戶權限不足'}
	},
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate() { },
	run({id, args}) {
		if (Meteor.isServer) {
			try {
				Meteor.users.update({_id: id}, {$set: args}); //this is only for profile
			}
			catch(err) { throw new Meteor.Error('update-failed', err.message) }
		}
	}
});

export const updateRole = new ValidatedMethod({
	name: 'user.updateRole',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkRoles: {
		roles: ['system.admin'],
		rolesError: { error: 'accessDenied', message: '用戶權限不足'}
	},
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate() { },
	run({id, args}) {
		if (Meteor.isServer) {
			try { Roles.setUserRoles(id, args) }
			catch(err) { throw new Meteor.Error('update-failed', err.message) }
		}
	}
});

export const updateEmail = new ValidatedMethod({
	name: 'user.updateEmail',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate() { },
	run({id, args}) {
		if (Meteor.isServer) {
			try {
				console.log('updateEmail', id, args);
				if (!Roles.userIsInRole(this.userId, 'system.admin')) {
					if (id != this.userId) { throw new Meteor.Error('update-failed', 'not authorized to update email.') }
				}
				const oldEmail = Meteor.users.find({_id: id}).fetch().email[0].address
				console.log(oldEmail); //fixme
				Meteor.users.update({_id: id}, {$set: {email: {}}});
				Accounts.addEmail(id, args, true);
			}
			catch(err) { throw new Meteor.Error('update-failed', err.message) }
		}
	}
});

export default u = '';
