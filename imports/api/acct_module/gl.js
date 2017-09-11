import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random'
import { check } from 'meteor/check'

import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';

import { CallPromiseMixin } from 'meteor/didericis:callpromise-mixin';

import { tableHandles } from '../../api/DBSchema/DBTOC.js';

//Schema specific methods as below
export const postNewJournal = new ValidatedMethod({
	name: 'acctJournal.postNewJournal',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate({batchDesc, journalDate, userId, organization, projectId, businessId, relatedDocType, relatedDocId, journalType, fiscalYear, fiscalPeriod, entries}) {
		//entries: [{COAId, journalDesc, ExCurrency, EXRate, EXAmt, supportDoc, relatedDocType, relatedDocId}]
		try {
			check(batchDesc, String);
			if (batchDesc.length < 5) { throw new Error() }
		} catch(e) { throw new ValidationError('請正確填寫記錄原因') }
		try {
			check(journalDate, Date);
		} catch(e) { throw new ValidationError('請正確填寫記錄日期') }

		try {
			check(userId, String);
			if (Roles.userIsInRole(this.userId, 'admin', 'SYSTEM')) {}
			else { if (this.userId != userId) { throw new ValidationError('你的用戶不等於條目的創建用戶') } }
		} catch(e) { throw new ValidationError(e) }

		try {
			check(organization, String);
		} catch(e) { throw new ValidationError('請正確填寫所屬公司') }

		try {
			check(projectId, String);
		} catch(e) { throw new ValidationError('請正確填寫項目') }

		try {
			check(businessId, String);
		} catch(e) { throw new ValidationError('請正確填寫業務') }

		try { check(fiscalYear, Number) }
		catch(e) { throw new ValidationError('請正確填寫會計年度') }
		try { check(fiscalPeriod, Number) }
		catch(e) { throw new ValidationError('請正確填寫會計月份') }

		try {
			check(entries, [Match.Any]);
		} catch(e) { throw new ValidationError('請提供正確簿記內容') }
		try {
			if (entries.length < 2) { throw new ValidationError('請提供正確簿記內容, 會計項目少於2條') }
			for (a of entries) {
				check(a, {COAId: String, journalDesc: String, ExCurrency: String, EXRate: Number, EXAmt: Number, supportDoc: String, relatedDocType: String, relatedDocId: String})
			}
			const coaList = tableHandles('CoA')['main'].find({_id: {$in: {_.map(entries, 'COAId')}}, isActive: true}).fetch();
			let balance = 0;
			let newEntries = [];
			for (a of entries) {
			//entries: [{COAId, journalDesc, EXCurrency, EXRate, EXAmt, supportDoc, relatedDocType, relatedDocId}]
				let acct = coaList.find((v) => {
					return v['_id'] == a['COAId']
				})
				if (acct===undefined) { throw new ValidationError('請提供正確簿記內容, 找不到科目, 或科目已被停用')}
				balance = balance + (a.EXRate * a.EXAmt * (acct.isDebit ? 1 : -1))
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
					amt: (a.EXRate * a.EXAmt),
					supportDoc: a.supportDoc
				})
			}
			//if balance < 0.1 or > -0.1, generate a new balance entry. fixme
			if (balance != 0) { throw new ValidationError('請提供正確簿記內容, Debit/Credit 不相等') }
		} catch(e) { throw new ValidationError(e) }

	},
	run({batchDesc, journalDate, userId, organization, projectId, businessId, relatedDocType, relatedDocId, journalType, fiscalYear, fiscalPeriod, entries}) {

		let a = Meteor.users.findOne(userId);
		const userName = a.profile.firstName + ' ' + a.profile.lastName;

		const projectCode = tableHandles('project')['main'].findOne(projectId).code
		const businessCode = tableHandles('business')['main'].findOne(businessId).code

		const coaList = tableHandles('CoA')['main'].find({_id: {$in: {_.map(entries, 'COAId')}}, isActive: true}).fetch();
		let balance = 0;
		let newEntries = [];
		for (a of entries) {
			let acct = coaList.find((v) => { return v['_id'] == a['COAId'] })

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
				amt: (a.EXRate * a.EXAmt),
				supportDoc: a.supportDoc
			})
		}
		//if balance < 0.1 or > -0.1, generate a new balance entry. fixme

		if (Meteor.isServer) {
			try {
				
			}
			catch(err) { throw new Meteor.Error('postJournalErr', err.message) }
		}
	}
});
