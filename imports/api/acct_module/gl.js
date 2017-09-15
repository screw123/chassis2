import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random'
import { check } from 'meteor/check'

import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';

import { CallPromiseMixin } from 'meteor/didericis:callpromise-mixin';

import { tableHandles } from '../../api/DBSchema/DBTOC.js';

import { roundDollar } from '../helper.js';

const doAutoincrement = (collection, callback) => { collection.rawCollection().findAndModify( { _id: 'autoincrement' }, [], { $inc: { value: 1 } }, { 'new': true }, callback) }
const acctJournalNextAutoincrement = function() { return Meteor.wrapAsync(doAutoincrement) (tableHandles('acctJournal')['main']).value.value }


//Schema specific methods as below
export const postNewJournal = new ValidatedMethod({
	name: 'acctJournal.postNewJournal',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate({batchDesc, journalDate, userId, organization, projectId, businessId, journalType, fiscalYear, fiscalPeriod, entries}) {
		//entries: [{COAId, journalDesc, ExCurrency, EXRate, EXAmt, supportDoc, relatedDocType, relatedDocId}]
		try {
			check(batchDesc, String);
			if (batchDesc.length < 5) { throw new Error() }
		} catch(e) { throw new Meteor.Error('請正確填寫記錄原因') }
		try {
			check(journalDate, Date);
		} catch(e) { throw new Meteor.Error('請正確填寫記錄日期') }

		try {
			check(userId, String);
			if (Roles.userIsInRole(this.userId, 'admin', 'SYSTEM')) {}
			else { if (this.userId != userId) { throw new Meteor.Error('你的用戶不等於條目的創建用戶') } }
		} catch(e) { throw new Meteor.Error(e) }

		try {
			check(organization, String);
		} catch(e) { throw new Meteor.Error('請正確填寫所屬公司') }

		try {
			check(projectId, String);
		} catch(e) { throw new Meteor.Error('請正確填寫項目') }
		try {
			check(businessId, String);
		} catch(e) { throw new Meteor.Error('請正確填寫業務') }

		try { check(fiscalYear, Number) }
		catch(e) { throw new Meteor.Error('請正確填寫會計年度') }
		try { check(fiscalPeriod, Number) }
		catch(e) { throw new Meteor.Error('請正確填寫會計月份') }

		try {
			check(entries, [Match.Any]);
		} catch(e) { throw new Meteor.Error('請提供正確簿記內容') }
	},
	run({batchDesc, journalDate, userId, organization, projectId, businessId, journalType, fiscalYear, fiscalPeriod, entries}) {
		if (Meteor.isServer) {
			let newEntries = [];
			try {
				if (entries.length < 2) { throw new Meteor.Error('請提供正確簿記內容, 會計項目少於2條') }
				for (a of entries) {
					check(a, {COAId: String, journalDesc: String, EXCurrency: String, EXRate: Number, EXAmt: Number, supportDoc: String, relatedDocType: String, relatedDocId: String})
				}
				const coaList = tableHandles('CoA')['main'].find({_id: {$in: _.map(entries, 'COAId')}, isActive: true}).fetch();
				let balance = 0;
				for (a of entries) {
				//entries: [{COAId, journalDesc, EXCurrency, EXRate, EXAmt, supportDoc, relatedDocType, relatedDocId}]
					let acct = coaList.find((v) => {
						return v['_id'] == a['COAId']
					})
					if (acct===undefined) { throw new Meteor.Error('請提供正確簿記內容, 找不到科目, 或科目已被停用')}
					let amt = roundDollar(a.EXRate * a.EXAmt);
					balance = balance + (amt * (acct.isDebit ? 1 : -1))
					newEntries.push({
						COAId: a.COAId,
						COADesc: acct.desc,
						COAAcctType: acct.acctType,
						COAisDebit: acct.isDebit,
						COAsubcat1: acct.subcat1,
						COAsubcat2: acct.subcat2,
						relatedDocType: a.relatedDocType,
						relatedDocId: a.relatedDocId,
						journalDesc: a.journalDesc,
						EXCurrency: a.EXCurrency,
						EXRate: a.EXRate,
						EXAmt: a.EXAmt,
						amt: amt,
						supportDoc: a.supportDoc
					})
				}
				if ((balance < -0.001) || (balance > 0.001)) { throw new Meteor.Error('請提供正確簿記內容, Debit/Credit 不相等') }

				const projectCode = tableHandles('project')['main'].findOne(projectId).code
				const businessCode = tableHandles('business')['main'].findOne(businessId).code
				let u = Meteor.users.findOne(userId);
				const userName = u.profile.firstName + ' ' + u.profile.lastName;

				//newEntries prepped in validate stage
				const batchId = acctJournalNextAutoincrement();
				console.log(batchId);
				for (a of newEntries) {
					let d = Object.assign({}, {
						batchId: batchId,
						batchDesc: batchDesc,
						journalDate: journalDate,
						userId: userId,
						userName: userName,
						organization: organization,
						projectId: projectId,
						projectCode: projectCode,
						businessId: businessId,
						businessCode: businessCode,
						fiscalYear: fiscalYear,
						fiscalPeriod: fiscalPeriod,
						journalType: journalType,
						COAId: a.COAId,
						COADesc: a.COADesc,
						COAAcctType: a.COAAcctType,
						COAisDebit: a.COAisDebit,
						COAsubcat1: a.COAsubcat1,
						COAsubcat2: a.COAsubcat2,
						relatedDocType: a.relatedDocType,
						relatedDocId: a.relatedDocId,
						journalDesc: a.journalDesc,
						EXCurrency: a.EXCurrency,
						EXRate: a.EXRate,
						EXAmt: a.EXAmt,
						amt: a.amt,
						supportDoc: a.supportDoc
					})
					console.log(d)
					let q = tableHandles('acctJournal')['main'].insert(d)
				}
				return batchId
			}
			catch(err) { throw new Meteor.Error('insert-failed', err.message) }
		}
	}
});

