import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';

import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';

import { CallPromiseMixin } from 'meteor/didericis:callpromise-mixin';

const Business = new Mongo.Collection('business');

export const BusinessSchema = {
	code: {type: String, unique: true, min: 3, max: 12, label: '業務編號'},
	desc: {type: String, label: '業務內容'},
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
}

export const BusinessView = {
	_id: 'sysID',
	code: 'text',
  	desc: 'text',
	isActive: 'boolean',
	createAt: 'date',
	inactiveAt: 'date',
};

const publishSpec = [
	{ 'name': 'business.ALL', 'filter': {}},
	{ 'name': 'business.isActive', 'filter': { isActive: true }}
];

Business.attachSchema(new SimpleSchema(BusinessSchema));

export const newBusiness = new ValidatedMethod({
	name: 'Business.newBusiness',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkRoles: {
		roles: ['system.admin'],
		rolesError: { error: 'accessDenied', message: '用戶權限不足'}
	},
	checkLoggedInError: { error: 'notLoggedIn', message: '用戶未有登入'},
	validate() {},
	run(args) {
		if (Meteor.isServer) {
			try { return Business.insert(args) }
			catch(err) { return err }
		}
	}
});

export const updateBusiness = new ValidatedMethod({
	name: 'Business.updateBusiness',
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
				const a = Business.update(filter, {$set: args});
				return Business.find(filter, {fields: {code: 1}}).fetch();
			}
			catch(err) { return err }
		}
	}
});

export const deleteBusiness = new ValidatedMethod({
	name: 'Business.deleteBusiness',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkRoles: {
		roles: ['system.admin'],
		rolesError: { error: 'accessDenied', message: '用戶權限不足'}
	},
	checkLoggedInError: { error: 'notLoggedIn', message: '用戶未有登入'},
	validate() {},
	run(args) {
		if (Meteor.isServer) {
			try { return Business.remove(args) }
			catch(err) { return err }
		}
	}
});

export const downloadBusiness = new ValidatedMethod({
	name: 'Business.downloadBusiness',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: { error: 'notLoggedIn', message: '用戶未有登入'},
	validate() {},
	run({query, filter}) {
		if (Meteor.isServer) {
			try { return Business.find(Object.assign({}, publishSpec.find((i) => { return i.name===query }).filter, filter)).fetch() }
			catch(err) { return err }
		}
	}
});

export const qtyBusiness = new ValidatedMethod({
	name: 'Business.qtyBusiness',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: { error: 'notLoggedIn', message: '用戶未有登入'},
	validate() {},
	run({query, filter}) {
		if (Meteor.isServer) {
			try { return Business.find(Object.assign({}, publishSpec.find((i) => { return i.name===query }).filter, filter)).count() }
			catch(err) { return err }
		}
	}
});

if (Meteor.isServer) {
	publishSpec.forEach((spec) => {
		Meteor.publish(spec.name, function(args) {
			const lim = (args.limit > 65535) ? 65535 : args.limit;
			const f = Object.assign({}, spec.filter, args.filter);
			return Business.find(f, { sort: args.sort, limit: lim } );
		});
	});

	Meteor.publish('business.getBusiness', function(docId) {
		const d_cursor = Business.find({_id: docId});
		if (Roles.userIsInRole(this.userId, 'system.admin')) { return d_cursor }
		else { throw new Meteor.Error('accessDenied', '用戶權限不足 @ business.getBusiness', "Owner:"+doc.userId+', requester: '+this.userId) }
	});
}

export const businessList = new ValidatedMethod({
	name: 'business.list',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate() { },
	run() {
		if (Meteor.isServer) {
			try { return Business.find({isActive: true}, {fields: {"code": 1}}).fetch() }
			catch(err) { return err }
		}
	}
});

export default Business;
