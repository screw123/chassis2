import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';

import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';

import { CallPromiseMixin } from 'meteor/didericis:callpromise-mixin';

const Notification = new Mongo.Collection('notification');

export const NotificationSchema = {
	userId: {type: String, label: '用戶', regEx: SimpleSchema.RegEx.Id},
	organization: {type: String, label: '所屬公司', min: 1},
	isImportant: {type: Boolean, label: '重要訊息', defaultValue: false },
	msg: {type: String, label: '內容', min: 10},
	createAt: {type: Date, label: '建立時間', optional: true, autoValue: function() {
		if (this.isInsert) {
			return new Date();
		} else if (this.isUpsert) {
			return {$setOnInsert: new Date()};
		} else {
			this.unset();
		}
    }},
	docRef: {type: String, label: 'ref'},
	refCount: { type: Number, label: '相同更新數量', defaultValue: 1 },
	onClickURL: {type: String, label: '傳送連結', optional: true }
}

export const NotificationView = {
	'_id': 'sysID',
	'userId': 'user',
	'organization': 'foreignList',
	'isImportant': 'boolean',
	'msg': 'longtext',
	'createAt': 'datetime',
	'docRef': 'text',
	'refCount': 'integer',
	'onClickURL': 'text'
};

const publishSpec = [
	{ 'name': 'notification.ALL', 'filter': {}},
	{ 'name': 'notification.MyNotification', 'filter': { userId: this.userId }},

];

Notification.attachSchema(new SimpleSchema(NotificationSchema));

export const newNotification = new ValidatedMethod({
	name: 'Notification.new',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: { error: 'notLoggedIn', message: '用戶未有登入'},
	validate() {},
	run(args) {
		if (Meteor.isServer) {
			try {
				const a = Notification.insert(args);
				return true;
			}
			catch(err) { throw new Meteor.Error('insert-failed', err.message) }
		}
	}
});

export const updateNotification = new ValidatedMethod({
	name: 'Notification.update',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkRoles: {
		roles: ['admin'],
		group: 'SYSTEM',
		rolesError: { error: 'accessDenied', message: '用戶權限不足'}
	},
	checkLoggedInError: { error: 'notLoggedIn', message: '用戶未有登入'},
	validate() {},
	run({filter, args}) {
		if (Meteor.isServer) {
			try {
				const a = Notification.update(filter, {$set: args});
				return '更新了'+a+'張文件';
			}
			catch(err) { throw new Meteor.Error('update-failed', err.message)}
		}
	}
});

export const deleteNotification = new ValidatedMethod({
	name: 'Notification.delete',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkRoles: {
		roles: ['admin'],
		group: 'SYSTEM',
		rolesError: { error: 'accessDenied', message: '用戶權限不足'}
	},
	checkLoggedInError: { error: 'notLoggedIn', message: '用戶未有登入'},
	validate() {},
	run(args) {
		if (Meteor.isServer) {
			try {
				const a= Notification.remove(args);
				return true
			 }
			catch(err) { throw new Meteor.Error('delete-failed', err.message) }
		}
	}
});

export const downloadNotification = new ValidatedMethod({
	name: 'Notification.download',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: { error: 'notLoggedIn', message: '用戶未有登入'},
	validate() {},
	run({query, filter}) {
		if (Meteor.isServer) {
			try { return Notification.find(Object.assign({}, publishSpec.find((i) => { return i.name===query }).filter, filter)).fetch() }
			catch(err) { throw new Meteor.Error('download-failed', err.message) }
		}
	}
});

export const qtyNotification = new ValidatedMethod({
	name: 'Notification.qty',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: { error: 'notLoggedIn', message: '用戶未有登入'},
	validate() {},
	run({query, filter}) {
		if (Meteor.isServer) {
			try { return Notification.find(Object.assign({}, publishSpec.find((i) => { return i.name===query }).filter, filter)).count() }
			catch(err) { throw new Meteor.Error('qty-failed', err.message) }
		}
	}
});

if (Meteor.isServer) {
	publishSpec.forEach((spec) => {
		Meteor.publish(spec.name, function(args) {
			let lim = 65535
			if (args.limit === undefined) { }
			else { lim = (args.limit > 65535) ? 65535 : args.limit }
			const f = Object.assign({}, spec.filter, args.filter);
			return Notification.find(f, { sort: args.sort, limit: lim } );
		});
	});

	Meteor.publish('notification.getNotification', function(docId) {
		const d_cursor = Notification.find({_id: docId});
		if (Roles.userIsInRole(this.userId, 'admin', 'SYSTEM')) { return d_cursor }
		else { throw new Meteor.Error('accessDenied', '用戶權限不足 @ notification.getNotification, requester: '+this.userId) }
	});
}

export default Notification;
