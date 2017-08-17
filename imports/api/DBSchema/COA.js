import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';

import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';

import { CallPromiseMixin } from 'meteor/didericis:callpromise-mixin';

const CoA = new Mongo.Collection('CoA');

export const CoASchema = {
	code: {type: Number, unique: true, label: '科目編號'},
	desc: {type: String, label: '內容'},
	acctType: {type: String, label: '科目屬性', allowedValues: ['BS', 'PL']},
	isDebit: {type: Boolean, label: 'Debit?'},
	subcat1: {type: String, label: '科目分類1', allowedValues: ['BANK', 'AR', 'AP', 'INV', 'LOAN', 'PREPAY-IN', 'PREPAY-OUT', 'FA', 'FA-DEPRE', 'ACCRUAL', 'OTHER-BS', 'GP', 'OPEX', 'OTHER-PL', 'TAX', 'PL-DEPRE'] },
	subcat2: {type: String, label: '科目分類2'},
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

export const CoAView = {
	_id: 'sysID',
	code: 'text',
  	desc: 'text',
	acctType: 'list',
	isDebit: 'boolean',
	subcat1: 'list',
	subcat2: 'text',
	isActive: 'boolean',
	createAt: 'date',
	inactiveAt: 'date',
};

const publishSpec = [
	{ 'name': 'CoA.ALL', 'filter': {}}
];

CoA.attachSchema(new SimpleSchema(CoASchema));

export const newCoA = new ValidatedMethod({
	name: 'CoA.newCoA',
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
				const a = CoA.insert(args);
				return CoA.findOne({_id: a}, {fields: {'code': 1}}).code
			}
			catch(err) { throw new Meteor.Error('insert-failed', err.message) }
		}
	}
});

export const updateCoA = new ValidatedMethod({
	name: 'CoA.updateCoA',
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
				console.log(filter, args)
				const a = CoA.update(filter, {$set: args});
				return '更新了'+a+'張文件';
			}
			catch(err) { throw new Meteor.Error('update-failed', err.message)}
		}
	}
});

export const deleteCoA = new ValidatedMethod({
	name: 'CoA.deleteCoA',
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
				const a= CoA.remove(args);
				return '移除了'+a+'張文件';
			 }
			catch(err) { throw new Meteor.Error('delete-failed', err.message) }
		}
	}
});

export const downloadCoA = new ValidatedMethod({
	name: 'CoA.downloadCoA',
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
			try { return CoA.find(Object.assign({}, publishSpec.find((i) => { return i.name===query }).filter, filter)).fetch() }
			catch(err) { throw new Meteor.Error('download-failed', err.message) }
		}
	}
});

export const qtyCoA = new ValidatedMethod({
	name: 'CoA.qtyCoA',
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
			try { return CoA.find(Object.assign({}, publishSpec.find((i) => { return i.name===query }).filter, filter)).count() }
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
			return CoA.find(f, { sort: args.sort, limit: lim } );
		});
	});

	Meteor.publish('CoA.getCoA', function({docId, filter}) {
		let d_cursor;
		if ((filter===undefined)||(filter===null)) { d_cursor = CoA.find({_id: docId}) }
		else { d_cursor = CoA.find({_id: docId}, {fields: filter}) }

		if (Roles.userIsInRole(this.userId, 'admin', 'SYSTEM')) { return d_cursor }
		else { throw new Meteor.Error('accessDenied', '用戶權限不足 @ CoA.getCoA, requester: '+this.userId) }
	});
}

export const CoAList = new ValidatedMethod({
	name: 'CoA.list',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate() { },
	run() {
		if (Meteor.isServer) {
			try {
				const a= CoA.find({isActive: true}, {fields: {"code": 1, "desc": 1}}).fetch();
				return a.map((v) => {return {_id: v._id, name: v.code + ' - ' + v.desc }});
			}
			catch(err) { throw new Meteor.Error('list-fetch-failed', err.message) }
		}
	}
});

export default CoA;
