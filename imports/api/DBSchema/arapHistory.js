import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random'
import { check } from 'meteor/check'

import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';

import { CallPromiseMixin } from 'meteor/didericis:callpromise-mixin';

const arapHistory = new Mongo.Collection('arapHistory');

export const arapHistorySchema = {
	arapId: {type: String, label: '應收/付編號', regEx: SimpleSchema.RegEx.Id},

	COAId: { type: String, label: '記錄科目', regEx: SimpleSchema.RegEx.Id },
	COADesc: { type: String, label: '科目名稱' },

	changeDesc: { type: String, label: '記錄原因', min: 1 },

	EXCurrency: { type: String, label: '貨幣', min: 3, max: 3 },
	EXRate: {type: Number, decimal: true, label: '匯率', min: 0, defaultValue: 1 },
	EXAmt: { type: Number, decimal: true, label: '外幣金額' },
	amt: { type: Number, label: '本幣總金額', decimal: true, autoValue: function() {
		if ((this.field("EXRate").isSet)&(this.field("EXAmt").isSet)) {
			return this.field("EXRate").value * this.field("EXAmt").value
		}
	}},
	latestOutstandingAmt: { type: Number, label: '本幣尚欠金額'},

	supportDoc: { type: String, label: '上傳檔案', regEx: SimpleSchema.RegEx.Url, optional: true},

	userId: {type: String, label: '記錄用戶', regEx: SimpleSchema.RegEx.Id},
	userName: {type: String, label: '記錄用戶名稱'},

	createAt: {type: Date, label: '記錄日期', optional: true, autoValue: function() {
		if (this.isInsert) {
			return new Date();
		} else if (this.isUpsert) {
			return {$setOnInsert: new Date()};
		} else {
			this.unset();
		}
	}}
}


export const arapHistoryView = {
	'_id': 'sysID',
	'arapId': 'text',

	'COAId': 'sysID',
	'COADesc': 'longText',
	'COA': {type: 'autocomplete', key: 'COADesc', value: 'COAId', link: { 'q': 'CoA.list', 'text': "name", "value": "_id" }},

	'changeDesc': 'longtext',

	'EXCurrency': 'text',
	'EXRate': 'decimal',
	'EXAmt': 'currency',
	'amt': 'currency',
	'latestOutstandingAmt': 'currency',

	'supportDoc': 'url',
	'userId': 'user',
	'userName': 'text',
	'user': {type: 'autocomplete', key: 'userName', value: 'userId', 'link': { 'q': 'user.list', 'text': "userName", "value": "_id" } },

	'createAt': 'datetime',
};

const publishSpec = [
	{ 'name': 'arapHistory.ALL', 'filter': {}}
];


arapHistory.attachSchema(new SimpleSchema(arapHistorySchema));

export const newArapHistory = new ValidatedMethod({
	name: 'arapHistory.new',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: { error: 'notLoggedIn', message: '用戶未有登入'},
	validate() {},
	run(args) {
		if (Meteor.isServer) {
			try {
				const a = arapHistory.insert(args);
				return arapHistory.findOne({_id: a}, {fields: {'_id': 1}})._id
			}
			catch(err) { throw new Meteor.Error('insert-failed', err.message) }
		}
	}
});

export const updateArapHistory = new ValidatedMethod({
	name: 'arapHistory.update',
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
				const a = arapHistory.update(filter, {$set: args});
				return '更新了'+a+'張文件';
			}
			catch(err) { throw new Meteor.Error('update-failed', err.message)}
		}
	}
});

export const deleteArapHistory = new ValidatedMethod({
	name: 'arapHistory.delete',
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
				const a= arapHistory.remove(args);
				return '移除了'+a+'張文件';
			 }
			catch(err) { throw new Meteor.Error('delete-failed', err.message) }
		}
	}
});

export const downloadArapHistory = new ValidatedMethod({
	name: 'arapHistory.download',
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
			try { return arapHistory.find(Object.assign({}, publishSpec.find((i) => { return i.name===query }).filter, filter)).fetch() }
			catch(err) { throw new Meteor.Error('download-failed', err.message) }
		}
	}
});

export const qtyArapHistory = new ValidatedMethod({
	name: 'arapHistory.qty',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: { error: 'notLoggedIn', message: '用戶未有登入'},
	validate() {},
	run({query, filter}) {
		if (Meteor.isServer) {
			try { return arapHistory.find(Object.assign({}, publishSpec.find((i) => { return i.name===query }).filter, filter)).count() }
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
			return arapHistory.find(f, { sort: args.sort, limit: lim } );
		});
	});

	Meteor.publish('arapHistory.getArapHistory', function({docId, filter}) {
		let d_cursor;
		if ((filter===undefined)||(filter===null)) { d_cursor = arapHistory.find({_id: docId}) }
		else { d_cursor = arapHistory.find({_id: docId}, {fields: filter}) }
		return d_cursor;
	});
}

export default arapHistory;
