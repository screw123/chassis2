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
	validate({batchDesc, journalDate, userId, organization, projectId, businessId, journalType, fiscalPeriodId, entries}) {
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

		try { check(fiscalPeriodId, String) }
		catch(e) { throw new Meteor.Error('請正確填寫會計期') }

		try {
			check(entries, [Match.Any]);
		} catch(e) { throw new Meteor.Error('請提供正確簿記內容') }
	},
	run({batchDesc, journalDate, userId, organization, projectId, businessId, journalType, fiscalPeriodId, entries}) {
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
				const fiscalPeriodName = tableHandles('FiscalPeriod')['main'].findOne(fiscalPeriodId).name

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
						fiscalPeriodName: fiscalPeriodName,
						fiscalPeriodId: fiscalPeriodId,
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
	validate({batchNo, journalDate, fiscalPeriodId, reason}) {
		try {
			const batchCount = tableHandles('acctJournal')['main'].find({batchId: batchNo}).count
			//batchCount < 1 means no GL belongs to that batch number
			if (batchCount < 1) { throw new Meteor.Error('記錄編號錯誤, 編號不存在') }

			try {
				if (journalDate!== undefined) {check(journalDate, Date)}
			} catch(e) { throw new Meteor.Error('請正確填寫記錄日期') }
			try {
				if (fiscalYearId !== undefined) {check(fiscalYearId, String)}
			}
			catch(e) { throw new Meteor.Error('請正確填寫會計期') }
			try {
				if (reason!==undefined) {
					check(reason, String);
					if (reason.length < 5) { throw new Error() }
				}
			} catch(e) { throw new Meteor.Error('請正確填寫記錄原因') }
		} catch(e) { throw new Meteor.Error(e) }
	},
	run({batchNo, journalDate, fiscalPeriodId, reason}) {
		//batchNo is must, others are optional
		if (Meteor.isServer) {
			try {
				const batchEntries = tableHandles('acctJournal')['main'].find({batchId: batchNo}).fetch()

				const batchId = acctJournalNextAutoincrement();

				//if period is specified, use specified, otherwise reverse with current period.  after period decided, if it's undefined, throw error
				let reverseFisPeriod;
				if (fiscalPeriodId !== undefined) {
					reverseFisPeriod = tableHandles('FiscalPeriod')['main'].findOne(fiscalPeriodId)
				}
				else { reverseFisPeriod = Meteor.call('FiscalPeriod.currentPeriod') }
				if (reverseFisPeriod===undefined) { throw new Meteor.error('會計期錯誤: 提供之會計期不存在, 或沒有設置現用會計期')}

				for (a of batchEntries) {
					//fixme get the latest fiscal year/fiscal period if not specified
					let d = Object.assign(a, {
						_id: undefined,
						batchId: batchId,
						journalDate: ((journalDate===undefined) ? new Date() : journalDate),
						fiscalPeriodName: reverseFisPeriod.name,
						fiscalPeriodId: reverseFisPeriod._id,
						batchDesc: 'Reversal of batch #' + batchNo + ((reason===undefined)? (', reason: ' + reason) : '')
					})
					let q = tableHandles('acctJournal')['main'].insert(d)
				}
				return batchId
			}
			catch(err) { throw new Meteor.Error('reverse-failed', err.message) }
		}
	}
});
