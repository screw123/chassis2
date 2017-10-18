import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random'
import { check } from 'meteor/check'

import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { CallPromiseMixin } from 'meteor/didericis:callpromise-mixin';

import { tableHandles } from '../DBSchema/DBTOC.js';
import { roundDollar, payTerms2Days } from '../helper.js';
import { postNewJournal } from './gl.js';

export const postARAP = new ValidatedMethod({
	name: 'acct_module.postARAP',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate({partyId, invoiceDate, payterm, userId, organization, projectId, businessId, fiscalPeriodId, entries}) {
		try { check(partyId, String) }
		catch(e) { throw new Meteor.Error('請正確填寫團體') }

		try { check(invoiceDate, Date) }
		catch(e) { throw new Meteor.Error('請正確填寫帳單日期') }

		if (payTerms.includes(payterm)) { }
		else { throw new Meteor.Error('請正確填寫數期') }

		try {
			check(userId, String);
			if (Roles.userIsInRole(this.userId, 'admin', 'SYSTEM')) { }
			else { if (this.userId != userId) { throw new Meteor.Error('你的用戶不等於條目的創建用戶') } }
		} catch(e) { throw new Meteor.Error(e) }

		try { check(organization, String) }
		catch(e) { throw new Meteor.Error('請正確填寫所屬公司') }

		//if user=admin or org.length > 0, i.e. user is in that org, then yes test pass, else user is not in that group so return error
		if Roles.userIsInRole(Meteor.user(this.userId), 'admin', 'SYSTEM') {}
		else {
			if (Roles.getGroupsForUser(Meteor.user(this.userId), organization).length == 0) {
				throw new Meteor.Error('你沒有權限存取公司'+organization)
			}
		}

		try { check(projectId, String)}
		catch(e) { throw new Meteor.Error('請正確填寫項目') }

		try { check(businessId, String) }
		catch(e) { throw new Meteor.Error('請正確填寫業務') }

		try {
			check(fiscalPeriodId, String);
			if (Meteor.call('FiscalPeriod.isFiscalPeriodOpen', fiscalPeriodId)) {}
			else {throw new Meteor.Error()}
		}
		catch(e) { throw new Meteor.Error('請正確填寫會計期') }

		try { check(entries, [Match.Any]) }
		catch(e) { throw new Meteor.Error('請提供正確簿記內容') }
	},
	run({partyId, invoiceDate, payterm, userId, organization, projectId, businessId, entries}) {
		if (Meteor.isServer) {
			try {
				//first check for errors
				for (a of entries) {
					check(a, {COAId: String, journalDesc: String, EXCurrency: String, EXRate: Number, EXAmt: Number, supportDoc: String, relatedDocType: String, relatedDocId: String})
				}
				const coaList = tableHandles('CoA')['main'].find({_id: {$in: _.map(entries, 'COAId')}, isActive: true}).fetch();
				//fetch all relevant info
				const projectCode = tableHandles('project')['main'].findOne(projectId).code
				const businessCode = tableHandles('business')['main'].findOne(businessId).code
				const partyName = tableHandles('partymaster')['main'].findOne(partyId).name
				let u = Meteor.users.findOne(userId);
				const userName = u.profile.firstName + ' ' + u.profile.lastName;
				const fiscalPeriodName = tableHandles('FiscalPeriod')['main'].findOne(fiscalPeriodId).name
				const payDueDate = payTerms2Days(payterm);
				if (payDueDate===undefined) { throw new Meteor.Error('數期錯誤: 系統不支援數期'+payterm)}


				let arap_entries = [];
				let gl_entries = [];
				for (a of entries) {
					let acct = coaList.find((v) => { return v['_id'] == a['COAId'] });
					let amt = roundDollar(a.EXRate * a.EXAmt);
					gl_entries.push({
						COAId: a.COAId,
						journalDesc: a.remarks,
						EXCurrency: a.EXCurrency,
						EXRate: a.EXRate,
						EXAmt: a.EXAmt,
						supportDoc: a.supportDoc,
						relatedDocType: a.relatedDocType,
						relatedDocId: a.relatedDocId,
					});
					if ((acct.subcat1=='AR')||(acct.subcat1=='AP')) {
						arap_entries.push({
							arapType: acct.subcat1,
							partyId: partyId,
							partyName: partyName,
							invoiceDate: invoiceDate,
							payterm: payterm,
							payDueDate: payDueDate,
							userId: userId,
							userName: userName,
							organization: organization,
							projectId: projectId,
							projectCode: projectCode,
							businessId: businessId,
							businessCode: businessCode,
							COAId: a.COAId,
							COADesc: acct.desc,
							relatedDocType: a.relatedDocType,
							relatedDocId: a.relatedDocId,
							remarks: a.remarks,
							EXCurrency: a.EXCurrency,
							EXRate: a.EXRate,
							EXAmt: a.EXAmt,
							amt: amt,
							outstandingAmt: amt,
							supportDoc: a.supportDoc
						})
					};
				};
				if (arap_entries.length < 1) { throw new Meteor.Error('沒有應收/應付帳的相關資料, 帳目內應有應收/應付科目才可使用postARAP')}
				let q2 = Meteor.call('acct_module.postNewJournal', {
					batchDesc: partyName+'應收/付簿記',
					journalDate: new Date(),
					userId: userId,
					organization: organization,
					projectId: projectId,
					businessId: businessId,
					journalType: 'NOR',
					fiscalPeriodId: fiscalPeriodId,
					entries: gl_entries
				});
				for (a of arap_entries) {
					let q1 = Meteor.call('arap.new', a);
					let q1_history = Meteor.call('arapHistory.new', {
						arapId: q1,
						COAId: a.COAId,
						COADesc: a.COADesc,
						changeDesc: 'New creation of ' + a.arapType + ' for ' + partyName,
						EXCurrency: a.EXCurrency,
						EXRate: a.EXRate,
						EXAmt: a.EXAmt,
						amt: a.amt,
						latestOutstandingAmt: a.amt,
						relatedJournalBatchId: q2,
						supportDoc: a.supportDoc,
						userId: a.userId,
						userName: a.userName
					})
				}
				return q2;
			}
			catch(err) { throw new Meteor.Error('insert-failed', err.message) }
		}
	}
});

