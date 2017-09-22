import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';

import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';

import { CallPromiseMixin } from 'meteor/didericis:callpromise-mixin';

const partymaster = new Mongo.Collection('partymaster');

export const partymasterSchema = {
	name: {type: String, label: '團體名稱'},
	cusType: {type: [String], label: '團體類別'},
	isActive: {type: Boolean, label: '使用中', defaultValue: true },
	createAt: {type: Date, label: '創建日期', autoValue: function() {
		const isActive = this.field('isActive');
		if (this.isInsert || (this.isUpdate && isActive.isSet && (isActive.value == true) )) {
			return new Date();
		} else {
			this.unset();
		}
    }},
	inactiveAt: {type: Date, label: '停用日期'}
}

export const partymasterView = {
	_id: 'sysID',
	name: 'text',
	cusType: 'list',
	isActive: 'boolean',
	createAt: 'date',
	inactiveAt: 'date',
};

const publishSpec = [
	{ 'name': 'partymaster.ALL', 'filter': {}}
];

partymaster.attachSchema(new SimpleSchema(partymasterSchema));

export const newpartymaster = new ValidatedMethod({
	name: 'partymaster.new',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: { error: 'notLoggedIn', message: '用戶未有登入'},
	validate() {},
	run(args) {
		if (Meteor.isServer) {
			try {
				const a = partymaster.insert(args);
				return partymaster.findOne({_id: a}, {fields: {'name': 1}}).name
			}
			catch(err) { throw new Meteor.Error('insert-failed', err.message) }
		}
	}
});

export const updatePartymaster = new ValidatedMethod({
	name: 'partymaster.update',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: { error: 'notLoggedIn', message: '用戶未有登入'},
	validate() {},
	run({filter, args}) {
		if (Meteor.isServer) {
			try {
				console.log(filter, args)
				const a = partymaster.update(filter, {$set: args});
				return '更新了'+a+'張文件';
			}
			catch(err) { throw new Meteor.Error('update-failed', err.message)}
		}
	}
});

export const deletePartymaster = new ValidatedMethod({
	name: 'partymaster.delete',
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
				const a= partymaster.remove(args);
				return '移除了'+a+'張文件';
			 }
			catch(err) { throw new Meteor.Error('delete-failed', err.message) }
		}
	}
});

export const downloadPartymaster = new ValidatedMethod({
	name: 'partymaster.download',
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
			try { return partymaster.find(Object.assign({}, publishSpec.find((i) => { return i.name===query }).filter, filter)).fetch() }
			catch(err) { throw new Meteor.Error('download-failed', err.message) }
		}
	}
});

export const qtyPartymaster = new ValidatedMethod({
	name: 'partymaster.qty',
	mixins:  [LoggedInMixin, CallPromiseMixin],

	checkLoggedInError: { error: 'notLoggedIn', message: '用戶未有登入'},
	validate() {},
	run({query, filter}) {
		if (Meteor.isServer) {
			try { return partymaster.find(Object.assign({}, publishSpec.find((i) => { return i.name===query }).filter, filter)).count() }
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
			return partymaster.find(f, { sort: args.sort, limit: lim } );
		});
	});

	Meteor.publish('partymaster.getPartymaster', function({docId, filter}) {
		let d_cursor;
		if ((filter===undefined)||(filter===null)) { d_cursor = partymaster.find({_id: docId}) }
		else { d_cursor = partymaster.find({_id: docId}, {fields: filter}) }

		return d_cursor;
	});
}

export const partymasterList = new ValidatedMethod({
	name: 'partymaster.list',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate() { },
	run() {
		if (Meteor.isServer) {
			try {
				const a= partymaster.find({isActive: true}, {fields: {"_id": 1, "name": 1}}).fetch();
				return a.map((v) => {return {_id: v._id, name: v.name }});
			}
			catch(err) { throw new Meteor.Error('list-fetch-failed', err.message) }
		}
	}
});

export default partymaster;
