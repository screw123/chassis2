import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';

import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';

import { CallPromiseMixin } from 'meteor/didericis:callpromise-mixin';

const ClaimsHistory = new Mongo.Collection('claimsHistory');

export const ClaimsHistorySchema = {
	docId: {type: String, label: '文件編碼', regEx: SimpleSchema.RegEx.Id},
	docNum: {type: Number, label: '單號'},
	userId: {type: String, label: '用戶編號', regEx: SimpleSchema.RegEx.Id},
	userName: {type: String, label: '用戶名稱'},
	event: {type: String, label: '事件'},
	happenAt: {type: Date, label: '事件日期', optional: true, autoValue: function() {
		if (this.isInsert) { return new Date()}
    }},
	docLog: {type: String, label: '文件存檔'}
}

export const ClaimsHistoryView = {
	'_id': 'sysID',
	'docId': 'text',
	'docNum': 'numID',
	'userId': 'user',
	'userName': 'text',
	'user': {key: 'userName', value: 'userId', 'link': { 'q': 'user.list', 'text': "userName", "value": "_id" } },
	'event': 'longText',
	'happenAt': 'datetime',
	'docLog': 'longText',
};

const publishSpec = [
	{ 'name': 'claimsHistory.ALL', 'filter': { } },
];

ClaimsHistory.attachSchema(new SimpleSchema(ClaimsHistorySchema));

export const newClaimsHistory = new ValidatedMethod({
	name: 'ClaimsHistory.new',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate(args) { },
	run(args) {
		if (Meteor.isServer) {
			try {
				const a = Claims.insert(args);
				return true; //All history collections will only return true for success and false for fail
			}
			catch (err) { return false }
		}
	}
})
//History collection does not allow update

export const deleteClaimsHistory = new ValidatedMethod({
	name: 'ClaimsHistory.delete',
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
				const a = ClaimsHistory.remove(args);
				return true;
			}
			catch(err) { return false; }
		}
	}
});

export const downloadClaimsHistory = new ValidatedMethod({
	name: 'ClaimsHistory.download',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate() { },
	run({query, filter}) {
		if (Meteor.isServer) {
			try { return ClaimsHistory.find(Object.assign({}, publishSpec.find((i) => { return i.name===query }).filter, filter)).fetch() }
			catch(err) { throw new Meteor.Error('download-failed', err.message) }
		}
	}
});

export const qtyClaimsHistory = new ValidatedMethod({
	name: 'ClaimsHistory.qty',
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
	publishSpec.forEach((spec) => { //publish all publishSpec
		Meteor.publish(spec.name, function(args) {
			if (Object.keys(spec.filter).includes('userId')) { spec.filter['userId'] = this.userId } //Assume if filter contains userId, it must be filter by this.userId.  Change if needed
			let lim = 65535
			if (args.limit === undefined) { }
			else { lim = (args.limit > 65535) ? 65535 : args.limit }
			const f = Object.assign({}, spec.filter, args.filter);
			return ClaimsHistory.find(f, { sort: args.sort, limit: lim } );
		});
	});

	Meteor.publish('ClaimsHistory.getClaimsHistory', function(docId) { //this requires admin, because this method only for use in editing document.  Only admin can edit history.
		const d_cursor = ClaimsHistory.find({_id: docId});
		if (Roles.userIsInRole(this.userId, 'admin', 'SYSTEM')) { return d_cursor }
		else { throw new Meteor.Error('accessDenied', '用戶權限不足 @ ClaimsHistory.getClaimsHistory, requester: '+this.userId) }
	});
}

export default ClaimsHistory;
