import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random'

import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';

import { CallPromiseMixin } from 'meteor/didericis:callpromise-mixin';

const acctJournal = new Mongo.Collection('acct_journal');

export const acctJournalSchema = {
	batchId: {type: Number, label: '記錄編號'},
	batchDesc: { type: String, label: '記錄原因' },
	journalDate: {type: Date, label: '記錄日期'},

	userId: {type: String, label: '記錄用戶', regEx: SimpleSchema.RegEx.Id},
	userName: {type: String, label: '記錄用戶名稱'},

	organization: {type: String, label: '記錄所屬公司', min: 1},
	projectId: { type: String, label: '所屬項目', optional: true, regEx: SimpleSchema.RegEx.Id },
	projectCode: {type: String, label: '項目名稱', optional: true},
	businessId: { type: String, label: '所屬業務', optional: true, regEx: SimpleSchema.RegEx.Id },
	businessCode: {type: String, label: '業務名稱', optional: true},
	relatedDocType: {type: String, label: '相關文件種類', optional: true},
	relatedDocId: {type: String, label: '相關文件編號', optional: true, regEx: SimpleSchema.RegEx.Id},

	COAId: { type: String, label: '記錄科目', regEx: SimpleSchema.RegEx.Id },
	COADesc: { type: String, label: '科目名稱' },
	COAAcctType: { type: String, label: '科目種類', allowedValues: ['BS', 'PL'] },
	COAisDebit: {type: Boolean, label: 'Debit?'},
	COAsubcat1: {type: String, label: '科目分類1', allowedValues: ['BANK', 'AR', 'AP', 'INV', 'LOAN', 'PREPAY-IN', 'PREPAY-OUT', 'FA', 'FA-DEPRE', 'ACCRUAL', 'OTHER-BS', 'GP', 'OPEX', 'OTHER-PL', 'TAX', 'PL-DEPRE'] },
	COAsubcat2: {type: String, label: '科目分類2', optional: true},

	fiscalYear: { type: Number, label: '會計年度' },
	fiscalPeriod: { type: Number, label: '會計期間' },

	journalType: { type: String, label: '記錄類別', min: 3, max: 3},

	journalDesc: { type: String, label: '個別記錄原因', optional: true },
	EXCurrency: { type: String, label: '貨幣', min: 3, max: 3 },
	EXRate: {type: Number, decimal: true, label: '匯率', min: 0, defaultValue: 1 },
	EXAmt: { type: Number, decimal: true, label: '外幣金額' },
	amt: { type: Number, label: '結算金額', decimal: true, autoValue: function() {
		if ((this.field("EXRate").isSet)&(this.field("EXAmt").isSet)) {
			return this.field("EXRate") * this.field("EXAmt")
		}
	}},
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
}

export const acctJournalView = {
	'_id': 'sysID',
	'batchId': 'numID',
	'batchDesc': 'longText',
	'journalDate': 'date',
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
	'relatedDocType': 'text',
	'relatedDocId': 'sysID',
	'COAId': 'sysID',
	'COADesc': 'longText',
	'COA': {type: 'autocomplete', key: 'COADesc', value: 'COAId', link: { 'q': 'CoA.list', 'text': "name", "value": "_id" }},
	'COAAcctType': 'text',
	'COAisDebit': 'boolean',
	'COAsubcat1': 'text',
	'COAsubcat2': 'text',

	'fiscalYear': 'integer',
	'fiscalPeriod': 'integer',
	'journalType': 'text',
	'journalDesc': 'longText',
	'EXCurrency': 'text',
	'EXRate': 'decimal',
	'EXAmt': 'currency',
	'amt': 'currency',
	'supportDoc': 'url',
	'createAt': 'datetime',
};

