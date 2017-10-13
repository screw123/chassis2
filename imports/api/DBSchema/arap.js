import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random'
import { check } from 'meteor/check'

import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';

import { CallPromiseMixin } from 'meteor/didericis:callpromise-mixin';

const arap = new Mongo.Collection('arap');

export const arapSchema = {
	arapType: {type: String, label: '應收/付類別', allowedValues: ['AR', 'AP']},

	partyId: {type: String, label: '團體', regEx: SimpleSchema.RegEx.Id},
	partyName: {type: String, label: '團體名稱'},

	invoiceDate: {type: Date, label: '帳單日期'},
	payterm: {type: String, label: '數期', allowedValues: ['COD', 'N07', 'N15', 'N30', 'N60']},
	payDueDate: {type: Date, label: '到期日期'},

	userId: {type: String, label: '記錄用戶', regEx: SimpleSchema.RegEx.Id},
	userName: {type: String, label: '記錄用戶名稱'},

	organization: {type: String, label: '記錄所屬公司', min: 1},
	projectId: { type: String, label: '所屬項目', optional: true, regEx: SimpleSchema.RegEx.Id },
	projectCode: {type: String, label: '項目名稱', optional: true},
	businessId: { type: String, label: '所屬業務', optional: true, regEx: SimpleSchema.RegEx.Id },
	businessCode: {type: String, label: '業務名稱', optional: true},

	COAId: { type: String, label: '記錄科目', regEx: SimpleSchema.RegEx.Id },
	COADesc: { type: String, label: '科目名稱' },

	relatedDocType: {type: String, label: '相關文件種類'},
	relatedDocId: {type: String, label: '相關文件編號', regEx: SimpleSchema.RegEx.Id},

	remarks: { type: String, label: '個別記錄原因', optional: true },

	EXCurrency: { type: String, label: '貨幣', min: 3, max: 3 },
	EXRate: {type: Number, decimal: true, label: '匯率', min: 0, defaultValue: 1 },
	EXAmt: { type: Number, decimal: true, label: '外幣金額' },
	amt: { type: Number, label: '本幣總金額', decimal: true, autoValue: function() {
		if ((this.field("EXRate").isSet)&(this.field("EXAmt").isSet)) {
			return this.field("EXRate").value * this.field("EXAmt").value
		}
	}},
	outstandingAmt: { type: Number, label: '本幣尚欠金額', decimal: true},
	supportDoc: { type: String, label: '上傳檔案', regEx: SimpleSchema.RegEx.Url, optional: true},

	createAt: {type: Date, label: '記錄日期', optional: true, autoValue: function() {
		if (this.isInsert) {
			return new Date();
		} else if (this.isUpsert) {
			return {$setOnInsert: new Date()};
		} else {
			this.unset();
		}
	}},
	lastUpdate: {type: Date, label: '最後更新日期', optional: true, autoValue: function() {
		if (this.isUpdate || this.isUpsert) {
			return new Date();
		} else {
			this.unset();
		}
	}}
}

export const arapView = {
	'_id': 'sysID',
	'arapType': 'text',
	'partyId': 'sysID',
	'partyName': 'text',
	'party': {type: 'autocomplete', key: 'partyName', value: 'partyId', 'link': { 'q': 'partymaster.list', 'text': "name", "value": "_id" } },

	'invoiceDate': 'date',
	'payterm': 'text',
	'payDueDate': 'date',

	'userId': 'user',
	'userName': 'text',
	'user': {type: 'autocomplete', key: 'userName', value: 'userId', 'link': { 'q': 'user.list', 'text': "userName", "value": "_id" } },

	'organization': 'foreignList',
	'projectId': 'sysID',
	'projectCode': 'text',
	'project': {type: 'autocomplete', key: 'projectCode', value: 'projectId', 'link': { 'q': 'project.list', 'text': "code", "value": "_id" } },
	'businessId': 'sysID',
	'businessCode': 'text',
	'business': {type: 'autocomplete', key: 'businessCode', value: 'businessId', 'link': { 'q': 'business.list', 'text': "code", "value": "_id" }},

	'COAId': 'sysID',
	'COADesc': 'longText',
	'COA': {type: 'autocomplete', key: 'COADesc', value: 'COAId', link: { 'q': 'CoA.list', 'text': "name", "value": "_id" }},

	'relatedDocType': 'text',
	'relatedDocId': 'text', //so it can be edited in admin panel

	'remarks': 'longText',

	'EXCurrency': 'text',
	'EXRate': 'decimal',
	'EXAmt': 'currency',
	'amt': 'currency',
	'outstandingAmt': 'currency',
	'supportDoc': 'url',
	'createAt': 'datetime',
	'lastUpdate': 'datetime'
};

