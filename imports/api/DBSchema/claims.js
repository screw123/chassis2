import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';

import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';

import { CallPromiseMixin } from 'meteor/didericis:callpromise-mixin';

const Claims = new Mongo.Collection('claims');

export const ClaimSchema = {
	docNum: {type: Number, label: '單號', unique: true, optional: true},
  	userId: {type: String, label: '用戶', regEx: SimpleSchema.RegEx.Id},
	userName: {type: String, label: '用戶名稱'},
	claimDate: {type: Date, label: '單據日期'},
	createAt: {type: Date, label: '報銷日期', optional: true, autoValue: function() {
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
    }},
	projectId: { type: String, label: '所屬項目', optional: true, regEx: SimpleSchema.RegEx.Id },
	projectCode: {type: String, label: '項目名稱'},
	businessId: { type: String, label: '所屬業務', optional: true, regEx: SimpleSchema.RegEx.Id },
	businessCode: {type: String, label: '業務名稱'},
	claimDesc: { type: String, label: '報銷原因', min: 5 },
	totalClaimAmt: { type: Number, label: '總報銷金額', decimal: true },
	statusCode: { type: Number, label: '狀態' },
	statusDesc: { type: String, label: '狀態內容' },
	doc: { type: String, label: '上傳檔案', regEx: SimpleSchema.RegEx.Url},
	content: { type: [Object], minCount: 1},
	"content.$.sequence": { type: Number, label: '行序', defaultValue: 1 },
	"content.$.COAId": { type: String, label: '報銷科目ID', regEx: SimpleSchema.RegEx.Id },
	"content.$.COADesc": { type: String, label: '報銷科目' },
	"content.$.amt": { type: Number, decimal: true, label: '報銷金額', defaultValue: 0, min: 0 },
	"content.$.EXCurrency": { type: String, label: '貨幣', min: 3, max: 3, optional: true },
	"content.$.EXRate": {type: Number, decimal: true, label: '匯率', min: 0, defaultValue: 1},
	"content.$.EXAmt": { type: Number, decimal: true, label: '外幣金額', defaultValue: 0, min: 0 },
	"content.$.Remarks": { type: String, label: '條目備注', optional: true }
}

export const ClaimsView = {
	'_id': 'sysID',
	'docNum': 'numID',
	'userId': 'user',
	'userName': 'text',
	'user': {key: 'userName', value: 'userId', 'link': { 'q': 'user.list', 'text': "userName", "value": "_id" } },
	'claimDate': 'date',
	'createAt': 'date',
	'lastUpdate': 'datetime',
	'projectId': 'sysID',
	'projectCode': 'text',
	'project': {key: 'projectCode', value: 'projectId', 'link': { 'q': 'project.list', 'text': "code", "value": "_id" } },
	'businessId': 'sysID',
	'businessCode': 'text',
	'business': {key: 'businessCode', value: 'businessId', 'link': { 'q': 'business.list', 'text': "code", "value": "_id" }},
	'claimDesc': 'longText',
	'totalClaimAmt': 'currency',
	'statusCode': 'status',
	'statusDesc': 'text',
	'status': {key: 'statusDesc', value: 'statusCode', 'link': { 'q': 'status.list', 'text': "desc", "value": "code" }},
	'doc': 'url',
	'content.$.sequence': 'numID',
	'content.$.COAId': 'sysID',
	'content.$.COADesc': 'longText',
	'content.$.COA': {key: 'content.$.COADesc', value: 'content.$.COAId', link: { 'q': 'CoA.list', 'text': "name", "value": "_id" }},
	'content.$.amt': 'currency',
	'content.$.EXCurrency': 'text',
	'content.$.EXRate': 'decimal',
	'content.$.EXAmt': 'currency',
	'content.$.Remarks': 'longText'
};

const publishSpec = [
	{ 'name': 'claims.ALL', 'filter': {_id: {$ne : 'autoincrement'}}},
	{ 'name': 'claims.MyClaims', 'filter': { userId: this.userId }},
	{ 'name': 'claims.PendingApprove', 'filter': { status: 300 }},
	{ 'name': 'claims.onHold', 'filter': { status: {$gte: 600, $lt: 700} }}
];

