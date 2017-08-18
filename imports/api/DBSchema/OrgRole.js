import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';

import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';

import { CallPromiseMixin } from 'meteor/didericis:callpromise-mixin';

const OrgRole = new Mongo.Collection('orgrole');

export const OrgRoleSchema = {
	role: {type: String, label: '權限'},
	org: {type: String, label: '公司'},
}

export const OrgRoleView = {
	_id: 'sysID',
	role: 'text',
	org: 'text'
}

const publishSpec = [
	{ 'name': 'OrgRole.ALL', 'filter': {}}
];

OrgRole.attachSchema(new SimpleSchema(OrgRoleSchema));

export const newOrgRole = new ValidatedMethod({
	name: 'OrgRole.new',
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
				const a = OrgRole.insert(args);
				return OrgRole.findOne({_id: a}).role+"@"+OrgRole.findOne({_id: a}).org
			}
			catch(err) { throw new Meteor.Error('insert-failed', err.message) }
		}
	}
});

export const updateOrgRole = new ValidatedMethod({
	name: 'OrgRole.update',
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
				const a = OrgRole.update(filter, {$set: args});
				return '更新了'+a+'張文件';
			}
			catch(err) { throw new Meteor.Error('update-failed', err.message)}
		}
	}
});

export const deleteOrgRole = new ValidatedMethod({
	name: 'OrgRole.delete',
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
				const a= OrgRole.remove(args);
				return '移除了'+a+'張文件';
			 }
			catch(err) { throw new Meteor.Error('delete-failed', err.message) }
		}
	}
});

export const downloadOrgRole = new ValidatedMethod({
	name: 'OrgRole.download',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: { error: 'notLoggedIn', message: '用戶未有登入'},
	validate() {},
	run({query, filter}) {
		if (Meteor.isServer) {
			try { return OrgRole.find(Object.assign({}, publishSpec.find((i) => { return i.name===query }).filter, filter)).fetch() }
			catch(err) { throw new Meteor.Error('download-failed', err.message) }
		}
	}
});

export const qtyOrgRole = new ValidatedMethod({
	name: 'OrgRole.qty',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: { error: 'notLoggedIn', message: '用戶未有登入'},
	validate() {},
	run({query, filter}) {
		if (Meteor.isServer) {
			try { return OrgRole.find(Object.assign({}, publishSpec.find((i) => { return i.name===query }).filter, filter)).count() }
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
			return OrgRole.find(f, { sort: args.sort, limit: lim } );
		});
	});

	Meteor.publish('OrgRole.getOrgRole', function(docId) {
		const d_cursor = OrgRole.find({_id: docId});
		if (Roles.userIsInRole(this.userId, 'admin', 'SYSTEM')) { return d_cursor }
		else { throw new Meteor.Error('accessDenied', '用戶權限不足 @ OrgRole.getOrgRole, requester: '+this.userId) }
	});
}

export const OrgRoleList = new ValidatedMethod({
	name: 'OrgRole.list',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate() { },
	run() {
		if (Meteor.isServer) {
			try {
				const a= OrgRole.find().fetch();
				return a.map((v) => {return {"id": v._id, "role": v.role + '.' + v.org }});
			}
			catch(err) { throw new Meteor.Error('list-fetch-failed', err.message) }
		}
	}
});

export const getOrgList = new ValidatedMethod({
	name: 'OrgRole.getOrgList',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate() { },
	run() {
		if (Meteor.isServer) {
			try {
				const a= OrgRole.rawCollection().distinct("org");
				console.log(a)
				return a
			}
			catch(err) { throw new Meteor.Error('list-fetch-failed', err.message) }
		}
	}
});

export default OrgRole;