export const postReverseJournal = new ValidatedMethod({
	name: 'acctJournal.postReverseJournal',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate({batchNo, journalDate, fiscalYear, fiscalPeriod, reason}) {
		try {
			const batchCount = tableHandles('acctJournal')['main'].find({batchId: batchNo}).count
			if (batchCount < 1) { throw new Meteor.Error('記錄編號錯誤, 編號不存在') }

			try {
				check(journalDate, Date);
			} catch(e) { throw new Meteor.Error('請正確填寫記錄日期') }
			try { check(fiscalYear, Number) }
			catch(e) { throw new Meteor.Error('請正確填寫會計年度') }
			try { check(fiscalPeriod, Number) }
			catch(e) { throw new Meteor.Error('請正確填寫會計月份') }
			try {
				check(reason, String);
				if (reason.length < 5) { throw new Error() }
			} catch(e) { throw new Meteor.Error('請正確填寫記錄原因') }
		} catch(e) { throw new Meteor.Error(e) }
	},
	run({batchNo, journalDate, fiscalYear, fiscalPeriod, reason}) {
		if (Meteor.isServer) {
			try {
				const batchEntries = tableHandles('acctJournal')['main'].find({batchId: batchNo}).fetch()
				for (a of batchEntries) {
					const batchId = acctJournalNextAutoincrement();
					let d = Object.assign(a, {
						batchId: batchId,
						journalDate: ((journalDate===undefined) ? new Date() : journalDate),
						fiscalYear: ((fiscalYear===undefined)? '2017': fiscalYear),
						fiscalPeriod: ((fiscalPeriod===undefined)? '9': fiscalPeriod),
						batchDesc: 'Reversal of batch #' + batchNo + ((reason===undefined)? ', reason: ' + reason : '')
					})

				}

				console.log(batchId);
				for (a of newEntries) {
					let d = Object.assign({}, {
						batchId: batchId,
						batchDesc: batchDesc,
						journalDate: journalDate,
						userId: userId,
						userName: userName,
						organization: organization,
						projectId: projectId,
						projectCode: projectCode,
						businessId: businessId,
						businessCode: businessCode,
						fiscalYear: fiscalYear,
						fiscalPeriod: fiscalPeriod,
						journalType: journalType,
						COAId: a.COAId,
						COADesc: a.COADesc,
						COAAcctType: a.COAAcctType,
						COAisDebit: a.COAisDebit,
						COAsubcat1: a.COAsubcat1,
						COAsubcat2: a.COAsubcat2,
						relatedDocType: a.relatedDocType,
						relatedDocId: a.relatedDocId,
						journalDesc: a.journalDesc,
						EXCurrency: a.EXCurrency,
						EXRate: a.EXRate,
						EXAmt: a.EXAmt,
						amt: a.amt,
						supportDoc: a.supportDoc
					})
					console.log(d)
					let q = tableHandles('acctJournal')['main'].insert(d)
				}
				return batchId
			}
			catch(err) { throw new Meteor.Error('insert-failed', err.message) }
		}
	}
});