const doAutoincrement = (collection, callback) => { collection.rawCollection().findAndModify( { _id: 'autoincrement' }, [], { $inc: { value: 1 } }, { 'new': true }, callback) }
const nextAutoincrement = function() { return Meteor.wrapAsync(doAutoincrement)(Claims).value.value }

Claims.attachSchema(new SimpleSchema(ClaimSchema));

export const newClaim = new ValidatedMethod({
	name: 'Claims.newClaim',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkRoles: {
		roles: ['staff.general'],
		rolesError: {
			error: 'accessDenied',
			message: '用戶權限不足'
		}
	},
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate(args) {
	 },
	run(args) {
		if (Meteor.isServer) {

			docNum = nextAutoincrement();
			const d = JSON.parse(JSON.stringify(Object.assign({}, args, {'docNum': docNum})));
			try {
				const a = Claims.insert(d);
				return Claims.findOne({_id: a}, {fields: {'docNum': 1}}).docNum
			}
			catch (err) {
				throw new Meteor.Error('insert-failed', err.message)

			}
		}
	}
});

export const updateClaim = new ValidatedMethod({
	name: 'Claims.updateClaim',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkRoles: {
		roles: ['staff.general'],
		rolesError: {
			error: 'accessDenied',
			message: '用戶權限不足'
		}
	},
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate({filter, args}) { },
	run({filter, args}) {
		if (Meteor.isServer) {
			try {
				const a = Claims.update(filter, {$set: args});
				return '更新了'+a+'張文件';
			}
			catch(err) { throw new Meteor.Error('update-failed', err.message) }
		}
	}
});

export const deleteClaim = new ValidatedMethod({
	name: 'Claims.deleteClaim',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkRoles: {
		roles: ['system.admin'],
		rolesError: {
			error: 'accessDenied',
			message: '用戶權限不足'
		}
	},
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate(args) { },
	run(args) {
		if (Meteor.isServer) {
			try {
				const a = Claims.remove(args);
				return '移除了'+a+'張文件';
			}
			catch(err) { throw new Meteor.Error('delete-failed', err.message) }
		}
	}
});

export const downloadClaim = new ValidatedMethod({
	name: 'Claims.downloadClaim',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate() { },
	run({query, filter}) {
		if (Meteor.isServer) {
			try { return Claims.find(Object.assign({}, publishSpec.find((i) => { return i.name===query }).filter, filter)).fetch() }
			catch(err) { throw new Meteor.Error('download-failed', err.message) }
		}
	}
});

export const qtyClaim = new ValidatedMethod({
	name: 'Claims.qtyClaim',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate() { },
	run({query, filter}) {
		if (Meteor.isServer) {
			try { return Claims.find(Object.assign({}, publishSpec.find((i) => { return i.name===query }).filter, filter)).count() }
			catch(err) { throw new Meteor.Error('qty-failed', err.message) }
		}
	}
});

if (Meteor.isServer) {
	//init autoincrement for doc num
	try { Claims.insert({_id: 'autoincrement', value: 0}); } catch(err) { }

	publishSpec.forEach((spec) => { //publish all publishSpec
		Meteor.publish(spec.name, function(args) {
			if (Object.keys(spec.filter).includes('userId')) { spec.filter['userId'] = this.userId } //Assume if filter contains userId, it must be filter by this.userId.  Change if needed
			let lim = 65535
			if (args.limit === undefined) { }
			else { lim = (args.limit > 65535) ? 65535 : args.limit }
			const f = Object.assign({}, spec.filter, args.filter);
			return Claims.find(f, { sort: args.sort, limit: lim } );
		});
	});

	//this method need to be adjusted if it has userId as a field. fixme fix all existing schema
	Meteor.publish('claims.getClaim', function({docId, filter}) {
		let d_cursor;
		if ((filter===undefined)||(filter===null)) { d_cursor = Claims.find({_id: docId}) }
		else { d_cursor = Claims.find({_id: docId}, {fields: Object.assign({}, filter, {userId:1}) }) }

		if (Roles.userIsInRole(this.userId, 'system.admin')) { return d_cursor }
		else {
			const doc = d_cursor.fetch()[0];
			if (this.userId == doc.userId) { return d_cursor }
			else { throw new Meteor.Error('accessDenied', '用戶權限不足 @ claims.getClaim, Owner:'+doc.userId+', requester: '+this.userId) }
		}
	});
}

export default Claims;
