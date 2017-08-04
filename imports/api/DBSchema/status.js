import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';

import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';

import { CallPromiseMixin } from 'meteor/didericis:callpromise-mixin';

const Status = new Mongo.Collection('status');

export const StatusSchema = {
	code: {type: Number, unique: true, min: 1, max: 999999999999, label: '狀態編號'},
	desc: {type: String, label: '狀態內容'},
	isActive: {type: Boolean, label: '使用中', defaultValue: true },
}

export const StatusView = {
	_id: 'sysID',
	code: 'text',
  	desc: 'text',
	isActive: 'boolean',
};

const publishSpec = [
	{ 'name': 'status.ALL', 'filter': {}}
];

Status.attachSchema(new SimpleSchema(StatusSchema));

export const newStatus = new ValidatedMethod({
	name: 'Status.new',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkRoles: {
		roles: ['system.admin'],
		rolesError: { error: 'accessDenied', message: '用戶權限不足'}
	},
	checkLoggedInError: { error: 'notLoggedIn', message: '用戶未有登入'},
	validate() {},
	run(args) {
		if (Meteor.isServer) {
			try {
				const a = Status.insert(args);
				return Status.findOne({_id: a}, {fields: {'code': 1}}).code
			}
			catch(err) { throw new Meteor.Error('insert-failed', err.message) }
		}
	}
});

export const updateStatus = new ValidatedMethod({
	name: 'Status.update',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkRoles: {
		roles: ['system.admin'],
		rolesError: { error: 'accessDenied', message: '用戶權限不足'}
	},
	checkLoggedInError: { error: 'notLoggedIn', message: '用戶未有登入'},
	validate() {},
	run({filter, args}) {
		if (Meteor.isServer) {
			try {
				const a = Status.update(filter, {$set: args});
				return '更新了'+a+'張文件';
			}
			catch(err) { throw new Meteor.Error('update-failed', err.message)}
		}
	}
});

export const deleteStatus = new ValidatedMethod({
	name: 'Status.delete',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkRoles: {
		roles: ['system.admin'],
		rolesError: { error: 'accessDenied', message: '用戶權限不足'}
	},
	checkLoggedInError: { error: 'notLoggedIn', message: '用戶未有登入'},
	validate() {},
	run(args) {
		if (Meteor.isServer) {
			try {
				const a= Status.remove(args);
				return '移除了'+a+'張文件';
			 }
			catch(err) { throw new Meteor.Error('delete-failed', err.message) }
		}
	}
});

export const downloadStatus = new ValidatedMethod({
	name: 'Status.download',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: { error: 'notLoggedIn', message: '用戶未有登入'},
	validate() {},
	run({query, filter}) {
		if (Meteor.isServer) {
			try { return Status.find(Object.assign({}, publishSpec.find((i) => { return i.name===query }).filter, filter)).fetch() }
			catch(err) { throw new Meteor.Error('download-failed', err.message) }
		}
	}
});

export const qtyStatus = new ValidatedMethod({
	name: 'Status.qty',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: { error: 'notLoggedIn', message: '用戶未有登入'},
	validate() {},
	run({query, filter}) {
		if (Meteor.isServer) {
			try { return Status.find(Object.assign({}, publishSpec.find((i) => { return i.name===query }).filter, filter)).count() }
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
			return Status.find(f, { sort: args.sort, limit: lim } );
		});
	});

	Meteor.publish('status.getStatus', function(docId) {
		const d_cursor = Status.find({_id: docId});
		if (Roles.userIsInRole(this.userId, 'system.admin')) { return d_cursor }
		else { throw new Meteor.Error('accessDenied', '用戶權限不足 @ status.getStatus, requester: '+this.userId) }
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