export const settleARAP = new ValidatedMethod({
	name: 'acct_module.settleARAP',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate({batchDesc, journalDate, organization, projectId, businessId, fiscalPeriodId, entries}) {
		try {
			check(batchDesc, String);
			if (batchDesc.length < 5) { throw new Error() }
		} catch(e) { throw new Meteor.Error('請正確填寫記錄原因') }

		try { check(journalDate, Date) }
		catch(e) { throw new Meteor.Error('請正確填寫記錄日期') }

		if Roles.userIsInRole(Meteor.user(this.userId), 'admin', 'SYSTEM') {}
		else {
			if (Roles.getGroupsForUser(Meteor.user(this.userId), organization).length == 0) {
				throw new Meteor.Error('你沒有權限存取公司'+organization)
			}
		}

		try { check(projectId, String) }
		catch(e) { throw new Meteor.Error('請正確填寫項目') }
		try { check(businessId, String) }
		catch(e) { throw new Meteor.Error('請正確填寫業務') }
		try { check(fiscalPeriodId, String) }
		catch(e) { throw new Meteor.Error('請正確填寫會計期') }

		for (a of entries) {
			check(a, {arapId: Match.Maybe(String), COAId: Match.Maybe(String), EXCurrency: String, EXRate: Number, EXAmt: Number, changeDesc: String, supportDoc: String})
			if (arapId === undefined)&& (COAId === undefined) { throw new Meteor.Error('錯誤: 一條或多條簿記之應收/付帳或科目未有提供') }
			if ((EXRate * EXAmt) == 0) { throw new Meteor.Error('錯誤: 一條或多條之金額為0, 所有簿記之金額均不能為0.') }
		}
	}
	run({batchDesc, journalDate, organization, projectId, businessId, fiscalPeriodId, entries}) {
		//1. check whatever you can check for logics

		//fetch all relevant info
		const projectCode = tableHandles('project')['main'].findOne({_id: projectId, isActive: true}).code
		if (projectCode===undefined) { throw new Meteor.Error('錯誤: 項目錯誤') }

		const businessCode = tableHandles('business')['main'].findOne({_id: businessId, isActive: true}).code
		if (businessCode===undefined) { throw new Meteor.Error('錯誤: 業務錯誤') }

		const fiscalPeriodName = tableHandles('FiscalPeriod')['main'].findOne(fiscalPeriodId).name
		if (fiscalPeriodName===undefined) { throw new Meteor.Error('錯誤: 會計期錯誤') }

		let u = Meteor.users.findOne(this.userId); //no need to check coz we made sure user is logged in
		const userName = u.profile.firstName + ' ' + u.profile.lastName;

		if Roles.userIsInRole(u, 'SYSTEM', 'admin') {}
		else if (Roles.getGroupsForUser(u, organization).length!=1) {
			throw new Meteor.Error('錯誤: 你沒有權限修改'+organization+' 的記錄.')
		}

		let gl_entries = [];
		let arap_adj = [];
		for (a of entries) {
			let deductAmtLC = roundDollar(a.EXRate * a.EXAmt)
			if (arapId != undefined) { //i.e. is AR/AP record, we will ignore COA
				let arap_doc = tableHandles('arap')['main'].findOne(arapId)
				if (arap_doc.outstandingAmt+1 < deductAmtLC) { //+1 so as to allow difference in pennies
					throw new Meteor.Error('錯誤: 應收/付帳餘額少於扣減金額')
				}
				arap_adj.push({
					arapId: arapId,
					deductAmtLC: deductAmtLC,
					EXCurrency: a.EXCurrency,
					EXRate: a.EXRate,
					EXAmt: a.EXAmt,
					changeDesc: a.changeDesc,
					supportDoc: a.supportDoc,
					COAId: arap_doc.COAId, //fixme now we store existing arap item COA, which is wrong.  We want to store the account that the settlement is done against.  To fix
				})
			}
			else if (COAId != undefined) { //i.e. is the other side of the AR/AP settlement

			}
			else { //if arapId and COAId both undefined, i.e. error from calling function, throw error
				throw new Meteor.Error('錯誤: 應收/付帳編號, 科目, 必需最少提供一種')
			}
			gl_entries.push({
				COAId: arap_doc.COAId,
				journalDesc: a.changeDesc,
				EXCurrency: a.EXCurrency,
				EXRate: a.EXRate,
				EXAmt: a.EXAmt,
				supportDoc: a.supportDoc,
				relatedDocType: arap_doc.relatedDocType,
				relatedDocId: arap_doc.relatedDocId,
			})
			}
		}


		//2. book journal first, get batchNo
		//3. book arap + history row by row
	}
});
