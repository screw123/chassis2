import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';

import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';

import { CallPromiseMixin } from 'meteor/didericis:callpromise-mixin';

const FiscalPeriod = new Mongo.Collection('fiscalPeriod');

export const FiscalPeriodSchema = {
	year: {type: Number, label: '會計年度'},
	period: {type: String, label: '會計期'},
	isOpen: {type: Boolean, label: '可入帳'},
	activePeriod: {type: Boolean, label: '是否現時會計期'},
}

export const FiscalPeriodView = {
	'_id': 'sysID',
	'year': 'integer',
	'period': 'text',
	'isOpen': 'boolean',
	'activePeriod': 'boolean'
}

const publishSpec = [
	{ 'name': 'FiscalPeriod.ALL', 'filter': {}},
	{ 'name': 'FiscalPeriod.currentPeriod', 'filter': {activePeriod: true}},
	{ 'name': 'FiscalPeriod.openPeriod', 'filter': {isOpen: true}},
];

FiscalPeriod.attachSchema(new SimpleSchema(FiscalPeriodSchema));

export const newFiscalPeriod = new ValidatedMethod({
	name: 'FiscalPeriod.new',
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
				const a = FiscalPeriod.insert(args);
				return FiscalPeriod.findOne({_id: a}).year+" "+OrgRole.findOne({_id: a}).period
			}
			catch(err) { throw new Meteor.Error('insert-failed', err.message) }
		}
	}
});

export const updateFiscalPeriod = new ValidatedMethod({
	name: 'FiscalPeriod.update',
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
				const a = FiscalPeriod.update(filter, {$set: args});
				return '更新了'+a+'張文件';
			}
			catch(err) { throw new Meteor.Error('update-failed', err.message)}
		}
	}
});

export const deleteFiscalPeriod = new ValidatedMethod({
	name: 'FiscalPeriod.delete',
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
				const a= FiscalPeriod.remove(args);
				return '移除了'+a+'張文件';
			 }
			catch(err) { throw new Meteor.Error('delete-failed', err.message) }
		}
	}
});

export const downloadFiscalPeriod = new ValidatedMethod({
	name: 'FiscalPeriod.download',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkRoles: {
		roles: ['admin'],
		group: 'SYSTEM',
		rolesError: { error: 'accessDenied', message: '用戶權限不足'}
	},
	checkLoggedInError: { error: 'notLoggedIn', message: '用戶未有登入'},
	validate() {},
	run({query, filter}) {
		if (Meteor.isServer) {
			try { return FiscalPeriod.find(Object.assign({}, publishSpec.find((i) => { return i.name===query }).filter, filter)).fetch() }
			catch(err) { throw new Meteor.Error('download-failed', err.message) }
		}
	}
});

export const qtyFiscalPeriod = new ValidatedMethod({
	name: 'FiscalPeriod.qty',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkRoles: {
		roles: ['admin'],
		group: 'SYSTEM',
		rolesError: { error: 'accessDenied', message: '用戶權限不足'}
	},
	checkLoggedInError: { error: 'notLoggedIn', message: '用戶未有登入'},
	validate() {},
	run({query, filter}) {
		if (Meteor.isServer) {
			try { return FiscalPeriod.find(Object.assign({}, publishSpec.find((i) => { return i.name===query }).filter, filter)).count() }
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
			return FiscalPeriod.find(f, { sort: args.sort, limit: lim } );
		});
	});

	Meteor.publish('FiscalPeriod.getFiscalPeriod', function(docId) {
		const d_cursor = FiscalPeriod.find({_id: docId});
		if (Roles.userIsInRole(this.userId, 'admin', 'SYSTEM')) { return d_cursor }
		else { throw new Meteor.Error('accessDenied', '用戶權限不足 @ FiscalPeriod.getFiscalPeriod, requester: '+this.userId) }
	});
}

export const FiscalPeriodList = new ValidatedMethod({
	name: 'FiscalPeriod.list',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate() { },
	run() {
		if (Meteor.isServer) {
			try {
				const a= FiscalPeriod.find({isOpen: true}).fetch();
				return a.map((v) => {return {"id": v._id, "period": v.year + ' ' + v.period }});
			}
			catch(err) { throw new Meteor.Error('list-fetch-failed', err.message) }
		}
	}
});

export default FiscalPeriod;