const publishSpec = [
	{ 'name': 'arap.ALL', 'filter': {_id: {$ne : 'autoincrement'}}},
	{ 'name': 'arap.AROutstanding', 'filter': { arapType: 'AR', outstandingAmt: { $ne: 0}, organization: ((this.userId===undefined)? undefined : Meteor.users.findOne(this.userId).currentGroup) }},
	{ 'name': 'arap.APOutstanding', 'filter': { arapType: 'AP', outstandingAmt: { $ne: 0}, organization: ((this.userId===undefined)? undefined : Meteor.users.findOne(this.userId).currentGroup) }}
];


arap.attachSchema(new SimpleSchema(arapSchema));

export const newArap = new ValidatedMethod({
	name: 'arap.new',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate(args) {
	 },
	run(args) {
		if (Meteor.isServer) {
			//fixme check if user belongs to the organization he is claiming to
			const d = args;
			try {
				console.log(d)
				const a = arap.insert(d);
				return arap.findOne({_id: a}, {fields: {'_id': 1}})._id
			}
			catch (err) { throw new Meteor.Error('insert-failed', err.message) }
		}
	}
});


export const updateArap = new ValidatedMethod({
	name: 'arap.update',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate({filter, args}) { },
	run({filter, args}) {
		if (Meteor.isServer) {
			try {
				const a = arap.update(filter, {$set: args});
				return '更新了'+a+'張文件';
			}
			catch(err) { throw new Meteor.Error('update-failed', err.message) }
		}
	}
});

export const deleteArap = new ValidatedMethod({ //only admin can delete doc
	name: 'arap.delete',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkRoles: {
		roles: ['admin'],
		group: 'SYSTEM',
		rolesError: { error: 'accessDenied', message: '用戶權限不足'}
	},
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate(args) { },
	run(args) {
		if (Meteor.isServer) {
			try {
				const a = arap.remove(args);
				return '移除了'+a+'張文件';
			}
			catch(err) { throw new Meteor.Error('delete-failed', err.message) }
		}
	}
});

export const downloadArap = new ValidatedMethod({
	name: 'arap.download',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate() { },
	run({query, filter}) {
		if (Meteor.isServer) {
			try { return arap.find(Object.assign({}, publishSpec.find((i) => { return i.name===query }).filter, filter)).fetch() }
			catch(err) { throw new Meteor.Error('download-failed', err.message) }
		}
	}
});

export const qtyArap = new ValidatedMethod({
	name: 'arap.qty',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate() { },
	run({query, filter}) {
		if (Meteor.isServer) {
			try { return arap.find(Object.assign({}, publishSpec.find((i) => { return i.name===query }).filter, filter)).count() }
			catch(err) { throw new Meteor.Error('qty-failed', err.message) }
		}
	}
});


if (Meteor.isServer) {
	publishSpec.forEach((spec) => { //publish all publishSpec
		Meteor.publish(spec.name, function(args) {
			let lim = 65535;
			if (args.limit === undefined) { }
			else { lim = (args.limit > 65535) ? 65535 : args.limit }
			const f = Object.assign({}, spec.filter, args.filter);
			return arap.find(f, { sort: args.sort, limit: lim } );
		});
	});

	//this method need to be adjusted if it has userId as a field.
	Meteor.publish('arap.getArap', function({docId, filter}) {
		let d_cursor;
		if ((filter===undefined)||(filter===null)) { d_cursor = arap.find({_id: docId}) }
		else { d_cursor = arap.find({_id: docId}, {fields: Object.assign({}, filter) }) }
		return d_cursor;
	});

}

export default arap;
