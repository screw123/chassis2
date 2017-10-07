import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random'
import { check } from 'meteor/check'

import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { CallPromiseMixin } from 'meteor/didericis:callpromise-mixin';

import { tableHandles } from '../DBSchema/DBTOC.js';
import { roundDollar } from '../helper.js';
import { postNewJournal } from './gl.js';
import { payTerms } from '../DBSchema/arap.js';

export const postARAP = new ValidatedMethod({
	name: 'acct_module.postARAP',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate({arapType, partyId, invoiceDate, payterm, userId, organization, projectId, businessId, COAId, relatedDocId, relatedDocType, remarks, EXCurrency, EXRate, EXAmt, supportDoc}) {
		if ((arapType != 'AR') & (arapType != 'AP')) { throw new Meteor.Error('請提供應收／付類別') }
		try {
			check(partyId, String);
		} catch(e) { throw new Meteor.Error('請正確填寫團體') }
		try {
			check(invoiceDate, Date);
		} catch(e) { throw new Meteor.Error('請正確填寫帳單日期') }

		if (payTerms.includes(payterm)) { }
		else { throw new Meteor.Error('請正確填寫數期') }

		try {
			check(userId, String);
			if (Roles.userIsInRole(this.userId, 'admin', 'SYSTEM')) { }
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
		try {
			check(COAId, String);
		} catch(e) { throw new Meteor.Error('請正確填寫科目') }
		try {
			check(relatedDocId, String);
			check(relatedDocType, String);
		} catch(e) { throw new Meteor.Error('請正確填寫相關文件') }

		try {
			check(EXCurrency, String)
			if (EXCurrency.length != 3) then { throw new Meteor.Error('請正確填寫匯率') }
		}
		catch(e) { throw new Meteor.Error('請正確填寫匯率') }
		try {
			check(EXRate, Number)
			check(EXAmt, Number)
			check(EXCurrency, String)
		}
		catch(e) { throw new Meteor.Error('請正確填寫匯率') }
		try {
			check(supportDoc, String);
		} catch(e) { throw new Meteor.Error('請提供正確證明文件') }
	},
	run({arapType, partyId, invoiceDate, payterm, userId, organization, projectId, businessId, COAId, relatedDocId, relatedDocType, remarks, EXCurrency, EXRate, EXAmt, supportDoc}) {
		if (Meteor.isServer) {
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