const publishSpec = [
	{ 'name': 'acct_journal.ALL', 'filter': {_id: {$ne : 'autoincrement'}}},
	{ 'name': 'acct_journal.MTDPL', 'filter': { fiscalYear: 'XXX', fiscalPeriod: 'XXX', COAAcctType: 'PL' }},
	{ 'name': 'acct_journal.YTDPL', 'filter': { fiscalYear: 'XXX', COAAcctType: 'PL' }},
	{ 'name': 'acct_journal.MTDBS', 'filter': { fiscalYear: 'XXX', fiscalPeriod: 'XXX', COAAcctType: 'BS' }},
	{ 'name': 'acct_journal.YTDBS', 'filter': { fiscalYear: 'XXX', COAAcctType: 'BS' }}
];

const doAutoincrement = (collection, callback) => { collection.rawCollection().findAndModify( { _id: 'autoincrement' }, [], { $inc: { value: 1 } }, { 'new': true }, callback) }
const nextAutoincrement = function() { return Meteor.wrapAsync(doAutoincrement)(acctJournal).value.value }

acctJournal.attachSchema(new SimpleSchema(acctJournalSchema));

export const newAcctJournal = new ValidatedMethod({
	name: 'acctJournal.new',
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
				const a = acctJournal.insert(d);
				return acctJournal.findOne({_id: a}, {fields: {'_id': 1}})._id
			}
			catch (err) { throw new Meteor.Error('insert-failed', err.message) }
		}
	}
});

export const updateAcctJournal = new ValidatedMethod({
	name: 'acctJournal.update',
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
	validate({filter, args}) { },
	run({filter, args}) {
		if (Meteor.isServer) {
			try {
				const a = acctJournal.update(filter, {$set: args});
				return '更新了'+a+'張文件';
			}
			catch(err) { throw new Meteor.Error('update-failed', err.message) }
		}
	}
});

export const deleteAcctJournal = new ValidatedMethod({ //only admin can delete doc
	name: 'acctJournal.delete',
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
				const a = acctJournal.remove(args);
				return '移除了'+a+'張文件';
			}
			catch(err) { throw new Meteor.Error('delete-failed', err.message) }
		}
	}
});

export const downloadAcctJournal = new ValidatedMethod({
	name: 'acctJournal.download',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate() { },
	run({query, filter}) {
		if (Meteor.isServer) {
			try { return acctJournal.find(Object.assign({}, publishSpec.find((i) => { return i.name===query }).filter, filter)).fetch() }
			catch(err) { throw new Meteor.Error('download-failed', err.message) }
		}
	}
});

export const qtyAcctJournal = new ValidatedMethod({
	name: 'acctJournal.qty',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate() { },
	run({query, filter}) {
		if (Meteor.isServer) {
			try { return acctJournal.find(Object.assign({}, publishSpec.find((i) => { return i.name===query }).filter, filter)).count() }
			catch(err) { throw new Meteor.Error('qty-failed', err.message) }
		}
	}
});

if (Meteor.isServer) {
	//init autoincrement for doc num
	try { acctJournal.insert({_id: 'autoincrement', value: 0}); } catch(err) { }

	publishSpec.forEach((spec) => { //publish all publishSpec
		Meteor.publish(spec.name, function(args) {
			if (Object.keys(spec.filter).includes('userId')) { spec.filter['userId'] = this.userId } //Assume if filter contains userId, it must be filter by this.userId.  Change if needed
			let lim = 65535;
			if (args.limit === undefined) { }
			else { lim = (args.limit > 65535) ? 65535 : args.limit }
			const f = Object.assign({}, spec.filter, args.filter);
			return acctJournal.find(f, { sort: args.sort, limit: lim } );
		});
	});

	//this method need to be adjusted if it has userId as a field.
	Meteor.publish('acctJournal.getAcctJournal', function({docId, filter}) {
		let d_cursor;
		if ((filter===undefined)||(filter===null)) { d_cursor = acctJournal.find({_id: docId}) }
		else { d_cursor = acctJournal.find({_id: docId}, {fields: Object.assign({}, filter, {userId:1}) }) }

		return d_cursor;
	});
}

export default acctJournal;

//Schema specific methods as below
